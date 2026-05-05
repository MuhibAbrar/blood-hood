'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onForegroundMessage } from '@/lib/notifications'

let audioCtx: AudioContext | null = null
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx || audioCtx.state === 'closed') {
    try { audioCtx = new AudioContext() } catch { return null }
  }
  return audioCtx
}

interface NotifPayload {
  title: string
  body: string
  link?: string
}

export default function InAppNotification() {
  const router = useRouter()
  const [notif, setNotif] = useState<NotifPayload | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    onForegroundMessage((payload: unknown) => {
      const p = payload as {
        notification?: { title?: string; body?: string }
        data?: { link?: string }
      }
      const title = p?.notification?.title
      const body = p?.notification?.body
      if (!title) return

      setNotif({ title, body: body ?? '', link: p?.data?.link })
      setVisible(true)

      // ৫ সেকেন্ড পর auto hide
      setTimeout(() => setVisible(false), 5000)

      // Sound play করি
      try {
        const ctx = getAudioCtx()
        if (ctx) {
          const oscillator = ctx.createOscillator()
          const gain = ctx.createGain()
          oscillator.connect(gain)
          gain.connect(ctx.destination)
          oscillator.frequency.setValueAtTime(880, ctx.currentTime)
          oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
          gain.gain.setValueAtTime(0.3, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.4)
        }
      } catch {}
    }).then((unsub) => {
      if (typeof unsub === 'function') unsubscribe = unsub
    })

    return () => { if (unsubscribe) unsubscribe() }
  }, [])

  if (!visible || !notif) return null

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm animate-in"
      style={{ animation: 'slideDown 0.3s ease' }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div
        onClick={() => {
          setVisible(false)
          if (notif.link) router.push(notif.link)
        }}
        className="bg-[#1a1f2e] text-white rounded-2xl p-4 shadow-2xl cursor-pointer flex items-start gap-3"
      >
        <span className="text-2xl shrink-0">🩸</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{notif.title}</p>
          {notif.body && <p className="text-white/70 text-xs mt-0.5 leading-snug">{notif.body}</p>}
        </div>
        <button
          onClick={e => { e.stopPropagation(); setVisible(false) }}
          className="text-white/50 hover:text-white text-lg leading-none shrink-0 mt-0.5"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/20 rounded-full mx-4 mt-1 overflow-hidden">
        <div
          className="h-full bg-[#D92B2B] rounded-full"
          style={{ animation: 'shrink 5s linear forwards' }}
        />
      </div>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}
