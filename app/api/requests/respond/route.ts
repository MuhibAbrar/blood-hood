import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireUser } from '@/lib/api-auth'
import { canDonate } from '@/lib/bloodCompatibility'
import { resolveDistrict } from '@/lib/location'
import type { BloodGroup } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const { requestId } = await req.json()
    if (typeof requestId !== 'string' || !requestId) {
      return NextResponse.json({ error: 'requestId required' }, { status: 400 })
    }

    const db = adminDb()
    const requestRef = db.collection('bloodRequests').doc(requestId)
    const donorRef = db.collection('users').doc(actor.uid)

    await db.runTransaction(async (tx) => {
      const [requestSnap, donorSnap] = await Promise.all([tx.get(requestRef), tx.get(donorRef)])
      if (!requestSnap.exists) throw new ApiAuthError(404, 'Request not found')
      if (!donorSnap.exists) throw new ApiAuthError(403, 'Donor profile not found')

      const request = requestSnap.data()!
      const donor = donorSnap.data()!
      if (request.requestedBy === actor.uid) throw new ApiAuthError(400, 'You cannot respond to your own request')
      if (request.status !== 'open') throw new ApiAuthError(409, 'Request is no longer open')
      if (request.expiresAt?.toDate?.() < new Date()) throw new ApiAuthError(409, 'Request has expired')

      const requestDistrict = resolveDistrict(request)
      const donorDistrict = resolveDistrict(donor)
      if (!requestDistrict || donorDistrict !== requestDistrict) {
        throw new ApiAuthError(403, 'Only donors from the request district can respond')
      }
      if (!donor.isAvailable || !canDonate(donor.bloodGroup as BloodGroup, request.bloodGroup as BloodGroup)) {
        throw new ApiAuthError(403, 'Donor is not currently compatible and available')
      }
      if (Array.isArray(request.respondedBy) && request.respondedBy.includes(actor.uid)) return

      tx.update(requestRef, { respondedBy: FieldValue.arrayUnion(actor.uid) })
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    console.error('Respond to request failed:', error)
    return NextResponse.json({ error: 'Unable to respond to request' }, { status: 500 })
  }
}
