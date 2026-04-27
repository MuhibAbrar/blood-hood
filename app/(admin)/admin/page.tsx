'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPlatformStats, getBloodRequests } from '@/lib/firestore'
import type { BloodRequest } from '@/types'

interface Stats {
  totalMembers: number
  availableNow: number
  thisMonthDonations: number
  pendingRequests: number
  totalDonations: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentRequests, setRecentRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getPlatformStats(),
      getBloodRequests('open'),
    ]).then(([s, r]) => {
      setStats(s)
      setRecentRequests(r.slice(0, 5))
      setLoading(false)
    })
  }, [])

  const statCards = [
    { label: 'মোট সদস্য', value: stats?.totalMembers ?? 0, icon: '👥', color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
    { label: 'এখন Available', value: stats?.availableNow ?? 0, icon: '✅', color: 'bg-green-50 text-green-700', border: 'border-green-100' },
    { label: 'এই মাসে দান', value: stats?.thisMonthDonations ?? 0, icon: '🩸', color: 'bg-red-50 text-[#D92B2B]', border: 'border-red-100' },
    { label: 'অপেক্ষারত Request', value: stats?.pendingRequests ?? 0, icon: '⏳', color: 'bg-yellow-50 text-yellow-700', border: 'border-yellow-100' },
    { label: 'মোট দান', value: stats?.totalDonations ?? 0, icon: '💉', color: 'bg-purple-50 text-purple-700', border: 'border-purple-100' },
  ]

  const quickLinks = [
    { href: '/admin/camps', label: 'নতুন ক্যাম্প', icon: '🏕️', desc: 'ক্যাম্প তৈরি ও পরিচালনা' },
    { href: '/admin/organizations', label: 'নতুন সংগঠন', icon: '🏫', desc: 'সংগঠন তৈরি ও পরিচালনা' },
    { href: '/admin/users', label: 'User দেখুন', icon: '👥', desc: 'সদস্য যাচাই ও role পরিবর্তন' },
    { href: '/admin/requests', label: 'Requests', icon: '🩸', desc: 'রক্তের অনুরোধ পরিচালনা' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">ড্যাশবোর্ড</h1>
        <p className="text-[#555555] text-sm mt-1">Blood Hood প্ল্যাটফর্মের সামগ্রিক অবস্থা</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, icon, color, border }) => (
          <div key={label} className={`bg-white rounded-2xl border ${border} p-5`}>
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 w-12 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-100 rounded" />
              </div>
            ) : (
              <>
                <div className={`text-3xl font-bold ${color.split(' ')[1]}`}>{value}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-base">{icon}</span>
                  <p className="text-xs text-[#555555]">{label}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-semibold text-[#111111] mb-4">দ্রুত অ্যাকশন</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map(({ href, label, icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-2xl border border-[#E5E5E5] p-5 hover:border-[#D92B2B] hover:shadow-md transition-all group"
            >
              <span className="text-3xl block mb-3">{icon}</span>
              <p className="font-semibold text-[#111111] text-sm group-hover:text-[#D92B2B] transition-colors">{label}</p>
              <p className="text-xs text-[#555555] mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#111111]">সাম্প্রতিক রক্তের অনুরোধ</h2>
          <Link href="/admin/requests" className="text-sm text-[#D92B2B] font-medium">সব দেখুন →</Link>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="p-8 text-center text-[#555555] text-sm">কোনো অপেক্ষারত অনুরোধ নেই</div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#F8F8F8] border-b border-[#E5E5E5]">
                <tr>
                  {['রোগীর নাম', 'রক্তের গ্রুপ', 'হাসপাতাল', 'জরুরিত্ব'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-[#555555] px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {recentRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-[#111111]">{r.patientName}</td>
                    <td className="px-5 py-3">
                      <span className="bg-red-100 text-[#D92B2B] text-xs font-bold px-2 py-0.5 rounded-full">{r.bloodGroup}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#555555]">{r.hospital}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.urgency === 'urgent' ? 'bg-red-50 text-[#D92B2B]' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {r.urgency === 'urgent' ? '🔴 জরুরি' : '🔵 সাধারণ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
