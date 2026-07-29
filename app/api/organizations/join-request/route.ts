import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireUser } from '@/lib/api-auth'
import { resolveOrganizationDistrict } from '@/lib/location'

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const { orgId } = await req.json()
    if (typeof orgId !== 'string' || !orgId.trim()) {
      return NextResponse.json({ error: 'Organization required' }, { status: 400 })
    }

    const db = adminDb()
    const userRef = db.collection('users').doc(actor.uid)
    const orgRef = db.collection('organizations').doc(orgId)

    const [existing, initialUserSnap, initialOrgSnap] = await Promise.all([
      db.collection('joinRequests')
        .where('orgId', '==', orgId)
        .where('userId', '==', actor.uid)
        .where('status', '==', 'pending')
        .limit(1)
        .get(),
      userRef.get(),
      orgRef.get(),
    ])
    if (!initialUserSnap.exists) throw new ApiAuthError(404, 'User not found')
    if (!initialOrgSnap.exists) throw new ApiAuthError(404, 'Organization not found')
    const initialUserDistrict = initialUserSnap.data()?.district?.trim?.() ?? ''
    const initialOrgDistrict = resolveOrganizationDistrict(initialOrgSnap.data()!)
    if (!initialUserDistrict) throw new ApiAuthError(400, 'district-required')
    if (!initialOrgDistrict) throw new ApiAuthError(409, 'organization-district-missing')
    if (initialUserDistrict !== initialOrgDistrict) throw new ApiAuthError(403, 'district-mismatch')
    if (!existing.empty) return NextResponse.json({ success: true, alreadyPending: true })

    const requestRef = db.collection('joinRequests').doc(`${orgId}_${actor.uid}`)
    await db.runTransaction(async tx => {
      const [userSnap, orgSnap] = await Promise.all([tx.get(userRef), tx.get(orgRef)])
      if (!userSnap.exists) throw new ApiAuthError(404, 'User not found')
      if (!orgSnap.exists) throw new ApiAuthError(404, 'Organization not found')

      const user = userSnap.data()!
      const org = orgSnap.data()!
      const userDistrict = typeof user.district === 'string' ? user.district.trim() : ''
      const orgDistrict = resolveOrganizationDistrict(org)
      if (!userDistrict) throw new ApiAuthError(400, 'district-required')
      if (!orgDistrict) throw new ApiAuthError(409, 'organization-district-missing')
      if (userDistrict !== orgDistrict) throw new ApiAuthError(403, 'district-mismatch')

      const organizationIds: string[] = Array.isArray(user.organizations) ? user.organizations : []
      const otherOrgIds = organizationIds.filter(id => typeof id === 'string' && id && id !== orgId)
      if (otherOrgIds.length > 0) {
        const otherOrgs = await Promise.all(
          otherOrgIds.map(id => tx.get(db.collection('organizations').doc(id)))
        )
        const activeElsewhere = otherOrgs.some(snap => {
          if (!snap.exists) return false
          const data = snap.data()
          return data?.memberIds?.includes(actor.uid) || data?.adminIds?.includes(actor.uid)
        })
        if (activeElsewhere) throw new ApiAuthError(409, 'already-in-org')
      }

      if (org.memberIds?.includes(actor.uid) || org.adminIds?.includes(actor.uid)) {
        throw new ApiAuthError(409, 'already-in-org')
      }

      tx.set(requestRef, {
        orgId,
        userId: actor.uid,
        userName: user.name ?? '',
        userPhone: user.phone ?? '',
        userBloodGroup: user.bloodGroup ?? '',
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    console.error('Organization join request failed:', error)
    return NextResponse.json({ error: 'Unable to request organization membership' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await requireUser(req)
    const { orgId } = await req.json()
    if (typeof orgId !== 'string' || !orgId.trim()) {
      return NextResponse.json({ error: 'Organization required' }, { status: 400 })
    }

    const db = adminDb()
    const pending = await db.collection('joinRequests')
      .where('orgId', '==', orgId)
      .where('userId', '==', actor.uid)
      .where('status', '==', 'pending')
      .get()

    if (!pending.empty) {
      await db.runTransaction(async transaction => {
        const latest = await Promise.all(pending.docs.map(document => transaction.get(document.ref)))
        latest.forEach(document => {
          const data = document.data()
          if (
            document.exists
            && data?.orgId === orgId
            && data?.userId === actor.uid
            && data?.status === 'pending'
          ) {
            transaction.delete(document.ref)
          }
        })
      })
    }

    return NextResponse.json({ success: true, cancelled: pending.size })
  } catch (error: unknown) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    console.error('Cancel organization join request failed:', error)
    return NextResponse.json({ error: 'Unable to cancel join request' }, { status: 500 })
  }
}
