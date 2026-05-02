import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// POST /api/merge-donor
// Body: { newUid, phone }
// 1. Finds manual_ doc by phone, merges historical data into new UID doc, deletes old doc
// 2. Finds external donations by phone, links them to the new user
export async function POST(req: NextRequest) {
  try {
    const { newUid, phone } = await req.json()
    if (!newUid || !phone) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    const db = adminDb()
    let merged = false

    // ── 1. Manual donor merge ────────────────────────────────────────────────
    const snap = await db.collection('users').where('phone', '==', phone).where('manuallyAdded', '==', true).get()

    if (!snap.empty) {
      const oldDoc = snap.docs[0]
      const oldData = oldDoc.data()
      const oldUid = oldDoc.id

      if (oldUid !== newUid) {
        const orgIds: string[] = oldData.organizations ?? []

        await db.collection('users').doc(newUid).update({
          totalDonations: oldData.totalDonations ?? 0,
          isVerified: oldData.isVerified ?? false,
          organizations: orgIds,
          lastDonatedAt: oldData.lastDonatedAt ?? null,
          manuallyAdded: false,
          updatedAt: FieldValue.serverTimestamp(),
        })

        await Promise.all(orgIds.map(orgId =>
          db.collection('organizations').doc(orgId).update({
            memberIds: FieldValue.arrayRemove(oldUid),
          }).then(() =>
            db.collection('organizations').doc(orgId).update({
              memberIds: FieldValue.arrayUnion(newUid),
            })
          ).catch(() => { /* ignore */ })
        ))

        await db.collection('users').doc(oldUid).delete()
        merged = true
      }
    }

    // ── 2. External donation merge ────────────────────────────────────────────
    const donationSnap = await db.collection('donations')
      .where('externalDonorPhone', '==', phone)
      .get()

    if (!donationSnap.empty) {
      const newUserDoc = await db.collection('users').doc(newUid).get()
      const newUserName = newUserDoc.data()?.name ?? ''

      let mergedCount = 0
      let latestDonatedAt: FirebaseFirestore.Timestamp | null = null

      const batch = db.batch()
      for (const donationDoc of donationSnap.docs) {
        const data = donationDoc.data()
        batch.update(donationDoc.ref, {
          donorId: newUid,
          donorName: newUserName,
          externalDonorPhone: null,
        })
        mergedCount++
        const donatedAt = data.donatedAt as FirebaseFirestore.Timestamp | null
        if (donatedAt && (!latestDonatedAt || donatedAt.seconds > latestDonatedAt.seconds)) {
          latestDonatedAt = donatedAt
        }
      }
      await batch.commit()

      const userRef = db.collection('users').doc(newUid)
      const userDoc = await userRef.get()
      const currentTotal = userDoc.data()?.totalDonations ?? 0
      const currentLastDonated = userDoc.data()?.lastDonatedAt as FirebaseFirestore.Timestamp | null

      const updates: Record<string, unknown> = {
        totalDonations: currentTotal + mergedCount,
        updatedAt: FieldValue.serverTimestamp(),
      }

      if (latestDonatedAt && (!currentLastDonated || latestDonatedAt.seconds > currentLastDonated.seconds)) {
        updates.lastDonatedAt = latestDonatedAt
        const daysSince = (Date.now() / 1000 - latestDonatedAt.seconds) / 86400
        if (daysSince < 90) updates.isAvailable = false
      }

      await userRef.update(updates)

      // Update org donation count if user belongs to one
      const orgId: string | null = userDoc.data()?.organizations?.[0] ?? null
      if (orgId && mergedCount > 0) {
        await db.collection('organizations').doc(orgId).update({
          totalDonations: FieldValue.increment(mergedCount),
        }).catch(() => {})
      }

      merged = true
    }

    return NextResponse.json({ success: true, merged })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
