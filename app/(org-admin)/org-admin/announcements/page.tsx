'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getOrgByAdmin, getAnnouncements, createAnnouncement, deleteAnnouncement } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import { formatBanglaDate } from '@/lib/constants'
import type { Organization, Announcement } from '@/types'

export default function OrgAnnouncementsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [org, setOrg] = useState<Organization | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', message: '' })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null)
  const [notifying, setNotifying] = useState(false)

  const load = async () => {
    if (!user) return
    const o = await getOrgByAdmin(user.uid)
    if (!o) return
    setOrg(o)
    const a = await getAnnouncements(o.id)
    setAnnouncements(a)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleSave = async () => {
    if (!form.title || !form.message) { showToast('সব তথ্য পূরণ করুন', 'error'); return }
    if (!user || !org) return
    setSaving(true)
    try {
      await createAnnouncement({ orgId: org.id, title: form.title, message: form.message, createdBy: user.uid })

      // Notify members
      if (org.memberIds.length > 0) {
        setNotifying(true)
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'org_announcement',
            data: { orgId: org.id, orgName: org.name, message: form.message, memberIds: org.memberIds },
          }),
        })
        setNotifying(false)
      }

      showToast('ঘোষণা প্রকাশিত হয়েছে এবং সদস্যদের notification পাঠানো হয়েছে', 'success')
      setForm({ title: '', message: '' })
      setShowModal(false)
      await load()
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setSaving(false)
      setNotifying(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteAnnouncement(confirmDelete.id)
      setConfirmDelete(null)
      await load()
      showToast('ঘোষণা মুছে ফেলা হয়েছে', 'success')
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">ঘোষণা</h1>
          <p className="text-[#555555] text-sm mt-1">
            প্রকাশ করলে {org?.memberIds.length ?? 0} জন সদস্যকে notification পাঠানো হবে
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#1A9E6B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#158a5c] transition-colors shadow-md shadow-green-200"
        >
          + নতুন ঘোষণা
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-[#E5E5E5] animate-pulse" />)
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
            <span className="text-4xl block mb-3">📢</span>
            <p className="text-[#555555]">কোনো ঘোষণা নেই — নতুন তৈরি করুন</p>
          </div>
        ) : announcements.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-[#111111]">{a.title}</h3>
                <p className="text-sm text-[#555555] mt-1 leading-relaxed">{a.message}</p>
                <p className="text-xs text-[#555555]/60 mt-2">{formatBanglaDate(a.createdAt.toDate())}</p>
              </div>
              <button
                onClick={() => setConfirmDelete(a)}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-[#D92B2B] hover:bg-red-100 font-medium transition-colors shrink-0"
              >
                মুছুন
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 className="font-bold text-[#111111]">নতুন ঘোষণা</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#555555]">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">শিরোনাম *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="যেমন: আগামী ক্যাম্পের ঘোষণা"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">বিস্তারিত *</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="ঘোষণার বিস্তারিত লিখুন..."
                  rows={4}
                  className="input-field resize-none"
                />
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                📱 এই ঘোষণা প্রকাশ হলে <span className="font-bold">{org?.memberIds.length} জন</span> সদস্যের phone-এ notification যাবে
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E5E5E5] flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium">বাতিল</button>
              <button onClick={handleSave} disabled={saving || notifying} className="flex-1 py-2.5 rounded-xl bg-[#1A9E6B] text-white text-sm font-semibold hover:bg-[#158a5c] transition-colors">
                {notifying ? 'notification পাঠানো হচ্ছে...' : saving ? 'প্রকাশ হচ্ছে...' : '📢 প্রকাশ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <span className="text-4xl block mb-3">🗑️</span>
            <h3 className="font-bold text-[#111111] text-lg mb-2">ঘোষণা মুছে ফেলবেন?</h3>
            <p className="text-[#555555] text-sm mb-5">&ldquo;{confirmDelete.title}&rdquo;</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm">বাতিল</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold">মুছুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
