'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { href: '/dashboard', label: 'হোম', icon: HomeIcon },
  { href: '/donors', label: 'খুঁজুন', icon: SearchIcon },
  { href: '/requests/new', label: 'রিকোয়েস্ট', icon: BloodIcon },
  { href: '/requests', label: 'ডোনেট', icon: HeartIcon },
  { href: '/profile', label: 'প্রোফাইল', icon: UserIcon },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { user, orgAdmins } = useAuth()
  const isSuperAdmin = user?.role === 'superadmin'

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] safe-bottom z-50 md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/requests/new'
                ? pathname === '/requests/new'
                : href === '/requests'
                ? pathname.startsWith('/requests') && pathname !== '/requests/new'
                : pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active ? 'text-[#D92B2B]' : 'text-[#555555]'
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? 'stroke-[#D92B2B]' : 'stroke-[#555555]'}`} />
                <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop side nav */}
      <nav className="hidden md:flex fixed left-0 top-14 bottom-0 w-56 bg-white border-r border-[#E5E5E5] flex-col gap-1 p-3 z-40 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/requests/new'
              ? pathname === '/requests/new'
              : href === '/requests'
              ? pathname.startsWith('/requests') && pathname !== '/requests/new'
              : pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                active ? 'bg-red-50 text-[#D92B2B]' : 'text-[#555555] hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'stroke-[#D92B2B]' : 'stroke-[#555555]'}`} />
              <span className="text-sm">{label}</span>
            </Link>
          )
        })}

        {/* Org Admin Panel links */}
        {orgAdmins.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#E5E5E5]">
            <p className="text-[10px] font-semibold text-[#555555]/60 px-4 mb-1 uppercase tracking-wide">সংগঠন</p>
            {orgAdmins.map(org => (
              <Link
                key={org.id}
                href={`/org-admin?orgId=${org.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  pathname.startsWith('/org-admin') ? 'bg-green-50 text-green-700' : 'text-[#555555] hover:bg-gray-100'
                }`}
              >
                <span className="text-lg shrink-0">🏢</span>
                <div className="min-w-0">
                  <span className="text-sm block truncate">{org.name}</span>
                  <span className="text-[10px] text-[#555555]/60">অ্যাডমিন প্যানেল</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Superadmin Panel link */}
        {isSuperAdmin && (
          <div className="mt-2 pt-2 border-t border-[#E5E5E5]">
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                pathname.startsWith('/admin') ? 'bg-yellow-50 text-yellow-700' : 'text-[#555555] hover:bg-gray-100'
              }`}
            >
              <span className="text-lg shrink-0">👑</span>
              <span className="text-sm">সুপার অ্যাডমিন</span>
            </Link>
          </div>
        )}
      </nav>
    </>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
      <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BloodIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C7 8 4 12 4 15a8 8 0 0 0 16 0c0-3-3-7-8-13z" />
    </svg>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
