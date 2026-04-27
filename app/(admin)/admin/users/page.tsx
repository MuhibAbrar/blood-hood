'use client'

import { useEffect, useState } from 'react'
import { getAllUsers, updateUser, deleteUserDoc } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import type { User, UserRole } from '@/types'

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

  const handleRoleChange = async (user: User, role: UserRole) => {
    if (user.role === role) { setRoleModal(null); return }
    setActionLoading(user.uid + '_role')
    try {
      await updateUser(user.uid, { role })
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
      await updateUser(user.uid, { isVerified: !user.isVerified })
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
      await deleteUserDoc(confirmDelete.uid)
      setConfirmDelete(null)
      await load()
      showToast('User মুছে ফেলা হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const getRoleBadge = (role: UserRole) => roles.find(r => r.value === role)?.badge ?? 'bg-gray-100 text-[#555555]'
  const getRoleLabel = (role: UserRole) => roles.find(r => r.value === role)?.label ?? role
  const getRoleIcon = (role: UserRole) => roles.find(r => r.value === role)?.icon ?? '🩸'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">ব্যবহারকারী</h1>
          <p className="text-[#555555] text-sm mt-1">মোট {users.length} জন সদস্য</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="নাম, ফোন বা রক্তের গ্রুপ..."
          className="border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:border-[#D92B2B] bg-white"
        />
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
                      <div className="flex items-center gap-2">
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
