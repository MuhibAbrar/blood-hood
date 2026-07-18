import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireUser } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const { requestId, donorUid, externalDonor, externalOrgId } = await req.json()
    if (typeof requestId !== 'string' || !requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 })

    const db = adminDb()
    const requestRef = db.collection('bloodRequests').doc(requestId)
    const donationRef = db.collection('donations').doc(`request_${requestId}`)
    const actorRef = db.collection('users').doc(actor.uid)
    const donorRef = typeof donorUid === 'string' && donorUid ? db.collection('users').doc(donorUid) : null
    const externalOrgRef = typeof externalOrgId === 'string' && externalOrgId ? db.collection('organizations').doc(externalOrgId) : null

    await db.runTransaction(async tx => {
      const [requestSnap, donationSnap, actorSnap, donorSnap, externalOrgSnap] = await Promise.all([
        tx.get(requestRef), tx.get(donationRef), tx.get(actorRef),
        donorRef ? tx.get(donorRef) : Promise.resolve(null),
        externalOrgRef ? tx.get(externalOrgRef) : Promise.resolve(null),
      ])
      if (!requestSnap.exists) throw new ApiAuthError(404, 'Request not found')
      if (donationSnap.exists || requestSnap.data()?.status === 'fulfilled') throw new ApiAuthError(409, 'Request already fulfilled')
      const request = requestSnap.data()!
      const role = actorSnap.data()?.role
      if (request.requestedBy !== actor.uid && !['admin', 'superadmin'].includes(role)) throw new ApiAuthError(403, 'Forbidden')

      const now = Timestamp.now()
      let donorId = 'anonymous'
      let donorName = 'Anonymous'
      let donorPhone: string | null = null
      let orgId: string | null = null

      if (donorRef && donorSnap?.exists) {
        if (!request.respondedBy?.includes(donorUid) && !['admin', 'superadmin'].includes(role)) {
          throw new ApiAuthError(400, 'Selected donor did not respond to this request')
        }
        const donor = donorSnap.data()!
        donorId = donorUid
        donorName = donor.name ?? 'Unknown'
        donorPhone = donor.phone ?? null
        orgId = donor.organizations?.[0] ?? null
        tx.update(donorRef, { totalDonations: FieldValue.increment(1), lastDonatedAt: now, nextAvailableAt: Timestamp.fromMillis(now.toMillis() + 90 * 24 * 60 * 60 * 1000), isAvailable: false, updatedAt: FieldValue.serverTimestamp() })
      } else if (externalDonor && typeof externalDonor.name === 'string' && externalDonor.name.trim()) {
        donorId = 'external'
        donorName = externalDonor.name.trim().slice(0, 80)
        donorPhone = typeof externalDonor.phone === 'string' ? externalDonor.phone.replace(/[^0-9+]/g, '').slice(0, 16) : null
        if (externalOrgRef && externalOrgSnap?.exists) orgId = externalOrgRef.id
      }

      if (orgId) tx.update(db.collection('organizations').doc(orgId), { totalDonations: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() })
      tx.update(requestRef, { status: 'fulfilled', fulfilledBy: donorRef ? donorUid : null, fulfilledAt: now, fulfilledByName: donorName === 'Anonymous' ? null : donorName, fulfilledByPhone: donorPhone, updatedAt: FieldValue.serverTimestamp() })
      tx.create(donationRef, { donorId, donorName, requestId, recipientName: request.patientName ?? '', hospital: request.hospital ?? '', bloodGroup: request.bloodGroup ?? '', donatedAt: now, verifiedBy: actor.uid, campId: null, orgId, externalDonorPhone: donorId === 'external' ? donorPhone : null, createdAt: FieldValue.serverTimestamp() })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    console.error('Fulfill request error:', error)
    return NextResponse.json({ error: 'Unable to fulfill request' }, { status: 500 })
  }
}
