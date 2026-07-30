import type { Firestore } from 'firebase-admin/firestore'

type UserOrganizationData = {
  organizations?: unknown
}

const organizationIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : []

const includesUser = (value: unknown, uid: string) =>
  Array.isArray(value) && value.includes(uid)

/**
 * Resolve the single organization a user currently belongs to.
 *
 * New records keep the link on both sides. Legacy organization admins or
 * members can have a missing users.organizations[] link, so the reverse
 * adminIds/memberIds lookup is retained as a safe fallback.
 */
export async function resolveUserOrganizationId(
  db: Firestore,
  uid: string,
  userData?: UserOrganizationData | null
): Promise<string | null> {
  let data = userData
  if (!data) {
    const userSnap = await db.collection('users').doc(uid).get()
    if (!userSnap.exists) return null
    data = userSnap.data() as UserOrganizationData
  }

  for (const orgId of organizationIds(data.organizations)) {
    const orgSnap = await db.collection('organizations').doc(orgId).get()
    if (!orgSnap.exists) continue
    const org = orgSnap.data()
    if (includesUser(org?.adminIds, uid) || includesUser(org?.memberIds, uid)) {
      return orgSnap.id
    }
  }

  const [adminOrgSnap, memberOrgSnap] = await Promise.all([
    db.collection('organizations').where('adminIds', 'array-contains', uid).limit(1).get(),
    db.collection('organizations').where('memberIds', 'array-contains', uid).limit(1).get(),
  ])

  return adminOrgSnap.docs[0]?.id ?? memberOrgSnap.docs[0]?.id ?? null
}
