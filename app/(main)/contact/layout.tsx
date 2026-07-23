import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'যোগাযোগ — Blood Hood',
  description: 'Blood Hood-এর সঙ্গে যোগাযোগ করুন এবং বাংলাদেশের কমিউনিটি রক্তদান প্ল্যাটফর্ম সম্পর্কে সহায়তা নিন।',
  alternates: { canonical: '/contact' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
