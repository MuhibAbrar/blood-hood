'use client'

import { useEffect, useState } from 'react'
import { getBloodRequests, fulfillRequest, cancelRequest } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import { formatBanglaDate } from '@/lib/constants'
import type { BloodRequest, RequestStatus } from '@/types'

const tabs: { value: RequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'সব' },
  { value: 'open', label: 'চলমান' },
  { value: 'fulfilled', label: 'পূর্ণ হয়েছে' },
  { value: 'cancelled', label: 'বাতিল' },
]

export default function AdminRequestsPage() {
  const { showToast } = useToast()
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<RequestStatus | 'all'>('open')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = () =>
    getBloodRequests().then((r) => { setRequests(r); setLoading(false) })

  useEffect(() => { load() }, [])

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
                  {['রোগীর নাম', 'রক্ত', 'হাসপাতাল', 'যোগাযোগ', 'তারিখ', 'অবস্থা', 'অ্যাকশন'].map(h => (
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
                    <td className="px-5 py-3 text-xs text-[#555555] whitespace-nowrap">
                      {formatBanglaDate(r.createdAt.toDate())}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${statusBadge(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {r.status === 'open' && (
                        <div className="flex gap-2">
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
                        </div>
                      )}
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
