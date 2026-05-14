'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPlatformStats, getBloodRequests } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import DonorHeroCard from '@/components/donor/DonorHeroCard'
import RequestCard from '@/components/request/RequestCard'
import { RequestCardSkeleton } from '@/components/shared/LoadingSkeleton'
import type { BloodRequest } from '@/types'
import { DropIcon, UsersIcon, ClockIcon, TentIcon, BuildingIcon, ChartBarIcon, BellIcon, HeartIcon } from '@/components/ui/Icons'

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
    getBloodRequests('open').then((reqs) => setRequests(reqs.slice(0, 5)))
  }, [user?.district])

  return (
    <div className="pb-8">
      {/* Full-width hero — no horizontal padding here */}
      <DonorHeroCard />

      {/* Stat chips overlapping wave */}
      <div className="flex gap-2 px-4 -mt-5">
        <StatChip
          value={loadingStats ? '—' : String(stats?.availableNow ?? 0)}
          label="Available"
          color="text-[#1A9E6B]"
        />
        <StatChip
          value={loadingStats ? '—' : String(stats?.pendingRequests ?? 0)}
          label="Request"
          color="text-[#D92B2B]"
        />
        <StatChip
          value={loadingStats ? '—' : String(stats?.thisMonthDonations ?? 0)}
          label="এই মাসে দান"
          color="text-blue-600"
        />
        <StatChip
          value={loadingStats ? '—' : String(stats?.totalMembers ?? 0)}
          label="সদস্য"
          color="text-purple-600"
        />
      </div>

      <div className="px-4 mt-5 space-y-6">
        {/* Quick Actions — bKash 4-column grid */}
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
            <QuickAction href="/history" label="ইতিহাস" bg="bg-pink-50" color="text-pink-600"
              icon={<HeartIcon className="w-6 h-6" />} />
            <QuickAction href="/notifications" label="নোটিফিকেশন" bg="bg-indigo-50" color="text-indigo-600"
              icon={<BellIcon className="w-6 h-6" />} />
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

function StatChip({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex-1 bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-2.5 flex flex-col items-center gap-0.5 text-center">
      <span className={`font-bold text-lg leading-tight ${color}`}>{value}</span>
      <span className="text-[9px] text-[#999] leading-tight">{label}</span>
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
