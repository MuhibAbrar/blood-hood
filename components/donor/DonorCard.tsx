import Link from 'next/link'
import type { User } from '@/types'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'

interface DonorCardProps {
  donor: User
  orgName?: string
}

export default function DonorCard({ donor, orgName }: DonorCardProps) {
  const lastDate = donor.lastDonatedAt
    ? donor.lastDonatedAt.toDate().toISOString().slice(0, 10)
    : null

  return (
    <Link
      href={`/donors/${donor.uid}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors border-b border-[#F0F0F0] last:border-0"
    >
      {/* Blood group */}
      <BloodGroupBadge group={donor.bloodGroup} size="sm" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#111111] text-sm truncate">{donor.name}</p>
        <p className="text-xs text-[#555555] mt-0.5 truncate">
          📍 {donor.upazila} · বয়স {donor.age}
          {donor.totalDonations > 0 ? ` · ${donor.totalDonations} বার দান` : ''}
        </p>
        {orgName && (
          <span className="inline-block mt-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium leading-4">
            {orgName}
          </span>
        )}
      </div>

      {/* Status + date */}
      <div className="text-right shrink-0">
        <p className={`text-xs font-semibold flex items-center gap-1 justify-end ${donor.isAvailable ? 'text-[#1A9E6B]' : 'text-[#D92B2B]'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${donor.isAvailable ? 'bg-[#1A9E6B]' : 'bg-[#D92B2B]'}`} />
          {donor.isAvailable ? 'Available' : 'Unavailable'}
        </p>
        {lastDate && (
          <p className="text-[10px] text-[#555555]/60 mt-0.5">{lastDate}</p>
        )}
      </div>
    </Link>
  )
}
