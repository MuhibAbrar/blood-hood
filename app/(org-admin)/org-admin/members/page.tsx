'use client'

import { useEffect, useState } from 'react'
import { useOrgAdmin } from '@/context/OrgAdminContext'
import { getOrgMembers, removeMember, getAllUsers, joinOrganization, getJoinRequests, acceptJoinRequest, rejectJoinRequest } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import type { Organization, User, JoinRequest } from '@/types'

export default function OrgMembersPage() {
  const { org: orgAdmin } = useOrgAdmin()
  const { showToast } = useToast()
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<User | null>(null)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const [processingReq, setProcessingReq] = useState<string | null>(null)

  const load = async (o: Organization) => {
    const [allU, m, jr] = await Promise.all([
      getAllUsers(),
      getOrgMembers(Array.from(new Set([...o.memberIds, ...o.adminIds]))),
      getJoinRequests(o.id),
    ])
    setAllUsers(allU)
    m.sort((a, b) => b.totalDonations - a.totalDonations)
    setMembers(m)
    setJoinRequests(jr)
    setLoading(false)
  }

  useEffect(() => {
    if (!orgAdmin) return
    setOrg(orgAdmin)
    load(orgAdmin)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgAdmin])

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    m.bloodGroup.includes(search)
  )

  const addableUsers = allUsers.filter(u =>
    !org?.memberIds.includes(u.uid) &&
    !org?.adminIds.includes(u.uid) &&
    (u.name.toLowerCase().includes(addSearch.toLowerCase()) || u.phone.includes(addSearch))
  ).slice(0, 10)

  const handleAdd = async (u: User) => {
    if (!org) return
    setAdding(u.uid)
    try {
      await joinOrganization(org.id, u.uid)
      await load(org)
      showToast(`${u.name}-কে যোগ করা হয়েছে ✓`, 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setAdding(null)
    }
  }

  const handleAccept = async (req: JoinRequest) => {
    if (!org) return
    setProcessingReq(req.id)
    try {
      await acceptJoinRequest(req)
      await load(org)
      showToast(`${req.userName}-কে সদস্য করা হয়েছে ✓`, 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setProcessingReq(null)
    }
  }

  const handleReject = async (req: JoinRequest) => {
    if (!org) return
    setProcessingReq(req.id)
    try {
      await rejectJoinRequest(req.id)
      await load(org)
      showToast('অনুরোধ বাতিল করা হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setProcessingReq(null)
    }
  }

  const handleRemove = async () => {
    if (!confirmRemove || !org) return
    setRemoving(confirmRemove.uid)
    try {
      await removeMember(org.id, confirmRemove.uid)
      setConfirmRemove(null)
      await load(org)
      showToast(`${confirmRemove.name}-কে সরিয়ে দেওয়া হয়েছে`, 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#111111]">সদস্য</h1>
          <p className="text-[#555555] text-sm mt-0.5">মোট {members.length} জন</p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setAddSearch('') }}
          className="bg-[#1A9E6B] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#158a5c] transition-colors self-start sm:self-auto"
        >
          + সদস্য যোগ করুন
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'members' ? 'bg-[#1A9E6B] text-white' : 'bg-white border border-[#E5E5E5] text-[#555555]'}`}
        >
          সদস্য তালিকা ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors relative ${activeTab === 'requests' ? 'bg-[#1A9E6B] text-white' : 'bg-white border border-[#E5E5E5] text-[#555555]'}`}
        >
          যোগ দেওয়ার অনুরোধ
          {joinRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D92B2B] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {joinRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Search (members tab only) */}
      {activeTab === 'members' && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="নাম, ফোন বা রক্তের গ্রুপ দিয়ে খুঁজুন..."
          className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1A9E6B] bg-white"
        />
      )}

      {/* Join Requests tab */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          {joinRequests.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl block mb-3">📭</span>
              <p className="text-[#555555]">কোনো পেন্ডিং অনুরোধ নেই</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F0F0]">
              {joinRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 px-4 py-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg shrink-0">👤</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#111111] text-sm">{req.userName}</p>
                    <p className="text-xs text-[#555555]">{req.userPhone} · {req.userBloodGroup}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(req)}
                      disabled={processingReq === req.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-[#D92B2B] hover:bg-red-100 font-medium"
                    >
                      বাতিল
                    </button>
                    <button
                      onClick={() => handleAccept(req)}
                      disabled={processingReq === req.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium"
                    >
                      {processingReq === req.id ? '...' : '✓ অনুমোদন'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      {activeTab === 'members' && <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-3">👥</span>
            <p className="text-[#555555]">কোনো সদস্য নেই</p>
            <button onClick={() => { setShowAddModal(true); setAddSearch('') }} className="mt-3 text-sm text-[#1A9E6B] font-medium hover:underline">
              + প্রথম সদস্য যোগ করুন
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {filtered.map((m, idx) => {
              const isAdmin = org?.adminIds.includes(m.uid)
              return (
                <div key={m.uid} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors">
                  {/* Rank */}
                  <div className="w-7 text-center font-bold text-sm shrink-0">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="text-[#555555] text-xs">#{idx + 1}</span>}
                  </div>

                  <DefaultAvatar gender={m.gender} size={38} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-[#111111] text-sm">{m.name}</p>
                      {m.isVerified && <span className="text-blue-500 text-xs">✓</span>}
                      <span className="bg-red-100 text-[#D92B2B] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{m.bloodGroup}</span>
                      {isAdmin && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">অ্যাডমিন</span>}
                    </div>
                    <p className="text-xs text-[#555555] truncate">{m.phone} · {m.upazila}</p>
                  </div>

                  <div className="text-center shrink-0 hidden sm:block">
                    <p className="font-bold text-[#D92B2B]">{m.totalDonations}</p>
                    <p className="text-[10px] text-[#555555]">দান</p>
                  </div>

                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium shrink-0 hidden sm:inline ${
                    m.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#555555]'
                  }`}>
                    {m.isAvailable ? '● আছেন' : '○ নেই'}
                  </span>

                  {!isAdmin && (
                    <button
                      onClick={() => setConfirmRemove(m)}
                      disabled={removing === m.uid}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-[#D92B2B] hover:bg-red-100 font-medium transition-colors shrink-0"
                    >
                      সরান
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>}

      {/* Add member modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111111]">সদস্য যোগ করুন</h3>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#555555]">✕</button>
            </div>
            <div className="px-6 py-4 shrink-0">
              <input
                autoFocus
                type="text"
                placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1A9E6B]"
              />
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-4">
              {addSearch.length < 2 ? (
                <p className="text-center text-sm text-[#555555] py-8">কমপক্ষে ২ অক্ষর লিখুন</p>
              ) : addableUsers.length === 0 ? (
                <p className="text-center text-sm text-[#555555] py-8">কাউকে পাওয়া যায়নি</p>
              ) : (
                <div className="space-y-2">
                  {addableUsers.map(u => (
                    <div key={u.uid} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <DefaultAvatar gender={u.gender} size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111111]">{u.name}</p>
                        <p className="text-xs text-[#555555]">{u.phone} · {u.bloodGroup}</p>
                      </div>
                      <button
                        onClick={() => handleAdd(u)}
                        disabled={adding === u.uid}
                        className="text-xs bg-[#1A9E6B] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#158a5c] transition-colors shrink-0"
                      >
                        {adding === u.uid ? '...' : '+ যোগ'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#E5E5E5] shrink-0">
              <button onClick={() => setShowAddModal(false)} className="w-full py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium hover:bg-gray-50">
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={handleRemove} disabled={!!removing} className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold">সরান</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
