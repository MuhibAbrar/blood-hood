import { NextRequest, NextResponse } from 'next/server'
import { Resvg } from '@resvg/resvg-js'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RequestPreview = {
  bloodGroup: string
  patientName: string
  hospital: string
  area: string
  urgency: string
  status: string
  bags: number
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncate(value: unknown, max: number): string {
  const text = String(value ?? '').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function spacedText(value: unknown, fontSize: number): string {
  const words = String(value ?? '').trim().split(/\s+/).filter(Boolean)
  // resvg gives Bengali font spaces almost no visible width. Social apps then
  // shrink the 1200px image further, so use an intentionally generous gap.
  const gap = Math.max(8, Math.round(fontSize * 0.68))
  return words.map((word, index) =>
    index === 0
      ? `<tspan>${escapeXml(word)}</tspan>`
      : `<tspan dx="${gap}">${escapeXml(word)}</tspan>`
  ).join('')
}

async function fetchRequest(id: string): Promise<RequestPreview | null> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!projectId) return null
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/bloodRequests/${encodeURIComponent(id)}`
    const response = await fetch(url, { next: { revalidate: 60 } })
    if (!response.ok) return null

    const json = await response.json()
    if (!json.fields) return null
    const fields = json.fields as Record<string, { stringValue?: string; integerValue?: string }>
    return {
      bloodGroup: fields.bloodGroup?.stringValue ?? '',
      patientName: fields.patientName?.stringValue ?? '',
      hospital: fields.hospital?.stringValue ?? '',
      area: fields.area?.stringValue ?? '',
      urgency: fields.urgency?.stringValue ?? 'normal',
      status: fields.status?.stringValue ?? 'open',
      bags: Number.parseInt(fields.bags?.integerValue ?? '1', 10) || 1,
    }
  } catch {
    return null
  }
}

function buildRequestShareCardSvg(data: RequestPreview | null): string {
  const bloodGroup = escapeXml(data?.bloodGroup || '?')
  const patientName = truncate(data?.patientName || 'রক্তের অনুরোধ', 24)
  const hospital = truncate(data?.hospital || 'হাসপাতালের তথ্য দেখুন', 38)
  const area = truncate(data?.area || 'বিস্তারিত ঠিকানা দেখুন', 38)
  const bags = Math.max(1, Number(data?.bags ?? 1))
  const isUrgent = data?.urgency === 'urgent'
  const isFulfilled = data?.status === 'fulfilled'
  const isCancelled = data?.status === 'cancelled'

  const theme = isFulfilled
    ? { primary: '#158A5C', deep: '#0E5F40', soft: '#E9F8F1', label: 'রক্তের ব্যবস্থা হয়েছে', action: 'অনুরোধটি পূর্ণ হয়েছে' }
    : isCancelled
      ? { primary: '#6B7280', deep: '#374151', soft: '#F3F4F6', label: 'অনুরোধ বাতিল', action: 'এই অনুরোধটি আর সক্রিয় নেই' }
      : isUrgent
        ? { primary: '#D92B2B', deep: '#8B1A1A', soft: '#FDECEC', label: 'জরুরি রক্তের প্রয়োজন', action: 'এখনই সাহায্য করুন' }
        : { primary: '#C62828', deep: '#7F1D1D', soft: '#FFF1F1', label: 'রক্তের প্রয়োজন', action: 'একটি শেয়ার জীবন বাঁচাতে পারে' }

  const patientLength = String(data?.patientName ?? '').length
  const hospitalLength = String(data?.hospital ?? '').length
  const areaLength = String(data?.area ?? '').length
  const patientFontSize = patientLength > 18 ? 37 : 45
  const hospitalFontSize = hospitalLength > 32 ? 23 : hospitalLength > 23 ? 25 : 28
  const areaFontSize = areaLength > 32 ? 22 : areaLength > 23 ? 24 : 27

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="leftPanel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.primary}"/>
      <stop offset="100%" stop-color="${theme.deep}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#6B0F0F" flood-opacity="0.15"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="#F7F8FA"/>
  <circle cx="1115" cy="62" r="180" fill="${theme.soft}"/>
  <circle cx="1050" cy="640" r="230" fill="${theme.soft}" fill-opacity="0.7"/>

  <g transform="translate(54 40)">
    <rect width="52" height="52" rx="16" fill="${theme.primary}"/>
    <path d="M26 10C19 20 14 27 14 33a12 12 0 0 0 24 0c0-6-5-13-12-23z" fill="white"/>
    <text x="68" y="35" font-family="Hind Siliguri" font-size="30" font-weight="700" fill="#171717">Blood Hood</text>
    <text x="68" y="57" font-family="Hind Siliguri" font-size="15" font-weight="500" fill="#7B7B7B">${spacedText('রক্তের বন্ধনে বাংলাদেশ', 15)}</text>
  </g>

  <g filter="url(#shadow)">
    <rect x="52" y="122" width="1096" height="410" rx="34" fill="white"/>
    <path d="M86 122H386V532H86C67.2 532 52 516.8 52 498V156C52 137.2 67.2 122 86 122Z" fill="url(#leftPanel)"/>
  </g>

  <circle cx="219" cy="315" r="121" fill="none" stroke="white" stroke-opacity="0.10" stroke-width="24"/>
  <circle cx="219" cy="315" r="91" fill="white"/>
  <path d="M219 190C190 234 169 263 169 291a50 50 0 0 0 100 0c0-28-21-57-50-101z" fill="${theme.soft}"/>
  <text x="219" y="347" text-anchor="middle" font-family="Hind Siliguri" font-size="72" font-weight="700" fill="${theme.primary}">${bloodGroup}</text>
  <text x="219" y="444" text-anchor="middle" font-family="Hind Siliguri" font-size="19" font-weight="500" fill="white" fill-opacity="0.76">${spacedText('রক্তের গ্রুপ', 19)}</text>

  <rect x="430" y="158" width="270" height="46" rx="23" fill="${theme.soft}"/>
  <circle cx="457" cy="181" r="7" fill="${theme.primary}"/>
  <text x="477" y="189" font-family="Hind Siliguri" font-size="22" font-weight="700" fill="${theme.primary}">${spacedText(theme.label, 22)}</text>

  <text x="430" y="241" font-family="Hind Siliguri" font-size="17" font-weight="500" fill="#8A8A8A">${spacedText('রোগীর নাম', 17)}</text>
  <text x="430" y="294" font-family="Hind Siliguri" font-size="${patientFontSize}" font-weight="700" fill="#171717">${spacedText(patientName, patientFontSize)}</text>

  <g transform="translate(430 326)">
    <rect width="45" height="45" rx="13" fill="${theme.soft}"/>
    <path d="M20 11h6v8h8v6h-8v8h-6v-8h-8v-6h8z" fill="${theme.primary}"/>
    <text x="63" y="31" font-family="Hind Siliguri" font-size="${hospitalFontSize}" font-weight="500" fill="#353535">${spacedText(hospital, hospitalFontSize)}</text>
  </g>

  <g transform="translate(430 391)">
    <rect width="45" height="45" rx="13" fill="${theme.soft}"/>
    <path d="M23 10c-7 0-12 5-12 12 0 9 12 16 12 16s12-7 12-16c0-7-5-12-12-12zm0 16a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" fill="${theme.primary}"/>
    <text x="63" y="31" font-family="Hind Siliguri" font-size="${areaFontSize}" font-weight="500" fill="#525252">${spacedText(area, areaFontSize)}</text>
  </g>

  <g transform="translate(430 462)">
    <rect width="180" height="48" rx="24" fill="${theme.primary}"/>
    <path d="M26 11c-6 8-9 13-9 18a9 9 0 0 0 18 0c0-5-3-10-9-18z" fill="white"/>
    <text x="48" y="32" font-family="Hind Siliguri" font-size="22" font-weight="700" fill="white">${spacedText(`${bags} ব্যাগ প্রয়োজন`, 22)}</text>
  </g>

  <g transform="translate(52 560)">
    <text x="0" y="28" font-family="Hind Siliguri" font-size="24" font-weight="700" fill="${theme.primary}">${spacedText(theme.action, 24)}</text>
    <text x="1096" y="28" text-anchor="end" font-family="Hind Siliguri" font-size="20" font-weight="600" fill="#777777">bloodhood.pro.bd</text>
  </g>
</svg>`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await fetchRequest(params.id)
  const svg = buildRequestShareCardSvg(data)
  const mediumFont = path.join(process.cwd(), 'public', 'fonts', 'HindSiliguri-Medium.ttf')
  const semiboldFont = path.join(process.cwd(), 'public', 'fonts', 'HindSiliguri-SemiBold.ttf')
  const boldFont = path.join(process.cwd(), 'public', 'fonts', 'HindSiliguri-Bold.ttf')

  try {
    const renderer = new Resvg(svg, {
      font: {
        loadSystemFonts: false,
        fontFiles: [mediumFont, semiboldFont, boldFont],
      },
      fitTo: { mode: 'width' as const, value: 1200 },
    })
    const png = renderer.render().asPng()
    return new NextResponse(png as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('[request OG image]', error)
    return new NextResponse('Unable to render image', { status: 500 })
  }
}
