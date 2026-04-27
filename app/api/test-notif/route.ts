import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// GET /api/test-notif?uid=YOUR_UID
// Saves a test notification directly to Firestore for debugging
export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

  try {
    const db = adminDb()
    const ref = await db.collection('notifications').add({
      userId: uid,
      title: '🧪 টেস্ট নোটিফিকেশন',
      body: 'Firestore সংযোগ কাজ করছে!',
      type: 'broadcast',
      read: false,
      data: { link: '/notifications' },
      createdAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ success: true, id: ref.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
