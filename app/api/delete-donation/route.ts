import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// DELETE /api/delete-donation
// Body: { donationId }
// Deletes the donation doc and decrements donor's totalDonations counter
export async function DELETE(req: NextRequest) {
  try {
    const { donationId } = await req.json()
    if (!donationId) return NextResponse.json({ error: 'missing donationId' }, { status: 400 })

    const db = adminDb()
    const donationRef = db.collection('donations').doc(donationId as string)
    const donationSnap = await donationRef.get()

    if (!donationSnap.exists) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const { donorId } = donationSnap.data()!

    const batch = db.batch()
    batch.delete(donationRef)

    if (donorId) {
      batch.update(db.collection('users').doc(donorId), {
        totalDonations: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
