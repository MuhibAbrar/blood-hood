import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, requireUser } from '@/lib/api-auth'
import { DISTRICTS_DATA } from '@/lib/constants'
import { CURRENT_SCHEMA_VERSION } from '@/lib/schema-version'
import type { BloodGroup, Urgency } from '@/types'

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const URGENCIES: Urgency[] = ['normal', 'urgent']
const PHONE_PATTERN = /^01[3-9]\d{8}$/

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''

const validName = (value: string) =>
  value.length >= 3
  && /^[A-Za-z\u0980-\u09FF][A-Za-z\u0980-\u09FF\s.'’-]*$/.test(value)

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const input = await req.json() as Record<string, unknown>
    const db = adminDb()
    const actorSnap = await db.collection('users').doc(actor.uid).get()
    if (!actorSnap.exists) return NextResponse.json({ error: 'user not found' }, { status: 404 })

    const actorData = actorSnap.data()!
    const district = cleanText(actorData.district, 40)
    const patientName = cleanText(input.patientName, 80)
    const patientProblem = cleanText(input.patientProblem, 80)
    const hospital = cleanText(input.hospital, 120)
    const area = cleanText(input.area, 80)
    const contactPhone = cleanText(input.contactPhone, 20).replace(/\D/g, '')
    const requesterRelation = cleanText(input.requesterRelation, 80)
    const note = cleanText(input.note, 180) || null
    const bloodGroup = input.bloodGroup as BloodGroup
    const urgency = input.urgency as Urgency
    const bags = Number(input.bags)
    const neededAtMs = Number(input.neededAtMs)

    if (!district || !DISTRICTS_DATA[district]?.includes(area)) {
      return NextResponse.json({ error: 'invalid account district or request area' }, { status: 400 })
    }
    if (!validName(patientName) || !validName(hospital)) {
      return NextResponse.json({ error: 'invalid patient or hospital name' }, { status: 400 })
    }
    if (!patientProblem || !requesterRelation) {
      return NextResponse.json({ error: 'patient problem and relation are required' }, { status: 400 })
    }
    if (input.confirmedAccurate !== true) {
      return NextResponse.json({ error: 'request accuracy must be confirmed' }, { status: 400 })
    }
    if (!BLOOD_GROUPS.includes(bloodGroup) || !URGENCIES.includes(urgency)) {
      return NextResponse.json({ error: 'invalid blood group or urgency' }, { status: 400 })
    }
    if (!Number.isInteger(bags) || bags < 1 || bags > 10 || !PHONE_PATTERN.test(contactPhone)) {
      return NextResponse.json({ error: 'invalid bags or phone number' }, { status: 400 })
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!Number.isFinite(neededAtMs) || neededAtMs < today.getTime() || neededAtMs > Date.now() + 366 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'invalid needed date' }, { status: 400 })
    }

    const orgId = typeof input.orgId === 'string' && input.orgId ? input.orgId : null
    if (orgId) {
      const orgSnap = await db.collection('organizations').doc(orgId).get()
      if (!orgSnap.exists || !orgSnap.data()?.adminIds?.includes(actor.uid)) {
        return NextResponse.json({ error: 'organization admin access required' }, { status: 403 })
      }
    }

    const requestRef = db.collection('bloodRequests').doc()
    await requestRef.create({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      patientName,
      patientProblem,
      bloodGroup,
      hospital,
      district,
      area,
      contactPhone,
      requesterRelation,
      requestedBy: actor.uid,
      urgency,
      bags,
      orgId,
      note,
      neededAt: Timestamp.fromMillis(neededAtMs),
      confirmedAccurate: input.confirmedAccurate === true,
      status: 'open',
      respondedBy: [],
      responseTypes: {},
      fulfilledBy: null,
      fulfilledByName: null,
      fulfilledByPhone: null,
      fulfilledAt: null,
      expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ success: true, id: requestRef.id })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to create request' }, { status: 500 })
  }
}
