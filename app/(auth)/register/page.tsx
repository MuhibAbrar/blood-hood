'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createUser, getUserByPhone, mergeManualDonor } from '@/lib/firestore'
import { signUp, formatPhone, validateBDPhone } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { KHULNA_UPAZILAS } from '@/lib/constants'
import { BLOOD_GROUPS, BLOOD_GROUP_COLORS } from '@/lib/bloodCompatibility'
import type { BloodGroup, Gender } from '@/types'

export default function RegisterPage() {
  const router = useRouter()
  const { firebaseUser, refreshUser } = useAuth()
  const { showToast } = useToast()

  // step 0 = phone+password, steps 1–3 = profile setup
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // auth step fields
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authPhone, setAuthPhone] = useState('') // finalised phone after signUp

  // profile fields
  const [form, setForm] = useState({
    name: '',
    bloodGroup: '' as BloodGroup | '',
    area: '',
    upazila: '',
    age: '',
    gender: '' as Gender | '',
  })

  // If already logged in (came from login → no profile), skip step 0
  useEffect(() => {
    if (firebaseUser) {
      const p = firebaseUser.email?.replace('@bloodhood.app', '') ?? ''
      setAuthPhone(p)
      setStep(1)
    }
  }, [firebaseUser])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  // ── Step 0: create Firebase account ─────────────────────────────────────
  const handleSignUp = async () => {
    const rawPhone = phone.replace(/\D/g, '')
    if (!validateBDPhone(rawPhone)) {
      showToast('সঠিক বাংলাদেশি নম্বর দিন (01XXXXXXXXX)', 'error')
      return
    }
    if (password.length < 6) {
      showToast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে', 'error')
      return
    }
    if (password !== confirmPassword) {
      showToast('পাসওয়ার্ড মিলছে না', 'error')
      return
    }
    setLoading(true)
    try {
      await signUp(rawPhone, password)
      setAuthPhone(rawPhone)
      setStep(1)
    } catch (err: unknown) {
      const e = err as { code?: string }
      if (e?.code === 'auth/email-already-in-use') {
        showToast('এই নম্বরে আগেই অ্যাকাউন্ট আছে', 'error')
      } else {
        showToast('অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: save profile to Firestore ───────────────────────────────────
  const handleSubmit = async () => {
    if (!firebaseUser) { router.replace('/login'); return }
    const age = parseInt(form.age)
    if (age < 18 || age > 60) { showToast('বয়স ১৮-৬০ বছরের মধ্যে হতে হবে', 'error'); return }
    setLoading(true)
    try {
      const profileData = {
        name: form.name,
        phone: authPhone,
        bloodGroup: form.bloodGroup as BloodGroup,
        area: form.area,
        upazila: form.upazila,
        age,
        gender: form.gender as Gender,
        isAvailable: true,
        lastDonatedAt: null as null,
        totalDonations: 0,
        organizations: [] as string[],
        role: 'donor' as const,
        fcmToken: null as null,
        isVerified: false,
        profilePhoto: null as null,
      }

      // Check if manually added donor exists with same phone
      const existingUser = await getUserByPhone(authPhone)
      if (existingUser?.manuallyAdded && existingUser.uid !== firebaseUser.uid) {
        // Merge: carry over history, update profile with new info
        await mergeManualDonor(firebaseUser.uid, existingUser.uid, profileData)
        showToast('আপনার আগের data পাওয়া গেছে এবং account merge হয়েছে! 🎉', 'success')
      } else {
        await createUser(firebaseUser.uid, profileData)
        showToast('সফলভাবে রেজিস্ট্রেশন হয়েছে!', 'success')
      }

      await refreshUser()
      router.replace('/dashboard')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <span className="text-5xl block mb-2">🩸</span>
        <h1 className="text-xl font-bold text-[#111111]">নতুন অ্যাকাউন্ট</h1>

        {/* progress dots — only for profile steps 1–3 */}
        {step >= 1 && (
          <div className="flex items-center gap-2 justify-center mt-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 w-10 rounded-full transition-colors ${s <= step ? 'bg-[#D92B2B]' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}
      </div>

      {/* ── Step 0: Phone + Password ── */}
      {step === 0 && (
        <div className="space-y-4">
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
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">পাসওয়ার্ড নিশ্চিত করুন</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="পাসওয়ার্ড আবার লিখুন"
              className="input-field"
            />
          </div>
          <button onClick={handleSignUp} disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                তৈরি হচ্ছে...
              </span>
            ) : 'পরবর্তী →'}
          </button>
          <p className="text-center text-sm text-[#555555]">
            আগেই অ্যাকাউন্ট আছে?{' '}
            <a href="/login" className="text-[#D92B2B] font-semibold">লগইন করুন</a>
          </p>
        </div>
      )}

      {/* ── Step 1: Basic Info ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">পূর্ণ নাম *</label>
            <input value={form.name} onChange={set('name')} placeholder="আপনার নাম লিখুন" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">বয়স *</label>
            <input value={form.age} onChange={set('age')} type="number" min={18} max={60} placeholder="বয়স (১৮–৬০)" className="input-field" inputMode="numeric" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">লিঙ্গ *</label>
            <select value={form.gender} onChange={set('gender')} className="input-field">
              <option value="">নির্বাচন করুন</option>
              <option value="male">পুরুষ</option>
              <option value="female">মহিলা</option>
              <option value="other">অন্যান্য</option>
            </select>
          </div>
          <button
            onClick={() => {
              if (!form.name || !form.age || !form.gender) { showToast('সব তথ্য পূরণ করুন', 'error'); return }
              setStep(2)
            }}
            className="btn-primary w-full"
          >
            পরবর্তী →
          </button>
        </div>
      )}

      {/* ── Step 2: Blood Group ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-3">রক্তের গ্রুপ *</label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setForm((f) => ({ ...f, bloodGroup: g }))}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${
                    form.bloodGroup === g
                      ? `${BLOOD_GROUP_COLORS[g]} scale-105 shadow-md`
                      : 'bg-gray-100 text-[#555555] hover:bg-gray-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-ghost flex-1 border border-[#E5E5E5]">← পিছনে</button>
            <button
              onClick={() => {
                if (!form.bloodGroup) { showToast('রক্তের গ্রুপ নির্বাচন করুন', 'error'); return }
                setStep(3)
              }}
              className="btn-primary flex-1"
            >
              পরবর্তী →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Location ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">উপজেলা *</label>
            <select value={form.upazila} onChange={set('upazila')} className="input-field">
              <option value="">উপজেলা নির্বাচন করুন</option>
              {KHULNA_UPAZILAS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">এলাকা</label>
            <input value={form.area} onChange={set('area')} placeholder="মহল্লা / পাড়া" className="input-field" />
          </div>
          <p className="text-xs text-[#555555] bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            ⚠️ রক্তদানের যোগ্যতা: বয়স ১৮–৬০, ওজন ন্যূনতম ৫০ কেজি
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-ghost flex-1 border border-[#E5E5E5]">← পিছনে</button>
            <button
              onClick={() => {
                if (!form.upazila) { showToast('উপজেলা নির্বাচন করুন', 'error'); return }
                handleSubmit()
              }}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  হচ্ছে...
                </span>
              ) : 'সম্পন্ন করুন ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
