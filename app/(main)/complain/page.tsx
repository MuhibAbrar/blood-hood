'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { getSocialLinks, getHelplines, type HelplineOrg } from '@/lib/firestore'

const EMERGENCY_LINES = [
  { number: '999',   label: 'জাতীয় জরুরি সেবা',              desc: 'পুলিশ · ফায়ার সার্ভিস · অ্যাম্বুলেন্স' },
  { number: '16430', label: 'স্বাস্থ্য বাতায়ন',               desc: 'সরকারি স্বাস্থ্য সেবা হেল্পলাইন' },
  { number: '10921', label: 'রক্ত পরিসঞ্চালন অধিদপ্তর',       desc: 'জাতীয় রক্ত সেবা কেন্দ্র' },
  { number: '16000', label: 'নারী ও শিশু নির্যাতন হেল্পলাইন', desc: 'মহিলা ও শিশু বিষয়ক মন্ত্রণালয়' },
  { number: '1098',  label: 'শিশু হেল্পলাইন',                 desc: 'শিশু সুরক্ষা সেবা' },
]

export default function ComplainPage() {
  const [phone, setPhone] = useState<string>('')
  const [orgs, setOrgs] = useState<HelplineOrg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSocialLinks(), getHelplines()]).then(([links, helplines]) => {
      setPhone(links.phone ?? '')
      setOrgs(helplines)
      setLoading(false)
    })
  }, [])

  return (
    <div className="pb-8">
      <TopBar title="অভিযোগ করুন" />
      <div className="px-4 py-6 space-y-5">

        {/* Header */}
        <div className="card p-5 bg-gradient-to-b from-[#D92B2B] to-[#9B1B1B] text-white text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 stroke-white fill-none" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold">অভিযোগ জানান</h2>
          <p className="text-white/80 text-xs leading-relaxed">
            কোনো সমস্যায় পড়লে আমাদের সাথে যোগাযোগ করুন। আমরা দ্রুত ব্যবস্থা নেব।
          </p>
        </div>

        {/* Instructions */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-[#111] text-sm flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 stroke-amber-600 fill-none" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
            </span>
            কখন অভিযোগ করবেন?
          </h3>
          <ul className="space-y-2">
            {[
              'কোনো ব্যবহারকারী রক্ত দেওয়ার বিনিময়ে অর্থ দাবি করলে',
              'কেউ ভুয়া তথ্য দিয়ে প্রতারণা করলে',
              'কোনো ব্যবহারকারী হয়রানি বা অসম্মানজনক আচরণ করলে',
              'অ্যাপে কোনো প্রযুক্তিগত সমস্যা বা ত্রুটি দেখলে',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#555]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D92B2B] mt-2 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Call Blood Hood */}
        {!loading && phone && (
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-[#111] text-sm">Blood Hood এ অভিযোগ করুন</h3>
            <p className="text-xs text-[#777] leading-relaxed">
              আমাদের টিম আপনার অভিযোগ শুনবে এবং প্রয়োজনীয় ব্যবস্থা নেবে। কল করুন —
            </p>
            <a
              href={`tel:${phone}`}
              className="flex items-center justify-between bg-[#D92B2B] text-white rounded-2xl px-5 py-4 active:opacity-90 transition-opacity"
            >
              <div>
                <p className="font-bold text-base">{phone}</p>
                <p className="text-white/70 text-xs mt-0.5">Blood Hood হেল্পলাইন</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 17z"/>
                </svg>
              </div>
            </a>
          </div>
        )}

        {/* Organization helplines (dynamic) */}
        {!loading && orgs.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-[#111] text-sm px-1">সহযোগী সংগঠন হেল্পলাইন</h3>
            {orgs.map((org) => (
              <a
                key={org.id}
                href={`tel:${org.phone}`}
                className="flex items-center justify-between card p-4 active:bg-[#FAFAFA] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 stroke-[#D92B2B] fill-none" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#111]">{org.name}</p>
                    <p className="text-xs text-[#777] mt-0.5">{org.phone}</p>
                  </div>
                </div>
                <svg className="w-4 h-4 stroke-[#AAA] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6"/>
                </svg>
              </a>
            ))}
          </div>
        )}

        {/* Emergency hotlines (static) */}
        <div className="space-y-3">
          <h3 className="font-semibold text-[#111] text-sm px-1">বাংলাদেশ জরুরি হেল্পলাইন</h3>
          {EMERGENCY_LINES.map((e) => (
            <a
              key={e.number}
              href={`tel:${e.number}`}
              className="flex items-center gap-4 card p-4 active:bg-[#FAFAFA] transition-colors"
            >
              <div className="w-14 h-12 rounded-xl bg-[#FFF0F0] border border-[#FFD0D0] flex items-center justify-center shrink-0">
                <span className="text-[#D92B2B] font-bold text-sm">{e.number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#111]">{e.label}</p>
                <p className="text-xs text-[#777] mt-0.5">{e.desc}</p>
              </div>
              <svg className="w-4 h-4 stroke-[#AAA] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6"/>
              </svg>
            </a>
          ))}
        </div>

        <p className="text-center text-xs text-[#AAA] pb-2">Blood Hood · রক্তের বন্ধন, বাংলাদেশ</p>
      </div>
    </div>
  )
}
