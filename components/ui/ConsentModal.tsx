'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CONSENT_KEY = 'bh_consent_v1'

export default function ConsentModal() {
  const [visible, setVisible] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true)
  }, [])

  const handleAgree = () => {
    localStorage.setItem(CONSENT_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D92B2B] to-[#9B1B1B] px-6 pt-14 pb-8 text-center">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
            <path d="M12 2C7 8 4 12 4 15a8 8 0 0 0 16 0c0-3-3-7-8-13z"/>
          </svg>
        </div>
        <h1 className="text-white text-xl font-bold">Blood Hood এ স্বাগতম</h1>
        <p className="text-white/70 text-sm mt-1">রক্তের বন্ধন, বাংলাদেশ</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">

        {/* Intro */}
        <p className="text-sm text-[#555] leading-relaxed text-center">
          ব্যবহার শুরু করার আগে আমাদের কমিউনিটি নির্দেশিকা ও শর্তাবলী একবার পড়ুন।
        </p>

        {/* Community Guidelines */}
        <div className="space-y-2">
          <h2 className="font-bold text-[#111] text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#D92B2B] text-white text-[10px] flex items-center justify-center font-bold shrink-0">১</span>
            কমিউনিটি নির্দেশিকা
          </h2>
          <div className="bg-[#FFF8F8] rounded-2xl p-4 space-y-2.5">
            {[
              { icon: '✅', text: 'শুধুমাত্র সত্য ও সঠিক তথ্য প্রদান করুন' },
              { icon: '🩸', text: 'রক্তদান সম্পূর্ণ বিনামূল্যে — কোনো অর্থ দাবি করা সম্পূর্ণ নিষিদ্ধ' },
              { icon: '🤝', text: 'অন্য সদস্যদের সাথে সম্মানজনক আচরণ করুন' },
              { icon: '🚫', text: 'মিথ্যা তথ্য বা হয়রানি করলে account বন্ধ করা হবে' },
              { icon: '📞', text: 'সমস্যা হলে আমাদের Complain অপশন ব্যবহার করুন' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className="text-base shrink-0 mt-0.5">{icon}</span>
                <p className="text-sm text-[#444] leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Terms */}
        <div className="space-y-2">
          <h2 className="font-bold text-[#111] text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#D92B2B] text-white text-[10px] flex items-center justify-center font-bold shrink-0">২</span>
            গুরুত্বপূর্ণ শর্তাবলী
          </h2>
          <div className="bg-[#FFF8F8] rounded-2xl p-4 space-y-2.5">
            {[
              { icon: '🔗', text: 'Blood Hood শুধু ডোনার ও রোগীর মধ্যে সংযোগ স্থাপন করে — সরাসরি চিকিৎসা সেবা দেয় না' },
              { icon: '🔒', text: 'আপনার ব্যক্তিগত তথ্য শুধু রক্তদান সংক্রান্ত কাজে ব্যবহৃত হবে' },
              { icon: '⚕️', text: 'রক্তদানের যোগ্যতা: বয়স ১৮-৬০, ওজন কমপক্ষে ৪৮ কেজি, সুস্বাস্থ্য' },
              { icon: '📋', text: 'এই অ্যাপ ব্যবহার করে আপনি আমাদের সকল শর্ত মেনে নিচ্ছেন' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className="text-base shrink-0 mt-0.5">{icon}</span>
                <p className="text-sm text-[#444] leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Full links */}
        <div className="flex gap-3">
          <Link
            href="/terms"
            onClick={() => localStorage.setItem(CONSENT_KEY, '1')}
            className="flex-1 text-center text-sm font-semibold text-[#D92B2B] border-2 border-[#D92B2B] rounded-xl py-2.5 active:bg-red-50"
          >
            শর্তাবলী পড়ুন
          </Link>
          <Link
            href="/terms"
            onClick={() => localStorage.setItem(CONSENT_KEY, '1')}
            className="flex-1 text-center text-sm font-semibold text-[#555] border-2 border-[#E5E5E5] rounded-xl py-2.5 active:bg-gray-50"
          >
            গোপনীয়তা নীতি
          </Link>
        </div>
      </div>

      {/* Footer — checkbox + agree */}
      <div className="px-5 pb-8 pt-4 border-t border-[#F0F0F0] space-y-4 bg-white">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              agreed ? 'bg-[#D92B2B] border-[#D92B2B]' : 'border-[#CCC] bg-white'
            }`}>
              {agreed && (
                <svg className="w-3 h-3 stroke-white fill-none" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7"/>
                </svg>
              )}
            </div>
          </div>
          <p className="text-sm text-[#444] leading-relaxed">
            আমি Blood Hood এর{' '}
            <span className="text-[#D92B2B] font-semibold">শর্তাবলী ও ব্যবহারবিধি</span>{' '}
            এবং{' '}
            <span className="text-[#D92B2B] font-semibold">কমিউনিটি নির্দেশিকা</span>{' '}
            পড়েছি এবং সম্মত আছি।
          </p>
        </label>

        <button
          onClick={handleAgree}
          disabled={!agreed}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#D92B2B] text-white active:scale-[0.98]"
        >
          সম্মত আছি — শুরু করুন
        </button>
      </div>
    </div>
  )
}
