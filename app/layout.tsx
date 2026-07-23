export const dynamic = 'force-dynamic'

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import NativeAppGuards from '@/components/shared/NativeAppGuards'

const BASE_URL = 'https://bloodhood.pro.bd'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Blood Hood — বাংলাদেশের রক্তদাতা ও জরুরি রক্ত খোঁজার প্ল্যাটফর্ম',
    template: '%s | Blood Hood',
  },
  description: 'Blood Hood বাংলাদেশের একটি বিনামূল্যের কমিউনিটি রক্তদান প্ল্যাটফর্ম। জেলা, উপজেলা ও রক্তের গ্রুপ অনুযায়ী রক্তদাতা খুঁজুন, জরুরি রক্তের অনুরোধ করুন এবং রক্তদান ক্যাম্প ও সংগঠনের সঙ্গে যুক্ত হোন।',
  keywords: [
    'blood donor Bangladesh', 'রক্তদাতা বাংলাদেশ', 'রক্তদাতা খুঁজুন', 'blood donation Bangladesh',
    'জরুরি রক্তের প্রয়োজন', 'emergency blood Bangladesh', 'Blood Hood', 'রক্তের বন্ধন',
    'A+ blood donor', 'O+ blood donor', 'blood donation camp Bangladesh', 'রক্তদান ক্যাম্প',
    'রক্তদান অ্যাপ', 'free blood donation app', 'ঢাকা রক্তদাতা', 'খুলনা রক্তদাতা',
    'চট্টগ্রাম রক্তদাতা', 'রাজশাহী রক্তদাতা', 'সিলেট রক্তদাতা', 'বরিশাল রক্তদাতা',
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
    title: 'Blood Hood — বাংলাদেশের রক্তদাতা ও জরুরি রক্ত খোঁজার প্ল্যাটফর্ম',
    description: 'জেলা, উপজেলা ও রক্তের গ্রুপ অনুযায়ী রক্তদাতা খুঁজুন, জরুরি রক্তের অনুরোধ করুন এবং রক্তদান কমিউনিটির সঙ্গে যুক্ত হোন।',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Blood Hood — বাংলাদেশের কমিউনিটি রক্তদান প্ল্যাটফর্ম',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blood Hood — বাংলাদেশের রক্তদাতা খোঁজার প্ল্যাটফর্ম',
    description: 'বাংলাদেশে রক্তদাতা খুঁজুন, জরুরি রক্তের অনুরোধ করুন এবং স্বেচ্ছায় রক্তদান করুন।',
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
    statusBarStyle: 'black-translucent',
    title: 'Blood Hood',
    startupImage: '/icons/icon-512x512.png',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
  verification: {
    google: 'vDJcWtA92IfK_QgooKa0PVpXjbEYxlfcCtJxMapaRBA',
  },
}

export const viewport: Viewport = {
  themeColor: '#D92B2B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      name: 'Blood Hood',
      alternateName: 'রক্তের বন্ধন',
      url: BASE_URL,
      inLanguage: 'bn-BD',
    },
    {
      '@type': 'WebApplication',
      '@id': `${BASE_URL}/#app`,
      name: 'Blood Hood',
      url: BASE_URL,
      description: 'বাংলাদেশের কমিউনিটি রক্তদান প্ল্যাটফর্ম—জেলা, উপজেলা ও রক্তের গ্রুপ অনুযায়ী রক্তদাতা খুঁজুন, রক্তের অনুরোধ করুন এবং ক্যাম্পে অংশ নিন।',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web, Android, iOS',
      inLanguage: ['bn-BD', 'en'],
      featureList: [
        'জেলা ও উপজেলা অনুযায়ী রক্তদাতা খোঁজা',
        'জরুরি রক্তের অনুরোধ',
        'রক্তদান ক্যাম্প',
        'রক্তদান সংগঠন',
        'রক্তদাতা লিডারবোর্ড',
      ],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BDT' },
      areaServed: {
        '@type': 'Country',
        name: 'Bangladesh',
        alternateName: 'বাংলাদেশ',
      },
      provider: {
        '@type': 'Organization',
        name: 'Blood Hood',
        url: BASE_URL,
      },
    },
  ],
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
        <NativeAppGuards />
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
