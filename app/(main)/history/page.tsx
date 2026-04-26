'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getDonationsByUser } from '@/lib/firestore'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
import TopBar from '@/components/layout/TopBar'
import EmptyState from '@/components/shared/EmptyState'
import { formatBanglaDate } from '@/lib/constants'
import type { Donation } from '@/types'

export default function HistoryPage() {
  const { user } = useAuth()
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getDonationsByUser(user.uid).then((d) => { setDonations(d); setLoading(false) })
  }, [user])

  return (
    <div>
      <TopBar title="দানের ইতিহাস" back />
      <div className="px-4 py-4 space-y-4">
        {/* Stats */}
        {user && (
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-[#D92B2B]">{user.totalDonations}</p>
              <p className="text-sm text-[#555555]">মোট রক্তদান</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[#1A9E6B]">{user.totalDonations}</p>
              <p className="text-sm text-[#555555]">জীবন বাঁচানো</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              </div>
            ))
          ) : donations.length === 0 ? (
            <EmptyState
              icon="🩸"
              title="এখনো কোনো রক্তদান নেই"
              description="আপনার প্রথম রক্তদান করুন এবং একজনের জীবন বাঁচান"
            />
          ) : (
            donations.map((d) => (
              <div key={d.id} className="card p-4 flex items-center gap-3">
                <BloodGroupBadge group={d.bloodGroup} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#111111] truncate">{d.recipientName}</p>
                  <p className="text-sm text-[#555555] truncate">🏥 {d.hospital}</p>
                </div>
                <p className="text-xs text-[#555555] shrink-0 text-right">
                  {formatBanglaDate(d.donatedAt.toDate())}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
