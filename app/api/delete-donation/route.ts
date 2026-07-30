import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { authErrorResponse, requireRole } from '@/lib/api-auth'

// DELETE /api/delete-donation
// Body: { donationId }
// Deletes the donation doc and decrements donor's totalDonations counter
export async function DELETE(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'superadmin'])
    const { donationId } = await req.json()
    if (!donationId) return NextResponse.json({ error: 'missing donationId' }, { status: 400 })

    const db = adminDb()
    const donationRef = db.collection('donations').doc(donationId as string)
    await db.runTransaction(async (tx) => {
      const donationSnap = await tx.get(donationRef)
      if (!donationSnap.exists) throw new Error('not found')
      const { donorId, orgId, campId } = donationSnap.data()!
      const donorRef = donorId && !['external', 'anonymous'].includes(donorId)
        ? db.collection('users').doc(donorId)
        : null
      const orgRef = orgId ? db.collection('organizations').doc(orgId) : null
      const campRef = campId ? db.collection('camps').doc(campId) : null
      const [donorSnap, orgSnap, campSnap] = await Promise.all([
        donorRef ? tx.get(donorRef) : Promise.resolve(null),
        orgRef ? tx.get(orgRef) : Promise.resolve(null),
        campRef ? tx.get(campRef) : Promise.resolve(null),
      ])

      tx.delete(donationRef)
      if (donorRef && donorSnap?.exists) {
        tx.update(donorRef, {
          totalDonations: Math.max(0, Number(donorSnap.data()?.totalDonations ?? 0) - 1),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
      if (orgRef && orgSnap?.exists) {
        tx.update(orgRef, {
          totalDonations: Math.max(0, Number(orgSnap.data()?.totalDonations ?? 0) - 1),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
      if (campRef && campSnap?.exists) {
        tx.update(campRef, {
          donatedUids: FieldValue.arrayRemove(donorId),
          totalCollected: Math.max(0, Number(campSnap.data()?.totalCollected ?? 0) - 1),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const authError = authErrorResponse(err)
    if (authError) return authError
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: message === 'not found' ? 404 : 500 })
  }
}
