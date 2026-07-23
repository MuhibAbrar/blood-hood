import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { resolveDistrict } from '@/lib/location'
import { Timestamp } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'
export const revalidate = 0
// Firebase Admin can take longer on a cold serverless start. Give the first
// request enough time to establish its secure connection instead of failing.
export const maxDuration = 30

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

async function isAuthenticated(req: NextRequest) {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return false
  try {
    await adminAuth().verifyIdToken(header.slice(7))
    return true
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = adminDb()
    const district = req.nextUrl.searchParams.get('district')?.trim() || null
    const authenticated = await isAuthenticated(req)
    const startOfMonth = Timestamp.fromDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const users = db.collection('users')
    const requests = db.collection('bloodRequests')
    const donations = db.collection('donations')

    // Aggregation queries are billed by index entries instead of downloading
    // every user/request document on every dashboard visit.
    const membersQuery = district ? users.where('district', '==', district) : users
    const availableQuery = district
      ? users.where('district', '==', district).where('isAvailable', '==', true)
      : users.where('isAvailable', '==', true)
    const pendingQuery = district
      ? requests.where('district', '==', district).where('status', '==', 'open')
      : requests.where('status', '==', 'open')
    const recentQuery = district
      ? requests.where('district', '==', district).where('status', '==', 'open').limit(10)
      : requests.where('status', '==', 'open').limit(10)

    const [
      membersResult,
      availableResult,
      pendingResult,
      monthDonationsResult,
      totalDonationsResult,
      recentResult,
    ] = await Promise.allSettled([
      membersQuery.count().get(),
      availableQuery.count().get(),
      pendingQuery.count().get(),
      donations.where('donatedAt', '>=', startOfMonth).count().get(),
      donations.count().get(),
      recentQuery.get(),
    ])

    const count = (result: typeof membersResult) =>
      result.status === 'fulfilled' ? result.value.data().count : 0
    const recentSnap = recentResult.status === 'fulfilled' ? recentResult.value : null
    if ([membersResult, availableResult, pendingResult, recentResult].every((result) => result.status === 'rejected')) {
      throw new Error('All dashboard Firestore queries failed')
    }

    const recent = (recentSnap?.docs ?? [])
      .sort((a, b) => (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0))
      .slice(0, 5)
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          patientName: data.patientName ?? '',
          bloodGroup: data.bloodGroup,
          hospital: data.hospital ?? '',
          district: resolveDistrict(data),
          area: data.area ?? '',
          contactPhone: authenticated ? (data.contactPhone ?? '') : '',
          requestedBy: authenticated ? (data.requestedBy ?? '') : '',
          urgency: data.urgency ?? 'normal',
          status: data.status ?? 'open',
          respondedBy: Array.isArray(data.respondedBy) ? data.respondedBy : [],
          note: data.note ?? null,
          bags: data.bags ?? 1,
          createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
          expiresAtMs: data.expiresAt?.toMillis?.() ?? null,
        }
      })

    return NextResponse.json({
      stats: {
        totalMembers: count(membersResult),
        availableNow: count(availableResult),
        pendingRequests: count(pendingResult),
        thisMonthDonations: count(monthDonationsResult),
        totalDonations: count(totalDonationsResult),
      },
      recentRequests: recent,
    }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Public dashboard API error:', error)
    const diagnostic = error && typeof error === 'object'
      ? {
          code: 'code' in error ? String(error.code) : 'unknown',
          message: 'message' in error ? String(error.message).slice(0, 180) : 'Unknown server error',
        }
      : { code: 'unknown', message: 'Unknown server error' }
    return NextResponse.json({
      error: 'Unable to load dashboard',
      ...(process.env.VERCEL_ENV === 'preview' ? { diagnostic } : {}),
    }, { status: 500, headers: NO_STORE_HEADERS })
  }
}
