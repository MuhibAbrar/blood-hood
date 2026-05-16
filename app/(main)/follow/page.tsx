'use client'

import { useEffect, useState } from 'react'
import { getSocialLinks, type SocialLinks } from '@/lib/firestore'
import TopBar from '@/components/layout/TopBar'

const PLATFORMS = [
  {
    key: 'facebook' as keyof SocialLinks,
    label: 'Facebook',
    color: 'bg-blue-600',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-100',
    bg: 'bg-blue-50',
    icon: (
      <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
  },
  {
    key: 'instagram' as keyof SocialLinks,
    label: 'Instagram',
    color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    textColor: 'text-pink-600',
    borderColor: 'border-pink-100',
    bg: 'bg-pink-50',
    icon: (
      <svg className="w-6 h-6 stroke-white fill-none" viewBox="0 0 24 24" strokeWidth={1.8}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="white"/>
      </svg>
    ),
  },
  {
    key: 'youtube' as keyof SocialLinks,
    label: 'YouTube',
    color: 'bg-red-600',
    textColor: 'text-red-600',
    borderColor: 'border-red-100',
    bg: 'bg-red-50',
    icon: (
      <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
        <polygon fill="red" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
      </svg>
    ),
  },
  {
    key: 'whatsapp' as keyof SocialLinks,
    label: 'WhatsApp',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-100',
    bg: 'bg-green-50',
    icon: (
      <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
      </svg>
    ),
    isPhone: true,
  },
  {
    key: 'website' as keyof SocialLinks,
    label: 'Website',
    color: 'bg-[#D92B2B]',
    textColor: 'text-[#D92B2B]',
    borderColor: 'border-red-100',
    bg: 'bg-red-50',
    icon: (
      <svg className="w-6 h-6 stroke-white fill-none" viewBox="0 0 24 24" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
]

export default function FollowPage() {
  const [links, setLinks] = useState<SocialLinks>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSocialLinks().then((l) => { setLinks(l); setLoading(false) })
  }, [])

  const activePlatforms = PLATFORMS.filter(p => links[p.key])

  const getHref = (p: typeof PLATFORMS[0]) => {
    const val = links[p.key] ?? ''
    if (p.key === 'whatsapp') return `https://wa.me/${val.replace(/\D/g, '')}`
    return val.startsWith('http') ? val : `https://${val}`
  }

  return (
    <div>
      <TopBar title="আমাদের Follow করুন" />
      <div className="px-4 py-6 space-y-4">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-[#D92B2B] flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
              <path d="M12 2C7 8 4 12 4 15a8 8 0 0 0 16 0c0-3-3-7-8-13z"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#111]">Blood Hood</h2>
          <p className="text-sm text-[#555] mt-1">রক্তের বন্ধন — আমাদের সাথে থাকুন</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse"/>
            ))}
          </div>
        ) : activePlatforms.length === 0 ? (
          <div className="text-center py-12 text-[#888] text-sm">
            <p>এখনো কোনো লিংক যোগ করা হয়নি।</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePlatforms.map((p) => (
              <a
                key={p.key}
                href={getHref(p)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-4 p-4 rounded-2xl border ${p.borderColor} ${p.bg} transition-all active:scale-[0.98]`}
              >
                <div className={`w-12 h-12 rounded-2xl ${p.color} flex items-center justify-center shrink-0 shadow-sm`}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${p.textColor}`}>{p.label}</p>
                  <p className="text-xs text-[#777] truncate mt-0.5">{links[p.key]}</p>
                </div>
                <svg className="w-5 h-5 stroke-[#AAA] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6"/>
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
