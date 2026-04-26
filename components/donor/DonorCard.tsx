import Link from 'next/link'
import type { User } from '@/types'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
import { daysSince } from '@/lib/constants'

interface DonorCardProps {
  donor: User
}

export default function DonorCard({ donor }: DonorCardProps) {
  const daysSinceDonation = donor.lastDonatedAt
    ? daysSince(donor.lastDonatedAt.toDate())
    : null

  return (
    <Link href={`/donors/${donor.uid}`} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <BloodGroupBadge group={donor.bloodGroup} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#111111] truncate">{donor.name}</p>
        <p className="text-sm text-[#555555] truncate">{donor.upazila}, খুলনা</p>
        {daysSinceDonation !== null && (
          <p className="text-xs text-[#555555]/70 mt-0.5">
            {daysSinceDonation} দিন আগে দান করেছেন
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            donor.isAvailable
              ? 'bg-green-100 text-[#1A9E6B]'
              : 'bg-red-50 text-[#D92B2B]'
          }`}
        >
          {donor.isAvailable ? 'Available' : 'Unavailable'}
        </span>
        {donor.totalDonations > 0 && (
          <span className="text-xs text-[#555555]">{donor.totalDonations} বার দান</span>
        )}
      </div>
    </Link>
  )
}
