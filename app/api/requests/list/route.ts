import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireUser } from '@/lib/api-auth'
import type { BloodGroup, RequestStatus } from '@/types'

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const STATUSES: RequestStatus[] = ['open', 'fulfilled', 'cancelled']
const timestampMs = (value: unknown) =>
  value && typeof (value as { toMillis?: unknown }).toMillis === 'function'
    ? (value as { toMillis: () => number }).toMillis()
    : null

export async function GET(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const db = adminDb()
    const actorSnap = await db.collection('users').doc(actor.uid).get()
    if (!actorSnap.exists) throw new ApiAuthError(404, 'user not found')
    const district = actorSnap.data()?.district?.trim()
    if (!district) throw new ApiAuthError(400, 'profile district required')

    const params = req.nextUrl.searchParams
    const pageSize = Math.min(30, Math.max(1, Number(params.get('limit') ?? 30)))
    const statusInput = params.get('status')
    const status = statusInput && STATUSES.includes(statusInput as RequestStatus)
      ? statusInput as RequestStatus
      : null
    const bloodInput = params.get('bloodGroup')
    const bloodGroup = bloodInput && BLOOD_GROUPS.includes(bloodInput as BloodGroup)
      ? bloodInput as BloodGroup
      : null

    let query: Query = db.collection('bloodRequests').where('district', '==', district)
    if (status) query = query.where('status', '==', status)
    if (bloodGroup) query = query.where('bloodGroup', '==', bloodGroup)
    query = query.orderBy('createdAt', 'desc')

    const cursor = params.get('cursor')
    if (cursor) {
      const cursorSnap = await db.collection('bloodRequests').doc(cursor).get()
      if (cursorSnap.exists) query = query.startAfter(cursorSnap)
    }

    const snapshot = await query.limit(pageSize + 1).get()
    const hasMore = snapshot.docs.length > pageSize
    const page = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs
    const requests = page.map((document) => {
      const data = document.data()
      return {
        id: document.id,
        patientName: data.patientName ?? '',
        patientProblem: data.patientProblem ?? null,
        bloodGroup: data.bloodGroup,
        hospital: data.hospital ?? '',
        district,
        area: data.area ?? '',
        contactPhone: data.contactPhone ?? '',
        requesterRelation: data.requesterRelation ?? null,
        requestedBy: data.requestedBy ?? '',
        urgency: data.urgency ?? 'normal',
        status: data.status ?? 'open',
        respondedBy: Array.isArray(data.respondedBy) ? data.respondedBy : [],
        responseTypes: data.responseTypes ?? {},
        fulfilledBy: data.fulfilledBy ?? null,
        fulfilledByName: data.fulfilledByName ?? null,
        fulfilledByPhone: data.fulfilledByPhone ?? null,
        note: data.note ?? null,
        bags: Number(data.bags) || 1,
        orgId: data.orgId ?? null,
        confirmedAccurate: data.confirmedAccurate === true,
        createdAtMs: timestampMs(data.createdAt),
        updatedAtMs: timestampMs(data.updatedAt),
        neededAtMs: timestampMs(data.neededAt),
        expiresAtMs: timestampMs(data.expiresAt),
        fulfilledAtMs: timestampMs(data.fulfilledAt),
      }
    })

    return NextResponse.json({
      requests,
      hasMore,
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
      district,
    })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to load requests' }, { status: 500 })
  }
}
