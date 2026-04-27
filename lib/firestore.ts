import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  addDoc,
  arrayUnion,
  increment,
  DocumentSnapshot,
  QuerySnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import type { User, BloodRequest, Donation, Organization, Camp, BloodGroup, Announcement, Notification, JoinRequest } from '@/types'

// --- Users ---

export const createUser = async (uid: string, data: Omit<User, 'uid' | 'createdAt' | 'updatedAt'>) => {
  const now = Timestamp.now()
  await setDoc(doc(db, 'users', uid), {
    uid,
    ...data,
    createdAt: now,
    updatedAt: now,
  })
}

export const getUser = async (uid: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as User) : null
}

export const updateUser = async (uid: string, data: Partial<User>) => {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: Timestamp.now() })
}

export const getDonors = async (filters?: {
  bloodGroup?: BloodGroup
  area?: string
  isAvailable?: boolean
}): Promise<User[]> => {
  let q = query(collection(db, 'users'), where('role', 'in', ['donor', 'admin']))
  if (filters?.bloodGroup) q = query(q, where('bloodGroup', '==', filters.bloodGroup))
  if (filters?.area) q = query(q, where('area', '==', filters.area))
  if (filters?.isAvailable !== undefined) q = query(q, where('isAvailable', '==', filters.isAvailable))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as User)
}

export const subscribeToUser = (uid: string, cb: (user: User | null) => void) => {
  return onSnapshot(doc(db, 'users', uid), (snap: DocumentSnapshot) => {
    cb(snap.exists() ? (snap.data() as User) : null)
  })
}

// --- Blood Requests ---

export const createBloodRequest = async (data: Omit<BloodRequest, 'id' | 'createdAt' | 'fulfilledAt' | 'respondedBy' | 'fulfilledBy' | 'status'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'bloodRequests'), {
    ...data,
    status: 'open',
    respondedBy: [],
    fulfilledBy: null,
    fulfilledAt: null,
    createdAt: Timestamp.now(),
  })

  // Notify compatible donors (fire-and-forget)
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'blood_request',
      data: {
        requestId: ref.id,
        bloodGroup: data.bloodGroup,
        hospital: data.hospital,
        area: data.area,
        patientName: data.patientName,
        urgency: data.urgency,
      },
    }),
  }).catch(() => {}) // silently ignore if notification fails

  return ref.id
}

export const getBloodRequests = async (status?: BloodRequest['status']): Promise<BloodRequest[]> => {
  // Fetch all sorted by createdAt, then filter client-side to avoid composite index
  const q = query(collection(db, 'bloodRequests'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest))
  return status ? all.filter(r => r.status === status) : all
}

export const getBloodRequest = async (id: string): Promise<BloodRequest | null> => {
  const snap = await getDoc(doc(db, 'bloodRequests', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as BloodRequest) : null
}

export const respondToRequest = async (requestId: string, donorUid: string) => {
  await updateDoc(doc(db, 'bloodRequests', requestId), {
    respondedBy: arrayUnion(donorUid),
  })
}

export const fulfillRequest = async (requestId: string, donorUid: string) => {
  await updateDoc(doc(db, 'bloodRequests', requestId), {
    status: 'fulfilled',
    fulfilledBy: donorUid,
    fulfilledAt: Timestamp.now(),
  })
}

export const cancelRequest = async (requestId: string) => {
  await updateDoc(doc(db, 'bloodRequests', requestId), { status: 'cancelled' })
}

export const subscribeToRequests = (cb: (requests: BloodRequest[]) => void) => {
  const q = query(collection(db, 'bloodRequests'), orderBy('createdAt', 'desc'), limit(50))
  return onSnapshot(q, (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest)))
  })
}

// --- Donations ---

export const createDonation = async (data: Omit<Donation, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'donations'), data)
  await updateUser(data.donorId, {
    lastDonatedAt: data.donatedAt,
    isAvailable: false,
  })
  await updateDoc(doc(db, 'users', data.donorId), {
    totalDonations: increment(1),
  })
  return ref.id
}

export const getDonationsByUser = async (uid: string): Promise<Donation[]> => {
  const q = query(collection(db, 'donations'), where('donorId', '==', uid), orderBy('donatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation))
}

// --- Organizations ---

export const getOrganizations = async (): Promise<Organization[]> => {
  const snap = await getDocs(query(collection(db, 'organizations'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organization))
}

export const getOrganization = async (id: string): Promise<Organization | null> => {
  const snap = await getDoc(doc(db, 'organizations', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Organization) : null
}

export const joinOrganization = async (orgId: string, uid: string) => {
  await updateDoc(doc(db, 'organizations', orgId), {
    memberIds: arrayUnion(uid),
  })
  await updateDoc(doc(db, 'users', uid), {
    organizations: arrayUnion(orgId),
  })
}

// --- Camps ---

export const getCamps = async (): Promise<Camp[]> => {
  const snap = await getDocs(query(collection(db, 'camps'), orderBy('date', 'asc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Camp))
}

export const getCamp = async (id: string): Promise<Camp | null> => {
  const snap = await getDoc(doc(db, 'camps', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Camp) : null
}

export const registerForCamp = async (campId: string, uid: string) => {
  await updateDoc(doc(db, 'camps', campId), {
    registeredDonors: arrayUnion(uid),
  })
}

// --- Admin: Users ---

export const getAllUsers = async (): Promise<User[]> => {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => d.data() as User)
}

export const deleteUserDoc = async (uid: string) => {
  await deleteDoc(doc(db, 'users', uid))
}

// --- Admin: Camps ---

export const createCamp = async (data: Omit<Camp, 'id' | 'createdAt' | 'registeredDonors' | 'totalCollected'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'camps'), {
    ...data,
    registeredDonors: [],
    totalCollected: 0,
    createdAt: Timestamp.now(),
  })
  return ref.id
}

export const updateCamp = async (id: string, data: Partial<Camp>) => {
  await updateDoc(doc(db, 'camps', id), data)
}

export const deleteCamp = async (id: string) => {
  await deleteDoc(doc(db, 'camps', id))
}

// --- Admin: Organizations ---

export const createOrganization = async (data: Omit<Organization, 'id' | 'createdAt' | 'memberIds' | 'totalDonations'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'organizations'), {
    ...data,
    memberIds: [],
    totalDonations: 0,
    createdAt: Timestamp.now(),
  })
  return ref.id
}

export const updateOrganization = async (id: string, data: Partial<Organization>) => {
  await updateDoc(doc(db, 'organizations', id), data)
}

export const deleteOrganization = async (id: string) => {
  await deleteDoc(doc(db, 'organizations', id))
}

// --- Org Admin ---

export const getOrgByAdmin = async (uid: string): Promise<Organization | null> => {
  const q = query(collection(db, 'organizations'), where('adminIds', 'array-contains', uid))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Organization
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
  await updateDoc(doc(db, 'organizations', orgId), {
    memberIds: (await getDoc(doc(db, 'organizations', orgId))).data()?.memberIds.filter((id: string) => id !== uid) ?? [],
  })
  await updateDoc(doc(db, 'users', uid), {
    organizations: (await getDoc(doc(db, 'users', uid))).data()?.organizations.filter((id: string) => id !== orgId) ?? [],
  })
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

export const createAnnouncement = async (data: Omit<Announcement, 'id' | 'createdAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'announcements'), { ...data, createdAt: Timestamp.now() })
  return ref.id
}

export const deleteAnnouncement = async (id: string) => {
  await deleteDoc(doc(db, 'announcements', id))
}

export const checkInCamp = async (campId: string, uid: string) => {
  await updateDoc(doc(db, 'camps', campId), {
    checkedIn: arrayUnion(uid),
  })
}

export const recordCampDonation = async (campId: string, donorId: string, orgId: string) => {
  await updateDoc(doc(db, 'camps', campId), {
    donatedUids: arrayUnion(donorId),
    totalCollected: increment(1),
  })
  await updateDoc(doc(db, 'organizations', orgId), {
    totalDonations: increment(1),
  })
  await updateDoc(doc(db, 'users', donorId), {
    totalDonations: increment(1),
    lastDonatedAt: Timestamp.now(),
    isAvailable: false,
  })
}

// --- Join Requests ---

export const requestJoinOrg = async (orgId: string, user: User): Promise<void> => {
  // Check if already pending
  const existing = await getDocs(query(
    collection(db, 'joinRequests'),
    where('orgId', '==', orgId),
    where('userId', '==', user.uid),
    where('status', '==', 'pending')
  ))
  if (!existing.empty) return // Already requested

  await addDoc(collection(db, 'joinRequests'), {
    orgId,
    userId: user.uid,
    userName: user.name,
    userPhone: user.phone,
    userBloodGroup: user.bloodGroup,
    status: 'pending',
    createdAt: Timestamp.now(),
  })
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
  await joinOrganization(request.orgId, request.userId)
  await updateDoc(doc(db, 'joinRequests', request.id), { status: 'accepted' })
}

export const rejectJoinRequest = async (requestId: string): Promise<void> => {
  await updateDoc(doc(db, 'joinRequests', requestId), { status: 'rejected' })
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
  // If this throws, go to Firebase Console → Firestore → Indexes → Add composite index
  // Collection: notifications, Fields: userId Ascending, createdAt Descending
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
  await updateDoc(doc(db, 'notifications', id), { read: true })
}

export const markAllNotificationsRead = async (uid: string) => {
  const q = query(collection(db, 'notifications'), where('userId', '==', uid), where('read', '==', false))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })))
}

// --- Stats ---

export const getPlatformStats = async () => {
  const [usersSnap, requestsSnap, donationsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(query(collection(db, 'bloodRequests'), where('status', '==', 'open'))),
    getDocs(collection(db, 'donations')),
  ])

  const users = usersSnap.docs.map((d) => d.data() as User)
  const availableCount = users.filter((u) => u.isAvailable).length

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthDonations = donationsSnap.docs.filter((d) => {
    const data = d.data() as Donation
    return data.donatedAt?.toDate() >= startOfMonth
  }).length

  return {
    totalMembers: usersSnap.size,
    availableNow: availableCount,
    thisMonthDonations,
    pendingRequests: requestsSnap.size,
    totalDonations: donationsSnap.size,
  }
}
