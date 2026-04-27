export const KHULNA_UPAZILAS = [
  'খুলনা সিটি',
  'সোনাডাঙা',
  'খালিশপুর',
  'দৌলতপুর',
  'বয়রা',
  'রূপসা',
  'লবণচরা',
  'দিঘলিয়া',
  'তেরখাদা',
  'ডুমুরিয়া',
  'পাইকগাছা',
  'কয়রা',
  'দাকোপ',
  'বটিয়াঘাটা',
  'ফুলতলা',
]

export const DONATION_COOLDOWN_DAYS = 90
export const MIN_DONOR_AGE = 18
export const MAX_DONOR_AGE = 60
export const MIN_DONOR_WEIGHT_KG = 50

export const formatBanglaDate = (date: Date): string => {
  const bnMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
    'মে', 'জুন', 'জুলাই', 'আগস্ট',
    'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
  ]
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  const toBn = (n: number) =>
    String(n)
      .split('')
      .map((d) => bnDigits[parseInt(d)] ?? d)
      .join('')
  return `${toBn(date.getDate())} ${bnMonths[date.getMonth()]} ${toBn(date.getFullYear())}`
}

export const daysSince = (date: Date): number => {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}
