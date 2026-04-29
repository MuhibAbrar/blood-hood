import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// POST /api/admin/delete-user
// Body: { uid }
// Uses Admin SDK — bypasses Firestore security rules
export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json()
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

    const db = adminDb()

    // Get user's organizations before deleting
    const userDoc = await db.collection('users').doc(uid).get()
    const orgIds: string[] = userDoc.exists ? (userDoc.data()?.organizations ?? []) : []

    // Remove user from all their orgs' memberIds
    const orgUpdates = orgIds.map(orgId =>
      db.collection('organizations').doc(orgId).update({
        memberIds: FieldValue.arrayRemove(uid),
      }).catch(() => { /* ignore if org doesn't exist */ })
    )
    await Promise.all(orgUpdates)

    // Delete user doc
    await db.collection('users').doc(uid).delete()

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
