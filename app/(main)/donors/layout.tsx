import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'রক্তদাতা খুঁজুন — Blood Donors Khulna',
  description: 'খুলনার সকল রক্তদাতাদের তালিকা। রক্তের গ্রুপ, এলাকা ও উপজেলা অনুযায়ী রক্তদাতা খুঁজুন — A+, A-, B+, B-, AB+, AB-, O+, O-।',
  alternates: { canonical: '/donors' },
  openGraph: {
    title: 'রক্তদাতা খুঁজুন — Blood Hood Khulna',
    description: 'খুলনায় রক্তের প্রয়োজন? এখনই আপনার গ্রুপের রক্তদাতা খুঁজুন।',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
