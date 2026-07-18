import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import {
  createVerificationToken,
  hashesMatch,
  hashOtp,
  normalizeBDPhone,
  OTP_MAX_ATTEMPTS,
  phoneKey,
  safeHash,
} from '@/lib/otp'

export async function POST(req: NextRequest) {
  try {
    const { phone: input, otp } = await req.json()
    const phone = normalizeBDPhone(String(input ?? ''))
    if (!/^\d{6}$/.test(String(otp ?? ''))) return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })

    const ref = adminDb().collection('otpChallenges').doc(phoneKey(phone))
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'OTP expired or not found' }, { status: 400 })
    const data = snap.data()!
    if ((data.expiresAt?.toMillis?.() ?? 0) < Date.now()) return NextResponse.json({ error: 'OTP expired' }, { status: 400 })
    if ((data.attempts ?? 0) >= OTP_MAX_ATTEMPTS) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })

    const actualHash = hashOtp(phone, String(otp))
    if (!hashesMatch(data.otpHash, actualHash)) {
      await ref.update({ attempts: (data.attempts ?? 0) + 1 })
      return NextResponse.json({ error: 'Incorrect OTP' }, { status: 400 })
    }

    const verificationToken = createVerificationToken()
    await ref.update({
      otpHash: '',
      verifiedTokenHash: safeHash(verificationToken),
      verifiedUntil: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    })
    return NextResponse.json({ success: true, verificationToken })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Unable to verify OTP' }, { status: 500 })
  }
}
