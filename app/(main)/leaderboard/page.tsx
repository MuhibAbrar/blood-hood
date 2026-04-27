'use client'

import { useEffect, useState } from 'react'
import { getDonors } from '@/lib/firestore'
import TopBar from '@/components/layout/TopBar'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import type { User } from '@/types'

export default function LeaderboardPage() {
  const [donors, setDonors] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'donations' | 'available'>('donations')

  useEffect(() => {
    getDonors().then(d => {
      d.sort((a, b) => b.totalDonations - a.totalDonations)
      setDonors(d)
      setLoading(false)
    })
  }, [])

  const list = tab === 'donations'
    ? donors.filter(d => d.totalDonations > 0)
    : donors.filter(d => d.isAvailable)

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div>
      <TopBar title="লিডারবোর্ড" back />
      <div className="px-4 py-4 space-y-4">

        {/* Top 3 podium */}
        {!loading && list.length >= 3 && tab === 'donations' && (
          <div className="card p-5">
            <div className="flex items-end justify-center gap-3">
              {/* 2nd */}
              <div className="flex flex-col items-center gap-2 pb-2">
                <DefaultAvatar gender={list[1]?.gender} size={52} />
                <p className="text-xs font-semibold text-[#111111] text-center truncate w-20">{list[1]?.name}</p>
                <div className="bg-gray-100 rounded-xl px-3 py-2 text-center w-20">
                  <p className="text-lg">🥈</p>
                  <p className="font-bold text-[#111111] text-sm">{list[1]?.totalDonations}</p>
                </div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <DefaultAvatar gender={list[0]?.gender} size={64} />
                  <span className="absolute -top-2 -right-2 text-xl">👑</span>
                </div>
                <p className="text-xs font-bold text-[#111111] text-center truncate w-24">{list[0]?.name}</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-center w-24">
                  <p className="text-xl">🥇</p>
                  <p className="font-bold text-[#D92B2B] text-base">{list[0]?.totalDonations}</p>
                </div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center gap-2 pb-2">
                <DefaultAvatar gender={list[2]?.gender} size={52} />
                <p className="text-xs font-semibold text-[#111111] text-center truncate w-20">{list[2]?.name}</p>
                <div className="bg-orange-50 rounded-xl px-3 py-2 text-center w-20">
                  <p className="text-lg">🥉</p>
                  <p className="font-bold text-[#111111] text-sm">{list[2]?.totalDonations}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-[#E5E5E5]">
          {[
            { value: 'donations', label: '🩸 সর্বোচ্চ দান' },
            { value: 'available', label: '✅ এখন Available' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTab(value as typeof tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === value ? 'bg-[#D92B2B] text-white shadow-sm' : 'text-[#555555] hover:text-[#111111]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl block mb-3">🩸</span>
              <p className="text-[#555555]">এখনো কোনো দান নেই</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F0F0]">
              {list.map((donor, idx) => (
                <div key={donor.uid} className="flex items-center gap-4 px-4 py-3">
                  <div className={`w-8 text-center font-bold text-sm shrink-0 ${
                    idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-[#555555]'
                  }`}>
                    {idx < 3 ? medals[idx] : `#${idx + 1}`}
                  </div>

                  <DefaultAvatar gender={donor.gender} size={40} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#111111] text-sm truncate">{donor.name}</p>
                      {donor.isVerified && <span className="text-blue-500 text-xs">✓</span>}
                    </div>
                    <p className="text-xs text-[#555555]">{donor.upazila}</p>
                  </div>

                  <span className="bg-red-100 text-[#D92B2B] text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                    {donor.bloodGroup}
                  </span>

                  {tab === 'donations' ? (
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[#D92B2B]">{donor.totalDonations}</p>
                      <p className="text-[10px] text-[#555555]">দান</p>
                    </div>
                  ) : (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full shrink-0">● Available</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
