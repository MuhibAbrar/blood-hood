import Link from 'next/link'
import type { BloodRequest } from '@/types'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
import { daysSince } from '@/lib/constants'

interface RequestCardProps {
  request: BloodRequest
}

export default function RequestCard({ request }: RequestCardProps) {
  const daysAgo = daysSince(request.createdAt.toDate())
  const isUrgent = request.urgency === 'urgent'

  return (
    <Link
      href={`/requests/${request.id}`}
      className={`card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow ${
        isUrgent ? 'border-[#D92B2B] border-2' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <BloodGroupBadge group={request.bloodGroup} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[#111111]">{request.patientName}</p>
            {isUrgent && (
              <span className="text-xs bg-[#D92B2B] text-white px-2 py-0.5 rounded-full font-semibold animate-pulse">
                🔴 জরুরি
              </span>
            )}
          </div>
          <p className="text-sm text-[#555555] mt-0.5 truncate">🏥 {request.hospital}</p>
          <p className="text-sm text-[#555555] truncate">📍 {request.area}</p>
          <p className="text-xs text-[#555555]/70 mt-1">{daysAgo === 0 ? 'আজকে' : `${daysAgo} দিন আগে`}</p>
        </div>
      </div>
      {request.status === 'open' && (
        <div className="btn-primary w-full text-sm">সাহায্য করব</div>
      )}
      {request.status === 'fulfilled' && (
        <div className="text-center py-2 bg-green-50 rounded-xl text-[#1A9E6B] text-sm font-semibold">
          ✓ পূর্ণ হয়েছে
        </div>
      )}
    </Link>
  )
}
