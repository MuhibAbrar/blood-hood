'use client'

import { useEffect, useState } from 'react'
import { getDonors, getOrganizations } from '@/lib/firestore'
import { BLOOD_GROUPS } from '@/lib/bloodCompatibility'
import { KHULNA_UPAZILAS } from '@/lib/constants'
import DonorCard from '@/components/donor/DonorCard'
import { DonorCardSkeleton } from '@/components/shared/LoadingSkeleton'
import EmptyState from '@/components/shared/EmptyState'
import TopBar from '@/components/layout/TopBar'
import type { User, BloodGroup } from '@/types'

export default function DonorsPage() {
  const [donors, setDonors] = useState<User[]>([])
  const [orgMap, setOrgMap] = useState<Record<string, string>>({})
  const [adminToOrgMap, setAdminToOrgMap] = useState<Record<string, string>>({})
  const [filtered, setFiltered] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<import('firebase/firestore').DocumentSnapshot | null>(null)
  const [search, setSearch] = useState('')
  const [bloodFilter, setBloodFilter] = useState<BloodGroup | ''>('')
  const [upazilaFilter, setUpazilaFilter] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)

  useEffect(() => {
    Promise.all([getDonors(), getOrganizations()]).then(([{ donors: d, hasMore: more, lastDoc: last }, orgs]) => {
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
    if (bloodFilter) result = result.filter((d) => d.bloodGroup === bloodFilter)
    if (upazilaFilter) result = result.filter((d) => d.upazila === upazilaFilter)
    if (availableOnly) result = result.filter((d) => d.isAvailable)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((d) => d.name.toLowerCase().includes(q) || d.upazila.includes(q))
    }
    setFiltered(result)
  }, [donors, bloodFilter, upazilaFilter, availableOnly, search])

  // Get org name for a donor — also checks adminIds as fallback for org admins
  const getOrgName = (donor: User) => {
    if (donor.organizations?.length) return orgMap[donor.organizations[0]]
    // Fallback: donor might be an org admin whose user doc doesn't have organizations[] set
    const orgId = adminToOrgMap[donor.uid]
    return orgId ? orgMap[orgId] : undefined
  }

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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম বা এলাকা দিয়ে খুঁজুন"
            className="input-field pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <select value={bloodFilter} onChange={(e) => setBloodFilter(e.target.value as BloodGroup | '')} className="input-field w-auto text-sm shrink-0">
            <option value="">সব গ্রুপ</option>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={upazilaFilter} onChange={(e) => setUpazilaFilter(e.target.value)} className="input-field w-auto text-sm shrink-0">
            <option value="">সব উপজেলা</option>
            {KHULNA_UPAZILAS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <button
            onClick={() => setAvailableOnly(!availableOnly)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
              availableOnly ? 'bg-[#1A9E6B] text-white border-[#1A9E6B]' : 'border-[#E5E5E5] text-[#555555]'
            }`}
          >
            Available
          </button>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-[#555555]">{filtered.length} জন ডোনার পাওয়া গেছে</p>
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
