import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, requireUser } from '@/lib/api-auth'
import { DISTRICTS_DATA, getDivisionForDistrict } from '@/lib/constants'
import { USER_SCHEMA_VERSION } from '@/lib/schema-version'
import { buildDistrictSearchName, normalizeSearchName } from '@/lib/search-normalization'

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const input = await req.json() as Record<string, unknown>
    const db = adminDb()
    const userRef = db.collection('users').doc(actor.uid)
    const userSnap = await userRef.get()
    if (!userSnap.exists) return NextResponse.json({ error: 'user not found' }, { status: 404 })

    const current = userSnap.data()!
    const update: Record<string, unknown> = {}

    if (typeof input.isAvailable === 'boolean') update.isAvailable = input.isAvailable
    if (typeof input.fcmToken === 'string') {
      const token = input.fcmToken.trim()
      if (!token || token.length > 4096) {
        return NextResponse.json({ error: 'invalid notification token' }, { status: 400 })
      }
      update.fcmToken = token
    }

    const hasProfileFields = ['name', 'district', 'upazila', 'area'].some((key) => key in input)
    if (hasProfileFields) {
      const name = cleanText(input.name ?? current.name, 80)
      const district = cleanText(input.district ?? current.district, 40)
      const upazila = cleanText(input.upazila ?? current.upazila, 80)
      const area = cleanText(input.area ?? current.area, 120)
      if (name.length < 3 || !/^[A-Za-z\u0980-\u09FF][A-Za-z\u0980-\u09FF\s.'’-]*$/.test(name)) {
        return NextResponse.json({ error: 'invalid name' }, { status: 400 })
      }
      if (!DISTRICTS_DATA[district]?.includes(upazila)) {
        return NextResponse.json({ error: 'invalid district or upazila' }, { status: 400 })
      }
      update.name = name
      update.division = getDivisionForDistrict(district)
      update.district = district
      update.upazila = upazila
      update.area = area
      update.searchName = normalizeSearchName(name)
      update.districtSearchName = buildDistrictSearchName(district, name)
      update.schemaVersion = USER_SCHEMA_VERSION
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'no allowed fields' }, { status: 400 })
    }
    update.updatedAt = FieldValue.serverTimestamp()
    await userRef.update(update)
    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to update profile' }, { status: 500 })
  }
}
