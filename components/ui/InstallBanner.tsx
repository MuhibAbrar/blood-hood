'use client'

import { useEffect, useState } from 'react'

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true) // assume standalone until checked

  useEffect(() => {
    // Check if already running as installed PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)

    setIsStandalone(standalone)

    // Listen for install prompt (only fires in browser, not in installed PWA)
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    prompt.prompt()
    const result = await prompt.userChoice
    if (result.outcome === 'accepted') {
      setPrompt(null)
    }
  }

  // Hide if: already installed, no prompt available, or dismissed
  if (isStandalone || !prompt || dismissed) return null

  return (
    <div className="bg-[#1A9E6B] text-white flex items-center justify-between px-4 py-2.5 gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xl shrink-0">📲</span>
        <p className="text-sm font-medium leading-tight">
          <span className="font-bold">Blood Hood</span> অ্যাপ ইনস্টল করুন
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-white text-[#1A9E6B] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
        >
          ইনস্টল
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white p-1"
          aria-label="বন্ধ করুন"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// TypeScript type for the non-standard beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
