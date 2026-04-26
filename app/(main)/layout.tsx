'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import BottomNav from '@/components/layout/BottomNav'
import { AppBar } from '@/components/layout/TopBar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace('/login')
  }, [loading, firebaseUser, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <span className="text-5xl block mb-4">🩸</span>
          <p className="text-[#555555]">লোড হচ্ছে...</p>
        </div>
      </div>
    )
  }

  if (!firebaseUser) return null

  // New user without profile — redirect to register
  if (firebaseUser && !user) {
    router.replace('/register')
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppBar />
      <main className="flex-1 pb-20 md:pb-6">{children}</main>
      <BottomNav />
    </div>
  )
}
