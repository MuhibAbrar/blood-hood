import { NextRequest, NextResponse } from 'next/server'
import { Resvg } from '@resvg/resvg-js'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
 * Bengali font space glyph = zero advance-width in resvg.
 * Split on spaces → emit <tspan dx> for each word boundary.
 */
function w(text: string, fontSize: number): string {
  const words = String(text).split(' ').filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return x(words[0])
  const spacePx = Math.round(fontSize * 0.50)   // ≈ 0.5em word-space
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
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansBengali-Bold.ttf')
  const data     = await fetchRequest(params.id)

  const bloodGroup  = String(data?.bloodGroup  ?? '')
  const patientName = trunc(String(data?.patientName ?? 'রক্তের অনুরোধ'), 16)
  const hospital    = trunc(String(data?.hospital    ?? ''), 24)
  const area        = trunc(String(data?.area        ?? ''), 24)
  const urgency     = data?.urgency === 'urgent' ? 'urgent' : 'normal'
  const status      = String(data?.status ?? 'open')
  const bags        = Number(data?.bags ?? 1)

  const isUrgent    = urgency === 'urgent'
  const isFulfilled = status === 'fulfilled'
  const isCancelled = status === 'cancelled'

  // ── Colours ──────────────────────────────────────────────────────────────
  const accent    = isUrgent ? '#FF4444' : '#DD2222'
  const accentDim = isUrgent ? '#CC2222' : '#991111'
  const bgFrom    = isUrgent ? '#620000' : '#720000'
  const bgMid     = '#1a0000'

  // ── Font sizes ────────────────────────────────────────────────────────────
  const bgFontSize   = bloodGroup.length > 2 ? 58 : 74
  const nameFontSize = patientName.length > 11 ? 40 : 50

  // ── Tagline (top of info panel — instantly tells reader what this is) ─────
  const tagline = isFulfilled
    ? 'রক্তের ব্যবস্থা হয়েছে'
    : isCancelled
    ? 'এই অনুরোধ বাতিল হয়েছে'
    : isUrgent
    ? 'জরুরি রক্তের প্রয়োজন!'
    : 'রক্তের প্রয়োজন আছে'

  const taglineColor = isFulfilled ? '#3DEBA0' : isCancelled ? '#999999' : accent
  const taglineBg    = isFulfilled ? '#1A9E6B' : isCancelled ? '#444444' : accentDim

  // ── Status badge ──────────────────────────────────────────────────────────
  const statusText = isFulfilled
    ? 'পূর্ণ হয়েছে'
    : isCancelled
    ? 'বাতিল'
    : isUrgent
    ? 'এখনই সাহায্য করুন!'
    : 'রক্ত দিন'

  const statusColor  = isFulfilled ? '#3DEBA0' : isCancelled ? '#bbbbbb' : isUrgent ? '#FFAAAA' : '#ffffff'
  const statusFill   = isFulfilled ? '#1A9E6B' : isCancelled ? '#555555' : accentDim
  const urgencyLabel = isUrgent ? 'URGENT' : 'Blood Request'

  // ── Pre-compute Bengali tspan strings ─────────────────────────────────────
  const taglineSpans     = w(tagline,     28)
  const patientNameSpans = w(patientName, nameFontSize)
  const hospitalSpans    = w(hospital,    25)
  const areaSpans        = w(area,        25)
  const statusSpans      = w(statusText,  20)
  const bagsLabel        = w(`${bags} ব্যাগ দরকার`, 17)

  // ── Vertical layout (right panel: x≥382, y=100–546) ──────────────────────
  //  100–155  tagline strip
  //  172      PATIENT micro-label
  //  228      patient name baseline      (top ≈ 193 for font-50)
  //  258      accent underline
  //  315      hospital text baseline     (icon y=290–320)
  //  390      area text baseline         (icon cy=382)
  //  445–495  CTA strip (link / bags)
  const nameY      = 228
  const hospY      = 315   // hospital text baseline
  const areaY      = 390   // area text baseline
  const ctaY       = 460   // CTA / bags strip

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"
                    gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="${bgFrom}"/>
      <stop offset="100%" stop-color="${bgMid}"/>
    </linearGradient>
    <linearGradient id="cg" x1="0.25" y1="0.25" x2="1" y2="1"
                    gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="${isUrgent ? '#ff5555' : '#cc3333'}"/>
      <stop offset="100%" stop-color="${isUrgent ? '#880000' : '#660000'}"/>
    </linearGradient>
  </defs>

  <!-- ── Background ── -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- subtle radial glows -->
  <circle cx="1160" cy="-60"  r="360" fill="white" fill-opacity="0.028"/>
  <circle cx="-40"  cy="690"  r="300" fill="white" fill-opacity="0.025"/>
  ${isUrgent ? `<circle cx="600" cy="630" r="440" fill="${accentDim}" fill-opacity="0.06"/>` : ''}

  <!-- ── TOP BAR ── -->
  <!-- brand pill -->
  <rect x="48" y="28" width="60" height="60" rx="16"
        fill="white" fill-opacity="0.09"/>
  <ellipse cx="78" cy="66" rx="11" ry="13.5" fill="${accent}"/>
  <polygon points="78,42 65,65 91,65" fill="${accent}"/>
  <text x="124" y="74"
        font-family="NotoSansBengali" font-size="28" font-weight="700"
        fill="white" fill-opacity="0.92">Blood Hood</text>

  <!-- urgency badge -->
  <rect x="${isUrgent ? 1008 : 944}" y="28"
        width="${isUrgent ? 160 : 224}" height="56" rx="28"
        fill="${isUrgent ? accentDim : 'none'}"
        stroke="${isUrgent ? 'none' : 'white'}" stroke-opacity="0.20" stroke-width="1.5"/>
  <text x="${isUrgent ? 1088 : 1056}" y="67"
        font-family="NotoSansBengali" font-size="23" font-weight="700"
        text-anchor="middle" fill="white"
        fill-opacity="${isUrgent ? '1' : '0.72'}"
        >${x(urgencyLabel)}</text>

  <!-- ── BLOOD GROUP CIRCLE ── -->
  <!-- outer glow ring -->
  <circle cx="210" cy="305" r="124"
          fill="none" stroke="${accentDim}"
          stroke-opacity="${isUrgent ? '0.38' : '0.15'}"
          stroke-width="26"/>
  <!-- main filled circle -->
  <circle cx="210" cy="305" r="104"
          fill="url(#cg)" stroke="white" stroke-opacity="0.15" stroke-width="3"/>
  <!-- blood group text -->
  <text x="210" y="${305 + bgFontSize * 0.36}"
        font-family="NotoSansBengali" font-size="${bgFontSize}" font-weight="700"
        text-anchor="middle" fill="white" letter-spacing="-1"
        >${x(bloodGroup) || '?'}</text>
  <!-- "রক্তের গ্রুপ" label below circle -->
  <text x="210" y="432"
        font-family="NotoSansBengali" font-size="14" letter-spacing="1"
        text-anchor="middle" fill="white" fill-opacity="0.40"
        >${w('রক্তের গ্রুপ', 14)}</text>

  ${bags > 1 ? `
  <!-- bags badge -->
  <rect x="130" y="450" width="160" height="36" rx="18"
        fill="${accentDim}" fill-opacity="0.20"
        stroke="${accentDim}" stroke-opacity="0.50" stroke-width="1.5"/>
  <text x="210" y="474"
        font-family="NotoSansBengali" font-size="17" font-weight="700"
        text-anchor="middle" fill="${accent}"
        >${bagsLabel}</text>
  ` : ''}

  <!-- ── VERTICAL DIVIDER ── -->
  <line x1="366" y1="100" x2="366" y2="530"
        stroke="white" stroke-opacity="0.055" stroke-width="1"/>

  <!-- ════════════════════════════════════════════════════════ -->
  <!-- ── INFO PANEL ──                                        -->
  <!-- ════════════════════════════════════════════════════════ -->

  <!-- ① TAGLINE STRIP — first thing the eye sees -->
  <rect x="366" y="100" width="834" height="55"
        fill="${taglineBg}" fill-opacity="0.16"/>
  <!-- left accent bar -->
  <rect x="366" y="100" width="6" height="55"
        fill="${taglineColor}" fill-opacity="1"/>
  <!-- tagline text -->
  <text x="386" y="139"
        font-family="NotoSansBengali" font-size="28" font-weight="700"
        fill="${taglineColor}"
        >${taglineSpans}</text>

  <!-- ② PATIENT micro-label -->
  <text x="386" y="180"
        font-family="NotoSansBengali" font-size="13" letter-spacing="3.5"
        fill="white" fill-opacity="0.36"
        >PATIENT</text>

  <!-- ③ Patient name -->
  <text x="386" y="${nameY}"
        font-family="NotoSansBengali" font-size="${nameFontSize}" font-weight="700"
        fill="white"
        >${patientNameSpans}</text>

  <!-- ④ Accent underline below name -->
  <rect x="386" y="${nameY + 16}" width="56" height="4" rx="2"
        fill="${accentDim}" fill-opacity="0.9"/>

  <!-- ⑤ Hospital row -->
  <!-- H-shaped icon -->
  <rect x="386" y="${hospY - 26}" width="4" height="30" rx="2"
        fill="white" fill-opacity="0.32"/>
  <rect x="400" y="${hospY - 26}" width="4" height="30" rx="2"
        fill="white" fill-opacity="0.32"/>
  <rect x="386" y="${hospY - 12}" width="18" height="4" rx="2"
        fill="white" fill-opacity="0.32"/>
  <text x="418" y="${hospY}"
        font-family="NotoSansBengali" font-size="25" font-weight="700"
        fill="white" fill-opacity="0.88"
        >${hospitalSpans}</text>

  <!-- ⑥ Area row -->
  <!-- pin icon -->
  <circle cx="393" cy="${areaY - 8}" r="9"
          fill="${accentDim}" fill-opacity="0.65"/>
  <circle cx="393" cy="${areaY - 8}" r="4"
          fill="white" fill-opacity="0.50"/>
  <text x="418" y="${areaY}"
        font-family="NotoSansBengali" font-size="25" font-weight="700"
        fill="white" fill-opacity="0.88"
        >${areaSpans}</text>

  <!-- ⑦ CTA / info strip near bottom -->
  <rect x="366" y="${ctaY}" width="834" height="52"
        fill="white" fill-opacity="0.04"/>
  ${bags > 1 && !isFulfilled && !isCancelled ? `
  <!-- bags needed info in right panel -->
  <text x="386" y="${ctaY + 33}"
        font-family="NotoSansBengali" font-size="19" font-weight="700"
        fill="${accent}" fill-opacity="0.85"
        >${w(bags + ' ব্যাগ রক্তের প্রয়োজন', 19)}</text>
  ` : `
  <!-- call to action text -->
  <text x="386" y="${ctaY + 33}"
        font-family="NotoSansBengali" font-size="19"
        fill="white" fill-opacity="0.38"
        >${w('Blood Hood-এ বিস্তারিত দেখুন', 19)}</text>
  `}

  <!-- ── BOTTOM BAR ── -->
  <rect x="48" y="548" width="330" height="50" rx="25"
        fill="${statusFill}" fill-opacity="0.22"
        stroke="${statusFill}" stroke-opacity="0.58" stroke-width="2"/>
  <text x="213" y="580"
        font-family="NotoSansBengali" font-size="20" font-weight="700"
        text-anchor="middle" fill="${statusColor}"
        >${statusSpans}</text>

  <text x="1148" y="580"
        font-family="NotoSansBengali" font-size="17"
        text-anchor="end" fill="white" fill-opacity="0.22"
        >bloodhood.pro.bd</text>
</svg>`

  try {
    const resvg = new Resvg(svg, {
      font: {
        loadSystemFonts: false,
        fontFiles: [fontPath],
      },
      fitTo: { mode: 'width' as const, value: 1200 },
    })

    const pngBuffer = resvg.render().asPng()

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
