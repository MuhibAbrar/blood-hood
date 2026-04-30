'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useOrgAdmin } from '@/context/OrgAdminContext'
import { getBloodRequestsByOrg, createBloodRequest, cancelRequest } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import { BLOOD_GROUPS, BLOOD_GROUP_COLORS } from '@/lib/bloodCompatibility'
import { KHULNA_UPAZILAS, formatBanglaDate } from '@/lib/constants'
import type { BloodRequest, BloodGroup, Urgency } from '@/types'

const statusLabel = (s: BloodRequest['status']) => ({
  open: { text: 'চলছে', cls: 'bg-green-100 text-green-700' },
  fulfilled: { text: 'পূর্ণ হয়েছে', cls: 'bg-blue-100 text-blue-700' },
  cancelled: { text: 'বাতিল', cls: 'bg-gray-100 text-gray-500' },
})[s] ?? { text: s, cls: 'bg-gray-100 text-gray-500' }

const defaultForm = {
  patientName: '',
  bloodGroup: '' as BloodGroup | '',
  hospital: '',
  area: '',
  contactPhone: '',
  urgency: 'normal' as Urgency,
  bags: 1,
  note: '',
}

export default function OrgRequestsPage() {
  const { user } = useAuth()
  const { org } = useOrgAdmin()
  const { showToast } = useToast()

  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<BloodRequest | null>(null)

  const load = async () => {
    if (!org) return
    const r = await getBloodRequestsByOrg(org.id)
    setRequests(r)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [org])

  const handleSubmit = async () => {
    if (!form.patientName || !form.bloodGroup || !form.hospital || !form.contactPhone) {
      showToast('সব তারকা (*) চিহ্নিত ঘর পূরণ করুন', 'error')
      return
    }
    if (!user || !org) return

    setSaving(true)
    try {
      await createBloodRequest({
        patientName: form.patientName,
        bloodGroup: form.bloodGroup as BloodGroup,
        hospital: form.hospital,
        area: form.area,
        contactPhone: form.contactPhone,
        requestedBy: user.uid,
        urgency: form.urgency,
        bags: form.bags,
        orgId: org.id,
        note: form.note || null,
      })
      showToast('রক্তের অনুরোধ তৈরি হয়েছে এবং ডোনারদের notification পাঠানো হয়েছে', 'success')
      setForm(defaultForm)
      setShowModal(false)
      await load()
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!confirmCancel) return
    setCancelling(confirmCancel.id)
    try {
      await cancelRequest(confirmCancel.id)
      setConfirmCancel(null)
      await load()
      showToast('অনুরোধ বাতিল হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setCancelling(null)
    }
  }

  const openCount = requests.filter(r => r.status === 'open').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">রক্ত অনুরোধ</h1>
          <p className="text-[#555555] text-sm mt-1">
            {org?.name}-এর পক্ষ থেকে রক্তের অনুরোধ তৈরি ও পরিচালনা করুন
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#D92B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#b82424] transition-colors shadow-md shadow-red-200"
        >
          🩸 নতুন অনুরোধ
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'মোট', value: requests.length, color: 'text-[#111111]' },
          { label: 'চলছে', value: openCount, color: 'text-green-600' },
          { label: 'পূর্ণ', value: requests.filter(r => r.status === 'fulfilled').length, color: 'text-blue-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-[#E5E5E5] p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[#555555] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-[#E5E5E5] animate-pulse" />
          ))
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
            <span className="text-4xl block mb-3">🩸</span>
            <p className="font-semibold text-[#111111]">কোনো রক্তের অনুরোধ নেই</p>
            <p className="text-sm text-[#555555] mt-1">প্রথম অনুরোধটি তৈরি করুন</p>
          </div>
        ) : requests.map(r => {
          const status = statusLabel(r.status)
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Blood group badge */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${BLOOD_GROUP_COLORS[r.bloodGroup]}`}>
                    {r.bloodGroup}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#111111]">{r.patientName}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${status.cls}`}>
                        {status.text}
                      </span>
                      {r.urgency === 'urgent' && r.status === 'open' && (
                        <span className="text-[10px] bg-[#D92B2B] text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                          জরুরি
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#555555] mt-0.5 truncate">
                      🏥 {r.hospital}{r.area ? `, ${r.area}` : ''}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs text-[#555555]/70">
                        📅 {formatBanglaDate(r.createdAt.toDate())}
                      </p>
                      {r.bags > 1 && (
                        <p className="text-xs text-[#D92B2B] font-semibold">🩸 {r.bags} ব্যাগ</p>
                      )}
                      {r.respondedBy.length > 0 && (
                        <p className="text-xs text-green-700 font-semibold">👥 {r.respondedBy.length} জন সাড়া</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {r.status === 'open' && (
                  <button
                    onClick={() => setConfirmCancel(r)}
                    disabled={cancelling === r.id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-[#D92B2B] hover:bg-red-100 font-medium transition-colors shrink-0"
                  >
                    বাতিল
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-4">
            <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 className="font-bold text-[#111111]">নতুন রক্তের অনুরোধ</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#555555]">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Urgency */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-2">জরুরি স্তর</label>
                <div className="flex gap-2">
                  {(['normal', 'urgent'] as Urgency[]).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, urgency: u }))}
                      className={`flex-1 py-2.5 rounded-xl font-semibold border-2 text-sm transition-colors ${
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

              {/* Patient name */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">রোগীর নাম *</label>
                <input
                  value={form.patientName}
                  onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
                  placeholder="রোগীর নাম"
                  className="input-field"
                />
              </div>

              {/* Blood group */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-2">রক্তের গ্রুপ *</label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, bloodGroup: g }))}
                      className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
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

              {/* Hospital */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">হাসপাতাল *</label>
                <input
                  value={form.hospital}
                  onChange={e => setForm(f => ({ ...f, hospital: e.target.value }))}
                  placeholder="হাসপাতালের নাম"
                  className="input-field"
                />
              </div>

              {/* Area */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">এলাকা</label>
                <select
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  className="input-field"
                >
                  <option value="">উপজেলা নির্বাচন করুন</option>
                  {KHULNA_UPAZILAS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Contact phone */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">যোগাযোগ নম্বর *</label>
                <input
                  value={form.contactPhone}
                  onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                  placeholder="01X-XXXX-XXXX"
                  type="tel"
                  inputMode="tel"
                  className="input-field"
                />
              </div>

              {/* Bags */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-2">কয় ব্যাগ রক্ত লাগবে?</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, bags: Math.max(1, f.bags - 1) }))}
                    disabled={form.bags <= 1}
                    className="w-10 h-10 rounded-xl border-2 border-[#E5E5E5] flex items-center justify-center text-lg font-bold text-[#555555] hover:border-[#D92B2B] hover:text-[#D92B2B] transition-colors disabled:opacity-40"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-[#D92B2B]">{form.bags}</span>
                    <span className="text-sm text-[#555555] ml-1">ব্যাগ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, bags: Math.min(10, f.bags + 1) }))}
                    disabled={form.bags >= 10}
                    className="w-10 h-10 rounded-xl border-2 border-[#E5E5E5] flex items-center justify-center text-lg font-bold text-[#555555] hover:border-[#1A9E6B] hover:text-[#1A9E6B] transition-colors disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">অতিরিক্ত তথ্য</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="কোনো অতিরিক্ত তথ্য থাকলে লিখুন..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              <div className="bg-red-50 rounded-xl p-3 text-xs text-[#D92B2B]">
                🩸 অনুরোধ তৈরি হলে compatible blood group-এর সব ডোনারদের push notification যাবে
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E5E5E5] flex gap-3">
              <button
                onClick={() => { setShowModal(false); setForm(defaultForm) }}
                className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium"
              >
                বাতিল
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold hover:bg-[#b82424] transition-colors disabled:opacity-60"
              >
                {saving ? 'পাঠানো হচ্ছে...' : '🩸 অনুরোধ পাঠান'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirm */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <span className="text-4xl block mb-3">❌</span>
            <h3 className="font-bold text-[#111111] text-lg mb-2">অনুরোধ বাতিল করবেন?</h3>
            <p className="text-[#555555] text-sm mb-1">{confirmCancel.patientName}</p>
            <p className="text-[#555555] text-sm mb-5">{confirmCancel.bloodGroup} — {confirmCancel.hospital}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm"
              >
                না, রাখুন
              </button>
              <button
                onClick={handleCancel}
                disabled={!!cancelling}
                className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold disabled:opacity-60"
              >
                {cancelling ? 'বাতিল হচ্ছে...' : 'হ্যাঁ, বাতিল করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
