import type { Metadata } from 'next'
import RequestDetailClient from './RequestDetailClient'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://bloodhood.pro.bd'
  const ogImageUrl = `${baseUrl}/api/og/requests/${params.id}`
  const pageUrl = `${baseUrl}/requests/${params.id}`

  return {
    title: 'রক্তের অনুরোধ — Blood Hood',
    description: 'Blood Hood — খুলনার কমিউনিটি রক্তদান প্ল্যাটফর্ম',
    openGraph: {
      title: 'রক্তের অনুরোধ — Blood Hood',
      description: 'Blood Hood — খুলনার কমিউনিটি রক্তদান প্ল্যাটফর্ম',
      url: pageUrl,
      siteName: 'Blood Hood',
      type: 'website',
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImageUrl],
    },
    alternates: { canonical: pageUrl },
  }
}

export default function RequestDetailPage() {
  return <RequestDetailClient />
}
