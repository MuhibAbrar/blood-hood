import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  generateOtp,
  hashOtp,
  internationalPhone,
  normalizeBDPhone,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_RESEND_MS,
  OTP_TTL_MS,
  phoneKey,
  safeHash,
} from '@/lib/otp'

const IP_MAX_SENDS_PER_HOUR = 20

export async function POST(req: NextRequest) {
  try {
    const { phone: input } = await req.json()
    const phone = normalizeBDPhone(String(input ?? ''))
    const key = phoneKey(phone)
    const ref = adminDb().collection('otpChallenges').doc(key)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ipRef = adminDb().collection('otpRateLimits').doc(safeHash(ip))
    const now = Date.now()
    const [existing, ipLimitSnap] = await Promise.all([ref.get(), ipRef.get()])
    const data = existing.data()
    const lastSent = data?.sentAt?.toMillis?.() ?? 0
    const windowStarted = data?.windowStartedAt?.toMillis?.() ?? 0

    if (now - lastSent < OTP_RESEND_MS) {
      return NextResponse.json({ error: 'Please wait before requesting another OTP', retryAfter: Math.ceil((OTP_RESEND_MS - (now - lastSent)) / 1000) }, { status: 429 })
    }

    const sameWindow = now - windowStarted < 60 * 60 * 1000
    const sends = sameWindow ? (data?.sendCount ?? 0) : 0
    if (sends >= OTP_MAX_SENDS_PER_HOUR) {
      return NextResponse.json({ error: 'OTP request limit reached. Try again later.' }, { status: 429 })
    }

    const ipLimit = ipLimitSnap.data()
    const ipWindowStarted = ipLimit?.windowStartedAt?.toMillis?.() ?? 0
    const sameIpWindow = now - ipWindowStarted < 60 * 60 * 1000
    const ipSends = sameIpWindow ? (ipLimit?.sendCount ?? 0) : 0
    if (ipSends >= IP_MAX_SENDS_PER_HOUR) {
      return NextResponse.json({ error: 'Too many OTP requests from this connection.' }, { status: 429 })
    }

    const otp = generateOtp()
    const apiKey = process.env.BULKSMSBD_API_KEY
    const senderId = process.env.BULKSMSBD_SENDER_ID
    if (!apiKey || !senderId) throw new Error('SMS provider is not configured')

    const payload = new URLSearchParams({
      api_key: apiKey,
      senderid: senderId,
      number: internationalPhone(phone),
      message: `Blood Hood OTP: ${otp}. Valid for 5 minutes. Do not share this code.`,
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
      return NextResponse.json({ error: 'SMS could not be sent' }, { status: 502 })
    }

    await ref.set({
      phone,
      otpHash: hashOtp(phone, otp),
      expiresAt: Timestamp.fromMillis(now + OTP_TTL_MS),
      sentAt: Timestamp.fromMillis(now),
      attempts: 0,
      sendCount: sends + 1,
      windowStartedAt: Timestamp.fromMillis(sameWindow ? windowStarted : now),
      verifiedTokenHash: FieldValue.delete(),
      verifiedUntil: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    await ipRef.set({
      sendCount: ipSends + 1,
      windowStartedAt: Timestamp.fromMillis(sameIpWindow ? ipWindowStarted : now),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    return NextResponse.json({ success: true, expiresIn: OTP_TTL_MS / 1000 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send OTP'
    const status = message.includes('Invalid Bangladesh') ? 400 : 500
    console.error('Send OTP error:', message)
    return NextResponse.json({ error: status === 400 ? message : 'Unable to send OTP' }, { status })
  }
}
