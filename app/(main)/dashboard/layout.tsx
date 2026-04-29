import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'হোম — রক্তদান ড্যাশবোর্ড',
  description: 'Blood Hood ড্যাশবোর্ড — খুলনার সাম্প্রতিক রক্তের অনুরোধ, প্ল্যাটফর্ম পরিসংখ্যান এবং রক্তদাতাদের তথ্য দেখুন।',
  alternates: { canonical: '/dashboard' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
