'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function LandingPage() {
  const { firebaseUser, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && firebaseUser && user) {
      router.replace('/dashboard')
    }
  }, [loading, firebaseUser, user, router])

  // Auth check হচ্ছে
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D92B2B] to-[#8B1A1A] flex items-center justify-center">
        <div className="text-center">
          <span className="text-8xl block mb-6">🩸</span>
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  // Already logged in — redirect হচ্ছে
  if (firebaseUser && user) return null

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#D92B2B] to-[#8B1A1A] flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="text-8xl mb-6">🩸</span>
        <h1 className="text-4xl font-bold text-white mb-2">Blood Hood</h1>
        <p className="text-white/80 text-lg mb-2">রক্তের বন্ধন</p>
        <p className="text-white/60 text-sm mb-12 max-w-xs">
          খুলনার কমিউনিটি রক্তদান প্ল্যাটফর্ম — রক্তদাতা খুঁজুন, রক্তের অনুরোধ করুন, জীবন বাঁচান
        </p>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <Link href="/login" className="bg-white text-[#D92B2B] font-bold rounded-xl py-4 text-center text-lg hover:bg-gray-50 transition-colors">
            প্রবেশ করুন
          </Link>
          <Link href="/register" className="border-2 border-white text-white font-bold rounded-xl py-4 text-center text-lg hover:bg-white/10 transition-colors">
            নতুন অ্যাকাউন্ট খুলুন
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white/10 backdrop-blur-sm mx-4 mb-8 rounded-2xl p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-white font-bold text-2xl">৫০০+</p>
            <p className="text-white/70 text-xs mt-1">রক্তদাতা</p>
          </div>
          <div>
            <p className="text-white font-bold text-2xl">১২০০+</p>
            <p className="text-white/70 text-xs mt-1">রক্তদান</p>
          </div>
          <div>
            <p className="text-white font-bold text-2xl">১৪টি</p>
            <p className="text-white/70 text-xs mt-1">উপজেলা</p>
          </div>
        </div>
      </div>

      <p className="text-white/40 text-xs text-center pb-6">
        রক্তের বন্ধন, খুলনার জন্য
      </p>
    </main>
  )
}
