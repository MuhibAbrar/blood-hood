import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { hashesMatch, normalizeBDPhone, phoneKey, phoneToEmail, safeHash } from '@/lib/otp'

export async function POST(req: NextRequest) {
  try {
    const { phone: input, password, verificationToken } = await req.json()
    const phone = normalizeBDPhone(String(input ?? ''))
    if (typeof password !== 'string' || password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    if (typeof verificationToken !== 'string' || verificationToken.length < 32) return NextResponse.json({ error: 'Phone verification required' }, { status: 400 })

    const challengeRef = adminDb().collection('otpChallenges').doc(phoneKey(phone))
    const challengeSnap = await challengeRef.get()
    const challenge = challengeSnap.data()
    if (!challenge || (challenge.verifiedUntil?.toMillis?.() ?? 0) < Date.now()) {
      return NextResponse.json({ error: 'Phone verification expired' }, { status: 400 })
    }
    if (!hashesMatch(challenge.verifiedTokenHash, safeHash(verificationToken))) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 })
    }

    const email = phoneToEmail(phone)
    try {
      await adminAuth().getUserByEmail(email)
      return NextResponse.json({ error: 'Account already exists' }, { status: 409 })
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code !== 'auth/user-not-found') throw error
    }

    const user = await adminAuth().createUser({ email, password, displayName: phone })
    const customToken = await adminAuth().createCustomToken(user.uid)
    await challengeRef.delete()
    return NextResponse.json({ success: true, customToken })
  } catch (error) {
    console.error('Complete registration error:', error)
    return NextResponse.json({ error: 'Unable to create account' }, { status: 500 })
  }
}
