'use client'

import { useEffect, useState } from 'react'
import { getOrganizations, createOrganization, updateOrganization, getAllUsers } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { KHULNA_UPAZILAS } from '@/lib/constants'
import type { Organization, OrgType, User } from '@/types'

const emptyForm = { name: '', type: 'community' as OrgType, area: '', isVerified: false, adminIds: [] as string[], logo: null as null }

const orgTypes: { value: OrgType; label: string; icon: string }[] = [
  { value: 'community', label: 'কমিউনিটি', icon: '🏘️' },
  { value: 'college', label: 'কলেজ', icon: '🏫' },
  { value: 'university', label: 'বিশ্ববিদ্যালয়', icon: '🎓' },
  { value: 'ngo', label: 'NGO', icon: '🤝' },
  { value: 'hospital', label: 'হাসপাতাল', icon: '🏥' },
]

export default function AdminOrgsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Organization | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Organization | null>(null)
  const [adminModal, setAdminModal] = useState<Organization | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [adminSaving, setAdminSaving] = useState(false)

  const load = async () => {
    const [o, u] = await Promise.all([getOrganizations(), getAllUsers()])
    setOrgs(o)
    setAllUsers(u)
    setLoading(false)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (org: Organization) => {
    setEditing(org)
    setForm({ name: org.name, type: org.type, area: org.area, isVerified: org.isVerified, adminIds: org.adminIds, logo: null })
    setShowModal(true)
  }

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name || !form.area) { showToast('সব তথ্য পূরণ করুন', 'error'); return }
    if (!user) return
    setSaving(true)
    try {
      if (editing) {
        await updateOrganization(editing.id, { name: form.name, type: form.type, area: form.area, isVerified: form.isVerified })
        showToast('সংগঠন আপডেট হয়েছে', 'success')
      } else {
        await createOrganization({ name: form.name, type: form.type, area: form.area, isVerified: form.isVerified, adminIds: [user.uid], logo: null })
        showToast('নতুন সংগঠন তৈরি হয়েছে', 'success')
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
      const res = await fetch('/api/admin/delete-org', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: confirmDelete.id }),
      })
      if (!res.ok) throw new Error('failed')
      setConfirmDelete(null)
      await load()
      showToast('সংগঠন মুছে ফেলা হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    }
  }

  const handleAddAdmin = async (org: Organization, uid: string) => {
    if (org.adminIds.includes(uid)) return
    setAdminSaving(true)
    try {
      const newAdminIds = [...org.adminIds, uid]
      await updateOrganization(org.id, { adminIds: newAdminIds })
      await load()
      setAdminModal(prev => prev ? { ...prev, adminIds: newAdminIds } : null)
      showToast('অ্যাডমিন যোগ করা হয়েছে ✓', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setAdminSaving(false)
    }
  }

  const handleRemoveAdmin = async (org: Organization, uid: string) => {
    setAdminSaving(true)
    try {
      const newAdminIds = org.adminIds.filter(id => id !== uid)
      await updateOrganization(org.id, { adminIds: newAdminIds })
      await load()
      setAdminModal(prev => prev ? { ...prev, adminIds: newAdminIds } : null)
      showToast('অ্যাডমিন সরানো হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setAdminSaving(false)
    }
  }

  const getOrgIcon = (type: OrgType) => orgTypes.find(t => t.value === type)?.icon ?? '🏘️'
  const getOrgLabel = (type: OrgType) => orgTypes.find(t => t.value === type)?.label ?? type

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">সংগঠন</h1>
          <p className="text-[#555555] text-sm mt-1">মোট {orgs.length}টি সংগঠন</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#D92B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#b82424] transition-colors shadow-md shadow-red-200">
          + নতুন সংগঠন
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-white rounded-2xl border border-[#E5E5E5] animate-pulse" />)}
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
          <span className="text-4xl block mb-3">🏫</span>
          <p className="text-[#555555]">কোনো সংগঠন নেই — নতুন তৈরি করুন</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <div key={org.id} className="bg-white rounded-2xl border border-[#E5E5E5] p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#FDECEA] rounded-xl flex items-center justify-center text-2xl">
                    {getOrgIcon(org.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-[#111111] text-sm">{org.name}</p>
                      {org.isVerified && <span className="text-blue-500 text-xs">✓</span>}
                    </div>
                    <p className="text-xs text-[#555555]">{getOrgLabel(org.type)} · {org.area}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4 text-center">
                <div className="flex-1 bg-[#FAFAFA] rounded-xl py-2">
                  <p className="font-bold text-[#D92B2B] text-lg">{new Set([...org.memberIds, ...org.adminIds]).size}</p>
                  <p className="text-xs text-[#555555]">সদস্য</p>
                </div>
                <div className="flex-1 bg-[#FAFAFA] rounded-xl py-2">
                  <p className="font-bold text-[#1A9E6B] text-lg">{org.totalDonations}</p>
                  <p className="text-xs text-[#555555]">দান</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setAdminModal(org); setUserSearch('') }} className="flex-1 text-xs py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors">
                  👤 অ্যাডমিন
                </button>
                <button onClick={() => openEdit(org)} className="flex-1 text-xs py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">
                  সম্পাদনা
                </button>
                <button onClick={() => setConfirmDelete(org)} className="flex-1 text-xs py-2 rounded-lg bg-red-50 text-[#D92B2B] hover:bg-red-100 font-medium transition-colors">
                  মুছুন
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 className="font-bold text-[#111111]">{editing ? 'সংগঠন সম্পাদনা' : 'নতুন সংগঠন'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#555555]">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">সংগঠনের নাম *</label>
                <input value={form.name} onChange={set('name')} placeholder="যেমন: BU রক্তদান সংসদ" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-2">ধরন *</label>
                <div className="grid grid-cols-5 gap-2">
                  {orgTypes.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setForm(f => ({ ...f, type: value }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs border-2 transition-all ${
                        form.type === value ? 'border-[#D92B2B] bg-red-50 text-[#D92B2B]' : 'border-[#E5E5E5] text-[#555555] hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">উপজেলা / এলাকা *</label>
                <select value={form.area} onChange={set('area')} className="input-field">
                  <option value="">নির্বাচন করুন</option>
                  {KHULNA_UPAZILAS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isVerified}
                  onChange={e => setForm(f => ({ ...f, isVerified: e.target.checked }))}
                  className="w-4 h-4 accent-[#D92B2B]"
                />
                <span className="text-sm text-[#111111]">যাচাইকৃত সংগঠন হিসেবে চিহ্নিত করুন</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-[#E5E5E5] flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium hover:bg-gray-50">বাতিল</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold hover:bg-[#b82424] transition-colors">
                {saving ? 'সংরক্ষণ হচ্ছে...' : editing ? 'আপডেট করুন' : 'তৈরি করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin management modal */}
      {adminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
            <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-[#111111]">অ্যাডমিন পরিচালনা</h3>
                <p className="text-xs text-[#555555] mt-0.5">{adminModal.name}</p>
              </div>
              <button onClick={() => setAdminModal(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#555555]">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              {/* Current admins */}
              <div>
                <p className="text-xs font-semibold text-[#555555] uppercase tracking-wide mb-2">বর্তমান অ্যাডমিনরা ({adminModal.adminIds.length})</p>
                {adminModal.adminIds.length === 0 ? (
                  <p className="text-sm text-[#555555]">কোনো অ্যাডমিন নেই</p>
                ) : (
                  <div className="space-y-2">
                    {adminModal.adminIds.map(uid => {
                      const u = allUsers.find(x => x.uid === uid)
                      return (
                        <div key={uid} className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-2.5">
                          <div>
                            <p className="text-sm font-semibold text-[#111111]">{u?.name ?? uid}</p>
                            <p className="text-xs text-[#555555]">{u?.phone} · {u?.bloodGroup}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveAdmin(adminModal, uid)}
                            disabled={adminSaving}
                            className="text-xs text-[#D92B2B] font-medium hover:underline"
                          >
                            সরাও
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Add new admin */}
              <div>
                <p className="text-xs font-semibold text-[#555555] uppercase tracking-wide mb-2">নতুন অ্যাডমিন যোগ করুন</p>
                <input
                  type="text"
                  placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#D92B2B] mb-2"
                />
                {userSearch.length > 1 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {allUsers
                      .filter(u =>
                        !adminModal.adminIds.includes(u.uid) &&
                        (u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.phone.includes(userSearch))
                      )
                      .slice(0, 8)
                      .map(u => (
                        <button
                          key={u.uid}
                          onClick={() => handleAddAdmin(adminModal, u.uid)}
                          disabled={adminSaving}
                          className="w-full flex items-center justify-between bg-gray-50 hover:bg-green-50 rounded-xl px-4 py-2.5 transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[#111111]">{u.name}</p>
                            <p className="text-xs text-[#555555]">{u.phone} · {u.bloodGroup}</p>
                          </div>
                          <span className="text-green-600 text-xs font-semibold">+ যোগ করুন</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E5E5E5] shrink-0">
              <button onClick={() => setAdminModal(null)} className="w-full py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium hover:bg-gray-50">
                বন্ধ করুন
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
            <h3 className="font-bold text-[#111111] text-lg mb-2">সংগঠন মুছে ফেলবেন?</h3>
            <p className="text-[#555555] text-sm mb-5">&ldquo;{confirmDelete.name}&rdquo; মুছে গেলে আর ফিরে পাওয়া যাবে না।</p>
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
