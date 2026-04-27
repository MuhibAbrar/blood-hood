'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/firestore'
import TopBar from '@/components/layout/TopBar'
import type { Notification } from '@/types'

const typeIcon = (type: Notification['type']) => ({
  blood_request: '🩸',
  camp_reminder: '🏕️',
  org_announcement: '📢',
  org_approved: '✅',
  availability_reminder: '⏰',
  request_fulfilled: '✅',
  broadcast: '📣',
})[type] ?? '🔔'

const timeAgo = (date: Date): string => {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'এইমাত্র'
  if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`
  return `${Math.floor(diff / 86400)} দিন আগে`
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user) return
    try {
      const n = await getNotifications(user.uid)
      setNotifications(n)
    } catch (err) {
      console.error('Notifications fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [user])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleClick = async (notif: Notification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
    }
    const link = notif.data?.link
    if (link) router.push(link)
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    await markAllNotificationsRead(user.uid)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div>
      <TopBar
        title="নোটিফিকেশন"
        back
        action={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-[#D92B2B] font-semibold"
            >
              সব পড়া হয়েছে
            </button>
          ) : undefined
        }
      />

      <div className="px-4 py-4">
        {/* Unread badge */}
        {unreadCount > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
            <p className="text-sm text-[#D92B2B] font-medium">
              {unreadCount}টি নতুন notification
            </p>
            <span className="w-2 h-2 bg-[#D92B2B] rounded-full animate-pulse" />
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card h-20 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl mb-4">🔔</span>
            <p className="font-semibold text-[#111111]">কোনো নোটিফিকেশন নেই</p>
            <p className="text-sm text-[#555555] mt-1">
              নতুন রক্তের অনুরোধ বা আপডেট হলে এখানে দেখাবে
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full text-left card p-4 flex items-start gap-3 transition-all hover:shadow-md ${
                  !notif.read ? 'border-l-4 border-l-[#D92B2B] bg-red-50/30' : ''
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xl ${
                  !notif.read ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {typeIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${!notif.read ? 'font-bold text-[#111111]' : 'font-semibold text-[#111111]'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-[#D92B2B] rounded-full shrink-0 mt-1" />
                    )}
                  </div>
                  {notif.body && (
                    <p className="text-xs text-[#555555] mt-0.5 leading-snug line-clamp-2">
                      {notif.body}
                    </p>
                  )}
                  <p className="text-[10px] text-[#555555]/60 mt-1.5">
                    {notif.createdAt ? timeAgo(notif.createdAt.toDate()) : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
