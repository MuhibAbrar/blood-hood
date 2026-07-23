import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blood Hood সম্পর্কে — বাংলাদেশের রক্তদান প্ল্যাটফর্ম',
  description: 'Blood Hood কীভাবে বাংলাদেশের রক্তদাতা, রক্তপ্রার্থী, রক্তদান ক্যাম্প ও সংগঠনকে একটি বিনামূল্যের কমিউনিটি প্ল্যাটফর্মে যুক্ত করে জানুন।',
  alternates: { canonical: '/about' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
