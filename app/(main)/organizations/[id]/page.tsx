'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getOrganization, joinOrganization } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import TopBar from '@/components/layout/TopBar'
import type { Organization } from '@/types'

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const reload = () => getOrganization(id).then(setOrg)

  useEffect(() => {
    if (!id) return
    getOrganization(id).then((o) => { setOrg(o); setLoading(false) })
  }, [id])

  const handleJoin = async () => {
    if (!user || !org) return
    setJoining(true)
    try {
      await joinOrganization(org.id, user.uid)
      await refreshUser()
      await reload()
      showToast('সফলভাবে যোগ দেওয়া হয়েছে!', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setJoining(false)
    }
  }

  if (loading) return <div className="px-4 py-4 animate-pulse"><div className="card h-48 bg-gray-100" /></div>
  if (!org) return <div className="px-4 py-8 text-center text-[#555555]">সংগঠন পাওয়া যায়নি</div>

  const isMember = user ? org.memberIds.includes(user.uid) : false

  return (
    <div>
      <TopBar title={org.name} back />
      <div className="px-4 py-4 space-y-4">
        <div className="card p-5 text-center space-y-3">
          <div className="w-20 h-20 bg-[#FDECEA] rounded-full flex items-center justify-center text-4xl mx-auto">
            {org.type === 'college' || org.type === 'university' ? '🏫' : org.type === 'ngo' ? '🤝' : '🏥'}
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold text-[#111111]">{org.name}</h2>
              {org.isVerified && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">✓ যাচাইকৃত</span>}
            </div>
            <p className="text-[#555555] text-sm mt-1">{org.area}</p>
          </div>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="font-bold text-2xl text-[#D92B2B]">{org.memberIds.length}</p>
              <p className="text-xs text-[#555555]">সদস্য</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-2xl text-[#1A9E6B]">{org.totalDonations}</p>
              <p className="text-xs text-[#555555]">মোট দান</p>
            </div>
          </div>
        </div>

        {!isMember ? (
          <button onClick={handleJoin} disabled={joining} className="btn-primary w-full">
            {joining ? 'যোগ দেওয়া হচ্ছে...' : 'এই সংগঠনে যোগ দিন'}
          </button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-[#1A9E6B] font-semibold">✓ আপনি এই সংগঠনের সদস্য</p>
          </div>
        )}
      </div>
    </div>
  )
}
export function generateStaticParams() { return [] }
