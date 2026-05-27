'use client'

import { memo, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { m, AnimatePresence, useInView, useMotionValue, useTransform, useSpring, useReducedMotion, useScroll } from 'framer-motion'

import TimelineSection from '@/components/TimelineSection'
import SchoolTicker from '@/components/SchoolTicker'
import WorldMapPublic from '@/components/WorldMapPublic'
import { createClient } from '@/lib/supabase'
import AnimatedNumber from '@/components/AnimatedNumber'
import { useRealtimeStats } from '@/hooks/useRealtimeStats'

const HeroGlobe = dynamic(() => import('@/components/HeroGlobe'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '100%',
      background: 'radial-gradient(circle at 50% 50%, var(--bg-2) 0%, transparent 70%)',
      borderRadius: '50%',
    }} />
  ),
})

// ── Country scramble — cycles through connected countries with text scramble ──
const SCRAMBLE_WORDS = [
  'COLOMBIA','ESTADOS UNIDOS','MÉXICO','GUATEMALA','NICARAGUA',
  'COSTA RICA','PARAGUAY','FRANCIA','ALEMANIA','ESPAÑA','EMIRATOS','CANADÁ',
]
function CountryScramble() {
  const [text, setText] = useState(SCRAMBLE_WORDS[0])
  const idxRef = useRef(0)

  useEffect(() => {
    let resolveTimer: ReturnType<typeof setTimeout>
    let scrambleTimer: ReturnType<typeof setInterval>

    function scramble(target: string, progress: number): string {
      return target.split('').map((ch, i) => {
        if (ch === ' ') return ' '
        if (i < progress) return ch
        return String.fromCharCode(65 + Math.floor(Math.random() * 26))
      }).join('')
    }

    function scrambleTo(target: string) {
      let progress = 0
      setText(scramble(target, 0))
      scrambleTimer = setInterval(() => {
        progress++
        setText(scramble(target, progress))
        if (progress >= target.length) {
          clearInterval(scrambleTimer)
          resolveTimer = setTimeout(nextWord, 1500)
        }
      }, 40)
    }

    function nextWord() {
      idxRef.current = (idxRef.current + 1) % SCRAMBLE_WORDS.length
      scrambleTo(SCRAMBLE_WORDS[idxRef.current])
    }

    resolveTimer = setTimeout(nextWord, 1500)
    return () => { clearTimeout(resolveTimer); clearInterval(scrambleTimer) }
  }, [])

  return (
    <div style={{
      fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
      fontSize: 12,
      letterSpacing: '0.15em',
      color: 'var(--mute,#6B6B6B)',
      textTransform: 'uppercase',
      marginTop: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span style={{ opacity: 0.5 }}>→ CONECTANDO CON</span>
      <span style={{ color: 'var(--accent,#C0392B)', minWidth: '12ch', display: 'inline-block' }}>{text}</span>
    </div>
  )
}

// ── CountNumber helper ────────────────────────────────────────────────────────
function CountNumber({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref    = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const dur = 1400
    function tick(t: number) {
      const p = Math.min((t - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(to * e))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [inView, to])
  return <span ref={ref}>{val}{suffix}</span>
}

// ── Static section data ───────────────────────────────────────────────────────
const misionStats = [
  { to: 5000, suffix: '+', label: 'Líderes a formar'      },
  { to: 50,   suffix: '+', label: 'Países para 2036'      },
  { to: 90,   suffix: '',  label: 'Instituciones aliadas' },
  { to: 2036, suffix: '',  label: 'Meta global'           },
]


/* EDITAR AQUÍ — fundadores */
const founders = [
  { initials: 'LB', name: 'Luis Barrios',       role: 'Fundador y Mentor Estratégico',          bio: 'Fundador del programa y mentor del equipo. Su visión y liderazgo son la base institucional de Big Family.',                                                  tags: ['Fundador', 'Mentoría', 'Visión'],           layout: 'featured' as const },
  { initials: 'JV', name: 'Juan Felipe Visbal', role: 'Director de Visión y Contenido',          bio: 'La cara y voz del programa. Lidera la estrategia de contenido y la comunicación del impacto de Big Family.',                                                tags: ['Contenido', 'Comunicación', 'Liderazgo'] },
  { initials: 'AG', name: 'Alejandro Garcia',   role: 'Director de Arquitectura y Operaciones',  bio: 'Estructura y organización de todo el programa. Garantiza que cada pieza del sistema funcione con coherencia.',                                             tags: ['Operaciones', 'Estrategia', 'Estructura'] },
  { initials: 'SG', name: 'Samuel Gomez',       role: 'Director de Tecnología',                  bio: 'Construye y mantiene la plataforma tecnológica que hace posible la certificación The Big Leader.',                                                         tags: ['Tecnología', 'Plataforma', 'Desarrollo'],   layout: 'wide' as const },
]


/* EDITAR AQUÍ — estadísticas del About */
const aboutStats = [
  { num: '8',    label: 'Colegios participantes' },
  { num: '200+', label: 'Estudiantes activos'    },
  { num: '2026', label: 'Primera generación'     },
]

const NAV_LINKS = [
  { href: '#como-funciona',      label: 'Cómo funciona' },
  { href: '#paises',             label: 'Países'         },
  { href: '#nuestra-red',        label: 'Nuestra Red'    },
  { href: '#alianzas-globales',  label: 'Alianzas'       },
  { href: '/news',               label: 'Noticias'       },
  { href: '#equipo',             label: 'Equipo'         },
]

const particles = [
  { x: 15, y: 25, size: 3, dur: 5.2, delay: 0   },
  { x: 72, y: 60, size: 2, dur: 7.1, delay: 1.3 },
  { x: 38, y: 80, size: 4, dur: 4.8, delay: 0.7 },
  { x: 85, y: 35, size: 2, dur: 6.5, delay: 2.1 },
  { x: 55, y: 15, size: 3, dur: 5.9, delay: 0.4 },
  { x: 22, y: 70, size: 2, dur: 7.8, delay: 1.8 },
  { x: 91, y: 55, size: 3, dur: 4.5, delay: 2.9 },
  { x: 48, y: 45, size: 2, dur: 6.2, delay: 1.1 },
]

// ── Visión section ───────────────────────────────────────────────────────────
type VisionWord = { text: string; italic: boolean }
const VISION_WORDS: VisionWord[] = [
  { text: 'Para',        italic: false },
  { text: 'el',          italic: false },
  { text: 'año',         italic: false },
  { text: '2036,',       italic: false },
  { text: 'The',         italic: false },
  { text: 'Big',         italic: false },
  { text: 'Family',      italic: false },
  { text: 'será',        italic: false },
  { text: 'reconocido',  italic: false },
  { text: 'globalmente', italic: false },
  { text: 'como',        italic: false },
  { text: 'un',          italic: false },
  { text: 'referente',   italic: true  },
  { text: 'de',          italic: false },
  { text: 'excelencia',  italic: false },
  { text: 'en',          italic: false },
  { text: 'liderazgo.',  italic: true  },
]
const visionWordV = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 20 } },
}
const visionStaggerV = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04 } },
}

// TEMP LAUNCH: Día de Liderazgo target — 2026-05-16 08:00 Colombia (UTC-5)
const DL_TARGET = new Date('2026-05-16T13:00:00Z')

// ── Isolated memoized components — infinite/frequent animations must not re-render parent ──

const HistoriaParticles = memo(function HistoriaParticles() {
  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="historia__particle"
          aria-hidden="true"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  )
})

// useCountdown lives inside so its 1s setInterval re-renders are isolated here, not in GlobeHero
const CountdownDisplay = memo(function CountdownDisplay() {
  const cd = useCountdown(DL_TARGET)
  if (cd.expired) {
    return <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 22, color: '#C0392B' }}>¡El evento ha comenzado!</p>
  }
  return (
    <div className="dl-cd">
      {([
        { val: cd.days,    label: 'Días'     },
        { val: cd.hours,   label: 'Horas'    },
        { val: cd.minutes, label: 'Minutos'  },
        { val: cd.seconds, label: 'Segundos' },
      ] as { val: number; label: string }[]).map(({ val, label }) => (
        <div key={label} className="dl-cd-unit">
          <div className="dl-cd-num">{String(val).padStart(2, '0')}</div>
          <div className="dl-cd-label">{label}</div>
        </div>
      ))}
    </div>
  )
})

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      expired: false,
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return t
}

export default function GlobeHero() {
  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 100, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 100, damping: 25 })
  const rotateX = useTransform(springY, [-300, 300], [8, -8])
  const rotateY = useTransform(springX, [-300, 300], [-8, 8])

  const prefersReduced      = useReducedMotion()
  const [bannerDismissed,   setBannerDismissed]   = useState(false)
  const [scrollHintVisible, setScrollHintVisible] = useState(true)
  const [navScrolled,       setNavScrolled]       = useState(false)
  const [navMounted,        setNavMounted]        = useState(false)
  const [activeSection,     setActiveSection]     = useState('')
  const [mobileNavOpen,     setMobileNavOpen]     = useState(false)

  const { stats: liveStats, loading: statsLoading } = useRealtimeStats()

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [featuredStories, setFeaturedStories] = useState<{ id: string; title: string; story: string; cover_url: string | null; student_name: string | null; school_name: string | null }[]>([])

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function loadStories() {
      const { data: rows } = await sb!.from('success_stories').select('id, title, story, cover_url, published_at, student_id, school_id').eq('published', true).order('published_at', { ascending: false }).limit(3)
      if (!rows || rows.length === 0) return
      const userIds   = rows.map((r: { student_id: string }) => r.student_id)
      const schoolIds = rows.map((r: { school_id: string | null }) => r.school_id).filter(Boolean) as string[]
      const [{ data: profiles }, { data: schools }] = await Promise.all([
        sb!.from('profiles').select('id, full_name').in('id', userIds),
        schoolIds.length ? sb!.from('schools').select('id, name').in('id', schoolIds) : Promise.resolve({ data: [] }),
      ])
      const pMap: Record<string, string> = {}
      profiles?.forEach((p: { id: string; full_name: string | null }) => { pMap[p.id] = p.full_name ?? '' })
      const sMap: Record<string, string> = {}
      schools?.forEach((s: { id: string; name: string }) => { sMap[s.id] = s.name })
      setFeaturedStories(rows.map((r: { id: string; title: string; story: string; cover_url: string | null; student_id: string; school_id: string | null }) => ({ id: r.id, title: r.title, story: r.story, cover_url: r.cover_url, student_name: pMap[r.student_id] ?? null, school_name: r.school_id ? (sMap[r.school_id] ?? null) : null })))
    }
    loadStories()
  }, [])

  const { scrollY } = useScroll()
  const globeY = useTransform(scrollY, [0, 600], [0, 80])

  useEffect(() => {
    setBannerDismissed(localStorage.getItem('dlg-banner-dismissed') === '1')
  }, [])

  useEffect(() => {
    const onScrollHint = () => setScrollHintVisible(window.scrollY < 100)
    window.addEventListener('scroll', onScrollHint, { passive: true })
    return () => window.removeEventListener('scroll', onScrollHint)
  }, [])

  function handleAboutMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }

  function handleAboutMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  function handleNavLink(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith('#')) return
    e.preventDefault()
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileNavOpen(false)
  }

  useEffect(() => { setNavMounted(true) }, [])

  useEffect(() => {
    const unsub = scrollY.on('change', v => setNavScrolled(v > 80))
    return unsub
  }, [scrollY])

  useEffect(() => {
    const ids = ['como-funciona', 'historia', 'paises', 'equipo']
    const observers: IntersectionObserver[] = []
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
        { rootMargin: '-30% 0px -60% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])


  return (
    <>
      <style>{`
        :root{--bg:#F5F3EF;--bg-2:#EFECE6;--ink:#0D0D0D;--ink-2:#2D2D2D;--mute:#6B6B6B;--line:rgba(13,13,13,.10);--line-soft:rgba(13,13,13,.06);--accent:#C0392B;--shadow-lg:0 30px 80px -20px rgba(13,13,13,.18),0 10px 30px -10px rgba(13,13,13,.10);}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);color:var(--ink);font-family:"Satoshi",sans-serif;-webkit-font-smoothing:antialiased;}
        body{min-height:100dvh;overflow-x:hidden;}
        body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:1;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");opacity:.55;mix-blend-mode:multiply;}
        .pill-nav-wrap{position:fixed;top:0;left:0;right:0;z-index:100;pointer-events:none;display:flex;justify-content:center;padding:16px 20px;}
        .pill-nav{pointer-events:all;display:flex;align-items:center;background:rgba(245,243,239,0.85);backdrop-filter:blur(12px) saturate(180%);border:1px solid var(--line);border-radius:999px;padding:6px 6px 6px 16px;transition:background 0.3s cubic-bezier(0.22,1,0.36,1),box-shadow 0.3s cubic-bezier(0.22,1,0.36,1);box-shadow:var(--shadow-raised);}
        .pill-nav--scrolled{background:rgba(245,243,239,0.96);box-shadow:0 8px 32px rgba(13,13,13,.12),0 2px 8px rgba(13,13,13,.06);}
        .pill-nav__brand{display:flex;align-items:center;gap:8px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);text-decoration:none;margin-right:20px;flex-shrink:0;}
        .pill-nav__links{display:flex;gap:2px;align-items:center;}
        .pill-nav__link{font-family:"Satoshi",sans-serif;font-size:13.5px;color:var(--ink-2);text-decoration:none;padding:7px 12px;border-radius:999px;transition:color 0.2s cubic-bezier(0.22,1,0.36,1),background 0.2s cubic-bezier(0.22,1,0.36,1);}
        .pill-nav__link:hover{color:var(--ink);background:rgba(13,13,13,0.06);}
        .pill-nav__link--active{color:var(--ink);background:rgba(13,13,13,0.07);}
        .pill-nav__cta{margin-left:8px;padding:8px 16px;background:var(--ink);color:var(--bg,#F5F3EF);font-family:"Satoshi",sans-serif;font-size:13px;font-weight:600;border-radius:999px;text-decoration:none;border:none;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;transition:background 0.2s cubic-bezier(0.22,1,0.36,1);}
        .pill-nav__cta:hover{background:var(--accent,#C0392B);}
        .pill-nav__cta:active{transform:scale(0.97);}
        .pill-nav__cta-arrow{display:inline-block;transition:transform 0.2s cubic-bezier(0.22,1,0.36,1);}
        .pill-nav__cta:hover .pill-nav__cta-arrow{transform:translateX(3px);}
        .pill-nav__hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:var(--ink);margin-left:6px;border-radius:999px;transition:background 0.15s;}
        .pill-nav__hamburger:hover{background:rgba(13,13,13,0.06);}
        @media(max-width:760px){.pill-nav__links{display:none;}.pill-nav__hamburger{display:flex;align-items:center;justify-content:center;}}
        .pill-nav-overlay{position:fixed;inset:0;background:rgba(13,13,13,0.5);z-index:99;}
        .pill-nav-drawer{position:fixed;top:0;left:0;right:0;z-index:100;background:var(--bg,#F5F3EF);border-bottom:1px solid var(--line);padding:72px 24px 28px;display:flex;flex-direction:column;gap:4px;}
        .pill-nav-drawer__link{font-family:"Satoshi",sans-serif;font-size:18px;font-weight:500;color:var(--ink);text-decoration:none;padding:12px 0;border-bottom:1px solid rgba(13,13,13,0.06);}
        .pill-nav-drawer__cta{margin-top:16px;padding:14px 24px;background:var(--ink);color:var(--bg,#F5F3EF);font-family:"Satoshi",sans-serif;font-size:15px;font-weight:600;border-radius:999px;text-decoration:none;text-align:center;}
        .btn{font-family:"Satoshi",sans-serif;font-size:13px;font-weight:500;padding:10px 16px;border-radius:999px;border:1px solid transparent;cursor:pointer;transition:all .25s ease;}
        .btn--ghost{background:transparent;color:var(--ink);border-color:var(--line);}
        .btn--ghost:hover{border-color:var(--ink-2);background:rgba(13,13,13,.04);}
        .btn--solid{background:var(--ink);color:#fff;border-color:var(--ink);}
        .btn--solid:hover{background:var(--accent);border-color:var(--accent);transform:translateY(-1px);box-shadow:0 10px 24px -8px rgba(192,57,43,.45);}
        .btn:active{transform:scale(0.98) !important;transition-duration:.08s !important;}
        .btn:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:999px;}
        .hero{position:relative;min-height:100dvh;padding:120px 0 140px;display:grid;grid-template-columns:57fr 43fr;width:100%;overflow:visible;}
        .hero::before{content:"";position:absolute;left:40px;right:40px;top:90px;height:1px;background:var(--line-soft);}
        .meta{position:absolute;left:40px;right:40px;top:100px;display:flex;justify-content:space-between;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);z-index:2;}
        .meta .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);margin-right:8px;vertical-align:middle;position:relative;box-shadow:0 0 8px rgba(192,57,43,.6);animation:blink 1.6s ease-in-out infinite;}
        .meta .dot::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:1.5px solid var(--accent);opacity:.6;animation:pp 2s ease-out infinite;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.55}}
        @keyframes pp{0%{transform:scale(.6);opacity:.8}100%{transform:scale(2.2);opacity:0}}
        .left{position:relative;z-index:3;padding:20px 24px 0 40px;align-self:center;}
        .brand{display:flex;flex-direction:column;align-items:flex-start;gap:14px;margin-bottom:44px;}
        .brand__logo{width:88px;height:88px;display:flex;align-items:center;justify-content:center;}
        .brand__word{font-size:10.5px;letter-spacing:.56em;text-transform:uppercase;color:var(--mute);border-top:1px solid var(--line);padding-top:12px;width:240px;display:flex;justify-content:space-between;align-items:center;}
        .brand__word .word{font-weight:400;letter-spacing:.48em;color:var(--ink-2);}
        h1.headline{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(40px,4.6vw,68px);line-height:1.02;letter-spacing:-0.045em;color:var(--ink);max-width:620px;font-synthesis:none;}
        h1.headline em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:var(--accent);}
        h1.headline .dot-end{color:var(--accent);}
        .lede{margin-top:26px;max-width:52ch;color:var(--ink-2);font-size:16px;line-height:1.65;}
        .cta-row{display:flex;gap:12px;margin-top:34px;align-items:center;}
        .stats{display:grid;grid-template-columns:1fr 1fr 1fr;margin-top:52px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);max-width:560px;}
        .stat{padding:20px 22px;border-right:1px solid var(--line);}
        .stat:last-child{border-right:0;}
        .stat__num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:40px;letter-spacing:-0.03em;color:var(--ink);line-height:1;display:flex;align-items:baseline;gap:2px;}
        .stat__num .plus{font-family:"Instrument Serif",serif;font-weight:400;font-style:italic;color:var(--accent);font-size:28px;}
        .stat__label{margin-top:10px;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--mute);}
        .right{position:relative;width:100%;z-index:2;overflow:hidden;}
        .scroll-ind{position:absolute;left:50%;bottom:-130px;transform:translateX(-50%);z-index:4;display:flex;flex-direction:column;align-items:center;gap:10px;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--mute);}
        .scroll-ind .bar{width:1px;height:40px;background:linear-gradient(var(--line),transparent);position:relative;overflow:hidden;}
        .scroll-ind .bar::after{content:"";position:absolute;top:0;left:0;right:0;height:10px;background:var(--ink);animation:drop 2.2s ease-in-out infinite;}
        @keyframes drop{0%{transform:translateY(-10px);opacity:0}40%{opacity:1}100%{transform:translateY(40px);opacity:0}}
        .hero-bottom-spacer{height:0;}
        @media(prefers-reduced-motion:reduce){
          .meta .dot,.meta .dot::after,.scroll-ind .bar::after{animation:none !important;}
        }
        @media(max-width:960px){.hero{grid-template-columns:1fr;padding:80px 24px 100px;}.right{order:-1;height:280px;}.left{order:1;}.meta{left:20px;right:20px;}}
        /* ── MISIÓN ──────────────────────────────────────────────────────────── */
        .mision{background:#080808;padding:136px 40px;}
        .mision__inner{max-width:900px;margin:0 auto;text-align:center;}
        .mision__eyebrow-pill{display:inline-flex;align-items:center;border:1px solid rgba(192,57,43,0.3);background:rgba(192,57,43,0.08);color:#C0392B;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;border-radius:999px;padding:6px 16px;margin-bottom:40px;}
        .mision__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(52px,7vw,96px);line-height:1.0;letter-spacing:-0.04em;margin-top:0;}
        .mision__title-line{display:block;color:rgba(255,255,255,0.92);}
        .mision__title-line--accent{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .mision__sub{font-family:"Satoshi",sans-serif;font-size:18px;color:rgba(255,255,255,0.5);line-height:1.7;max-width:600px;margin:28px auto 0;text-align:center;}
        .mision__stats{max-width:1200px;margin:100px auto 0;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,0.06);}
        .mision__stat{padding:48px 32px;border-right:1px solid rgba(255,255,255,0.06);text-align:center;}
        .mision__stat:last-child{border-right:none;}
        .mision__stat-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:72px;color:#fff;line-height:1;display:flex;align-items:baseline;justify-content:center;gap:4px;letter-spacing:-0.04em;}
        .mision__stat-num em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;font-size:48px;}
        .mision__stat-label{font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-top:8px;}
        /* ── VISIÓN ──────────────────────────────────────────────────────────── */
        .vision{background:#0D0D0D;border-top:1px solid rgba(255,255,255,.06);padding:96px 40px;position:relative;overflow:hidden;}
        .vision__watermark{position:absolute;bottom:-20px;right:-10px;font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(120px,15vw,220px);color:rgba(255,255,255,.03);line-height:1;letter-spacing:-.06em;pointer-events:none;user-select:none;z-index:0;}
        .vision__inner{max-width:1200px;margin:0 auto;position:relative;z-index:1;display:flex;flex-direction:column;gap:52px;}
        .vision__row1{display:flex;flex-direction:column;gap:14px;}
        .vision__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#C0392B;}
        .vision__eyebrow-line{height:2px;background:#C0392B;border-radius:999px;transform-origin:left;width:60px;}
        .vision__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(40px,6vw,80px);letter-spacing:-.035em;line-height:1.08;color:#fff;}
        .vision__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .vision__cols{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;}
        .vision__para{font-family:"Satoshi",sans-serif;font-size:16px;color:rgba(255,255,255,.72);line-height:1.8;border-left:2px solid rgba(192,57,43,.35);padding:4px 0 4px 20px;}
        /* ── BIG LEADER CARD ─────────────────────────────────────────────────── */
        .big-leader{margin-top:80px;position:relative;background:linear-gradient(135deg,rgba(192,57,43,0.12) 0%,rgba(255,255,255,0.02) 50%,rgba(192,57,43,0.06) 100%);border:1px solid rgba(192,57,43,0.25);border-radius:24px;padding:48px;overflow:hidden;cursor:default;transition:border-color 0.4s cubic-bezier(0.16,1,0.3,1),box-shadow 0.4s cubic-bezier(0.16,1,0.3,1);}
        .big-leader:hover{border-color:rgba(192,57,43,0.45);box-shadow:0 0 60px rgba(192,57,43,0.08);}
        .big-leader__glow{position:absolute;top:-60px;left:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(192,57,43,0.2),transparent);pointer-events:none;}
        .big-leader__inner{display:grid;grid-template-columns:45% 55%;gap:48px;position:relative;z-index:1;}
        .big-leader__badge{display:inline-flex;align-items:center;background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);border-radius:999px;padding:6px 14px;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#C0392B;margin-bottom:24px;}
        .big-leader__name-the{font-family:"Satoshi",sans-serif;font-weight:400;font-size:42px;color:rgba(255,255,255,0.5);display:block;line-height:1.1;}
        .big-leader__name-leader{font-family:"Satoshi",sans-serif;font-weight:900;font-size:64px;color:#fff;letter-spacing:-0.04em;display:block;line-height:1.0;}
        .big-leader__sub{font-family:"Satoshi",sans-serif;font-size:15px;color:rgba(255,255,255,0.5);line-height:1.6;margin-top:16px;max-width:280px;}
        .big-leader__skills{display:flex;flex-direction:column;justify-content:center;}
        .big-leader__skill{display:flex;gap:14px;align-items:flex-start;padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.06);}
        .big-leader__skill:first-child{padding-top:0;}
        .big-leader__skill:last-child{border-bottom:none;padding-bottom:0;}
        .big-leader__skill-icon{width:36px;height:36px;background:rgba(192,57,43,0.1);border:1px solid rgba(192,57,43,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .big-leader__skill-title{font-family:"Satoshi",sans-serif;font-weight:600;font-size:15px;color:#fff;}
        .big-leader__skill-sub{font-family:"Satoshi",sans-serif;font-size:13px;color:rgba(255,255,255,0.4);margin-top:3px;line-height:1.5;}
        /* ── NUESTRA HISTORIA ───────────────────────────────────────────────── */
        .historia{position:relative;background:#070707;padding:112px 40px;overflow:hidden;}
        .historia__grain{position:absolute;inset:0;pointer-events:none;z-index:0;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");opacity:0.35;mix-blend-mode:overlay;}
        .historia__radial{position:absolute;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse 90% 60% at 50% -10%,rgba(192,57,43,0.14),transparent 70%);}
        .historia__particle{position:absolute;border-radius:50%;background:rgba(192,57,43,0.4);pointer-events:none;z-index:0;animation:particleFloat linear infinite;}
        @keyframes particleFloat{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-20px);opacity:0.8}}
        .historia__inner{position:relative;z-index:1;max-width:1200px;margin:0 auto;}
        .historia__header{display:grid;grid-template-columns:55% 45%;gap:60px;align-items:center;margin-bottom:80px;}
        .historia__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:20px;}
        .historia__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(44px,6vw,80px);color:#fff;letter-spacing:-0.04em;line-height:1.0;}
        .historia__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .historia__sub{font-family:"Satoshi",sans-serif;font-size:16px;color:rgba(255,255,255,0.5);line-height:1.65;max-width:420px;}
        .bento{display:grid;grid-template-columns:1.4fr 1fr 1fr;grid-template-rows:auto auto;gap:16px;}
        .bento__cell{position:relative;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 24px 48px rgba(0,0,0,0.4);border-radius:20px;padding:32px;overflow:hidden;will-change:transform;transition:border-color 0.3s cubic-bezier(0.22,1,0.36,1),box-shadow 0.3s cubic-bezier(0.22,1,0.36,1),transform 0.3s cubic-bezier(0.22,1,0.36,1);}
        .bento__cell:hover{transform:translateY(-2px);}
        .bento__cell:hover{border-color:rgba(255,255,255,0.14);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 32px 64px rgba(0,0,0,0.5);}
        .bento__cell::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(192,57,43,0.6),transparent);opacity:0;transition:opacity 0.4s ease;}
        .bento__cell:hover::before{opacity:1;}
        .bento__cell--tall{grid-row:1/span 2;grid-column:1;}
        .bento__cell--wide{grid-row:2;grid-column:2/span 2;}
        .bento__year{font-family:var(--font-mono),monospace;font-size:13px;letter-spacing:0.15em;color:#C0392B;margin-bottom:16px;}
        .bento__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:rgba(255,255,255,0.92);margin-bottom:12px;line-height:1.25;}
        .bento__desc{font-family:"Satoshi",sans-serif;font-size:14px;color:rgba(255,255,255,0.45);line-height:1.65;}
        .bento__tag{display:inline-block;margin-top:20px;border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:0.15em;border-radius:999px;padding:4px 12px;}
        /* ── ABOUT DARK ─────────────────────────────────────────────────────── */
        .about-dark{background:#080808;padding:80px 40px;border-top:1px solid rgba(255,255,255,0.06);}
        .about-dark__inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:100px;align-items:center;}
        .about-dark__photo-wrap{position:relative;}
        .about-dark__photo-perspective{perspective:1200px;}
        .about-dark__photo{aspect-ratio:3/4;border-radius:20px;background:linear-gradient(145deg,#1a1a1a 0%,#0d0d0d 100%);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;will-change:transform;}
        .about-dark__photo-dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px);background-size:24px 24px;}
        .about-dark__photo-label{color:rgba(255,255,255,0.15);font-size:12px;font-family:"Satoshi",sans-serif;letter-spacing:0.2em;text-transform:uppercase;position:relative;z-index:1;}
        .about-dark__badge{position:absolute;top:-16px;right:-16px;background:rgba(192,57,43,0.9);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:12px 16px;z-index:10;}
        .about-dark__badge-num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:#fff;}
        .about-dark__badge-label{font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;}
        .about-dark__text{display:flex;flex-direction:column;}
        .about-dark__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:20px;}
        .about-dark__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(32px,4vw,52px);color:#fff;letter-spacing:-0.03em;line-height:1.1;margin-bottom:24px;}
        .about-dark__para{font-family:"Satoshi",sans-serif;font-size:16px;color:rgba(255,255,255,0.55);line-height:1.75;max-width:480px;}
        .about-dark__para+.about-dark__para{margin-top:20px;}
        .about-dark__divider{height:1px;background:rgba(255,255,255,0.08);margin:32px 0;}
        .about-dark__stats{display:flex;align-items:center;}
        .about-dark__stat{flex:1;text-align:center;padding:0 16px;}
        .about-dark__stat:first-child{padding-left:0;}
        .about-dark__stat:last-child{padding-right:0;}
        .about-dark__stat-num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:28px;color:#fff;}
        .about-dark__stat-label{font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;letter-spacing:0.05em;}
        .about-dark__stat-sep{width:1px;height:40px;background:rgba(255,255,255,0.08);flex-shrink:0;}
        .about-dark__cta{margin-top:32px;padding:12px 24px;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:999px;font-size:14px;font-family:"Satoshi",sans-serif;font-weight:500;cursor:pointer;transition:all 0.3s cubic-bezier(0.22,1,0.36,1);width:fit-content;}
        .about-dark__cta:hover{background:#C0392B;border-color:#C0392B;}
        .about-dark__cta:active{transform:scale(0.98);}
        /* ── EQUIPO ──────────────────────────────────────────────────────────── */
        .equipo{background:#F5F3EF;border-top:1px solid rgba(13,13,13,.06);padding:88px 40px;}
        .equipo__inner{max-width:1200px;margin:0 auto;}
        .equipo__header{display:grid;grid-template-columns:60% 40%;gap:40px;align-items:end;margin-bottom:80px;}
        .equipo__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#6B6B6B;margin-bottom:20px;}
        .equipo__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(36px,4vw,56px);color:#0D0D0D;letter-spacing:-0.03em;line-height:1.1;}
        .equipo__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .equipo__desc{font-family:"Satoshi",sans-serif;font-size:16px;color:#6B6B6B;line-height:1.65;}
        .equipo__grid{display:grid;grid-template-columns:1.8fr 1fr 1fr;grid-template-rows:auto auto;gap:2px;background:rgba(13,13,13,.06);border:1px solid rgba(13,13,13,.06);border-radius:20px;overflow:hidden;}
        .equipo__card{background:#F5F3EF;padding:40px 36px;display:flex;flex-direction:column;border:1px solid transparent;transition:box-shadow .3s cubic-bezier(0.22,1,0.36,1),transform .3s cubic-bezier(0.22,1,0.36,1),border-color .3s cubic-bezier(0.22,1,0.36,1);}
        .equipo__card:hover{transform:translateY(-4px);box-shadow:0 16px 40px -8px rgba(13,13,13,.18),inset 0 2px 0 #C0392B;border-color:rgba(192,57,43,.3);}
        .equipo__card:active{transform:scale(0.99) translateY(-2px);}
        .equipo__card--featured{grid-row:1/span 2;grid-column:1;}
        .equipo__card--wide{grid-column:2/span 2;flex-direction:row;gap:28px;align-items:flex-start;}
        .equipo__card--wide .equipo__avatar{margin-bottom:0;flex-shrink:0;}
        .equipo__card-content{display:flex;flex-direction:column;flex:1;}
        .equipo__avatar{width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:32px;color:#fff;margin-bottom:28px;flex-shrink:0;}
        .equipo__avatar--lg{width:144px;height:144px;font-size:44px;margin-bottom:36px;}
        .equipo__card-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:#0D0D0D;letter-spacing:-0.01em;margin-bottom:6px;}
        .equipo__card-role{font-family:"Satoshi",sans-serif;font-size:14px;color:#C0392B;margin-bottom:0;}
        .equipo__card-bio{font-family:"Satoshi",sans-serif;font-size:14px;color:#6B6B6B;line-height:1.6;flex:1;}
        .equipo__card-divider{border-top:1px solid var(--line);margin:12px 0;}
        .equipo__tags{display:flex;flex-wrap:wrap;gap:8px;}
        .equipo__tag{font-family:"Satoshi",sans-serif;font-size:11px;color:#C0392B;background:rgba(192,57,43,.08);border-radius:999px;padding:4px 12px;}
        /* ── DL Banner ── */
        .dl-banner{background:#C0392B;color:#fff;padding:9px 52px 9px 20px;display:flex;align-items:center;justify-content:center;gap:14px;font-size:13px;font-weight:500;position:relative;flex-wrap:wrap;}
        .dl-banner a{color:#fff;font-weight:700;text-decoration:underline;white-space:nowrap;}
        .dl-banner-x{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,.65);font-size:20px;line-height:1;padding:0 4px;transition:color .15s;}
        .dl-banner-x:hover{color:#fff;}
        /* ── DL Landing Section ── */
        .dl-landing{background:#0A0A0A;border-top:1px solid rgba(255,255,255,.06);padding:104px 40px;overflow:hidden;position:relative;}
        .dl-landing::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 110%,rgba(192,57,43,.14),transparent 70%);pointer-events:none;}
        .dl-landing__inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;position:relative;z-index:1;}
        .dl-landing__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#C0392B;margin-bottom:16px;}
        .dl-landing__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(32px,4vw,52px);color:#fff;letter-spacing:-.03em;line-height:1.1;margin-bottom:14px;}
        .dl-landing__desc{font-family:"Satoshi",sans-serif;font-size:16px;color:rgba(255,255,255,.52);line-height:1.7;margin-bottom:28px;}
        .dl-landing__btns{display:flex;gap:12px;flex-wrap:wrap;}
        .dl-landing__btn-p{padding:13px 26px;background:#C0392B;color:#fff;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;text-decoration:none;transition:background .2s;white-space:nowrap;}
        .dl-landing__btn-p:hover{background:#a93226;}
        .dl-landing__btn-g{padding:12px 26px;background:transparent;color:rgba(255,255,255,.65);border:1px solid rgba(255,255,255,.18);border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:600;font-size:14px;text-decoration:none;transition:all .2s;white-space:nowrap;}
        .dl-landing__btn-g:hover{border-color:rgba(255,255,255,.45);color:#fff;}
        .dl-cd{display:grid;grid-template-columns:repeat(4,1fr);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden;}
        .dl-cd-unit{padding:22px 10px;text-align:center;border-right:1px solid rgba(255,255,255,.07);}
        .dl-cd-unit:last-child{border-right:none;}
        .dl-cd-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(32px,4vw,48px);color:#fff;line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums;}
        .dl-cd-label{font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.32);margin-top:8px;}
        @media(max-width:960px){.mision{padding:80px 24px;}.mision__stats{grid-template-columns:1fr 1fr;}.mision__stat{border-right:none;border-bottom:1px solid rgba(255,255,255,0.06);}.vision{padding:80px 24px;}.vision__cols{grid-template-columns:1fr;gap:36px;}.vision__watermark{font-size:80px;}.big-leader__inner{grid-template-columns:1fr;}.historia{padding:80px 24px;}.historia__header{grid-template-columns:1fr;gap:24px;}.bento{grid-template-columns:1fr;}.bento__cell--tall,.bento__cell--wide{grid-row:auto;grid-column:auto;}.about-dark{padding:80px 24px;}.about-dark__inner{grid-template-columns:1fr;gap:48px;}.equipo{padding:80px 24px;}.equipo__header{grid-template-columns:1fr;}.equipo__grid{grid-template-columns:1fr;grid-template-rows:auto;}.equipo__card--featured,.equipo__card--wide{grid-row:auto;grid-column:auto;flex-direction:column;}.equipo__card--wide .equipo__avatar{margin-bottom:28px;flex-shrink:0;}.dl-landing{padding:80px 24px;}.dl-landing__inner{grid-template-columns:1fr;gap:48px;}}
      `}</style>

      {/* Post-event banner */}
      <AnimatePresence>
        {!bannerDismissed && (
          <m.div
            className="dl-banner"
            initial={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            style={{ transformOrigin: 'top', overflow: 'hidden' }}
            transition={{ duration: 0.18, ease: [0.4, 0, 1, 1] }}
          >
            <span>🎉 ¡Gracias a todos los participantes del Día de Liderazgo 2026!</span>
            <button
              className="dl-banner-x"
              aria-label="Cerrar"
              onClick={() => { setBannerDismissed(true); localStorage.setItem('dlg-banner-dismissed', '1') }}
            >×</button>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Floating Pill Nav ── */}
      <AnimatePresence>
        {navMounted && (
          <m.div
            className="pill-nav-wrap"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.3 }}
          >
            <nav className={`pill-nav${navScrolled ? ' pill-nav--scrolled' : ''}`}>
              <Link href="/" className="pill-nav__brand">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <circle cx="12" cy="5" r="2.4" fill="currentColor"/>
                  <path d="M12 7.5 L20 22 H4 Z" fill="currentColor"/>
                </svg>
                Big Family
              </Link>
              <div className="pill-nav__links">
                {NAV_LINKS.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`pill-nav__link${link.href === `#${activeSection}` ? ' pill-nav__link--active' : ''}`}
                    onClick={e => handleNavLink(e, link.href)}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <Link href="/login" className="pill-nav__cta">
                Ingresar <span className="pill-nav__cta-arrow" aria-hidden="true">→</span>
              </Link>
              <button
                className="pill-nav__hamburger"
                aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
                onClick={() => setMobileNavOpen(o => !o)}
              >
                <AnimatePresence mode="wait">
                  {mobileNavOpen ? (
                    <m.svg
                      key="x"
                      width="20" height="20" viewBox="0 0 20 20" fill="none"
                      initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </m.svg>
                  ) : (
                    <m.svg
                      key="menu"
                      width="20" height="20" viewBox="0 0 20 20" fill="none"
                      initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </m.svg>
                  )}
                </AnimatePresence>
              </button>
            </nav>
          </m.div>
        )}
      </AnimatePresence>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <m.div
              className="pill-nav-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <m.div
              className="pill-nav-drawer"
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {NAV_LINKS.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="pill-nav-drawer__link"
                  onClick={e => handleNavLink(e, link.href)}
                >
                  {link.label}
                </a>
              ))}
              <Link href="/login" className="pill-nav-drawer__cta">Ingresar →</Link>
            </m.div>
          </>
        )}
      </AnimatePresence>

      <section className="hero" id="hero">
        <div className="meta">
          <span><span className="dot"></span>Programa activo · Cohorte 2026</span>
          <span>N 04°42′ · W 74°04′ · Bogotá</span>
        </div>

        <div className="left">
          <m.div
            className="brand"
            initial={prefersReduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0 }}
          >
            <div className="brand__logo">
              <svg viewBox="0 0 24 24" width="88" height="88" aria-label="Big Family" role="img">
                <circle cx="12" cy="5" r="2.4" fill="#0D0D0D"/>
                <path d="M12 7.5 L20 22 H4 Z" fill="#0D0D0D"/>
              </svg>
            </div>
            <div className="brand__word">
              <span>Est.</span>
              <span className="word">THE BIG FAMILY</span>
              <span>MMXX</span>
            </div>
          </m.div>
          <m.h1
            className="headline"
            initial={prefersReduced ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
          >
            Liderazgo juvenil<br/>que <em>transforma</em><br/>comunidades<span className="dot-end">.</span>
          </m.h1>
          <m.p
            className="lede"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
          >
            Un programa global que conecta a una generación decidida a cambiar el rumbo de sus ciudades — con módulos, mentorías y una comunidad que trasciende fronteras.
          </m.p>
          <CountryScramble />

          <m.div
            className="cta-row"
            initial={prefersReduced ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
          >
            <Link href="/submit" className="btn btn--solid">Soy estudiante →</Link>
            <button className="btn btn--ghost" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>Conocer el programa</button>
          </m.div>
          <m.div
            className="stats"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.36 }}
          >
            <div className="stat">
              <div className="stat__num">
                <AnimatedNumber value={liveStats.totalStudents} loading={statsLoading} suffix="+" skeletonWidth={48} />
              </div>
              <div className="stat__label">Estudiantes</div>
            </div>
            <div className="stat">
              <div className="stat__num">
                <AnimatedNumber value={liveStats.totalSchools} loading={statsLoading} skeletonWidth={40} />
              </div>
              <div className="stat__label">Colegios</div>
            </div>
            <div className="stat">
              <div className="stat__num">
                <AnimatedNumber value={liveStats.totalBadges} loading={statsLoading} skeletonWidth={40} />
              </div>
              <div className="stat__label">Insignias</div>
            </div>
          </m.div>
        </div>

        <m.div
          className="right"
          initial={prefersReduced ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ y: prefersReduced ? undefined : globeY }}
          transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.4 }}
        >
          <div style={{ width: '100%', height: '100%', minHeight: '500px', position: 'relative', overflow: 'visible', borderRadius: 0 }}>
            <HeroGlobe />
          </div>
        </m.div>

        <div
          className="scroll-ind"
          style={{ opacity: scrollHintVisible ? 1 : 0, transition: 'opacity 300ms ease' }}
        >
          <span>Scroll</span>
          <div className="bar"></div>
        </div>
      </section>

      <div className="hero-bottom-spacer"></div>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 1 — MISIÓN
      ══════════════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="mision">
        <div className="mision__inner">

          {/* Eyebrow pill */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            <span className="mision__eyebrow-pill">NUESTRA MISIÓN</span>
          </m.div>

          {/* Título en 3 líneas — stagger con blur */}
          <m.h2
            className="mision__title"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
          >
            {([
              { text: 'Queremos cambiar',   accent: false },
              { text: 'el mundo a través',  accent: false },
              { text: 'del liderazgo.',     accent: true  },
            ] as const).map((line, i) => (
              <m.span
                key={i}
                className={`mision__title-line${line.accent ? ' mision__title-line--accent' : ''}`}
                variants={{
                  hidden:   { opacity: 0, y: 50, filter: 'blur(8px)' },
                  visible:  { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { type: 'spring', stiffness: 100, damping: 20 } },
                }}
              >{line.text}</m.span>
            ))}
          </m.h2>

          {/* Subtítulo */}
          <m.p
            className="mision__sub"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.5 }}
          >
            Formando individuos capacitados en habilidades intra e interpersonales capaces de generar impacto real y construir comunidades más unidas.
          </m.p>

        </div>

        {/* Stats — 4 columnas */}
        <m.div
          className="mision__stats"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {misionStats.map((s) => (
            <m.div
              key={s.label}
              className="mision__stat"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            >
              <div className="mision__stat-num">
                <CountNumber to={s.to} />{s.suffix && <em>{s.suffix}</em>}
              </div>
              <div className="mision__stat-label">{s.label}</div>
            </m.div>
          ))}
        </m.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 2 — VISIÓN
      ══════════════════════════════════════════════════════════════════ */}
      <section className="vision">

        {/* "2036" watermark — fades in very last */}
        <m.div
          className="vision__watermark"
          aria-hidden="true"
          initial={prefersReduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 3, ease: 'easeOut', delay: 1 }}
        >
          2036
        </m.div>

        <div className="vision__inner">

          {/* Row 1 — Eyebrow + animated red line */}
          <div className="vision__row1">
            <m.p
              className="vision__eyebrow"
              initial={prefersReduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              VISIÓN 2036
            </m.p>
            <m.div
              className="vision__eyebrow-line"
              initial={prefersReduced ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
            />
          </div>

          {/* Row 2 — Title with word-level stagger */}
          <h2 className="vision__title">
            <m.span
              style={{ display: 'block' }}
              initial={prefersReduced ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={visionStaggerV}
            >
              {VISION_WORDS.map((word, i) => (
                <m.span
                  key={i}
                  variants={visionWordV}
                  style={{ display: 'inline-block', marginRight: '0.28em' }}
                >
                  {word.italic ? <em>{word.text}</em> : word.text}
                </m.span>
              ))}
            </m.span>
          </h2>

          {/* Row 3 — Two text columns, appear after title stagger completes */}
          <m.div
            className="vision__cols"
            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.6 }}
          >
            <p className="vision__para">
              Aspiramos a expandir nuestra red de liderazgo escolar para que tenga presencia en más de 50 países, conectando a más de 5.000 estudiantes que generen impacto positivo en sus comunidades.
            </p>
            <p className="vision__para">
              Buscamos que la certificación The Big Leader sea una señal clara y confiable de habilidades reales — que una empresa u organización la vea y entienda inmediatamente el valor de la persona: su capacidad de liderar, trabajar en equipo, tomar decisiones y generar impacto.
            </p>
          </m.div>

          {/* The Big Leader Card */}
          <m.div
            className="big-leader"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <div className="big-leader__glow" aria-hidden="true" />
            <div className="big-leader__inner">

              {/* Col izq — identidad */}
              <div>
                <span className="big-leader__badge">CERTIFICACIÓN OFICIAL</span>
                <span className="big-leader__name-the">The Big</span>
                <span className="big-leader__name-leader">Leader</span>
                <p className="big-leader__sub">Más que una certificación — una garantía de preparación.</p>
              </div>

              {/* Col der — habilidades */}
              <div className="big-leader__skills">

                <div className="big-leader__skill">
                  <div className="big-leader__skill-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1L9.8 5.6H15L10.8 8.8L12.4 13.4L8 10.2L3.6 13.4L5.2 8.8L1 5.6H6.2L8 1Z" fill="#C0392B"/>
                    </svg>
                  </div>
                  <div>
                    <div className="big-leader__skill-title">Liderazgo real</div>
                    <div className="big-leader__skill-sub">Capacidad de guiar equipos y tomar decisiones bajo presión</div>
                  </div>
                </div>

                <div className="big-leader__skill">
                  <div className="big-leader__skill-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="4" cy="8" r="2" stroke="#C0392B" strokeWidth="1.5"/>
                      <circle cx="12" cy="4" r="2" stroke="#C0392B" strokeWidth="1.5"/>
                      <circle cx="12" cy="12" r="2" stroke="#C0392B" strokeWidth="1.5"/>
                      <path d="M6 8H10M6 8C8 6.5 10 4 10 4M6 8C8 9.5 10 12 10 12" stroke="#C0392B" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <div className="big-leader__skill-title">Trabajo en equipo</div>
                    <div className="big-leader__skill-sub">Colaboración efectiva en entornos diversos y multiculturales</div>
                  </div>
                </div>

                <div className="big-leader__skill">
                  <div className="big-leader__skill-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M9 2L5 9H8L7 14L11 7H8L9 2Z" fill="#C0392B"/>
                    </svg>
                  </div>
                  <div>
                    <div className="big-leader__skill-title">Impacto medible</div>
                    <div className="big-leader__skill-sub">Iniciativas concretas que transforman comunidades</div>
                  </div>
                </div>

              </div>
            </div>
          </m.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 2 — NUESTRA HISTORIA (Bento)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="historia" className="historia">
        <div className="historia__grain" aria-hidden="true" />
        <div className="historia__radial" aria-hidden="true" />
        <HistoriaParticles />

        <div className="historia__inner">
          {/* Header asimétrico */}
          <div className="historia__header">
            <div>
              {/* EDITAR: eyebrow */}
              <m.p
                className="historia__eyebrow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              >NUESTRA HISTORIA</m.p>
              {/* EDITAR: título principal */}
              <m.h2
                className="historia__title"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
              >
                {(['Cuatro', 'años'] as const).map((w, i) => (
                  <m.span
                    key={i}
                    variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } } }}
                    style={{ display: 'inline-block', marginRight: '0.22em' }}
                  >{w}</m.span>
                ))}
                <br />
                <m.span
                  variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } } }}
                  style={{ display: 'inline-block', marginRight: '0.22em' }}
                >construyendo</m.span>
                <m.em
                  variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } } }}
                  style={{ display: 'inline-block' }}
                >líderes</m.em>
                <m.span
                  variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } } }}
                  style={{ display: 'inline-block' }}
                >.</m.span>
              </m.h2>
            </div>

            <m.p
              className="historia__sub"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }}
            >Cómo nació Big Family</m.p>
          </div>

          {/* Timeline — live data from timeline_events table */}
          <TimelineSection theme="dark" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 3 — ABOUT (Parallax 3D)
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="paises"
        className="about-dark"
        onMouseMove={handleAboutMouseMove}
        onMouseLeave={handleAboutMouseLeave}
      >
        <div className="about-dark__inner">

          {/* Columna izquierda — foto con parallax 3D */}
          <div className="about-dark__photo-wrap">
            <div className="about-dark__photo-perspective">
              <m.div
                className="about-dark__photo"
                style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
              >
                <div className="about-dark__photo-dots" />
                {/* EDITAR: reemplazar con <img> cuando haya foto real */}
                <span className="about-dark__photo-label">[FOTO DEL PROGRAMA]</span>
              </m.div>
            </div>
            {/* Badge flotante */}
            <div className="about-dark__badge">
              {/* EDITAR: número y subtexto del badge */}
              <div className="about-dark__badge-num">11 Países</div>
              <div className="about-dark__badge-label">activos en 2026</div>
            </div>
          </div>

          {/* Columna derecha — texto con stagger */}
          <div className="about-dark__text">
            <m.p
              className="about-dark__eyebrow"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0 }}
            >SOBRE NOSOTROS</m.p>

            <m.h2
              className="about-dark__title"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.08 }}
            >Líderes que transforman La Guajira</m.h2>

            <m.p
              className="about-dark__para"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.16 }}
            >Big Family es un programa de liderazgo juvenil que acompaña a estudiantes de 8 colegios en La Guajira, Colombia, en su camino hacia convertirse en agentes de cambio en sus comunidades.</m.p>

            <m.p
              className="about-dark__para"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.24 }}
            >A través de módulos, proyectos reales y mentoría, los jóvenes desarrollan las habilidades y la visión que necesitan para liderar el futuro de su región.</m.p>

            <m.div
              className="about-dark__divider"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.32 }}
            />

            {/* EDITAR: estadísticas */}
            <m.div
              className="about-dark__stats"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.40 }}
            >
              {aboutStats.flatMap((s, i) => [
                i > 0 ? <div key={`sep-${i}`} className="about-dark__stat-sep" /> : null,
                <div key={i} className="about-dark__stat">
                  {/* EDITAR: número y label */}
                  <div className="about-dark__stat-num">{s.num}</div>
                  <div className="about-dark__stat-label">{s.label}</div>
                </div>,
              ])}
            </m.div>

            <m.button
              className="about-dark__cta"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.48 }}
            >Conocer el programa →</m.button>
          </div>

        </div>
      </section>

      <section className="dl-landing">
        <div className="dl-landing__inner">

          {/* Left: copy + buttons */}
          <m.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <div className="dl-landing__eyebrow">EVENTO ESPECIAL</div>
            <h2 className="dl-landing__title">Día de Liderazgo<br />La Guajira 2026</h2>
            <p className="dl-landing__desc">
              8 colegios de La Guajira presentan sus proyectos de liderazgo comunitario el 16 de mayo.
            </p>
            <div className="dl-landing__btns">
              <a href="/dia-de-liderazgo" className="dl-landing__btn-g">Ver más →</a>
              <a href="/submit" className="dl-landing__btn-p">Subir mi proyecto →</a>
            </div>
          </m.div>

          {/* Right: countdown */}
          <m.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.1 }}
          >
            <CountdownDisplay />
          </m.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HISTORIAS DE ÉXITO
      ══════════════════════════════════════════════════════════════════ */}
      {featuredStories.length > 0 && (
        <section style={{ padding: '100px 40px', background: 'var(--bg,#F5F3EF)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 140, damping: 20 }}
              style={{ textAlign: 'center', marginBottom: 48 }}
            >
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C0392B', marginBottom: 14 }}>Comunidad Big Family</div>
              <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-.025em', color: 'var(--ink,#0D0D0D)', marginBottom: 12 }}>Historias de Éxito</h2>
              <p style={{ fontSize: 15, color: 'var(--mute,#6B6B6B)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>Estudiantes que transformaron sus comunidades a través del liderazgo.</p>
            </m.div>

            <m.div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 140, damping: 20, staggerChildren: 0.08 }}
            >
              {featuredStories.map((s, i) => (
                <m.a
                  key={s.id}
                  href={`/success-stories/${s.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.08 }}
                  whileHover={{ y: -4, boxShadow: '0 16px 40px -10px rgba(13,13,13,.16)' }}
                  style={{ display: 'block', textDecoration: 'none', background: '#fff', border: '1px solid rgba(13,13,13,.07)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px -4px rgba(13,13,13,.08)' }}
                >
                  {s.cover_url
                    ? <img src={s.cover_url} alt={s.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', height: 110, background: 'linear-gradient(135deg,#C0392B,#8B1A1A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.8 4.9H18l-4.1 3 1.5 4.9L12 12.2l-3.4 2.6L10 9.9 5.9 6.9H11L12 2Z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                      </div>
                  }
                  <div style={{ padding: '16px 18px 18px' }}>
                    <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15.5, color: '#0D0D0D', marginBottom: 6, lineHeight: 1.3 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: '#4a4a4a', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 10 } as React.CSSProperties}>{s.story}</div>
                    <div style={{ fontSize: 12, color: '#9a9690' }}>
                      {s.student_name && <span style={{ fontWeight: 600 }}>{s.student_name}</span>}
                      {s.school_name && <span style={{ marginLeft: 6 }}>· {s.school_name}</span>}
                    </div>
                  </div>
                </m.a>
              ))}
            </m.div>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <a href="/success-stories" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 24px', border: '1.5px solid rgba(13,13,13,.14)', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--ink,#0D0D0D)', textDecoration: 'none', transition: 'all .2s' }}>
                Ver todas las historias →
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — NUESTRA RED
      ══════════════════════════════════════════════════════════════════ */}
      <SchoolTicker />

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — ALIANZAS GLOBALES
      ══════════════════════════════════════════════════════════════════ */}
      <WorldMapPublic />

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 3 — EQUIPO
      ══════════════════════════════════════════════════════════════════ */}
      <section id="equipo" className="equipo">
        <div className="equipo__inner">

          {/* Header */}
          <m.div
            className="equipo__header"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div>
              <p className="equipo__eyebrow">EL EQUIPO</p>
              <h2 className="equipo__title">
                Las personas detrás<br />del <em>impacto</em>.
              </h2>
            </div>
            {/* EDITAR AQUÍ — descripción del equipo */}
            <p className="equipo__desc">Un equipo multidisciplinario unido por una misma convicción: que el liderazgo se aprende, se practica y se mide en impacto real.</p>
          </m.div>

          {/* Grid de cards */}
          <div className="equipo__grid">
            {founders.map((f, i) => {
              const isFeatured = f.layout === 'featured'
              const isWide     = f.layout === 'wide'
              const cardClass  = `equipo__card${isFeatured ? ' equipo__card--featured' : ''}${isWide ? ' equipo__card--wide' : ''}`
              const avatarClass = `equipo__avatar${isFeatured ? ' equipo__avatar--lg' : ''}`
              const cardContent = (
                <>
                  <div className="equipo__card-name">{f.name}</div>
                  <div className="equipo__card-role">{f.role}</div>
                  <div className="equipo__card-divider" />
                  <div className="equipo__card-bio">{f.bio}</div>
                  <div className="equipo__tags">
                    {f.tags.map(t => <span key={t} className="equipo__tag">{t}</span>)}
                  </div>
                </>
              )
              return (
                <m.div
                  key={f.name}
                  className={cardClass}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ type: 'spring', stiffness: 180, damping: 22, delay: i * 0.12 }}
                >
                  <div className={avatarClass} style={{ background: 'linear-gradient(135deg,#C0392B,#922b21)' }}>{f.initials}</div>
                  {isWide ? <div className="equipo__card-content">{cardContent}</div> : cardContent}
                </m.div>
              )
            })}
          </div>

        </div>
      </section>
    </>
  )
}
