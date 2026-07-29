'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getOrganizations } from '@/lib/firestore'
import { resolveOrganizationDistrict } from '@/lib/location'
import { useAuth } from '@/context/AuthContext'
import TopBar from '@/components/layout/TopBar'
import EmptyState from '@/components/shared/EmptyState'
import type { Organization } from '@/types'

const memberCount = (org: Organization) =>
  new Set([...(org.memberIds ?? []), ...(org.adminIds ?? [])]).size

const rankOrganizations = (organizations: Organization[]) =>
  [...organizations].sort((a, b) =>
    Number(b.isVerified) - Number(a.isVerified)
    || memberCount(b) - memberCount(a)
    || (b.totalDonations ?? 0) - (a.totalDonations ?? 0)
    || a.name.localeCompare(b.name, 'bn')
  )

export default function OrganizationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setOrgs([])
      setLoading(false)
      return
    }
    getOrganizations()
      .then((organizations) => {
        const district = user.district?.trim()
        const visible = district
          ? organizations.filter(org => resolveOrganizationDistrict(org) === district)
          : []
        setOrgs(rankOrganizations(visible))
      })
      .finally(() => setLoading(false))
  }, [authLoading, user])

  const typeLabel = (type: Organization['type']) =>
    ({ college: 'কলেজ', university: 'বিশ্ববিদ্যালয়', ngo: 'NGO', hospital: 'হাসপাতাল', community: 'কমিউনিটি' })[type] ?? type

  return (
    <div>
      <TopBar title="সংগঠন" back />
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)
        ) : !user?.district ? (
          <div className="card p-6 text-center">
            <p className="font-semibold text-[#111111]">আগে Profile থেকে আপনার জেলা নির্বাচন করুন</p>
            <p className="mt-1 text-sm text-[#555555]">জেলা অনুযায়ী কাছের সংগঠন দেখানো হবে।</p>
            <Link href="/profile" className="btn-primary mt-4 inline-flex">Profile আপডেট করুন</Link>
          </div>
        ) : orgs.length === 0 ? (
          <EmptyState icon="🏫" title={`${user?.district ?? 'এই জেলায়'} কোনো সংগঠন নেই`} />
        ) : (
          orgs.map((org) => (
            <div key={org.id} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <Link href={`/organizations/${org.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-[#FDECEA] rounded-full flex items-center justify-center text-2xl shrink-0">
                  {org.type === 'college' || org.type === 'university' ? '🏫' : org.type === 'ngo' ? '🤝' : '🏥'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#111111] truncate">{org.name}</p>
                    {org.isVerified && <span className="text-blue-600 text-xs">✓</span>}
                  </div>
                  <p className="text-sm text-[#555555]">{typeLabel(org.type)} · {resolveOrganizationDistrict(org) || 'জেলা নির্ধারিত নয়'} · {org.area}</p>
                  <p className="text-xs text-[#555555]/70">{memberCount(org)} সদস্য · {org.totalDonations} দান</p>
                </div>
              </Link>
              {org.phone && (
                <a
                  href={`tel:${org.phone}`}
                  className="shrink-0 flex items-center gap-1 bg-[#1A9E6B] text-white text-xs font-semibold px-3 py-2 rounded-xl"
                >
                  📞 কল
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
