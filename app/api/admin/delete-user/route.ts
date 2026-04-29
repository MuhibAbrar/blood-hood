import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// POST /api/admin/delete-user
// Body: { uid }
// Uses Admin SDK — bypasses Firestore security rules
export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json()
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

    const db = adminDb()
    await db.collection('users').doc(uid).delete()

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
