import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { authErrorResponse, ApiAuthError, requireUser } from '@/lib/api-auth'

// POST /api/leave-org
// Body: { orgId, uid }
// Uses Admin SDK — bypasses Firestore security rules
export async function POST(req: NextRequest) {
  try {
    const { orgId, uid } = await req.json()
    if (!orgId || !uid) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    const decoded = await requireUser(req)
    if (decoded.uid !== uid) throw new ApiAuthError(403, 'Forbidden')

    const db = adminDb()

    const orgDoc = await db.collection('organizations').doc(orgId).get()
    if (!orgDoc.exists) return NextResponse.json({ error: 'org-not-found' }, { status: 404 })

    const orgData = orgDoc.data()!
    const userDoc = await db.collection('users').doc(uid).get()
    const memberIds: string[] = orgData.memberIds ?? []
    const adminIds: string[] = orgData.adminIds ?? []
    const isMember = memberIds.includes(uid)
    const isAdmin = adminIds.includes(uid)
    const isLinkedToUser = (userDoc.data()?.organizations ?? []).includes(orgId)

    if (!isMember && !isAdmin && !isLinkedToUser) {
      return NextResponse.json({ error: 'not-a-member' }, { status: 409 })
    }
    if (isAdmin && adminIds.length <= 1) {
      return NextResponse.json({ error: 'last-admin-cannot-leave' }, { status: 409 })
    }

    await db.runTransaction(async tx => {
      tx.update(db.collection('organizations').doc(orgId), {
        memberIds: FieldValue.arrayRemove(uid),
        adminIds: FieldValue.arrayRemove(uid),
        updatedAt: FieldValue.serverTimestamp(),
      })
      tx.update(db.collection('users').doc(uid), { organizations: FieldValue.arrayRemove(orgId), updatedAt: FieldValue.serverTimestamp() })
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const authError = authErrorResponse(err)
    if (authError) return authError
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
