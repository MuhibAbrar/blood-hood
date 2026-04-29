'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface GuestPromptProps {
  icon: string
  title: string
  subtitle: string
  features: string[]
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function GuestPrompt({ icon, title, subtitle, features }: GuestPromptProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
    setIsStandalone(standalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-10 text-center">
      {/* Icon */}
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#C0392B] to-[#7B241C] flex items-center justify-center text-5xl shadow-lg shadow-red-900/30 mb-6">
        {icon}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-[#111111] mb-2">{title}</h2>
      <p className="text-[#555555] text-sm leading-relaxed mb-8 max-w-xs">{subtitle}</p>

      {/* Features */}
      <div className="w-full max-w-xs bg-[#FAFAFA] rounded-2xl border border-[#F0F0F0] p-4 mb-8 text-left space-y-2.5">
        {features.map((f, i) => (
          <p key={i} className="text-sm text-[#333333] flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#FDECEA] text-[#D92B2B] flex items-center justify-center text-xs flex-shrink-0">✓</span>
            {f}
          </p>
        ))}
      </div>

      {/* Mobile CTA */}
      <div className="md:hidden w-full max-w-xs flex flex-col gap-3">
        {isStandalone ? (
          <>
            <Link href="/login" className="w-full py-3.5 rounded-2xl bg-[#D92B2B] text-white font-bold text-center text-base hover:bg-[#b82424] transition-colors">
              লগইন করুন
            </Link>
            <Link href="/register" className="w-full py-3.5 rounded-2xl border-2 border-[#D92B2B] text-[#D92B2B] font-bold text-center text-base hover:bg-red-50 transition-colors">
              রেজিস্ট্রেশন করুন
            </Link>
          </>
        ) : (
          <>
            <button
              onClick={handleInstall}
              className="w-full py-3.5 rounded-2xl bg-[#D92B2B] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-[#b82424] transition-colors"
            >
              <span>📲</span> অ্যাপ ইনস্টল করুন — বিনামূল্যে
            </button>
            <p className="text-xs text-[#888888]">ইনস্টল করে লগইন বা রেজিস্ট্রেশন করুন</p>
          </>
        )}
      </div>

      {/* PC CTA */}
      <div className="hidden md:flex w-full max-w-xs flex-col gap-3">
        <Link href="/login" className="w-full py-3.5 rounded-2xl bg-[#D92B2B] text-white font-bold text-center text-base hover:bg-[#b82424] transition-colors">
          লগইন করুন
        </Link>
        <Link href="/register" className="w-full py-3.5 rounded-2xl border-2 border-[#D92B2B] text-[#D92B2B] font-bold text-center text-base hover:bg-red-50 transition-colors">
          নতুন অ্যাকাউন্ট খুলুন
        </Link>
      </div>
    </div>
  )
}
