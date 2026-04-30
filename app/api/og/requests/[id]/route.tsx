import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function getOrigin(req: NextRequest): string {
  const host = req.headers.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const origin = getOrigin(req)

  // Load font and request data in parallel
  const [fontRes, data] = await Promise.all([
    fetch(`${origin}/fonts/NotoSansBengali-Bold.woff`).catch(() => null),
    fetchRequest(params.id),
  ])

  const fontData = fontRes?.ok ? await fontRes.arrayBuffer() : null
  const fonts = fontData
    ? [{ name: 'Bengali', data: fontData, weight: 700 as const }]
    : []

  const bloodGroup  = (data?.bloodGroup  as string) || ''
  const patientName = (data?.patientName as string) || ''
  const hospital    = (data?.hospital    as string) || ''
  const area        = (data?.area        as string) || ''
  const urgency     = (data?.urgency     as string) === 'urgent' ? 'urgent' : 'normal'
  const status      = (data?.status      as string) || 'open'
  const bags        = (data?.bags        as number) || 1

  const isUrgent = urgency === 'urgent'
  const isFulfilled = status === 'fulfilled'
  const isCancelled = status === 'cancelled'

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: isUrgent
            ? 'linear-gradient(135deg, #7B0000 0%, #2D0000 60%, #1a0000 100%)'
            : 'linear-gradient(135deg, #8B0000 0%, #3D0000 60%, #1a0000 100%)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Bengali", sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -150, right: -100,
          width: 450, height: 450, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -80,
          width: 350, height: 350, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', display: 'flex',
        }} />

        {/* ── TOP BAR ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '36px 56px 0',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 16,
              background: 'rgba(255,255,255,0.13)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 30,
            }}>🩸</div>
            <span style={{
              color: 'rgba(255,255,255,0.92)', fontSize: 30,
              fontWeight: 700, letterSpacing: '-0.5px', display: 'flex',
            }}>Blood Hood</span>
          </div>

          {/* Urgency badge */}
          {isUrgent ? (
            <div style={{
              background: '#D92B2B', color: 'white',
              fontSize: 26, fontWeight: 700,
              padding: '12px 28px', borderRadius: 50,
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 4px 24px rgba(217,43,43,0.5)',
            }}>
              🔴 URGENT
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.12)',
              border: '2px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 24, fontWeight: 700,
              padding: '12px 28px', borderRadius: 50,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              🩸 Blood Request
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{
          display: 'flex', flex: 1,
          alignItems: 'center',
          padding: '20px 56px',
          gap: 56,
        }}>
          {/* Blood group circle */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 210, height: 210, borderRadius: '50%',
              background: isUrgent
                ? 'radial-gradient(circle at 35% 35%, #ff4444, #aa0000)'
                : 'radial-gradient(circle at 35% 35%, #cc2222, #880000)',
              border: '4px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isUrgent
                ? '0 0 60px rgba(217,43,43,0.6), 0 8px 40px rgba(0,0,0,0.5)'
                : '0 8px 40px rgba(0,0,0,0.4)',
            }}>
              <span style={{
                color: 'white',
                fontSize: bloodGroup.length > 2 ? 60 : 76,
                fontWeight: 700, display: 'flex',
                letterSpacing: '-2px',
              }}>
                {bloodGroup || '?'}
              </span>
            </div>

            {bags > 1 && (
              <div style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,100,100,0.4)',
                color: '#ffaaaa', fontSize: 20,
                padding: '6px 18px', borderRadius: 30,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                🩸 {bags} bags needed
              </div>
            )}
          </div>

          {/* Info panel */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 18, flex: 1, minWidth: 0,
          }}>
            {/* Patient label + name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 18, letterSpacing: '2px',
                textTransform: 'uppercase', display: 'flex',
              }}>Patient</span>
              <span style={{
                color: 'white',
                fontSize: patientName.length > 18 ? 38 : 48,
                fontWeight: 700, lineHeight: 1.1, display: 'flex',
              }}>
                {patientName || 'Blood Request'}
              </span>
            </div>

            {/* Divider */}
            <div style={{
              width: 60, height: 3,
              background: isUrgent ? '#D92B2B' : 'rgba(255,255,255,0.2)',
              borderRadius: 2, display: 'flex',
            }} />

            {/* Hospital & area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {hospital ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 20, flexShrink: 0,
                  }}>🏥</div>
                  <span style={{
                    color: 'rgba(255,255,255,0.82)',
                    fontSize: 26, display: 'flex',
                  }}>{hospital}</span>
                </div>
              ) : null}
              {area ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 20, flexShrink: 0,
                  }}>📍</div>
                  <span style={{
                    color: 'rgba(255,255,255,0.82)',
                    fontSize: 26, display: 'flex',
                  }}>{area}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 56px 36px',
        }}>
          {isFulfilled ? (
            <div style={{
              background: 'rgba(26,158,107,0.25)',
              border: '2px solid #1A9E6B',
              color: '#4FFFB0', fontSize: 22, fontWeight: 700,
              padding: '10px 24px', borderRadius: 40,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ✓ Fulfilled
            </div>
          ) : isCancelled ? (
            <div style={{
              background: 'rgba(120,120,120,0.2)',
              border: '2px solid #888',
              color: '#ccc', fontSize: 22, fontWeight: 700,
              padding: '10px 24px', borderRadius: 40,
              display: 'flex',
            }}>
              Request Closed
            </div>
          ) : (
            <div style={{
              background: isUrgent
                ? 'rgba(217,43,43,0.3)'
                : 'rgba(255,255,255,0.1)',
              border: `2px solid ${isUrgent ? 'rgba(217,43,43,0.7)' : 'rgba(255,255,255,0.2)'}`,
              color: isUrgent ? '#FF9999' : 'rgba(255,255,255,0.7)',
              fontSize: 22, fontWeight: 700,
              padding: '10px 24px', borderRadius: 40,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {isUrgent ? '⚡ Help Needed Now!' : '🙏 Can You Donate?'}
            </div>
          )}

          <span style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 18, display: 'flex',
          }}>
            bloodhood.pro.bd
          </span>
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
