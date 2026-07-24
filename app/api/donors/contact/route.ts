import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireUser } from '@/lib/api-auth'

const DAILY_CONTACT_LIMIT = 10

function dhakaDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const { donorId } = await req.json()
    if (typeof donorId !== 'string' || !donorId.trim()) {
      return NextResponse.json({ error: 'Donor is required' }, { status: 400 })
    }

    const db = adminDb()
    const seekerRef = db.collection('users').doc(actor.uid)
    const donorRef = db.collection('users').doc(donorId)
    const date = dhakaDateKey()
    const limitRef = db.collection('contactLimits').doc(`${actor.uid}_${date}`)
    const eventRef = db.collection('contactEvents').doc(`reveal_${actor.uid}_${donorId}`)

    const phone = await db.runTransaction(async (tx) => {
      const [seekerSnap, donorSnap, limitSnap] = await Promise.all([
        tx.get(seekerRef),
        tx.get(donorRef),
        tx.get(limitRef),
      ])

      if (!seekerSnap.exists) throw new ApiAuthError(403, 'Your profile was not found')
      if (!donorSnap.exists) throw new ApiAuthError(404, 'Donor was not found')

      const seeker = seekerSnap.data()!
      const donor = donorSnap.data()!
      const isOwnProfile = actor.uid === donorId
      const isSuperAdmin = seeker.role === 'superadmin'
      if (!isOwnProfile && !isSuperAdmin && donor.isAvailable !== true) {
        throw new ApiAuthError(409, 'Donor is not currently available')
      }
      if (typeof donor.phone !== 'string' || !donor.phone.trim()) {
        throw new ApiAuthError(404, 'Donor phone number was not found')
      }

      if (!isOwnProfile && !isSuperAdmin) {
        const limit = limitSnap.data()
        const donorIds = Array.isArray(limit?.donorIds) ? limit.donorIds : []
        const alreadyRevealedToday = donorIds.includes(donorId)
        const count = Number(limit?.count ?? 0)

        if (!alreadyRevealedToday && count >= DAILY_CONTACT_LIMIT) {
          throw new ApiAuthError(429, 'Daily contact limit reached')
        }

        tx.set(limitRef, {
          seekerId: actor.uid,
          date,
          count: alreadyRevealedToday ? count : count + 1,
          donorIds: FieldValue.arrayUnion(donorId),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })

        tx.set(eventRef, {
          seekerId: actor.uid,
          donorId,
          donorName: donor.name ?? '',
          donorBloodGroup: donor.bloodGroup ?? '',
          donorArea: donor.area ?? '',
          contactedAt: FieldValue.serverTimestamp(),
          status: 'contacted',
        }, { merge: true })
      }

      return donor.phone.trim()
    })

    return NextResponse.json(
      { phone },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: unknown) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    console.error('Reveal donor contact failed:', error)
    return NextResponse.json({ error: 'Unable to show donor phone number' }, { status: 500 })
  }
}
