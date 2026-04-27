import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// POST /api/admin/update-user
// Body: { uid, data: Partial<User> }
// Uses Admin SDK — bypasses Firestore security rules
export async function POST(req: NextRequest) {
  try {
    const { uid, data } = await req.json()
    if (!uid || !data) return NextResponse.json({ error: 'uid and data required' }, { status: 400 })

    const db = adminDb()
    await db.collection('users').doc(uid).update({
      ...data,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
