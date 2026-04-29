import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// POST /api/merge-donor
// Body: { newUid, phone }
// Finds manual_ doc by phone, merges historical data into new UID doc, deletes old doc
export async function POST(req: NextRequest) {
  try {
    const { newUid, phone } = await req.json()
    if (!newUid || !phone) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    const db = adminDb()

    // Find existing manual doc by phone
    const snap = await db.collection('users').where('phone', '==', phone).where('manuallyAdded', '==', true).get()
    if (snap.empty) return NextResponse.json({ notFound: true })

    const oldDoc = snap.docs[0]
    const oldData = oldDoc.data()
    const oldUid = oldDoc.id

    // If old doc is already the new UID, nothing to do
    if (oldUid === newUid) return NextResponse.json({ notFound: true })

    // Update the new UID doc with historical data from manual entry
    await db.collection('users').doc(newUid).update({
      totalDonations: oldData.totalDonations ?? 0,
      isVerified: oldData.isVerified ?? false,
      organizations: oldData.organizations ?? [],
      lastDonatedAt: oldData.lastDonatedAt ?? null,
      manuallyAdded: false,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Delete old manual doc
    await db.collection('users').doc(oldUid).delete()

    return NextResponse.json({ success: true, merged: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
