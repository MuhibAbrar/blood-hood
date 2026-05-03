'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getPendingContactEvents } from '@/lib/firestore'
import type { ContactEvent } from '@/types'

export default function DonationFollowUpModal() {
  const { user } = useAuth()
  const [events, setEvents]       = useState<ContactEvent[]>([])
  const [selected, setSelected]   = useState<string>('')   // eventId or 'none'
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)

  useEffect(() => {
    if (!user) return

    const check = () => {
      getPendingContactEvents(user.uid).then(setEvents).catch(() => {})
    }

    check()
    window.addEventListener('focus', check)
    const interval = setInterval(check, 30_000)

    return () => {
      window.removeEventListener('focus', check)
      clearInterval(interval)
    }
  }, [user])

  // Nothing to show
  if (!user || events.length === 0 || done) return null

  const handleSubmit = async () => {
    if (!selected) return
    setSubmitting(true)

    const donatedEvent = selected !== 'none'
      ? events.find((e) => e.id === selected) ?? null
      : null

    const res = await fetch('/api/resolve-contact-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventIds:       events.map((e) => e.id),
        donatedEventId: donatedEvent?.id   ?? null,
        donorId:        donatedEvent?.donorId ?? null,
        seekerId:       user!.uid,
      }),
    })

    if (res.ok) {
      setDone(true)
    } else {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header strip */}
        <div className="bg-[#D92B2B] px-5 py-4">
          <p className="text-white font-bold text-lg leading-snug">
            🩸 রক্ত পেয়েছেন?
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Explanation — tells the user exactly WHY these options are here */}
          <div className="bg-[#FFF5F5] border border-[#FFCCCC] rounded-xl px-4 py-3 space-y-1">
            <p className="text-sm text-[#555555]">
              আপনি সম্প্রতি নিচের ডোনারদের নম্বর দেখে যোগাযোগ করেছিলেন।
            </p>
            <p className="text-sm font-semibold text-[#111111]">
              কে রক্ত দিয়েছেন তা সিলেক্ট করুন —
            </p>
          </div>

          {/* Donor options */}
          <div className="space-y-2">
            {events.map((event) => (
              <label
                key={event.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  selected === event.id
                    ? 'border-[#D92B2B] bg-red-50'
                    : 'border-[#EEEEEE] bg-[#FAFAFA] hover:border-[#FFAAAA]'
                }`}
              >
                <input
                  type="radio"
                  name="donor-select"
                  value={event.id}
                  checked={selected === event.id}
                  onChange={() => setSelected(event.id)}
                  className="accent-[#D92B2B] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#111111] truncate">{event.donorName}</p>
                  <p className="text-xs text-[#555555]">
                    {event.donorBloodGroup}
                    {event.donorArea ? ` • ${event.donorArea}` : ''}
                  </p>
                </div>
                {selected === event.id && (
                  <span className="text-[#D92B2B] text-lg shrink-0">✓</span>
                )}
              </label>
            ))}

            {/* None option */}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                selected === 'none'
                  ? 'border-[#555555] bg-gray-50'
                  : 'border-[#EEEEEE] bg-[#FAFAFA] hover:border-[#CCCCCC]'
              }`}
            >
              <input
                type="radio"
                name="donor-select"
                value="none"
                checked={selected === 'none'}
                onChange={() => setSelected('none')}
                className="accent-[#555555] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#111111]">পাইনি / অন্যভাবে পেয়েছি</p>
                <p className="text-xs text-[#555555]">রক্ত পাইনি বা অন্য কারো কাছ থেকে পেয়েছি</p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সাবমিট করুন'}
          </button>
        </div>
      </div>
    </div>
  )
}
