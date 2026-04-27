import { NextRequest, NextResponse } from 'next/server'
import { adminMessaging, adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    const db = adminDb()
    const messaging = adminMessaging()

    // ── Blood Request notification ───────────────────────────────────────
    if (type === 'blood_request') {
      const { bloodGroup, hospital, area, patientName, urgency, requestId } = data

      // Compatible blood groups যারা দিতে পারবে
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

      // Firestore থেকে compatible + available donors খুঁজি
      const usersSnap = await db.collection('users')
        .where('isAvailable', '==', true)
        .where('bloodGroup', 'in', donors.slice(0, 10)) // Firestore 'in' limit = 10
        .get()

      const tokens: string[] = usersSnap.docs
        .map(d => d.data().fcmToken)
        .filter(Boolean)

      if (tokens.length === 0) {
        return NextResponse.json({ success: true, sent: 0 })
      }

      const title = urgency === 'urgent' ? `🔴 জরুরি ${bloodGroup} রক্ত লাগবে!` : `🩸 ${bloodGroup} রক্তের অনুরোধ`
      const bodyText = `${patientName} — ${hospital}, ${area}`

      // Batch করে পাঠাই (FCM max 500 per batch)
      const batches = []
      for (let i = 0; i < tokens.length; i += 500) {
        batches.push(tokens.slice(i, i + 500))
      }

      let totalSent = 0
      for (const batch of batches) {
        const result = await messaging.sendEachForMulticast({
          tokens: batch,
          notification: { title, body: bodyText },
          data: { type: 'blood_request', requestId: requestId ?? '' },
          android: { priority: urgency === 'urgent' ? 'high' : 'normal' },
          webpush: {
            notification: { icon: '/icons/icon-192x192.png', badge: '/icons/icon-72x72.png' },
            fcmOptions: { link: `/requests/${requestId}` },
          },
        })
        totalSent += result.successCount
      }

      return NextResponse.json({ success: true, sent: totalSent })
    }

    // ── Camp reminder notification ────────────────────────────────────────
    if (type === 'camp_reminder') {
      const { campId, campTitle, campDate, registeredDonors } = data

      if (!registeredDonors?.length) return NextResponse.json({ success: true, sent: 0 })

      // Registered donor-দের tokens আনি
      const usersSnap = await db.collection('users')
        .where('uid', 'in', registeredDonors.slice(0, 10))
        .get()

      const tokens: string[] = usersSnap.docs
        .map(d => d.data().fcmToken)
        .filter(Boolean)

      if (tokens.length === 0) return NextResponse.json({ success: true, sent: 0 })

      await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: '🏕️ ক্যাম্প আগামীকাল!',
          body: `${campTitle} — ${campDate}`,
        },
        data: { type: 'camp_reminder', campId },
        webpush: { fcmOptions: { link: `/camps/${campId}` } },
      })

      return NextResponse.json({ success: true, sent: tokens.length })
    }

    // ── Org announcement notification ────────────────────────────────────
    if (type === 'org_announcement') {
      const { orgId, orgName, message, memberIds } = data

      if (!memberIds?.length) return NextResponse.json({ success: true, sent: 0 })

      // Batch করে member tokens আনি (Firestore 'in' max 10)
      const allTokens: string[] = []
      for (let i = 0; i < memberIds.length; i += 10) {
        const batch = memberIds.slice(i, i + 10)
        const snap = await db.collection('users').where('uid', 'in', batch).get()
        snap.docs.forEach(d => {
          const token = d.data().fcmToken
          if (token) allTokens.push(token)
        })
      }

      if (allTokens.length === 0) return NextResponse.json({ success: true, sent: 0 })

      await messaging.sendEachForMulticast({
        tokens: allTokens,
        notification: {
          title: `📢 ${orgName}`,
          body: message,
        },
        data: { type: 'org_announcement', orgId },
        webpush: { fcmOptions: { link: `/organizations/${orgId}` } },
      })

      return NextResponse.json({ success: true, sent: allTokens.length })
    }

    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })

  } catch (err) {
    console.error('Notify API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
