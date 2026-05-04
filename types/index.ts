import { Timestamp } from 'firebase/firestore'

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type UserRole = 'donor' | 'admin' | 'superadmin'
export type Gender = 'male' | 'female' | 'other'
export type Urgency = 'urgent' | 'normal'
export type RequestStatus = 'open' | 'fulfilled' | 'cancelled'
export type CampStatus = 'upcoming' | 'ongoing' | 'completed'
export type OrgType = 'college' | 'university' | 'ngo' | 'hospital' | 'community'

export interface User {
  uid: string
  name: string
  phone: string
  bloodGroup: BloodGroup
  area: string
  upazila: string
  age: number
  gender: Gender
  isAvailable: boolean
  lastDonatedAt: Timestamp | null
  totalDonations: number
  organizations: string[]
  role: UserRole
  fcmToken: string | null
  isVerified: boolean
  profilePhoto: string | null
  manuallyAdded?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface BloodRequest {
  id: string
  patientName: string
  bloodGroup: BloodGroup
  hospital: string
  area: string
  contactPhone: string
  requestedBy: string
  urgency: Urgency
  status: RequestStatus
  respondedBy: string[]
  fulfilledBy: string | null
  fulfilledByName: string | null
  fulfilledByPhone: string | null
  note: string | null
  bags: number
  orgId: string | null
  createdAt: Timestamp
  fulfilledAt: Timestamp | null
}

export interface Donation {
  id: string
  donorId: string
  donorName: string
  requestId: string | null
  recipientName: string
  hospital: string
  bloodGroup: BloodGroup
  donatedAt: Timestamp
  verifiedBy: string | null
  campId: string | null
  orgId: string | null
  externalDonorPhone: string | null
}

export interface Organization {
  id: string
  name: string
  type: OrgType
  area: string
  adminIds: string[]
  memberIds: string[]
  totalDonations: number
  isVerified: boolean
  logo: string | null
  phone?: string
  createdAt: Timestamp
}

export interface Camp {
  id: string
  title: string
  organizationId: string
  date: Timestamp
  venue: string
  area: string
  registeredDonors: string[]
  totalCollected: number
  status: CampStatus
  createdBy: string
  createdAt: Timestamp
}

export interface Announcement {
  id: string
  orgId: string
  title: string
  message: string
  createdBy: string
  createdAt: Timestamp
}

export interface JoinRequest {
  id: string
  orgId: string
  userId: string
  userName: string
  userPhone: string
  userBloodGroup: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Timestamp
}

export interface ContactEvent {
  id: string
  seekerId: string
  donorId: string
  donorName: string
  donorBloodGroup: BloodGroup
  donorArea: string
  contactedAt: Timestamp
  status: 'contacted' | 'donated' | 'not_donated'
}

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  type: 'blood_request' | 'availability_reminder' | 'camp_reminder' | 'org_approved' | 'org_announcement' | 'request_fulfilled' | 'broadcast' | 'request_responded'
  read: boolean
  data: Record<string, string>
  createdAt: Timestamp
}
