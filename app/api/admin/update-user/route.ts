import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, requireRole } from '@/lib/api-auth'

// POST /api/admin/update-user
// Body: { uid, data: Partial<User> }
// Uses Admin SDK — bypasses Firestore security rules
export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole(req, ['admin', 'superadmin'])
    const { uid, data } = await req.json()
    if (!uid || !data) return NextResponse.json({ error: 'uid and data required' }, { status: 400 })

    const db = adminDb()
    const [actorSnap, targetSnap] = await Promise.all([
      db.collection('users').doc(actor.uid).get(),
      db.collection('users').doc(uid).get(),
    ])
    if (!targetSnap.exists) return NextResponse.json({ error: 'user not found' }, { status: 404 })
    const actorRole = actorSnap.data()?.role
    if (actorRole !== 'superadmin' && targetSnap.data()?.role === 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const allowedFields = new Set(['name', 'phone', 'bloodGroup', 'district', 'upazila', 'area', 'age', 'gender', 'isAvailable', 'isVerified'])
    if (actorRole === 'superadmin') allowedFields.add('role')

    const safeData = Object.fromEntries(
      Object.entries(data as Record<string, unknown>).filter(([key]) => allowedFields.has(key))
    )
    if (Object.keys(safeData).length === 0) {
      return NextResponse.json({ error: 'no allowed fields' }, { status: 400 })
    }

    await db.collection('users').doc(uid).update({
      ...safeData,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const authError = authErrorResponse(err)
    if (authError) return authError
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
