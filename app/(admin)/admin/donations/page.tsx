'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatBanglaDate } from '@/lib/constants'
import type { Donation } from '@/types'

function getDonationType(d: Donation): { label: string; icon: string; color: string } {
  if (d.campId) return { label: 'ক্যাম্প', icon: '🏕️', color: 'bg-green-100 text-green-700' }
  if (d.requestId && d.donorId !== 'external') return { label: 'Request পূরণ', icon: '🩸', color: 'bg-red-100 text-red-700' }
  if (d.donorId === 'external') return { label: 'বাইরের দাতা', icon: '👤', color: 'bg-gray-100 text-gray-600' }
  return { label: 'Self-report', icon: '📋', color: 'bg-blue-100 text-blue-700' }
}

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'donations'),
      orderBy('donatedAt', 'desc'),
      limit(50)
    )
    getDocs(q).then((snap) => {
      setDonations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Donation)))
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#111111]">সাম্প্রতিক রক্তদান</h1>
        <p className="text-sm text-[#555555] mt-0.5">সর্বশেষ ৫০টি দান — কে, কাকে, কীভাবে</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E5E5E5] h-20 animate-pulse" />
          ))}
        </div>
      ) : donations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
          <span className="text-4xl block mb-3">🩸</span>
          <p className="text-[#555555]">এখনো কোনো দান নেই</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          {donations.map((d, idx) => {
            const type = getDonationType(d)
            return (
              <div
                key={d.id}
                className={`px-5 py-4 flex items-start gap-4 ${idx !== donations.length - 1 ? 'border-b border-[#F0F0F0]' : ''}`}
              >
                {/* Index */}
                <div className="w-6 text-center text-xs font-bold text-[#BBBBBB] shrink-0 pt-0.5">
                  {idx + 1}
                </div>

                {/* Blood group badge */}
                <div className="w-10 h-10 rounded-xl bg-[#FDECEA] flex items-center justify-center text-sm font-bold text-[#D92B2B] shrink-0">
                  {d.bloodGroup || '?'}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#111111] text-sm">{d.donorName}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${type.color}`}>
                      {type.icon} {type.label}
                    </span>
                  </div>

                  <div className="mt-1 space-y-0.5">
                    {d.recipientName && (
                      <p className="text-xs text-[#555555]">
                        গ্রহীতা: <span className="font-medium text-[#111111]">{d.recipientName}</span>
                      </p>
                    )}
                    {d.hospital && (
                      <p className="text-xs text-[#555555]">
                        🏥 {d.hospital}
                      </p>
                    )}
                    {d.orgId && (
                      <p className="text-xs text-[#1A9E6B] font-medium">
                        🏫 সংগঠনের পক্ষ থেকে
                      </p>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-[#555555]">{formatBanglaDate(d.donatedAt.toDate())}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
