'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { logout } from '@/lib/auth'
import { getOrgByAdmin } from '@/lib/firestore'
import type { Organization } from '@/types'

const navItems = [
  { href: '/org-admin', label: 'ড্যাশবোর্ড', icon: '📊', exact: true },
  { href: '/org-admin/members', label: 'সদস্য', icon: '👥' },
  { href: '/org-admin/camps', label: 'ক্যাম্প', icon: '🏕️' },
  { href: '/org-admin/announcements', label: 'ঘোষণা', icon: '📢' },
]

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [org, setOrg] = useState<Organization | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) { router.replace('/login'); return }
    if (!loading && user) {
      getOrgByAdmin(user.uid).then(o => {
        if (!o) { router.replace('/dashboard'); return }
        setOrg(o)
        setOrgLoading(false)
      })
    }
  }, [loading, user, router])

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <span className="text-5xl block mb-4">🏫</span>
          <p className="text-[#555555]">লোড হচ্ছে...</p>
        </div>
      </div>
    )
  }

  if (!org) return null

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex bg-[#F4F6F9]">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1a2e1a] text-white flex flex-col fixed inset-y-0 left-0 z-50">
        {/* Org info */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl mb-3">
            {org.type === 'college' || org.type === 'university' ? '🏫' : org.type === 'ngo' ? '🤝' : '🏥'}
          </div>
          <p className="font-bold text-white text-sm leading-tight">{org.name}</p>
          <p className="text-[10px] text-white/50 uppercase tracking-wider mt-1">Org Admin Panel</p>
          {org.isVerified && (
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full mt-2 inline-block">✓ যাচাইকৃত</span>
          )}
        </div>

        {/* Stats */}
        <div className="px-5 py-3 border-b border-white/10 flex gap-4">
          <div className="text-center">
            <p className="font-bold text-white text-lg">{org.memberIds.length}</p>
            <p className="text-[10px] text-white/50">সদস্য</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-lg">{org.totalDonations}</p>
            <p className="text-[10px] text-white/50">দান</p>
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
                    ? 'bg-[#1A9E6B] text-white shadow-lg shadow-green-900/30'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-white/40">লগইন হিসেবে</p>
            <p className="text-sm text-white font-medium truncate mt-0.5">{user?.name}</p>
          </div>
          <Link href="/dashboard" className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all">
            <span>🏠</span> মূল App
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all mt-1">
            <span>🚪</span> লগ আউট
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 flex-1 min-h-screen">
        <header className="bg-white border-b border-[#E5E5E5] px-8 py-4 sticky top-0 z-40">
          <p className="text-xs text-[#555555] uppercase tracking-wider">
            {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? 'Org Admin'}
          </p>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
