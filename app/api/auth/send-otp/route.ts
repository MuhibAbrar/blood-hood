import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  createVerificationToken,
  generateOtp,
  hashOtp,
  internationalPhone,
  normalizeBDPhone,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_MAX_SENDS_PER_DAY,
  OTP_RESEND_MS,
  OTP_TTL_MS,
  phoneKey,
  safeHash,
} from '@/lib/otp'

const IP_MAX_SENDS_PER_DAY = 15
const DEVICE_MAX_SENDS_PER_DAY = 8
const DAY_MS = 24 * 60 * 60 * 1000
const DEVICE_COOKIE = 'bh_otp_device'

export async function POST(req: NextRequest) {
  try {
    const { phone: input, purpose: inputPurpose } = await req.json()
    const phone = normalizeBDPhone(String(input ?? ''))
    const purpose = inputPurpose === 'password-reset' ? 'password-reset' : 'registration'
    let accountExists = true
    try {
      await adminAuth().getUserByEmail(`${phone}@bloodhood.app`)
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/user-not-found') accountExists = false
      else throw error
    }
    if (purpose === 'password-reset' && !accountExists) {
      return NextResponse.json({ error: 'এই নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি' }, { status: 404 })
    }
    if (purpose === 'registration' && accountExists) {
      return NextResponse.json({ error: 'এই নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে—লগইন অথবা পাসওয়ার্ড রিসেট করুন' }, { status: 409 })
    }
    const key = phoneKey(phone)
    const ref = adminDb().collection('otpChallenges').doc(key)
    const phoneLimitRef = adminDb().collection('otpPhoneRateLimits').doc(key)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ipRef = adminDb().collection('otpRateLimits').doc(safeHash(ip))
    const existingDeviceId = req.cookies.get(DEVICE_COOKIE)?.value
    const deviceId = existingDeviceId && /^[a-f0-9]{64}$/.test(existingDeviceId) ? existingDeviceId : createVerificationToken()
    const shouldSetDeviceCookie = deviceId !== existingDeviceId
    const deviceRef = adminDb().collection('otpDeviceRateLimits').doc(safeHash(deviceId))
    const now = Date.now()
    const [existing, phoneLimitSnap, ipLimitSnap, deviceLimitSnap] = await Promise.all([ref.get(), phoneLimitRef.get(), ipRef.get(), deviceRef.get()])
    const data = existing.data()
    const phoneLimit = phoneLimitSnap.data()
    const lastSent = phoneLimit?.sentAt?.toMillis?.() ?? 0
    const windowStarted = phoneLimit?.windowStartedAt?.toMillis?.() ?? 0

    const activeOtpExpires = data?.expiresAt?.toMillis?.() ?? 0
    if (data?.purpose === purpose && data?.otpHash && activeOtpExpires > now) {
      const response = NextResponse.json({ success: true, reused: true, expiresIn: Math.ceil((activeOtpExpires - now) / 1000) })
      if (shouldSetDeviceCookie) response.cookies.set(DEVICE_COOKIE, deviceId, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 365 * 24 * 60 * 60, path: '/' })
      return response
    }

    if (now - lastSent < OTP_RESEND_MS) {
      return NextResponse.json({ error: 'Please wait before requesting another OTP', retryAfter: Math.ceil((OTP_RESEND_MS - (now - lastSent)) / 1000) }, { status: 429 })
    }

    const sameWindow = now - windowStarted < 60 * 60 * 1000
    const sends = sameWindow ? (phoneLimit?.sendCount ?? 0) : 0
    if (sends >= OTP_MAX_SENDS_PER_HOUR) {
      return NextResponse.json({ error: 'OTP request limit reached. Try again later.' }, { status: 429 })
    }

    const dayStarted = phoneLimit?.dayStartedAt?.toMillis?.() ?? 0
    const sameDay = now - dayStarted < DAY_MS
    const dailySends = sameDay ? (phoneLimit?.dailySendCount ?? 0) : 0
    if (dailySends >= OTP_MAX_SENDS_PER_DAY) {
      return NextResponse.json({ error: 'এই নম্বরের আজকের OTP limit শেষ হয়েছে' }, { status: 429 })
    }

    const ipLimit = ipLimitSnap.data()
    const ipWindowStarted = ipLimit?.dayStartedAt?.toMillis?.() ?? 0
    const sameIpWindow = now - ipWindowStarted < DAY_MS
    const ipSends = sameIpWindow ? (ipLimit?.dailySendCount ?? 0) : 0
    if (ipSends >= IP_MAX_SENDS_PER_DAY) {
      return NextResponse.json({ error: 'Too many OTP requests from this connection.' }, { status: 429 })
    }

    const deviceLimit = deviceLimitSnap.data()
    const deviceDayStarted = deviceLimit?.dayStartedAt?.toMillis?.() ?? 0
    const sameDeviceDay = now - deviceDayStarted < DAY_MS
    const deviceSends = sameDeviceDay ? (deviceLimit?.dailySendCount ?? 0) : 0
    if (deviceSends >= DEVICE_MAX_SENDS_PER_DAY) {
      return NextResponse.json({ error: 'এই ডিভাইসের আজকের OTP limit শেষ হয়েছে' }, { status: 429 })
    }

    const otp = generateOtp()
    const apiKey = process.env.BULKSMSBD_API_KEY
    const senderId = process.env.BULKSMSBD_SENDER_ID
    if (!apiKey || !senderId) throw new Error('SMS provider is not configured')

    const payload = new URLSearchParams({
      api_key: apiKey,
      senderid: senderId,
      number: internationalPhone(phone),
      message: purpose === 'password-reset'
        ? `Blood Hood password reset OTP: ${otp}. Valid for 5 minutes. Do not share this code.`
        : `Blood Hood OTP: ${otp}. Valid for 5 minutes. Do not share this code.`,
    })
    const smsResponse = await fetch(process.env.BULKSMSBD_API_URL || 'https://bulksmsbd.net/api/smsapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload,
      cache: 'no-store',
    })
    const smsText = await smsResponse.text()
    let smsResult: { response_code?: number | string; error_message?: string } = {}
    try { smsResult = JSON.parse(smsText) } catch { /* handled below */ }
    if (!smsResponse.ok || Number(smsResult.response_code) !== 202) {
      console.error('SMS provider rejected OTP:', smsResult.response_code, smsResult.error_message)
      return NextResponse.json({
        error: 'SMS could not be sent',
        ...(process.env.VERCEL_ENV === 'preview' ? {
          diagnostic: {
            code: String(smsResult.response_code ?? smsResponse.status),
            message: String(smsResult.error_message ?? 'Provider rejected the request').slice(0, 160),
          },
        } : {}),
      }, { status: 502 })
    }

    await ref.set({
      phone,
      purpose,
      otpHash: hashOtp(phone, otp),
      expiresAt: Timestamp.fromMillis(now + OTP_TTL_MS),
      attempts: 0,
      verifiedTokenHash: FieldValue.delete(),
      verifiedUntil: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    await phoneLimitRef.set({
      sentAt: Timestamp.fromMillis(now),
      sendCount: sends + 1,
      windowStartedAt: Timestamp.fromMillis(sameWindow ? windowStarted : now),
      dailySendCount: dailySends + 1,
      dayStartedAt: Timestamp.fromMillis(sameDay ? dayStarted : now),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    await ipRef.set({
      dailySendCount: ipSends + 1,
      dayStartedAt: Timestamp.fromMillis(sameIpWindow ? ipWindowStarted : now),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    await deviceRef.set({
      dailySendCount: deviceSends + 1,
      dayStartedAt: Timestamp.fromMillis(sameDeviceDay ? deviceDayStarted : now),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    const response = NextResponse.json({ success: true, expiresIn: OTP_TTL_MS / 1000 })
    if (shouldSetDeviceCookie) response.cookies.set(DEVICE_COOKIE, deviceId, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 365 * 24 * 60 * 60, path: '/' })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send OTP'
    const status = message.includes('Invalid Bangladesh') ? 400 : 500
    console.error('Send OTP error:', message)
    return NextResponse.json({
      error: status === 400 ? message : 'Unable to send OTP',
      ...(process.env.VERCEL_ENV === 'preview' ? { diagnostic: { code: 'server', message: message.slice(0, 160) } } : {}),
    }, { status })
  }
}
