'use client'

import { useEffect, useState } from 'react'
import { getSocialLinks, type SocialLinks } from '@/lib/firestore'
import TopBar from '@/components/layout/TopBar'

export default function ContactPage() {
  const [links, setLinks] = useState<SocialLinks>({})

  useEffect(() => {
    getSocialLinks().then(setLinks)
  }, [])

  const items = [
    links.phone && {
      label: 'ফোন করুন',
      value: links.phone,
      href: `tel:${links.phone}`,
      icon: (
        <svg className="w-5 h-5 stroke-[#1A9E6B]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.07 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 17z"/>
        </svg>
      ),
      bg: 'bg-green-50', border: 'border-green-100',
    },
    links.whatsapp && {
      label: 'WhatsApp করুন',
      value: links.whatsapp,
      href: `https://wa.me/${links.whatsapp.replace(/\D/g, '')}`,
      icon: (
        <svg className="w-5 h-5 fill-green-500" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
        </svg>
      ),
      bg: 'bg-green-50', border: 'border-green-100',
    },
    links.email && {
      label: 'ইমেইল করুন',
      value: links.email,
      href: `mailto:${links.email}`,
      icon: (
        <svg className="w-5 h-5 stroke-[#D92B2B]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline strokeLinecap="round" strokeLinejoin="round" points="22,6 12,13 2,6"/>
        </svg>
      ),
      bg: 'bg-red-50', border: 'border-red-100',
    },
    links.facebook && {
      label: 'Facebook Page',
      value: links.facebook,
      href: links.facebook,
      icon: (
        <svg className="w-5 h-5 fill-blue-600" viewBox="0 0 24 24">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
      ),
      bg: 'bg-blue-50', border: 'border-blue-100',
    },
  ].filter(Boolean) as { label: string; value: string; href: string; icon: React.ReactNode; bg: string; border: string }[]

  return (
    <div>
      <TopBar title="যোগাযোগ করুন" />
      <div className="px-4 py-6 space-y-6">
        <div className="text-center py-2">
          <div className="w-16 h-16 rounded-full bg-[#D92B2B] flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 stroke-white fill-none" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.07 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 17z"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#111]">আমাদের সাথে যোগাযোগ করুন</h2>
          <p className="text-sm text-[#555] mt-1">যেকোনো প্রশ্ন বা সাহায্যের জন্য</p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-[#888] text-sm">যোগাযোগের তথ্য এখনো যোগ করা হয়নি।</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className={`flex items-center gap-4 p-4 rounded-2xl border ${item.border} ${item.bg} active:scale-[0.98] transition-all`}
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#111]">{item.label}</p>
                  <p className="text-xs text-[#777] truncate mt-0.5">{item.value}</p>
                </div>
                <svg className="w-5 h-5 stroke-[#AAA] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6"/>
                </svg>
              </a>
            ))}
          </div>
        )}

        <div className="card p-4 text-center space-y-1">
          <p className="text-xs text-[#888]">Blood Hood</p>
          <p className="text-xs text-[#888]">রক্তের বন্ধন, বাংলাদেশ</p>
        </div>
      </div>
    </div>
  )
}
