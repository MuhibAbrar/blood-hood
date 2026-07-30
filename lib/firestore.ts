import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot,
  getCountFromServer,
} from 'firebase/firestore'
import { db } from './firebase'
import { authenticatedFetch } from './api-client'
import type { User, BloodRequest, Donation, Organization, Camp, BloodGroup, Announcement, Notification, JoinRequest, ContactEvent, ResponseType } from '@/types'
import { belongsToDistrict } from './location'

const readCache = new Map<string, { expiresAt: number; value: unknown }>()
const pendingReads = new Map<string, Promise<unknown>>()

const cachedRead = async <T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> => {
  const cached = readCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value as T
  const pending = pendingReads.get(key)
  if (pending) return pending as Promise<T>
  const request = loader()
    .then((value) => {
      readCache.set(key, { expiresAt: Date.now() + ttlMs, value })
      return value
    })
    .finally(() => pendingReads.delete(key))
  pendingReads.set(key, request)
  return request
}

const clearCachedReads = (...prefixes: string[]) => {
  for (const key of Array.from(readCache.keys())) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) readCache.delete(key)
  }
}

// --- Users ---

export const getUser = async (uid: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as User) : null
}

export const getUserFromServer = async (uid: string): Promise<User | null> => {
  const snap = await getDocFromServer(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as User) : null
}

export const updateUser = async (uid: string, data: Partial<User>) => {
  void uid // The authenticated server route always updates the caller's own document.
  const response = await authenticatedFetch('/api/profile/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to update profile')
}

export const getDonors = async (filters?: {
  bloodGroup?: BloodGroup
  bloodGroups?: BloodGroup[]
  area?: string
  search?: string
  isAvailable?: boolean
  pageSize?: number
  lastDoc?: string | null
}): Promise<{ donors: User[]; lastDoc: string | null; hasMore: boolean }> => {
  const params = new URLSearchParams()
  params.set('limit', String(Math.min(50, Math.max(1, filters?.pageSize ?? 30))))
  const bloodGroups = filters?.bloodGroups?.length
    ? filters.bloodGroups
    : filters?.bloodGroup
      ? [filters.bloodGroup]
      : []
  if (bloodGroups.length) params.set('bloodGroups', bloodGroups.join(','))
  if (filters?.area) params.set('upazila', filters.area)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.isAvailable !== undefined) params.set('available', String(filters.isAvailable))
  if (filters?.lastDoc) params.set('cursor', filters.lastDoc)
  const response = await authenticatedFetch(`/api/donors/list?${params.toString()}`, {
    cache: 'no-store',
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to load donors')
  const donors = (result.donors as Array<Record<string, unknown>>).map((donor) => ({
    ...donor,
    phone: '',
    fcmToken: null,
    profilePhoto: null,
    lastDonatedAt: typeof donor.lastDonatedAtMs === 'number'
      ? Timestamp.fromMillis(donor.lastDonatedAtMs)
      : null,
    nextAvailableAt: typeof donor.nextAvailableAtMs === 'number'
      ? Timestamp.fromMillis(donor.nextAvailableAtMs)
      : null,
    createdAt: typeof donor.createdAtMs === 'number'
      ? Timestamp.fromMillis(donor.createdAtMs)
      : Timestamp.fromMillis(0),
    updatedAt: typeof donor.updatedAtMs === 'number'
      ? Timestamp.fromMillis(donor.updatedAtMs)
      : Timestamp.fromMillis(0),
  })) as User[]
  return {
    donors,
    lastDoc: result.nextCursor ?? null,
    hasMore: Boolean(result.hasMore),
  }
}

export const subscribeToUser = (uid: string, cb: (user: User | null) => void) => {
  return onSnapshot(doc(db, 'users', uid), (snap: DocumentSnapshot) => {
    cb(snap.exists() ? (snap.data() as User) : null)
  })
}

// --- Blood Requests ---

export const createBloodRequest = async (data: Omit<BloodRequest, 'id' | 'createdAt' | 'fulfilledAt' | 'respondedBy' | 'responseTypes' | 'fulfilledBy' | 'fulfilledByName' | 'fulfilledByPhone' | 'status'>): Promise<string> => {
  const response = await authenticatedFetch('/api/requests/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      neededAtMs: data.neededAt?.toMillis?.() ?? null,
    }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to create request')
  clearCachedReads('bloodRequests:')

  // Notify compatible donors (fire-and-forget)
  authenticatedFetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'blood_request',
      data: {
        requestId: result.id,
        bloodGroup: data.bloodGroup,
        hospital: data.hospital,
        area: data.area,
        patientName: data.patientName,
        urgency: data.urgency,
      },
    }),
  }).catch(() => {}) // silently ignore if notification fails

  return result.id
}

export const getBloodRequests = async (status?: BloodRequest['status'], district?: string): Promise<BloodRequest[]> => {
  const cacheKey = `bloodRequests:${status ?? 'all'}:${district ?? 'all'}`
  return cachedRead(cacheKey, 60_000, async () => {
    const ref = collection(db, 'bloodRequests')
    // Fetch before filtering so legacy records without a district remain visible.
    const q = query(ref, orderBy('createdAt', 'desc'), limit(100))
    const snap = await getDocs(q)
    const all = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as BloodRequest))
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
    const inDistrict = all.filter((request) => belongsToDistrict(request, district))
    return status ? inDistrict.filter(r => r.status === status) : inDistrict
  })
}

export const getBloodRequestsPage = async (filters?: {
  status?: BloodRequest['status']
  bloodGroup?: BloodGroup
  pageSize?: number
  cursor?: string | null
}): Promise<{ requests: BloodRequest[]; cursor: string | null; hasMore: boolean }> => {
  const params = new URLSearchParams()
  params.set('limit', String(Math.min(30, Math.max(1, filters?.pageSize ?? 30))))
  if (filters?.status) params.set('status', filters.status)
  if (filters?.bloodGroup) params.set('bloodGroup', filters.bloodGroup)
  if (filters?.cursor) params.set('cursor', filters.cursor)
  const response = await authenticatedFetch(`/api/requests/list?${params.toString()}`, { cache: 'no-store' })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to load requests')
  const requests = (result.requests as Array<Record<string, unknown>>).map((request) => ({
    ...request,
    createdAt: Timestamp.fromMillis(Number(request.createdAtMs) || 0),
    updatedAt: request.updatedAtMs ? Timestamp.fromMillis(Number(request.updatedAtMs)) : undefined,
    neededAt: request.neededAtMs ? Timestamp.fromMillis(Number(request.neededAtMs)) : null,
    expiresAt: request.expiresAtMs ? Timestamp.fromMillis(Number(request.expiresAtMs)) : null,
    fulfilledAt: request.fulfilledAtMs ? Timestamp.fromMillis(Number(request.fulfilledAtMs)) : null,
  })) as BloodRequest[]
  return {
    requests,
    cursor: result.nextCursor ?? null,
    hasMore: Boolean(result.hasMore),
  }
}

export const getBloodRequestsByOrg = async (orgId: string): Promise<BloodRequest[]> => {
  const q = query(
    collection(db, 'bloodRequests'),
    where('orgId', '==', orgId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest))
}

export const getBloodRequest = async (id: string): Promise<BloodRequest | null> => {
  const snap = await getDoc(doc(db, 'bloodRequests', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as BloodRequest) : null
}

export const respondToRequest = async (requestId: string, donorUid: string, responseType: ResponseType) => {
  const response = await authenticatedFetch('/api/requests/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, responseType }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Unable to respond to request')
  }

  // Notify the requester that someone responded (fire-and-forget)
  try {
    const [requestSnap, donorSnap] = await Promise.all([
      getDoc(doc(db, 'bloodRequests', requestId)),
      getDoc(doc(db, 'users', donorUid)),
    ])
    const requestData = requestSnap.exists() ? requestSnap.data() : null
    const donorName = donorSnap.exists() ? donorSnap.data().name : 'কেউ'
    if (requestData?.requestedBy && requestData.requestedBy !== donorUid) {
      authenticatedFetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'request_responded',
          data: {
            requesterId: requestData.requestedBy,
            requestId,
            donorName,
            bloodGroup: requestData.bloodGroup,
            responseType,
          },
        }),
      }).catch(() => {})
    }
  } catch { /* silently ignore */ }
}

export const fulfillRequest = async (
  requestId: string,
  donorUid: string | null,
  requestData?: { bloodGroup: BloodGroup; hospital: string },
  externalDonor?: { name: string; phone: string },
  externalOrgId?: string
) => {
  const response = await authenticatedFetch('/api/requests/fulfill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, donorUid, externalDonor, externalOrgId }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to fulfill request')
  clearCachedReads('bloodRequests:', 'organizations:')
}

export const getDonationsByOrg = async (orgId: string): Promise<Donation[]> => {
  const snap = await getDocs(query(
    collection(db, 'donations'),
    where('orgId', '==', orgId)
  ))
  const donations = snap.docs.map(d => ({ id: d.id, ...d.data() } as Donation))
  return donations.sort((a, b) => b.donatedAt.toMillis() - a.donatedAt.toMillis())
}

export const getOrganizationsLeaderboard = async (): Promise<Organization[]> => {
  const snap = await getDocs(collection(db, 'organizations'))
  const orgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Organization))
  return orgs.sort((a, b) => b.totalDonations - a.totalDonations)
}

export const getUsersByUids = async (uids: string[]): Promise<User[]> => {
  if (!uids.length) return []
  const results: User[] = []
  for (let i = 0; i < uids.length; i += 10) {
    const batch = uids.slice(i, i + 10)
    const snap = await getDocs(query(collection(db, 'users'), where('uid', 'in', batch)))
    snap.docs.forEach(d => results.push(d.data() as User))
  }
  return results
}

export const getUserByPhone = async (phone: string): Promise<User | null> => {
  const snap = await getDocs(query(collection(db, 'users'), where('phone', '==', phone)))
  if (snap.empty) return null
  return snap.docs[0].data() as User
}

export const cancelRequest = async (requestId: string) => {
  const response = await authenticatedFetch('/api/requests/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to cancel request')
  clearCachedReads('bloodRequests:')
}

export const subscribeToRequests = (cb: (requests: BloodRequest[]) => void) => {
  const q = query(collection(db, 'bloodRequests'), orderBy('createdAt', 'desc'), limit(50))
  return onSnapshot(q, (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest)))
  })
}

// --- Donations ---

export const recordSelfDonation = async (
  donorId: string,
  donorName: string,
  bloodGroup: BloodGroup,
  donatedAt: Timestamp
) => {
  const response = await authenticatedFetch('/api/donations/self-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ donatedAt: donatedAt.toDate().toISOString() }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to record donation')
}

export const getDonationsByUser = async (uid: string): Promise<Donation[]> => {
  const q = query(collection(db, 'donations'), where('donorId', '==', uid), orderBy('donatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation))
}

// --- Organizations ---

export const getOrganizations = async (): Promise<Organization[]> => {
  return cachedRead('organizations:all', 5 * 60_000, async () => {
    const snap = await getDocs(query(collection(db, 'organizations'), orderBy('createdAt', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organization))
  })
}

export const getOrganization = async (id: string): Promise<Organization | null> => {
  const snap = await getDoc(doc(db, 'organizations', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Organization) : null
}

export const getOrganizationsForUser = async (uid: string, organizationIds: string[] = []): Promise<Organization[]> => {
  const organizationsRef = collection(db, 'organizations')
  const [memberDocs, adminDocs, linkedOrganizations] = await Promise.all([
    getDocs(query(organizationsRef, where('memberIds', 'array-contains', uid)))
      .then(snapshot => snapshot.docs)
      .catch(() => []),
    getDocs(query(organizationsRef, where('adminIds', 'array-contains', uid)))
      .then(snapshot => snapshot.docs)
      .catch(() => []),
    Promise.all((organizationIds ?? []).map((organizationId) => getOrganization(organizationId))),
  ])

  const organizations = new Map<string, Organization>()
  for (const organization of linkedOrganizations) {
    if (organization) organizations.set(organization.id, organization)
  }
  for (const organizationDoc of [...memberDocs, ...adminDocs]) {
    organizations.set(
      organizationDoc.id,
      { id: organizationDoc.id, ...organizationDoc.data() } as Organization
    )
  }

  return Array.from(organizations.values())
}

// --- Camps ---

export const getCamps = async (): Promise<Camp[]> => {
  return cachedRead('camps:all', 5 * 60_000, async () => {
    const snap = await getDocs(query(collection(db, 'camps'), orderBy('date', 'asc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Camp))
  })
}

export const getCamp = async (id: string): Promise<Camp | null> => {
  const snap = await getDoc(doc(db, 'camps', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Camp) : null
}

export const registerForCamp = async (campId: string) => {
  const response = await authenticatedFetch('/api/camps/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campId }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to register for camp')
}

// --- Admin: Users ---

export const getAllUsers = async (): Promise<User[]> => {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => d.data() as User)
}

// --- Admin: Camps ---

export const createCamp = async (data: Omit<Camp, 'id' | 'createdAt' | 'registeredDonors' | 'totalCollected'>): Promise<string> => {
  const response = await authenticatedFetch('/api/camps/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      data: { ...data, date: data.date.toDate().toISOString() },
    }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to create camp')
  clearCachedReads('camps:')
  return result.id
}

export const updateCamp = async (id: string, data: Partial<Camp>) => {
  const response = await authenticatedFetch('/api/camps/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update',
      campId: id,
      data: { ...data, ...(data.date ? { date: data.date.toDate().toISOString() } : {}) },
    }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to update camp')
  clearCachedReads('camps:')
}

export const deleteCamp = async (id: string) => {
  const response = await authenticatedFetch('/api/camps/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', campId: id }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to delete camp')
  clearCachedReads('camps:')
}

// --- Admin: Organizations ---

export const createOrganization = async (data: Omit<Organization, 'id' | 'createdAt' | 'memberIds' | 'totalDonations'>): Promise<string> => {
  const response = await authenticatedFetch('/api/organizations/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', data }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to create organization')
  clearCachedReads('organizations:')
  return result.id
}

export const updateOrganization = async (id: string, data: Partial<Organization>) => {
  const response = await authenticatedFetch('/api/organizations/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', orgId: id, data }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to update organization')
  clearCachedReads('organizations:')
}

// --- Org Admin ---

export const getOrgByAdmin = async (uid: string): Promise<Organization | null> => {
  const q = query(collection(db, 'organizations'), where('adminIds', 'array-contains', uid))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Organization
}

export const getOrgsByAdmin = async (uid: string): Promise<Organization[]> => {
  const q = query(collection(db, 'organizations'), where('adminIds', 'array-contains', uid))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Organization))
}

export const getOrgMembers = async (memberIds: string[]): Promise<User[]> => {
  if (!memberIds.length) return []
  const results: User[] = []
  for (let i = 0; i < memberIds.length; i += 10) {
    const batch = memberIds.slice(i, i + 10)
    const snap = await getDocs(query(collection(db, 'users'), where('uid', 'in', batch)))
    snap.docs.forEach(d => results.push(d.data() as User))
  }
  return results
}

export const removeMember = async (orgId: string, uid: string) => {
  const response = await authenticatedFetch('/api/organizations/membership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', orgId, uid }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to remove member')
}

export const getCampsByOrg = async (orgId: string): Promise<Camp[]> => {
  const snap = await getDocs(query(collection(db, 'camps'), where('organizationId', '==', orgId)))
  const camps = snap.docs.map(d => ({ id: d.id, ...d.data() } as Camp))
  return camps.sort((a, b) => b.date.toMillis() - a.date.toMillis())
}

export const getAnnouncements = async (orgId: string): Promise<Announcement[]> => {
  const snap = await getDocs(query(collection(db, 'announcements'), where('orgId', '==', orgId)))
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement))
  return list.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
}

export const recordCampDonation = async (campId: string, donorId: string, orgId: string) => {
  const response = await authenticatedFetch('/api/camps/donation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campId, donorId, orgId }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to record camp donation')
}

// --- Join Requests ---

export const requestJoinOrg = async (orgId: string): Promise<void> => {
  const response = await authenticatedFetch('/api/organizations/join-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to request organization membership')
}

export const cancelJoinOrgRequest = async (orgId: string): Promise<void> => {
  const response = await authenticatedFetch('/api/organizations/join-request', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to cancel join request')
}

export const getJoinRequests = async (orgId: string): Promise<JoinRequest[]> => {
  const q = query(
    collection(db, 'joinRequests'),
    where('orgId', '==', orgId),
    where('status', '==', 'pending')
  )
  const snap = await getDocs(q)
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest))
  return list.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
}

export const acceptJoinRequest = async (request: JoinRequest): Promise<void> => {
  const response = await authenticatedFetch('/api/organizations/membership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', orgId: request.orgId, uid: request.userId, requestId: request.id }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to accept member')
}

export const rejectJoinRequest = async (requestId: string, orgId?: string): Promise<void> => {
  if (!orgId) throw new Error('Organization required')
  const response = await authenticatedFetch('/api/organizations/membership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', orgId, requestId }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to reject member')
}

export const getUserJoinRequest = async (orgId: string, userId: string): Promise<JoinRequest | null> => {
  const q = query(
    collection(db, 'joinRequests'),
    where('orgId', '==', orgId),
    where('userId', '==', userId),
    where('status', '==', 'pending')
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as JoinRequest
}

// --- Notifications ---

export const getNotifications = async (uid: string): Promise<Notification[]> => {
  // NOTE: Requires Firestore composite index: userId (ASC) + createdAt (DESC)
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)

  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification))
}

export const markNotificationRead = async (id: string) => {
  const response = await authenticatedFetch('/api/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to update notification')
}

export const markAllNotificationsRead = async (uid: string) => {
  void uid // The server derives the notification owner from the verified token.
  const response = await authenticatedFetch('/api/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to update notifications')
}

// --- Stats ---

export const getPlatformStats = async (district?: string) => {
  const startOfMonth = Timestamp.fromDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const users = collection(db, 'users')
  const requests = collection(db, 'bloodRequests')
  const donations = collection(db, 'donations')

  const membersQ = district ? query(users, where('district', '==', district)) : users
  const availableQ = district
    ? query(users, where('district', '==', district), where('isAvailable', '==', true))
    : query(users, where('isAvailable', '==', true))
  const pendingQ = district
    ? query(requests, where('status', '==', 'open'), where('district', '==', district))
    : query(requests, where('status', '==', 'open'))

  const results = await Promise.allSettled([
    getCountFromServer(membersQ),
    getCountFromServer(availableQ),
    getCountFromServer(pendingQ),
    getCountFromServer(query(donations, where('donatedAt', '>=', startOfMonth))),
    getCountFromServer(donations),
  ])

  const get = (i: number) => results[i].status === 'fulfilled' ? results[i].value.data().count : 0

  return {
    totalMembers:      get(0),
    availableNow:      get(1),
    pendingRequests:   get(2),
    thisMonthDonations: get(3),
    totalDonations:    get(4),
  }
}

// --- Per-user request count ---

export const getBloodRequestCountByUser = async (uid: string): Promise<number> => {
  const q = query(collection(db, 'bloodRequests'), where('requestedBy', '==', uid))
  const snap = await getCountFromServer(q)
  return snap.data().count
}

// --- District analytics ---

export interface DistrictStat {
  name: string
  donors: number
  available: number
  requests: number
}

export const getDistrictAnalytics = async (): Promise<DistrictStat[]> => {
  const [usersSnap, requestsSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), limit(2000))),
    getDocs(query(collection(db, 'bloodRequests'), limit(1000))),
  ])

  const map: Record<string, DistrictStat> = {}
  const ensure = (name: string) => {
    if (!map[name]) map[name] = { name, donors: 0, available: 0, requests: 0 }
    return map[name]
  }

  usersSnap.docs.forEach(d => {
    const u = d.data() as User
    const s = ensure(u.district || 'অজানা')
    s.donors++
    if (u.isAvailable) s.available++
  })

  requestsSnap.docs.forEach(d => {
    const r = d.data() as BloodRequest
    ensure(r.district || 'অজানা').requests++
  })

  return Object.values(map).sort((a, b) => b.donors - a.donors)
}

// --- Contact Rate Limit ---

// --- Contact Events ---

/**
 * Returns contactEvents for a seeker that are still "contacted" and older
 * than 24 hours — i.e. ready to ask "did you get blood?"
 */
export const getPendingContactEvents = async (seekerId: string): Promise<ContactEvent[]> => {
  const thresholdMs = Date.now() - 24 * 60 * 60 * 1000
  const q = query(
    collection(db, 'contactEvents'),
    where('seekerId', '==', seekerId),
    where('status',   '==', 'contacted'),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as ContactEvent))
    .filter((e) => e.contactedAt.toMillis() <= thresholdMs)
}

/**
 * Resolves a batch of pending contact events.
 * - donatedEventId: the event whose donor actually donated (null → nobody donated)
 * - All others are marked "not_donated"
 * - If someone donated, their totalDonations counter is incremented
 */
// --- Social Links (settings/social) ---

export interface SocialLinks {
  facebook?:  string
  instagram?: string
  youtube?:   string
  whatsapp?:  string
  website?:   string
  email?:     string
  phone?:     string
}

export const getSocialLinks = async (): Promise<SocialLinks> => {
  return cachedRead('settings:social', 10 * 60_000, async () => {
    const snap = await getDoc(doc(db, 'settings', 'social'))
    return snap.exists() ? (snap.data() as SocialLinks) : {}
  })
}

export const saveSocialLinks = async (links: SocialLinks): Promise<void> => {
  const response = await authenticatedFetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'social', links }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to save social links')
  clearCachedReads('settings:social')
}

// --- Helpline Organizations (settings/helplines) ---

export interface HelplineOrg {
  id:    string
  name:  string
  phone: string
}

export const getHelplines = async (): Promise<HelplineOrg[]> => {
  return cachedRead('settings:helplines', 10 * 60_000, async () => {
    const snap = await getDoc(doc(db, 'settings', 'helplines'))
    return snap.exists() ? (snap.data().orgs as HelplineOrg[]) ?? [] : []
  })
}

export const saveHelplines = async (orgs: HelplineOrg[]): Promise<void> => {
  const response = await authenticatedFetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'helplines', orgs }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to save helplines')
  clearCachedReads('settings:helplines')
}
