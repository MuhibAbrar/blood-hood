'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface TopBarProps {
  title: string
  back?: boolean
  action?: React.ReactNode
}

export default function TopBar({ title, back, action }: TopBarProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 bg-white border-b border-[#E5E5E5] z-40 safe-top">
      <div className="flex items-center h-14 px-4 gap-3">
        {back && (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="পিছনে যান"
          >
            <svg className="w-5 h-5 stroke-[#111111]" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <h1 className="flex-1 text-lg font-semibold text-[#111111] truncate">{title}</h1>
        {action}
      </div>
    </header>
  )
}

export function AppBar() {
  const { user, orgAdmin } = useAuth()

  return (
    <header className="sticky top-0 bg-[#D92B2B] z-40 safe-top shadow-md">
      <div className="flex items-center justify-between h-14 px-4 md:pl-4 md:pr-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🩸</span>
          <span className="text-white font-bold text-lg">Blood Hood</span>
        </Link>

        <div className="flex items-center gap-1">
          {/* Org-admin panel shortcut */}
          {orgAdmin && (
            <Link
              href="/org-admin"
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
            >
              <span>🏢</span>
              <span className="hidden xs:inline">সংগঠন</span>
            </Link>
          )}

          {/* Superadmin panel shortcut */}
          {user?.role === 'superadmin' && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
            >
              <span>👑</span>
              <span className="hidden xs:inline">অ্যাডমিন</span>
            </Link>
          )}

          {/* Notifications */}
          <Link href="/notifications" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors">
            <svg className="w-6 h-6 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
