'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getPendingContactEvents } from '@/lib/firestore'
import type { ContactEvent } from '@/types'

type Step = 'yesno' | 'select' | 'confirm'

export default function DonationFollowUpModal() {
  const { user } = useAuth()
  const [events, setEvents]         = useState<ContactEvent[]>([])
  const [step, setStep]             = useState<Step>('yesno')
  const [selected, setSelected]     = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)

  useEffect(() => {
    if (!user) return

    let lastCheck = 0
    const check = () => {
      const now = Date.now()
      if (now - lastCheck < 10_000) return
      lastCheck = now
      getPendingContactEvents(user.uid).then(setEvents).catch(() => {})
    }

    check()
    window.addEventListener('focus', check)
    const interval = setInterval(check, 60_000)

    return () => {
      window.removeEventListener('focus', check)
      clearInterval(interval)
    }
  }, [user])

  if (!user || events.length === 0 || done) return null

  const selectedEvent = selected ? events.find((e) => e.id === selected) ?? null : null

  const handleNo = async () => {
    setSubmitting(true)
    const res = await fetch('/api/resolve-contact-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventIds:       events.map((e) => e.id),
        donatedEventId: null,
        donorId:        null,
        seekerId:       user!.uid,
      }),
    })
    if (res.ok) setDone(true)
    else setSubmitting(false)
  }

  const handleConfirm = async () => {
    if (!selectedEvent) return
    setSubmitting(true)
    const res = await fetch('/api/resolve-contact-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventIds:       events.map((e) => e.id),
        donatedEventId: selectedEvent.id,
        donorId:        selectedEvent.donorId,
        seekerId:       user!.uid,
      }),
    })
    if (res.ok) setDone(true)
    else { setSubmitting(false); setStep('select') }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* ── Step 1: Yes / No ── */}
        {step === 'yesno' && (
          <>
            <div className="bg-[#D92B2B] px-5 py-4">
              <p className="text-white font-bold text-lg leading-snug">🩸 একটু জানাবেন?</p>
            </div>
            <div className="px-5 py-5 space-y-5">
              <p className="text-[#111111] text-sm leading-relaxed">
                আপনি গতকাল রক্তের জন্য আমাদের অ্যাপ থেকে কয়েকজন ডোনারকে ফোন করেছিলেন।
              </p>
              <p className="text-[#111111] font-semibold text-base">
                আমাদের অ্যাপ থেকে কি কোনো ডোনার পেয়েছিলেন রক্ত দেওয়ার জন্য?
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setStep('select')}
                  disabled={submitting}
                  className="py-4 rounded-2xl bg-[#D92B2B] text-white font-bold text-base hover:bg-[#B82424] transition-colors disabled:opacity-40"
                >
                  হ্যাঁ ✓
                </button>
                <button
                  onClick={handleNo}
                  disabled={submitting}
                  className="py-4 rounded-2xl border-2 border-[#EEEEEE] text-[#555555] font-bold text-base hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  {submitting ? '...' : 'না ✕'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Donor Selection ── */}
        {step === 'select' && (
          <>
            <div className="bg-[#D92B2B] px-5 py-4">
              <p className="text-white font-bold text-lg leading-snug">কে রক্ত দিয়েছেন?</p>
              <p className="text-white/80 text-xs mt-0.5">
                শুধু সেই ডোনারকে সিলেক্ট করুন যিনি সত্যিই রক্ত দিয়েছেন
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
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
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => { setStep('yesno'); setSelected('') }}
                  className="py-3 rounded-xl border-2 border-[#EEEEEE] text-sm font-semibold text-[#555555] hover:bg-gray-50 transition-colors"
                >
                  ← পিছে
                </button>
                <button
                  onClick={() => { if (selected) setStep('confirm') }}
                  disabled={!selected}
                  className="py-3 rounded-xl bg-[#D92B2B] text-white text-sm font-bold hover:bg-[#B82424] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  পরবর্তী →
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Confirmation ── */}
        {step === 'confirm' && selectedEvent && (
          <>
            <div className="bg-[#D92B2B] px-5 py-4">
              <p className="text-white font-bold text-lg leading-snug">নিশ্চিত করুন</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="bg-[#FFF5F5] border-2 border-[#D92B2B] rounded-xl px-4 py-4 text-center space-y-1">
                <p className="text-3xl">🩸</p>
                <p className="font-bold text-[#111111] text-base">{selectedEvent.donorName}</p>
                <p className="text-xs text-[#555555]">
                  {selectedEvent.donorBloodGroup}
                  {selectedEvent.donorArea ? ` • ${selectedEvent.donorArea}` : ''}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-amber-800">⚠️ নিশ্চিত করার আগে পড়ুন</p>
                <p className="text-sm text-amber-700">
                  আপনি কি নিশ্চিত যে <span className="font-bold">{selectedEvent.donorName}</span> সত্যিই আপনাকে রক্ত দিয়েছেন?
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  এটি নিশ্চিত করলে তার রক্তদান রেকর্ডে ১টি দান যুক্ত হবে। ভুল তথ্য দিলে নিরীহ ডোনারের রেকর্ড নষ্ট হবে।
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStep('select')}
                  disabled={submitting}
                  className="py-3 rounded-xl border-2 border-[#EEEEEE] text-sm font-semibold text-[#555555] hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  ← পিছে যান
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="py-3 rounded-xl bg-[#D92B2B] text-white text-sm font-bold hover:bg-[#B82424] transition-colors disabled:opacity-40"
                >
                  {submitting ? 'সংরক্ষণ...' : 'হ্যাঁ, নিশ্চিত'}
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
