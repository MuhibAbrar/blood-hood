import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// POST /api/leave-org
// Body: { orgId, uid }
// Uses Admin SDK — bypasses Firestore security rules
export async function POST(req: NextRequest) {
  try {
    const { orgId, uid } = await req.json()
    if (!orgId || !uid) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    const db = adminDb()

    // Make sure user is actually a member (not an admin)
    const orgDoc = await db.collection('organizations').doc(orgId).get()
    if (!orgDoc.exists) return NextResponse.json({ error: 'org-not-found' }, { status: 404 })

    const orgData = orgDoc.data()!
    if (orgData.adminIds?.includes(uid)) {
      return NextResponse.json({ error: 'admin-cannot-leave' }, { status: 403 })
    }

    // Remove user from org's memberIds
    await db.collection('organizations').doc(orgId).update({
      memberIds: FieldValue.arrayRemove(uid),
    })

    // Remove org from user's organizations
    await db.collection('users').doc(uid).update({
      organizations: FieldValue.arrayRemove(orgId),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
