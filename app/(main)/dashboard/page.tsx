'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPlatformStats, getBloodRequests } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import DonorHeroCard from '@/components/donor/DonorHeroCard'
import RequestCard from '@/components/request/RequestCard'
import { RequestCardSkeleton } from '@/components/shared/LoadingSkeleton'
import type { BloodRequest } from '@/types'
import { DropIcon, UsersIcon, ClockIcon, TentIcon, BuildingIcon, ChartBarIcon, BellIcon, CheckCircleIcon, GiftIcon } from '@/components/ui/Icons'

const VOWEL_MATRAS = ['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ো', 'ৌ', 'ঁ']
function districtGenitive(d: string) {
  return VOWEL_MATRAS.includes(d.slice(-1)) ? `${d}র` : `${d}এর`
}

interface Stats {
  totalMembers: number
  availableNow: number
  thisMonthDonations: number
  pendingRequests: number
  totalDonations: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    getPlatformStats(user?.district).then((s) => { setStats(s); setLoadingStats(false) })
    getBloodRequests('open', user?.district?.trim() || undefined).then((reqs) => setRequests(reqs.slice(0, 5)))
  }, [user?.district])

  return (
    <div className="pb-8">
      {/* Full-width hero */}
      <DonorHeroCard />

      <div className="px-4 mt-4 space-y-5">
        {/* পরিসংখ্যান */}
        <div>
          <h3 className="font-semibold text-[#111111] mb-3">
            {user?.district ? `${districtGenitive(user.district)} পরিসংখ্যান` : 'প্ল্যাটফর্ম পরিসংখ্যান'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="মোট সদস্য"
              value={loadingStats ? null : (stats?.totalMembers ?? 0)}
              icon={<UsersIcon className="w-5 h-5" />}
              iconColor="text-purple-400" valueColor="text-[#111111]"
            />
            <StatCard
              label="এখন Available"
              value={loadingStats ? null : (stats?.availableNow ?? 0)}
              icon={<CheckCircleIcon className="w-5 h-5" />}
              iconColor="text-[#1A9E6B]" valueColor="text-[#1A9E6B]"
            />
            <StatCard
              label="এই মাসে দান (সব)"
              value={loadingStats ? null : (stats?.thisMonthDonations ?? 0)}
              icon={<DropIcon className="w-5 h-5" />}
              iconColor="text-[#D92B2B]" valueColor="text-[#D92B2B]"
            />
            <StatCard
              label="অপেক্ষারত Request"
              value={loadingStats ? null : (stats?.pendingRequests ?? 0)}
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
            {requests.length === 0 ? (
              <RequestCardSkeleton />
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
  label: string; value: number | null
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
