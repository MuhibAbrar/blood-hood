'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { updateUser } from '@/lib/firestore'
import { triggerInstall, isStandalonePWA } from '@/lib/installPrompt'
import DefaultAvatar from '@/components/ui/DefaultAvatar'

// ── Drawer menu items ──────────────────────────────────────────────────────
const MENU_ITEMS = [
  { href: '/dashboard', label: 'Home',               icon: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22v-10h6v10' },
  { href: '/complain',  label: 'Complain',            icon: 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' },
  { href: '/contact',   label: 'Contact us',          icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 17z' },
  { href: '/follow',    label: 'Follow us',           icon: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
  { href: '/terms',     label: 'Terms & Conditions',  icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z' },
  { href: '/about',     label: 'About us',            icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-7v-3m0-4h.01' },
]

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
  const lx  = pos % CYCLE
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]
    if (lx >= x0 && lx <= x1) return y0 + (x1 === x0 ? 0 : (lx - x0) / (x1 - x0)) * (y1 - y0)
  }
  return 0
}

interface Bird { x:number; y:number; spd:number; sz:number; phase:number; phaseSpd:number; alpha:number }

// ── Canvas: ECG tip + crow birds ───────────────────────────────────────────
function HeroCanvas() {
  const cvRef    = useRef<HTMLCanvasElement>(null)
  const rafRef   = useRef<number>(0)
  const visRef   = useRef(true)
  const scrollRef = useRef(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>()
  const stRef    = useRef({ tipX: 0, birds: [] as Bird[], nextBird: 2500, t: 0 })

  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = cv as HTMLCanvasElement

    const ro = new ResizeObserver(() => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight })
    ro.observe(canvas)
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight

    const io = new IntersectionObserver(([e]) => { visRef.current = e.isIntersecting }, { threshold: 0 })
    io.observe(canvas)

    const onScroll = () => {
      scrollRef.current = true
      clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => { scrollRef.current = false }, 120)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    function spawnBirds() {
      const h = canvas.height, n = Math.random() < 0.35 ? 2 : 1
      for (let i = 0; i < n; i++)
        stRef.current.birds.push({
          x: -30 - i * 35, y: h * (0.06 + Math.random() * 0.28),
          spd: 1.1 + Math.random() * 0.9, sz: 8 + Math.random() * 6,
          phase: Math.random() * Math.PI * 2, phaseSpd: 0.05 + Math.random() * 0.04,
          alpha: 0.55 + Math.random() * 0.3,
        })
    }

    function drawBird(ctx: CanvasRenderingContext2D, b: Bird) {
      const flap = Math.sin(b.phase); const { x, y, sz } = b
      ctx.save(); ctx.globalAlpha = b.alpha; ctx.fillStyle = 'rgba(5,2,10,0.88)'
      ctx.beginPath(); ctx.moveTo(x, y)
      ctx.bezierCurveTo(x-sz*.45, y+flap*sz*.65-sz*.05, x-sz*.88, y+flap*sz*.5, x-sz, y+flap*sz*.2)
      ctx.bezierCurveTo(x-sz*.75, y+flap*sz*.42+sz*.14, x-sz*.35, y+flap*sz*.3+sz*.12, x, y+sz*.1)
      ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(x, y)
      ctx.bezierCurveTo(x+sz*.45, y+flap*sz*.65-sz*.05, x+sz*.88, y+flap*sz*.5, x+sz, y+flap*sz*.2)
      ctx.bezierCurveTo(x+sz*.75, y+flap*sz*.42+sz*.14, x+sz*.35, y+flap*sz*.3+sz*.12, x, y+sz*.1)
      ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(x-sz*.12, y+sz*.04)
      ctx.lineTo(x-sz*.38, y+sz*.2); ctx.lineTo(x-sz*.28, y-sz*.06)
      ctx.closePath(); ctx.fill(); ctx.restore()
    }

    let last = 0
    function frame(ts: number) {
      if (!visRef.current || scrollRef.current) { rafRef.current = requestAnimationFrame(frame); return }
      const dt = last === 0 ? 16.67 : Math.min(ts - last, 50); last = ts
      const st = stRef.current, w = canvas.width, h = canvas.height
      const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, w, h)
      const spd = w * dt / 8000; st.tipX += spd
      if (st.tipX > w + 16) st.tipX = 0
      const rightFade = st.tipX > w * 0.84 ? Math.max(0, (w + 16 - st.tipX) / (w * 0.16 + 16)) : 1
      const base = h * 0.42, amp = Math.min(h * 0.21, 38), trail = Math.min(w * 0.42, 190)
      const segs = 85, dx = trail / segs
      for (let i = 0; i < segs; i++) {
        const xa = st.tipX - trail + i * dx, xb = xa + dx
        if (xb < 0 || xa > w) continue
        const a = Math.pow((i + 1) / segs, 1.8) * 0.50 * rightFade
        const ya = base + getEcgDy(xa) * (amp / 45), yb = base + getEcgDy(xb) * (amp / 45)
        ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb)
        ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke()
      }
      st.t += dt
      if (st.t >= st.nextBird) { spawnBirds(); st.nextBird = st.t + 8000 + Math.random() * 7000 }
      st.birds = st.birds.filter(b => b.x < w + 45)
      for (const b of st.birds) { drawBird(ctx, b); b.x += b.spd * (dt / 16.67); b.phase += b.phaseSpd * (dt / 16.67) }
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect(); io.disconnect()
      window.removeEventListener('scroll', onScroll)
      clearTimeout(scrollTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={cvRef} className="absolute inset-0 w-full h-full" />
}

// ── Window grid ────────────────────────────────────────────────────────────
function Wins({ bx, by, bw, cols, op, vh = 175 }:
  { bx:number; by:number; bw:number; cols:number; op:number; vh?:number }) {
  const pad  = 5
  const step = Math.max(1, Math.floor((bw - pad * 2) / cols))
  const ww   = Math.max(2, step - 3)
  const elems: JSX.Element[] = []
  let ry = by + 8, ri = 0
  while (ry + 6 < vh - 3) {
    for (let c = 0; c < cols; c++)
      elems.push(<rect key={`${ri}-${c}`} x={bx + pad + c * step} y={ry} width={ww} height={5} />)
    ry += 10; ri++
  }
  return <g fill="white" opacity={op}>{elems}</g>
}

// ── Puffy cloud ────────────────────────────────────────────────────────────
function PuffyCloud({ cx, cy, s = 1, op = 1 }: { cx:number; cy:number; s?:number; op?:number }) {
  return (
    <g opacity={op}>
      <circle cx={cx - 20*s} cy={cy + 7*s} r={9*s}  fill="white" />
      <circle cx={cx - 8*s}  cy={cy + 3*s} r={13*s} fill="white" />
      <circle cx={cx + 5*s}  cy={cy}       r={15*s} fill="white" />
      <circle cx={cx + 19*s} cy={cy + 4*s} r={11*s} fill="white" />
      <circle cx={cx + 30*s} cy={cy + 8*s} r={7*s}  fill="white" />
      <rect x={cx-27*s} y={cy+8*s} width={64*s} height={9*s} fill="white" />
    </g>
  )
}

// ── Building data ──────────────────────────────────────────────────────────
type Bld = { x:number; y:number; w:number; cols:number }

// Mobile (viewBox 400×175)
const MOB_FAR: Bld[]  = [
  { x: 2,   y: 85, w: 22, cols: 1 }, { x: 30,  y: 74, w: 36, cols: 2 },
  { x: 78,  y: 81, w: 48, cols: 3 }, { x: 148, y: 70, w: 30, cols: 2 },
  // gap around center hospital
  { x: 264, y: 73, w: 34, cols: 2 }, { x: 310, y: 80, w: 46, cols: 2 },
  { x: 364, y: 77, w: 40, cols: 3 },
]
const MOB_MID: Bld[]  = [
  { x: 0,   y: 102, w: 24, cols: 1 }, { x: 36,  y: 95,  w: 38, cols: 2 },
  { x: 86,  y: 91,  w: 38, cols: 2 },
  // hospital rendered separately at x=172
  { x: 250, y: 93,  w: 42, cols: 2 }, { x: 306, y: 97,  w: 38, cols: 2 },
  { x: 358, y: 102, w: 46, cols: 3 },
]
const MOB_NEAR: Bld[] = [
  { x: 0,   y: 117, w: 44, cols: 2 }, { x: 58,  y: 125, w: 26, cols: 1 },
  { x: 98,  y: 113, w: 54, cols: 3 }, { x: 218, y: 120, w: 42, cols: 2 },
  { x: 304, y: 115, w: 48, cols: 2 }, { x: 368, y: 122, w: 36, cols: 2 },
]

// Desktop (viewBox 1440×175) — denser, more variation
const DSK_FAR: Bld[]  = [
  { x: 0,    y: 86, w: 52, cols: 2 }, { x: 62,   y: 76, w: 74, cols: 3 },
  { x: 150,  y: 82, w: 54, cols: 2 }, { x: 218,  y: 70, w: 90, cols: 3 },
  { x: 322,  y: 78, w: 66, cols: 2 }, { x: 402,  y: 74, w: 86, cols: 3 },
  { x: 504,  y: 81, w: 60, cols: 2 },
  // gap around hospital center (x≈620)
  { x: 812,  y: 76, w: 74, cols: 3 }, { x: 900,  y: 83, w: 58, cols: 2 },
  { x: 974,  y: 73, w: 88, cols: 3 }, { x: 1078, y: 80, w: 68, cols: 2 },
  { x: 1160, y: 76, w: 84, cols: 3 }, { x: 1260, y: 83, w: 60, cols: 2 },
  { x: 1334, y: 77, w: 76, cols: 3 }, { x: 1420, y: 87, w: 24, cols: 1 },
]
const DSK_MID: Bld[]  = [
  { x: 0,    y: 101, w: 78, cols: 3 }, { x: 90,   y: 95,  w: 98, cols: 3 },
  { x: 204,  y: 93,  w: 82, cols: 3 }, { x: 302,  y: 98,  w: 94, cols: 3 },
  { x: 412,  y: 96,  w: 86, cols: 3 }, { x: 514,  y: 102, w: 78, cols: 2 },
  // hospital rendered separately at x=618
  { x: 806,  y: 97,  w: 88, cols: 3 }, { x: 910,  y: 100, w: 80, cols: 2 },
  { x: 1006, y: 95,  w: 94, cols: 3 }, { x: 1116, y: 99,  w: 84, cols: 3 },
  { x: 1216, y: 96,  w: 90, cols: 3 }, { x: 1322, y: 101, w: 78, cols: 2 },
  { x: 1412, y: 102, w: 30, cols: 1 },
]
const DSK_NEAR: Bld[] = [
  { x: 0,    y: 116, w: 114, cols: 3 }, { x: 130,  y: 124, w: 74,  cols: 2 },
  { x: 220,  y: 112, w: 134, cols: 4 }, { x: 372,  y: 118, w: 100, cols: 3 },
  { x: 490,  y: 114, w: 116, cols: 3 },
  // hospital visible above (x=618–758)
  { x: 776,  y: 116, w: 122, cols: 3 }, { x: 916,  y: 123, w: 88,  cols: 2 },
  { x: 1020, y: 114, w: 132, cols: 4 }, { x: 1170, y: 118, w: 106, cols: 3 },
  { x: 1294, y: 115, w: 120, cols: 3 }, { x: 1430, y: 122, w: 14,  cols: 1 },
]

// ── Mobile SVG scene ───────────────────────────────────────────────────────
function MobileSVG() {
  return (
    <svg className="md:hidden absolute inset-0 w-full h-full"
      viewBox="0 0 400 175" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
      {/* Clouds */}
      <g className="cloud-a"><PuffyCloud cx={70}  cy={21} s={0.72} op={0.72}/></g>
      <g className="cloud-b"><PuffyCloud cx={220} cy={15} s={0.48} op={0.50}/></g>

      {/* Far buildings */}
      <g opacity="0.18">
        {MOB_FAR.map((b, i) => (
          <g key={`mf${i}`}>
            <rect x={b.x} y={b.y} width={b.w} height={175 - b.y} fill="#6B1515"/>
            <Wins bx={b.x} by={b.y} bw={b.w} cols={b.cols} op={0.15}/>
          </g>
        ))}
      </g>

      {/* Mid buildings */}
      <g opacity="0.28">
        {MOB_MID.map((b, i) => (
          <g key={`mm${i}`}>
            <rect x={b.x} y={b.y} width={b.w} height={175 - b.y} fill="#421010"/>
            <Wins bx={b.x} by={b.y} bw={b.w} cols={b.cols} op={0.30}/>
          </g>
        ))}
      </g>

      {/* Hospital — center landmark */}
      <g opacity="0.45">
        <rect x={172} y={67} width={62} height={108} fill="#421010"/>
        <Wins bx={172} by={67} bw={62} cols={3} op={0.35}/>
        <rect x={200} y={46} width={5} height={22} fill="#D92B2B" opacity="0.85"/>
        <rect x={193} y={51} width={19} height={6} fill="#D92B2B" opacity="0.85"/>
        <rect x={178} y={58} width={50} height={11} fill="#140000" rx="1.5" opacity="0.90"/>
        <text x={203} y={67} textAnchor="middle" fontSize="5" fill="white" fontFamily="sans-serif" opacity="0.90" letterSpacing="0.4">HOSPITAL</text>
      </g>

      {/* Near buildings */}
      <g opacity="0.22">
        {MOB_NEAR.map((b, i) => (
          <g key={`mn${i}`}>
            <rect x={b.x} y={b.y} width={b.w} height={175 - b.y} fill="#250404"/>
            <Wins bx={b.x} by={b.y} bw={b.w} cols={b.cols} op={0.42}/>
          </g>
        ))}
      </g>

      {/* Rise particles */}
      <circle cx="68"  cy="100" r="2.5" fill="white" className="animate-rise-particle" opacity="0.22"/>
      <circle cx="205" cy="106" r="2"   fill="white" className="animate-rise-particle" opacity="0.16" style={{ animationDelay: '1.2s' }}/>
      <circle cx="295" cy="100" r="2"   fill="white" className="animate-rise-particle" opacity="0.14" style={{ animationDelay: '2.4s' }}/>
    </svg>
  )
}

// ── Desktop SVG scene ──────────────────────────────────────────────────────
function DesktopSVG() {
  return (
    <svg className="hidden md:block absolute inset-0 w-full h-full"
      viewBox="0 0 1440 175" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
      {/* Clouds */}
      <g className="cloud-a"><PuffyCloud cx={190}  cy={22} s={1.6}  op={0.75}/></g>
      <g className="cloud-b"><PuffyCloud cx={680}  cy={16} s={1.1}  op={0.55}/></g>
      <g className="cloud-c"><PuffyCloud cx={1050} cy={24} s={0.90} op={0.45}/></g>

      {/* Far buildings */}
      <g opacity="0.18">
        {DSK_FAR.map((b, i) => (
          <g key={`df${i}`}>
            <rect x={b.x} y={b.y} width={b.w} height={175 - b.y} fill="#6B1515"/>
            <Wins bx={b.x} by={b.y} bw={b.w} cols={b.cols} op={0.15} vh={175}/>
          </g>
        ))}
      </g>

      {/* Mid buildings */}
      <g opacity="0.28">
        {DSK_MID.map((b, i) => (
          <g key={`dm${i}`}>
            <rect x={b.x} y={b.y} width={b.w} height={175 - b.y} fill="#421010"/>
            <Wins bx={b.x} by={b.y} bw={b.w} cols={b.cols} op={0.30} vh={175}/>
          </g>
        ))}
      </g>

      {/* Hospital — center landmark */}
      <g opacity="0.45">
        <rect x={618} y={52} width={140} height={123} fill="#421010"/>
        <Wins bx={618} by={52} bw={140} cols={5} op={0.35} vh={175}/>
        <rect x={685} y={28} width={10} height={28} fill="#D92B2B" opacity="0.85"/>
        <rect x={676} y={36} width={28} height={9} fill="#D92B2B" opacity="0.85"/>
        <rect x={624} y={43} width={128} height={16} fill="#140000" rx="2" opacity="0.90"/>
        <text x={688} y={55} textAnchor="middle" fontSize="10" fill="white" fontFamily="sans-serif" opacity="0.90" letterSpacing="1">HOSPITAL</text>
      </g>

      {/* Near buildings */}
      <g opacity="0.22">
        {DSK_NEAR.map((b, i) => (
          <g key={`dn${i}`}>
            <rect x={b.x} y={b.y} width={b.w} height={175 - b.y} fill="#250404"/>
            <Wins bx={b.x} by={b.y} bw={b.w} cols={b.cols} op={0.42} vh={175}/>
          </g>
        ))}
      </g>

      {/* Rise particles */}
      <circle cx="200"  cy="100" r="2.5" fill="white" className="animate-rise-particle" opacity="0.20"/>
      <circle cx="550"  cy="106" r="2"   fill="white" className="animate-rise-particle" opacity="0.15" style={{ animationDelay: '1.2s' }}/>
      <circle cx="900"  cy="100" r="2"   fill="white" className="animate-rise-particle" opacity="0.15" style={{ animationDelay: '2.4s' }}/>
      <circle cx="1180" cy="104" r="1.5" fill="white" className="animate-rise-particle" opacity="0.12" style={{ animationDelay: '0.6s' }}/>
      <circle cx="1350" cy="102" r="2"   fill="white" className="animate-rise-particle" opacity="0.13" style={{ animationDelay: '1.8s' }}/>
    </svg>
  )
}

function HeroIllustration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <MobileSVG />
      <DesktopSVG />
      <HeroCanvas />
    </div>
  )
}

// ── Guest hero ──────────────────────────────────────────────────────────────
function GuestHeroCard() {
  const standalone = isStandalonePWA()
  return (
    <div className="relative bg-gradient-to-b from-[#D92B2B] to-[#9B1B1B] px-4 pt-6 pb-12 text-white overflow-hidden">
      <HeroIllustration />
      <div className="relative z-10">
        <h2 className="text-xl font-bold leading-tight mb-1">রক্ত দিন, জীবন বাঁচান</h2>
        <p className="text-white/70 text-sm mb-4 leading-relaxed">ডোনার হিসেবে যোগ দিন অথবা জরুরি রক্তের অনুরোধ দিন।</p>
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
  const [modalOpen,  setModalOpen]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!user) return <GuestHeroCard />

  const toggle = async () => {
    setLoading(true)
    try {
      await updateUser(user.uid, { isAvailable: !user.isAvailable })
      await refreshUser()
      showToast(user.isAvailable ? 'আপনি Unavailable হয়েছেন' : 'আপনি Available হয়েছেন',
        user.isAvailable ? 'info' : 'success')
    } catch { showToast('কিছু একটা সমস্যা হয়েছে', 'error') }
    finally { setLoading(false); setModalOpen(false) }
  }

  return (
    <>
      <div className="relative bg-gradient-to-b from-[#D92B2B] to-[#9B1B1B] px-4 pt-5 pb-12 text-white overflow-hidden">
        <HeroIllustration />
        {/* Sun — centered exactly behind the menu button (pt-5=20 + h-11/2=22 → top:42, px-4=16 + w-11/2=22 → right:38) */}
        <div className="absolute top-[42px] right-[38px] z-[1] pointer-events-none" aria-hidden="true">
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[110px] h-[110px] rounded-full bg-white/[0.05]"/>
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[72px]  h-[72px]  rounded-full bg-white/[0.10]"/>
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[40px]  h-[40px]  rounded-full bg-white/[0.20]"/>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            {/* Avatar + blood group badge at bottom-right */}
            <div className="relative shrink-0">
              <div className="ring-2 ring-white/30 rounded-full">
                {user.profilePhoto
                  ? <img src={user.profilePhoto} alt="প্রোফাইল" className="w-14 h-14 rounded-full object-cover"/>
                  : <DefaultAvatar gender={user.gender} size={56}/>}
              </div>
              <div className="absolute -bottom-1 -right-1 min-w-[22px] h-[22px] rounded-full bg-[#D92B2B] border-2 border-white flex items-center justify-center px-1 shadow-sm">
                <span className="text-white text-[9px] font-bold leading-none">{user.bloodGroup}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight">{user.name}</h2>
              <p className="text-white/65 text-xs mt-0.5">{user.upazila}{user.district ? `, ${user.district}` : ''}</p>
            </div>

            {/* App logo circle with hamburger badge — opens drawer */}
            <div className="relative shrink-0 flex items-center justify-center">
              <button
                onClick={() => setDrawerOpen(true)}
                className="relative w-11 h-11 rounded-full bg-[#D92B2B] border border-[#FF6B6B]/40 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
                aria-label="Menu"
              >
                {/* Blood drop logo */}
                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2C7 8 4 12 4 15a8 8 0 0 0 16 0c0-3-3-7-8-13z"/>
                </svg>
                {/* Hamburger badge at bottom-right */}
                <span className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full flex flex-col items-center justify-center gap-[2.5px] px-[3px] shadow-sm" style={{ width: 18, height: 16 }}>
                  <span className="block w-full h-[1.5px] bg-[#D92B2B] rounded-full"/>
                  <span className="block w-full h-[1.5px] bg-[#D92B2B] rounded-full"/>
                  <span className="block w-full h-[1.5px] bg-[#D92B2B] rounded-full"/>
                </span>
              </button>
            </div>
          </div>
          <button type="button" onClick={() => setModalOpen(true)} disabled={loading}
            className="w-full bg-white/15 backdrop-blur-sm border border-white/25 hover:bg-white/22 active:bg-white/28 transition-colors rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">আমি রক্ত দিতে পারব</p>
              <p className={`text-xs mt-0.5 ${user.isAvailable ? 'text-green-300' : 'text-white/40'}`}>
                {user.isAvailable ? '● Available হিসেবে দেখা যাচ্ছে' : '○ Unavailable'}
              </p>
            </div>
            <div className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${user.isAvailable ? 'bg-[#1A9E6B]' : 'bg-white/30'}`}>
              <span className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-md transition-all duration-200 ${user.isAvailable ? 'left-[26px]' : 'left-[3px]'}`}/>
            </div>
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-9 bg-[#FAFAFA] rounded-t-[32px] z-10"/>
      </div>

      {/* ── Side drawer ────────────────────────────────────────────────── */}
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setDrawerOpen(false)}
      />
      {/* Panel */}
      <div className={`fixed right-0 top-0 h-full w-72 max-w-[85vw] bg-white z-[61] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="bg-gradient-to-br from-[#D92B2B] to-[#9B1B1B] px-5 pt-12 pb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M12 2C7 8 4 12 4 15a8 8 0 0 0 16 0c0-3-3-7-8-13z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight">Blood Hood</p>
            <p className="text-white/60 text-xs">রক্তের সন্ধান</p>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 active:scale-90 transition-transform shrink-0">
            <svg className="w-4 h-4 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-2">
          {MENU_ITEMS.map(({ href, label, icon }) => (
            <Link key={href} href={href} onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-red-50 transition-colors group">
              <svg className="w-5 h-5 stroke-[#777] group-hover:stroke-[#D92B2B] transition-colors shrink-0 flex-none" fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
              </svg>
              <span className="text-[#222] group-hover:text-[#D92B2B] font-medium text-sm transition-colors">{label}</span>
            </Link>
          ))}
        </nav>
        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#F0F0F0]">
          <p className="text-xs text-[#AAA] text-center">Blood Hood · Made with ❤️ in Bangladesh</p>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !loading && setModalOpen(false)}/>
          <div className="relative bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 shadow-2xl pb-[calc(1.5rem+4rem)] md:pb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#111111]">নিশ্চিত করুন</h2>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <svg className="w-5 h-5 stroke-[#555555]" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
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
