'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && firebaseUser && user) router.replace('/dashboard')
  }, [loading, firebaseUser, user, router])

  // Auth state লোড হচ্ছে — blank/login দেখানো উচিত না
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl block mb-4">🩸</span>
          <div className="w-6 h-6 border-2 border-[#D92B2B]/30 border-t-[#D92B2B] rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  // Already logged in — redirect হচ্ছে, কিছু দেখানো দরকার নেই
  if (firebaseUser && user) return null

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {children}
      </div>
    </div>
  )
}
