'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBloodRequests } from '@/lib/firestore'
import { BLOOD_GROUPS } from '@/lib/bloodCompatibility'
import RequestCard from '@/components/request/RequestCard'
import { RequestCardSkeleton } from '@/components/shared/LoadingSkeleton'
import EmptyState from '@/components/shared/EmptyState'
import TopBar from '@/components/layout/TopBar'
import type { BloodRequest, BloodGroup } from '@/types'

export default function RequestsPage() {
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'fulfilled' | 'all'>('open')
  const [bloodFilter, setBloodFilter] = useState<BloodGroup | ''>('')

  useEffect(() => {
    getBloodRequests().then((reqs) => {
      setRequests(reqs)
      setLoading(false)
    })
  }, [])

  const filtered = requests.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false
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
