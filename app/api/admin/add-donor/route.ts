import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// POST /api/admin/add-donor
// Body: { name, phone, bloodGroup, upazila, area, gender, age? }
// Uses Admin SDK — bypasses Firestore security rules
export async function POST(req: NextRequest) {
  try {
    const { name, phone, bloodGroup, upazila, area, gender, age, orgId } = await req.json()

    if (!name || !phone || !bloodGroup || !upazila || !gender) {
      return NextResponse.json({ error: 'missing-fields' }, { status: 400 })
    }

    const db = adminDb()

    // Check if phone already exists
    const existing = await db.collection('users').where('phone', '==', phone).get()
    if (!existing.empty) {
      return NextResponse.json({ error: 'phone-exists' }, { status: 409 })
    }

    const uid = `manual_${phone}`
    const now = FieldValue.serverTimestamp()

    await db.collection('users').doc(uid).set({
      uid,
      name,
      phone,
      bloodGroup,
      upazila,
      area: area ?? '',
      gender,
      age: age ?? 0,
      isAvailable: true,
      lastDonatedAt: null,
      totalDonations: 0,
      organizations: orgId ? [orgId] : [],
      role: 'donor',
      fcmToken: null,
      isVerified: false,
      profilePhoto: null,
      manuallyAdded: true,
      createdAt: now,
      updatedAt: now,
    })

    // If orgId provided, add to org's memberIds
    if (orgId) {
      await db.collection('organizations').doc(orgId).update({
        memberIds: FieldValue.arrayUnion(uid),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
