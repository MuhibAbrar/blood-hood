import { NextRequest, NextResponse } from 'next/server'
import { adminMessaging, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// Firestore-এ notification document save করি
async function saveNotification(
  db: FirebaseFirestore.Firestore,
  userId: string,
  title: string,
  body: string,
  type: string,
  data: Record<string, string>
) {
  await db.collection('notifications').add({
    userId,
    title,
    body,
    type,
    read: false,
    data,
    createdAt: FieldValue.serverTimestamp(),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    const db = adminDb()
    const messaging = adminMessaging()

    // ── Blood Request notification ────────────────────────────────────────
    if (type === 'blood_request') {
      const { bloodGroup, hospital, area, patientName, urgency, requestId } = data

      const compatibleGroups: Record<string, string[]> = {
        'A+':  ['A+', 'A-', 'O+', 'O-'],
        'A-':  ['A-', 'O-'],
        'B+':  ['B+', 'B-', 'O+', 'O-'],
        'B-':  ['B-', 'O-'],
        'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        'AB-': ['A-', 'B-', 'AB-', 'O-'],
        'O+':  ['O+', 'O-'],
        'O-':  ['O-'],
      }

      const donors = compatibleGroups[bloodGroup] ?? [bloodGroup]

      const usersSnap = await db.collection('users')
        .where('isAvailable', '==', true)
        .where('bloodGroup', 'in', donors.slice(0, 10))
        .get()

      if (usersSnap.empty) return NextResponse.json({ success: true, sent: 0 })

      const title = urgency === 'urgent'
        ? `🔴 জরুরি ${bloodGroup} রক্ত লাগবে!`
        : `🩸 ${bloodGroup} রক্তের অনুরোধ`
      const bodyText = `${patientName} — ${hospital}, ${area}`

      const tokens: string[] = []
      const userIds: string[] = []

      usersSnap.docs.forEach(d => {
        const token = d.data().fcmToken
        if (token) {
          tokens.push(token)
          userIds.push(d.data().uid)
        }
      })

      // Firestore-এ সব donors-এর জন্য notification save করি
      await Promise.all(
        userIds.map(uid =>
          saveNotification(db, uid, title, bodyText, 'blood_request', {
            requestId: requestId ?? '',
            link: `/requests/${requestId}`,
          })
        )
      )

      // FCM push পাঠাই
      if (tokens.length > 0) {
        const batches: string[][] = []
        for (let i = 0; i < tokens.length; i += 500) batches.push(tokens.slice(i, i + 500))

        let totalSent = 0
        for (const batch of batches) {
          const result = await messaging.sendEachForMulticast({
            tokens: batch,
            notification: { title, body: bodyText },
            data: { type: 'blood_request', requestId: requestId ?? '', link: `/requests/${requestId}` },
            android: {
              priority: urgency === 'urgent' ? 'high' : 'normal',
              notification: { sound: 'default', channelId: 'blood_requests' },
            },
            webpush: {
              notification: {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                vibrate: [300, 100, 300],
              },
              fcmOptions: { link: `/requests/${requestId}` },
            },
          })
          totalSent += result.successCount
        }
        return NextResponse.json({ success: true, sent: totalSent })
      }

      return NextResponse.json({ success: true, sent: 0 })
    }

    // ── Camp reminder ─────────────────────────────────────────────────────
    if (type === 'camp_reminder') {
      const { campId, campTitle, campDate, registeredDonors } = data
      if (!registeredDonors?.length) return NextResponse.json({ success: true, sent: 0 })

      const title = '🏕️ ক্যাম্প আগামীকাল!'
      const bodyText = `${campTitle} — ${campDate}`

      const usersSnap = await db.collection('users')
        .where('uid', 'in', registeredDonors.slice(0, 10))
        .get()

      const tokens: string[] = []
      const userIds: string[] = []
      usersSnap.docs.forEach(d => {
        const token = d.data().fcmToken
        if (token) { tokens.push(token); userIds.push(d.data().uid) }
      })

      await Promise.all(
        userIds.map(uid =>
          saveNotification(db, uid, title, bodyText, 'camp_reminder', {
            campId, link: `/camps/${campId}`,
          })
        )
      )

      if (tokens.length > 0) {
        await messaging.sendEachForMulticast({
          tokens,
          notification: { title, body: bodyText },
          data: { type: 'camp_reminder', campId, link: `/camps/${campId}` },
          android: { notification: { sound: 'default' } },
          webpush: { fcmOptions: { link: `/camps/${campId}` } },
        })
      }

      return NextResponse.json({ success: true, sent: tokens.length })
    }

    // ── Org announcement ──────────────────────────────────────────────────
    if (type === 'org_announcement') {
      const { orgId, orgName, message, memberIds } = data
      if (!memberIds?.length) return NextResponse.json({ success: true, sent: 0 })

      const title = `📢 ${orgName}`
      const allTokens: string[] = []
      const allUserIds: string[] = []

      for (let i = 0; i < memberIds.length; i += 10) {
        const batch = memberIds.slice(i, i + 10)
        const snap = await db.collection('users').where('uid', 'in', batch).get()
        snap.docs.forEach(d => {
          const token = d.data().fcmToken
          if (token) { allTokens.push(token); allUserIds.push(d.data().uid) }
          else allUserIds.push(d.data().uid) // save notif even without token
        })
      }

      // সবার জন্য Firestore notification
      await Promise.all(
        allUserIds.map(uid =>
          saveNotification(db, uid, title, message, 'org_announcement', {
            orgId, link: `/organizations/${orgId}`,
          })
        )
      )

      if (allTokens.length > 0) {
        await messaging.sendEachForMulticast({
          tokens: allTokens,
          notification: { title, body: message },
          data: { type: 'org_announcement', orgId, link: `/organizations/${orgId}` },
          android: { notification: { sound: 'default' } },
          webpush: { fcmOptions: { link: `/organizations/${orgId}` } },
        })
      }

      return NextResponse.json({ success: true, sent: allTokens.length })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })

  } catch (err) {
    console.error('Notify API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
