'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { updateUser } from '@/lib/firestore'
import { triggerInstall, isStandalonePWA } from '@/lib/installPrompt'
import DefaultAvatar from '@/components/ui/DefaultAvatar'
import BloodGroupBadge from '@/components/ui/BloodGroupBadge'

// ECG waypoints as dy from baseline (original SVG: baseline=95, height=175)
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

// ── Canvas: ECG drawing-tip effect + flying birds ─────────────────────────
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
          x: -25 - i * 30,
          y: h * (0.05 + Math.random() * 0.30),
          spd: 1.2 + Math.random() * 1.0,
          sz:  6   + Math.random() * 5,
          phase:    Math.random() * Math.PI * 2,
          phaseSpd: 0.06 + Math.random() * 0.05,
          alpha: 0.45 + Math.random() * 0.35,
        })
    }

    function drawBird(ctx: CanvasRenderingContext2D, b: Bird) {
      const flap = Math.sin(b.phase)
      ctx.save()
      ctx.globalAlpha = b.alpha
      ctx.strokeStyle = 'white'
      ctx.lineWidth   = 1.6
      ctx.lineCap     = 'round'
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.quadraticCurveTo(b.x - b.sz * 0.6, b.y + flap * b.sz * 0.55, b.x - b.sz, b.y + flap * b.sz * 0.2)
      ctx.moveTo(b.x, b.y)
      ctx.quadraticCurveTo(b.x + b.sz * 0.6, b.y + flap * b.sz * 0.55, b.x + b.sz, b.y + flap * b.sz * 0.2)
      ctx.stroke()
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

      // ECG gradient-trail — baseline sits above buildings
      const spd   = w * dt / 8000            // crosses screen in 8 s
      st.tipX    += spd
      if (st.tipX > w + 12) st.tipX = 0

      const base  = h * 0.42
      const amp   = Math.min(h * 0.21, 38)
      const trail = Math.min(w * 0.42, 190)
      const segs  = 85
      const dx    = trail / segs

      for (let i = 0; i < segs; i++) {
        const xa = st.tipX - trail + i * dx
        const xb = xa + dx
        if (xb < 0 || xa > w) continue
        const a  = Math.pow((i + 1) / segs, 1.8) * 0.5
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

      // Birds
      st.t += dt
      if (st.t >= st.nextBird) {
        spawnBirds()
        st.nextBird = st.t + 8000 + Math.random() * 7000
      }
      st.birds = st.birds.filter(b => b.x < w + 40)
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

// ── Mobile scene SVG (viewBox 400×175) ────────────────────────────────────
function MobileSVG() {
  return (
    <svg
      className="md:hidden absolute inset-0 w-full h-full"
      viewBox="0 0 400 175"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sun — 3 concentric halos */}
      <circle cx="345" cy="28" r="52" fill="white" opacity="0.05" />
      <circle cx="345" cy="28" r="34" fill="white" opacity="0.10" />
      <circle cx="345" cy="28" r="20" fill="white" opacity="0.22" />

      {/* Cloud A — drifts left */}
      <g className="cloud-a">
        <ellipse cx="55"  cy="22" rx="24" ry="11" fill="white" opacity="0.11" />
        <ellipse cx="72"  cy="18" rx="19" ry="10" fill="white" opacity="0.11" />
        <ellipse cx="88"  cy="23" rx="16" ry="9"  fill="white" opacity="0.11" />
      </g>

      {/* Cloud B — drifts right */}
      <g className="cloud-b">
        <ellipse cx="195" cy="17" rx="22" ry="10" fill="white" opacity="0.08" />
        <ellipse cx="213" cy="13" rx="18" ry="9"  fill="white" opacity="0.08" />
        <ellipse cx="228" cy="18" rx="15" ry="8"  fill="white" opacity="0.08" />
      </g>

      {/* Background city layer */}
      <path d="M0,175 L0,142 L55,142 L55,122 L105,122 L105,138 L148,138 L148,104 L182,104 L182,120 L238,120 L238,108 L282,108 L282,128 L334,128 L334,114 L384,114 L384,140 L400,140 L400,175 Z"
        fill="#771212" />

      {/* Foreground city skyline */}
      <path d="M0,175 L0,148 L22,148 L22,128 L38,128 L38,112 L55,112 L55,132 L68,132 L68,106 L84,106 L84,145 L92,145 L92,118 L104,118 L104,96 L116,96 L116,83 L148,83 L148,96 L162,96 L162,115 L178,115 L178,130 L196,130 L196,112 L214,112 L214,128 L230,128 L230,114 L248,114 L248,128 L266,128 L266,106 L284,106 L284,132 L300,132 L300,118 L318,118 L318,110 L338,110 L338,128 L355,128 L355,116 L375,116 L375,138 L400,138 L400,175 Z"
        fill="#550909" />

      <text x="132" y="76" textAnchor="middle" fill="white" opacity="0.18"
        fontSize="7" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="1.5">HOSPITAL</text>

      <circle cx="70"  cy="102" r="2.5" fill="white" className="animate-rise-particle" opacity="0.22" />
      <circle cx="200" cy="108" r="2"   fill="white" className="animate-rise-particle" opacity="0.16" style={{ animationDelay: '1.2s' }} />
      <circle cx="300" cy="102" r="2"   fill="white" className="animate-rise-particle" opacity="0.16" style={{ animationDelay: '2.4s' }} />
      <circle cx="370" cy="106" r="1.5" fill="white" className="animate-rise-particle" opacity="0.13" style={{ animationDelay: '0.6s' }} />
    </svg>
  )
}

// ── Desktop scene SVG (viewBox 1440×175) ──────────────────────────────────
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

      {/* Background city layer */}
      <path d="M0,175 L0,140 L180,140 L180,118 L360,118 L360,132 L560,132 L560,108 L660,108 L660,95 L700,95 L700,80 L760,80 L760,95 L860,95 L860,108 L1060,108 L1060,125 L1260,125 L1260,140 L1440,140 L1440,175 Z"
        fill="#771212" />

      {/* Foreground city skyline */}
      <path d="M0,175 L0,148 L28,148 L28,128 L50,128 L50,110 L72,110 L72,130 L90,130 L90,112 L112,112 L112,128 L130,128 L130,108 L152,108 L152,122 L172,122 L172,110 L194,110 L194,128 L212,128 L212,114 L234,114 L234,126 L254,126 L254,108 L276,108 L276,124 L296,124 L296,112 L318,112 L318,128 L336,128 L336,110 L358,110 L358,124 L378,124 L378,112 L400,112 L400,128 L418,128 L418,110 L440,110 L440,126 L460,126 L460,108 L482,108 L482,124 L502,124 L502,112 L524,112 L524,126 L542,126 L542,108 L564,108 L564,122 L582,122 L582,110 L604,110 L604,122 L622,122 L622,100 L645,100 L645,90 L668,90 L668,80 L692,80 L692,70 L748,70 L748,80 L772,80 L772,90 L795,90 L795,102 L818,102 L818,118 L836,118 L836,108 L858,108 L858,124 L876,124 L876,112 L898,112 L898,126 L916,126 L916,108 L938,108 L938,122 L958,122 L958,110 L980,110 L980,126 L998,126 L998,112 L1020,112 L1020,128 L1038,128 L1038,110 L1060,110 L1060,126 L1078,126 L1078,112 L1100,112 L1100,128 L1118,128 L1118,110 L1140,110 L1140,124 L1160,124 L1160,108 L1182,108 L1182,126 L1200,126 L1200,112 L1222,112 L1222,128 L1240,128 L1240,110 L1262,110 L1262,124 L1282,124 L1282,112 L1304,112 L1304,128 L1322,128 L1322,112 L1344,112 L1344,126 L1362,126 L1362,110 L1384,110 L1384,128 L1402,128 L1402,115 L1424,115 L1424,135 L1440,135 L1440,175 Z"
        fill="#550909" />

      <text x="720" y="60" textAnchor="middle" fill="white" opacity="0.18"
        fontSize="11" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="2">HOSPITAL</text>

      <circle cx="200"  cy="102" r="2.5" fill="white" className="animate-rise-particle" opacity="0.20" />
      <circle cx="500"  cy="108" r="2"   fill="white" className="animate-rise-particle" opacity="0.15" style={{ animationDelay: '1.2s' }} />
      <circle cx="900"  cy="102" r="2"   fill="white" className="animate-rise-particle" opacity="0.15" style={{ animationDelay: '2.4s' }} />
      <circle cx="1180" cy="106" r="1.5" fill="white" className="animate-rise-particle" opacity="0.12" style={{ animationDelay: '0.6s' }} />
      <circle cx="1380" cy="104" r="2"   fill="white" className="animate-rise-particle" opacity="0.14" style={{ animationDelay: '1.8s' }} />
    </svg>
  )
}

function HeroIllustration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Canvas behind SVG so buildings naturally mask ECG trough */}
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
