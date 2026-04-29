'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getOrganization, requestJoinOrg, getUserJoinRequest } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import TopBar from '@/components/layout/TopBar'
import type { Organization, JoinRequest } from '@/types'

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [org, setOrg] = useState<Organization | null>(null)
  const [joinRequest, setJoinRequest] = useState<JoinRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      const o = await getOrganization(id)
      setOrg(o)
      if (user) {
        try {
          const jr = await getUserJoinRequest(id, user.uid)
          setJoinRequest(jr)
        } catch { /* ignore */ }
      }
      setLoading(false)
    }
    fetchData()
  }, [id, user])

  const handleRequestJoin = async () => {
    if (!user || !org) return
    setRequesting(true)
    try {
      await requestJoinOrg(org.id, user)
      setJoinRequest({ id: 'pending', orgId: org.id, userId: user.uid, userName: user.name, userPhone: user.phone, userBloodGroup: user.bloodGroup, status: 'pending', createdAt: null as never })
      showToast('যোগ দেওয়ার অনুরোধ পাঠানো হয়েছে! অ্যাডমিন অনুমোদন করলে যোগ হবে।', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setRequesting(false)
    }
  }

  if (loading) return <div className="px-4 py-4 animate-pulse"><div className="card h-48 bg-gray-100" /></div>
  if (!org) return <div className="px-4 py-8 text-center text-[#555555]">সংগঠন পাওয়া যায়নি</div>

  const isMember = user ? (org.memberIds.includes(user.uid) || org.adminIds.includes(user.uid)) : false
  const hasPendingRequest = !!joinRequest

  const orgIcon = org.type === 'college' || org.type === 'university' ? '🏫' : org.type === 'ngo' ? '🤝' : org.type === 'hospital' ? '🏥' : '🏘️'
  const totalMembers = new Set([...org.memberIds, ...org.adminIds]).size

  return (
    <div>
      <TopBar title={org.name} back />
      <div className="px-4 py-4 space-y-4">
        {/* Org card */}
        <div className="card p-5 text-center space-y-3">
          <div className="w-20 h-20 bg-[#FDECEA] rounded-full flex items-center justify-center text-4xl mx-auto">
            {orgIcon}
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-[#111111]">{org.name}</h2>
              {org.isVerified && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">✓ যাচাইকৃত</span>}
            </div>
            <p className="text-[#555555] text-sm mt-1">{org.area}</p>
          </div>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="font-bold text-2xl text-[#D92B2B]">{totalMembers}</p>
              <p className="text-xs text-[#555555]">সদস্য</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-2xl text-[#1A9E6B]">{org.totalDonations}</p>
              <p className="text-xs text-[#555555]">মোট দান</p>
            </div>
          </div>
        </div>

        {/* Join status */}
        {!user ? (
          <Link href="/login" className="btn-primary w-full text-center block">
            🤝 যোগ দিতে লগইন করুন
          </Link>
        ) : isMember ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-[#1A9E6B] font-semibold text-lg">✓ আপনি এই সংগঠনের সদস্য</p>
            <p className="text-xs text-[#555555] mt-1">আপনি ক্যাম্প ও ঘোষণা পাবেন</p>
          </div>
        ) : hasPendingRequest ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-yellow-700 font-semibold">⏳ অনুরোধ পেন্ডিং</p>
            <p className="text-xs text-[#555555] mt-1">অ্যাডমিন অনুমোদন করলে আপনি সদস্য হবেন</p>
          </div>
        ) : (
          <button
            onClick={handleRequestJoin}
            disabled={requesting}
            className="btn-primary w-full"
          >
            {requesting ? 'অনুরোধ পাঠানো হচ্ছে...' : '🤝 যোগ দিতে অনুরোধ করুন'}
          </button>
        )}
      </div>
    </div>
  )
}
