'use client'

import { useEffect, useState } from 'react'
import { getDonors, getOrganizationsLeaderboard } from '@/lib/firestore'
import TopBar from '@/components/layout/TopBar'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import type { User, Organization } from '@/types'

export default function LeaderboardPage() {
  const [mainTab, setMainTab] = useState<'donors' | 'orgs'>('donors')
  const [donors, setDonors] = useState<User[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDonors({ pageSize: 100 }).then(({ donors: d }) => d.sort((a, b) => b.totalDonations - a.totalDonations)),
      getOrganizationsLeaderboard(),
    ]).then(([d, o]) => {
      setDonors(d)
      setOrgs(o)
      setLoading(false)
    })
  }, [])

  const donorList = donors.filter(d => d.totalDonations > 0)

  const medals = ['🥇', '🥈', '🥉']
  const orgTypeLabel: Record<string, string> = {
    college: 'কলেজ', university: 'বিশ্ববিদ্যালয়', ngo: 'NGO', hospital: 'হাসপাতাল', community: 'কমিউনিটি'
  }

  return (
    <div>
      <TopBar title="লিডারবোর্ড" back />
      <div className="px-4 py-4 space-y-4">

        {/* Main tabs */}
        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-[#E5E5E5]">
          {[
            { value: 'donors', label: '👤 ডোনার' },
            { value: 'orgs', label: '🏢 সংগঠন' },
          ].map(({ value, label }) => (
            <button key={value} onClick={() => setMainTab(value as typeof mainTab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mainTab === value ? 'bg-[#D92B2B] text-white shadow-sm' : 'text-[#555555] hover:text-[#111111]'
              }`}
            >{label}</button>
          ))}
        </div>

        {/* ===== DONOR TAB ===== */}
        {mainTab === 'donors' && (
          <>
            {/* Podium */}
            {!loading && donorList.length >= 3 && (
              <div className="card p-5">
                <div className="flex items-end justify-center gap-3">
                  <div className="flex flex-col items-center gap-2 pb-2">
                    <DefaultAvatar gender={donorList[1]?.gender} size={52} />
                    <p className="text-xs font-semibold text-[#111111] text-center truncate w-20">{donorList[1]?.name}</p>
                    <div className="bg-gray-100 rounded-xl px-3 py-2 text-center w-20">
                      <p className="text-lg">🥈</p>
                      <p className="font-bold text-[#111111] text-sm">{donorList[1]?.totalDonations} বার</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <DefaultAvatar gender={donorList[0]?.gender} size={64} />
                      <span className="absolute -top-2 -right-2 text-xl">👑</span>
                    </div>
                    <p className="text-xs font-bold text-[#111111] text-center truncate w-24">{donorList[0]?.name}</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-center w-24">
                      <p className="text-xl">🥇</p>
                      <p className="font-bold text-[#D92B2B] text-base">{donorList[0]?.totalDonations} বার</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 pb-2">
                    <DefaultAvatar gender={donorList[2]?.gender} size={52} />
                    <p className="text-xs font-semibold text-[#111111] text-center truncate w-20">{donorList[2]?.name}</p>
                    <div className="bg-orange-50 rounded-xl px-3 py-2 text-center w-20">
                      <p className="text-lg">🥉</p>
                      <p className="font-bold text-[#111111] text-sm">{donorList[2]?.totalDonations} বার</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Donor list */}
            <div className="card overflow-hidden">
              {loading ? (
                <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : donorList.length === 0 ? (
                <div className="p-12 text-center"><span className="text-4xl block mb-3">🩸</span><p className="text-[#555555]">এখনো কোনো ডেটা নেই</p></div>
              ) : (
                <div className="divide-y divide-[#F0F0F0]">
                  {donorList.map((donor, idx) => (
                    <div key={donor.uid} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-8 text-center font-bold text-sm shrink-0 ${
                        idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-[#555555]'
                      }`}>{idx < 3 ? medals[idx] : `#${idx + 1}`}</div>
                      <DefaultAvatar gender={donor.gender} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-[#111111] text-sm truncate">{donor.name}</p>
                          {donor.isVerified && <span className="text-blue-500 text-xs">✓</span>}
                        </div>
                        <p className="text-xs text-[#555555]">{donor.upazila} · {donor.bloodGroup}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[#D92B2B]">{donor.totalDonations}</p>
                        <p className="text-[10px] text-[#555555]">দান</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== ORG TAB ===== */}
        {mainTab === 'orgs' && (
          <>
            {/* Org Podium */}
            {!loading && orgs.filter(o => o.totalDonations > 0).length >= 3 && (
              <div className="card p-5">
                <div className="flex items-end justify-center gap-3">
                  {[1, 0, 2].map((pos) => {
                    const org = orgs[pos]
                    const isFirst = pos === 0
                    return (
                      <div key={pos} className={`flex flex-col items-center gap-2 ${isFirst ? '' : 'pb-2'}`}>
                        <div className={`${isFirst ? 'w-16 h-16' : 'w-12 h-12'} rounded-2xl bg-[#FDECEA] flex items-center justify-center text-2xl relative`}>
                          {org.type === 'college' || org.type === 'university' ? '🏫' : org.type === 'ngo' ? '🤝' : org.type === 'hospital' ? '🏥' : '🏘️'}
                          {isFirst && <span className="absolute -top-2 -right-2 text-lg">👑</span>}
                        </div>
                        <p className={`font-semibold text-[#111111] text-center truncate ${isFirst ? 'w-24 text-xs' : 'w-20 text-xs'}`}>{org.name}</p>
                        <div className={`${isFirst ? 'bg-yellow-50 border border-yellow-200 w-24' : pos === 1 ? 'bg-gray-100 w-20' : 'bg-orange-50 w-20'} rounded-xl px-3 py-2 text-center`}>
                          <p className="text-lg">{medals[pos]}</p>
                          <p className={`font-bold ${isFirst ? 'text-[#D92B2B] text-base' : 'text-[#111111] text-sm'}`}>{org.totalDonations} দান</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Org list */}
            <div className="card overflow-hidden">
              {loading ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : orgs.length === 0 ? (
                <div className="p-12 text-center"><span className="text-4xl block mb-3">🏢</span><p className="text-[#555555]">কোনো সংগঠন নেই</p></div>
              ) : (
                <div className="divide-y divide-[#F0F0F0]">
                  {orgs.map((org, idx) => (
                    <div key={org.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-8 text-center font-bold text-sm shrink-0 ${
                        idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-[#555555]'
                      }`}>{idx < 3 ? medals[idx] : `#${idx + 1}`}</div>
                      <div className="w-10 h-10 rounded-xl bg-[#FDECEA] flex items-center justify-center text-xl shrink-0">
                        {org.type === 'college' || org.type === 'university' ? '🏫' : org.type === 'ngo' ? '🤝' : org.type === 'hospital' ? '🏥' : '🏘️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-[#111111] text-sm truncate">{org.name}</p>
                          {org.isVerified && <span className="text-blue-500 text-xs">✓</span>}
                        </div>
                        <p className="text-xs text-[#555555]">
                          {orgTypeLabel[org.type] ?? org.type} · {new Set([...org.memberIds, ...org.adminIds]).size} সদস্য
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[#D92B2B]">{org.totalDonations}</p>
                        <p className="text-[10px] text-[#555555]">দান</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
