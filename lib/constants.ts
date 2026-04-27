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

export const KHULNA_HOSPITALS: { display: string; search: string[] }[] = [
  { display: 'Khulna Medical College Hospital', search: ['khulna medical college hospital', 'খুলনা মেডিকেল কলেজ হাসপাতাল', 'kmch', 'kmch hospital'] },
  { display: 'খুলনা সদর হাসপাতাল', search: ['খুলনা সদর হাসপাতাল', 'sadar hospital', 'khulna sadar hospital', 'সদর হাসপাতাল'] },
  { display: 'শহীদ শেখ আবু নাসের বিশেষায়িত হাসপাতাল', search: ['শহীদ শেখ আবু নাসের', 'abu naser', 'abu nasar', 'sheikh abu naser', 'বিশেষায়িত হাসপাতাল'] },
  { display: 'পুলিশ হাসপাতাল, খুলনা', search: ['পুলিশ হাসপাতাল', 'police hospital', 'police hospital khulna'] },
  { display: 'নৌবাহিনী হাসপাতাল (BNS Titumir)', search: ['নৌবাহিনী হাসপাতাল', 'bns titumir', 'navy hospital', 'titumir'] },
  { display: 'রেলওয়ে হাসপাতাল, খুলনা', search: ['রেলওয়ে হাসপাতাল', 'railway hospital', 'railway hospital khulna'] },
  { display: 'উপজেলা স্বাস্থ্য কমপ্লেক্স', search: ['উপজেলা স্বাস্থ্য কমপ্লেক্স', 'upazila health complex', 'উপজেলা হাসপাতাল'] },
  { display: 'Gazi Medical College Hospital', search: ['gazi medical college hospital', 'gazi medical', 'গাজী মেডিকেল কলেজ হাসপাতাল', 'গাজী মেডিকেল'] },
  { display: 'Khulna City Medical College Hospital', search: ['khulna city medical college', 'city medical', 'সিটি মেডিকেল', 'খুলনা সিটি মেডিকেল'] },
  { display: 'Ad-din Akij Medical College Hospital', search: ['ad-din akij', 'addin akij', 'আদ-দ্বীন আকিজ', 'আদদ্বীন', 'akij hospital'] },
  { display: 'Islami Bank Hospital Khulna', search: ['islami bank hospital', 'ইসলামী ব্যাংক হাসপাতাল', 'islami bank khulna'] },
  { display: 'Royal Hospital Khulna', search: ['royal hospital', 'রয়্যাল হাসপাতাল', 'royal hospital khulna'] },
  { display: 'Nargis Memorial Hospital', search: ['nargis memorial', 'নার্গিস মেমোরিয়াল', 'nargis hospital'] },
  { display: 'Garib Nawaz Clinic', search: ['garib nawaz', 'গরীব নেওয়াজ', 'garib nawaz clinic'] },
  { display: 'City Hospital Khulna', search: ['city hospital', 'সিটি হাসপাতাল', 'city hospital khulna'] },
  { display: 'Star Hospital Khulna', search: ['star hospital', 'স্টার হাসপাতাল', 'star hospital khulna'] },
  { display: 'Life Care Hospital Khulna', search: ['life care hospital', 'লাইফ কেয়ার', 'lifecare hospital'] },
  { display: 'Doctors Point Hospital', search: ['doctors point', 'ডক্টরস পয়েন্ট', 'doctor point'] },
  { display: 'Medinova Medical Services Khulna', search: ['medinova', 'মেডিনোভা', 'medinova khulna'] },
  { display: 'Popular Diagnostic Center Khulna', search: ['popular diagnostic', 'পপুলার ডায়াগনস্টিক', 'popular khulna'] },
  { display: 'Ibn Sina Diagnostic & Consultation Center Khulna', search: ['ibn sina', 'ইবনে সিনা', 'ibne sina', 'ibn sina khulna'] },
  { display: 'Lab Aid Diagnostic Khulna', search: ['lab aid', 'ল্যাব এইড', 'labaid', 'lab aid khulna'] },
  { display: 'Alif Hospital Khulna', search: ['alif hospital', 'আলিফ হাসপাতাল', 'alif khulna'] },
  { display: 'Janata Clinic Khulna', search: ['janata clinic', 'জনতা ক্লিনিক', 'janata khulna'] },
  { display: 'Green Life Hospital Khulna', search: ['green life hospital', 'গ্রিন লাইফ', 'greenlife', 'green life khulna'] },
  { display: 'Newlife Hospital Khulna', search: ['newlife hospital', 'নিউলাইফ', 'new life hospital', 'newlife khulna'] },
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
