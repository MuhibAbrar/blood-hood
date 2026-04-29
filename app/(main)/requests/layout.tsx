import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'রক্তের অনুরোধ — Khulna Blood Requests',
  description: 'খুলনার জরুরি রক্তের অনুরোধ দেখুন। A+, A-, B+, B-, AB+, AB-, O+, O- যেকোনো রক্তের গ্রুপের জন্য রক্তদাতা খুঁজুন বা নিজে সাহায্য করুন।',
  alternates: { canonical: '/requests' },
  openGraph: {
    title: 'জরুরি রক্তের অনুরোধ — Blood Hood Khulna',
    description: 'খুলনায় এখনই রক্ত দরকার। রক্তদাতা হিসেবে সাড়া দিন এবং একটি জীবন বাঁচান।',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
