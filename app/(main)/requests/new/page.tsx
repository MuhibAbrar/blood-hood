'use client'

import { useEffect, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createBloodRequest } from '@/lib/firestore'
import { useToast } from '@/components/ui/Toast'
import { BLOOD_GROUPS, BLOOD_GROUP_COLORS } from '@/lib/bloodCompatibility'
import { DISTRICTS_DATA } from '@/lib/constants'
import SelectPicker from '@/components/ui/SelectPicker'
import TopBar from '@/components/layout/TopBar'
import HospitalInput from '@/components/ui/HospitalInput'
import GuestPrompt from '@/components/ui/GuestPrompt'
import type { BloodGroup, Urgency } from '@/types'

const PROBLEM_OPTIONS = ['অপারেশন', 'দুর্ঘটনা', 'প্রসূতি/ডেলিভারি', 'থ্যালাসেমিয়া', 'ক্যানসার', 'ডায়ালাইসিস', 'রক্তস্বল্পতা', 'অন্যান্য']
const RELATION_OPTIONS = ['নিজে', 'পরিবারের সদস্য', 'আত্মীয়', 'বন্ধু', 'সংগঠনের স্বেচ্ছাসেবক', 'হাসপাতালের প্রতিনিধি', 'অন্যান্য']
const BANGLA_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']
const BLOCKED_TEXT = new Set(['test', 'testing', 'xxx', 'xxxx', 'unknown', 'none', 'n/a', 'জানি না', 'নাই', 'কেউ না'])
const toBanglaDigits = (value: string | number) =>
  String(value).replace(/\d/g, digit => '০১২৩৪৫৬৭৮৯'[Number(digit)])

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
    neededDay: '',
    neededMonth: '',
    neededYear: '',
    requesterRelation: '',
    otherRelation: '',
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
  const setDatePart = (part: 'neededDay' | 'neededMonth' | 'neededYear', value: string) => {
    setForm(current => {
      const next = { ...current, [part]: value }
      const year = Number(next.neededYear)
      const month = Number(next.neededMonth)
      const maxDay = year && month ? new Date(year, month, 0).getDate() : 31
      if (Number(next.neededDay) > maxDay) next.neededDay = ''
      next.neededAt = next.neededDay && next.neededMonth && next.neededYear
        ? `${next.neededYear}-${next.neededMonth.padStart(2, '0')}-${next.neededDay.padStart(2, '0')}`
        : ''
      return next
    })
  }

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
    if (!form.district) return 'আপনার profile-এ জেলা দেওয়া নেই। আগে profile থেকে জেলা নির্বাচন করুন'
    if (!form.area) return 'উপজেলা/থানা নির্বাচন করুন'
    if (!form.neededAt) return 'কবে রক্ত লাগবে তারিখ দিন'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (new Date(`${form.neededAt}T00:00:00`).getTime() < today.getTime()) return 'অতীতের তারিখ দেওয়া যাবে না'
    if (!form.requesterRelation) return 'রোগীর সঙ্গে আপনার সম্পর্ক নির্বাচন করুন'
    if (form.requesterRelation === 'অন্যান্য') {
      const relationError = validateMeaningfulName(form.otherRelation, 'সম্পর্ক')
      if (relationError) return relationError
    }
    if (!Number.isInteger(form.bags) || form.bags < 1 || form.bags > 10) return 'কত ব্যাগ রক্ত লাগবে নির্বাচন করুন'
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
        requesterRelation: form.requesterRelation === 'অন্যান্য' ? form.otherRelation.trim() : form.requesterRelation,
        requestedBy: user.uid,
        urgency: form.urgency,
        bags: form.bags,
        orgId: null,
        note: null,
        neededAt: Timestamp.fromDate(new Date(`${form.neededAt}T12:00:00`)),
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
      <form onSubmit={handleSubmit} className="px-4 pt-4 pb-28 space-y-4">
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
          <label className="block text-sm font-medium text-[#111111] mb-1.5">জেলা</label>
          <div className={`input-field flex items-center justify-between ${form.district ? 'bg-gray-50' : 'border-red-300 bg-red-50'}`}>
            <span>{form.district || 'Profile-এ জেলা দেওয়া নেই'}</span>
            <span className="text-xs text-[#777]">Profile থেকে নেওয়া</span>
          </div>
          {!form.district && (
            <p className="mt-1 text-xs text-[#D92B2B]">Request দেওয়ার আগে profile থেকে জেলা নির্বাচন করুন।</p>
          )}
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
          <label className="block text-sm font-medium text-[#111111] mb-2">কয় ব্যাগ রক্ত লাগবে? *</label>
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
          <div className="rounded-2xl border-2 border-[#E5E5E5] bg-white p-3">
            <div className="mb-3 flex items-center gap-2 text-sm text-[#555]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">📅</span>
              <span>প্রয়োজনের দিন, মাস ও বছর নির্বাচন করুন</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="mb-1 block text-center text-xs font-semibold text-[#666]">দিন</span>
                <select
                  value={form.neededDay}
                  onChange={event => setDatePart('neededDay', event.target.value)}
                  className="input-field appearance-none px-2 text-center font-semibold"
                >
                  <option value="">দিন</option>
                  {Array.from({
                    length: form.neededMonth && form.neededYear
                      ? new Date(Number(form.neededYear), Number(form.neededMonth), 0).getDate()
                      : 31,
                  }, (_, index) => index + 1).map(day => (
                    <option key={day} value={day}>{toBanglaDigits(day)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-center text-xs font-semibold text-[#666]">মাস</span>
                <select
                  value={form.neededMonth}
                  onChange={event => setDatePart('neededMonth', event.target.value)}
                  className="input-field appearance-none px-1 text-center font-semibold"
                >
                  <option value="">মাস</option>
                  {BANGLA_MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-center text-xs font-semibold text-[#666]">বছর</span>
                <select
                  value={form.neededYear}
                  onChange={event => setDatePart('neededYear', event.target.value)}
                  className="input-field appearance-none px-2 text-center font-semibold"
                >
                  <option value="">বছর</option>
                  {[new Date().getFullYear(), new Date().getFullYear() + 1].map(year => (
                    <option key={year} value={year}>{toBanglaDigits(year)}</option>
                  ))}
                </select>
              </label>
            </div>
            {form.neededAt && (
              <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-center text-sm font-semibold text-[#1A9E6B]">
                নির্বাচিত তারিখ: {toBanglaDigits(form.neededDay)} {BANGLA_MONTHS[Number(form.neededMonth) - 1]} {toBanglaDigits(form.neededYear)}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111] mb-1.5">রোগীর সঙ্গে আপনার সম্পর্ক *</label>
          <SelectPicker
            value={form.requesterRelation}
            onChange={(val) => setForm(f => ({ ...f, requesterRelation: val, otherRelation: val === 'অন্যান্য' ? f.otherRelation : '' }))}
            options={RELATION_OPTIONS}
            placeholder="সম্পর্ক নির্বাচন করুন"
          />
          {form.requesterRelation === 'অন্যান্য' && (
            <input
              value={form.otherRelation}
              onChange={set('otherRelation')}
              placeholder="রোগীর সঙ্গে আপনার সম্পর্ক লিখুন"
              className="input-field mt-2"
              maxLength={80}
            />
          )}
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
              <div className="flex justify-between gap-4"><span className="text-[#666]">তারিখ</span><strong className="text-right">{new Date(`${form.neededAt}T12:00:00`).toLocaleDateString('bn-BD')}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#666]">যোগাযোগ</span><strong className="text-right">{normalizedPhone(form.contactPhone)}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-[#666]">সম্পর্ক</span><strong className="text-right">{form.requesterRelation === 'অন্যান্য' ? form.otherRelation.trim() : form.requesterRelation}</strong></div>
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
