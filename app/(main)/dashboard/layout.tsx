import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'বাংলাদেশের রক্তদাতা ও জরুরি রক্ত — হোম',
  description: 'Blood Hood-এ বাংলাদেশের সাম্প্রতিক জরুরি রক্তের অনুরোধ, রক্তদাতা, রক্তদান ক্যাম্প, সংগঠন ও প্ল্যাটফর্ম পরিসংখ্যান দেখুন।',
  alternates: { canonical: '/dashboard' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
