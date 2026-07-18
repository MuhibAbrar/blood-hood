'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getDonors, getOrganizations } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { BLOOD_GROUPS } from '@/lib/bloodCompatibility'
import { DISTRICTS_DATA } from '@/lib/constants'
import { belongsToDistrict } from '@/lib/location'
import SelectPicker from '@/components/ui/SelectPicker'
import DonorCard from '@/components/donor/DonorCard'
import { DonorCardSkeleton } from '@/components/shared/LoadingSkeleton'
import EmptyState from '@/components/shared/EmptyState'
import TopBar from '@/components/layout/TopBar'
import type { User, BloodGroup } from '@/types'

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function weightedShuffle(donors: User[]): User[] {
  const tier1 = donors.filter(d => d.isAvailable && d.totalDonations > 0)
  const tier2 = donors.filter(d => d.isAvailable && d.totalDonations === 0)
  const tier3 = donors.filter(d => !d.isAvailable)
  return [...shuffle(tier1), ...shuffle(tier2), ...shuffle(tier3)]
}

export default function DonorsPage() {
  const { user } = useAuth()
  const userDistrict = user?.district ?? ''
  const router = useRouter()
  const searchParams = useSearchParams()

  const [donors, setDonors] = useState<User[]>([])
  const [orgMap, setOrgMap] = useState<Record<string, string>>({})
  const [adminToOrgMap, setAdminToOrgMap] = useState<Record<string, string>>({})
  const [filtered, setFiltered] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<import('firebase/firestore').DocumentSnapshot | null>(null)
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [bloodFilter, setBloodFilter] = useState<BloodGroup | ''>(() => (searchParams.get('blood') ?? '') as BloodGroup | '')
  const [upazilaFilter, setUpazilaFilter] = useState(() => searchParams.get('upazila') ?? '')
  const [availableOnly, setAvailableOnly] = useState(() => searchParams.get('available') === '1')

  const updateParams = useCallback((patch: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(patch).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    router.replace(`/donors?${p.toString()}`, { scroll: false })
  }, [router, searchParams])

  useEffect(() => {
    Promise.all([getDonors({ pageSize: 500 }), getOrganizations()]).then(([{ donors: d, hasMore: more, lastDoc: last }, orgs]) => {
      setDonors(d)
      setHasMore(more)
      setLastDoc(last)
      const map: Record<string, string> = {}
      const adminMap: Record<string, string> = {}
      orgs.forEach(o => {
        map[o.id] = o.name
        o.adminIds?.forEach(uid => { adminMap[uid] = o.id })
      })
      setOrgMap(map)
      setAdminToOrgMap(adminMap)
      setLoading(false)
    })
  }, [])

  const loadMore = () => {
    if (!hasMore || loadingMore || !lastDoc) return
    setLoadingMore(true)
    getDonors({ lastDoc }).then(({ donors: more, hasMore: moreLeft, lastDoc: newLast }) => {
      setDonors(prev => [...prev, ...more])
      setHasMore(moreLeft)
      setLastDoc(newLast)
      setLoadingMore(false)
    })
  }

  useEffect(() => {
    let result = [...donors]
    if (userDistrict) result = result.filter((d) => belongsToDistrict(d, userDistrict))
    if (bloodFilter) result = result.filter((d) => d.bloodGroup === bloodFilter)
    if (upazilaFilter) result = result.filter((d) => d.upazila === upazilaFilter)
    if (availableOnly) result = result.filter((d) => d.isAvailable)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((d) => d.name.toLowerCase().includes(q) || d.upazila.toLowerCase().includes(q))
    }
    setFiltered(weightedShuffle(result))
  }, [donors, userDistrict, bloodFilter, upazilaFilter, availableOnly, search])

  const getOrgName = (donor: User) => {
    if (donor.organizations?.length) return orgMap[donor.organizations[0]]
    const orgId = adminToOrgMap[donor.uid]
    return orgId ? orgMap[orgId] : undefined
  }

  const upazilaOptions = userDistrict ? (DISTRICTS_DATA[userDistrict] ?? []) : []

  return (
    <div>
      <TopBar title="রক্তদাতা খুঁজুন" />
      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 stroke-[#555555]" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); updateParams({ q: e.target.value }) }}
            placeholder="নাম বা এলাকা দিয়ে খুঁজুন"
            className="input-field pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select value={bloodFilter} onChange={(e) => { setBloodFilter(e.target.value as BloodGroup | ''); updateParams({ blood: e.target.value }) }} className="input-field flex-1 text-sm">
            <option value="">সব গ্রুপ</option>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          {upazilaOptions.length > 0 && (
            <div className="flex-1">
              <SelectPicker
                value={upazilaFilter}
                onChange={(v) => { setUpazilaFilter(v); updateParams({ upazila: v }) }}
                options={upazilaOptions}
                placeholder="সব উপজেলা"
                searchable
              />
            </div>
          )}
          <button
            onClick={() => { setAvailableOnly(p => { updateParams({ available: p ? '' : '1' }); return !p }) }}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
              availableOnly ? 'bg-[#1A9E6B] text-white border-[#1A9E6B]' : 'border-[#E5E5E5] text-[#555555]'
            }`}
          >
            Available
          </button>
        </div>

        {/* Results count + district label */}
        {!loading && (
          <p className="text-sm text-[#555555]">
            {filtered.length} জন ডোনার
            {userDistrict ? ` · ${userDistrict}` : ''}
          </p>
        )}

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
            {[...Array(5)].map((_, i) => <DonorCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="😔" title="কোনো ডোনার পাওয়া যায়নি" description="ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন" />
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              {filtered.map((d) => (
                <DonorCard key={d.uid} donor={d} orgName={getOrgName(d)} />
              ))}
            </div>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 rounded-xl border-2 border-[#E5E5E5] text-sm font-semibold text-[#555555] hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                {loadingMore ? 'লোড হচ্ছে...' : 'আরো ডোনার দেখুন'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
