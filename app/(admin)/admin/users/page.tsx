'use client'

import { useEffect, useState } from 'react'
import { getAllUsers } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import { KHULNA_UPAZILAS } from '@/lib/constants'
import { BLOOD_GROUPS } from '@/lib/bloodCompatibility'
import type { User, UserRole, BloodGroup, Gender } from '@/types'
// BloodGroup and Gender used in addForm state typing only

const roles: { value: UserRole; label: string; icon: string; badge: string }[] = [
  { value: 'donor', label: 'ডোনার', icon: '🩸', badge: 'bg-gray-100 text-[#555555]' },
  { value: 'admin', label: 'অ্যাডমিন', icon: '🛡️', badge: 'bg-blue-50 text-blue-700' },
  { value: 'superadmin', label: 'সুপার অ্যাডমিন', icon: '👑', badge: 'bg-yellow-50 text-yellow-700' },
]

export default function AdminUsersPage() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [roleModal, setRoleModal] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [addModal, setAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '', phone: '', bloodGroup: '' as BloodGroup | '',
    upazila: '', area: '', gender: '' as Gender | '', age: '',
  })

  const load = async () => {
    const u = await getAllUsers()
    setUsers(u)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search) ||
    u.bloodGroup.includes(search)
  )

  const adminUpdate = async (uid: string, data: object) => {
    const res = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, data }),
    })
    if (!res.ok) throw new Error('Update failed')
  }

  const handleRoleChange = async (user: User, role: UserRole) => {
    if (user.role === role) { setRoleModal(null); return }
    setActionLoading(user.uid + '_role')
    try {
      await adminUpdate(user.uid, { role })
      setRoleModal(null)
      await load()
      showToast(`${user.name}-এর role পরিবর্তন হয়েছে ✓`, 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleVerify = async (user: User) => {
    setActionLoading(user.uid + '_verify')
    try {
      await adminUpdate(user.uid, { isVerified: !user.isVerified })
      await load()
      showToast(user.isVerified ? 'যাচাই বাতিল করা হয়েছে' : '✓ যাচাই করা হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setActionLoading(confirmDelete.uid + '_delete')
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: confirmDelete.uid }),
      })
      if (!res.ok) throw new Error('Delete failed')
      setConfirmDelete(null)
      await load()
      showToast('User মুছে ফেলা হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAvailabilityToggle = async (user: User) => {
    setActionLoading(user.uid + '_avail')
    try {
      await adminUpdate(user.uid, { isAvailable: !user.isAvailable })
      await load()
      showToast(user.isAvailable ? 'Unavailable করা হয়েছে' : '✓ Available করা হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const getRoleBadge = (role: UserRole) => roles.find(r => r.value === role)?.badge ?? 'bg-gray-100 text-[#555555]'
  const getRoleLabel = (role: UserRole) => roles.find(r => r.value === role)?.label ?? role
  const getRoleIcon = (role: UserRole) => roles.find(r => r.value === role)?.icon ?? '🩸'

  const setAdd = (k: keyof typeof addForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddForm(f => ({ ...f, [k]: e.target.value }))

  const handleAddDonor = async () => {
    const phone = addForm.phone.replace(/\D/g, '')
    if (!addForm.name || !phone || !addForm.bloodGroup || !addForm.upazila || !addForm.gender) {
      showToast('নাম, ফোন, রক্তের গ্রুপ, উপজেলা ও লিঙ্গ আবশ্যক', 'error'); return
    }
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      showToast('সঠিক বাংলাদেশি নম্বর দিন (01XXXXXXXXX)', 'error'); return
    }
    setAddLoading(true)
    try {
      const res = await fetch('/api/admin/add-donor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          phone,
          bloodGroup: addForm.bloodGroup,
          upazila: addForm.upazila,
          area: addForm.area,
          gender: addForm.gender,
          age: addForm.age ? parseInt(addForm.age) : undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        if (result.error === 'phone-exists') showToast('এই নম্বরে ইতিমধ্যে একজন ডোনার আছেন', 'error')
        else showToast('কিছু একটা সমস্যা হয়েছে', 'error')
        return
      }
      showToast(`${addForm.name} সফলভাবে যোগ করা হয়েছে ✓`, 'success')
      setAddModal(false)
      setAddForm({ name: '', phone: '', bloodGroup: '', upazila: '', area: '', gender: '', age: '' })
      await load()
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">ব্যবহারকারী</h1>
          <p className="text-[#555555] text-sm mt-1">মোট {users.length} জন সদস্য</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="নাম, ফোন বা রক্তের গ্রুপ..."
            className="border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm w-56 focus:outline-none focus:border-[#D92B2B] bg-white"
          />
          <button
            onClick={() => setAddModal(true)}
            className="bg-[#D92B2B] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#b82424] transition-colors whitespace-nowrap"
          >
            + ডোনার যোগ করুন
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[#555555]">কোনো ব্যবহারকারী পাওয়া যায়নি</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8F8F8] border-b border-[#E5E5E5]">
                <tr>
                  {['ব্যবহারকারী', 'ফোন', 'রক্তের গ্রুপ', 'উপজেলা', 'Role', 'অ্যাকশন'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-[#555555] px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {filtered.map((u) => (
                  <tr key={u.uid} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <DefaultAvatar gender={u.gender} size={36} />
                        <div>
                          <p className="text-sm font-semibold text-[#111111] flex items-center gap-1.5">
                            {u.name}
                            {u.isVerified && <span className="text-blue-500 text-xs">✓</span>}
                            {u.manuallyAdded && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">ম্যানুয়াল</span>}
                          </p>
                          <p className="text-xs text-[#555555]">{u.isAvailable ? '● Available' : '○ Unavailable'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#555555] whitespace-nowrap">{u.phone}</td>
                    <td className="px-5 py-3">
                      <span className="bg-red-100 text-[#D92B2B] text-xs font-bold px-2 py-0.5 rounded-full">{u.bloodGroup}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#555555]">{u.upazila}</td>

                    {/* Role — clickable badge */}
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setRoleModal(u)}
                        disabled={!!actionLoading}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80 flex items-center gap-1.5 ${getRoleBadge(u.role)}`}
                      >
                        <span>{getRoleIcon(u.role)}</span>
                        {getRoleLabel(u.role)}
                        <span className="opacity-50 text-[10px]">▾</span>
                      </button>
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Availability toggle */}
                        <button
                          onClick={() => handleAvailabilityToggle(u)}
                          disabled={!!actionLoading}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                            u.isAvailable
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-gray-100 text-[#555555] hover:bg-gray-200'
                          }`}
                        >
                          {actionLoading === u.uid + '_avail' ? '...' : u.isAvailable ? '● Available' : '○ Unavailable'}
                        </button>
                        <button
                          onClick={() => handleVerify(u)}
                          disabled={!!actionLoading}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                            u.isVerified
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'bg-gray-100 text-[#555555] hover:bg-gray-200'
                          }`}
                        >
                          {actionLoading === u.uid + '_verify' ? '...' : u.isVerified ? '✓ যাচাই' : 'যাচাই করুন'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(u)}
                          disabled={!!actionLoading}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-[#D92B2B] hover:bg-red-100 font-medium transition-colors"
                        >
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

      {/* Role change modal */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <DefaultAvatar gender={roleModal.gender} size={40} />
                <div>
                  <h3 className="font-bold text-[#111111]">{roleModal.name}</h3>
                  <p className="text-xs text-[#555555]">Role পরিবর্তন করুন</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {roles.map(({ value, label, icon, badge }) => (
                <button
                  key={value}
                  onClick={() => handleRoleChange(roleModal, value)}
                  disabled={!!actionLoading}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border-2 ${
                    roleModal.role === value
                      ? 'border-[#D92B2B] bg-red-50'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${badge} flex items-center gap-1.5`}>
                    <span>{icon}</span> {label}
                  </span>
                  {roleModal.role === value && (
                    <span className="ml-auto text-[#D92B2B] text-sm font-bold">✓ বর্তমান</span>
                  )}
                  {actionLoading === roleModal.uid + '_role' && roleModal.role !== value && (
                    <span className="ml-auto text-xs text-[#555555]">...</span>
                  )}
                </button>
              ))}
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setRoleModal(null)}
                className="w-full py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium hover:bg-gray-50"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Donor Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#111111] text-lg">ডোনার যোগ করুন</h3>
                <p className="text-xs text-[#555555] mt-0.5">পরে একই নম্বরে register করলে data merge হবে</p>
              </div>
              <button onClick={() => setAddModal(false)} className="text-[#555555] hover:text-[#111111] text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">পূর্ণ নাম *</label>
                <input value={addForm.name} onChange={setAdd('name')} placeholder="রক্তদাতার নাম" className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#D92B2B]" />
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">মোবাইল নম্বর *</label>
                <input value={addForm.phone} onChange={setAdd('phone')} placeholder="01XXXXXXXXX" inputMode="tel" maxLength={11} className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#D92B2B]" />
              </div>
              {/* Blood Group */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-2">রক্তের গ্রুপ *</label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map(g => (
                    <button key={g} onClick={() => setAddForm(f => ({ ...f, bloodGroup: g }))}
                      className={`py-2.5 rounded-xl font-bold text-sm transition-all ${addForm.bloodGroup === g ? 'bg-[#D92B2B] text-white scale-105 shadow-md' : 'bg-gray-100 text-[#555555] hover:bg-gray-200'}`}
                    >{g}</button>
                  ))}
                </div>
              </div>
              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">লিঙ্গ *</label>
                <select value={addForm.gender} onChange={setAdd('gender')} className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#D92B2B]">
                  <option value="">নির্বাচন করুন</option>
                  <option value="male">পুরুষ</option>
                  <option value="female">মহিলা</option>
                  <option value="other">অন্যান্য</option>
                </select>
              </div>
              {/* Upazila */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">উপজেলা *</label>
                <select value={addForm.upazila} onChange={setAdd('upazila')} className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#D92B2B]">
                  <option value="">উপজেলা নির্বাচন করুন</option>
                  {KHULNA_UPAZILAS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {/* Area */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">এলাকা</label>
                <input value={addForm.area} onChange={setAdd('area')} placeholder="মহল্লা / পাড়া (ঐচ্ছিক)" className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#D92B2B]" />
              </div>
              {/* Age optional */}
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">বয়স <span className="text-[#555555] font-normal">(ঐচ্ছিক)</span></label>
                <input value={addForm.age} onChange={setAdd('age')} type="number" min={18} max={60} placeholder="বয়স না জানলে ফাঁকা রাখুন" inputMode="numeric" className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#D92B2B]" />
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
                ⚠️ এই ডোনার পরে একই নম্বর দিয়ে register করলে তার সব data স্বয়ংক্রিয়ভাবে নতুন account এ চলে আসবে।
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setAddModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium hover:bg-gray-50">
                বাতিল
              </button>
              <button onClick={handleAddDonor} disabled={addLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold hover:bg-[#b82424] transition-colors disabled:opacity-60"
              >
                {addLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    যোগ হচ্ছে...
                  </span>
                ) : 'যোগ করুন ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <span className="text-4xl block mb-3">⚠️</span>
              <h3 className="font-bold text-[#111111] text-lg">User মুছে ফেলবেন?</h3>
              <p className="text-[#555555] text-sm mt-2">
                <span className="font-semibold">{confirmDelete.name}</span>-এর Firestore data মুছে যাবে।
                Firebase Auth থেকে আলাদা করে delete করতে হবে।
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium hover:bg-gray-50">
                বাতিল
              </button>
              <button
                onClick={handleDelete}
                disabled={!!actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold hover:bg-[#b82424] transition-colors"
              >
                {actionLoading ? '...' : 'হ্যাঁ, মুছুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
