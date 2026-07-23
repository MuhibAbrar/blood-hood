import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'বাংলাদেশের রক্তদান সংগঠন — Blood Organizations',
  description: 'বাংলাদেশের রক্তদান সংগঠনগুলোর তালিকা দেখুন। কলেজ, বিশ্ববিদ্যালয়, NGO, হাসপাতাল ও কমিউনিটি সংগঠনে যোগ দিন।',
  alternates: { canonical: '/organizations' },
  openGraph: {
    title: 'বাংলাদেশের রক্তদান সংগঠন — Blood Hood',
    description: 'আপনার এলাকার রক্তদান সংগঠন খুঁজুন, সদস্য হোন এবং সম্মিলিতভাবে মানুষের পাশে দাঁড়ান।',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
