'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { updateUser } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { daysSince } from '@/lib/constants'

const UNAVAILABLE_DAYS = 90

export default function AvailabilityToggle() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [blockedModalOpen, setBlockedModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const remainingDays = user.lastDonatedAt
    ? Math.max(0, UNAVAILABLE_DAYS - daysSince(user.lastDonatedAt.toDate()))
    : 0

  const isBlocked = !user.isAvailable && remainingDays > 0

  const handleToggleClick = () => {
    if (!user.isAvailable && isBlocked) {
      setBlockedModalOpen(true)
    } else {
      setModalOpen(true)
    }
  }

  const toggle = async () => {
    setLoading(true)
    try {
      await updateUser(user.uid, { isAvailable: !user.isAvailable })
      await refreshUser()
      showToast(
        user.isAvailable ? 'আপনি Unavailable হয়েছেন' : 'আপনি Available হয়েছেন',
        user.isAvailable ? 'info' : 'success'
      )
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setLoading(false)
      setModalOpen(false)
    }
  }

  return (
    <>
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-[#111111]">রক্তদানের অবস্থা</p>
          <p className={`text-sm font-medium mt-0.5 ${user.isAvailable ? 'text-[#1A9E6B]' : 'text-[#D92B2B]'}`}>
            {user.isAvailable ? '● এখন Available' : '○ Unavailable'}
          </p>
        </div>
        <button
          onClick={handleToggleClick}
          className={`relative inline-flex items-center w-14 h-7 rounded-full transition-colors ${
            user.isAvailable ? 'bg-[#1A9E6B]' : 'bg-gray-300'
          }`}
          aria-label="availability toggle"
        >
          <span
            className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform ${
              user.isAvailable ? 'translate-x-8' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="নিশ্চিত করুন">
        <p className="text-[#555555] mb-6">
          {user.isAvailable
            ? 'আপনি কি নিজেকে Unavailable করতে চান? নতুন request-এ আপনাকে দেখানো হবে না।'
            : 'আপনি কি আবার রক্তদানের জন্য Available হতে চান?'}
        </p>
        <div className="flex gap-3">
          <button onClick={() => setModalOpen(false)} className="btn-ghost flex-1 border border-[#E5E5E5]">
            বাতিল
          </button>
          <button onClick={toggle} disabled={loading} className="btn-primary flex-1">
            {loading ? 'অপেক্ষা করুন...' : 'হ্যাঁ, নিশ্চিত'}
          </button>
        </div>
      </Modal>

      <Modal open={blockedModalOpen} onClose={() => setBlockedModalOpen(false)} title="এখন সম্ভব নয়">
        <p className="text-[#555555] mb-2">
          আপনি সম্প্রতি রক্ত দিয়েছেন।
        </p>
        <p className="font-semibold text-[#111111] mb-6">
          আর{' '}
          <span className="text-3xl font-bold text-[#D92B2B]">{remainingDays}</span>
          {' '}দিন পর Available হতে পারবেন।
        </p>
        <button onClick={() => setBlockedModalOpen(false)} className="btn-primary w-full">
          ঠিক আছে
        </button>
      </Modal>
    </>
  )
}
