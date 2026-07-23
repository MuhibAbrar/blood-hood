import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'বাংলাদেশে রক্তদাতা খুঁজুন — Blood Donors',
  description: 'বাংলাদেশে জেলা, উপজেলা ও রক্তের গ্রুপ অনুযায়ী রক্তদাতা খুঁজুন—A+, A-, B+, B-, AB+, AB-, O+ ও O-।',
  alternates: { canonical: '/donors' },
  openGraph: {
    title: 'বাংলাদেশে রক্তদাতা খুঁজুন — Blood Hood',
    description: 'রক্তের প্রয়োজন? জেলা, উপজেলা ও রক্তের গ্রুপ নির্বাচন করে রক্তদাতা খুঁজুন।',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
