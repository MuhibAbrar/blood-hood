'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { respondToRequest } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
import { triggerInstall } from '@/lib/installPrompt'
import type { BloodRequest } from '@/types'

interface RequestCardProps {
  request: BloodRequest
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'এইমাত্র'
  if (mins < 60) return `${mins} মিনিট আগে`
  if (hours < 24) return `${hours} ঘণ্টা আগে`
  return `${days} দিন আগে`
}

export default function RequestCard({ request }: RequestCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [responding, setResponding] = useState(false)
  const [responded, setResponded] = useState(
    user ? request.respondedBy.includes(user.uid) : false
  )

  const isOwner = user?.uid === request.requestedBy
  const isUrgent = request.urgency === 'urgent'

  const handleRespond = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    setResponding(true)
    try {
      await respondToRequest(request.id, user.uid)
      setResponded(true)
      showToast('সাড়া দেওয়া হয়েছে! এখন কল করুন 📞', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setResponding(false)
    }
  }

  return (
    <div
      onClick={() => router.push(`/requests/${request.id}`)}
      className={`card p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow ${
        isUrgent && request.status === 'open' ? 'border-l-4 border-l-[#D92B2B]' : ''
      }`}
    >
      {/* Header: blood group + name + urgency + time */}
      <div className="flex items-start gap-3">
        <BloodGroupBadge group={request.bloodGroup} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[#111111]">{request.patientName}</p>
            {isUrgent && request.status === 'open' && (
              <span className="text-[10px] bg-[#D92B2B] text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                জরুরি
              </span>
            )}
          </div>
          <p className="text-xs text-[#555555]/60 mt-0.5">{timeAgo(request.createdAt.toDate())}</p>
        </div>
        {/* Responders count */}
        {request.respondedBy.length > 0 && (
          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-semibold shrink-0">
            👥 {request.respondedBy.length} জন
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <p className="text-sm text-[#555555] flex items-center gap-2">
          <span className="text-base">🏥</span>
          <span className="truncate">{request.hospital}{request.area ? `, ${request.area}` : ''}</span>
        </p>
        {request.bags > 1 && (
          <p className="text-sm text-[#555555] flex items-center gap-2">
            <span className="text-base">🩸</span>
            <span className="font-medium text-[#D92B2B]">{request.bags} ব্যাগ রক্ত লাগবে</span>
          </p>
        )}
        <p className="text-sm text-[#555555] flex items-center gap-2">
          <span className="text-base">📞</span>
          {user ? (
            <span className="font-medium text-[#111111]">{request.contactPhone}</span>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); router.push('/login') }}
              className="text-[#D92B2B] font-medium underline underline-offset-2 text-sm"
            >
              নম্বর দেখতে লগইন করুন
            </button>
          )}
        </p>
        {request.note && (
          <p className="text-sm text-[#555555] bg-[#F8F8F8] rounded-xl px-3 py-2 leading-relaxed">
            {request.note}
          </p>
        )}
      </div>

      {/* Fulfilled / Cancelled status */}
      {request.status === 'fulfilled' && (
        <div className="text-center py-2 bg-green-50 rounded-xl text-[#1A9E6B] text-sm font-semibold">
          ✓ রক্তের ব্যবস্থা হয়েছে
        </div>
      )}
      {request.status === 'cancelled' && (
        <div className="text-center py-2 bg-gray-100 rounded-xl text-[#555555] text-sm font-medium">
          বাতিল হয়েছে
        </div>
      )}

      {/* Action buttons */}
      {request.status === 'open' && (
        <div onClick={e => e.stopPropagation()} className="flex gap-2">
          {!user ? (
            <>
              {/* Mobile: install button */}
              <button
                onClick={triggerInstall}
                className="flex-1 py-2.5 rounded-xl bg-[#1A9E6B] text-white text-sm font-semibold text-center transition-colors md:hidden"
              >
                📲 সাহায্য করতে ইনস্টল করুন
              </button>
              {/* PC: login button */}
              <button
                onClick={() => router.push('/login')}
                className="flex-1 py-2.5 rounded-xl bg-[#1A9E6B] text-white text-sm font-semibold text-center transition-colors hidden md:block"
              >
                🩸 সাহায্য করতে লগইন করুন
              </button>
            </>
          ) : isOwner ? (
            <button
              onClick={() => router.push(`/requests/${request.id}`)}
              className="flex-1 py-2.5 rounded-xl bg-[#1A9E6B] text-white text-sm font-semibold hover:bg-[#158a5c] transition-colors"
            >
              পূর্ণ হয়েছে ✓
            </button>
          ) : responded ? (
            <a
              href={`tel:${request.contactPhone}`}
              className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-bold text-center hover:bg-[#b82424] transition-colors"
            >
              📞 কল করুন
            </a>
          ) : (
            <button
              onClick={handleRespond}
              disabled={responding}
              className="flex-1 py-2.5 rounded-xl bg-[#1A9E6B] text-white text-sm font-semibold hover:bg-[#158a5c] transition-colors disabled:opacity-60"
            >
              {responding ? 'হচ্ছে...' : '🩸 আমি সাহায্য করব'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
