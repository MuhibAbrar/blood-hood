import type { Metadata } from 'next'
import Link from 'next/link'
import TopBar from '@/components/layout/TopBar'

export const metadata: Metadata = {
  title: 'গোপনীয়তা নীতি',
  description: 'Blood Hood কীভাবে ব্যক্তিগত ও সংবেদনশীল তথ্য সংগ্রহ, ব্যবহার, সংরক্ষণ এবং মুছে ফেলে তা জানুন।',
  alternates: { canonical: '/privacy-policy' },
  robots: { index: true, follow: true },
}

const UPDATED_ON = '২৩ জুলাই ২০২৬'

const sections = [
  {
    title: '১. পরিচিতি ও নীতির পরিধি',
    body: <><p>এই গোপনীয়তা নীতি Blood Hood ওয়েবসাইট, Progressive Web App (PWA) এবং Android অ্যাপের ক্ষেত্রে প্রযোজ্য। এই নীতিতে “Blood Hood”, “আমরা” বা “আমাদের” বলতে Blood Hood প্ল্যাটফর্ম পরিচালনা কর্তৃপক্ষকে বোঝানো হয়েছে।</p><p>Blood Hood বাংলাদেশে স্বেচ্ছায় রক্তদাতা, রক্তপ্রার্থী, রক্তদান সংগঠন এবং ক্যাম্পের মধ্যে যোগাযোগ সহজ করে। আমরা হাসপাতাল, ব্লাড ব্যাংক বা চিকিৎসাসেবা প্রদানকারী নই।</p></>,
  },
  {
    title: '২. আমরা যে তথ্য সংগ্রহ করি',
    body: <>
      <h3>অ্যাকাউন্ট ও পরিচয়সংক্রান্ত তথ্য</h3>
      <ul><li>নাম, বাংলাদেশি মোবাইল নম্বর এবং অ্যাকাউন্টের অনন্য শনাক্তকারী;</li><li>লগইনের জন্য মোবাইল নম্বর থেকে তৈরি একটি অভ্যন্তরীণ Firebase email identifier;</li><li>পাসওয়ার্ড—এটি Google Firebase Authentication প্রক্রিয়া করে; Blood Hood-এর প্রশাসকেরা আপনার মূল পাসওয়ার্ড দেখতে পারেন না।</li></ul>
      <h3>প্রোফাইল ও সংবেদনশীল স্বাস্থ্যসংক্রান্ত তথ্য</h3>
      <ul><li>রক্তের গ্রুপ, বয়স, লিঙ্গ, রক্তদানে প্রস্তুত/উপলভ্য থাকার অবস্থা;</li><li>শেষ রক্তদানের তারিখ, পরবর্তী সম্ভাব্য রক্তদানের তারিখ এবং রক্তদানের ইতিহাস;</li><li>জেলা, উপজেলা ও ব্যবহারকারীর দেওয়া এলাকা; ঐচ্ছিক প্রোফাইল ছবি থাকলে সেটি।</li></ul>
      <h3>রক্তের অনুরোধ ও কমিউনিটি কার্যক্রম</h3>
      <ul><li>রোগীর নাম, প্রয়োজনীয় রক্তের গ্রুপ ও ইউনিট, হাসপাতাল, এলাকা, প্রয়োজনের সময়, জরুরিতার মাত্রা, যোগাযোগ নম্বর এবং ব্যবহারকারীর লেখা বিস্তারিত তথ্য;</li><li>কোন অনুরোধে সাড়া দেওয়া বা পূরণ করা হয়েছে, রক্তদান যাচাই এবং self-reported donation;</li><li>সংগঠনের সদস্যতা/অনুরোধ, ক্যাম্প নিবন্ধন, ঘোষণা, অভিযোগ ও প্রশাসনিক ব্যবস্থা।</li></ul>
      <h3>ডিভাইস, নোটিফিকেশন ও প্রযুক্তিগত তথ্য</h3>
      <ul><li>অনুমতি দিলে Firebase Cloud Messaging token এবং notification preference;</li><li>Authentication session, consent status এবং offline/PWA cache-এর মতো স্থানীয় app data;</li><li>নিরাপত্তা, ত্রুটি নির্ণয় ও সেবা পরিচালনার জন্য Firebase বা hosting service সীমিতভাবে IP address, browser/device type, request time ও technical logs প্রক্রিয়া করতে পারে।</li></ul>
    </>,
  },
  {
    title: '৩. অবস্থান ও ডিভাইসের অনুমতি',
    body: <><p>বর্তমানে Blood Hood আপনার precise GPS location বা background location সংগ্রহ করে না। জেলা, উপজেলা এবং এলাকা আপনি নিজে লিখে বা নির্বাচন করে দেন।</p><p>জরুরি রক্তের অনুরোধ, ক্যাম্প বা সংগঠনের খবর পাঠাতে আমরা notification permission চাইতে পারি। অনুমতি না দিলে মূল donor search ও request সুবিধা ব্যবহার করা যাবে, তবে push notification নাও পাওয়া যেতে পারে।</p><p>ভবিষ্যতে নতুন কোনো sensitive permission বা data ব্যবহার করা হলে, প্রয়োজন অনুযায়ী permission চাওয়ার আগে স্পষ্ট disclosure এবং সম্মতি নেওয়া হবে এবং এই নীতি হালনাগাদ করা হবে।</p></>,
  },
  {
    title: '৪. তথ্য ব্যবহারের উদ্দেশ্য',
    body: <ul><li>অ্যাকাউন্ট তৈরি, পরিচয় যাচাই, login এবং password reset পরিচালনা;</li><li>রক্তের গ্রুপ ও জেলা অনুযায়ী উপযুক্ত ও উপলভ্য donor খুঁজে দেখানো;</li><li>রক্তের অনুরোধ তৈরি, শেয়ার, সাড়া, পূরণ এবং স্বয়ংক্রিয়ভাবে মেয়াদ শেষ/বাতিল করা;</li><li>রক্তদান ইতিহাস, availability interval, ক্যাম্প, সংগঠন এবং leaderboard পরিচালনা;</li><li>আপনার পছন্দ ও অনুমতি অনুযায়ী service এবং emergency notification পাঠানো;</li><li>অপব্যবহার, মিথ্যা অনুরোধ, fraud ও নিরাপত্তা ঝুঁকি শনাক্ত, সীমিত এবং তদন্ত করা;</li><li>ত্রুটি সমাধান, backup, service reliability এবং সামগ্রিক non-personal statistics প্রস্তুত করা;</li><li>আইন, বৈধ সরকারি অনুরোধ এবং Google Play-এর প্রযোজ্য নীতি মানা।</li></ul>,
  },
  {
    title: '৫. কোন তথ্য অন্যরা দেখতে পারে',
    body: <><p>Blood Hood একটি সংযোগ প্ল্যাটফর্ম। তাই সেবার কিছু তথ্য অন্য ব্যবহারকারীর কাছে দৃশ্যমান হওয়া প্রয়োজন:</p><ul><li>Donor search/profile-এ নাম, রক্তের গ্রুপ, সাধারণ এলাকা, availability এবং রক্তদানের প্রাসঙ্গিক তথ্য signed-in ব্যবহারকারীরা দেখতে পারেন;</li><li>Blood request-এর রোগীর নাম, রক্তের গ্রুপ, হাসপাতাল, এলাকা, জরুরিতা ও সময় publicভাবে দেখা যেতে পারে; যোগাযোগ নম্বর কেবল প্রয়োজনীয় authenticated flow-তে দেখানো হয়;</li><li>কোন donor সাড়া দিলে request creator প্রয়োজনীয় যোগাযোগ/response তথ্য পেতে পারেন;</li><li>Organization admin ও global admin তাদের দায়িত্ব পালনের জন্য সদস্য, ক্যাম্প, request, donation ও moderation data দেখতে পারেন;</li><li>Leaderboard-এ নাম, রক্তের গ্রুপ বা donation count-এর মতো সীমিত public/community তথ্য দেখানো হতে পারে।</li></ul><p>অন্য ব্যক্তির তথ্য দিয়ে request তৈরি করলে, সেই তথ্য Blood Hood-এ দেওয়া ও প্রয়োজন অনুযায়ী প্রকাশ করার বৈধ অনুমতি নেওয়ার দায়িত্ব request creator-এর।</p></>,
  },
  {
    title: '৬. সেবা প্রদানকারী ও তথ্য শেয়ার',
    body: <><p>আমরা ব্যক্তিগত তথ্য বিক্রি করি না এবং third-party behavioral advertising-এর জন্য ব্যবহার করি না। সেবা চালাতে নিচের data processor/service provider ব্যবহার করা হয়:</p><ul><li><strong>Google Firebase:</strong> Authentication, Firestore database এবং Cloud Messaging;</li><li><strong>Vercel:</strong> application hosting, delivery, scheduled jobs এবং operational logs;</li><li><strong>আপনার device/browser provider:</strong> app/PWA delivery, local storage, cache ও notification প্রদর্শন।</li></ul><p>আইনগত বাধ্যবাধকতা, আদালতের আদেশ, জরুরি নিরাপত্তা, fraud প্রতিরোধ, অধিকার রক্ষা বা সেবার অপব্যবহার তদন্তে প্রয়োজন হলে সীমিত তথ্য আইন প্রয়োগকারী সংস্থা বা উপযুক্ত কর্তৃপক্ষের কাছে প্রকাশ করা হতে পারে।</p></>,
  },
  {
    title: '৭. তথ্য সংরক্ষণ ও মুছে ফেলা',
    body: <><p>অ্যাকাউন্ট চালু থাকা এবং উপরে বর্ণিত সেবা দেওয়ার প্রয়োজন থাকা পর্যন্ত account/profile data রাখা হয়। In-app notification সাধারণত ৩০ দিন এবং cancelled blood request সাধারণত ৯০ দিন রাখা হয়; এরপর automatic বা administrative cleanup-এ মুছে ফেলা হতে পারে। Fulfilled request ও donation history donor record, সেবার integrity এবং fraud prevention-এর প্রয়োজন অনুযায়ী বেশি সময় রাখা হতে পারে।</p><p>আপনি Profile থেকে অথবা public <Link href="/delete-account">Account Deletion page</Link> ব্যবহার করে account স্থায়ীভাবে মুছে দিতে পারেন। Deletion সম্পন্ন হলে:</p><ul><li>Firebase login, profile, phone, notification token, contact activity, organization/camp membership এবং active personal data মুছে ফেলা হয়;</li><li>আপনার open blood requests বাতিল এবং public list থেকে সরানো হয়;</li><li>সেবার integrity, fraud prevention ও donation হিসাবের জন্য কিছু fulfilled request বা donation history রাখা হলে নাম, phone, patient identity ও account identifier সরিয়ে anonymize করা হয়;</li><li>Backup copy স্বাভাবিক backup rotation শেষ হওয়া পর্যন্ত সীমিত সময় থাকতে পারে এবং restore না হলে সক্রিয় ব্যবহারে ফেরানো হয় না;</li><li>আইনগতভাবে কোনো record রাখা আবশ্যক হলে শুধু প্রয়োজনীয় অংশ নির্ধারিত সময় রাখা হবে।</li></ul></>,
  },
  {
    title: '৮. আপনার অধিকার ও নিয়ন্ত্রণ',
    body: <ul><li>Profile থেকে সমর্থিত ব্যক্তিগত তথ্য দেখা ও সংশোধন করা;</li><li>Donor availability বন্ধ করা এবং notification permission device settings থেকে প্রত্যাহার করা;</li><li>ভুল, অননুমোদিত বা অপব্যবহারমূলক content সম্পর্কে অভিযোগ করা;</li><li>আপনার তথ্য, account deletion বা privacy concern সম্পর্কে আমাদের সাথে যোগাযোগ করা;</li><li>যেকোনো সময় account ও সংশ্লিষ্ট personal data মুছে ফেলার অনুরোধ করা।</li></ul>,
  },
  {
    title: '৯. তথ্যের নিরাপত্তা ও আন্তর্জাতিক প্রক্রিয়াকরণ',
    body: <><p>আমরা HTTPS encryption in transit, Firebase authentication, role-based access, Firestore security rules, server-side authorization এবং সীমিত administrative access ব্যবহার করি। তবে internet-based কোনো ব্যবস্থাই শতভাগ নিরাপদ নয়; সন্দেহজনক কার্যকলাপ দেখলে দ্রুত আমাদের জানান।</p><p>Firebase, Vercel বা তাদের infrastructure provider বাংলাদেশসহ অন্য দেশে তথ্য প্রক্রিয়া বা সংরক্ষণ করতে পারে। তারা তাদের নিজস্ব নিরাপত্তা ও data-processing শর্ত অনুযায়ী কাজ করে।</p></>,
  },
  {
    title: '১০. শিশু ও কিশোরদের তথ্য',
    body: <p>Blood Hood donor account প্রাপ্তবয়স্ক এবং আইনত রক্তদানে উপযুক্ত ব্যবহারকারীদের জন্য পরিকল্পিত। আমরা জেনেশুনে ১৮ বছরের কম বয়সী শিশুর donor account বা personal health data সংগ্রহ করতে চাই না। এমন account বা তথ্য শনাক্ত হলে <Link href="/contact">যোগাযোগ করুন</Link>, যাতে যথাযথ ব্যবস্থা নেওয়া যায়। কোনো রোগীর তথ্য request-এ দেওয়ার আগে request creator-কে প্রয়োজনীয় guardian/authorized consent নিতে হবে।</p>,
  },
  {
    title: '১১. স্বাস্থ্য ও চিকিৎসা সংক্রান্ত ঘোষণা',
    body: <p>Blood Hood শুধুমাত্র যোগাযোগ ও community coordination সহজ করে। আমরা donor-এর স্বাস্থ্য, রক্তের নিরাপত্তা, compatibility, availability বা চিকিৎসার ফলাফল নিশ্চিত করি না এবং diagnosis, treatment বা emergency medical service প্রদান করি না। রক্ত গ্রহণ বা দানের আগে হাসপাতাল, licensed physician এবং qualified blood-bank professional-এর পরামর্শ ও পরীক্ষা অনুসরণ করুন। জরুরি অবস্থায় স্থানীয় emergency service বা নিকটস্থ হাসপাতালে যোগাযোগ করুন।</p>,
  },
  {
    title: '১২. নীতির পরিবর্তন ও যোগাযোগ',
    body: <><p>সেবা, আইন বা Google Play policy পরিবর্তিত হলে এই নীতি হালনাগাদ করা হতে পারে। গুরুত্বপূর্ণ পরিবর্তন হলে app বা website-এ notice দেওয়া হবে এবং উপরের “সর্বশেষ হালনাগাদ” তারিখ পরিবর্তন করা হবে।</p><p>Privacy inquiry, data request বা complaint-এর জন্য <Link href="/contact">Blood Hood Contact page</Link> ব্যবহার করুন। Account deletion-এর জন্য <Link href="/delete-account">Account Deletion page</Link> ব্যবহার করুন।</p></>,
  },
]

export default function PrivacyPolicyPage() {
  return <div>
    <TopBar title="গোপনীয়তা নীতি" />
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="rounded-3xl bg-gradient-to-br from-[#D92B2B] to-[#8F1717] p-6 text-white shadow-lg shadow-red-900/10 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">Privacy Policy</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Blood Hood গোপনীয়তা নীতি</h1>
        <p className="mt-3 text-sm leading-6 text-white/80">সর্বশেষ হালনাগাদ: {UPDATED_ON}</p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/90">আপনার ব্যক্তিগত ও স্বাস্থ্যসংক্রান্ত তথ্য আমাদের কাছে গুরুত্বপূর্ণ। এই নীতিতে সহজ ভাষায় বলা হয়েছে কোন তথ্য নেওয়া হয়, কেন নেওয়া হয়, কারা দেখতে পারে এবং কীভাবে আপনি তা নিয়ন্ত্রণ বা মুছে ফেলতে পারেন।</p>
      </header>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Blood Hood রক্তদান-সংক্রান্ত সংবেদনশীল স্বাস্থ্যতথ্য ব্যবহার করে। তাই অনুগ্রহ করে আপনার বা অন্য কোনো ব্যক্তির তথ্য দেওয়ার আগে এই নীতিটি পড়ুন এবং প্রয়োজনীয় সম্মতি নিশ্চিত করুন।</div>
      <div className="mt-5 space-y-4">{sections.map((section) => <section key={section.title} className="card p-5 sm:p-6"><h2 className="text-base font-bold text-[#111111]">{section.title}</h2><div className="privacy-copy mt-3 space-y-3 text-sm leading-7 text-[#4B4B4B]">{section.body}</div></section>)}</div>
      <nav className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Privacy resources"><Link href="/delete-account" className="rounded-2xl bg-[#D92B2B] px-4 py-3 text-center text-sm font-semibold text-white">Account মুছুন</Link><Link href="/terms" className="rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 text-center text-sm font-semibold text-[#111111]">শর্তাবলী</Link><Link href="/contact" className="rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 text-center text-sm font-semibold text-[#111111]">যোগাযোগ</Link></nav>
    </main>
  </div>
}
