import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// DELETE /api/admin/delete-org
// Body: { orgId }
// Deletes org and removes orgId from all members' and admins' organizations[]
export async function DELETE(req: NextRequest) {
  try {
    const { orgId } = await req.json()
    if (!orgId) return NextResponse.json({ error: 'missing orgId' }, { status: 400 })

    const db = adminDb()
    const orgSnap = await db.collection('organizations').doc(orgId).get()
    if (!orgSnap.exists) return NextResponse.json({ error: 'not-found' }, { status: 404 })

    const { memberIds = [], adminIds = [] } = orgSnap.data()!
    const allUids = [...new Set([...memberIds, ...adminIds])]

    const batch = db.batch()
    batch.delete(db.collection('organizations').doc(orgId))

    for (const uid of allUids) {
      batch.update(db.collection('users').doc(uid), {
        organizations: FieldValue.arrayRemove(orgId),
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
