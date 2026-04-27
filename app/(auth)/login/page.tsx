'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn, formatPhone, validateBDPhone } from '@/lib/auth'
import { getUser } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'

export default function LoginPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const rawPhone = phone.replace(/\D/g, '')
    if (!validateBDPhone(rawPhone)) {
      showToast('সঠিক বাংলাদেশি নম্বর দিন (01XXXXXXXXX)', 'error')
      return
    }
    if (password.length < 6) {
      showToast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে', 'error')
      return
    }
    setLoading(true)
    try {
      const fbUser = await signIn(rawPhone, password)
      const user = await getUser(fbUser.uid)
      if (!user) {
        router.replace('/register')
      } else {
        router.replace('/dashboard')
      }
    } catch (err: unknown) {
      const e = err as { code?: string }
      if (e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password' || e?.code === 'auth/user-not-found') {
        showToast('নম্বর বা পাসওয়ার্ড ভুল', 'error')
      } else {
        showToast('লগইন করতে সমস্যা হয়েছে', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <span className="text-6xl block mb-3">🩸</span>
        <h1 className="text-2xl font-bold text-[#111111]">Blood Hood</h1>
        <p className="text-[#555555] text-sm mt-1">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
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
        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">পাসওয়ার্ড</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="কমপক্ষে ৬ অক্ষর"
            className="input-field"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              লগইন হচ্ছে...
            </span>
          ) : 'লগইন করুন'}
        </button>
      </form>

      <p className="text-center text-sm text-[#555555] mt-6">
        নতুন?{' '}
        <Link href="/register" className="text-[#D92B2B] font-semibold">
          অ্যাকাউন্ট খুলুন
        </Link>
      </p>
    </div>
  )
}
