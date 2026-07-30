import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireOrgAdmin } from '@/lib/api-auth'
import { CURRENT_SCHEMA_VERSION } from '@/lib/schema-version'
import type { CampStatus } from '@/types'

const CAMP_STATUSES: CampStatus[] = ['upcoming', 'ongoing', 'completed']

const cleanCampInput = (value: Record<string, unknown>) => {
  const title = typeof value.title === 'string' ? value.title.trim().slice(0, 120) : ''
  const venue = typeof value.venue === 'string' ? value.venue.trim().slice(0, 160) : ''
  const area = typeof value.area === 'string' ? value.area.trim().slice(0, 80) : ''
  const district = typeof value.district === 'string' ? value.district.trim().slice(0, 40) : ''
  const status = CAMP_STATUSES.includes(value.status as CampStatus)
    ? value.status as CampStatus
    : 'upcoming'
  const dateMs = new Date(typeof value.date === 'string' ? value.date : '').getTime()
  if (!title || !venue || !area || !Number.isFinite(dateMs)) {
    throw new ApiAuthError(400, 'Invalid camp details')
  }
  return { title, venue, area, district, status, date: Timestamp.fromMillis(dateMs) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action
    const db = adminDb()

    if (action === 'create') {
      const organizationId = typeof body.data?.organizationId === 'string' ? body.data.organizationId : ''
      if (!organizationId) throw new ApiAuthError(400, 'organizationId required')
      const actor = await requireOrgAdmin(req, organizationId)
      const input = cleanCampInput(body.data)
      const campRef = db.collection('camps').doc()
      await campRef.create({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        ...input,
        organizationId,
        registeredDonors: [],
        donatedUids: [],
        totalCollected: 0,
        createdBy: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true, id: campRef.id })
    }

    const campId = typeof body.campId === 'string' ? body.campId : ''
    if (!campId) throw new ApiAuthError(400, 'campId required')
    const campRef = db.collection('camps').doc(campId)
    const campSnap = await campRef.get()
    if (!campSnap.exists) throw new ApiAuthError(404, 'Camp not found')
    const organizationId = campSnap.data()?.organizationId
    if (typeof organizationId !== 'string' || !organizationId) {
      throw new ApiAuthError(409, 'Camp organization missing')
    }
    await requireOrgAdmin(req, organizationId)

    if (action === 'update') {
      const input = cleanCampInput({ ...campSnap.data(), ...body.data })
      await campRef.update({ ...input, updatedAt: FieldValue.serverTimestamp() })
      return NextResponse.json({ success: true })
    }
    if (action === 'delete') {
      await campRef.delete()
      return NextResponse.json({ success: true })
    }

    throw new ApiAuthError(400, 'Unsupported action')
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to manage camp' }, { status: 500 })
  }
}
