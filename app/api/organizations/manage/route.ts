import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireOrgAdmin, requireRole } from '@/lib/api-auth'
import { DISTRICTS_DATA, getDivisionForDistrict } from '@/lib/constants'
import { CURRENT_SCHEMA_VERSION } from '@/lib/schema-version'
import type { OrgType } from '@/types'

const ORG_TYPES: OrgType[] = ['college', 'university', 'ngo', 'hospital', 'community']

const cleanOrganizationInput = (value: Record<string, unknown>) => {
  const name = typeof value.name === 'string' ? value.name.trim().slice(0, 100) : ''
  const type = ORG_TYPES.includes(value.type as OrgType) ? value.type as OrgType : null
  const district = typeof value.district === 'string' ? value.district.trim() : ''
  const division = getDivisionForDistrict(district)
  const area = typeof value.area === 'string' ? value.area.trim() : ''
  if (!name || !type || !division || !DISTRICTS_DATA[district]?.includes(area)) {
    throw new ApiAuthError(400, 'Invalid organization details')
  }
  return { name, type, division, district, area }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action
    const db = adminDb()

    if (action === 'create') {
      const actor = await requireRole(req, ['superadmin'])
      const input = cleanOrganizationInput(body.data ?? {})
      const orgRef = db.collection('organizations').doc()
      const adminIds = [actor.uid]
      await db.runTransaction(async (tx) => {
        const actorRef = db.collection('users').doc(actor.uid)
        const actorSnap = await tx.get(actorRef)
        if (!actorSnap.exists) throw new ApiAuthError(404, 'Admin user not found')
        tx.create(orgRef, {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          ...input,
          adminIds,
          memberIds: [],
          totalDonations: 0,
          isVerified: Boolean(body.data?.isVerified),
          logo: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        tx.update(actorRef, {
          organizations: FieldValue.arrayUnion(orgRef.id),
          updatedAt: FieldValue.serverTimestamp(),
        })
      })
      return NextResponse.json({ success: true, id: orgRef.id })
    }

    if (action === 'update') {
      const orgId = typeof body.orgId === 'string' ? body.orgId : ''
      if (!orgId) throw new ApiAuthError(400, 'orgId required')
      await requireOrgAdmin(req, orgId)
      const requested = body.data && typeof body.data === 'object' ? body.data as Record<string, unknown> : {}
      const sensitive = ['adminIds', 'isVerified', 'division', 'district', 'area', 'type']
        .some((field) => field in requested)
      if (sensitive) await requireRole(req, ['superadmin'])

      const orgRef = db.collection('organizations').doc(orgId)
      await db.runTransaction(async (tx) => {
        const orgSnap = await tx.get(orgRef)
        if (!orgSnap.exists) throw new ApiAuthError(404, 'Organization not found')
        const current = orgSnap.data()!
        const patch: Record<string, unknown> = {
          updatedAt: FieldValue.serverTimestamp(),
        }

        if ('phone' in requested) {
          patch.phone = typeof requested.phone === 'string'
            ? requested.phone.replace(/[^0-9+]/g, '').slice(0, 16)
            : ''
        }
        if ('name' in requested || 'type' in requested || 'district' in requested || 'area' in requested) {
          Object.assign(patch, cleanOrganizationInput({ ...current, ...requested }))
        }
        if ('isVerified' in requested) patch.isVerified = Boolean(requested.isVerified)

        if ('adminIds' in requested) {
          const nextAdminIds = Array.isArray(requested.adminIds)
            ? Array.from(new Set(requested.adminIds.filter(
                (uid): uid is string => typeof uid === 'string' && uid.trim().length > 0
              )))
            : []
          if (nextAdminIds.length === 0) throw new ApiAuthError(400, 'At least one admin is required')
          const currentAdminIds: string[] = Array.isArray(current.adminIds) ? current.adminIds : []
          const affectedIds = Array.from(new Set([...currentAdminIds, ...nextAdminIds]))
          const userRefs = affectedIds.map((uid) => db.collection('users').doc(uid))
          const userSnaps = await Promise.all(userRefs.map((ref) => tx.get(ref)))
          if (userSnaps.some((snap) => !snap.exists)) throw new ApiAuthError(400, 'Admin user not found')

          patch.adminIds = nextAdminIds
          for (let index = 0; index < affectedIds.length; index += 1) {
            const uid = affectedIds[index]
            tx.update(userRefs[index], {
              organizations: nextAdminIds.includes(uid)
                ? FieldValue.arrayUnion(orgId)
                : FieldValue.arrayRemove(orgId),
              updatedAt: FieldValue.serverTimestamp(),
            })
          }
        }
        tx.update(orgRef, patch)
      })
      return NextResponse.json({ success: true })
    }

    throw new ApiAuthError(400, 'Unsupported action')
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Unable to manage organization' }, { status: 500 })
  }
}
