import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'লিডারবোর্ড — সেরা রক্তদাতা ও সংগঠন',
  description: 'Blood Hood লিডারবোর্ড — খুলনার সর্বোচ্চ রক্তদাতা এবং সেরা রক্তদান সংগঠনগুলোর র‍্যাংকিং দেখুন।',
  alternates: { canonical: '/leaderboard' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
