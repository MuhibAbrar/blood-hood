import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

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

    const usersQuery = district
      ? db.collection('users').where('district', '==', district)
      : db.collection('users')
    const requestsQuery = district
      ? db.collection('bloodRequests').where('district', '==', district)
      : db.collection('bloodRequests')

    const [usersSnap, requestsSnap, monthDonations, totalDonations, recentSnap] = await Promise.all([
      usersQuery.get(),
      requestsQuery.get(),
      db.collection('donations').where('donatedAt', '>=', startOfMonth).count().get(),
      db.collection('donations').count().get(),
      db.collection('bloodRequests').where('status', '==', 'open').limit(50).get(),
    ])

    const recent = recentSnap.docs
      .filter((doc) => !district || doc.data().district === district)
      .sort((a, b) => (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0))
      .slice(0, 5)
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          patientName: data.patientName ?? '',
          bloodGroup: data.bloodGroup,
          hospital: data.hospital ?? '',
          district: data.district ?? '',
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
        totalMembers: usersSnap.size,
        availableNow: usersSnap.docs.filter((doc) => doc.data().isAvailable === true).length,
        pendingRequests: requestsSnap.docs.filter((doc) => doc.data().status === 'open').length,
        thisMonthDonations: monthDonations.data().count,
        totalDonations: totalDonations.data().count,
      },
      recentRequests: recent,
    })
  } catch (error) {
    console.error('Public dashboard API error:', error)
    return NextResponse.json({ error: 'Unable to load dashboard' }, { status: 500 })
  }
}
