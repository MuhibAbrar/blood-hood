import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'লিডারবোর্ড — সেরা রক্তদাতা ও সংগঠন',
  description: 'Blood Hood লিডারবোর্ডে বাংলাদেশের সক্রিয় রক্তদাতা এবং রক্তদান সংগঠনগুলোর র‍্যাংকিং দেখুন।',
  alternates: { canonical: '/leaderboard' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
