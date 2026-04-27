'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getOrgByAdmin, getOrgMembers, removeMember } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import type { Organization, User } from '@/types'

export default function OrgMembersPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<User | null>(null)

  const load = async () => {
    if (!user) return
    const o = await getOrgByAdmin(user.uid)
    if (!o) return
    setOrg(o)
    const m = await getOrgMembers(o.memberIds)
    // Sort by totalDonations desc (leaderboard)
    m.sort((a, b) => b.totalDonations - a.totalDonations)
    setMembers(m)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    m.bloodGroup.includes(search)
  )

  const handleRemove = async () => {
    if (!confirmRemove || !org) return
    setRemoving(confirmRemove.uid)
    try {
      await removeMember(org.id, confirmRemove.uid)
      setConfirmRemove(null)
      await load()
      showToast(`${confirmRemove.name}-কে সরিয়ে দেওয়া হয়েছে`, 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">সদস্য</h1>
          <p className="text-[#555555] text-sm mt-1">মোট {members.length} জন · দানের সংখ্যা অনুযায়ী সাজানো</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="নাম, ফোন বা রক্তের গ্রুপ..."
          className="border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm w-56 focus:outline-none focus:border-[#1A9E6B] bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[#555555]">কোনো সদস্য পাওয়া যায়নি</div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {filtered.map((m, idx) => (
              <div key={m.uid} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFA] transition-colors">
                {/* Rank */}
                <div className={`w-8 text-center font-bold text-sm shrink-0 ${
                  idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-[#555555]'
                }`}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </div>

                <DefaultAvatar gender={m.gender} size={40} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#111111] text-sm">{m.name}</p>
                    {m.isVerified && <span className="text-blue-500 text-xs">✓</span>}
                    <span className="bg-red-100 text-[#D92B2B] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{m.bloodGroup}</span>
                  </div>
                  <p className="text-xs text-[#555555]">{m.phone} · {m.upazila}</p>
                </div>

                <div className="text-center shrink-0">
                  <p className="font-bold text-[#D92B2B] text-lg">{m.totalDonations}</p>
                  <p className="text-[10px] text-[#555555]">দান</p>
                </div>

                <div className="shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    m.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#555555]'
                  }`}>
                    {m.isAvailable ? '● Available' : '○ Unavailable'}
                  </span>
                </div>

                <button
                  onClick={() => setConfirmRemove(m)}
                  disabled={removing === m.uid}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-[#D92B2B] hover:bg-red-100 font-medium transition-colors shrink-0"
                >
                  সরান
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm remove modal */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <span className="text-4xl block mb-3">⚠️</span>
            <h3 className="font-bold text-[#111111] text-lg mb-2">সদস্য সরিয়ে দেবেন?</h3>
            <p className="text-[#555555] text-sm mb-5">
              <span className="font-semibold">{confirmRemove.name}</span>-কে সংগঠন থেকে সরিয়ে দেওয়া হবে।
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium">বাতিল</button>
              <button onClick={handleRemove} className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold">সরান</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
