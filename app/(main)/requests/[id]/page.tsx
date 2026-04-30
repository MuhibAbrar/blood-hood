import type { Metadata } from 'next'
import { adminDb } from '@/lib/firebase-admin'
import RequestDetailClient from './RequestDetailClient'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://bloodhood.pro.bd'
  const ogImageUrl = `${baseUrl}/api/og/requests/${params.id}`
  const pageUrl = `${baseUrl}/requests/${params.id}`

  try {
    const db = adminDb()
    const snap = await db.collection('bloodRequests').doc(params.id).get()

    if (!snap.exists) {
      return {
        title: 'রক্তের অনুরোধ — Blood Hood',
        description: 'Blood Hood — খুলনার রক্তদান প্ল্যাটফর্ম',
      }
    }

    const d = snap.data()!
    const urgencyLabel = d.urgency === 'urgent' ? '🔴 জরুরি' : '🩸'
    const title = `${urgencyLabel} ${d.bloodGroup} রক্ত লাগবে — Blood Hood`
    const description = `${d.patientName}-এর জন্য ${d.bloodGroup} রক্ত দরকার। ${d.hospital}, ${d.area}। এখনই সাহায্য করুন!`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: pageUrl,
        siteName: 'Blood Hood',
        type: 'website',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
      alternates: { canonical: pageUrl },
    }
  } catch {
    return {
      title: 'রক্তের অনুরোধ — Blood Hood',
      description: 'Blood Hood — খুলনার রক্তদান প্ল্যাটফর্ম',
      openGraph: {
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      },
    }
  }
}

export default function RequestDetailPage() {
  return <RequestDetailClient />
}
