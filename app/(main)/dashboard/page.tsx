'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Timestamp } from 'firebase/firestore'
import DonorHeroCard from '@/components/donor/DonorHeroCard'
import RequestCard from '@/components/request/RequestCard'
import { RequestCardSkeleton } from '@/components/shared/LoadingSkeleton'
import ConsentModal from '@/components/ui/ConsentModal'
import type { BloodRequest } from '@/types'
import { DropIcon, UsersIcon, ClockIcon, TentIcon, BuildingIcon, ChartBarIcon, BellIcon, CheckCircleIcon, GiftIcon } from '@/components/ui/Icons'

interface Stats {
  totalMembers: number
  availableNow: number
  thisMonthDonations: number
  pendingRequests: number
  totalDonations: number
}

export default function DashboardPage() {
  const { firebaseUser } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoadingStats(true)
        setStatsError(false)
        const headers = new Headers()
        if (firebaseUser) headers.set('Authorization', `Bearer ${await firebaseUser.getIdToken()}`)
        const response = await fetch('/api/public/dashboard', { headers, cache: 'no-store' })
        if (!response.ok) throw new Error('Dashboard request failed')
        const data = await response.json()
        if (cancelled) return
        setStats(data.stats)
        setRequests(data.recentRequests.map((request: Record<string, unknown>) => ({
          ...request,
          createdAt: Timestamp.fromMillis(request.createdAtMs as number),
          expiresAt: request.expiresAtMs ? Timestamp.fromMillis(request.expiresAtMs as number) : null,
          fulfilledAt: null,
          fulfilledBy: null,
          fulfilledByName: null,
          fulfilledByPhone: null,
          orgId: null,
        })) as BloodRequest[])
      } catch {
        if (!cancelled) {
          setStatsError(true)
        }
      } finally {
        if (!cancelled) setLoadingStats(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [firebaseUser, retryKey])

  return (
    <div className="pb-8">
      <ConsentModal />
      {/* Full-width hero */}
      <DonorHeroCard />

      <div className="px-4 mt-4 space-y-5">
        {/* পরিসংখ্যান */}
        <div>
          <h3 className="font-semibold text-[#111111] mb-3">প্ল্যাটফর্ম পরিসংখ্যান</h3>
          {statsError && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
              <p className="text-xs font-medium text-[#B82424]">পরিসংখ্যান লোড করা যায়নি। আপনার data মুছে যায়নি।</p>
              <button
                type="button"
                onClick={() => setRetryKey((key) => key + 1)}
                className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#D92B2B] shadow-sm"
              >
                আবার চেষ্টা করুন
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="মোট সদস্য"
              value={statsError ? 'error' : loadingStats ? null : (stats?.totalMembers ?? 0)}
              icon={<UsersIcon className="w-5 h-5" />}
              iconColor="text-purple-400" valueColor="text-[#111111]"
            />
            <StatCard
              label="এখন Available"
              value={statsError ? 'error' : loadingStats ? null : (stats?.availableNow ?? 0)}
              icon={<CheckCircleIcon className="w-5 h-5" />}
              iconColor="text-[#1A9E6B]" valueColor="text-[#1A9E6B]"
            />
            <StatCard
              label="এই মাসে দান (সব)"
              value={statsError ? 'error' : loadingStats ? null : (stats?.thisMonthDonations ?? 0)}
              icon={<DropIcon className="w-5 h-5" />}
              iconColor="text-[#D92B2B]" valueColor="text-[#D92B2B]"
            />
            <StatCard
              label="অপেক্ষারত Request"
              value={statsError ? 'error' : loadingStats ? null : (stats?.pendingRequests ?? 0)}
              icon={<ClockIcon className="w-5 h-5" />}
              iconColor="text-orange-400" valueColor="text-orange-600"
            />
          </div>
        </div>

        {/* দ্রুত অ্যাকশন */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
          <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">দ্রুত অ্যাকশন</p>
          <div className="grid grid-cols-4 gap-y-4">
            <QuickAction href="/requests/new" label="রক্তের অনুরোধ" bg="bg-red-50" color="text-[#D92B2B]"
              icon={<DropIcon className="w-6 h-6" />} />
            <QuickAction href="/donors" label="ডোনার খুঁজুন" bg="bg-blue-50" color="text-blue-600"
              icon={<UsersIcon className="w-6 h-6" />} />
            <QuickAction href="/camps" label="ক্যাম্প" bg="bg-green-50" color="text-[#1A9E6B]"
              icon={<TentIcon className="w-6 h-6" />} />
            <QuickAction href="/organizations" label="সংগঠন" bg="bg-purple-50" color="text-purple-600"
              icon={<BuildingIcon className="w-6 h-6" />} />
            <QuickAction href="/requests" label="Request দেখুন" bg="bg-orange-50" color="text-orange-600"
              icon={<ClockIcon className="w-6 h-6" />} />
            <QuickAction href="/leaderboard" label="লিডারবোর্ড" bg="bg-yellow-50" color="text-yellow-600"
              icon={<ChartBarIcon className="w-6 h-6" />} />
            <QuickAction href="/notifications" label="নোটিফিকেশন" bg="bg-indigo-50" color="text-indigo-600"
              icon={<BellIcon className="w-6 h-6" />} />
            {/* আর্থিক অনুদান — coming soon */}
            <div className="flex flex-col items-center gap-1.5 opacity-40">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <GiftIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-medium text-[#333] text-center leading-tight px-1">অনুদান করুন</span>
            </div>
          </div>
        </div>

        {/* Recent Requests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#111111]">সাম্প্রতিক Request</h3>
            <Link href="/requests" className="text-sm text-[#D92B2B] font-medium">সব দেখুন</Link>
          </div>
          <div className="space-y-3">
            {loadingStats ? (
              <RequestCardSkeleton />
            ) : statsError ? (
              <div className="card p-5 text-center text-sm text-[#777]">
                Request load করা যায়নি। উপরের “আবার চেষ্টা করুন” চাপুন।
              </div>
            ) : requests.length === 0 ? (
              <div className="card p-5 text-center text-sm text-[#777]">
                এই মুহূর্তে কোনো খোলা রক্তের অনুরোধ নেই।
              </div>
            ) : (
              requests.map((r) => <RequestCard key={r.id} request={r} />)
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function StatCard({ label, value, icon, iconColor, valueColor }: {
  label: string; value: number | null | 'error'
  icon: React.ReactNode; iconColor: string; valueColor: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4 flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#777]">{label}</span>
        <span className={iconColor}>{icon}</span>
      </div>
      {value === null ? (
        <div className="animate-pulse">
          <div className="h-8 w-12 bg-gray-200 rounded" />
        </div>
      ) : value === 'error' ? (
        <p className="text-2xl font-bold leading-none text-[#999]">—</p>
      ) : (
        <p className={`text-3xl font-bold leading-none ${valueColor}`}>{value}</p>
      )}
    </div>
  )
}

function QuickAction({ href, label, icon, bg, color }: {
  href: string; label: string; icon: React.ReactNode; bg: string; color: string
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5">
      <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium text-[#333] text-center leading-tight px-1">{label}</span>
    </Link>
  )
}
