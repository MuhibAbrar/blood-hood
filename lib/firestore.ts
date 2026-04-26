import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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
import type { User, BloodRequest, Donation, Organization, Camp, BloodGroup } from '@/types'

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
  return ref.id
}

export const getBloodRequests = async (status?: BloodRequest['status']): Promise<BloodRequest[]> => {
  let q = query(collection(db, 'bloodRequests'), orderBy('createdAt', 'desc'))
  if (status) q = query(q, where('status', '==', status))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest))
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
