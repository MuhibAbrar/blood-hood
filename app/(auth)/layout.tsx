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

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {children}
      </div>
    </div>
  )
}
