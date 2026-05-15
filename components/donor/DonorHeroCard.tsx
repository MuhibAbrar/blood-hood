'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { updateUser } from '@/lib/firestore'
import { triggerInstall, isStandalonePWA } from '@/lib/installPrompt'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'

// ECG waypoints as dy from baseline
const ECG_A: [number, number][] = [
  [0,0],[34,0],[40,-3],[46,0],[60,1],[65,-45],[70,20],[76,0],[90,-9],[108,0],[160,0],
]
const ECG_B: [number, number][] = [
  [0,0],[34,0],[41,-2],[46,0],[60,1],[65,-35],[70,13],[76,0],[88,-7],[106,0],[160,0],
]
const CYCLE = 160

function getEcgDy(x: number): number {
  const pos = ((x % (CYCLE * 2)) + CYCLE * 2) % (CYCLE * 2)
  const pts = pos < CYCLE ? ECG_A : ECG_B
  const lx = pos % CYCLE
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]
    if (lx >= x0 && lx <= x1) {
      const t = x1 === x0 ? 0 : (lx - x0) / (x1 - x0)
      return y0 + t * (y1 - y0)
    }
  }
  return 0
}

interface Bird {
  x: number; y: number; spd: number; sz: number
  phase: number; phaseSpd: number; alpha: number
}

// ── Canvas: ECG tip effect + crow birds ───────────────────────────────────
function HeroCanvas() {
  const cvRef  = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const visRef = useRef(true)
  const stRef  = useRef({ tipX: 0, birds: [] as Bird[], nextBird: 2500, t: 0 })

  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = cv as HTMLCanvasElement

    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    })
    ro.observe(canvas)
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const io = new IntersectionObserver(
      ([e]) => { visRef.current = e.isIntersecting },
      { threshold: 0 }
    )
    io.observe(canvas)

    function spawnBirds() {
      const h = canvas.height
      const n = Math.random() < 0.35 ? 2 : 1
      for (let i = 0; i < n; i++)
        stRef.current.birds.push({
          x: -30 - i * 35,
          y: h * (0.06 + Math.random() * 0.28),
          spd: 1.1 + Math.random() * 0.9,
          sz:  8   + Math.random() * 6,
          phase:    Math.random() * Math.PI * 2,
          phaseSpd: 0.05 + Math.random() * 0.04,
          alpha: 0.55 + Math.random() * 0.3,
        })
    }

    // Crow silhouette — filled bezier wings
    function drawBird(ctx: CanvasRenderingContext2D, b: Bird) {
      const flap = Math.sin(b.phase)
      const { x, y, sz } = b

      ctx.save()
      ctx.globalAlpha = b.alpha
      ctx.fillStyle = 'rgba(5, 2, 10, 0.88)'

      // Left wing (filled)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.bezierCurveTo(
        x - sz * 0.45, y + flap * sz * 0.65 - sz * 0.05,
        x - sz * 0.88, y + flap * sz * 0.50,
        x - sz,        y + flap * sz * 0.20
      )
      ctx.bezierCurveTo(
        x - sz * 0.75, y + flap * sz * 0.42 + sz * 0.14,
        x - sz * 0.35, y + flap * sz * 0.30 + sz * 0.12,
        x,             y + sz * 0.10
      )
      ctx.closePath()
      ctx.fill()

      // Right wing (filled, mirror)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.bezierCurveTo(
        x + sz * 0.45, y + flap * sz * 0.65 - sz * 0.05,
        x + sz * 0.88, y + flap * sz * 0.50,
        x + sz,        y + flap * sz * 0.20
      )
      ctx.bezierCurveTo(
        x + sz * 0.75, y + flap * sz * 0.42 + sz * 0.14,
        x + sz * 0.35, y + flap * sz * 0.30 + sz * 0.12,
        x,             y + sz * 0.10
      )
      ctx.closePath()
      ctx.fill()

      // Tail (pointing left — bird flies right)
      ctx.beginPath()
      ctx.moveTo(x - sz * 0.12, y + sz * 0.04)
      ctx.lineTo(x - sz * 0.38, y + sz * 0.20)
      ctx.lineTo(x - sz * 0.28, y - sz * 0.06)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    }

    let last = 0
    function frame(ts: number) {
      if (!visRef.current) { rafRef.current = requestAnimationFrame(frame); return }
      const dt = last === 0 ? 16.67 : Math.min(ts - last, 50)
      last = ts
      const st = stRef.current
      const w  = canvas.width, h = canvas.height
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, w, h)

      // — ECG tip with smooth fade-in at left and fade-out at right —
      const spd = w * dt / 8000
      st.tipX  += spd
      if (st.tipX > w + 16) st.tipX = 0

      // Fade out as tip approaches right edge
      const rightFade = st.tipX > w * 0.84
        ? Math.max(0, (w + 16 - st.tipX) / (w * 0.16 + 16))
        : 1

      const base  = h * 0.42
      const amp   = Math.min(h * 0.21, 38)
      const trail = Math.min(w * 0.42, 190)
      const segs  = 85
      const dx    = trail / segs

      for (let i = 0; i < segs; i++) {
        const xa = st.tipX - trail + i * dx
        const xb = xa + dx
        if (xb < 0 || xa > w) continue
        const a  = Math.pow((i + 1) / segs, 1.8) * 0.50 * rightFade
        const ya = base + getEcgDy(xa) * (amp / 45)
        const yb = base + getEcgDy(xb) * (amp / 45)
        ctx.beginPath()
        ctx.moveTo(xa, ya)
        ctx.lineTo(xb, yb)
        ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`
        ctx.lineWidth = 1.6
        ctx.lineCap  = 'round'
        ctx.stroke()
      }

      // — Birds —
      st.t += dt
      if (st.t >= st.nextBird) {
        spawnBirds()
        st.nextBird = st.t + 8000 + Math.random() * 7000
      }
      st.birds = st.birds.filter(b => b.x < w + 45)
      for (const b of st.birds) {
        drawBird(ctx, b)
        b.x     += b.spd     * (dt / 16.67)
        b.phase += b.phaseSpd * (dt / 16.67)
      }

      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); io.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={cvRef} className="absolute inset-0 w-full h-full" />
}

// ── Mobile scene SVG (400×175) ─────────────────────────────────────────────
function MobileSVG() {
  return (
    <svg
      className="md:hidden absolute inset-0 w-full h-full"
      viewBox="0 0 400 175"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sun */}
      <circle cx="345" cy="28" r="52" fill="white" opacity="0.05" />
      <circle cx="345" cy="28" r="34" fill="white" opacity="0.10" />
      <circle cx="345" cy="28" r="20" fill="white" opacity="0.22" />

      {/* Cloud A */}
      <g className="cloud-a">
        <ellipse cx="55"  cy="22" rx="24" ry="11" fill="white" opacity="0.11" />
        <ellipse cx="72"  cy="18" rx="19" ry="10" fill="white" opacity="0.11" />
        <ellipse cx="88"  cy="23" rx="16" ry="9"  fill="white" opacity="0.11" />
      </g>

      {/* Cloud B */}
      <g className="cloud-b">
        <ellipse cx="200" cy="17" rx="22" ry="10" fill="white" opacity="0.08" />
        <ellipse cx="218" cy="13" rx="18" ry="9"  fill="white" opacity="0.08" />
        <ellipse cx="233" cy="18" rx="15" ry="8"  fill="white" opacity="0.08" />
      </g>

      {/* ── Buildings 3-layer ── */}

      {/* Layer 3 — far background, lightest */}
      <path fill="#5A1010" d="
        M0,175 L0,162 L30,162 L30,152 L62,152 L62,158 L95,158
        L95,148 L128,148 L128,155 L162,155 L162,146 L196,146
        L196,154 L230,154 L230,144 L264,144 L264,152 L298,152
        L298,144 L332,144 L332,152 L366,152 L366,158 L400,158
        L400,175 Z
      "/>

      {/* Layer 2 — mid */}
      <path fill="#440B0B" d="
        M0,175 L0,158 L18,158 L18,142 L36,142 L36,128 L54,128
        L54,138 L72,138 L72,122 L90,122 L90,132 L108,132
        L108,116 L126,116 L126,125 L144,125 L144,112 L162,112
        L162,124 L180,124 L180,112 L198,112 L198,124 L216,124
        L216,112 L234,112 L234,126 L252,126 L252,115 L270,115
        L270,128 L288,128 L288,118 L306,118 L306,130 L324,130
        L324,140 L342,140 L342,150 L360,150 L360,158 L380,158
        L380,165 L400,165 L400,175 Z
      "/>

      {/* Layer 1 — near foreground, darkest */}
      <path fill="#1A0303" d="
        M0,175 L0,155 L14,155 L14,138 L26,138 L26,122 L38,122
        L38,130 L48,130 L48,112 L60,112 L60,125 L70,125 L70,105
        L80,105 L80,115 L90,115 L90,95 L100,95 L100,88 L108,88
        L108,82 L118,82 L118,90 L128,90 L128,100 L140,100
        L140,112 L152,112 L152,108 L164,108 L164,118 L176,118
        L176,108 L190,108 L190,118 L204,118 L204,108 L218,108
        L218,118 L232,118 L232,108 L246,108 L246,120 L260,120
        L260,112 L275,112 L275,124 L290,124 L290,115 L305,115
        L305,128 L320,128 L320,138 L336,138 L336,147 L352,147
        L352,153 L370,153 L370,160 L390,160 L390,165 L400,165
        L400,175 Z
      "/>

      {/* Antennae on tallest buildings */}
      <path fill="#1A0303" d="M111,82 L111,73 L115,73 L115,82 Z"/>
      <path fill="#1A0303" d="M93,95  L93,87  L96,87  L96,95  Z"/>

      {/* Subtle window lights on tallest building */}
      <g fill="white" opacity="0.10">
        <rect x="110" y="84" width="2" height="1.5"/>
        <rect x="113" y="84" width="2" height="1.5"/>
        <rect x="110" y="88" width="2" height="1.5"/>
        <rect x="113" y="88" width="2" height="1.5"/>
        <rect x="110" y="92" width="2" height="1.5"/>
        <rect x="113" y="92" width="2" height="1.5"/>
      </g>

      <text x="113" y="76" textAnchor="middle" fill="white" opacity="0.14"
        fontSize="6" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="1.2">HOSPITAL</text>

      {/* Rise particles */}
      <circle cx="70"  cy="100" r="2.5" fill="white" className="animate-rise-particle" opacity="0.22" />
      <circle cx="200" cy="106" r="2"   fill="white" className="animate-rise-particle" opacity="0.16" style={{ animationDelay: '1.2s' }} />
      <circle cx="300" cy="100" r="2"   fill="white" className="animate-rise-particle" opacity="0.16" style={{ animationDelay: '2.4s' }} />
      <circle cx="360" cy="104" r="1.5" fill="white" className="animate-rise-particle" opacity="0.13" style={{ animationDelay: '0.6s' }} />
    </svg>
  )
}

// ── Desktop scene SVG (1440×175) ───────────────────────────────────────────
function DesktopSVG() {
  return (
    <svg
      className="hidden md:block absolute inset-0 w-full h-full"
      viewBox="0 0 1440 175"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sun */}
      <circle cx="1320" cy="30" r="88" fill="white" opacity="0.05" />
      <circle cx="1320" cy="30" r="57" fill="white" opacity="0.10" />
      <circle cx="1320" cy="30" r="34" fill="white" opacity="0.22" />

      {/* Cloud A */}
      <g className="cloud-a">
        <ellipse cx="160" cy="24" rx="60" ry="24" fill="white" opacity="0.09" />
        <ellipse cx="205" cy="17" rx="48" ry="20" fill="white" opacity="0.09" />
        <ellipse cx="245" cy="25" rx="40" ry="18" fill="white" opacity="0.09" />
      </g>

      {/* Cloud B */}
      <g className="cloud-b">
        <ellipse cx="620" cy="19" rx="55" ry="22" fill="white" opacity="0.07" />
        <ellipse cx="662" cy="13" rx="44" ry="18" fill="white" opacity="0.07" />
        <ellipse cx="700" cy="21" rx="37" ry="16" fill="white" opacity="0.07" />
      </g>

      {/* Cloud C */}
      <g className="cloud-c">
        <ellipse cx="980"  cy="27" rx="50" ry="20" fill="white" opacity="0.06" />
        <ellipse cx="1022" cy="20" rx="40" ry="17" fill="white" opacity="0.06" />
        <ellipse cx="1057" cy="28" rx="34" ry="15" fill="white" opacity="0.06" />
      </g>

      {/* ── Buildings 3-layer ── */}

      {/* Layer 3 — far background */}
      <path fill="#5A1010" d="
        M0,175 L0,162 L108,162 L108,152 L223,152 L223,158 L342,158
        L342,148 L461,148 L461,155 L583,155 L583,146 L706,146
        L706,154 L828,154 L828,144 L950,144 L950,152 L1073,152
        L1073,144 L1196,144 L1196,152 L1318,152 L1318,158 L1440,158
        L1440,175 Z
      "/>

      {/* Layer 2 — mid */}
      <path fill="#440B0B" d="
        M0,175 L0,158 L65,158 L65,142 L130,142 L130,128 L194,128
        L194,138 L259,138 L259,122 L324,122 L324,132 L389,132
        L389,116 L454,116 L454,125 L518,125 L518,112 L583,112
        L583,124 L648,124 L648,112 L713,112 L713,124 L778,124
        L778,112 L842,112 L842,126 L907,126 L907,115 L972,115
        L972,128 L1037,128 L1037,118 L1102,118 L1102,130 L1166,130
        L1166,140 L1231,140 L1231,150 L1296,150 L1296,158 L1368,158
        L1368,165 L1440,165 L1440,175 Z
      "/>

      {/* Layer 1 — near foreground, darkest */}
      <path fill="#1A0303" d="
        M0,175 L0,155 L50,155 L50,138 L94,138 L94,122 L137,122
        L137,130 L173,130 L173,112 L216,112 L216,125 L252,125
        L252,105 L288,105 L288,115 L324,115 L324,95 L360,95
        L360,88 L389,88 L389,82 L425,82 L425,90 L461,90 L461,100
        L504,100 L504,112 L547,112 L547,108 L590,108 L590,118
        L634,118 L634,108 L677,108 L677,118 L720,118 L720,108
        L763,108 L763,118 L806,118 L806,108 L850,108 L850,120
        L893,120 L893,112 L936,112 L936,124 L979,124 L979,115
        L1022,115 L1022,128 L1066,128 L1066,138 L1109,138
        L1109,147 L1152,147 L1152,153 L1195,153 L1195,160
        L1238,160 L1238,165 L1440,165 L1440,175 Z
      "/>

      {/* Antennae */}
      <path fill="#1A0303" d="M400,82 L400,70 L410,70 L410,82 Z"/>
      <path fill="#1A0303" d="M336,95 L336,85 L344,85 L344,95 Z"/>

      {/* Window lights on tallest building */}
      <g fill="white" opacity="0.10">
        <rect x="403" y="84" width="4" height="3"/>
        <rect x="411" y="84" width="4" height="3"/>
        <rect x="403" y="90" width="4" height="3"/>
        <rect x="411" y="90" width="4" height="3"/>
        <rect x="403" y="96" width="4" height="3"/>
        <rect x="411" y="96" width="4" height="3"/>
      </g>

      <text x="407" y="76" textAnchor="middle" fill="white" opacity="0.14"
        fontSize="9" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="1.5">HOSPITAL</text>

      {/* Particles */}
      <circle cx="200"  cy="100" r="2.5" fill="white" className="animate-rise-particle" opacity="0.20" />
      <circle cx="550"  cy="106" r="2"   fill="white" className="animate-rise-particle" opacity="0.15" style={{ animationDelay: '1.2s' }} />
      <circle cx="900"  cy="100" r="2"   fill="white" className="animate-rise-particle" opacity="0.15" style={{ animationDelay: '2.4s' }} />
      <circle cx="1180" cy="104" r="1.5" fill="white" className="animate-rise-particle" opacity="0.12" style={{ animationDelay: '0.6s' }} />
      <circle cx="1350" cy="102" r="2"   fill="white" className="animate-rise-particle" opacity="0.14" style={{ animationDelay: '1.8s' }} />
    </svg>
  )
}

function HeroIllustration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Canvas below SVG — buildings mask ECG trough, birds fly above in sky */}
      <HeroCanvas />
      <MobileSVG />
      <DesktopSVG />
    </div>
  )
}

// ── Guest hero ──────────────────────────────────────────────────────────────
function GuestHeroCard() {
  const standalone = isStandalonePWA()
  return (
    <div className="relative bg-gradient-to-b from-[#D92B2B] to-[#9B1B1B] px-4 pt-6 pb-12 text-white">
      <HeroIllustration />
      <div className="relative z-10">
        <h2 className="text-xl font-bold leading-tight mb-1">রক্ত দিন, জীবন বাঁচান</h2>
        <p className="text-white/70 text-sm mb-4 leading-relaxed">
          ডোনার হিসেবে যোগ দিন অথবা জরুরি রক্তের অনুরোধ দিন।
        </p>
        <div className="md:hidden">
          {standalone ? (
            <div className="flex gap-2">
              <Link href="/login" className="flex-1 py-2.5 rounded-xl bg-white text-[#D92B2B] text-sm font-bold text-center">লগইন করুন</Link>
              <Link href="/register" className="flex-1 py-2.5 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold text-center">রেজিস্ট্রেশন</Link>
            </div>
          ) : (
            <button onClick={triggerInstall} className="w-full py-2.5 rounded-xl bg-white text-[#D92B2B] text-sm font-bold text-center">
              📲 অ্যাপ ইনস্টল করুন — বিনামূল্যে
            </button>
          )}
        </div>
        <div className="hidden md:flex gap-2">
          <Link href="/login" className="flex-1 py-2.5 rounded-xl bg-white text-[#D92B2B] text-sm font-bold text-center hover:bg-red-50 transition-colors">লগইন করুন</Link>
          <Link href="/register" className="flex-1 py-2.5 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold text-center hover:bg-white/20 transition-colors">রেজিস্ট্রেশন করুন</Link>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-9 bg-[#FAFAFA] rounded-t-[32px] z-10" />
    </div>
  )
}

// ── Logged-in hero ──────────────────────────────────────────────────────────
export default function DonorHeroCard() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!user) return <GuestHeroCard />

  const toggle = async () => {
    setLoading(true)
    try {
      await updateUser(user.uid, { isAvailable: !user.isAvailable })
      await refreshUser()
      showToast(
        user.isAvailable ? 'আপনি Unavailable হয়েছেন' : 'আপনি Available হয়েছেন',
        user.isAvailable ? 'info' : 'success'
      )
    } catch {
      showToast('কিছু একটা সমস্যা হয়েছে', 'error')
    } finally {
      setLoading(false)
      setModalOpen(false)
    }
  }

  return (
    <>
      <div className="relative bg-gradient-to-b from-[#D92B2B] to-[#9B1B1B] px-4 pt-5 pb-12 text-white">
        <HeroIllustration />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="ring-2 ring-white/30 rounded-full shrink-0">
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt="প্রোফাইল" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <DefaultAvatar gender={user.gender} size={56} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight">{user.name}</h2>
              <p className="text-white/65 text-xs mt-0.5">{user.upazila}{user.district ? `, ${user.district}` : ''}</p>
            </div>
            <BloodGroupBadge group={user.bloodGroup} size="md" />
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm font-semibold">আমি রক্ত দিতে পারব</p>
              <p className={`text-xs mt-0.5 ${user.isAvailable ? 'text-green-300' : 'text-white/40'}`}>
                {user.isAvailable ? '● Available হিসেবে দেখা যাচ্ছে' : '○ Unavailable'}
              </p>
            </div>
            <div className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${user.isAvailable ? 'bg-[#1A9E6B]' : 'bg-white/30'}`}>
              <span className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-md transition-all duration-200 ${user.isAvailable ? 'left-[26px]' : 'left-[3px]'}`} />
            </div>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-9 bg-[#FAFAFA] rounded-t-[32px] z-10" />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !loading && setModalOpen(false)} />
          <div className="relative bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 shadow-2xl pb-[calc(1.5rem+4rem)] md:pb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#111111]">নিশ্চিত করুন</h2>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <svg className="w-5 h-5 stroke-[#555555]" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-[#555555] mb-6 text-sm leading-relaxed">
              {user.isAvailable
                ? 'আপনি কি নিজেকে Unavailable করতে চান? নতুন request-এ আপনাকে দেখানো হবে না।'
                : 'আপনি কি আবার রক্তদানের জন্য Available হতে চান?'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-[#555555] text-sm font-medium hover:bg-gray-50">বাতিল</button>
              <button onClick={toggle} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-[#D92B2B] text-white text-sm font-semibold hover:bg-[#b82424] disabled:opacity-60">
                {loading ? 'হচ্ছে...' : 'হ্যাঁ, নিশ্চিত'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
