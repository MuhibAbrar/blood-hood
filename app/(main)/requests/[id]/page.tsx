'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getBloodRequest, getDonors, respondToRequest, fulfillRequest, cancelRequest } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { getCompatibleDonors } from '@/lib/bloodCompatibility'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
import DonorCard from '@/components/donor/DonorCard'
import TopBar from '@/components/layout/TopBar'
import { daysSince } from '@/lib/constants'
import { RequestCardSkeleton } from '@/components/shared/LoadingSkeleton'
import type { BloodRequest, User } from '@/types'

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [request, setRequest] = useState<BloodRequest | null>(null)
  const [compatibleDonors, setCompatibleDonors] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPhone, setShowPhone] = useState(false)

  const reload = async () => {
    if (!id) return
    const r = await getBloodRequest(id)
    setRequest(r)
  }

  useEffect(() => {
    if (!id) return
    getBloodRequest(id).then(async (r) => {
      setRequest(r)
      if (r) {
        const compatible = getCompatibleDonors(r.bloodGroup)
        const donors = await getDonors({ isAvailable: true })
        setCompatibleDonors(donors.filter((d) => compatible.includes(d.bloodGroup)).slice(0, 10))
      }
      setLoading(false)
    })
  }, [id])

  const handleRespond = async () => {
    if (!user || !request) return
    setActionLoading(true)
    try {
      await respondToRequest(request.id, user.uid)
      setShowPhone(true)
      showToast('সফলভাবে সাড়া দেওয়া হয়েছে!', 'success')
      await reload()
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFulfill = async () => {
    if (!request || !user) return
    setActionLoading(true)
    try {
      await fulfillRequest(request.id, user.uid)
      showToast('সফলভাবে সম্পন্ন হয়েছে!', 'success')
      await reload()
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="px-4 py-4"><RequestCardSkeleton /></div>
  if (!request) return <div className="px-4 py-8 text-center text-[#555555]">অনুরোধ পাওয়া যায়নি</div>

  const isOwner = user?.uid === request.requestedBy
  const alreadyResponded = user ? request.respondedBy.includes(user.uid) : false
  const daysAgo = daysSince(request.createdAt.toDate())

  return (
    <div>
      <TopBar title="অনুরোধের বিবরণ" back />
      <div className="px-4 py-4 space-y-5">
        {/* Main card */}
        <div className={`card p-5 ${request.urgency === 'urgent' ? 'border-2 border-[#D92B2B]' : ''}`}>
          {request.urgency === 'urgent' && (
            <div className="bg-[#D92B2B] text-white text-sm font-semibold px-3 py-1.5 rounded-lg mb-4 flex items-center gap-2">
              🔴 জরুরি রক্তের প্রয়োজন!
            </div>
          )}
          <div className="flex items-start gap-4">
            <BloodGroupBadge group={request.bloodGroup} size="lg" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#111111]">{request.patientName}</h2>
              <p className="text-[#555555] text-sm mt-1">🏥 {request.hospital}</p>
              <p className="text-[#555555] text-sm">📍 {request.area}</p>
              <p className="text-xs text-[#555555]/70 mt-1">{daysAgo === 0 ? 'আজকে' : `${daysAgo} দিন আগে`} — {request.respondedBy.length} জন সাড়া দিয়েছেন</p>
            </div>
          </div>
          {request.note && (
            <p className="mt-3 text-sm text-[#555555] bg-gray-50 rounded-xl p-3">{request.note}</p>
          )}
        </div>

        {/* Status */}
        {request.status === 'fulfilled' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-[#1A9E6B] font-semibold">✓ এই অনুরোধ পূর্ণ হয়েছে</p>
          </div>
        )}
        {request.status === 'cancelled' && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
            <p className="text-[#555555] font-semibold">এই অনুরোধ বাতিল করা হয়েছে</p>
          </div>
        )}

        {/* Actions */}
        {request.status === 'open' && user && !isOwner && (
          <div className="space-y-3">
            {!alreadyResponded && !showPhone ? (
              <button onClick={handleRespond} disabled={actionLoading} className="btn-primary w-full">
                {actionLoading ? 'হচ্ছে...' : '🩸 আমি সাহায্য করতে পারব'}
              </button>
            ) : (
              <a href={`tel:${request.contactPhone}`} className="btn-primary w-full">
                📞 এখনই ফোন করুন — {request.contactPhone}
              </a>
            )}
          </div>
        )}

        {/* Owner actions */}
        {isOwner && request.status === 'open' && (
          <div className="flex gap-3">
            <button onClick={handleFulfill} disabled={actionLoading} className="btn-primary flex-1">
              ✓ পূর্ণ হয়েছে
            </button>
            <button
              onClick={async () => {
                setActionLoading(true)
                await cancelRequest(request.id)
                showToast('অনুরোধ বাতিল হয়েছে', 'info')
                await reload()
                setActionLoading(false)
              }}
              disabled={actionLoading}
              className="btn-ghost flex-1 border border-[#E5E5E5]"
            >
              বাতিল করুন
            </button>
          </div>
        )}

        {/* Compatible donors */}
        {compatibleDonors.length > 0 && (
          <div>
            <h3 className="font-semibold text-[#111111] mb-3">
              সামঞ্জস্যপূর্ণ Available ডোনার ({compatibleDonors.length} জন)
            </h3>
            <div className="space-y-3">
              {compatibleDonors.map((d) => <DonorCard key={d.uid} donor={d} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
