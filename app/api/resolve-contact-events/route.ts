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

    for (const eventId of eventIds as string[]) {
      batch.update(db.collection('contactEvents').doc(eventId), {
        status: eventId === donatedEventId ? 'donated' : 'not_donated',
      })
    }

    if (donatedEventId && donorId) {
      batch.update(db.collection('users').doc(donorId as string), {
        totalDonations: FieldValue.increment(1),
        lastDonatedAt: FieldValue.serverTimestamp(),
        isAvailable: false,
      })
    }

    await batch.commit()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
