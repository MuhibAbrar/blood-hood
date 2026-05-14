'use client'

import { useEffect, useState } from 'react'
import { getDistrictAnalytics } from '@/lib/firestore'
import type { DistrictStat } from '@/lib/firestore'

type SortKey = 'donors' | 'available' | 'requests'

export default function AnalyticsPage() {
  const [data, setData] = useState<DistrictStat[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('donors')

  useEffect(() => {
    getDistrictAnalytics().then((d) => { setData(d); setLoading(false) })
  }, [])

  const sorted = [...data].sort((a, b) => b[sort] - a[sort])
  const max = sorted[0]?.[sort] ?? 1

  const tabs: { key: SortKey; label: string; color: string; bar: string }[] = [
    { key: 'donors',    label: 'মোট ডোনার',       color: 'text-blue-700',   bar: 'bg-blue-500' },
    { key: 'available', label: 'এখন Available',    color: 'text-green-700',  bar: 'bg-[#1A9E6B]' },
    { key: 'requests',  label: 'মোট Request',      color: 'text-red-700',    bar: 'bg-[#D92B2B]' },
  ]
  const active = tabs.find(t => t.key === sort)!

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">জেলাভিত্তিক বিশ্লেষণ</h1>
        <p className="text-[#555555] text-sm mt-1">প্রতিটি জেলায় ডোনার ও রক্তের অনুরোধের সংখ্যা</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSort(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
              sort === t.key
                ? 'bg-[#D92B2B] text-white border-[#D92B2B]'
                : 'border-[#E5E5E5] text-[#555555] hover:border-[#D92B2B]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard label="মোট ডোনার" value={data.reduce((s, d) => s + d.donors, 0)} color="text-blue-700" />
          <SummaryCard label="এখন Available" value={data.reduce((s, d) => s + d.available, 0)} color="text-[#1A9E6B]" />
          <SummaryCard label="মোট Request" value={data.reduce((s, d) => s + d.requests, 0)} color="text-[#D92B2B]" />
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-6 bg-gray-100 rounded-lg animate-pulse" style={{ width: `${30 + i * 8}%` }} />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-[#555555] text-sm">কোনো ডেটা পাওয়া যায়নি</div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {sorted.map((d, i) => {
              const pct = Math.max(4, Math.round((d[sort] / max) * 100))
              return (
                <div key={d.name} className="px-5 py-3 flex items-center gap-4">
                  <span className="w-5 text-xs text-[#999] font-mono shrink-0">{i + 1}</span>
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-semibold text-[#111111] truncate">{d.name}</p>
                    <p className="text-xs text-[#999]">
                      {d.donors} · {d.available} · {d.requests}
                    </p>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-5 bg-[#F5F5F5] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${active.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-8 text-right shrink-0 ${active.color}`}>
                      {d[sort]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-xs text-[#999] text-center">
          কলাম: মোট ডোনার · এখন Available · মোট Request
        </p>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-[#555555] mt-1">{label}</p>
    </div>
  )
}
