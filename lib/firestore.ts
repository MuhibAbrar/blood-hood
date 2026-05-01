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
  arrayRemove,
  increment,
  writeBatch,
  DocumentSnapshot,
  QuerySnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import type { User, BloodRequest, Donation, Organization, Camp, BloodGroup, Gender, Announcement, Notification, JoinRequest, ContactEvent } from '@/types'

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
  let q = query(collection(db, 'users'), where('role', 'in', ['donor', 'admin', 'superadmin']))
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

export const createBloodRequest = async (data: Omit<BloodRequest, 'id' | 'createdAt' | 'fulfilledAt' | 'respondedBy' | 'fulfilledBy' | 'fulfilledByName' | 'fulfilledByPhone' | 'status'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'bloodRequests'), {
    ...data,
    status: 'open',
    respondedBy: [],
    fulfilledBy: null,
    fulfilledByName: null,
    fulfilledByPhone: null,
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

export const respondToRequest = async (requestId: string, donorUid: string) => {
  await updateDoc(doc(db, 'bloodRequests', requestId), {
    respondedBy: arrayUnion(donorUid),
  })

  // Notify the requester that someone responded (fire-and-forget)
  try {
    const [requestSnap, donorSnap] = await Promise.all([
      getDoc(doc(db, 'bloodRequests', requestId)),
      getDoc(doc(db, 'users', donorUid)),
    ])
    const requestData = requestSnap.exists() ? requestSnap.data() : null
    const donorName = donorSnap.exists() ? donorSnap.data().name : 'কেউ'
    if (requestData?.requestedBy && requestData.requestedBy !== donorUid) {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'request_responded',
          data: {
            requesterId: requestData.requestedBy,
            requestId,
            donorName,
            bloodGroup: requestData.bloodGroup,
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
  externalDonor?: { name: string; phone: string }
) => {
  const now = Timestamp.now()

  let orgId: string | null = null
  let donorName = 'Anonymous'
  let fulfilledByName: string | null = null
  let fulfilledByPhone: string | null = null
  let externalDonorPhone: string | null = null

  if (donorUid) {
    const donorSnap = await getDoc(doc(db, 'users', donorUid))
    const donor = donorSnap.exists() ? (donorSnap.data() as User) : null
    donorName = donor?.name ?? 'Unknown'
    fulfilledByName = donorName
    orgId = donor?.organizations?.[0] ?? null

    // Fallback: if donor has no organizations[], check if they're an org admin
    if (!orgId) {
      const adminOrg = await getOrgByAdmin(donorUid)
      if (adminOrg) orgId = adminOrg.id
    }

    await updateDoc(doc(db, 'users', donorUid), {
      totalDonations: increment(1),
      lastDonatedAt: now,
      isAvailable: false,
    })

    if (orgId) {
      await updateDoc(doc(db, 'organizations', orgId), {
        totalDonations: increment(1),
      })
    }
  } else if (externalDonor) {
    donorName = externalDonor.name
    fulfilledByName = externalDonor.name
    fulfilledByPhone = externalDonor.phone || null
    externalDonorPhone = externalDonor.phone || null
  }

  await updateDoc(doc(db, 'bloodRequests', requestId), {
    status: 'fulfilled',
    fulfilledBy: donorUid,
    fulfilledAt: now,
    fulfilledByName,
    fulfilledByPhone,
  })

  await addDoc(collection(db, 'donations'), {
    donorId: donorUid ?? (externalDonor ? 'external' : 'anonymous'),
    donorName,
    requestId,
    recipientName: '',
    hospital: requestData?.hospital ?? '',
    bloodGroup: requestData?.bloodGroup ?? '',
    donatedAt: now,
    verifiedBy: null,
    campId: null,
    orgId,
    externalDonorPhone,
  })
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

export const addManualDonor = async (data: {
  name: string
  phone: string
  bloodGroup: BloodGroup
  upazila: string
  area: string
  gender: Gender
  age?: number
}) => {
  // Check if phone already exists
  const existing = await getUserByPhone(data.phone)
  if (existing) throw new Error('phone-exists')

  const uid = `manual_${data.phone}`
  const now = Timestamp.now()
  await setDoc(doc(db, 'users', uid), {
    uid,
    name: data.name,
    phone: data.phone,
    bloodGroup: data.bloodGroup,
    upazila: data.upazila,
    area: data.area,
    gender: data.gender,
    age: data.age ?? 0,
    isAvailable: true,
    lastDonatedAt: null,
    totalDonations: 0,
    organizations: [],
    role: 'donor',
    fcmToken: null,
    isVerified: false,
    profilePhoto: null,
    manuallyAdded: true,
    createdAt: now,
    updatedAt: now,
  })
}

export const mergeManualDonor = async (
  newUid: string,
  oldUid: string,
  profileData: Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'manuallyAdded'>
) => {
  const oldDoc = await getDoc(doc(db, 'users', oldUid))
  const oldData = oldDoc.exists() ? (oldDoc.data() as User) : null

  const now = Timestamp.now()
  // Create new doc with Firebase Auth UID, carry over historical data
  await setDoc(doc(db, 'users', newUid), {
    ...profileData,
    uid: newUid,
    totalDonations: oldData?.totalDonations ?? 0,
    isVerified: oldData?.isVerified ?? false,
    organizations: oldData?.organizations ?? [],
    lastDonatedAt: oldData?.lastDonatedAt ?? null,
    manuallyAdded: false,
    createdAt: oldData?.createdAt ?? now,
    updatedAt: now,
  })
  // Delete old manual doc
  await deleteDoc(doc(db, 'users', oldUid))
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

export const recordSelfDonation = async (
  donorId: string,
  donorName: string,
  bloodGroup: BloodGroup,
  donatedAt: Timestamp
) => {
  await createDonation({
    donorId,
    donorName,
    requestId: null,
    recipientName: 'নিজে রিপোর্ট',
    hospital: 'অজানা',
    bloodGroup,
    donatedAt,
    verifiedBy: null,
    campId: null,
    orgId: null,
    externalDonorPhone: null,
  })
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
  // Enforce 1 org per user
  const userSnap = await getDoc(doc(db, 'users', uid))
  const userOrgs: string[] = userSnap.data()?.organizations ?? []
  if (userOrgs.length > 0 && !userOrgs.includes(orgId)) throw new Error('already-in-org')

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
  // Add orgId to each admin's organizations field so their donations count for the org
  for (const adminUid of (data.adminIds ?? [])) {
    try {
      await updateDoc(doc(db, 'users', adminUid), {
        organizations: arrayUnion(ref.id),
        updatedAt: Timestamp.now(),
      })
    } catch { /* ignore if user doc doesn't exist */ }
  }
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
  await updateDoc(doc(db, 'organizations', orgId), {
    memberIds: arrayRemove(uid),
  })
  try {
    await updateDoc(doc(db, 'users', uid), {
      organizations: arrayRemove(orgId),
      updatedAt: Timestamp.now(),
    })
  } catch { /* user doc may not exist */ }
}

export const leaveOrganization = async (orgId: string, uid: string) => {
  await updateDoc(doc(db, 'organizations', orgId), {
    memberIds: arrayRemove(uid),
  })
  await updateDoc(doc(db, 'users', uid), {
    organizations: arrayRemove(orgId),
    updatedAt: Timestamp.now(),
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
  // Enforce 1 org per user
  if (user.organizations.length > 0 && !user.organizations.includes(orgId)) {
    throw new Error('already-in-org')
  }

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
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)

  // ৩০ দিনের পুরনো read notifications আলাদা query দিয়ে delete করি (fire-and-forget)
  // limit(50) এর বাইরের পুরনো documents-ও clean হবে
  const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const oldQ = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    where('read', '==', true),
    where('createdAt', '<', thirtyDaysAgo),
    limit(50) // batch-এ delete করি, একসাথে বেশি না
  )
  getDocs(oldQ)
    .then(oldSnap => Promise.all(oldSnap.docs.map(d => deleteDoc(d.ref))))
    .catch(() => {})

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
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [usersSnap, requestsSnap, allRequestsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(query(collection(db, 'bloodRequests'), where('status', '==', 'open'))),
    getDocs(query(collection(db, 'bloodRequests'), where('status', '==', 'fulfilled'))),
  ])

  // donations may be restricted for guests — handle gracefully
  let donationsDocs: QuerySnapshot | null = null
  try { donationsDocs = await getDocs(collection(db, 'donations')) } catch { /* guest */ }

  const users = usersSnap.docs.map((d) => d.data() as User)
  const availableCount = users.filter((u) => u.isAvailable).length

  const thisMonthFromDonations = donationsDocs?.docs.filter((d) => {
    const data = d.data() as Donation
    return data.donatedAt?.toDate() >= startOfMonth
  }).length ?? 0

  const thisMonthFromRequests = allRequestsSnap.docs.filter((d) => {
    const data = d.data()
    return data.fulfilledAt?.toDate() >= startOfMonth
  }).length

  const thisMonthDonations = Math.max(thisMonthFromDonations, thisMonthFromRequests)

  return {
    totalMembers: usersSnap.size,
    availableNow: availableCount,
    thisMonthDonations,
    pendingRequests: requestsSnap.size,
    totalDonations: donationsDocs?.size ?? 0,
  }
}

// --- Contact Events ---

/** Called when a seeker reveals a donor's phone number. */
export const logContactEvent = async (
  seekerId: string,
  donor: Pick<User, 'uid' | 'name' | 'bloodGroup' | 'area'>
): Promise<void> => {
  // Don't duplicate if already logged and still pending
  const dupeQ = query(
    collection(db, 'contactEvents'),
    where('seekerId', '==', seekerId),
    where('donorId', '==', donor.uid),
    where('status', '==', 'contacted')
  )
  const existing = await getDocs(dupeQ)
  if (!existing.empty) return

  await addDoc(collection(db, 'contactEvents'), {
    seekerId,
    donorId:        donor.uid,
    donorName:      donor.name,
    donorBloodGroup: donor.bloodGroup,
    donorArea:      donor.area ?? '',
    contactedAt:    Timestamp.now(),
    status:         'contacted',
  })
}

/**
 * Returns contactEvents for a seeker that are still "contacted" and older
 * than 24 hours — i.e. ready to ask "did you get blood?"
 */
export const getPendingContactEvents = async (seekerId: string): Promise<ContactEvent[]> => {
  const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000)
  const q = query(
    collection(db, 'contactEvents'),
    where('seekerId',    '==', seekerId),
    where('status',      '==', 'contacted'),
    where('contactedAt', '<=', oneDayAgo)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContactEvent))
}

/**
 * Resolves a batch of pending contact events.
 * - donatedEventId: the event whose donor actually donated (null → nobody donated)
 * - All others are marked "not_donated"
 * - If someone donated, their totalDonations counter is incremented
 */
export const resolveContactEvents = async (
  allEventIds:     string[],
  donatedEventId:  string | null,
  donorId:         string | null
): Promise<void> => {
  const batch = writeBatch(db)

  for (const eventId of allEventIds) {
    const ref = doc(db, 'contactEvents', eventId)
    batch.update(ref, {
      status: eventId === donatedEventId ? 'donated' : 'not_donated',
    })
  }

  if (donatedEventId && donorId) {
    batch.update(doc(db, 'users', donorId), {
      totalDonations: increment(1),
    })
  }

  await batch.commit()
}
