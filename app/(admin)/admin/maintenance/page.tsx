'use client'

import { useCallback, useEffect, useState } from 'react'
import { authenticatedFetch } from '@/lib/api-client'

type Preview = {
  oldNotifications: number
  oldCancelledRequests: number
  requestPreviewLimited: boolean
}

type CleanupResult = {
  deletedNotifications: number
  deletedCancelledRequests: number
  hasMore: boolean
}

export default function MaintenancePage() {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)
  const [message, setMessage] = useState('')

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await authenticatedFetch('/api/admin/data-cleanup', { cache: 'no-store' })
      if (!response.ok) throw new Error('preview-failed')
      setPreview(await response.json())
    } catch {
      setMessage('তথ্য লোড করা যায়নি। Firestore quota চালু হলে আবার চেষ্টা করুন।')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPreview() }, [loadPreview])

  const runCleanup = async () => {
    if (!preview || !window.confirm(
      `৩০ দিনের পুরোনো ${preview.oldNotifications}টি notification এবং ৯০ দিনের পুরোনো ${preview.oldCancelledRequests}টি cancelled request স্থায়ীভাবে মুছবেন?`
    )) return

    setCleaning(true)
    setMessage('')
    try {
      const response = await authenticatedFetch('/api/admin/data-cleanup', { method: 'DELETE' })
      if (!response.ok) throw new Error('cleanup-failed')
      const result = await response.json() as CleanupResult
      setMessage(
        `পরিষ্কার হয়েছে: ${result.deletedNotifications}টি notification, ${result.deletedCancelledRequests}টি cancelled request।` +
        (result.hasMore ? ' আরও data আছে—আবার Cleanup চালান।' : '')
      )
      await loadPreview()
    } catch {
      setMessage('Cleanup করা যায়নি। Firestore quota বা server configuration পরীক্ষা করুন।')
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111]">Data Maintenance</h1>
        <p className="mt-1 text-sm text-[#666]">পুরোনো operational data নিরাপদভাবে পরিষ্কার করুন।</p>
      </div>

      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
        <h2 className="font-semibold text-[#111]">Retention policy</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[#555]">
          <li>• Notification: ৩০ দিন পর মুছে যাবে</li>
          <li>• Cancelled blood request: ৯০ দিন পর মুছে যাবে</li>
          <li>• Fulfilled request ও donation history: স্বয়ংক্রিয়ভাবে মুছবে না</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
        <h2 className="font-semibold text-[#111]">এখন পরিষ্কার করা যাবে</h2>
        {loading ? (
          <div className="mt-4 h-20 animate-pulse rounded-xl bg-gray-100" />
        ) : preview ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-2xl font-bold text-blue-700">{preview.oldNotifications}</p>
              <p className="text-xs text-blue-800">পুরোনো notification</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-2xl font-bold text-orange-700">{preview.oldCancelledRequests}</p>
              <p className="text-xs text-orange-800">পুরোনো cancelled request</p>
            </div>
          </div>
        ) : null}

        {message && <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-[#555]">{message}</p>}

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={runCleanup}
            disabled={cleaning || loading || !preview || (preview.oldNotifications === 0 && preview.oldCancelledRequests === 0)}
            className="rounded-xl bg-[#D92B2B] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {cleaning ? 'পরিষ্কার হচ্ছে...' : 'পুরোনো Data Cleanup'}
          </button>
          <button
            type="button"
            onClick={loadPreview}
            disabled={loading}
            className="rounded-xl border border-[#E5E5E5] px-5 py-2.5 text-sm font-semibold text-[#555] disabled:opacity-50"
          >
            আবার হিসাব করুন
          </button>
        </div>
      </div>
    </div>
  )
}
