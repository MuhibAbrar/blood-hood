import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, requireRole } from '@/lib/api-auth'
import { deleteUserAccount } from '@/lib/delete-user-account'

// Removes login access and active personal data. Historical activity is anonymized.
export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole(req, ['admin', 'superadmin'])
    const body = await req.json()
    const uid = typeof body.uid === 'string' ? body.uid.trim() : ''
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })
    if (uid === actor.uid) return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })

    const db = adminDb()
    const [targetUser, actorUser] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(actor.uid).get(),
    ])
    if (targetUser.data()?.role === 'superadmin' && actorUser.data()?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only a super admin can delete another super admin' }, { status: 403 })
    }

    const result = await deleteUserAccount(uid)
    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    const authError = authErrorResponse(err)
    if (authError) return authError
    console.error('Delete user failed:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
