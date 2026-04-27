'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getOrgByAdmin, getCampsByOrg, getAnnouncements } from '@/lib/firestore'
import { formatBanglaDate } from '@/lib/constants'
import type { Organization, Camp, Announcement } from '@/types'

export default function OrgAdminDashboard() {
  const { user } = useAuth()
  const [org, setOrg] = useState<Organization | null>(null)
  const [camps, setCamps] = useState<Camp[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getOrgByAdmin(user.uid),
      getCampsByOrg(''),
    ]).then(async ([o]) => {
      if (!o) return
      setOrg(o)
      const [c, a] = await Promise.all([getCampsByOrg(o.id), getAnnouncements(o.id)])
      setCamps(c)
      setAnnouncements(a)
      setLoading(false)
    })
  }, [user])

  const upcomingCamps = camps.filter(c => c.status === 'upcoming')
  const completedCamps = camps.filter(c => c.status === 'completed')

  const quickLinks = [
    { href: '/org-admin/members', label: 'সদস্য দেখুন', icon: '👥', value: org?.memberIds.length ?? 0, sub: 'মোট সদস্য' },
    { href: '/org-admin/camps', label: 'ক্যাম্প', icon: '🏕️', value: upcomingCamps.length, sub: 'আসন্ন ক্যাম্প' },
    { href: '/org-admin/announcements', label: 'ঘোষণা', icon: '📢', value: announcements.length, sub: 'মোট ঘোষণা' },
    { href: '/org-admin/camps', label: 'মোট দান', icon: '🩸', value: org?.totalDonations ?? 0, sub: 'এই সংগঠনে' },
  ]

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-[#E5E5E5] animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">স্বাগতম, {user?.name}</h1>
        <p className="text-[#555555] text-sm mt-1">{org?.name}-এর অ্যাডমিন প্যানেল</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map(({ href, label, icon, value, sub }) => (
          <Link key={label} href={href} className="bg-white rounded-2xl border border-[#E5E5E5] p-5 hover:border-[#1A9E6B] hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{icon}</span>
              <span className="text-xs text-[#555555] group-hover:text-[#1A9E6B] transition-colors">→</span>
            </div>
            <p className="text-3xl font-bold text-[#111111]">{value}</p>
            <p className="text-xs text-[#555555] mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming camps */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#111111]">আসন্ন ক্যাম্প</h2>
            <Link href="/org-admin/camps" className="text-sm text-[#1A9E6B] font-medium">সব দেখুন →</Link>
          </div>
          <div className="space-y-3">
            {upcomingCamps.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 text-center">
                <p className="text-[#555555] text-sm">কোনো আসন্ন ক্যাম্প নেই</p>
                <Link href="/org-admin/camps" className="text-sm text-[#1A9E6B] font-medium mt-2 inline-block">+ নতুন তৈরি করুন</Link>
              </div>
            ) : upcomingCamps.slice(0, 3).map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
                <p className="font-semibold text-[#111111] text-sm">{c.title}</p>
                <p className="text-xs text-[#555555] mt-1">📅 {formatBanglaDate(c.date.toDate())} · 📍 {c.venue}</p>
                <p className="text-xs text-[#1A9E6B] mt-1">👥 {c.registeredDonors.length} জন নিবন্ধিত</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent announcements */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#111111]">সাম্প্রতিক ঘোষণা</h2>
            <Link href="/org-admin/announcements" className="text-sm text-[#1A9E6B] font-medium">সব দেখুন →</Link>
          </div>
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 text-center">
                <p className="text-[#555555] text-sm">কোনো ঘোষণা নেই</p>
                <Link href="/org-admin/announcements" className="text-sm text-[#1A9E6B] font-medium mt-2 inline-block">+ নতুন ঘোষণা</Link>
              </div>
            ) : announcements.slice(0, 3).map(a => (
              <div key={a.id} className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
                <p className="font-semibold text-[#111111] text-sm">{a.title}</p>
                <p className="text-xs text-[#555555] mt-1 line-clamp-2">{a.message}</p>
                <p className="text-xs text-[#555555]/60 mt-1">{formatBanglaDate(a.createdAt.toDate())}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Completed camps stats */}
      {completedCamps.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#111111] mb-4">সম্পন্ন ক্যাম্প</h2>
          <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F8F8F8] border-b border-[#E5E5E5]">
                <tr>
                  {['ক্যাম্প', 'তারিখ', 'নিবন্ধিত', 'রক্ত সংগ্রহ'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-[#555555] px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {completedCamps.map(c => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-5 py-3 text-sm font-medium text-[#111111]">{c.title}</td>
                    <td className="px-5 py-3 text-sm text-[#555555]">{formatBanglaDate(c.date.toDate())}</td>
                    <td className="px-5 py-3 text-sm text-[#555555]">{c.registeredDonors.length} জন</td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-bold text-[#D92B2B]">{c.totalCollected} ব্যাগ</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
