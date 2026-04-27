'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getPlatformStats, subscribeToRequests } from '@/lib/firestore'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
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
  const { user } = useAuth()
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
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#555555] text-sm">স্বাগতম,</p>
          <h2 className="text-xl font-bold text-[#111111]">{user?.name ?? 'রক্তযোদ্ধা'}</h2>
        </div>
        {user && <BloodGroupBadge group={user.bloodGroup} size="lg" />}
      </div>

      {/* Availability status */}
      {user && (
        <div className={`rounded-2xl p-4 flex items-center justify-between ${user.isAvailable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-[#D92B2B]/20'}`}>
          <div>
            <p className="font-semibold text-[#111111]">আপনার অবস্থা</p>
            <p className={`text-sm font-medium ${user.isAvailable ? 'text-[#1A9E6B]' : 'text-[#D92B2B]'}`}>
              {user.isAvailable ? '● এখন রক্ত দিতে পারবেন' : '○ এখন Unavailable'}
            </p>
          </div>
          <Link href="/profile" className="btn-ghost text-sm border border-[#E5E5E5] bg-white">
            পরিবর্তন
          </Link>
        </div>
      )}

      {/* Stats */}
      <div>
        <h3 className="font-semibold text-[#111111] mb-3">প্ল্যাটফর্ম পরিসংখ্যান</h3>
        {loadingStats ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="মোট সদস্য" value={stats?.totalMembers ?? 0} icon="👥" />
            <StatCard label="এখন Available" value={stats?.availableNow ?? 0} icon="✅" color="text-[#1A9E6B]" />
            <StatCard label="এই মাসে দান" value={stats?.thisMonthDonations ?? 0} icon="🩸" />
            <StatCard label="অপেক্ষারত Request" value={stats?.pendingRequests ?? 0} icon="🏥" color="text-[#D92B2B]" />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold text-[#111111] mb-3">দ্রুত অ্যাকশন</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/requests/new" className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <span className="text-3xl">🩸</span>
            <p className="text-sm font-semibold text-[#111111] text-center">রক্তের অনুরোধ</p>
          </Link>
          <Link href="/donors" className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-semibold text-[#111111] text-center">ডোনার খুঁজুন</p>
          </Link>
          <Link href="/camps" className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <span className="text-3xl">🏕️</span>
            <p className="text-sm font-semibold text-[#111111] text-center">ক্যাম্প দেখুন</p>
          </Link>
          <Link href="/organizations" className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <span className="text-3xl">🏫</span>
            <p className="text-sm font-semibold text-[#111111] text-center">সংগঠন</p>
          </Link>
          <Link href="/leaderboard" className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow col-span-2">
            <span className="text-3xl">🏆</span>
            <p className="text-sm font-semibold text-[#111111] text-center">লিডারবোর্ড — সেরা দাতারা</p>
          </Link>
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

function StatCard({ label, value, icon, color = 'text-[#111111]' }: { label: string; value: number; icon: string; color?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-xs text-[#555555]">{label}</p>
    </div>
  )
}
