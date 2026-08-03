import { NextRequest, NextResponse } from 'next/server'
import { FieldPath, Query } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, requireRole } from '@/lib/api-auth'
import { DISTRICTS } from '@/lib/constants'
import { normalizeSearchName } from '@/lib/search-normalization'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50
const LEGACY_DISTRICT = 'খুলনা'

const encodeCursor = (id: string) => Buffer.from(id).toString('base64url')
const decodeCursor = (value: string | null) => {
  if (!value) return ''
  try { return Buffer.from(value, 'base64url').toString('utf8') } catch { return '' }
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'superadmin'])
    const usersRef = adminDb().collection('users')
    const params = req.nextUrl.searchParams
    const district = params.get('district')?.trim() ?? ''
    const searchText = params.get('search')?.trim().slice(0, 60) ?? ''
    const cursorId = decodeCursor(params.get('cursor'))

    if (district && !DISTRICTS.includes(district)) {
      return NextResponse.json({ error: 'Invalid district' }, { status: 400 })
    }

    const [totalSnapshot, ...districtSnapshots] = await Promise.all([
      usersRef.count().get(),
      ...DISTRICTS.map((item) => usersRef.where('district', '==', item).count().get()),
    ])
    const total = totalSnapshot.data().count
    const districtCounts = Object.fromEntries(
      DISTRICTS.map((item, index) => [item, districtSnapshots[index].data().count])
    ) as Record<string, number>
    const knownTotal = Object.values(districtCounts).reduce((sum, count) => sum + count, 0)
    districtCounts[LEGACY_DISTRICT] = (districtCounts[LEGACY_DISTRICT] ?? 0)
      + Math.max(0, total - knownTotal)

    const normalizedSearch = normalizeSearchName(searchText)
    let query: Query = usersRef
    if (normalizedSearch) {
      const searchField = district ? 'districtSearchName' : 'searchName'
      const prefix = district ? `${district}|${normalizedSearch}` : normalizedSearch
      query = query
        .where(searchField, '>=', prefix)
        .where(searchField, '<=', `${prefix}\uf8ff`)
        .orderBy(searchField)
        .orderBy(FieldPath.documentId())
    } else {
      if (district) query = query.where('district', '==', district)
      query = query.orderBy(FieldPath.documentId())
    }

    if (cursorId) {
      const cursorSnapshot = await usersRef.doc(cursorId).get()
      if (cursorSnapshot.exists) query = query.startAfter(cursorSnapshot)
    }

    const snapshot = await query.limit(PAGE_SIZE + 1).get()
    const hasMore = snapshot.docs.length > PAGE_SIZE
    const documents = hasMore ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs
    const users = documents.map((document) => {
      const data = document.data()
      return {
        uid: document.id,
        name: data.name ?? '',
        phone: data.phone ?? '',
        bloodGroup: data.bloodGroup ?? '',
        division: data.division ?? '',
        district: data.district || LEGACY_DISTRICT,
        area: data.area ?? '',
        upazila: data.upazila ?? '',
        age: Number(data.age ?? 0),
        gender: data.gender ?? 'other',
        isAvailable: Boolean(data.isAvailable),
        totalDonations: Number(data.totalDonations ?? 0),
        organizations: Array.isArray(data.organizations) ? data.organizations : [],
        role: data.role ?? 'donor',
        isVerified: Boolean(data.isVerified),
        profilePhoto: data.profilePhoto ?? null,
        manuallyAdded: Boolean(data.manuallyAdded),
      }
    })

    return NextResponse.json({
      users,
      total,
      districtCounts,
      pageSize: PAGE_SIZE,
      hasMore,
      nextCursor: hasMore && documents.length
        ? encodeCursor(documents[documents.length - 1].id)
        : null,
    })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    console.error('Unable to load admin users', error)
    return NextResponse.json({ error: 'Unable to load users' }, { status: 500 })
  }
}
