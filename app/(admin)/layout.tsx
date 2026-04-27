'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/admin', label: 'ড্যাশবোর্ড', icon: '📊', exact: true },
  { href: '/admin/users', label: 'ব্যবহারকারী', icon: '👥' },
  { href: '/admin/camps', label: 'ক্যাম্প', icon: '🏕️' },
  { href: '/admin/organizations', label: 'সংগঠন', icon: '🏫' },
  { href: '/admin/requests', label: 'রক্তের অনুরোধ', icon: '🩸' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || user.role !== 'superadmin')) {
      router.replace('/dashboard')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <span className="text-5xl block mb-4">👑</span>
          <p className="text-[#555555]">যাচাই করা হচ্ছে...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'superadmin') return null

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex bg-[#F4F6F9]">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1a1f2e] text-white flex flex-col fixed inset-y-0 left-0 z-50">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🩸</span>
            <div>
              <p className="font-bold text-white text-sm">Blood Hood</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#D92B2B] text-white shadow-lg shadow-red-900/30'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">লগইন হিসেবে</p>
            <p className="text-sm text-white font-medium truncate mt-0.5">{user.name}</p>
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full mt-1 inline-block">
              👑 Superadmin
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <span>🚪</span> লগ আউট
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-h-screen">
        {/* Top header */}
        <header className="bg-white border-b border-[#E5E5E5] px-8 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#555555] uppercase tracking-wider">
                {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? 'Admin'}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm text-[#555555] hover:text-[#D92B2B] transition-colors flex items-center gap-1"
            >
              ← মূল App
            </Link>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
