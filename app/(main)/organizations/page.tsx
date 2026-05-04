'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getOrganizations } from '@/lib/firestore'
import TopBar from '@/components/layout/TopBar'
import EmptyState from '@/components/shared/EmptyState'
import type { Organization } from '@/types'

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrganizations().then((o) => { setOrgs(o); setLoading(false) })
  }, [])

  const typeLabel = (type: Organization['type']) =>
    ({ college: 'কলেজ', university: 'বিশ্ববিদ্যালয়', ngo: 'NGO', hospital: 'হাসপাতাল', community: 'কমিউনিটি' })[type] ?? type

  return (
    <div>
      <TopBar title="সংগঠন" back />
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)
        ) : orgs.length === 0 ? (
          <EmptyState icon="🏫" title="কোনো সংগঠন নেই" />
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
                  <p className="text-sm text-[#555555]">{typeLabel(org.type)} · {org.area}</p>
                  <p className="text-xs text-[#555555]/70">{new Set([...org.memberIds, ...org.adminIds]).size} সদস্য · {org.totalDonations} দান</p>
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
