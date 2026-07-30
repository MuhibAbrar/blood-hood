import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireUser } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const { campId } = await req.json()
    if (typeof campId !== 'string' || !campId.trim()) {
      return NextResponse.json({ error: 'campId required' }, { status: 400 })
    }

    const db = adminDb()
    const campRef = db.collection('camps').doc(campId)
    await db.runTransaction(async (tx) => {
      const campSnap = await tx.get(campRef)
      if (!campSnap.exists) throw new ApiAuthError(404, 'Camp not found')
      const camp = campSnap.data()!
      if (camp.status === 'completed') {
        throw new ApiAuthError(409, 'Completed camp registration is closed')
      }
      if (Array.isArray(camp.registeredDonors) && camp.registeredDonors.includes(actor.uid)) {
        return
      }

      tx.update(campRef, {
        registeredDonors: FieldValue.arrayUnion(actor.uid),
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to register for camp' }, { status: 500 })
  }
}
