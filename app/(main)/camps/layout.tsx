import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'বাংলাদেশের রক্তদান ক্যাম্প — Blood Donation Camps',
  description: 'বাংলাদেশের বিভিন্ন জেলার আসন্ন রক্তদান ক্যাম্পের তালিকা দেখুন। নিকটতম ক্যাম্পে নিবন্ধন করুন এবং স্বেচ্ছায় রক্তদান করুন।',
  alternates: { canonical: '/camps' },
  openGraph: {
    title: 'বাংলাদেশের রক্তদান ক্যাম্প — Blood Hood',
    description: 'আপনার জেলার আসন্ন রক্তদান ক্যাম্প খুঁজুন এবং অংশ নিন।',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
