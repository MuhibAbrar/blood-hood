'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPlatformStats, subscribeToRequests } from '@/lib/firestore'
import DonorHeroCard from '@/components/donor/DonorHeroCard'
import RequestCard from '@/components/request/RequestCard'
import { StatCardSkeleton, RequestCardSkeleton } from '@/components/shared/LoadingSkeleton'
import type { BloodRequest } from '@/types'

interface Stats {
  totalMembers: number
  availableNow: number
  thisMonthDonations: number
  pendingRequests: number
  totalDonations: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    getPlatformStats().then((s) => { setStats(s); setLoadingStats(false) })
    const unsub = subscribeToRequests((reqs) => {
      setRequests(reqs.filter((r) => r.status === 'open').slice(0, 5))
    })
    return unsub
  }, [])

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Donor hero card */}
      <DonorHeroCard />

      {/* Stats */}
      <div>
        <h3 className="font-semibold text-[#111111] mb-3">প্ল্যাটফর্ম পরিসংখ্যান</h3>
        {loadingStats ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="মোট সদস্য"
              value={stats?.totalMembers ?? 0}
              color="text-[#555555]"
              icon={<PeopleIcon />}
              bg="bg-purple-50"
              iconColor="text-purple-500"
            />
            <StatCard
              label="এখন Available"
              value={stats?.availableNow ?? 0}
              color="text-[#1A9E6B]"
              icon={<CheckCircleIcon />}
              bg="bg-green-50"
              iconColor="text-[#1A9E6B]"
            />
            <StatCard
              label="এই মাসে দান"
              value={stats?.thisMonthDonations ?? 0}
              color="text-[#D92B2B]"
              icon={<DropIcon />}
              bg="bg-red-50"
              iconColor="text-[#D92B2B]"
            />
            <StatCard
              label="অপেক্ষারত Request"
              value={stats?.pendingRequests ?? 0}
              color="text-orange-600"
              icon={<HospitalIcon />}
              bg="bg-orange-50"
              iconColor="text-orange-500"
            />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold text-[#111111] mb-3">দ্রুত অ্যাকশন</h3>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction href="/requests/new" label="রক্তের অনুরোধ" bg="bg-red-50" iconColor="text-[#D92B2B]"
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C7 8 4 12 4 15a8 8 0 0 0 16 0c0-3-3-7-8-13z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4M10 14h4" /></svg>}
          />
          <QuickAction href="/donors" label="ডোনার খুঁজুন" bg="bg-blue-50" iconColor="text-blue-600"
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" /></svg>}
          />
          <QuickAction href="/camps" label="ক্যাম্প দেখুন" bg="bg-green-50" iconColor="text-[#1A9E6B]"
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-8 4 6 3-4 4 6" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 20h20" /></svg>}
          />
          <QuickAction href="/organizations" label="সংগঠন" bg="bg-purple-50" iconColor="text-purple-600"
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21V7l9-4 9 4v14" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 7.5h.01M15 7.5h.01" /></svg>}
          />
          <QuickAction href="/leaderboard" label="লিডারবোর্ড — সেরা দাতারা" bg="bg-yellow-50" iconColor="text-yellow-600" wide
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 21H5a2 2 0 0 1-2-2v-1a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v1a2 2 0 0 1-2 2h-3" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.9 3.8 4.2.6-3 2.9.7 4.2L12 12.3l-3.8 2.2.7-4.2-3-2.9 4.2-.6z" /></svg>}
          />
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
  )
}

function StatCard({
  label, value, color, icon, bg, iconColor,
}: {
  label: string; value: number; color: string
  icon: React.ReactNode; bg: string; iconColor: string
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center shrink-0 ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
        <p className="text-xs text-[#555555] mt-1 leading-tight">{label}</p>
      </div>
    </div>
  )
}

function QuickAction({ href, label, icon, bg, iconColor, wide }: {
  href: string; label: string; icon: React.ReactNode
  bg: string; iconColor: string; wide?: boolean
}) {
  return (
    <Link
      href={href}
      className={`card p-4 flex flex-col items-center gap-3 hover:shadow-md transition-all group ${wide ? 'col-span-2 flex-row justify-center gap-4' : ''}`}
    >
      <div className={`w-14 h-14 rounded-2xl ${bg} ${iconColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-[#111111] text-center">{label}</p>
    </Link>
  )
}

function PeopleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline strokeLinecap="round" strokeLinejoin="round" points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function DropIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C7 8 4 12 4 15a8 8 0 0 0 16 0c0-3-3-7-8-13z" />
    </svg>
  )
}

function HospitalIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v6M9 10h6" />
    </svg>
  )
}
