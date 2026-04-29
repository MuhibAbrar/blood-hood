export const dynamic = 'force-dynamic'

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'

const BASE_URL = 'https://bloodhood.pro.bd'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Blood Hood — খুলনার রক্তদান প্ল্যাটফর্ম',
    template: '%s | Blood Hood',
  },
  description: 'Blood Hood — খুলনার কমিউনিটি রক্তদান প্ল্যাটফর্ম। রক্তদাতা খুঁজুন, জরুরি রক্তের অনুরোধ করুন, রক্তদান ক্যাম্পে অংশ নিন। Khulna blood donor finder — A+, A-, B+, B-, AB+, AB-, O+, O-.',
  keywords: [
    'blood donation Khulna', 'রক্তদান খুলনা', 'রক্তদাতা খুঁজুন', 'blood donor Bangladesh',
    'রক্তের প্রয়োজন', 'blood need Khulna', 'খুলনা রক্তদান', 'Blood Hood', 'রক্তের বন্ধন',
    'A+ blood Khulna', 'O+ blood donor', 'blood camp Khulna', 'রক্তদান ক্যাম্প',
    'emergency blood Bangladesh', 'জরুরি রক্ত', 'free blood donation app',
  ],
  authors: [{ name: 'Blood Hood', url: BASE_URL }],
  creator: 'Blood Hood',
  publisher: 'Blood Hood',
  category: 'health',
  manifest: '/manifest.json',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    url: BASE_URL,
    siteName: 'Blood Hood',
    title: 'Blood Hood — খুলনার রক্তদান প্ল্যাটফর্ম',
    description: 'রক্তদাতা খুঁজুন, জরুরি রক্তের অনুরোধ করুন — খুলনার সবচেয়ে বড় কমিউনিটি রক্তদান নেটওয়ার্ক।',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Blood Hood — খুলনার রক্তদান প্ল্যাটফর্ম',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blood Hood — খুলনার রক্তদান প্ল্যাটফর্ম',
    description: 'রক্তদাতা খুঁজুন, জরুরি রক্তের অনুরোধ করুন — খুলনার কমিউনিটি রক্তদান নেটওয়ার্ক।',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Blood Hood',
  },
}

export const viewport: Viewport = {
  themeColor: '#D92B2B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Blood Hood',
  url: BASE_URL,
  description: 'খুলনার কমিউনিটি রক্তদান প্ল্যাটফর্ম — রক্তদাতা খুঁজুন, রক্তের অনুরোধ করুন, ক্যাম্পে অংশ নিন।',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web, Android, iOS',
  inLanguage: 'bn',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BDT' },
  areaServed: {
    '@type': 'City',
    name: 'Khulna',
    addressCountry: 'BD',
  },
  provider: {
    '@type': 'Organization',
    name: 'Blood Hood',
    url: BASE_URL,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-[#FAFAFA]">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
