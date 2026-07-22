'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { updateUser } from '@/lib/firestore'
import { logout } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { DISTRICTS, DISTRICTS_DATA } from '@/lib/constants'
import SelectPicker from '@/components/ui/SelectPicker'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import AvailabilityToggle from '@/components/donor/AvailabilityToggle'
import TopBar from '@/components/layout/TopBar'
import GuestPrompt from '@/components/ui/GuestPrompt'
import { daysSince, formatBanglaDate } from '@/lib/constants'
import { recordSelfDonation, getBloodRequestCountByUser } from '@/lib/firestore'
import { CheckCircleIcon, ClockIcon, DropIcon, BuildingIcon } from '@/components/ui/Icons'
import { Timestamp } from 'firebase/firestore'
import Modal from '@/components/ui/Modal'
import { authenticatedFetch } from '@/lib/api-client'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: user?.name ?? '', district: user?.district ?? '', area: user?.area ?? '', upazila: user?.upazila ?? '' })
  const [donationModal, setDonationModal] = useState(false)
  const [donationDate, setDonationDate] = useState('')
  const [donationLoading, setDonationLoading] = useState(false)
  const [requestCount, setRequestCount] = useState<number | null>(null)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (user?.uid) getBloodRequestCountByUser(user.uid).then(setRequestCount)
  }, [user?.uid])

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
      await updateUser(user.uid, { name: form.name, district: form.district, area: form.area, upazila: form.upazila })
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return
    setDeleteLoading(true)
    try {
      const response = await authenticatedFetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      })
      if (!response.ok) throw new Error('Account deletion failed')
      await logout().catch(() => {})
      router.replace('/login?accountDeleted=1')
    } catch {
      showToast('অ্যাকাউন্ট মুছে ফেলা যায়নি। আবার চেষ্টা করুন।', 'error')
      setDeleteLoading(false)
    }
  }

  const handleSelfDonation = async () => {
    if (!user || !donationDate) return
    setDonationLoading(true)
    try {
      const date = new Date(donationDate)
      await recordSelfDonation(user.uid, user.name, user.bloodGroup, Timestamp.fromDate(date))
      await refreshUser()
      showToast('রক্তদান রেকর্ড হয়েছে', 'success')
      setDonationModal(false)
      setDonationDate('')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setDonationLoading(false)
    }
  }

  if (!user) return null

  const lastDate = user.lastDonatedAt?.toDate() ?? null
  const remaining = user.nextAvailableAt
    ? Math.max(0, Math.ceil((user.nextAvailableAt.toDate().getTime() - Date.now()) / 86400000))
    : 0
  const canDonate = !lastDate || remaining <= 0

  return (
    <div className="pb-8">
      <TopBar variant="red" title="আমার প্রোফাইল" action={
        <button onClick={() => setEditing(!editing)} className="text-white font-semibold text-sm bg-white/20 px-3 py-1 rounded-lg">
          {editing ? 'বাতিল' : 'সম্পাদনা'}
        </button>
      } />

      {/* ── Hero ── */}
      <div className="mx-4 mt-4 relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#D92B2B] via-[#C3222B] to-[#801616] pt-6 pb-7 px-4 text-center shadow-lg shadow-red-900/15">
        <div className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -left-12 -bottom-20 w-44 h-44 rounded-full bg-black/10" />
        <div className="relative">
        <div className="inline-block ring-4 ring-white/30 rounded-full shadow-xl">
          {user.profilePhoto ? (
            <img src={user.profilePhoto} alt="প্রোফাইল" className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <DefaultAvatar gender={user.gender} size={80} />
          )}
        </div>
        <div className="mt-3 flex justify-center">
          <BloodGroupBadge group={user.bloodGroup} size="lg" />
        </div>
        <h2 className="text-xl font-bold text-white mt-2">{user.name}</h2>
        <p className="text-white/70 text-sm">{user.phone}</p>
        <p className="text-white/60 text-xs mt-0.5">
          {user.upazila}{user.district ? `, ${user.district}` : ''}
        </p>
        {user.isVerified && (
          <span className="inline-block mt-2 text-xs bg-white/20 text-white px-3 py-1 rounded-full">
            ✓ যাচাইকৃত
          </span>
        )}
        </div>
      </div>

      {/* ── Stat chips (overlap hero) ── */}
      <div className="grid grid-cols-3 gap-2.5 px-4 mt-3">
        <StatChip
          value={String(user.totalDonations)}
          label="মোট দান"
          valueColor="text-[#D92B2B]"
        />
        <StatChip
          value={requestCount !== null ? String(requestCount) : '—'}
          label="Request"
          valueColor="text-blue-600"
        />
        <StatChip
          value={user.isAvailable ? 'Active' : 'Inactive'}
          label="অবস্থা"
          valueColor={user.isAvailable ? 'text-[#1A9E6B]' : 'text-[#D92B2B]'}
          small
        />
      </div>

      {/* ── Body ── */}
      <div className="px-4 mt-5 space-y-4">

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#AAA]">Donation readiness</p>
            <h3 className="font-bold text-[#111111] mt-0.5">রক্তদানের অবস্থা</h3>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${canDonate ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {canDonate ? 'Ready' : `${remaining} দিন বাকি`}
          </span>
        </div>

        {/* Donation countdown */}
        <div className={`rounded-2xl border-l-4 bg-white border border-[#E5E5E5] p-4 flex items-center gap-3 ${canDonate ? 'border-l-[#1A9E6B]' : 'border-l-amber-400'}`}>
          {canDonate
            ? <CheckCircleIcon className="w-7 h-7 shrink-0 stroke-[#1A9E6B]" />
            : <ClockIcon className="w-7 h-7 shrink-0 stroke-amber-400" />
          }
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#111111] text-sm">
              {canDonate ? 'এখনই রক্ত দিতে পারবেন!' : `আর `}
              {!canDonate && <span className="text-amber-600 font-bold">{remaining} দিন</span>}
              {!canDonate && ' পরে দিতে পারবেন'}
            </p>
            <p className="text-xs text-[#555555] mt-0.5">
              {lastDate
                ? `শেষ দান: ${formatBanglaDate(lastDate)} (${daysSince(lastDate)} দিন আগে)`
                : 'কোনো পূর্বের দানের রেকর্ড নেই'}
            </p>
          </div>
        </div>

        {/* Availability Toggle */}
        <AvailabilityToggle />

        {/* Self-reported donation */}
        <button
          onClick={() => { setDonationDate(''); setDonationModal(true) }}
          className="w-full bg-white rounded-2xl border border-[#E5E5E5] p-4 flex items-center justify-between text-left active:bg-[#FAFAFA] transition-colors"
        >
          <div>
            <p className="font-semibold text-[#111111]">আমি রক্ত দিয়েছি</p>
            <p className="text-xs text-[#555555] mt-0.5">তারিখ দিন — ৯০ দিন unavailable থাকবেন</p>
          </div>
          <DropIcon className="w-6 h-6 stroke-[#D92B2B]" />
        </button>

        <Modal open={donationModal} onClose={() => setDonationModal(false)} title="রক্তদানের তারিখ">
          <p className="text-sm text-[#555555] mb-4">
            আপনি কবে রক্ত দিয়েছেন সেই তারিখটি সিলেক্ট করুন। এরপর ৯০ দিন আপনি Unavailable হিসেবে চিহ্নিত হবেন।
          </p>
          <input
            type="date"
            value={donationDate}
            onChange={(e) => setDonationDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="input-field w-full mb-6"
          />
          <div className="flex gap-3">
            <button onClick={() => setDonationModal(false)} className="btn-ghost flex-1 border border-[#E5E5E5]">
              বাতিল
            </button>
            <button
              onClick={handleSelfDonation}
              disabled={!donationDate || donationLoading}
              className="btn-primary flex-1"
            >
              {donationLoading ? 'সংরক্ষণ হচ্ছে...' : 'নিশ্চিত করুন'}
            </button>
          </div>
        </Modal>

        {/* Edit form / Info */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#AAA]">Personal details</p>
            <h3 className="font-bold text-[#111111] mt-0.5">ব্যক্তিগত তথ্য</h3>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs font-semibold text-[#D92B2B] bg-red-50 px-3 py-1.5 rounded-full">
              সম্পাদনা
            </button>
          )}
        </div>

        {editing ? (
          <div className="card p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">নাম</label>
              <input value={form.name} onChange={set('name')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">জেলা</label>
              <SelectPicker
                value={form.district}
                onChange={(val) => setForm((f) => ({ ...f, district: val, upazila: '' }))}
                options={DISTRICTS}
                placeholder="জেলা নির্বাচন করুন"
              />
            </div>
            {form.district && (
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">উপজেলা</label>
                <SelectPicker
                  value={form.upazila}
                  onChange={(val) => setForm((f) => ({ ...f, upazila: val }))}
                  options={DISTRICTS_DATA[form.district] ?? []}
                  placeholder="উপজেলা নির্বাচন করুন"
                  searchable
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">এলাকা</label>
              <input value={form.area} onChange={set('area')} placeholder="মহল্লা / পাড়া" className="input-field" />
            </div>
            <button onClick={handleSave} disabled={loading} className="btn-primary w-full">
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        ) : (
          <div className="card divide-y divide-[#F0F0F0]">
            <InfoRow label="রক্তের গ্রুপ" value={user.bloodGroup} />
            <InfoRow label="বয়স" value={`${user.age} বছর`} />
            {user.district && <InfoRow label="জেলা" value={user.district} />}
            <InfoRow label="উপজেলা" value={user.upazila} />
            {user.area && <InfoRow label="এলাকা" value={user.area} />}
            <InfoRow
              label="ভূমিকা"
              value={user.role === 'superadmin' ? 'সুপার অ্যাডমিন' : user.role === 'admin' ? 'অ্যাডমিন' : 'ডোনার'}
            />
          </div>
        )}

        {/* Links */}
        <div className="pt-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#AAA]">Activity</p>
          <h3 className="font-bold text-[#111111] mt-0.5">আমার কার্যক্রম</h3>
        </div>
        <div className="card divide-y divide-[#F0F0F0]">
          <a href="/history" className="flex items-center justify-between p-4 active:bg-[#FAFAFA] transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"><DropIcon className="w-4 h-4 stroke-[#D92B2B]" /></span>
              <span className="font-medium text-[#111111]">দানের ইতিহাস</span>
            </div>
            <span className="text-[#BBBBBB]">›</span>
          </a>
          <a href="/organizations" className="flex items-center justify-between p-4 active:bg-[#FAFAFA] transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center"><BuildingIcon className="w-4 h-4 stroke-purple-600" /></span>
              <span className="font-medium text-[#111111]">সংগঠন</span>
            </div>
            <span className="text-[#BBBBBB]">›</span>
          </a>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-2xl border-2 border-[#FFE5E5] text-[#D92B2B] font-semibold text-sm bg-white active:bg-red-50 transition-colors"
        >
          লগ আউট করুন
        </button>

        <button
          onClick={() => { setDeleteConfirmation(''); setDeleteModal(true) }}
          className="w-full py-3 text-red-700 font-semibold text-sm"
        >
          অ্যাকাউন্ট মুছে ফেলুন
        </button>

        <Modal open={deleteModal} onClose={() => !deleteLoading && setDeleteModal(false)} title="অ্যাকাউন্ট মুছে ফেলুন">
          <div className="space-y-4">
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-900">
              <p className="font-semibold">এই কাজটি আর ফিরিয়ে নেওয়া যাবে না।</p>
              <p className="mt-1">আপনার লগইন ও ব্যক্তিগত তথ্য মুছে যাবে। সেবার রেকর্ড ঠিক রাখতে পুরোনো রক্তদান ও রক্তের অনুরোধ পরিচয়বিহীনভাবে সংরক্ষিত হতে পারে।</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">
                নিশ্চিত করতে ইংরেজিতে DELETE লিখুন
              </label>
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoComplete="off"
                className="input-field w-full"
                placeholder="DELETE"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(false)} disabled={deleteLoading} className="btn-ghost flex-1 border border-[#E5E5E5]">
                বাতিল
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || deleteLoading}
                className="flex-1 rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleteLoading ? 'মুছে ফেলা হচ্ছে...' : 'স্থায়ীভাবে মুছুন'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

function StatChip({ value, label, valueColor, small }: {
  value: string; label: string; valueColor: string; small?: boolean
}) {
  return (
    <div className="flex-1 bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-3 flex flex-col items-center gap-1 text-center">
      <span className={`font-bold leading-tight ${small ? 'text-sm' : 'text-2xl'} ${valueColor}`}>{value}</span>
      <span className="text-[10px] text-[#999] leading-tight">{label}</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-[#555555]">{label}</span>
      <span className="text-sm font-semibold text-[#111111]">{value}</span>
    </div>
  )
}
