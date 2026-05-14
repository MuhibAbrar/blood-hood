export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-[#D92B2B]" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A7 7 0 0119 12c0 .88-.16 1.72-.463 2.5M6.675 6.672A7 7 0 005 12c0 3.866 3.134 7 7 7a6.97 6.97 0 004.596-1.729" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-[#111111] mb-2">ইন্টারনেট সংযোগ নেই</h1>
      <p className="text-[#555555] text-sm leading-relaxed mb-8">
        Blood Hood ব্যবহার করতে ইন্টারনেট সংযোগ দরকার।<br />
        সংযোগ ঠিক হলে আবার চেষ্টা করুন।
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-[#D92B2B] text-white font-semibold px-8 py-3 rounded-xl text-sm"
      >
        আবার চেষ্টা করুন
      </button>
    </div>
  )
}
