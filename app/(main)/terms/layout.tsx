import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'সেবার শর্তাবলী — Blood Hood',
  description: 'Blood Hood বাংলাদেশের কমিউনিটি রক্তদান প্ল্যাটফর্ম ব্যবহারের নিয়ম, দায়িত্ব ও গুরুত্বপূর্ণ শর্তাবলী পড়ুন।',
  alternates: { canonical: '/terms' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
