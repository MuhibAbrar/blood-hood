import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'রক্তদান সংগঠন — Blood Organizations Khulna',
  description: 'খুলনার রক্তদান সংগঠনগুলোর তালিকা। কলেজ, বিশ্ববিদ্যালয়, NGO, হাসপাতাল ও কমিউনিটি সংগঠনে যোগ দিন এবং একসাথে রক্তদান করুন।',
  alternates: { canonical: '/organizations' },
  openGraph: {
    title: 'রক্তদান সংগঠন — Blood Hood Khulna',
    description: 'খুলনার রক্তদান সংগঠনে যোগ দিন এবং সম্মিলিতভাবে জীবন বাঁচান।',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
