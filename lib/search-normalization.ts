export const normalizeSearchName = (value: unknown): string =>
  typeof value === 'string'
    ? value.trim().toLocaleLowerCase('bn-BD').replace(/\s+/g, ' ')
    : ''

export const buildDistrictSearchName = (district: unknown, name: unknown): string => {
  const normalizedDistrict = typeof district === 'string' ? district.trim() : ''
  const normalizedName = normalizeSearchName(name)
  return normalizedDistrict && normalizedName ? `${normalizedDistrict}|${normalizedName}` : ''
}
