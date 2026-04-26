'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getCamp, registerForCamp } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import TopBar from '@/components/layout/TopBar'
import { formatBanglaDate } from '@/lib/constants'
import type { Camp } from '@/types'

export default function CampDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [camp, setCamp] = useState<Camp | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)

  const reload = () => getCamp(id).then(setCamp)

  useEffect(() => {
    if (!id) return
    getCamp(id).then((c) => { setCamp(c); setLoading(false) })
  }, [id])

  const handleRegister = async () => {
    if (!user || !camp) return
    setRegistering(true)
    try {
      await registerForCamp(camp.id, user.uid)
      showToast('সফলভাবে নিবন্ধন হয়েছে!', 'success')
      await reload()
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setRegistering(false)
    }
  }

  if (loading) return <div className="px-4 py-4 animate-pulse"><div className="card h-48 bg-gray-100" /></div>
  if (!camp) return <div className="px-4 py-8 text-center text-[#555555]">ক্যাম্প পাওয়া যায়নি</div>

  const isRegistered = user ? camp.registeredDonors.includes(user.uid) : false

  return (
    <div>
      <TopBar title="ক্যাম্পের বিবরণ" back />
      <div className="px-4 py-4 space-y-4">
        <div className="card p-5 space-y-3">
          <h2 className="text-xl font-bold text-[#111111]">{camp.title}</h2>
          <div className="space-y-2 text-sm text-[#555555]">
            <p>📅 {formatBanglaDate(camp.date.toDate())}</p>
            <p>📍 {camp.venue}, {camp.area}</p>
            <p>👥 {camp.registeredDonors.length} জন নিবন্ধিত</p>
            {camp.totalCollected > 0 && <p>🩸 {camp.totalCollected} ব্যাগ রক্ত সংগ্রহ</p>}
          </div>
        </div>

        {camp.status === 'upcoming' && !isRegistered && (
          <button onClick={handleRegister} disabled={registering} className="btn-primary w-full">
            {registering ? 'নিবন্ধন হচ্ছে...' : '✓ এই ক্যাম্পে অংশ নেব'}
          </button>
        )}
        {isRegistered && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-[#1A9E6B] font-semibold">✓ আপনি নিবন্ধিত হয়েছেন</p>
          </div>
        )}
      </div>
    </div>
  )
}
