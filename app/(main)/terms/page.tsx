import Link from 'next/link'
import TopBar from '@/components/layout/TopBar'

const SECTIONS = [
  {
    title: 'সেবার শর্তাবলী',
    body: `Blood Hood অ্যাপ ব্যবহার করে আপনি এই শর্তাবলী মেনে নিচ্ছেন। এই প্ল্যাটফর্মটি শুধুমাত্র স্বেচ্ছায় রক্তদানের সুবিধার জন্য তৈরি। আমরা কোনো আর্থিক লেনদেনের মধ্যস্থতা করি না।\n\nআমরা শুধুমাত্র রক্তদাতা ও রক্তগ্রহীতার মধ্যে সংযোগ স্থাপন করি। যদি কোনো ব্যক্তি রক্ত দেওয়ার বিনিময়ে অর্থ দাবি করেন বা কোনো প্রকার আর্থিক লেনদেনের চেষ্টা করেন, তবে Blood Hood সেই বিষয়ে কোনোভাবেই দায়ী নয়। রক্তদান সম্পূর্ণ স্বেচ্ছামূলক ও বিনামূল্যে হওয়া উচিত।`,
  },
  {
    title: 'ব্যবহারকারীর দায়িত্ব',
    body: `• সঠিক ও সত্য তথ্য প্রদান করুন।\n• নিজের রক্তদানের সক্ষমতা নিজে যাচাই করুন।\n• অন্য ব্যবহারকারীদের সাথে সম্মানজনক আচরণ করুন।\n• মিথ্যা বা বিভ্রান্তিকর তথ্য প্রদান থেকে বিরত থাকুন।`,
  },
  {
    title: 'রক্তদানের নিয়মাবলী',
    body: `• বয়স ১৮ থেকে ৬০ বছরের মধ্যে হতে হবে।\n• ওজন কমপক্ষে ৪৮ কেজি হতে হবে।\n• গত ৩ মাসে রক্তদান করা থাকলে দান করা যাবে না।\n• শারীরিকভাবে সুস্থ থাকতে হবে।\n• হেপাটাইটিস, এইচআইভি বা যেকোনো সংক্রামক রোগ থাকলে রক্তদান করা যাবে না।`,
  },
  {
    title: 'গোপনীয়তা নীতি',
    body: `আপনার ব্যক্তিগত ও স্বাস্থ্যসংক্রান্ত তথ্য Blood Hood-এর গোপনীয়তা নীতি অনুযায়ী ব্যবহার ও সুরক্ষিত করা হয়। সেবা চালাতে Firebase ও Vercel-এর মতো service provider তথ্য প্রক্রিয়া করতে পারে; আমরা ব্যক্তিগত তথ্য বিক্রি করি না বা third-party behavioral advertising-এর জন্য ব্যবহার করি না। আপনি যেকোনো সময় আপনার অ্যাকাউন্ট মুছে দিতে পারবেন। পূর্ণ নীতি: https://bloodhood.pro.bd/privacy-policy`,
  },
  {
    title: 'দায়মুক্তি',
    body: `Blood Hood একটি স্বেচ্ছাসেবী সংযোগ প্ল্যাটফর্ম। রক্তদান প্রক্রিয়া বা রক্তের মান সম্পর্কিত কোনো দায়িত্ব আমাদের নেই। চিকিৎসা সংক্রান্ত যেকোনো সিদ্ধান্তের জন্য সংশ্লিষ্ট বিশেষজ্ঞের পরামর্শ নিন।`,
  },
  {
    title: 'পরিবর্তনের অধিকার',
    body: `Blood Hood যেকোনো সময় এই শর্তাবলী পরিবর্তন করার অধিকার রাখে। পরিবর্তন হলে অ্যাপের মাধ্যমে জানানো হবে।`,
  },
]

export default function TermsPage() {
  return (
    <div>
      <TopBar title="শর্তাবলী ও নীতিমালা" />
      <div className="px-4 py-6 space-y-4">
        <div className="card p-4 bg-[#FFF8F8] border-[#FFD0D0]">
          <p className="text-xs text-[#D92B2B] font-medium">সর্বশেষ আপডেট: মে ২০২৫</p>
          <p className="text-sm text-[#555] mt-1 leading-relaxed">
            Blood Hood অ্যাপ ব্যবহার করার আগে অনুগ্রহ করে এই শর্তাবলী মনোযোগ দিয়ে পড়ুন।
          </p>
        </div>

        {SECTIONS.map((s) => (
          <div key={s.title} className="card p-4 space-y-2">
            <h3 className="font-semibold text-[#111] text-sm">{s.title}</h3>
            <p className="text-sm text-[#555] leading-relaxed whitespace-pre-line">{s.body}</p>
          </div>
        ))}

        {/* Complain section */}
        <div className="card p-4 space-y-3 border-l-4 border-l-[#D92B2B]">
          <h3 className="font-semibold text-[#111] text-sm">অভিযোগ জানান</h3>
          <p className="text-sm text-[#555] leading-relaxed">
            যদি কোনো রক্তদাতা বা ব্যবহারকারী আপনার কাছে অর্থ দাবি করেন, হয়রানি করেন বা অন্য কোনো অনিয়ম করেন — আমাদের জানান। Blood Hood কর্তৃপক্ষ বিষয়টি যাচাই করে উপযুক্ত ব্যবস্থা নেবে।
          </p>
          <p className="text-sm text-[#555] leading-relaxed">
            মনে রাখবেন, রক্তদান সম্পূর্ণ বিনামূল্যে ও স্বেচ্ছামূলক। কোনো লেনদেনে Blood Hood এর কোনো সম্পৃক্ততা নেই এবং এ বিষয়ে আমরা দায়ী নই। তবে আপনার অভিযোগ আমাদের প্ল্যাটফর্মকে নিরাপদ রাখতে সাহায্য করবে।
          </p>
          <Link
            href="/complain"
            className="flex items-center justify-between w-full bg-[#D92B2B] text-white rounded-xl px-4 py-3 font-semibold text-sm active:opacity-90 transition-opacity"
          >
            <span>অভিযোগ করুন</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6"/>
            </svg>
          </Link>
        </div>

        <div className="text-center py-4">
          <p className="text-xs text-[#AAA]">Blood Hood · রক্তের বন্ধন, বাংলাদেশ</p>
        </div>
      </div>
    </div>
  )
}
