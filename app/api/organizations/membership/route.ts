import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireOrgAdmin } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const { action, orgId, uid, requestId } = await req.json()
    if (!['accept', 'reject', 'remove'].includes(action) || typeof orgId !== 'string') {
      return NextResponse.json({ error: 'Invalid membership action' }, { status: 400 })
    }
    await requireOrgAdmin(req, orgId)
    const db = adminDb()
    const orgRef = db.collection('organizations').doc(orgId)
    const userRef = typeof uid === 'string' ? db.collection('users').doc(uid) : null
    const joinRef = typeof requestId === 'string' ? db.collection('joinRequests').doc(requestId) : null

    await db.runTransaction(async tx => {
      const [orgSnap, userSnap, joinSnap] = await Promise.all([
        tx.get(orgRef), userRef ? tx.get(userRef) : Promise.resolve(null), joinRef ? tx.get(joinRef) : Promise.resolve(null),
      ])
      if (!orgSnap.exists) throw new ApiAuthError(404, 'Organization not found')
      if (action === 'reject') {
        if (!joinSnap?.exists || joinSnap.data()?.orgId !== orgId || joinSnap.data()?.status !== 'pending') throw new ApiAuthError(409, 'Join request is no longer pending')
        tx.update(joinRef!, { status: 'rejected', updatedAt: FieldValue.serverTimestamp() })
        return
      }
      if (!userRef || !userSnap?.exists) throw new ApiAuthError(404, 'User not found')
      if (action === 'accept') {
        if (!joinSnap?.exists || joinSnap.data()?.orgId !== orgId || joinSnap.data()?.userId !== uid || joinSnap.data()?.status !== 'pending') throw new ApiAuthError(409, 'Join request is no longer pending')
        const organizations: string[] = userSnap.data()?.organizations ?? []
        if (organizations.length > 0 && !organizations.includes(orgId)) throw new ApiAuthError(409, 'User already belongs to another organization')
        tx.update(orgRef, { memberIds: FieldValue.arrayUnion(uid), updatedAt: FieldValue.serverTimestamp() })
        tx.update(userRef, { organizations: FieldValue.arrayUnion(orgId), updatedAt: FieldValue.serverTimestamp() })
        tx.update(joinRef!, { status: 'accepted', updatedAt: FieldValue.serverTimestamp() })
      } else {
        if (orgSnap.data()?.adminIds?.includes(uid)) throw new ApiAuthError(403, 'Organization admin cannot be removed as a member')
        tx.update(orgRef, { memberIds: FieldValue.arrayRemove(uid), updatedAt: FieldValue.serverTimestamp() })
        tx.update(userRef, { organizations: FieldValue.arrayRemove(orgId), updatedAt: FieldValue.serverTimestamp() })
      }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    console.error('Membership action error:', error)
    return NextResponse.json({ error: 'Unable to update membership' }, { status: 500 })
  }
}
