import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { belongsToDistrict, resolveDistrict } from '@/lib/location'

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
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    const [usersSnap, requestsSnap, monthDonations, totalDonations, recentSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('bloodRequests').get(),
      db.collection('donations').where('donatedAt', '>=', startOfMonth).count().get(),
      db.collection('donations').count().get(),
      db.collection('bloodRequests').where('status', '==', 'open').limit(50).get(),
    ])

    const districtUsers = usersSnap.docs.filter((doc) => belongsToDistrict(doc.data(), district))
    const districtRequests = requestsSnap.docs.filter((doc) => belongsToDistrict(doc.data(), district))

    const recent = recentSnap.docs
      .filter((doc) => belongsToDistrict(doc.data(), district))
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
        totalMembers: districtUsers.length,
        availableNow: districtUsers.filter((doc) => doc.data().isAvailable === true).length,
        pendingRequests: districtRequests.filter((doc) => doc.data().status === 'open').length,
        thisMonthDonations: monthDonations.data().count,
        totalDonations: totalDonations.data().count,
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
