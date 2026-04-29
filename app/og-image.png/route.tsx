import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #D92B2B 0%, #8B1010 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Background circles */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-120px', left: '-60px', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex' }} />

        {/* Blood drop icon */}
        <div style={{ fontSize: '100px', marginBottom: '24px', display: 'flex' }}>🩸</div>

        {/* Title */}
        <div style={{ fontSize: '72px', fontWeight: 'bold', color: 'white', letterSpacing: '-2px', display: 'flex' }}>
          Blood Hood
        </div>

        {/* Tagline */}
        <div style={{ fontSize: '32px', color: 'rgba(255,255,255,0.85)', marginTop: '16px', display: 'flex' }}>
          খুলনার কমিউনিটি রক্তদান প্ল্যাটফর্ম
        </div>

        {/* Features row */}
        <div style={{ display: 'flex', gap: '32px', marginTop: '48px' }}>
          {['🔍 রক্তদাতা খুঁজুন', '🆘 রক্তের অনুরোধ', '🏕️ ক্যাম্পে অংশ নিন'].map((f) => (
            <div key={f} style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '12px 24px',
              color: 'white',
              fontSize: '22px',
              display: 'flex',
            }}>
              {f}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{ position: 'absolute', bottom: '32px', color: 'rgba(255,255,255,0.5)', fontSize: '20px', display: 'flex' }}>
          bloodhood.pro.bd
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
