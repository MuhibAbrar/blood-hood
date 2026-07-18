import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, requireUser } from '@/lib/api-auth'

const WAIT_MS = 90 * 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const { donatedAt: donatedAtInput } = await req.json()
    const donatedAtMs = new Date(donatedAtInput).getTime()
    if (!Number.isFinite(donatedAtMs) || donatedAtMs > Date.now() || donatedAtMs < Date.now() - 365 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Invalid donation date' }, { status: 400 })
    }

    const db = adminDb()
    const userRef = db.collection('users').doc(actor.uid)
    const donationRef = db.collection('donations').doc(`self_${actor.uid}_${new Date(donatedAtMs).toISOString().slice(0, 10)}`)
    await db.runTransaction(async tx => {
      const [userSnap, donationSnap] = await Promise.all([tx.get(userRef), tx.get(donationRef)])
      if (!userSnap.exists) throw new Error('User not found')
      if (donationSnap.exists) throw new Error('Donation already recorded')
      const user = userSnap.data()!
      const lastDonationMs = user.lastDonatedAt?.toMillis?.() ?? 0
      if (lastDonationMs && donatedAtMs - lastDonationMs < WAIT_MS) throw new Error('Donation interval must be at least 90 days')
      const orgId = user.organizations?.[0] ?? null
      const donatedAt = Timestamp.fromMillis(donatedAtMs)
      tx.create(donationRef, { donorId: actor.uid, donorName: user.name ?? '', requestId: null, recipientName: 'নিজে রিপোর্ট', hospital: 'অজানা', bloodGroup: user.bloodGroup ?? '', donatedAt, verifiedBy: null, verificationStatus: 'self-reported', campId: null, orgId, externalDonorPhone: null, createdAt: FieldValue.serverTimestamp() })
      tx.update(userRef, { totalDonations: FieldValue.increment(1), lastDonatedAt: donatedAt, nextAvailableAt: Timestamp.fromMillis(donatedAtMs + WAIT_MS), isAvailable: false, updatedAt: FieldValue.serverTimestamp() })
      if (orgId) tx.update(db.collection('organizations').doc(orgId), { totalDonations: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    const message = error instanceof Error ? error.message : 'Unable to record donation'
    const status = message.includes('already') || message.includes('90 days') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
