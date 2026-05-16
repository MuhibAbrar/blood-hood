import TopBar from '@/components/layout/TopBar'
import Link from 'next/link'

const FEATURES = [
  { icon: '🩸', label: 'রক্তদাতা খোঁজা', desc: 'জেলা ও রক্তের গ্রুপ অনুযায়ী দ্রুত ডোনার খুঁজুন' },
  { icon: '🏥', label: 'জরুরি অনুরোধ', desc: 'যেকোনো সময় রক্তের অনুরোধ করুন, ডোনার সরাসরি সাড়া দেবে' },
  { icon: '🏕️', label: 'ক্যাম্প ব্যবস্থাপনা', desc: 'রক্তদান ক্যাম্পের তথ্য ও নিবন্ধন এক জায়গায়' },
  { icon: '🏆', label: 'লিডারবোর্ড', desc: 'নিয়মিত রক্তদাতাদের স্বীকৃতি ও অনুপ্রেরণা' },
  { icon: '🔔', label: 'তাৎক্ষণিক বিজ্ঞপ্তি', desc: 'কাছের জরুরি রক্তের চাহিদায় সাথে সাথে নোটিফিকেশন' },
  { icon: '🤝', label: 'সংগঠন নেটওয়ার্ক', desc: 'রক্তদান সংগঠনগুলোর সাথে সংযুক্ত থাকুন' },
]

export default function AboutPage() {
  return (
    <div>
      <TopBar title="আমাদের সম্পর্কে" />
      <div className="px-4 py-6 space-y-6">

        {/* Hero */}
        <div className="card p-6 text-center bg-gradient-to-b from-[#D92B2B] to-[#9B1B1B] text-white">
          <div className="w-16 h-16 rounded-full bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
              <path d="M12 2C7 8 4 12 4 15a8 8 0 0 0 16 0c0-3-3-7-8-13z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold">Blood Hood</h2>
          <p className="text-white/80 text-sm mt-1">রক্তের বন্ধন</p>
          <p className="text-white/70 text-xs mt-3 leading-relaxed">
            বাংলাদেশের রক্তদাতা ও রক্তপ্রার্থীদের মধ্যে সেতুবন্ধন তৈরির একটি স্বেচ্ছাসেবী প্ল্যাটফর্ম।
          </p>
        </div>

        {/* Mission */}
        <div className="card p-4 space-y-2">
          <h3 className="font-semibold text-[#111] flex items-center gap-2">
            <span>🎯</span> আমাদের লক্ষ্য
          </h3>
          <p className="text-sm text-[#555] leading-relaxed">
            প্রতিটি রক্তের অনুরোধে যেন সঠিক সময়ে সঠিক ডোনার পৌঁছে যায় — এটাই Blood Hood এর একমাত্র লক্ষ্য।
            আমরা বিশ্বাস করি, প্রযুক্তির সাহায্যে একটি রক্তের বন্ধন অনেক জীবন বাঁচাতে পারে।
          </p>
        </div>

        {/* Features */}
        <div>
          <h3 className="font-semibold text-[#111] mb-3">যা যা পাবেন</h3>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="card p-3 space-y-1">
                <span className="text-2xl">{f.icon}</span>
                <p className="text-xs font-semibold text-[#111]">{f.label}</p>
                <p className="text-xs text-[#777] leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Version & Links */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#777]">সংস্করণ</span>
            <span className="font-semibold text-[#111]">1.0.0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#777]">প্ল্যাটফর্ম</span>
            <span className="font-semibold text-[#111]">PWA · Web</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#777]">দেশ</span>
            <span className="font-semibold text-[#111]">🇧🇩 বাংলাদেশ</span>
          </div>
          <div className="border-t border-[#F0F0F0] pt-3 flex gap-3">
            <Link href="/terms" className="flex-1 text-center text-xs text-[#D92B2B] font-medium py-2 rounded-xl border border-[#D92B2B]/30 hover:bg-red-50">
              শর্তাবলী
            </Link>
            <Link href="/contact" className="flex-1 text-center text-xs text-[#555] font-medium py-2 rounded-xl border border-[#E5E5E5] hover:bg-gray-50">
              যোগাযোগ
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#AAA] pb-2">Made with ❤️ in Bangladesh</p>
      </div>
    </div>
  )
}
