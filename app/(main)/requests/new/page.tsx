'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createBloodRequest } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import { BLOOD_GROUPS, BLOOD_GROUP_COLORS } from '@/lib/bloodCompatibility'
import { KHULNA_UPAZILAS } from '@/lib/constants'
import TopBar from '@/components/layout/TopBar'
import HospitalInput from '@/components/ui/HospitalInput'
import GuestPrompt from '@/components/ui/GuestPrompt'
import type { BloodGroup, Urgency } from '@/types'

export default function NewRequestPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    patientName: '',
    bloodGroup: '' as BloodGroup | '',
    hospital: '',
    area: '',
    contactPhone: '',
    urgency: 'normal' as Urgency,
    note: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))
  const setHospital = (val: string) => setForm(f => ({ ...f, hospital: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patientName || !form.bloodGroup || !form.hospital || !form.contactPhone) {
      showToast('সব তারকা (*) চিহ্নিত ঘর পূরণ করুন', 'error')
      return
    }
    if (!user) { router.replace('/login'); return }
    setLoading(true)
    try {
      const id = await createBloodRequest({
        patientName: form.patientName,
        bloodGroup: form.bloodGroup as BloodGroup,
        hospital: form.hospital,
        area: form.area,
        contactPhone: form.contactPhone,
        requestedBy: user.uid,
        urgency: form.urgency,
        note: form.note || null,
      })
      showToast('সফলভাবে অনুরোধ পাঠানো হয়েছে!', 'success')
      router.replace(`/requests/${id}`)
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return (
    <div>
      <TopBar title="রক্তের অনুরোধ" back />
      <GuestPrompt
        icon="🩸"
        title="রক্তের অনুরোধ দিন"
        subtitle="জরুরি রক্তের প্রয়োজনে অনুরোধ দিন — খুলনার ডোনাররা সাথে সাথে জানতে পারবেন।"
        features={[
          'জরুরি বা সাধারণ request করুন',
          'হাসপাতাল ও এলাকা উল্লেখ করুন',
          'ডোনাররা সরাসরি কল করবেন',
          'সম্পূর্ণ বিনামূল্যে',
        ]}
      />
    </div>
  )

  return (
    <div>
      <TopBar title="রক্তের অনুরোধ" back />
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-[#111111] mb-2">জরুরি স্তর *</label>
          <div className="flex gap-3">
            {(['normal', 'urgent'] as Urgency[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setForm((f) => ({ ...f, urgency: u }))}
                className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-colors ${
                  form.urgency === u
                    ? u === 'urgent' ? 'bg-[#D92B2B] text-white border-[#D92B2B]' : 'bg-[#1A9E6B] text-white border-[#1A9E6B]'
                    : 'border-[#E5E5E5] text-[#555555]'
                }`}
              >
                {u === 'urgent' ? '🔴 জরুরি' : '🟢 সাধারণ'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">রোগীর নাম *</label>
          <input value={form.patientName} onChange={set('patientName')} placeholder="রোগীর নাম" className="input-field" />
        </div>

        {/* Blood group */}
        <div>
          <label className="block text-sm font-medium text-[#111111] mb-2">রক্তের গ্রুপ *</label>
          <div className="grid grid-cols-4 gap-2">
            {BLOOD_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
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

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">হাসপাতাল *</label>
          <HospitalInput value={form.hospital} onChange={setHospital} />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">এলাকা</label>
          <select value={form.area} onChange={set('area')} className="input-field">
            <option value="">উপজেলা নির্বাচন করুন</option>
            {KHULNA_UPAZILAS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">যোগাযোগ নম্বর *</label>
          <input value={form.contactPhone} onChange={set('contactPhone')} placeholder="01X-XXXX-XXXX" className="input-field" type="tel" inputMode="tel" />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">অতিরিক্ত তথ্য</label>
          <textarea value={form.note} onChange={set('note')} placeholder="কোনো অতিরিক্ত তথ্য থাকলে লিখুন..." className="input-field h-24 resize-none" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              পাঠানো হচ্ছে...
            </span>
          ) : '🩸 অনুরোধ পাঠান'}
        </button>
      </form>
    </div>
  )
}
