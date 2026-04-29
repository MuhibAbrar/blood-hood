import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'রক্তদান ক্যাম্প — Blood Donation Camps Khulna',
  description: 'খুলনার আসন্ন রক্তদান ক্যাম্পের তালিকা। নিকটতম ক্যাম্পে নিবন্ধন করুন এবং স্বেচ্ছায় রক্তদান করুন।',
  alternates: { canonical: '/camps' },
  openGraph: {
    title: 'রক্তদান ক্যাম্প — Blood Hood Khulna',
    description: 'খুলনার আসন্ন রক্তদান ক্যাম্পে অংশ নিন। একটু রক্তে বাঁচুক একটি জীবন।',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
