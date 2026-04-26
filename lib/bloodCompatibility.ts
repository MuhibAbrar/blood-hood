import type { BloodGroup } from '@/types'

export const COMPATIBLE_DONORS: Record<BloodGroup, BloodGroup[]> = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
}

export const getCompatibleDonors = (recipientGroup: BloodGroup): BloodGroup[] => {
  return COMPATIBLE_DONORS[recipientGroup] ?? []
}

export const canDonate = (donorGroup: BloodGroup, recipientGroup: BloodGroup): boolean => {
  return COMPATIBLE_DONORS[recipientGroup]?.includes(donorGroup) ?? false
}

export const BLOOD_GROUP_COLORS: Record<BloodGroup, string> = {
  'A+':  'bg-red-500 text-white',
  'A-':  'bg-red-600 text-white',
  'B+':  'bg-blue-500 text-white',
  'B-':  'bg-blue-600 text-white',
  'AB+': 'bg-purple-500 text-white',
  'AB-': 'bg-purple-700 text-white',
  'O+':  'bg-rose-500 text-white',
  'O-':  'bg-rose-800 text-white',
}

export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
