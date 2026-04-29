'use client'

import { useEffect, useState, useRef } from 'react'
import { getBloodRequests, fulfillRequest, cancelRequest, getUsersByUids } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import { formatBanglaDate } from '@/lib/constants'
import type { BloodRequest, RequestStatus, User } from '@/types'

const tabs: { value: RequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'সব' },
  { value: 'open', label: 'চলমান' },
  { value: 'fulfilled', label: 'পূর্ণ হয়েছে' },
  { value: 'cancelled', label: 'বাতিল' },
]

export default function AdminRequestsPage() {
  const { showToast } = useToast()
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [userMap, setUserMap] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<RequestStatus | 'all'>('open')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notifyMenuId, setNotifyMenuId] = useState<string | null>(null)
  const [notifyLoading, setNotifyLoading] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    const r = await getBloodRequests()
    setRequests(r)
    const uids = Array.from(new Set(r.map(req => req.requestedBy).filter(Boolean)))
    if (uids.length) {
      const users = await getUsersByUids(uids)
      const map: Record<string, User> = {}
      users.forEach(u => { map[u.uid] = u })
      setUserMap(map)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setNotifyMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab)

  const handleFulfill = async (r: BloodRequest) => {
    setActionLoading(r.id)
    try {
      await fulfillRequest(r.id, r.requestedBy)
      await load()
      showToast('Request পূর্ণ হিসেবে চিহ্নিত করা হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (r: BloodRequest) => {
    setActionLoading(r.id + '_cancel')
    try {
      await cancelRequest(r.id)
      await load()
      showToast('Request বাতিল করা হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleNotify = async (r: BloodRequest, type: 'compatible' | 'all' | 'org_admins') => {
    setNotifyLoading(r.id + '_' + type)
    setNotifyMenuId(null)
    try {
      const baseData = {
        requestId: r.id,
        bloodGroup: r.bloodGroup,
        hospital: r.hospital,
        area: r.area,
        patientName: r.patientName,
        urgency: r.urgency,
      }

      if (type === 'compatible') {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'blood_request', data: baseData }),
        })
        showToast('Compatible donors দের notification পাঠানো হয়েছে', 'success')
      } else if (type === 'all') {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'broadcast',
            data: {
              title: r.urgency === 'urgent' ? `🔴 জরুরি ${r.bloodGroup} রক্ত লাগবে!` : `🩸 ${r.bloodGroup} রক্তের অনুরোধ`,
              body: `${r.patientName} — ${r.hospital}, ${r.area}`,
            },
          }),
        })
        showToast('সব user দের notification পাঠানো হয়েছে', 'success')
      } else if (type === 'org_admins') {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'org_admins_blast', data: baseData }),
        })
        showToast('সংগঠনের admins দের notification পাঠানো হয়েছে', 'success')
      }
    } catch {
      showToast('notification পাঠাতে সমস্যা হয়েছে', 'error')
    } finally {
      setNotifyLoading(null)
    }
  }

  const statusBadge = (s: RequestStatus) => ({
    open: 'bg-blue-50 text-blue-700',
    fulfilled: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-[#555555]',
  })[s]

  const statusLabel = (s: RequestStatus) => ({
    open: '🔵 চলমান',
    fulfilled: '✅ পূর্ণ',
    cancelled: '❌ বাতিল',
  })[s]

  const counts = {
    all: requests.length,
    open: requests.filter(r => r.status === 'open').length,
    fulfilled: requests.filter(r => r.status === 'fulfilled').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">রক্তের অনুরোধ</h1>
        <p className="text-[#555555] text-sm mt-1">মোট {requests.length}টি request</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-[#E5E5E5] w-fit">
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === value ? 'bg-[#D92B2B] text-white shadow-sm' : 'text-[#555555] hover:text-[#111111]'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === value ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#555555]'}`}>
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-3">🩸</span>
            <p className="text-[#555555]">এই ক্যাটাগরিতে কোনো request নেই</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8F8F8] border-b border-[#E5E5E5]">
                <tr>
                  {['রোগীর নাম', 'রক্ত', 'হাসপাতাল', 'যোগাযোগ', 'অ্যাকাউন্ট', 'তারিখ', 'অবস্থা', 'অ্যাকশন'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-[#555555] px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-[#111111]">{r.patientName}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.urgency === 'urgent' ? 'bg-red-50 text-[#D92B2B]' : 'bg-blue-50 text-blue-700'}`}>
                        {r.urgency === 'urgent' ? '🔴 জরুরি' : '🔵 সাধারণ'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="bg-red-100 text-[#D92B2B] text-sm font-bold px-2.5 py-1 rounded-full">{r.bloodGroup}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#555555]">
                      <p>{r.hospital}</p>
                      <p className="text-xs">{r.area}</p>
                    </td>
                    <td className="px-5 py-3">
                      <a href={`tel:${r.contactPhone}`} className="text-sm text-[#D92B2B] font-medium hover:underline whitespace-nowrap">
                        📞 {r.contactPhone}
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      {userMap[r.requestedBy] ? (
                        <div>
                          <p className="text-sm font-medium text-[#111111]">{userMap[r.requestedBy].name}</p>
                          <a href={`tel:${userMap[r.requestedBy].phone}`} className="text-xs text-[#D92B2B] hover:underline">
                            📞 {userMap[r.requestedBy].phone}
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-[#555555]">অজ্ঞাত</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#555555] whitespace-nowrap">
                      {formatBanglaDate(r.createdAt.toDate())}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${statusBadge(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 items-center">
                        {r.status === 'open' && (
                          <>
                            <button
                              onClick={() => handleFulfill(r)}
                              disabled={!!actionLoading}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors whitespace-nowrap"
                            >
                              {actionLoading === r.id ? '...' : '✓ পূর্ণ'}
                            </button>
                            <button
                              onClick={() => handleCancel(r)}
                              disabled={!!actionLoading}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-[#555555] hover:bg-gray-200 font-medium transition-colors whitespace-nowrap"
                            >
                              {actionLoading === r.id + '_cancel' ? '...' : 'বাতিল'}
                            </button>
                          </>
                        )}

                        {/* Notify button */}
                        <div className="relative" ref={notifyMenuId === r.id ? menuRef : undefined}>
                          <button
                            onClick={() => setNotifyMenuId(notifyMenuId === r.id ? null : r.id)}
                            disabled={!!notifyLoading}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors whitespace-nowrap"
                            title="Notification পাঠান"
                          >
                            {notifyLoading?.startsWith(r.id) ? '...' : '🔔 Notify'}
                          </button>

                          {notifyMenuId === r.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-[#E5E5E5] z-50 w-52 py-1">
                              <p className="text-[10px] text-[#555555] px-3 pt-2 pb-1 font-semibold uppercase tracking-wide">Notification পাঠান</p>
                              <button
                                onClick={() => handleNotify(r, 'compatible')}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#FAFAFA] transition-colors flex items-center gap-2"
                              >
                                <span>🩸</span>
                                <div>
                                  <p className="font-medium text-[#111111]">Compatible Donors</p>
                                  <p className="text-[10px] text-[#555555]">{r.bloodGroup} গ্রুপের ডোনাররা</p>
                                </div>
                              </button>
                              <button
                                onClick={() => handleNotify(r, 'org_admins')}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#FAFAFA] transition-colors flex items-center gap-2"
                              >
                                <span>🏢</span>
                                <div>
                                  <p className="font-medium text-[#111111]">সংগঠনের Admins</p>
                                  <p className="text-[10px] text-[#555555]">সব org admin রা</p>
                                </div>
                              </button>
                              <button
                                onClick={() => handleNotify(r, 'all')}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#FAFAFA] transition-colors flex items-center gap-2"
                              >
                                <span>📢</span>
                                <div>
                                  <p className="font-medium text-[#111111]">সবাইকে</p>
                                  <p className="text-[10px] text-[#555555]">সব registered user রা</p>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
