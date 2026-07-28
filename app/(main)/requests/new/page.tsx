'use client'

import { useEffect, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createBloodRequest } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import { BLOOD_GROUPS, BLOOD_GROUP_COLORS } from '@/lib/bloodCompatibility'
import { DISTRICTS, DISTRICTS_DATA } from '@/lib/constants'
import SelectPicker from '@/components/ui/SelectPicker'
import TopBar from '@/components/layout/TopBar'
import HospitalInput from '@/components/ui/HospitalInput'
import GuestPrompt from '@/components/ui/GuestPrompt'
import type { BloodGroup, Urgency } from '@/types'

const PROBLEM_OPTIONS = ['অপারেশন', 'দুর্ঘটনা', 'প্রসূতি/ডেলিভারি', 'থ্যালাসেমিয়া', 'ক্যানসার', 'ডায়ালাইসিস', 'রক্তস্বল্পতা', 'অন্যান্য']
const RELATION_OPTIONS = ['নিজে', 'পরিবারের সদস্য', 'আত্মীয়', 'বন্ধু', 'সংগঠনের স্বেচ্ছাসেবক', 'হাসপাতালের প্রতিনিধি', 'অন্যান্য']
const BLOCKED_TEXT = new Set(['test', 'testing', 'xxx', 'xxxx', 'unknown', 'none', 'n/a', 'জানি না', 'নাই', 'কেউ না'])

function validateMeaningfulName(value: string, label: string): string | null {
  const text = value.trim().replace(/\s+/g, ' ')
  if (text.length < 3) return `${label} অন্তত ৩ অক্ষরের হতে হবে`
  if (text.length > 80) return `${label} ৮০ অক্ষরের মধ্যে লিখুন`
  if (BLOCKED_TEXT.has(text.toLowerCase())) return `সঠিক ${label} লিখুন`
  if (!/^[A-Za-z\u0980-\u09FF][A-Za-z\u0980-\u09FF\s.'’-]*$/.test(text)) {
    return `${label}-এ শুধু বাংলা/ইংরেজি অক্ষর ব্যবহার করুন`
  }
  if (text.replace(/[^A-Za-z\u0980-\u09FF]/g, '').length < 3) return `সঠিক ${label} লিখুন`
  return null
}

function normalizedPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.startsWith('880') && digits.length === 13 ? digits.slice(2) : digits
}

export default function NewRequestPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [form, setForm] = useState({
    patientName: '',
    patientProblem: '',
    otherProblem: '',
    bloodGroup: '' as BloodGroup | '',
    hospital: '',
    district: user?.district ?? '',
    area: '',
    contactPhone: '',
    urgency: 'normal' as Urgency,
    bags: 1,
    neededAt: '',
    requesterRelation: '',
    confirmedAccurate: false,
  })

  useEffect(() => {
    if (!user) return
    setForm(f => ({
      ...f,
      district: f.district || user.district || '',
      contactPhone: f.contactPhone || user.phone || '',
    }))
  }, [user])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))
  const setHospital = (val: string) => setForm(f => ({ ...f, hospital: val }))

  const validateForm = () => {
    const patientNameError = validateMeaningfulName(form.patientName, 'রোগীর পূর্ণ নাম')
    if (patientNameError) return patientNameError
    if (!form.patientProblem) return 'রোগীর সমস্যা নির্বাচন করুন'
    if (form.patientProblem === 'অন্যান্য') {
      const problemError = validateMeaningfulName(form.otherProblem, 'রোগীর সমস্যা')
      if (problemError) return problemError
    }
    if (!form.bloodGroup) return 'রক্তের গ্রুপ নির্বাচন করুন'
    const hospitalError = validateMeaningfulName(form.hospital, 'হাসপাতালের সঠিক নাম')
    if (hospitalError) return hospitalError
    if (!form.district) return 'জেলা নির্বাচন করুন'
    if (!form.area) return 'উপজেলা/থানা নির্বাচন করুন'
    if (!form.neededAt) return 'কবে রক্ত লাগবে তারিখ ও সময় দিন'
    if (new Date(form.neededAt).getTime() <= Date.now()) return 'রক্ত লাগার সময় বর্তমান সময়ের পরে হতে হবে'
    if (!form.requesterRelation) return 'রোগীর সঙ্গে আপনার সম্পর্ক নির্বাচন করুন'
    if (!/^01[3-9]\d{8}$/.test(normalizedPhone(form.contactPhone))) return 'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন'
    if (!form.confirmedAccurate) return 'তথ্য সঠিক হওয়ার নিশ্চয়তা দিন'
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { router.replace('/login'); return }
    const error = validateForm()
    if (error) {
      showToast(error, 'error')
      return
    }
    setShowPreview(true)
  }

  const publishRequest = async () => {
    if (!user || loading) return
    setLoading(true)
    try {
      const id = await createBloodRequest({
        patientName: form.patientName.trim().replace(/\s+/g, ' '),
        patientProblem: form.patientProblem === 'অন্যান্য' ? form.otherProblem.trim() : form.patientProblem,
        bloodGroup: form.bloodGroup as BloodGroup,
        hospital: form.hospital.trim().replace(/\s+/g, ' '),
        district: form.district || undefined,
        area: form.area,
        contactPhone: normalizedPhone(form.contactPhone),
        requesterRelation: form.requesterRelation,
        requestedBy: user.uid,
        urgency: form.urgency,
        bags: form.bags,
        orgId: null,
        note: null,
        neededAt: Timestamp.fromDate(new Date(form.neededAt)),
        confirmedAccurate: true,
      })
      showToast('সফলভাবে অনুরোধ পাঠানো হয়েছে!', 'success')
      router.replace(`/requests/${id}`)
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return (
    <div>
      <TopBar title="রক্তের অনুরোধ" back />
      <GuestPrompt
        icon="🩸"
        title="রক্তের অনুরোধ দিন"
        subtitle="জরুরি রক্তের প্রয়োজনে অনুরোধ দিন — আপনার জেলার ডোনাররা দ্রুত জানতে পারবেন।"
        features={[
          'জরুরি বা সাধারণ request করুন',
          'হাসপাতাল ও এলাকা উল্লেখ করুন',
          'ডোনাররা সরাসরি কল করবেন',
          'সম্পূর্ণ বিনামূল্যে',
        ]}
      />
    </div>
  )

  return (
    <div>
      <TopBar title="রক্তের অনুরোধ" back />
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-[#111111] mb-2">জরুরি স্তর *</label>
          <div className="flex gap-3">
            {(['normal', 'urgent'] as Urgency[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setForm((f) => ({ ...f, urgency: u }))}
                className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-colors ${
                  form.urgency === u
                    ? u === 'urgent' ? 'bg-[#D92B2B] text-white border-[#D92B2B]' : 'bg-[#1A9E6B] text-white border-[#1A9E6B]'
                    : 'border-[#E5E5E5] text-[#555555]'
                }`}
              >
                {u === 'urgent' ? '🔴 জরুরি' : '🟢 সাধারণ'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">রোগীর নাম *</label>
          <input
            value={form.patientName}
            onChange={set('patientName')}
            placeholder="রোগীর সঠিক পূর্ণ নাম"
            className="input-field"
            maxLength={80}
            autoComplete="name"
          />
          <p className="text-xs text-[#777] mt-1">সংক্ষিপ্ত নাম, চিহ্ন বা test লেখা গ্রহণ করা হবে না।</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">রোগীর সমস্যা *</label>
          <SelectPicker
            value={form.patientProblem}
            onChange={(val) => setForm(f => ({ ...f, patientProblem: val, otherProblem: val === 'অন্যান্য' ? f.otherProblem : '' }))}
            options={PROBLEM_OPTIONS}
            placeholder="রোগীর সমস্যা নির্বাচন করুন"
          />
          {form.patientProblem === 'অন্যান্য' && (
            <input
              value={form.otherProblem}
              onChange={set('otherProblem')}
              placeholder="রোগীর সমস্যাটি স্পষ্টভাবে লিখুন"
              className="input-field mt-2"
              maxLength={80}
            />
          )}
        </div>

        {/* Blood group */}
        <div>
          <label className="block text-sm font-medium text-[#111111] mb-2">রক্তের গ্রুপ *</label>
          <div className="grid grid-cols-4 gap-2">
            {BLOOD_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setForm((f) => ({ ...f, bloodGroup: g }))}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  form.bloodGroup === g
                    ? `${BLOOD_GROUP_COLORS[g]} scale-105 shadow-md`
                    : 'bg-gray-100 text-[#555555] hover:bg-gray-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">হাসপাতাল *</label>
          <HospitalInput value={form.hospital} onChange={setHospital} />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">জেলা *</label>
          <SelectPicker
            value={form.district}
            onChange={(val) => setForm((f) => ({ ...f, district: val, area: '' }))}
            options={DISTRICTS}
            placeholder="জেলা নির্বাচন করুন"
          />
        </div>
        {form.district && (
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">উপজেলা / থানা *</label>
            <SelectPicker
              value={form.area}
              onChange={(val) => setForm((f) => ({ ...f, area: val }))}
              options={DISTRICTS_DATA[form.district] ?? []}
              placeholder="উপজেলা নির্বাচন করুন"
              searchable
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">যোগাযোগ নম্বর *</label>
          <input value={form.contactPhone} onChange={set('contactPhone')} placeholder="01XXXXXXXXX" className="input-field" type="tel" inputMode="numeric" maxLength={14} />
        </div>

        {/* Bags count */}
        <div>
          <label className="block text-sm font-medium text-[#111111] mb-2">কয় ব্যাগ রক্ত লাগবে?</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, bags: Math.max(1, f.bags - 1) }))}
              className="w-11 h-11 rounded-xl border-2 border-[#E5E5E5] flex items-center justify-center text-xl font-bold text-[#555555] hover:border-[#D92B2B] hover:text-[#D92B2B] transition-colors disabled:opacity-40"
              disabled={form.bags <= 1}
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-[#D92B2B]">{form.bags}</span>
              <span className="text-sm text-[#555555] ml-1">ব্যাগ</span>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, bags: Math.min(10, f.bags + 1) }))}
              className="w-11 h-11 rounded-xl border-2 border-[#E5E5E5] flex items-center justify-center text-xl font-bold text-[#555555] hover:border-[#1A9E6B] hover:text-[#1A9E6B] transition-colors disabled:opacity-40"
              disabled={form.bags >= 10}
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">কবে রক্ত লাগবে? *</label>
          <input
            value={form.neededAt}
            onChange={set('neededAt')}
            type="datetime-local"
            min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">রোগীর সঙ্গে আপনার সম্পর্ক *</label>
          <SelectPicker
            value={form.requesterRelation}
            onChange={(val) => setForm(f => ({ ...f, requesterRelation: val }))}
            options={RELATION_OPTIONS}
            placeholder="সম্পর্ক নির্বাচন করুন"
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={form.confirmedAccurate}
            onChange={e => setForm(f => ({ ...f, confirmedAccurate: e.target.checked }))}
            className="mt-1 h-4 w-4 accent-[#D92B2B]"
          />
          <span className="text-sm leading-6 text-[#333]">
            আমি নিশ্চিত করছি যে তথ্যগুলো সঠিক এবং রোগী/পরিবারের অনুমতি নিয়ে অনুরোধটি প্রকাশ করছি।
          </span>
        </label>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              পাঠানো হচ্ছে...
            </span>
          ) : 'অনুরোধটি যাচাই করুন'}
        </button>
      </form>

      {showPreview && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 md:items-center">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl md:rounded-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#111]">অনুরোধটি যাচাই করুন</h2>
                <p className="text-xs text-[#666] mt-1">প্রকাশের আগে সব তথ্য আরেকবার মিলিয়ে নিন।</p>
              </div>
              <button type="button" onClick={() => setShowPreview(false)} className="h-9 w-9 rounded-full bg-gray-100 text-lg">×</button>
            </div>

            <div className="mt-4 rounded-2xl border border-[#E5E5E5] p-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-[#666]">রোগীর নাম</span><strong className="text-right">{form.patientName.trim()}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#666]">সমস্যা</span><strong className="text-right">{form.patientProblem === 'অন্যান্য' ? form.otherProblem.trim() : form.patientProblem}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#666]">রক্ত</span><strong className="text-[#D92B2B]">{form.bloodGroup} · {form.bags} ব্যাগ</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#666]">হাসপাতাল</span><strong className="text-right">{form.hospital.trim()}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#666]">স্থান</span><strong className="text-right">{form.area}, {form.district}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#666]">সময়</span><strong className="text-right">{new Date(form.neededAt).toLocaleString('bn-BD')}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#666]">যোগাযোগ</span><strong className="text-right">{normalizedPhone(form.contactPhone)}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#666]">সম্পর্ক</span><strong className="text-right">{form.requesterRelation}</strong></div>
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowPreview(false)} disabled={loading} className="btn-ghost flex-1 border border-[#E5E5E5]">সম্পাদনা করুন</button>
              <button type="button" onClick={publishRequest} disabled={loading} className="btn-primary flex-1">
                {loading ? 'প্রকাশ হচ্ছে...' : 'অনুরোধ প্রকাশ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
