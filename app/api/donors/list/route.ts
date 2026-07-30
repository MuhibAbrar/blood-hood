import { NextRequest, NextResponse } from 'next/server'
import { FieldPath, Query } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireUser } from '@/lib/api-auth'
import { DISTRICTS_DATA } from '@/lib/constants'
import type { BloodGroup } from '@/types'

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const timestampMs = (value: unknown) =>
  value && typeof (value as { toMillis?: unknown }).toMillis === 'function'
    ? (value as { toMillis: () => number }).toMillis()
    : null

export async function GET(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const db = adminDb()
    const actorSnap = await db.collection('users').doc(actor.uid).get()
    if (!actorSnap.exists) throw new ApiAuthError(404, 'User not found')
    const district = actorSnap.data()?.district?.trim?.() ?? ''
    if (!district || !DISTRICTS_DATA[district]) {
      throw new ApiAuthError(400, 'district-required')
    }

    const params = req.nextUrl.searchParams
    const requestedLimit = Number(params.get('limit') ?? 30)
    const pageSize = Number.isFinite(requestedLimit)
      ? Math.min(50, Math.max(1, Math.floor(requestedLimit)))
      : 30
    const upazila = params.get('upazila')?.trim() ?? ''
    if (upazila && !DISTRICTS_DATA[district].includes(upazila)) {
      throw new ApiAuthError(400, 'invalid-upazila')
    }
    const available = params.get('available')
    const requestedBloodGroups = (params.get('bloodGroups') ?? '')
      .split(',')
      .filter((group): group is BloodGroup => BLOOD_GROUPS.includes(group as BloodGroup))
    const bloodGroups = Array.from(new Set(requestedBloodGroups))

    let query: Query = db.collection('users')
      .where('role', 'in', ['donor', 'admin', 'superadmin'])
      .where('district', '==', district)
    if (bloodGroups.length === 1) query = query.where('bloodGroup', '==', bloodGroups[0])
    if (bloodGroups.length > 1) query = query.where('bloodGroup', 'in', bloodGroups)
    if (upazila) query = query.where('upazila', '==', upazila)
    if (available === 'true') query = query.where('isAvailable', '==', true)
    if (available === 'false') query = query.where('isAvailable', '==', false)
    query = query.orderBy(FieldPath.documentId())

    const cursor = params.get('cursor')
    if (cursor) {
      const cursorSnap = await db.collection('users').doc(cursor).get()
      if (cursorSnap.exists) query = query.startAfter(cursorSnap)
    }

    const snapshot = await query.limit(pageSize + 1).get()
    const hasMore = snapshot.docs.length > pageSize
    const page = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs
    const donors = page.map((document) => {
      const data = document.data()
      return {
        uid: document.id,
        name: data.name ?? '',
        bloodGroup: data.bloodGroup ?? '',
        division: data.division ?? '',
        district: data.district ?? '',
        area: data.area ?? '',
        upazila: data.upazila ?? '',
        age: Number(data.age ?? 0),
        gender: data.gender ?? 'other',
        isAvailable: Boolean(data.isAvailable),
        lastDonatedAtMs: timestampMs(data.lastDonatedAt),
        nextAvailableAtMs: timestampMs(data.nextAvailableAt),
        totalDonations: Number(data.totalDonations ?? 0),
        organizations: Array.isArray(data.organizations) ? data.organizations : [],
        role: data.role ?? 'donor',
        isVerified: Boolean(data.isVerified),
        manuallyAdded: Boolean(data.manuallyAdded),
        createdAtMs: timestampMs(data.createdAt),
        updatedAtMs: timestampMs(data.updatedAt),
      }
    })

    return NextResponse.json({
      donors,
      hasMore,
      nextCursor: page.at(-1)?.id ?? null,
      district,
    })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to load donors' }, { status: 500 })
  }
}
