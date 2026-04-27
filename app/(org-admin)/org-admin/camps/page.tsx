'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getOrgByAdmin, getCampsByOrg, createCamp, updateCamp, deleteCamp, getOrgMembers, recordCampDonation } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import { KHULNA_UPAZILAS, formatBanglaDate } from '@/lib/constants'
import { Timestamp } from 'firebase/firestore'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import type { Organization, Camp, User, CampStatus } from '@/types'

const emptyForm = { title: '', date: '', venue: '', area: '', status: 'upcoming' as CampStatus }

export default function OrgCampsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [org, setOrg] = useState<Organization | null>(null)
  const [camps, setCamps] = useState<Camp[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Camp | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Camp | null>(null)
  // Check-in panel
  const [checkInCamp, setCheckInCamp] = useState<Camp | null>(null)
  const [campMembers, setCampMembers] = useState<User[]>([])
  const [donating, setDonating] = useState<string | null>(null)

  const load = async () => {
    if (!user) return
    const o = await getOrgByAdmin(user.uid)
    if (!o) return
    setOrg(o)
    const c = await getCampsByOrg(o.id)
    setCamps(c)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (camp: Camp) => {
    setEditing(camp)
    setForm({ title: camp.title, date: camp.date.toDate().toISOString().slice(0, 16), venue: camp.venue, area: camp.area, status: camp.status })
    setShowModal(true)
  }

  const openCheckIn = async (camp: Camp) => {
    if (!org) return
    setCheckInCamp(camp)
    const members = await getOrgMembers(org.memberIds)
    setCampMembers(members)
  }

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.title || !form.date || !form.venue || !form.area) { showToast('সব তথ্য পূরণ করুন', 'error'); return }
    if (!user || !org) return
    setSaving(true)
    try {
      const campDate = Timestamp.fromDate(new Date(form.date))
      if (editing) {
        await updateCamp(editing.id, { ...form, date: campDate })
        showToast('ক্যাম্প আপডেট হয়েছে', 'success')
      } else {
        await createCamp({ ...form, date: campDate, organizationId: org.id, createdBy: user.uid })
        showToast('নতুন ক্যাম্প তৈরি হয়েছে', 'success')
      }
      setShowModal(false)
      await load()
    } catch { showToast('কিছু একটা সমস্যা হয়েছে', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteCamp(confirmDelete.id)
      setConfirmDelete(null)
      await load()
      showToast('ক্যাম্প মুছে ফেলা হয়েছে', 'success')
    } catch { showToast('কিছু একটা সমস্যা হয়েছে', 'error') }
  }

  const handleRecordDonation = async (donorId: string) => {
    if (!checkInCamp || !org) return
    setDonating(donorId)
    try {
      await recordCampDonation(checkInCamp.id, donorId, org.id)
      // Refresh camp
      const updated = camps.map(c => c.id === checkInCamp.id
        ? { ...c, donatedUids: [...((c as Camp & { donatedUids?: string[] }).donatedUids ?? []), donorId], totalCollected: c.totalCollected + 1 }
        : c)
      setCamps(updated)
      setCheckInCamp(prev => prev ? { ...prev, totalCollected: prev.totalCollected + 1 } : prev)
      showToast('দান রেকর্ড হয়েছে ✓', 'success')
    } catch { showToast('কিছু একটা সমস্যা হয়েছে', 'error') }
    finally { setDonating(null) }
  }

  const statusBadge = (s: CampStatus) =>
    ({ upcoming: 'bg-blue-50 text-blue-700', ongoing: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-[#555555]' })[s]
  const statusLabel = (s: CampStatus) =>
    ({ upcoming: 'আসন্ন', ongoing: 'চলমান', completed: 'সম্পন্ন' })[s]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">ক্যাম্প ব্যবস্থাপনা</h1>
          <p className="text-[#555555] text-sm mt-1">মোট {camps.length}টি ক্যাম্প</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#1A9E6B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#158a5c] transition-colors shadow-md shadow-green-200">
          + নতুন ক্যাম্প
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-[#E5E5E5] animate-pulse" />)
        ) : camps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
            <span className="text-4xl block mb-3">🏕️</span>
            <p className="text-[#555555]">কোনো ক্যাম্প নেই</p>
          </div>
        ) : camps.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-[#111111]">{c.title}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>{statusLabel(c.status)}</span>
                </div>
                <p className="text-sm text-[#555555]">📅 {formatBanglaDate(c.date.toDate())} · 📍 {c.venue}, {c.area}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-[#555555]">👥 {c.registeredDonors.length} নিবন্ধিত</span>
                  <span className="text-xs font-semibold text-[#D92B2B]">🩸 {c.totalCollected} ব্যাগ</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {(c.status === 'upcoming' || c.status === 'ongoing') && (
                  <button onClick={() => openCheckIn(c)} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors">
                    📋 চেক-ইন
                  </button>
                )}
                <button onClick={() => openEdit(c)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">সম্পাদনা</button>
                <button onClick={() => setConfirmDelete(c)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-[#D92B2B] hover:bg-red-100 font-medium transition-colors">মুছুন</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 className="font-bold text-[#111111]">{editing ? 'ক্যাম্প সম্পাদনা' : 'নতুন ক্যাম্প'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#555555]">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'ক্যাম্পের নাম *', key: 'title', type: 'text', placeholder: 'যেমন: বার্ষিক রক্তদান ক্যাম্প ২০২৬' },
                { label: 'তারিখ ও সময় *', key: 'date', type: 'datetime-local', placeholder: '' },
                { label: 'স্থান *', key: 'venue', type: 'text', placeholder: 'যেমন: অডিটোরিয়াম' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-[#111111] mb-1.5">{label}</label>
                  <input type={type} value={form[key as keyof typeof form] as string} onChange={set(key as keyof typeof emptyForm)} placeholder={placeholder} className="input-field" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">উপজেলা *</label>
                <select value={form.area} onChange={set('area')} className="input-field">
                  <option value="">নির্বাচন করুন</option>
                  {KHULNA_UPAZILAS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1.5">অবস্থা</label>
                  <select value={form.status} onChange={set('status')} className="input-field">
                    <option value="upcoming">আসন্ন</option>
                    <option value="ongoing">চলমান</option>
                    <option value="completed">সম্পন্ন</option>
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#E5E5E5] flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium">বাতিল</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#1A9E6B] text-white text-sm font-semibold hover:bg-[#158a5c] transition-colors">
                {saving ? 'সংরক্ষণ হচ্ছে...' : editing ? 'আপডেট করুন' : 'তৈরি করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in / Donation recording panel */}
      {checkInCamp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
            <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#111111]">📋 {checkInCamp.title}</h3>
                <p className="text-xs text-[#555555] mt-0.5">🩸 {checkInCamp.totalCollected} ব্যাগ সংগ্রহ হয়েছে</p>
              </div>
              <button onClick={() => setCheckInCamp(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#555555]">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#F0F0F0]">
              {campMembers.length === 0 ? (
                <p className="p-8 text-center text-[#555555] text-sm">কোনো সদস্য নেই</p>
              ) : campMembers.map(m => {
                const donated = (checkInCamp as Camp & { donatedUids?: string[] }).donatedUids?.includes(m.uid)
                const registered = checkInCamp.registeredDonors.includes(m.uid)
                return (
                  <div key={m.uid} className="flex items-center gap-3 px-5 py-3">
                    <DefaultAvatar gender={m.gender} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111111] flex items-center gap-1.5">
                        {m.name}
                        <span className="bg-red-100 text-[#D92B2B] text-[10px] font-bold px-1.5 rounded-full">{m.bloodGroup}</span>
                        {registered && <span className="text-blue-500 text-xs">✓ নিবন্ধিত</span>}
                      </p>
                      <p className="text-xs text-[#555555]">{m.phone}</p>
                    </div>
                    {donated ? (
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium">✓ দান হয়েছে</span>
                    ) : (
                      <button
                        onClick={() => handleRecordDonation(m.uid)}
                        disabled={donating === m.uid || !m.isAvailable}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          m.isAvailable
                            ? 'bg-[#D92B2B] text-white hover:bg-[#b82424]'
                            : 'bg-gray-100 text-[#555555] cursor-not-allowed'
                        }`}
                      >
                        {donating === m.uid ? '...' : m.isAvailable ? '🩸 দান রেকর্ড' : 'Unavailable'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <span className="text-4xl block mb-3">🗑️</span>
            <h3 className="font-bold text-[#111111] text-lg mb-2">ক্যাম্প মুছে ফেলবেন?</h3>
            <p className="text-[#555555] text-sm mb-5">&ldquo;{confirmDelete.title}&rdquo; মুছে গেলে ফিরে পাওয়া যাবে না।</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm">বাতিল</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold">মুছুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
