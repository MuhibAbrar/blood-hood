import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
const LEGACY_DISTRICT = 'খুলনা'

async function legacyUsers() {
  const snapshot = await adminDb().collection('users').get()
  return snapshot.docs.filter((doc) => {
    const district = doc.data().district
    return typeof district !== 'string' || district.trim() === ''
  })
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['superadmin'])
    const users = await legacyUsers()
    return NextResponse.json({ legacyUsers: users.length, targetDistrict: LEGACY_DISTRICT })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to inspect legacy users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['superadmin'])
    const users = await legacyUsers()
    let updated = 0

    for (let start = 0; start < users.length; start += 400) {
      const batch = adminDb().batch()
      const group = users.slice(start, start + 400)
      group.forEach((doc) => {
        batch.update(doc.ref, {
          district: LEGACY_DISTRICT,
          updatedAt: FieldValue.serverTimestamp(),
        })
      })
      await batch.commit()
      updated += group.length
    }

    return NextResponse.json({ success: true, updated, district: LEGACY_DISTRICT })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Legacy district migration failed' }, { status: 500 })
  }
}
