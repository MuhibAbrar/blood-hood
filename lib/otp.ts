import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto'

export const OTP_TTL_MS = 5 * 60 * 1000
export const OTP_RESEND_MS = 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_MAX_SENDS_PER_HOUR = 5

function secret() {
  const value = process.env.OTP_SECRET || process.env.FIREBASE_ADMIN_PRIVATE_KEY
  if (!value) throw new Error('OTP secret is not configured')
  return value
}

export function normalizeBDPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  const local = digits.startsWith('880') ? `0${digits.slice(3)}` : digits
  if (!/^01[3-9]\d{8}$/.test(local)) throw new Error('Invalid Bangladesh phone number')
  return local
}

export function internationalPhone(phone: string) {
  return `88${normalizeBDPhone(phone)}`
}

export function phoneKey(phone: string) {
  return createHash('sha256').update(normalizeBDPhone(phone)).digest('hex')
}

export function generateOtp() {
  return String(randomInt(100000, 1000000))
}

export function hashOtp(phone: string, otp: string) {
  return createHmac('sha256', secret()).update(`${normalizeBDPhone(phone)}:${otp}`).digest('hex')
}

export function safeHash(value: string) {
  return createHmac('sha256', secret()).update(value).digest('hex')
}

export function hashesMatch(expected: string, actual: string) {
  const left = Buffer.from(expected, 'hex')
  const right = Buffer.from(actual, 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}

export function createVerificationToken() {
  return randomBytes(32).toString('hex')
}

export function phoneToEmail(phone: string) {
  return `${normalizeBDPhone(phone)}@bloodhood.app`
}
