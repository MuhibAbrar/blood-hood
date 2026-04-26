'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCamps } from '@/lib/firestore'
import TopBar from '@/components/layout/TopBar'
import EmptyState from '@/components/shared/EmptyState'
import { formatBanglaDate } from '@/lib/constants'
import type { Camp } from '@/types'

export default function CampsPage() {
  const [camps, setCamps] = useState<Camp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCamps().then((c) => { setCamps(c); setLoading(false) })
  }, [])

  const upcoming = camps.filter((c) => c.status === 'upcoming')
  const past = camps.filter((c) => c.status === 'completed')

  return (
    <div>
      <TopBar title="রক্তদান ক্যাম্প" back />
      <div className="px-4 py-4 space-y-5">
        {loading ? (
          [...Array(2)].map((_, i) => <div key={i} className="card p-4 h-24 animate-pulse bg-gray-100" />)
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#111111] mb-3">আসন্ন ক্যাম্প</h3>
                <div className="space-y-3">
                  {upcoming.map((c) => <CampCard key={c.id} camp={c} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#111111] mb-3">সম্পন্ন ক্যাম্প</h3>
                <div className="space-y-3">
                  {past.map((c) => <CampCard key={c.id} camp={c} />)}
                </div>
              </div>
            )}
            {camps.length === 0 && (
              <EmptyState icon="🏕️" title="কোনো ক্যাম্প নেই" description="শীঘ্রই নতুন রক্তদান ক্যাম্পের ঘোষণা আসবে" />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CampCard({ camp }: { camp: Camp }) {
  return (
    <Link href={`/camps/${camp.id}`} className="card p-4 hover:shadow-md transition-shadow block">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="font-semibold text-[#111111]">{camp.title}</h4>
          <p className="text-sm text-[#555555] mt-1">📍 {camp.venue}, {camp.area}</p>
          <p className="text-sm text-[#555555]">📅 {formatBanglaDate(camp.date.toDate())}</p>
          <p className="text-xs text-[#555555]/70 mt-1">{camp.registeredDonors.length} জন নিবন্ধিত</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${
          camp.status === 'upcoming' ? 'bg-blue-50 text-blue-700' :
          camp.status === 'ongoing' ? 'bg-green-100 text-[#1A9E6B]' :
          'bg-gray-100 text-[#555555]'
        }`}>
          {camp.status === 'upcoming' ? 'আসন্ন' : camp.status === 'ongoing' ? 'চলমান' : 'সম্পন্ন'}
        </span>
      </div>
    </Link>
  )
}
