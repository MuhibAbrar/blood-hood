import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminMessaging } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

export async function GET(req: NextRequest) {
  // Vercel cron secret দিয়ে unauthorized access আটকাই
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = adminDb()
  const messaging = adminMessaging()
  const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const deleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // শুধু open requests fetch করি, createdAt filter code-এ করব (composite index এড়াতে)
  const openSnap = await db.collection('bloodRequests')
    .where('status', '==', 'open')
    .get()

  const toCancel = openSnap.docs.filter(d => {
    const createdAt = d.data().createdAt as Timestamp | null
    return createdAt && createdAt < sevenDaysAgo
  })

  if (toCancel.length === 0) {
    return NextResponse.json({ success: true, cancelled: 0 })
  }

  // Batch-এ সব cancel করি + notification save করি
  const batch = db.batch()

  for (const docSnap of toCancel) {
    const data = docSnap.data()

    // Request cancel
    batch.update(docSnap.ref, { status: 'cancelled' })

    // Requester-এর জন্য notification
    if (data.requestedBy) {
      const notifRef = db.collection('notifications').doc()
      batch.set(notifRef, {
        userId: data.requestedBy,
        title: '⏰ রক্তের অনুরোধ স্বয়ংক্রিয়ভাবে বাতিল হয়েছে',
        body: `${data.patientName}-এর ${data.bloodGroup} রক্তের অনুরোধ ৭ দিন পরেও পূর্ণ না হওয়ায় বাতিল হয়েছে। প্রয়োজনে নতুন অনুরোধ দিন।`,
        type: 'request_fulfilled',
        read: false,
        data: {
          requestId: docSnap.id,
          link: `/requests/${docSnap.id}`,
        },
        createdAt: FieldValue.serverTimestamp(),
        deleteAt,
      })
    }
  }

  await batch.commit()

  // Push notification পাঠাই (batch commit এর পরে)
  for (const docSnap of toCancel) {
    const data = docSnap.data()
    if (!data.requestedBy) continue

    try {
      const userSnap = await db.collection('users').doc(data.requestedBy).get()
      const token = userSnap.data()?.fcmToken
      if (!token) continue

      await messaging.send({
        token,
        notification: {
          title: '⏰ রক্তের অনুরোধ বাতিল হয়েছে',
          body: `${data.patientName}-এর অনুরোধ ৭ দিনে পূর্ণ না হওয়ায় বাতিল হয়েছে।`,
        },
        data: {
          type: 'request_cancelled',
          requestId: docSnap.id,
          link: `/requests/${docSnap.id}`,
        },
        android: { notification: { sound: 'default' } },
        webpush: { fcmOptions: { link: `/requests/${docSnap.id}` } },
      })
    } catch { /* ignore individual failures */ }
  }

  console.log(`[auto-cancel] ${toCancel.length} requests cancelled`)
  return NextResponse.json({ success: true, cancelled: toCancel.length })
}
