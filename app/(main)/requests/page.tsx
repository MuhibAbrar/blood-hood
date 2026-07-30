'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBloodRequestsPage } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { BLOOD_GROUPS } from '@/lib/bloodCompatibility'
import RequestCard from '@/components/request/RequestCard'
import { RequestCardSkeleton } from '@/components/shared/LoadingSkeleton'
import EmptyState from '@/components/shared/EmptyState'
import TopBar from '@/components/layout/TopBar'
import type { BloodRequest, BloodGroup } from '@/types'

export default function RequestsPage() {
  const { user, loading: authLoading } = useAuth()
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [filter, setFilter] = useState<'open' | 'fulfilled' | 'all'>('open')
  const [bloodFilter, setBloodFilter] = useState<BloodGroup | ''>('')

  useEffect(() => {
    if (authLoading) return
    let active = true
    const district = user?.district?.trim()
    if (!district) {
      setRequests([])
      setLoading(false)
      return
    }
    setLoading(true)
    setRequests([])
    setCursor(null)
    getBloodRequestsPage({
      status: filter === 'all' ? undefined : filter,
      bloodGroup: bloodFilter || undefined,
      pageSize: 30,
    }).then(({ requests: page, cursor: nextCursor, hasMore: more }) => {
      if (!active) return
      setRequests(page.filter((request) => request.requestedBy !== 'deleted-user'))
      setCursor(nextCursor)
      setHasMore(more)
    }).catch(() => {
      if (!active) return
      setRequests([])
      setCursor(null)
      setHasMore(false)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [authLoading, user?.district, filter, bloodFilter])

  const loadMore = () => {
    if (!cursor || !hasMore || loadingMore) return
    setLoadingMore(true)
    getBloodRequestsPage({
      status: filter === 'all' ? undefined : filter,
      bloodGroup: bloodFilter || undefined,
      pageSize: 30,
      cursor,
    }).then(({ requests: page, cursor: nextCursor, hasMore: more }) => {
      setRequests((current) => [
        ...current,
        ...page.filter((request) => request.requestedBy !== 'deleted-user'),
      ])
      setCursor(nextCursor)
      setHasMore(more)
    }).finally(() => setLoadingMore(false))
  }

  const isExpired = (r: BloodRequest) =>
    r.status === 'open' && r.expiresAt != null && r.expiresAt.toDate() < new Date()

  const filtered = requests.filter((r) => {
    if (filter === 'open' && isExpired(r)) return false
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
        {/* District badge or no-district warning */}
        {!authLoading && !user?.district?.trim() ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 rounded-xl border border-amber-200">
            <svg className="w-4 h-4 shrink-0 stroke-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
            <p className="text-xs text-amber-700 font-semibold flex-1">প্রোফাইলে জেলা সেট করুন — তারপর অনুরোধ দেখা যাবে</p>
            <Link href="/profile" className="text-xs font-bold text-amber-700 underline shrink-0">যান →</Link>
          </div>
        ) : user?.district ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FFF0F0] rounded-xl border border-[#FFD0D0]">
            <svg className="w-4 h-4 shrink-0 stroke-[#D92B2B]" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z"/>
            </svg>
            <p className="text-xs text-[#D92B2B] font-semibold">{user.district} জেলার অনুরোধ দেখাচ্ছে</p>
          </div>
        ) : null}

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
          {(authLoading || loading) ? (
            [...Array(3)].map((_, i) => <RequestCardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState icon="🏥" title="কোনো অনুরোধ নেই" description="এই মুহূর্তে কোনো রক্তের অনুরোধ নেই" action={
              <Link href="/requests/new" className="btn-primary">নতুন অনুরোধ করুন</Link>
            } />
          ) : (
            <>
              {filtered.map((r) => <RequestCard key={r.id} request={r} />)}
              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full rounded-xl border border-[#D92B2B] bg-white py-3 text-sm font-semibold text-[#D92B2B] disabled:opacity-60"
                >
                  {loadingMore ? 'লোড হচ্ছে...' : 'আরো দেখুন'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
