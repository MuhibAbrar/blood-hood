'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatPhone, validateBDPhone } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'

type Step = 'phone' | 'otp' | 'password'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [loading, setLoading] = useState(false)
  const rawPhone = phone.replace(/\D/g, '')

  async function readResult(response: Response) {
    const result = await response.json()
    if (!response.ok) {
      const diagnostic = result.diagnostic
      const detail = diagnostic ? ` (${diagnostic.code}: ${diagnostic.message})` : ''
      throw new Error(`${result.error || 'অনুরোধটি সম্পন্ন হয়নি'}${detail}`)
    }
    return result
  }

  async function sendOtp(e?: FormEvent) {
    e?.preventDefault()
    if (!validateBDPhone(rawPhone)) return showToast('সঠিক বাংলাদেশি নম্বর দিন (01XXXXXXXXX)', 'error')
    setLoading(true)
    try {
      await readResult(await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: rawPhone, purpose: 'password-reset' }),
      }))
      setStep('otp')
      showToast('আপনার ফোনে OTP পাঠানো হয়েছে', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'OTP পাঠানো যায়নি', 'error')
    } finally { setLoading(false) }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp)) return showToast('৬ সংখ্যার OTP দিন', 'error')
    setLoading(true)
    try {
      const result = await readResult(await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: rawPhone, otp, purpose: 'password-reset' }),
      }))
      setVerificationToken(result.verificationToken)
      setStep('password')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'OTP যাচাই হয়নি', 'error')
    } finally { setLoading(false) }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) return showToast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'error')
    if (password !== confirmPassword) return showToast('দুইটি পাসওয়ার্ড মিলছে না', 'error')
    setLoading(true)
    try {
      await readResult(await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: rawPhone, password, verificationToken }),
      }))
      showToast('পাসওয়ার্ড পরিবর্তন হয়েছে—এখন লগইন করুন', 'success')
      router.replace('/login')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'পাসওয়ার্ড পরিবর্তন হয়নি', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">🩸</span>
        <h1 className="text-2xl font-bold text-[#111111]">পাসওয়ার্ড পরিবর্তন</h1>
        <p className="text-[#555555] text-sm mt-2">
          {step === 'phone' && 'অ্যাকাউন্টের মোবাইল নম্বর দিন'}
          {step === 'otp' && `${formatPhone(rawPhone)} নম্বরে পাঠানো OTP দিন`}
          {step === 'password' && 'আপনার নতুন পাসওয়ার্ড সেট করুন'}
        </p>
      </div>

      {step === 'phone' && <form onSubmit={sendOtp} className="space-y-4">
        <input type="tel" value={formatPhone(phone)} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          placeholder="01X-XXXX-XXXX" maxLength={13} inputMode="tel" className="input-field" />
        <button disabled={loading} className="btn-primary w-full">{loading ? 'OTP পাঠানো হচ্ছে...' : 'OTP পাঠান'}</button>
      </form>}

      {step === 'otp' && <form onSubmit={verifyOtp} className="space-y-4">
        <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="৬ সংখ্যার OTP" inputMode="numeric" className="input-field text-center tracking-[0.35em] text-xl" />
        <button disabled={loading} className="btn-primary w-full">{loading ? 'যাচাই হচ্ছে...' : 'OTP যাচাই করুন'}</button>
        <button type="button" disabled={loading} onClick={() => sendOtp()} className="w-full text-sm text-[#D92B2B]">আবার OTP পাঠান</button>
      </form>}

      {step === 'password' && <form onSubmit={resetPassword} className="space-y-4">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="নতুন পাসওয়ার্ড" className="input-field" />
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="নতুন পাসওয়ার্ড আবার দিন" className="input-field" />
        <button disabled={loading} className="btn-primary w-full">{loading ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}</button>
      </form>}

      <p className="text-center mt-6"><Link href="/login" className="text-sm font-semibold text-[#D92B2B]">লগইনে ফিরে যান</Link></p>
    </div>
  )
}
