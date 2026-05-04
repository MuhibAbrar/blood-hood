'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/admin', label: 'ড্যাশবোর্ড', icon: '📊', exact: true },
  { href: '/admin/users', label: 'ব্যবহারকারী', icon: '👥' },
  { href: '/admin/donations', label: 'সাম্প্রতিক দান', icon: '🩸' },
  { href: '/admin/camps', label: 'ক্যাম্প', icon: '🏕️' },
  { href: '/admin/organizations', label: 'সংগঠন', icon: '🏫' },
  { href: '/admin/requests', label: 'রক্তের অনুরোধ', icon: '❤️' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'superadmin')) router.replace('/dashboard')
  }, [loading, user, router])

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="text-center">
        <span className="text-5xl block mb-4">👑</span>
        <p className="text-[#555555]">যাচাই করা হচ্ছে...</p>
      </div>
    </div>
  )

  if (!user || user.role !== 'superadmin') return null

  const handleLogout = async () => { await logout(); router.replace('/login') }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
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
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-[#D92B2B] text-white shadow-lg shadow-red-900/30' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info + actions */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-white/40 uppercase tracking-wider">লগইন হিসেবে</p>
          <p className="text-sm text-white font-medium truncate mt-0.5">{user.name}</p>
          <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full mt-1 inline-block">👑 Superadmin</span>
        </div>
        <Link href="/dashboard" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all">
          <span>🏠</span> মূল App
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all">
          <span>🚪</span> লগ আউট
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktop fixed, mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1f2e] text-white transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="md:ml-64">
        {/* Top header */}
        <header className="bg-white border-b border-[#E5E5E5] px-4 md:px-8 py-4 sticky top-0 z-30 flex items-center gap-3">
          {/* Hamburger (mobile) */}
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-[#555555]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#111111]">
              {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? 'Admin Panel'}
            </p>
          </div>
          <Link href="/dashboard" className="text-xs text-[#555555] hover:text-[#D92B2B] transition-colors hidden md:block">
            ← মূল App
          </Link>
        </header>

        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  )
}
