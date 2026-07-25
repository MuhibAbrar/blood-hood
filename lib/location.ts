import { DISTRICTS_DATA } from './constants'

type LocationRecord = {
  district?: string | null
  upazila?: string | null
  area?: string | null
}

/**
 * Older Blood Hood records only stored an upazila. Resolve their district so
 * current district-scoped screens remain compatible with the legacy data.
 */
export function resolveDistrict(record: LocationRecord): string {
  const district = record.district?.trim()
  if (district) return district

  // Legacy blood requests used `area` for the same upazila value.
  const upazila = record.upazila?.trim() || record.area?.trim()
  if (!upazila) return ''

  return Object.entries(DISTRICTS_DATA).find(([, upazilas]) => upazilas.includes(upazila))?.[0] ?? ''
}

export function belongsToDistrict(record: LocationRecord, district?: string | null): boolean {
  const expected = district?.trim()
  return !expected || resolveDistrict(record) === expected
}

/**
 * Resolve legacy organization locations only when the stored area identifies
 * exactly one district. Ambiguous area names must be corrected by an admin
 * instead of being silently assigned to the wrong district.
 */
export function resolveOrganizationDistrict(record: LocationRecord): string {
  const district = record.district?.trim()
  if (district) return district

  // Every organization created before district support belonged to Khulna.
  // New organization creation requires an explicit district, so this fallback
  // is limited to legacy records that do not have the field yet.
  return 'খুলনা'
}
