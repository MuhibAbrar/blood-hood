import Link from 'next/link'
import type { User } from '@/types'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
import { formatBanglaDate } from '@/lib/constants'

interface DonorCardProps {
  donor: User
}

export default function DonorCard({ donor }: DonorCardProps) {
  const lastDate = donor.lastDonatedAt ? formatBanglaDate(donor.lastDonatedAt.toDate()) : null

  return (
    <Link href={`/donors/${donor.uid}`} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <BloodGroupBadge group={donor.bloodGroup} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#111111] truncate">{donor.name}</p>
        <p className="text-sm text-[#555555] truncate">📍 {donor.upazila}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {lastDate ? (
            <p className="text-xs text-[#555555]/70">শেষ দান: {lastDate}</p>
          ) : (
            <p className="text-xs text-[#555555]/50">এখনো দান করেননি</p>
          )}
          {donor.totalDonations > 0 && (
            <span className="text-xs bg-red-50 text-[#D92B2B] font-semibold px-1.5 py-0.5 rounded-full">
              🩸 {donor.totalDonations}বার
            </span>
          )}
        </div>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
        donor.isAvailable ? 'bg-green-100 text-[#1A9E6B]' : 'bg-red-50 text-[#D92B2B]'
      }`}>
        {donor.isAvailable ? '● Available' : '○ Unavailable'}
      </span>
    </Link>
  )
}
