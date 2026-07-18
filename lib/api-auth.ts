import { NextRequest, NextResponse } from 'next/server'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export class ApiAuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message)
  }
}

export async function requireUser(req: NextRequest): Promise<DecodedIdToken> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) throw new ApiAuthError(401, 'Unauthorized')

  const token = header.slice(7).trim()
  if (!token) throw new ApiAuthError(401, 'Unauthorized')

  try {
    return await adminAuth().verifyIdToken(token)
  } catch {
    throw new ApiAuthError(401, 'Invalid or expired token')
  }
}

export async function requireRole(
  req: NextRequest,
  roles: Array<'admin' | 'superadmin'>
): Promise<DecodedIdToken> {
  const decoded = await requireUser(req)
  const snap = await adminDb().collection('users').doc(decoded.uid).get()
  const role = snap.data()?.role
  if (!roles.includes(role)) throw new ApiAuthError(403, 'Forbidden')
  return decoded
}

export async function requireOrgAdmin(req: NextRequest, orgId: string) {
  const decoded = await requireUser(req)
  const [userSnap, orgSnap] = await Promise.all([
    adminDb().collection('users').doc(decoded.uid).get(),
    adminDb().collection('organizations').doc(orgId).get(),
  ])
  const role = userSnap.data()?.role
  const isGlobalAdmin = role === 'admin' || role === 'superadmin'
  const isOrgAdmin = orgSnap.data()?.adminIds?.includes(decoded.uid)
  if (!isGlobalAdmin && !isOrgAdmin) throw new ApiAuthError(403, 'Forbidden')
  return decoded
}

export function authErrorResponse(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return null
}
