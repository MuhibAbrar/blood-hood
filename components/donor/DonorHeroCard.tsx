'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { updateUser } from '@/lib/firestore'

function GuestHeroCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showHint, setShowHint] = useState(false) // eslint-disable-line @typescript-eslint/no-unused-vars

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
    setIsStandalone(standalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#C0392B] via-[#A93226] to-[#7B241C] p-5 text-white shadow-lg shadow-red-900/30">
      {/* Decorative blobs */}
      <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
      <div className="absolute -bottom-8 -right-2 w-20 h-20 bg-white/5 rounded-full" />
      <div className="absolute top-3 right-4 text-5xl opacity-10 select-none pointer-events-none">🩸</div>

      {/* Text */}
      <h2 className="text-xl font-bold leading-tight mb-1 relative">রক্ত দিন, জীবন বাঁচান</h2>
      <p className="text-white/70 text-sm mb-4 relative leading-relaxed">
        ডোনার হিসেবে যোগ দিন অথবা জরুরি রক্তের অনুরোধ দিন।
      </p>

      {/* Mobile: always install button (login/register only if already installed) */}
      <div className="md:hidden relative flex flex-col gap-2">
        {isStandalone ? (
          <div className="flex gap-2">
            <Link href="/login" className="flex-1 py-2.5 rounded-xl bg-white text-[#D92B2B] text-sm font-bold text-center">
              লগইন করুন
            </Link>
            <Link href="/register" className="flex-1 py-2.5 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold text-center">
              রেজিস্ট্রেশন
            </Link>
          </div>
        ) : (
          <>
            <button
              onClick={handleInstall}
              className="w-full py-2.5 rounded-xl bg-white text-[#D92B2B] text-sm font-bold text-center hover:bg-red-50 transition-colors"
            >
              📲 অ্যাপ ইনস্টল করুন — বিনামূল্যে
            </button>
          </>
        )}
      </div>

      {/* PC: login + register */}
      <div className="hidden md:flex gap-2 relative">
        <Link href="/login" className="flex-1 py-2.5 rounded-xl bg-white text-[#D92B2B] text-sm font-bold text-center hover:bg-red-50 transition-colors">
          লগইন করুন
        </Link>
        <Link href="/register" className="flex-1 py-2.5 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold text-center hover:bg-white/20 transition-colors">
          রেজিস্ট্রেশন করুন
        </Link>
      </div>
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function DonorHeroCard() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!user) return <GuestHeroCard />

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
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setLoading(false)
      setModalOpen(false)
    }
  }

  return (
    <>
      {/* Hero card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#C0392B] via-[#A93226] to-[#7B241C] p-5 text-white shadow-lg shadow-red-900/30">

        {/* Decorative blobs */}
        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -right-2 w-20 h-20 bg-white/5 rounded-full" />
        <div className="absolute top-3 right-4 text-5xl opacity-10 select-none pointer-events-none">🩸</div>

        {/* Name */}
        <h2 className="text-2xl font-bold leading-tight mb-0.5 relative">{user.name}</h2>

        {/* Blood group + location */}
        <div className="flex items-center gap-2 mb-4 relative">
          <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/20">
            {user.bloodGroup}
          </span>
          <span className="text-white/65 text-sm">· {user.upazila}, খুলনা</span>
        </div>

        {/* Toggle row */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={loading}
          className="relative w-full bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
        >
          <span className="text-sm font-semibold">আমি রক্ত দিতে পারব</span>

          {/* Toggle switch — fixed size, no overflow */}
          <div className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${user.isAvailable ? 'bg-[#1A9E6B]' : 'bg-white/30'}`}>
            <span
              className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-md transition-all duration-200 ${
                user.isAvailable ? 'left-[26px]' : 'left-[3px]'
              }`}
            />
          </div>
        </button>

        {/* Status label */}
        <p className={`text-xs mt-2 text-center font-medium relative ${user.isAvailable ? 'text-green-300' : 'text-white/40'}`}>
          {user.isAvailable ? '● Available হিসেবে দেখা যাচ্ছে' : '○ Unavailable — নতুন request-এ দেখানো হবে না'}
        </p>
      </div>

      {/* Confirm modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !loading && setModalOpen(false)} />
          <div className="relative bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 shadow-2xl pb-[calc(1.5rem+4rem)] md:pb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#111111]">নিশ্চিত করুন</h2>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <svg className="w-5 h-5 stroke-[#555555]" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-[#555555] mb-6 text-sm leading-relaxed">
              {user.isAvailable
                ? 'আপনি কি নিজেকে Unavailable করতে চান? নতুন request-এ আপনাকে দেখানো হবে না।'
                : 'আপনি কি আবার রক্তদানের জন্য Available হতে চান?'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium hover:bg-gray-50">
                বাতিল
              </button>
              <button
                onClick={toggle}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold hover:bg-[#b82424] disabled:opacity-60"
              >
                {loading ? 'হচ্ছে...' : 'হ্যাঁ, নিশ্চিত'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
