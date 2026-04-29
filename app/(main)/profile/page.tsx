'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { updateUser } from '@/lib/firestore'
import { logout } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { KHULNA_UPAZILAS } from '@/lib/constants'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import AvailabilityToggle from '@/components/donor/AvailabilityToggle'
import TopBar from '@/components/layout/TopBar'
import GuestPrompt from '@/components/ui/GuestPrompt'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: user?.name ?? '', area: user?.area ?? '', upazila: user?.upazila ?? '' })

  if (!user) return (
    <div>
      <TopBar title="প্রোফাইল" />
      <GuestPrompt
        icon="👤"
        title="আপনার প্রোফাইল"
        subtitle="Blood Hood এ যোগ দিন — ডোনার হিসেবে নিবন্ধন করুন এবং জীবন বাঁচাতে সাহায্য করুন।"
        features={[
          'ডোনার হিসেবে নিবন্ধন করুন',
          'Availability চালু/বন্ধ করুন',
          'দানের ইতিহাস দেখুন',
          'সংগঠনে যোগ দিন',
        ]}
      />
    </div>
  )

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      await updateUser(user.uid, { name: form.name, area: form.area, upazila: form.upazila })
      await refreshUser()
      showToast('প্রোফাইল আপডেট হয়েছে', 'success')
      setEditing(false)
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.replace('/')
  }

  if (!user) return null

  return (
    <div>
      <TopBar title="আমার প্রোফাইল" action={
        <button onClick={() => setEditing(!editing)} className="text-[#D92B2B] font-semibold text-sm">
          {editing ? 'বাতিল' : 'সম্পাদনা'}
        </button>
      } />
      <div className="px-4 py-4 space-y-5">
        {/* Profile Header */}
        <div className="card p-6 flex flex-col items-center gap-3">
          {user.profilePhoto ? (
            <img src={user.profilePhoto} alt="প্রোফাইল" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <DefaultAvatar gender={user.gender} size={80} />
          )}
          <BloodGroupBadge group={user.bloodGroup} size="lg" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#111111]">{user.name}</h2>
            <p className="text-[#555555] text-sm">{user.phone}</p>
            <p className="text-[#555555] text-sm">{user.upazila}, খুলনা</p>
          </div>
          <div className="flex gap-6 mt-2">
            <div className="text-center">
              <p className="font-bold text-2xl text-[#D92B2B]">{user.totalDonations}</p>
              <p className="text-xs text-[#555555]">মোট দান</p>
            </div>
            <div className="text-center">
              <p className={`font-bold text-sm mt-1 ${user.isAvailable ? 'text-[#1A9E6B]' : 'text-[#D92B2B]'}`}>
                {user.isAvailable ? '● Available' : '○ Unavailable'}
              </p>
              <p className="text-xs text-[#555555]">অবস্থা</p>
            </div>
          </div>
        </div>

        {/* Availability Toggle */}
        <AvailabilityToggle />

        {/* Edit form */}
        {editing ? (
          <div className="card p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">নাম</label>
              <input value={form.name} onChange={set('name')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">উপজেলা</label>
              <select value={form.upazila} onChange={set('upazila')} className="input-field">
                {KHULNA_UPAZILAS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">এলাকা</label>
              <input value={form.area} onChange={set('area')} placeholder="মহল্লা / পাড়া" className="input-field" />
            </div>
            <button onClick={handleSave} disabled={loading} className="btn-primary w-full">
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        ) : (
          <div className="card p-4 space-y-3">
            <InfoRow label="রক্তের গ্রুপ" value={user.bloodGroup} />
            <InfoRow label="বয়স" value={`${user.age} বছর`} />
            <InfoRow label="উপজেলা" value={user.upazila} />
            {user.area && <InfoRow label="এলাকা" value={user.area} />}
            <InfoRow label="ভূমিকা" value={user.role === 'superadmin' ? 'সুপার অ্যাডমিন' : user.role === 'admin' ? 'অ্যাডমিন' : 'ডোনার'} />
          </div>
        )}

        {/* Links */}
        <div className="card divide-y divide-[#E5E5E5]">
          <a href="/history" className="flex items-center justify-between p-4">
            <span className="font-medium text-[#111111]">দানের ইতিহাস</span>
            <span className="text-[#555555]">›</span>
          </a>
          <a href="/organizations" className="flex items-center justify-between p-4">
            <span className="font-medium text-[#111111]">সংগঠন</span>
            <span className="text-[#555555]">›</span>
          </a>
        </div>

        <button onClick={handleLogout} className="btn-ghost w-full border border-[#E5E5E5] text-[#D92B2B]">
          লগ আউট করুন
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#555555]">{label}</span>
      <span className="text-sm font-semibold text-[#111111]">{value}</span>
    </div>
  )
}
