import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { FieldPath, Query } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireUser } from '@/lib/api-auth'
import { DISTRICTS_DATA } from '@/lib/constants'
import type { BloodGroup } from '@/types'
import { normalizeSearchName } from '@/lib/search-normalization'

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const timestampMs = (value: unknown) =>
  value && typeof (value as { toMillis?: unknown }).toMillis === 'function'
    ? (value as { toMillis: () => number }).toMillis()
    : null

type CursorState = {
  last: string
  seed: string
  wrapped: boolean
  mode: 'browse' | 'search'
}

const encodeCursor = (state: CursorState) =>
  Buffer.from(JSON.stringify(state)).toString('base64url')

const decodeCursor = (value: string | null): CursorState | null => {
  if (!value) return null
  try {
    const state = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as CursorState
    if (
      typeof state.last !== 'string'
      || typeof state.seed !== 'string'
      || typeof state.wrapped !== 'boolean'
      || !['browse', 'search'].includes(state.mode)
    ) return null
    return state
  } catch {
    return null
  }
}

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
    const search = normalizeSearchName(params.get('search')).slice(0, 60)
    const requestedBloodGroups = (params.get('bloodGroups') ?? '')
      .split(',')
      .filter((group): group is BloodGroup => BLOOD_GROUPS.includes(group as BloodGroup))
    const bloodGroups = Array.from(new Set(requestedBloodGroups))

    const cursorState = decodeCursor(params.get('cursor'))
    const cursorSnap = cursorState?.last
      ? await db.collection('users').doc(cursorState.last).get()
      : null
    let page = []
    let hasMore = false
    let nextCursorDocumentId: string | null = null
    let nextWrapped = cursorState?.wrapped ?? false
    const seed = cursorState?.seed ?? randomBytes(18).toString('base64url')
    const mode: CursorState['mode'] = search ? 'search' : 'browse'

    if (search) {
      const prefix = `${district}|${search}`
      let query: Query = db.collection('users')
        .where('districtSearchName', '>=', prefix)
        .where('districtSearchName', '<=', `${prefix}\uf8ff`)
        .orderBy('districtSearchName')
        .orderBy(FieldPath.documentId())
      if (cursorState?.mode === 'search' && cursorSnap?.exists) query = query.startAfter(cursorSnap)
      const scanLimit = Math.min(100, pageSize * 2)
      const snapshot = await query.limit(scanLimit + 1).get()
      const scanHasMore = snapshot.docs.length > scanLimit
      const scanned = scanHasMore ? snapshot.docs.slice(0, scanLimit) : snapshot.docs
      const matching = scanned.filter((document) => {
        const data = document.data()
        if (!['donor', 'admin', 'superadmin'].includes(data.role)) return false
        if (bloodGroups.length && !bloodGroups.includes(data.bloodGroup)) return false
        if (upazila && data.upazila !== upazila) return false
        if (available === 'true' && data.isAvailable !== true) return false
        if (available === 'false' && data.isAvailable !== false) return false
        return true
      })
      page = matching.slice(0, pageSize)
      hasMore = matching.length > pageSize || scanHasMore
      // If a full page matched, resume after its last donor so no matching
      // documents later in this scan window are accidentally skipped.
      nextCursorDocumentId = (
        matching.length >= pageSize ? page.at(-1) : scanned.at(-1)
      )?.id ?? null
    } else {
      let base: Query = db.collection('users')
        .where('role', 'in', ['donor', 'admin', 'superadmin'])
        .where('district', '==', district)
      if (bloodGroups.length === 1) base = base.where('bloodGroup', '==', bloodGroups[0])
      if (bloodGroups.length > 1) base = base.where('bloodGroup', 'in', bloodGroups)
      if (upazila) base = base.where('upazila', '==', upazila)
      if (available === 'true') base = base.where('isAvailable', '==', true)
      if (available === 'false') base = base.where('isAvailable', '==', false)
      base = base.orderBy(FieldPath.documentId())

      let query = nextWrapped ? base.endBefore(seed) : base
      if (cursorState?.mode === 'browse' && cursorSnap?.exists) {
        query = query.startAfter(cursorSnap)
      } else if (!nextWrapped) {
        query = query.startAt(seed)
      }
      let documents = (await query.limit(pageSize + 1).get()).docs
      if (documents.length <= pageSize && !nextWrapped) {
        const wrappedDocs = (await base.endBefore(seed).limit(pageSize + 1 - documents.length).get()).docs
        documents = [...documents, ...wrappedDocs]
        nextWrapped = true
      }
      hasMore = documents.length > pageSize
      page = hasMore ? documents.slice(0, pageSize) : documents
      nextCursorDocumentId = page.at(-1)?.id ?? null
    }

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
      nextCursor: hasMore && nextCursorDocumentId
        ? encodeCursor({ last: nextCursorDocumentId, seed, wrapped: nextWrapped, mode })
        : null,
      district,
    })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to load donors' }, { status: 500 })
  }
}
