'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { updateUser } from '@/lib/firestore'
import { triggerInstall, isStandalonePWA } from '@/lib/installPrompt'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'


function HeroIllustration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 175"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Crescent moon mask: outer circle minus offset inner circle */}
          <mask id="bh-crescent">
            <rect x="0" y="0" width="400" height="175" fill="black" />
            <circle cx="142" cy="72" r="11" fill="white" />
            <circle cx="148" cy="68" r="8" fill="black" />
          </mask>
        </defs>

        {/* Background glow */}
        <circle cx="340" cy="38" r="60" fill="white" className="animate-bg-glow" />

        {/* Left buildings */}
        <rect x="0"  y="133" width="38" height="42" fill="white" opacity="0.06" />
        <rect x="8"  y="123" width="22" height="13" fill="white" opacity="0.06" />
        <rect x="42" y="118" width="52" height="57" fill="white" opacity="0.07" />
        <rect x="50" y="108" width="16" height="14" fill="white" opacity="0.07" />

        {/* Hospital building — center */}
        <rect x="106" y="105" width="72" height="70" fill="white" opacity="0.09" />
        <rect x="124" y="93"  width="36" height="17" fill="white" opacity="0.09" />
        {/* Windows */}
        <rect x="113" y="118" width="13" height="11" rx="1" fill="white" opacity="0.07" />
        <rect x="132" y="118" width="13" height="11" rx="1" fill="white" opacity="0.07" />
        <rect x="151" y="118" width="13" height="11" rx="1" fill="white" opacity="0.07" />
        <rect x="113" y="136" width="13" height="11" rx="1" fill="white" opacity="0.07" />
        <rect x="151" y="136" width="13" height="11" rx="1" fill="white" opacity="0.07" />

        {/* Crescent moon above hospital */}
        <circle cx="142" cy="72" r="11" fill="white" mask="url(#bh-crescent)" opacity="0.45" />

        {/* Right buildings */}
        <rect x="190" y="120" width="44" height="55" fill="white" opacity="0.07" />
        <rect x="240" y="124" width="36" height="51" fill="white" opacity="0.06" />
        <rect x="248" y="113" width="18" height="16" fill="white" opacity="0.06" />
        <rect x="283" y="122" width="52" height="53" fill="white" opacity="0.06" />
        <rect x="342" y="126" width="58" height="49" fill="white" opacity="0.05" />
        <rect x="350" y="116" width="24" height="15" fill="white" opacity="0.05" />

        {/* Rising particles */}
        <circle cx="78"  cy="100" r="2.5" fill="white" className="animate-rise-particle" opacity="0.20" />
        <circle cx="195" cy="105" r="2"   fill="white" className="animate-rise-particle" opacity="0.15" style={{ animationDelay: '1s' }} />
        <circle cx="298" cy="98"  r="2"   fill="white" className="animate-rise-particle" opacity="0.15" style={{ animationDelay: '2s' }} />
        <circle cx="355" cy="103" r="1.5" fill="white" className="animate-rise-particle" opacity="0.12" style={{ animationDelay: '0.5s' }} />
      </svg>
    </div>
  )
}

function GuestHeroCard() {
  const standalone = isStandalonePWA()
  return (
    <div className="relative bg-gradient-to-b from-[#D92B2B] to-[#9B1B1B] px-4 pt-6 pb-12 text-white">
      <HeroIllustration />
      <div className="relative z-10">
        <h2 className="text-xl font-bold leading-tight mb-1">রক্ত দিন, জীবন বাঁচান</h2>
        <p className="text-white/70 text-sm mb-4 leading-relaxed">
          ডোনার হিসেবে যোগ দিন অথবা জরুরি রক্তের অনুরোধ দিন।
        </p>
        <div className="md:hidden">
          {standalone ? (
            <div className="flex gap-2">
              <Link href="/login" className="flex-1 py-2.5 rounded-xl bg-white text-[#D92B2B] text-sm font-bold text-center">লগইন করুন</Link>
              <Link href="/register" className="flex-1 py-2.5 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold text-center">রেজিস্ট্রেশন</Link>
            </div>
          ) : (
            <button onClick={triggerInstall} className="w-full py-2.5 rounded-xl bg-white text-[#D92B2B] text-sm font-bold text-center">
              📲 অ্যাপ ইনস্টল করুন — বিনামূল্যে
            </button>
          )}
        </div>
        <div className="hidden md:flex gap-2">
          <Link href="/login" className="flex-1 py-2.5 rounded-xl bg-white text-[#D92B2B] text-sm font-bold text-center hover:bg-red-50 transition-colors">লগইন করুন</Link>
          <Link href="/register" className="flex-1 py-2.5 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold text-center hover:bg-white/20 transition-colors">রেজিস্ট্রেশন করুন</Link>
        </div>
      </div>
      <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute bottom-0 left-0 right-0 w-full h-10 z-10">
        <path d="M0,40 Q720,0 1440,40 L1440,40 L0,40 Z" fill="#FAFAFA" />
      </svg>
    </div>
  )
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
      <div className="relative bg-gradient-to-b from-[#D92B2B] to-[#9B1B1B] px-4 pt-5 pb-12 text-white">
        <HeroIllustration />

        {/* User content — above illustration */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="ring-2 ring-white/30 rounded-full shrink-0">
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt="প্রোফাইল" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <DefaultAvatar gender={user.gender} size={56} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight">{user.name}</h2>
              <p className="text-white/65 text-xs mt-0.5">{user.upazila}{user.district ? `, ${user.district}` : ''}</p>
            </div>
            <BloodGroupBadge group={user.bloodGroup} size="md" />
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm font-semibold">আমি রক্ত দিতে পারব</p>
              <p className={`text-xs mt-0.5 ${user.isAvailable ? 'text-green-300' : 'text-white/40'}`}>
                {user.isAvailable ? '● Available হিসেবে দেখা যাচ্ছে' : '○ Unavailable'}
              </p>
            </div>
            <div className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${user.isAvailable ? 'bg-[#1A9E6B]' : 'bg-white/30'}`}>
              <span className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-md transition-all duration-200 ${user.isAvailable ? 'left-[26px]' : 'left-[3px]'}`} />
            </div>
          </button>
        </div>

        {/* Wave */}
        <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute bottom-0 left-0 right-0 w-full h-10 z-10">
          <path d="M0,40 Q720,0 1440,40 L1440,40 L0,40 Z" fill="#FAFAFA" />
        </svg>
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
              <button onClick={toggle} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold hover:bg-[#b82424] disabled:opacity-60">
                {loading ? 'হচ্ছে...' : 'হ্যাঁ, নিশ্চিত'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
