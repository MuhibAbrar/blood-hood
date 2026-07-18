import { DISTRICTS_DATA } from './constants'

type LocationRecord = {
  district?: string | null
  upazila?: string | null
}

/**
 * Older Blood Hood records only stored an upazila. Resolve their district so
 * current district-scoped screens remain compatible with the legacy data.
 */
export function resolveDistrict(record: LocationRecord): string {
  const district = record.district?.trim()
  if (district) return district

  const upazila = record.upazila?.trim()
  if (!upazila) return ''

  return Object.entries(DISTRICTS_DATA).find(([, upazilas]) => upazilas.includes(upazila))?.[0] ?? ''
}

export function belongsToDistrict(record: LocationRecord, district?: string | null): boolean {
  const expected = district?.trim()
  return !expected || resolveDistrict(record) === expected
}
