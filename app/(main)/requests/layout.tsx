import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'জরুরি রক্তের অনুরোধ — Bangladesh Blood Requests',
  description: 'বাংলাদেশের বিভিন্ন জেলার জরুরি রক্তের অনুরোধ দেখুন। সব রক্তের গ্রুপের জন্য রক্তদাতা খুঁজুন অথবা স্বেচ্ছায় সাহায্য করুন।',
  alternates: { canonical: '/requests' },
  openGraph: {
    title: 'জরুরি রক্তের অনুরোধ — Blood Hood Bangladesh',
    description: 'বাংলাদেশে কোথায় এখন রক্ত দরকার দেখুন এবং যোগ্য রক্তদাতা হিসেবে সাড়া দিন।',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
