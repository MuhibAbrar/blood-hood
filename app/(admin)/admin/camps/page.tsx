'use client'

import { useEffect, useState } from 'react'
import { getCamps, createCamp, updateCamp, deleteCamp, getOrganizations } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { KHULNA_UPAZILAS, formatBanglaDate } from '@/lib/constants'
import { Timestamp } from 'firebase/firestore'
import type { Camp, Organization, CampStatus } from '@/types'

const emptyForm = { title: '', organizationId: '', date: '', venue: '', area: '', status: 'upcoming' as CampStatus }

export default function AdminCampsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [camps, setCamps] = useState<Camp[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Camp | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Camp | null>(null)

  const load = () =>
    Promise.all([getCamps(), getOrganizations()]).then(([c, o]) => {
      setCamps(c); setOrgs(o); setLoading(false)
    })

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (camp: Camp) => {
    setEditing(camp)
    setForm({
      title: camp.title,
      organizationId: camp.organizationId,
      date: camp.date.toDate().toISOString().slice(0, 16),
      venue: camp.venue,
      area: camp.area,
      status: camp.status,
    })
    setShowModal(true)
  }

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.title || !form.date || !form.venue || !form.area) {
      showToast('সব তথ্য পূরণ করুন', 'error'); return
    }
    if (!user) return
    setSaving(true)
    try {
      const campDate = Timestamp.fromDate(new Date(form.date))
      if (editing) {
        await updateCamp(editing.id, { ...form, date: campDate })
        showToast('ক্যাম্প আপডেট হয়েছে', 'success')
      } else {
        await createCamp({ ...form, date: campDate, createdBy: user.uid })
        showToast('নতুন ক্যাম্প তৈরি হয়েছে', 'success')
      }
      setShowModal(false)
      await load()
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteCamp(confirmDelete.id)
      setConfirmDelete(null)
      await load()
      showToast('ক্যাম্প মুছে ফেলা হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    }
  }

  const statusBadge = (s: CampStatus) =>
    ({ upcoming: 'bg-blue-50 text-blue-700', ongoing: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-[#555555]' })[s]
  const statusLabel = (s: CampStatus) =>
    ({ upcoming: 'আসন্ন', ongoing: 'চলমান', completed: 'সম্পন্ন' })[s]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">রক্তদান ক্যাম্প</h1>
          <p className="text-[#555555] text-sm mt-1">মোট {camps.length}টি ক্যাম্প</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#D92B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#b82424] transition-colors shadow-md shadow-red-200">
          + নতুন ক্যাম্প
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : camps.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-3">🏕️</span>
            <p className="text-[#555555]">কোনো ক্যাম্প নেই — নতুন তৈরি করুন</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8F8F8] border-b border-[#E5E5E5]">
                <tr>
                  {['ক্যাম্পের নাম', 'তারিখ', 'স্থান', 'নিবন্ধিত', 'অবস্থা', 'অ্যাকশন'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-[#555555] px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {camps.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-[#111111]">{c.title}</p>
                      <p className="text-xs text-[#555555]">{c.area}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#555555] whitespace-nowrap">{formatBanglaDate(c.date.toDate())}</td>
                    <td className="px-5 py-3 text-sm text-[#555555]">{c.venue}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-[#111111]">{c.registeredDonors.length} জন</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(c.status)}`}>
                        {statusLabel(c.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(c)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">
                          সম্পাদনা
                        </button>
                        <button onClick={() => setConfirmDelete(c)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-[#D92B2B] hover:bg-red-100 font-medium transition-colors">
                          মুছুন
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              <Field label="ক্যাম্পের নাম *">
                <input value={form.title} onChange={set('title')} placeholder="যেমন: BU রক্তদান ক্যাম্প ২০২৬" className="input-field" />
              </Field>
              <Field label="সংগঠন">
                <select value={form.organizationId} onChange={set('organizationId')} className="input-field">
                  <option value="">নির্বাচন করুন (ঐচ্ছিক)</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </Field>
              <Field label="তারিখ ও সময় *">
                <input type="datetime-local" value={form.date} onChange={set('date')} className="input-field" />
              </Field>
              <Field label="স্থান *">
                <input value={form.venue} onChange={set('venue')} placeholder="যেমন: কেডিএ মিলনায়তন" className="input-field" />
              </Field>
              <Field label="উপজেলা *">
                <select value={form.area} onChange={set('area')} className="input-field">
                  <option value="">উপজেলা নির্বাচন করুন</option>
                  {KHULNA_UPAZILAS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              {editing && (
                <Field label="অবস্থা">
                  <select value={form.status} onChange={set('status')} className="input-field">
                    <option value="upcoming">আসন্ন</option>
                    <option value="ongoing">চলমান</option>
                    <option value="completed">সম্পন্ন</option>
                  </select>
                </Field>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#E5E5E5] flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium hover:bg-gray-50">
                বাতিল
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold hover:bg-[#b82424] transition-colors">
                {saving ? 'সংরক্ষণ হচ্ছে...' : editing ? 'আপডেট করুন' : 'তৈরি করুন'}
              </button>
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
            <p className="text-[#555555] text-sm mb-5">"{confirmDelete.title}" মুছে গেলে আর ফিরে পাওয়া যাবে না।</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium">বাতিল</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold">মুছুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#111111] mb-1.5">{label}</label>
      {children}
    </div>
  )
}
