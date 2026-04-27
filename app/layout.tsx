export const dynamic = 'force-dynamic'

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'Blood Hood — রক্তের বন্ধন',
  description: 'খুলনার কমিউনিটি রক্তদান প্ল্যাটফর্ম — রক্তদাতা খুঁজুন, রক্তের অনুরোধ করুন',
  manifest: '/manifest.json',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
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
