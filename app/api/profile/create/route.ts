import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, requireUser } from '@/lib/api-auth'
import { DISTRICTS_DATA, getDivisionForDistrict } from '@/lib/constants'
import { BLOOD_GROUPS } from '@/lib/bloodCompatibility'
import { USER_SCHEMA_VERSION } from '@/lib/schema-version'
import { buildDistrictSearchName, normalizeSearchName } from '@/lib/search-normalization'

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const input = await req.json() as Record<string, unknown>
    const name = cleanText(input.name, 80)
    const phone = cleanText(input.phone, 11)
    const bloodGroup = cleanText(input.bloodGroup, 3)
    const district = cleanText(input.district, 40)
    const upazila = cleanText(input.upazila, 80)
    const area = cleanText(input.area, 120)
    const gender = cleanText(input.gender, 10)
    const age = Number(input.age)

    if (name.length < 3 || !/^[A-Za-z\u0980-\u09FF][A-Za-z\u0980-\u09FF\s.'’-]*$/.test(name)) {
      return NextResponse.json({ error: 'invalid name' }, { status: 400 })
    }
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: 'invalid phone' }, { status: 400 })
    }
    if (actor.email !== `${phone}@bloodhood.app`) {
      return NextResponse.json({ error: 'phone does not match account' }, { status: 403 })
    }
    if (!(BLOOD_GROUPS as readonly string[]).includes(bloodGroup)) {
      return NextResponse.json({ error: 'invalid blood group' }, { status: 400 })
    }
    if (!['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json({ error: 'invalid gender' }, { status: 400 })
    }
    if (!Number.isInteger(age) || age < 18 || age > 60) {
      return NextResponse.json({ error: 'invalid age' }, { status: 400 })
    }
    if (!DISTRICTS_DATA[district]?.includes(upazila)) {
      return NextResponse.json({ error: 'invalid district or upazila' }, { status: 400 })
    }

    const userRef = adminDb().collection('users').doc(actor.uid)
    const existing = await userRef.get()
    if (existing.exists) {
      return NextResponse.json({ error: 'profile already exists' }, { status: 409 })
    }

    const now = FieldValue.serverTimestamp()
    await userRef.create({
      schemaVersion: USER_SCHEMA_VERSION,
      uid: actor.uid,
      name,
      phone,
      bloodGroup,
      division: getDivisionForDistrict(district),
      district,
      upazila,
      area,
      age,
      gender,
      isAvailable: true,
      lastDonatedAt: null,
      totalDonations: 0,
      organizations: [],
      role: 'donor',
      fcmToken: null,
      isVerified: false,
      profilePhoto: null,
      searchName: normalizeSearchName(name),
      districtSearchName: buildDistrictSearchName(district, name),
      createdAt: now,
      updatedAt: now,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    console.error('Create profile error:', error)
    return NextResponse.json({ error: 'Unable to create profile' }, { status: 500 })
  }
}
