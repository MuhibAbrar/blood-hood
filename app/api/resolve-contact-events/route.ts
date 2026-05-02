import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// POST /api/resolve-contact-events
// Body: { eventIds, donatedEventId, donorId, seekerId }
export async function POST(req: NextRequest) {
  try {
    const { eventIds, donatedEventId, donorId, seekerId } = await req.json()
    if (!eventIds || !seekerId) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    const db = adminDb()
    const batch = db.batch()

    // Mark all contact events resolved
    for (const eventId of eventIds as string[]) {
      batch.update(db.collection('contactEvents').doc(eventId), {
        status: eventId === donatedEventId ? 'donated' : 'not_donated',
      })
    }

    if (donatedEventId && donorId) {
      const [eventSnap, seekerSnap, donorSnap] = await Promise.all([
        db.collection('contactEvents').doc(donatedEventId).get(),
        db.collection('users').doc(seekerId).get(),
        db.collection('users').doc(donorId as string).get(),
      ])

      const eventData  = eventSnap.data()
      const seekerName = seekerSnap.data()?.name ?? 'অজানা'
      let orgId: string | null = donorSnap.data()?.organizations?.[0] ?? null
      if (!orgId) {
        const adminOrgSnap = await db.collection('organizations')
          .where('adminIds', 'array-contains', donorId).limit(1).get()
        if (!adminOrgSnap.empty) orgId = adminOrgSnap.docs[0].id
      }

      // Update donor's stats
      batch.update(db.collection('users').doc(donorId as string), {
        totalDonations: FieldValue.increment(1),
        lastDonatedAt:  FieldValue.serverTimestamp(),
        isAvailable:    false,
      })

      // Update org's donation count
      if (orgId) {
        batch.update(db.collection('organizations').doc(orgId), {
          totalDonations: FieldValue.increment(1),
        })
      }

      // Create a donations document so monthly stats pick it up
      const donationRef = db.collection('donations').doc()
      batch.set(donationRef, {
        donorId,
        donorName:          eventData?.donorName   ?? '',
        requestId:          null,
        recipientName:      seekerName,
        hospital:           'সরাসরি যোগাযোগ',
        bloodGroup:         eventData?.donorBloodGroup ?? '',
        donatedAt:          FieldValue.serverTimestamp(),
        verifiedBy:         null,
        campId:             null,
        orgId,
        externalDonorPhone: null,
      })
    }

    await batch.commit()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
