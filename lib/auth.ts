import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  ConfirmationResult,
} from 'firebase/auth'
import { auth } from './firebase'

let confirmationResult: ConfirmationResult | null = null

export const setupRecaptcha = (containerId: string) => {
  if (typeof window === 'undefined') return null
  return new RecaptchaVerifier(auth, containerId, { size: 'invisible' })
}

export const sendOTP = async (phone: string, recaptchaVerifier: RecaptchaVerifier): Promise<void> => {
  const formatted = phone.startsWith('+88') ? phone : `+88${phone}`
  confirmationResult = await signInWithPhoneNumber(auth, formatted, recaptchaVerifier)
}

export const verifyOTP = async (otp: string) => {
  if (!confirmationResult) throw new Error('OTP পাঠানো হয়নি')
  const result = await confirmationResult.confirm(otp)
  return result.user
}

export const logout = async () => {
  await signOut(auth)
}

export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export const validateBDPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '')
  return /^01[3-9]\d{8}$/.test(digits)
}
