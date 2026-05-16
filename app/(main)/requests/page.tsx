'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBloodRequests } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { BLOOD_GROUPS } from '@/lib/bloodCompatibility'
import RequestCard from '@/components/request/RequestCard'
import { RequestCardSkeleton } from '@/components/shared/LoadingSkeleton'
import EmptyState from '@/components/shared/EmptyState'
import TopBar from '@/components/layout/TopBar'
import type { BloodRequest, BloodGroup } from '@/types'

export default function RequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'fulfilled' | 'all'>('open')
  const [bloodFilter, setBloodFilter] = useState<BloodGroup | ''>('')
  const [districtOnly, setDistrictOnly] = useState(true)

  useEffect(() => {
    getBloodRequests().then((reqs) => {
      setRequests(reqs)
      setLoading(false)
    })
  }, [])

  const isExpired = (r: BloodRequest) =>
    r.status === 'open' && r.expiresAt != null && r.expiresAt.toDate() < new Date()

  const filtered = requests.filter((r) => {
    if (districtOnly && user?.district && r.district !== user.district) return false
    if (filter === 'open') {
      if (r.status !== 'open' || isExpired(r)) return false
    } else if (filter !== 'all' && r.status !== filter) return false
    if (bloodFilter && r.bloodGroup !== bloodFilter) return false
    return true
  })

  return (
    <div>
      <TopBar
        title="রক্তের অনুরোধ"
        action={
          <Link href="/requests/new" className="btn-primary text-sm px-4 py-2 min-h-0">
            + নতুন
          </Link>
        }
      />
      <div className="px-4 py-4 space-y-4">
        {/* District toggle */}
        {user?.district && (
          <button
            onClick={() => setDistrictOnly(p => !p)}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors flex items-center justify-center gap-2 ${
              districtOnly ? 'bg-[#D92B2B] text-white border-[#D92B2B]' : 'border-[#E5E5E5] text-[#555555]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z"/>
            </svg>
            {districtOnly ? `${user.district} জেলা` : 'সব জেলা'}
          </button>
        )}

        {/* Status filter */}
        <div className="flex gap-2">
          {(['open', 'fulfilled', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                filter === s ? 'bg-[#D92B2B] text-white border-[#D92B2B]' : 'border-[#E5E5E5] text-[#555555]'
              }`}
            >
              {s === 'open' ? 'খোলা' : s === 'fulfilled' ? 'পূর্ণ' : 'সব'}
            </button>
          ))}
        </div>

        {/* Blood group filter */}
        <select value={bloodFilter} onChange={(e) => setBloodFilter(e.target.value as BloodGroup | '')} className="input-field text-sm">
          <option value="">সব রক্তের গ্রুপ</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => <RequestCardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState icon="🏥" title="কোনো অনুরোধ নেই" description="এই মুহূর্তে কোনো রক্তের অনুরোধ নেই" action={
              <Link href="/requests/new" className="btn-primary">নতুন অনুরোধ করুন</Link>
            } />
          ) : (
            filtered.map((r) => <RequestCard key={r.id} request={r} />)
          )}
        </div>
      </div>
    </div>
  )
}
