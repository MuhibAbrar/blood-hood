'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import BottomNav from '@/components/layout/BottomNav'
import { AppBar } from '@/components/layout/TopBar'
import InAppNotification from '@/components/ui/InAppNotification'
import InstallBanner from '@/components/ui/InstallBanner'
import DonationFollowUpModal from '@/components/ui/DonationFollowUpModal'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Logged in but profile incomplete → go to register
    if (!loading && firebaseUser && !user) router.replace('/register')
  }, [loading, firebaseUser, user, router])

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

  // Logged in but profile not loaded yet — wait
  if (firebaseUser && !user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <AppBar />
      <InstallBanner />
      <InAppNotification />
      <DonationFollowUpModal />
      <main className="flex-1 pb-20 md:pb-6 md:ml-56">{children}</main>
      <BottomNav />
    </div>
  )
}
