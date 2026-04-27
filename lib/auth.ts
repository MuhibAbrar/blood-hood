import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from './firebase'

// Phone number থেকে Firebase email বানাই
const phoneToEmail = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  return `${digits}@bloodhood.app`
}

export const signUp = async (phone: string, password: string) => {
  const email = phoneToEmail(phone)
  const result = await createUserWithEmailAndPassword(auth, email, password)
  return result.user
}

export const signIn = async (phone: string, password: string) => {
  const email = phoneToEmail(phone)
  const result = await signInWithEmailAndPassword(auth, email, password)
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
