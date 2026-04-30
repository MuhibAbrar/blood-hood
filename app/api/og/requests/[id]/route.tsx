import { NextRequest, NextResponse } from 'next/server'
import { Resvg } from '@resvg/resvg-js'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** XML-escape a value so it's safe to embed in SVG text */
function x(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function trunc(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

/**
 * The Bengali font's space glyph (U+0020) has zero advance-width in resvg,
 * so words run together.  This helper splits text on spaces and emits SVG
 * <tspan> elements — the first word at the natural position, every subsequent
 * word offset by `fontSize × 0.32` px (≈ a normal word-space).
 *
 * Works correctly under both text-anchor="start" and text-anchor="middle".
 */
function w(text: string, fontSize: number): string {
  const words = String(text).split(' ').filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return x(words[0])
  const spacePx = Math.round(fontSize * 0.40)
  return words
    .map((word, i) =>
      i === 0
        ? `<tspan>${x(word)}</tspan>`
        : `<tspan dx="${spacePx}">${x(word)}</tspan>`
    )
    .join('')
}

async function fetchRequest(id: string): Promise<Record<string, string | number> | null> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!projectId) return null
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/bloodRequests/${id}`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.fields) return null
    const f = json.fields as Record<string, { stringValue?: string; integerValue?: string }>
    return {
      bloodGroup:  f.bloodGroup?.stringValue  ?? '',
      patientName: f.patientName?.stringValue ?? '',
      hospital:    f.hospital?.stringValue    ?? '',
      area:        f.area?.stringValue        ?? '',
      urgency:     f.urgency?.stringValue     ?? 'normal',
      status:      f.status?.stringValue      ?? 'open',
      bags:        parseInt(f.bags?.integerValue ?? '1', 10),
    }
  } catch {
    return null
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Static TTF — full Bengali + Latin glyphs with OpenType shaping tables
  const fontBn = fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'NotoSansBengali-Bold.ttf'))

  const data = await fetchRequest(params.id)

  const bloodGroup  = String(data?.bloodGroup  ?? '')
  const patientName = trunc(String(data?.patientName ?? 'রক্তের অনুরোধ'), 20)
  const hospital    = trunc(String(data?.hospital    ?? ''), 28)
  const area        = trunc(String(data?.area        ?? ''), 28)
  const urgency     = data?.urgency === 'urgent' ? 'urgent' : 'normal'
  const status      = String(data?.status ?? 'open')
  const bags        = Number(data?.bags ?? 1)

  const isUrgent    = urgency === 'urgent'
  const isFulfilled = status === 'fulfilled'
  const isCancelled = status === 'cancelled'

  const accent  = isUrgent ? '#D92B2B' : '#AA1111'
  const bgFrom  = isUrgent ? '#7B0000' : '#8B0000'

  const bgFontSize   = bloodGroup.length > 2 ? 62 : 78
  const nameFontSize = patientName.length > 14 ? 42 : 50

  // Status badge text (Bengali — some phrases have spaces)
  const statusText = isFulfilled
    ? 'পূর্ণ হয়েছে ✓'
    : isCancelled
    ? 'বাতিল'
    : isUrgent
    ? 'এখনই সাহায্য করুন!'
    : 'রক্ত দিন'

  const statusColor  = isFulfilled ? '#4FFFB0' : isCancelled ? '#cccccc' : isUrgent ? '#FF9999' : '#ffffff'
  const statusFill   = isFulfilled ? '#1A9E6B' : isCancelled ? '#555555' : accent
  const statusStroke = isFulfilled ? '#1A9E6B' : isCancelled ? '#888888' : accent

  // ASCII-only strings — space works fine with Latin glyphs
  const patientLabel    = 'PATIENT'
  const urgencyBadgeText = isUrgent ? 'URGENT' : 'Blood Request'

  // Pre-compute Bengali tspan strings (fixes zero-width space glyph issue)
  const patientNameSpans = w(patientName, nameFontSize)
  const hospitalSpans    = w(hospital, 25)
  const areaSpans        = w(area, 25)
  const statusSpans      = w(statusText, 20)
  const bagsSpans        = w(`${bags} ব্যাগ দরকার`, 17)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"
                    gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="${bgFrom}"/>
      <stop offset="100%" stop-color="#1a0000"/>
    </linearGradient>
    <linearGradient id="cg" x1="0.3" y1="0.3" x2="1" y2="1"
                    gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="${isUrgent ? '#ff5555' : '#cc3333'}"/>
      <stop offset="100%" stop-color="${isUrgent ? '#aa0000' : '#880000'}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Soft ambient circles -->
  <circle cx="1160" cy="-70" r="370" fill="white" fill-opacity="0.035"/>
  <circle cx="-60"  cy="700" r="310" fill="white" fill-opacity="0.035"/>

  <!-- ── TOP BAR ── -->
  <!-- Brand pill -->
  <rect x="52" y="34" width="56" height="56" rx="16"
        fill="white" fill-opacity="0.12"/>
  <!-- Blood drop icon -->
  <ellipse cx="80" cy="70" rx="11" ry="13" fill="${accent}"/>
  <polygon points="80,47 68,68 92,68" fill="${accent}"/>

  <!-- "Blood Hood" brand name (ASCII — space renders fine) -->
  <text x="126" y="74"
        font-family="NotoSansBengali" font-size="28" font-weight="700"
        fill="white" fill-opacity="0.92">Blood Hood</text>

  <!-- Urgency badge (ASCII) -->
  <rect x="${isUrgent ? 1014 : 960}" y="34"
        width="${isUrgent ? 154 : 208}" height="52" rx="26"
        fill="${isUrgent ? accent : 'none'}"
        stroke="${isUrgent ? 'none' : 'white'}"
        stroke-opacity="0.25" stroke-width="1.5"/>
  <text x="${isUrgent ? 1091 : 1064}" y="69"
        font-family="NotoSansBengali" font-size="22" font-weight="700"
        text-anchor="middle" fill="white" fill-opacity="${isUrgent ? '1' : '0.82'}"
        >${x(urgencyBadgeText)}</text>

  <!-- ── BLOOD GROUP CIRCLE ── -->
  <!-- Glow ring -->
  <circle cx="228" cy="315" r="118"
          fill="none"
          stroke="${accent}"
          stroke-opacity="${isUrgent ? '0.45' : '0.2'}"
          stroke-width="22"/>
  <!-- Main circle -->
  <circle cx="228" cy="315" r="108"
          fill="url(#cg)"
          stroke="white" stroke-opacity="0.22" stroke-width="3.5"/>
  <!-- Blood group text (ASCII/Latin — no shaping needed) -->
  <text x="228" y="${315 + bgFontSize * 0.38}"
        font-family="NotoSansBengali" font-size="${bgFontSize}" font-weight="700"
        text-anchor="middle" fill="white" letter-spacing="-2"
        >${x(bloodGroup) || '?'}</text>

  ${bags > 1 ? `
  <rect x="144" y="438" width="168" height="34" rx="17"
        fill="white" fill-opacity="0.08"
        stroke="${accent}" stroke-opacity="0.5" stroke-width="1.5"/>
  <text x="228" y="461"
        font-family="NotoSansBengali" font-size="17" font-weight="700"
        text-anchor="middle" fill="${accent}"
        >${bagsSpans}</text>
  ` : ''}

  <!-- ── DIVIDER ── -->
  <line x1="368" y1="110" x2="368" y2="520"
        stroke="white" stroke-opacity="0.07" stroke-width="1"/>

  <!-- ── INFO PANEL ── -->
  <!-- PATIENT label (ASCII) -->
  <text x="408" y="190"
        font-family="NotoSansBengali" font-size="14" letter-spacing="3"
        fill="white" fill-opacity="0.4"
        >${patientLabel}</text>

  <!-- Patient name — tspan word-spacing fix applied -->
  <text x="408" y="${patientName.length > 14 ? 248 : 258}"
        font-family="NotoSansBengali" font-size="${nameFontSize}" font-weight="700"
        fill="white"
        >${patientNameSpans}</text>

  <!-- Accent line -->
  <rect x="408" y="276" width="56" height="4" rx="2" fill="${accent}"/>

  <!-- Hospital row -->
  <rect x="408" y="306" width="4"  height="28" rx="2" fill="white" fill-opacity="0.4"/>
  <rect x="420" y="306" width="4"  height="28" rx="2" fill="white" fill-opacity="0.4"/>
  <rect x="408" y="317" width="16" height="4"  rx="2" fill="white" fill-opacity="0.4"/>
  <!-- Hospital name — tspan word-spacing fix applied -->
  <text x="444" y="328"
        font-family="NotoSansBengali" font-size="25" font-weight="700"
        fill="white" fill-opacity="0.82"
        >${hospitalSpans}</text>

  <!-- Area row -->
  <circle cx="416" cy="385" r="8"  fill="${accent}" fill-opacity="0.65"/>
  <circle cx="416" cy="385" r="4"  fill="white"    fill-opacity="0.5"/>
  <!-- Area name — tspan word-spacing fix applied -->
  <text x="444" y="392"
        font-family="NotoSansBengali" font-size="25" font-weight="700"
        fill="white" fill-opacity="0.82"
        >${areaSpans}</text>

  <!-- ── BOTTOM BAR ── -->
  <!-- Status badge — tspan word-spacing fix applied -->
  <rect x="52" y="548" width="310" height="48" rx="24"
        fill="${statusFill}" fill-opacity="0.22"
        stroke="${statusStroke}" stroke-opacity="0.65" stroke-width="2"/>
  <text x="207" y="578"
        font-family="NotoSansBengali" font-size="20" font-weight="700"
        text-anchor="middle" fill="${statusColor}"
        >${statusSpans}</text>

  <!-- Domain (ASCII) -->
  <text x="1148" y="578"
        font-family="NotoSansBengali" font-size="17"
        text-anchor="end" fill="white" fill-opacity="0.28"
        >bloodhood.pro.bd</text>
</svg>`

  try {
    const resvg = new Resvg(svg, {
      font: {
        loadSystemFonts: false,
        fontBuffers: [fontBn],
      },
      fitTo: { mode: 'width' as const, value: 1200 },
    })

    const pngData   = resvg.render()
    const pngBuffer = pngData.asPng()

    return new NextResponse(pngBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type':  'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (err) {
    console.error('[OG resvg]', err)
    return new NextResponse('error', { status: 500 })
  }
}
