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

const orgIcon = (type: string) =>
  type === 'college' || type === 'university' ? '🏫' : type === 'ngo' ? '🤝' : type === 'hospital' ? '🏥' : '🏘️'

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [org, setOrg] = useState<Organization | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  if (loading || orgLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="text-center">
        <span className="text-5xl block mb-4">🏫</span>
        <p className="text-[#555555]">লোড হচ্ছে...</p>
      </div>
    </div>
  )

  if (!org) return null

  // Total unique people = members + admins (deduplicated)
  const totalPeople = new Set([...org.memberIds, ...org.adminIds]).size

  const handleLogout = async () => { await logout(); router.replace('/login') }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Org info */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl mb-3">
          {orgIcon(org.type)}
        </div>
        <p className="font-bold text-white text-sm leading-tight">{org.name}</p>
        <p className="text-[10px] text-white/50 uppercase tracking-wider mt-1">Org Admin Panel</p>
        {org.isVerified && (
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full mt-2 inline-block">✓ যাচাইকৃত</span>
        )}
      </div>

      {/* Stats */}
      <div className="px-5 py-3 border-b border-white/10 flex gap-6">
        <div>
          <p className="font-bold text-white text-xl">{totalPeople}</p>
          <p className="text-[10px] text-white/50">সদস্য</p>
        </div>
        <div>
          <p className="font-bold text-white text-xl">{org.totalDonations}</p>
          <p className="text-[10px] text-white/50">দান</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-[#1A9E6B] text-white shadow-lg shadow-green-900/30' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-white/40">লগইন হিসেবে</p>
          <p className="text-sm text-white font-medium truncate mt-0.5">{user?.name}</p>
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

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a2e1a] text-white transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="md:ml-64">
        <header className="bg-white border-b border-[#E5E5E5] px-4 md:px-8 py-4 sticky top-0 z-30 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-[#555555]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#111111]">
              {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? 'Org Admin'}
            </p>
            <p className="text-xs text-[#555555] hidden md:block">{org.name}</p>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  )
}
