'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RecaptchaVerifier } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { sendOTP, verifyOTP, formatPhone, validateBDPhone } from '@/lib/auth'
import { getUser } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'

export default function LoginPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        recaptchaRef.current = null
      },
    })
    verifier.render()
    recaptchaRef.current = verifier
    return () => {
      verifier.clear()
      recaptchaRef.current = null
    }
  }, [])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    const rawPhone = phone.replace(/\D/g, '')
    if (!validateBDPhone(rawPhone)) {
      showToast('সঠিক বাংলাদেশি নম্বর দিন (01XXXXXXXXX)', 'error')
      return
    }
    setLoading(true)
    try {
      if (!recaptchaRef.current) {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
        await verifier.render()
        recaptchaRef.current = verifier
      }
      await sendOTP(rawPhone, recaptchaRef.current)
      setStep('otp')
      showToast('OTP পাঠানো হয়েছে', 'success')
    } catch {
      showToast('OTP পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
      recaptchaRef.current?.clear()
      recaptchaRef.current = null
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      showToast('৬ সংখ্যার OTP দিন', 'error')
      return
    }
    setLoading(true)
    try {
      const fbUser = await verifyOTP(otp)
      const user = await getUser(fbUser.uid)
      if (!user) {
        router.replace('/register')
      } else {
        router.replace('/dashboard')
      }
    } catch {
      showToast('ভুল OTP, আবার চেষ্টা করুন', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* reCAPTCHA container সবসময় DOM-এ থাকবে */}
      <div id="recaptcha-container" />

      <div className="text-center mb-8">
        <span className="text-6xl block mb-3">🩸</span>
        <h1 className="text-2xl font-bold text-[#111111]">Blood Hood</h1>
        <p className="text-[#555555] text-sm mt-1">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">মোবাইল নম্বর</label>
            <input
              type="tel"
              value={formatPhone(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="01X-XXXX-XXXX"
              maxLength={13}
              className="input-field"
              inputMode="tel"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                পাঠানো হচ্ছে...
              </span>
            ) : 'OTP পাঠান'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="text-center mb-2">
            <p className="text-[#555555] text-sm">
              <span className="font-semibold text-[#111111]">{formatPhone(phone)}</span> নম্বরে OTP পাঠানো হয়েছে
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">OTP কোড</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="৬ সংখ্যার কোড"
              maxLength={6}
              className="input-field text-center text-2xl tracking-widest"
              inputMode="numeric"
              autoFocus
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                যাচাই হচ্ছে...
              </span>
            ) : 'যাচাই করুন'}
          </button>
          <button type="button" onClick={() => setStep('phone')} className="btn-ghost w-full text-sm">
            নম্বর পরিবর্তন করুন
          </button>
        </form>
      )}

      <p className="text-center text-sm text-[#555555] mt-6">
        নতুন?{' '}
        <Link href="/register" className="text-[#D92B2B] font-semibold">
          অ্যাকাউন্ট খুলুন
        </Link>
      </p>
    </div>
  )
}
