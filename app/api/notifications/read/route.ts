import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, requireUser } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const { id, all } = await req.json() as { id?: string; all?: boolean }
    const db = adminDb()

    if (all === true) {
      let updated = 0
      while (true) {
        const unread = await db.collection('notifications')
          .where('userId', '==', actor.uid)
          .where('read', '==', false)
          .limit(400)
          .get()
        if (unread.empty) break
        const batch = db.batch()
        unread.docs.forEach((notification) => {
          batch.update(notification.ref, {
            read: true,
            updatedAt: FieldValue.serverTimestamp(),
          })
        })
        await batch.commit()
        updated += unread.size
        if (unread.size < 400) break
      }
      return NextResponse.json({ success: true, updated })
    }

    if (typeof id !== 'string' || !id || id.length > 200) {
      return NextResponse.json({ error: 'notification id required' }, { status: 400 })
    }
    const notificationRef = db.collection('notifications').doc(id)
    const notification = await notificationRef.get()
    if (!notification.exists) return NextResponse.json({ error: 'notification not found' }, { status: 404 })
    if (notification.data()?.userId !== actor.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (notification.data()?.read !== true) {
      await notificationRef.update({
        read: true,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    return NextResponse.json({ success: true, updated: 1 })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to update notifications' }, { status: 500 })
  }
}
