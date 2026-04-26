'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createUser } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import { KHULNA_UPAZILAS } from '@/lib/constants'
import { BLOOD_GROUPS, BLOOD_GROUP_COLORS } from '@/lib/bloodCompatibility'
import type { BloodGroup, Gender } from '@/types'

export default function RegisterPage() {
  const router = useRouter()
  const { firebaseUser, refreshUser } = useAuth()
  const { showToast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    bloodGroup: '' as BloodGroup | '',
    area: '',
    upazila: '',
    age: '',
    gender: '' as Gender | '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!firebaseUser) { router.replace('/login'); return }
    const age = parseInt(form.age)
    if (age < 18 || age > 60) { showToast('বয়স ১৮-৬০ বছরের মধ্যে হতে হবে', 'error'); return }
    setLoading(true)
    try {
      await createUser(firebaseUser.uid, {
        name: form.name,
        phone: firebaseUser.phoneNumber?.replace('+88', '') ?? '',
        bloodGroup: form.bloodGroup as BloodGroup,
        area: form.area,
        upazila: form.upazila,
        age,
        gender: form.gender as Gender,
        isAvailable: true,
        lastDonatedAt: null,
        totalDonations: 0,
        organizations: [],
        role: 'donor',
        fcmToken: null,
        isVerified: false,
        profilePhoto: null,
      })
      await refreshUser()
      showToast('সফলভাবে রেজিস্ট্রেশন হয়েছে!', 'success')
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
        <div className="flex items-center gap-2 justify-center mt-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 w-10 rounded-full transition-colors ${s <= step ? 'bg-[#D92B2B]' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

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
