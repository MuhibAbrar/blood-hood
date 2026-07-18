import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { hashesMatch, normalizeBDPhone, phoneKey, phoneToEmail, safeHash } from '@/lib/otp'

export async function POST(req: NextRequest) {
  try {
    const { phone: input, password, verificationToken } = await req.json()
    const phone = normalizeBDPhone(String(input ?? ''))
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' }, { status: 400 })
    }
    if (typeof verificationToken !== 'string' || verificationToken.length < 32) {
      return NextResponse.json({ error: 'ফোন নম্বর যাচাই করা প্রয়োজন' }, { status: 400 })
    }

    const challengeRef = adminDb().collection('otpChallenges').doc(phoneKey(phone))
    const challengeSnap = await challengeRef.get()
    const challenge = challengeSnap.data()
    if (!challenge || challenge.purpose !== 'password-reset' || (challenge.verifiedUntil?.toMillis?.() ?? 0) < Date.now()) {
      return NextResponse.json({ error: 'OTP verification-এর সময় শেষ হয়েছে' }, { status: 400 })
    }
    if (!hashesMatch(challenge.verifiedTokenHash, safeHash(verificationToken))) {
      return NextResponse.json({ error: 'Verification token সঠিক নয়' }, { status: 403 })
    }

    const user = await adminAuth().getUserByEmail(phoneToEmail(phone))
    await adminAuth().updateUser(user.uid, { password })
    await challengeRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    if ((error as { code?: string }).code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, { status: 404 })
    }
    return NextResponse.json({ error: 'পাসওয়ার্ড পরিবর্তন করা যায়নি' }, { status: 500 })
  }
}
