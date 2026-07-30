import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireOrgAdmin } from '@/lib/api-auth'
import { CURRENT_SCHEMA_VERSION } from '@/lib/schema-version'

const WAIT_MS = 90 * 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const { campId, donorId, orgId } = await req.json()
    if (![campId, donorId, orgId].every((value) => typeof value === 'string' && value.trim())) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const actor = await requireOrgAdmin(req, orgId)
    const db = adminDb()
    const campRef = db.collection('camps').doc(campId)
    const donorRef = db.collection('users').doc(donorId)
    const orgRef = db.collection('organizations').doc(orgId)
    const donationRef = db.collection('donations').doc(`camp_${campId}_${donorId}`)

    await db.runTransaction(async (tx) => {
      const [campSnap, donorSnap, orgSnap, donationSnap] = await Promise.all([
        tx.get(campRef),
        tx.get(donorRef),
        tx.get(orgRef),
        tx.get(donationRef),
      ])
      if (!campSnap.exists) throw new ApiAuthError(404, 'Camp not found')
      if (!donorSnap.exists) throw new ApiAuthError(404, 'Donor not found')
      if (!orgSnap.exists) throw new ApiAuthError(404, 'Organization not found')
      if (campSnap.data()?.organizationId !== orgId) throw new ApiAuthError(409, 'Camp organization mismatch')
      const org = orgSnap.data()!
      if (!org.memberIds?.includes(donorId) && !org.adminIds?.includes(donorId)) {
        throw new ApiAuthError(400, 'Donor is not an organization member')
      }
      if (donationSnap.exists || campSnap.data()?.donatedUids?.includes(donorId)) return

      const donor = donorSnap.data()!
      const now = Timestamp.now()
      tx.update(campRef, {
        donatedUids: FieldValue.arrayUnion(donorId),
        totalCollected: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })
      tx.update(orgRef, {
        totalDonations: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })
      tx.update(donorRef, {
        organizations: [orgId],
        totalDonations: FieldValue.increment(1),
        lastDonatedAt: now,
        nextAvailableAt: Timestamp.fromMillis(now.toMillis() + WAIT_MS),
        isAvailable: false,
        updatedAt: FieldValue.serverTimestamp(),
      })
      tx.create(donationRef, {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        donorId,
        donorName: donor.name ?? '',
        requestId: null,
        recipientName: 'রক্তদান ক্যাম্প',
        hospital: campSnap.data()?.venue ?? 'রক্তদান ক্যাম্প',
        bloodGroup: donor.bloodGroup ?? '',
        donatedAt: now,
        verifiedBy: actor.uid,
        verificationStatus: 'organization-verified',
        campId,
        orgId,
        externalDonorPhone: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to record camp donation' }, { status: 500 })
  }
}
