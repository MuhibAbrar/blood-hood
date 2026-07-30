import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireUser } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const { requestId } = await req.json()
    if (typeof requestId !== 'string' || !requestId.trim()) {
      return NextResponse.json({ error: 'requestId required' }, { status: 400 })
    }

    const db = adminDb()
    const requestRef = db.collection('bloodRequests').doc(requestId)
    const actorRef = db.collection('users').doc(actor.uid)

    await db.runTransaction(async (tx) => {
      const [requestSnap, actorSnap] = await Promise.all([
        tx.get(requestRef),
        tx.get(actorRef),
      ])
      if (!requestSnap.exists) throw new ApiAuthError(404, 'Request not found')
      const request = requestSnap.data()!
      const role = actorSnap.data()?.role
      const canCancel = request.requestedBy === actor.uid
        || role === 'admin'
        || role === 'superadmin'
      if (!canCancel) throw new ApiAuthError(403, 'Forbidden')
      if (request.status === 'fulfilled') {
        throw new ApiAuthError(409, 'Fulfilled request cannot be cancelled')
      }
      if (request.status === 'cancelled') return

      tx.update(requestRef, {
        status: 'cancelled',
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to cancel request' }, { status: 500 })
  }
}
