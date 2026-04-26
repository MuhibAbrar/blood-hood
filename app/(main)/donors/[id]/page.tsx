'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getUser, getDonationsByUser } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
import TopBar from '@/components/layout/TopBar'
import { DonorCardSkeleton } from '@/components/shared/LoadingSkeleton'
import { formatBanglaDate, daysSince } from '@/lib/constants'
import type { User, Donation } from '@/types'

export default function DonorProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser } = useAuth()
  const [donor, setDonor] = useState<User | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([getUser(id), getDonationsByUser(id)]).then(([d, hist]) => {
      setDonor(d)
      setDonations(hist)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="px-4 py-4"><DonorCardSkeleton /></div>
  if (!donor) return <div className="px-4 py-8 text-center text-[#555555]">ডোনার পাওয়া যায়নি</div>

  const showContact = donor.isAvailable || currentUser?.uid === donor.uid
  const daysSinceDonation = donor.lastDonatedAt ? daysSince(donor.lastDonatedAt.toDate()) : null

  return (
    <div>
      <TopBar title="ডোনার প্রোফাইল" back />
      <div className="px-4 py-6 space-y-5">
        {/* Profile header */}
        <div className="card p-6 flex flex-col items-center text-center gap-3">
          <BloodGroupBadge group={donor.bloodGroup} size="lg" />
          <div>
            <h2 className="text-xl font-bold text-[#111111]">{donor.name}</h2>
            <p className="text-[#555555] text-sm">{donor.upazila}, খুলনা</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${donor.isAvailable ? 'bg-green-100 text-[#1A9E6B]' : 'bg-red-50 text-[#D92B2B]'}`}>
            {donor.isAvailable ? '● রক্ত দিতে পারবেন' : '○ এখন Unavailable'}
          </span>
          {donor.isVerified && (
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">✓ যাচাইকৃত</span>
          )}
        </div>

        {/* Info */}
        <div className="card p-4 space-y-3">
          <InfoRow label="মোট দান" value={`${donor.totalDonations} বার`} />
          <InfoRow label="শেষ দান" value={daysSinceDonation !== null ? `${daysSinceDonation} দিন আগে` : 'দেওয়া হয়নি'} />
          {donor.area && <InfoRow label="এলাকা" value={donor.area} />}
        </div>

        {/* Contact */}
        {showContact ? (
          <a
            href={`tel:${donor.phone}`}
            className="btn-primary w-full"
          >
            📞 যোগাযোগ করুন — {donor.phone}
          </a>
        ) : (
          <div className="card p-4 text-center text-[#555555] text-sm">
            যোগাযোগের তথ্য দেখতে, ডোনারকে Available থাকতে হবে
          </div>
        )}

        {/* Donation history */}
        {donations.length > 0 && (
          <div>
            <h3 className="font-semibold text-[#111111] mb-3">দানের ইতিহাস</h3>
            <div className="space-y-2">
              {donations.map((d) => (
                <div key={d.id} className="card p-3 flex items-center gap-3">
                  <BloodGroupBadge group={d.bloodGroup} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111111] truncate">{d.recipientName}</p>
                    <p className="text-xs text-[#555555] truncate">{d.hospital}</p>
                  </div>
                  <p className="text-xs text-[#555555] shrink-0">{formatBanglaDate(d.donatedAt.toDate())}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#555555]">{label}</span>
      <span className="text-sm font-semibold text-[#111111]">{value}</span>
    </div>
  )
}
