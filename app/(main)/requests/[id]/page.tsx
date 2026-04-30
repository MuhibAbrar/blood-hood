'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getBloodRequest, getDonors, respondToRequest, fulfillRequest, cancelRequest, getUsersByUids, getUserByPhone } from '@/lib/firestore'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { getCompatibleDonors } from '@/lib/bloodCompatibility'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import DonorCard from '@/components/donor/DonorCard'
import TopBar from '@/components/layout/TopBar'
import { daysSince, formatBanglaDate } from '@/lib/constants'
import { RequestCardSkeleton } from '@/components/shared/LoadingSkeleton'
import type { BloodRequest, User } from '@/types'

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [request, setRequest] = useState<BloodRequest | null>(null)
  const [compatibleDonors, setCompatibleDonors] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPhone, setShowPhone] = useState(false)

  // Fulfill modal state
  const [showFulfillModal, setShowFulfillModal] = useState(false)
  const [responders, setResponders] = useState<User[]>([])
  const [selectedDonor, setSelectedDonor] = useState<User | 'anonymous' | null>(null)
  const [phoneSearch, setPhoneSearch] = useState('')
  const [phoneSearchResult, setPhoneSearchResult] = useState<User | null | 'not_found'>(null)
  const [searchingPhone, setSearchingPhone] = useState(false)
  const [fulfilling, setFulfilling] = useState(false)

  const reload = async () => {
    if (!id) return
    const r = await getBloodRequest(id)
    setRequest(r)
  }

  useEffect(() => {
    if (!id) return
    getBloodRequest(id).then(async (r) => {
      setRequest(r)
      if (r) {
        const compatible = getCompatibleDonors(r.bloodGroup)
        const donors = await getDonors({ isAvailable: true })
        setCompatibleDonors(donors.filter((d) => compatible.includes(d.bloodGroup)).slice(0, 10))
      }
      setLoading(false)
    })
  }, [id])

  const handleRespond = async () => {
    if (!user || !request) return
    setActionLoading(true)
    try {
      await respondToRequest(request.id, user.uid)
      setShowPhone(true)
      showToast('সফলভাবে সাড়া দেওয়া হয়েছে!', 'success')
      await reload()
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const openFulfillModal = async () => {
    if (!request) return
    setSelectedDonor(null)
    setPhoneSearch('')
    setPhoneSearchResult(null)
    // Fetch responders' user data
    const users = await getUsersByUids(request.respondedBy)
    setResponders(users)
    setShowFulfillModal(true)
  }

  const handlePhoneSearch = async () => {
    if (phoneSearch.trim().length < 11) {
      showToast('পুরো নম্বর দিন (১১ সংখ্যা)', 'error')
      return
    }
    setSearchingPhone(true)
    setPhoneSearchResult(null)
    try {
      const found = await getUserByPhone(phoneSearch.trim())
      setPhoneSearchResult(found ?? 'not_found')
      if (found) setSelectedDonor(found)
      else showToast('এই নম্বরে কোনো ব্যবহারকারী পাওয়া যায়নি', 'info')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setSearchingPhone(false)
    }
  }

  const handleConfirmFulfill = async () => {
    if (!request || selectedDonor === null) return
    setFulfilling(true)
    try {
      const donorUid = selectedDonor === 'anonymous' ? null : selectedDonor.uid
      await fulfillRequest(request.id, donorUid, { bloodGroup: request.bloodGroup, hospital: request.hospital })
      showToast('অনুরোধ পূর্ণ হয়েছে! ধন্যবাদ 🩸', 'success')
      setShowFulfillModal(false)
      await reload()
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setFulfilling(false)
    }
  }

  if (loading) return <div className="px-4 py-4"><RequestCardSkeleton /></div>
  if (!request) return <div className="px-4 py-8 text-center text-[#555555]">অনুরোধ পাওয়া যায়নি</div>

  const isOwner = user?.uid === request.requestedBy
  const alreadyResponded = user ? request.respondedBy.includes(user.uid) : false
  const daysAgo = daysSince(request.createdAt.toDate())

  return (
    <div>
      <TopBar title="অনুরোধের বিবরণ" back />
      <div className="px-4 py-4 space-y-5">
        {/* Main card */}
        <div className={`card p-5 ${request.urgency === 'urgent' ? 'border-2 border-[#D92B2B]' : ''}`}>
          {request.urgency === 'urgent' && (
            <div className="bg-[#D92B2B] text-white text-sm font-semibold px-3 py-1.5 rounded-lg mb-4 flex items-center gap-2">
              🔴 জরুরি রক্তের প্রয়োজন!
            </div>
          )}
          <div className="flex items-start gap-4">
            <BloodGroupBadge group={request.bloodGroup} size="lg" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#111111]">{request.patientName}</h2>
              <p className="text-[#555555] text-sm mt-1">🏥 {request.hospital}</p>
              <p className="text-[#555555] text-sm">📍 {request.area}</p>
              <p className="text-xs text-[#555555]/70 mt-1">
                {daysAgo === 0 ? 'আজকে' : `${daysAgo} দিন আগে`} — {request.respondedBy.length} জন সাড়া দিয়েছেন
              </p>
            </div>
          </div>
          {request.note && (
            <p className="mt-3 text-sm text-[#555555] bg-gray-50 rounded-xl p-3">{request.note}</p>
          )}
        </div>

        {/* Status */}
        {request.status === 'fulfilled' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-[#1A9E6B] font-semibold text-lg">✓ এই অনুরোধ পূর্ণ হয়েছে</p>
            {request.fulfilledAt && (
              <p className="text-xs text-[#555555] mt-1">{formatBanglaDate(request.fulfilledAt.toDate())}</p>
            )}
          </div>
        )}
        {request.status === 'cancelled' && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
            <p className="text-[#555555] font-semibold">এই অনুরোধ বাতিল করা হয়েছে</p>
          </div>
        )}

        {/* Donor actions */}
        {request.status === 'open' && user && !isOwner && (
          <div className="space-y-3">
            {!alreadyResponded && !showPhone ? (
              <button onClick={handleRespond} disabled={actionLoading} className="btn-primary w-full">
                {actionLoading ? 'হচ্ছে...' : '🩸 আমি সাহায্য করতে পারব'}
              </button>
            ) : (
              <a href={`tel:${request.contactPhone}`} className="btn-primary w-full">
                📞 এখনই ফোন করুন — {request.contactPhone}
              </a>
            )}
          </div>
        )}

        {/* Owner actions */}
        {isOwner && request.status === 'open' && (
          <div className="flex gap-3">
            <button onClick={openFulfillModal} disabled={actionLoading} className="btn-primary flex-1">
              ✓ পূর্ণ হয়েছে
            </button>
            <button
              onClick={async () => {
                setActionLoading(true)
                try {
                  await cancelRequest(request.id)
                  showToast('অনুরোধ বাতিল হয়েছে', 'info')
                  await reload()
                } catch {
                  showToast('বাতিল করতে সমস্যা হয়েছে', 'error')
                } finally {
                  setActionLoading(false)
                }
              }}
              disabled={actionLoading}
              className="btn-ghost flex-1 border border-[#E5E5E5]"
            >
              {actionLoading ? 'হচ্ছে...' : 'বাতিল করুন'}
            </button>
          </div>
        )}

        {/* Compatible donors */}
        {compatibleDonors.length > 0 && (
          <div>
            <h3 className="font-semibold text-[#111111] mb-3">
              সামঞ্জস্যপূর্ণ Available ডোনার ({compatibleDonors.length} জন)
            </h3>
            <div className="space-y-3">
              {compatibleDonors.map((d) => <DonorCard key={d.uid} donor={d} />)}
            </div>
          </div>
        )}
      </div>

      {/* ===== Fulfill Modal ===== */}
      {showFulfillModal && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !fulfilling && setShowFulfillModal(false)} />
          <div className="relative bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-[#E5E5E5] shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#111111] text-lg">কে রক্ত দিয়েছেন?</h3>
                <button onClick={() => setShowFulfillModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#555555]">✕</button>
              </div>
              <p className="text-xs text-[#555555] mt-1">সাড়া দেওয়া তালিকা থেকে বা ফোন নম্বর দিয়ে খুঁজুন</p>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* Responders list */}
              {responders.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-[#111111] mb-2">
                    🙋 সাড়া দিয়েছেন ({responders.length} জন)
                  </p>
                  <div className="space-y-2">
                    {responders.map(r => {
                      const isSelected = selectedDonor !== 'anonymous' && (selectedDonor as User)?.uid === r.uid
                      return (
                      <button
                        key={r.uid}
                        onClick={() => setSelectedDonor(isSelected ? null : r)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          isSelected ? 'border-[#1A9E6B] bg-green-50' : 'border-[#E5E5E5] hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? 'border-[#1A9E6B] bg-[#1A9E6B]' : 'border-gray-300'
                        }`}>
                          {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                        <DefaultAvatar gender={r.gender} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#111111]">{r.name}</p>
                          <p className="text-xs text-[#555555]">{r.phone} · <span className="font-bold text-[#D92B2B]">{r.bloodGroup}</span></p>
                        </div>
                      </button>
                    )})}
                  </div>
                </div>
              )}

              {responders.length === 0 && (
                <div className="bg-yellow-50 rounded-xl p-3 text-sm text-yellow-700">
                  কেউ এখনো সাড়া দেননি। নিচে ফোন নম্বর দিয়ে খুঁজুন।
                </div>
              )}

              {/* Phone search */}
              <div>
                <p className="text-sm font-semibold text-[#111111] mb-2">📞 ফোন নম্বর দিয়ে খুঁজুন</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phoneSearch}
                    onChange={e => { setPhoneSearch(e.target.value); setPhoneSearchResult(null) }}
                    placeholder="01XXXXXXXXX (পুরো নম্বর)"
                    className="input-field flex-1"
                    maxLength={11}
                  />
                  <button
                    onClick={handlePhoneSearch}
                    disabled={searchingPhone || phoneSearch.length < 11}
                    className="px-4 py-2.5 bg-[#1A9E6B] text-white rounded-xl text-sm font-semibold disabled:opacity-50 shrink-0"
                  >
                    {searchingPhone ? '...' : 'খুঁজুন'}
                  </button>
                </div>

                {/* Phone search result */}
                {phoneSearchResult && phoneSearchResult !== 'not_found' && (() => {
                  const isSelected = selectedDonor !== 'anonymous' && (selectedDonor as User)?.uid === phoneSearchResult.uid
                  return (
                  <button
                    onClick={() => setSelectedDonor(isSelected ? null : phoneSearchResult)}
                    className={`mt-2 w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected ? 'border-[#1A9E6B] bg-green-50' : 'border-[#E5E5E5] hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? 'border-[#1A9E6B] bg-[#1A9E6B]' : 'border-gray-300'
                    }`}>
                      {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                    <DefaultAvatar gender={phoneSearchResult.gender} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#111111]">{phoneSearchResult.name}</p>
                      <p className="text-xs text-[#555555]">{phoneSearchResult.phone} · <span className="font-bold text-[#D92B2B]">{phoneSearchResult.bloodGroup}</span></p>
                    </div>
                  </button>
                )})()}

                {phoneSearchResult === 'not_found' && (
                  <p className="mt-2 text-xs text-[#555555] bg-gray-50 rounded-xl px-3 py-2">
                    এই নম্বরে কোনো অ্যাকাউন্ট নেই। &quot;অন্য কেউ&quot; অপশন বেছে নিন।
                  </p>
                )}
              </div>

              {/* Anonymous option */}
              <button
                onClick={() => setSelectedDonor(selectedDonor === 'anonymous' ? null : 'anonymous')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  selectedDonor === 'anonymous' ? 'border-[#D92B2B] bg-red-50' : 'border-[#E5E5E5] hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  selectedDonor === 'anonymous' ? 'border-[#D92B2B] bg-[#D92B2B]' : 'border-gray-300'
                }`}>
                  {selectedDonor === 'anonymous' && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-lg shrink-0">👤</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-[#111111]">অন্য কেউ দান করেছেন</p>
                  <p className="text-xs text-[#555555]">App এ নেই এমন কেউ রক্ত দিয়েছেন</p>
                </div>
              </button>

            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[#E5E5E5] shrink-0">
              {selectedDonor !== null && (
                <p className="text-xs text-center text-[#555555] mb-3">
                  {selectedDonor === 'anonymous'
                    ? '👤 অন্য কেউ রক্ত দিয়েছেন হিসেবে চিহ্নিত হবে'
                    : `✓ ${(selectedDonor as User).name} রক্ত দিয়েছেন হিসেবে চিহ্নিত হবে`
                  }
                </p>
              )}
              <button
                onClick={handleConfirmFulfill}
                disabled={selectedDonor === null || fulfilling}
                className="w-full py-3 rounded-xl bg-[#1A9E6B] text-white font-semibold disabled:opacity-40 transition-opacity"
              >
                {fulfilling ? 'সম্পন্ন হচ্ছে...' : '🩸 নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
