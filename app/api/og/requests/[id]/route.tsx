import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const urgencyColors: Record<string, { bg: string; badge: string; label: string }> = {
  urgent: { bg: '#7B0000', badge: '#D92B2B', label: '🔴 জরুরি' },
  normal:  { bg: '#8B0000', badge: '#B22222', label: '🩸 রক্ত লাগবে' },
}

function getOrigin(req: NextRequest): string {
  const host = req.headers.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

async function loadFont(origin: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${origin}/fonts/NotoSansBengali-Bold.woff`)
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

async function fetchRequest(id: string): Promise<Record<string, unknown> | null> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!projectId) return null

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/bloodRequests/${id}`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return null

    const json = await res.json()
    if (!json.fields) return null

    // Parse Firestore field format: { fieldName: { stringValue/integerValue/... } }
    const f = json.fields as Record<string, { stringValue?: string; integerValue?: string; booleanValue?: boolean }>
    return {
      bloodGroup:  f.bloodGroup?.stringValue ?? '',
      patientName: f.patientName?.stringValue ?? '',
      hospital:    f.hospital?.stringValue ?? '',
      area:        f.area?.stringValue ?? '',
      urgency:     f.urgency?.stringValue ?? 'normal',
      status:      f.status?.stringValue ?? 'open',
      bags:        parseInt(f.bags?.integerValue ?? '1', 10),
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const origin = getOrigin(req)

  // Load font and request data in parallel
  const [fontData, data] = await Promise.all([
    loadFont(origin),
    fetchRequest(params.id),
  ])

  const fonts = fontData
    ? [{ name: 'NotoSansBengali', data: fontData, weight: 400 as const }]
    : []

  const bloodGroup  = (data?.bloodGroup  as string) || ''
  const patientName = (data?.patientName as string) || ''
  const hospital    = (data?.hospital    as string) || ''
  const area        = (data?.area        as string) || ''
  const urgency     = (data?.urgency     as string) === 'urgent' ? 'urgent' : 'normal'
  const status      = (data?.status      as string) || 'open'
  const bags        = (data?.bags        as number) || 1

  const colors = urgencyColors[urgency]
  const statusClosed = status !== 'open'

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: `linear-gradient(135deg, ${colors.bg} 0%, #2D0000 100%)`,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: fontData ? 'NotoSansBengali' : 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -120, right: -120,
          width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
        }} />

        {/* Top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '36px 60px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>🩸</div>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 28, fontWeight: 700, display: 'flex' }}>Blood Hood</span>
          </div>

          <div style={{
            background: colors.badge,
            color: 'white',
            fontSize: 24,
            fontWeight: 700,
            padding: '10px 24px',
            borderRadius: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            {colors.label}
          </div>
        </div>

        {/* Main content */}
        <div style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          padding: '30px 60px',
          gap: 60,
        }}>
          {/* Blood group badge */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}>
            <div style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              border: '4px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}>
              <span style={{
                color: 'white',
                fontSize: bloodGroup.length > 2 ? 56 : 72,
                fontWeight: 700,
                display: 'flex',
              }}>
                {bloodGroup || '🩸'}
              </span>
            </div>
            {bags > 1 && (
              <div style={{
                color: 'rgba(255,200,200,1)',
                fontSize: 22,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                🩸 {bags} ব্যাগ দরকার
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 22, display: 'flex' }}>রোগীর নাম</span>
              <span style={{
                color: 'white',
                fontSize: patientName.length > 20 ? 40 : 52,
                fontWeight: 700,
                lineHeight: 1.15,
                display: 'flex',
                overflow: 'hidden',
              }}>
                {patientName || 'রোগীর নাম'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {hospital ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 40, height: 40,
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>🏥</div>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 28, display: 'flex' }}>{hospital}</span>
                </div>
              ) : null}
              {area ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 40, height: 40,
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>📍</div>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 28, display: 'flex' }}>{area}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 60px 36px',
        }}>
          {statusClosed ? (
            <div style={{
              background: status === 'fulfilled' ? 'rgba(26,158,107,0.3)' : 'rgba(100,100,100,0.3)',
              border: `2px solid ${status === 'fulfilled' ? '#1A9E6B' : '#888'}`,
              color: status === 'fulfilled' ? '#4FFFB0' : '#ccc',
              fontSize: 22,
              fontWeight: 700,
              padding: '10px 24px',
              borderRadius: 40,
              display: 'flex',
            }}>
              {status === 'fulfilled' ? '✓ অনুরোধ পূর্ণ হয়েছে' : 'অনুরোধ বাতিল'}
            </div>
          ) : (
            <div style={{
              background: 'rgba(217,43,43,0.25)',
              border: '2px solid rgba(217,43,43,0.6)',
              color: '#FF9999',
              fontSize: 22,
              fontWeight: 700,
              padding: '10px 24px',
              borderRadius: 40,
              display: 'flex',
            }}>
              ⏰ এখনই সাহায্য করুন!
            </div>
          )}

          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20, display: 'flex' }}>
            bloodhood.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    }
  )
}
