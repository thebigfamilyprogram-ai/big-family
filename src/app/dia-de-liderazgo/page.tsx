'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { fadeUp } from '@/lib/animations'
import { createClient } from '@/lib/supabase'

// TEMP LAUNCH: Día de Liderazgo 2026 — Guajira event page
const TARGET_DATE = new Date('2026-05-16T13:00:00Z') // 08:00 Colombia time UTC-5

interface SchoolData {
  name:     string
  logo_url: string | null
  code:     string | null
}

const SCHOOL_NAMES = [
  'IE Técnica María Inmaculada',
  'Instituto Pedagógico',
  'IE Comfamiliar',
  'Centro Etnoeducativo Ware Waren',
  'IE Paulo VI',
  'IE Camino al Futuro',
  'Instituto Colombia Mía',
  'IE El Carmelo',
]

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const STATS = [
  { value: 8,           display: null,        label: 'Colegios participantes', countUp: true  },
  { value: null,        display: 'Guajira',   label: 'Departamento sede',      countUp: false },
  { value: null,        display: 'Mayo 2026', label: 'Fecha del evento',       countUp: false },
] as const

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

function CountUp({ to }: { to: number }) {
  const ref     = useRef<HTMLSpanElement>(null)
  const inView  = useInView(ref, { once: true })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const dur   = 1200
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1)
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) requestAnimationFrame(tick)
      else setVal(to)
    }
    requestAnimationFrame(tick)
  }, [inView, to])
  return <span ref={ref}>{val}</span>
}

function PinIcon() {
  return (
    <svg width="11" height="14" viewBox="0 0 11 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M5.5 0C2.74 0 .5 2.24.5 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5Zm0 6.75a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" fill="#C0392B"/>
    </svg>
  )
}

function CodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar código"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: 'monospace', fontSize: 11,
        background: 'var(--bg-2,#EFECE6)', borderRadius: 6,
        padding: '4px 8px', marginTop: 10, border: 'none', cursor: 'pointer',
        color: copied ? '#065F46' : 'var(--mute,#6B6B6B)',
        transition: 'color .2s',
      }}
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#065F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copiado!
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="1" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="1" y="3" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="var(--bg-2,#EFECE6)"/>
          </svg>
          {code}
        </>
      )}
    </button>
  )
}

function Logo({ light = false }: { light?: boolean }) {
  const c = light ? '#fff' : '#0D0D0D'
  const m = light ? 'rgba(255,255,255,.5)' : '#6B6B6B'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="28" height="28" viewBox="0 0 52 52" fill="none">
        <circle cx="26" cy="10" r="6" fill={c}/>
        <path d="M26 16 L44 48 H8 Z" fill={c}/>
        <circle cx="9" cy="18" r="4" fill={m}/>
        <circle cx="43" cy="18" r="4" fill={m}/>
      </svg>
      <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: c }}>Big Family</span>
    </div>
  )
}

export default function DiaLiderazgoPage() {
  const cd      = useCountdown(TARGET_DATE)
  const pref    = useReducedMotion()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  // Initialise immediately; logo_url + code fill in from DB
  const [schools, setSchools] = useState<SchoolData[]>(
    SCHOOL_NAMES.map(name => ({ name, logo_url: null, code: null }))
  )

  useEffect(() => {
    console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    async function fetchSchools() {
      const { data } = await supabase
        .from('schools')
        .select('name, logo_url, code')
        .in('name', SCHOOL_NAMES)
      if (!data) return
      const map: Record<string, { logo_url: string | null; code: string | null }> = {}
      data.forEach((row: { name: string; logo_url: string | null; code: string | null }) => { map[row.name] = { logo_url: row.logo_url ?? null, code: row.code ?? null } })
      setSchools(SCHOOL_NAMES.map(name => ({ name, ...(map[name] ?? { logo_url: null, code: null }) })))
    }
    fetchSchools()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // School card variants — 0.05s stagger
  const schoolStagger = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.05 } },
  }
  const schoolCard = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 140, damping: 20 } },
  }

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,600,500,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{font-family:"Inter",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
        body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:1;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");opacity:.6;mix-blend-mode:multiply;}

        /* ── Topnav ── */
        .dl-nav{display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:#0D0D0D;position:relative;z-index:10;}
        .dl-nav-links{display:flex;gap:28px;align-items:center;}
        .dl-nav-links a{font-size:13px;color:rgba(255,255,255,.5);text-decoration:none;transition:color .15s;}
        .dl-nav-links a:hover{color:#fff;}

        /* ── Hero ── */
        .dl-hero{background:#0D0D0D;padding:100px 40px 120px;text-align:center;position:relative;overflow:hidden;}
        .dl-hero::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% -10%,rgba(192,57,43,.18),transparent 70%);pointer-events:none;}
        .dl-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(192,57,43,.35);background:rgba(192,57,43,.1);color:#C0392B;font-size:11px;letter-spacing:.28em;text-transform:uppercase;border-radius:999px;padding:7px 18px;margin-bottom:32px;}
        .dl-eyebrow span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#C0392B;animation:dlblink 1.8s ease-in-out infinite;}
        @keyframes dlblink{0%,100%{opacity:1}50%{opacity:.4}}
        .dl-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(52px,9vw,96px);letter-spacing:-.045em;color:#fff;line-height:1.0;margin-bottom:20px;}
        .dl-title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .dl-subtitle{font-size:clamp(16px,2vw,20px);color:rgba(255,255,255,.55);line-height:1.6;max-width:560px;margin:0 auto 52px;}
        .dl-countdown{display:inline-grid;grid-template-columns:repeat(4,1fr);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:20px;overflow:hidden;margin-bottom:48px;}
        .dl-countdown-unit{padding:24px 20px;text-align:center;border-right:1px solid rgba(255,255,255,.07);}
        .dl-countdown-unit:last-child{border-right:none;}
        .dl-countdown-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(40px,7vw,64px);color:#fff;line-height:1;letter-spacing:-.04em;}
        .dl-countdown-label{font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-top:8px;}
        .dl-expired-msg{color:rgba(255,255,255,.6);font-size:18px;margin-bottom:48px;font-style:italic;}
        .dl-cta-primary{display:inline-flex;align-items:center;padding:16px 36px;background:#C0392B;color:#fff;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;transition:background .2s,transform .2s;}
        .dl-cta-primary:hover{background:#a93226;transform:translateY(-2px);}

        /* ── Colegios participantes ── */
        .dl-schools{background:var(--bg,#F5F3EF);padding:100px 40px;position:relative;overflow:hidden;}
        .dl-schools::before{content:"";position:absolute;inset:0;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .05 0'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>");pointer-events:none;opacity:.5;}
        .dl-schools__inner{max-width:1100px;margin:0 auto;position:relative;}
        .dl-schools-header{margin-bottom:40px;}
        .dl-section-eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#C0392B;margin-bottom:14px;}
        .dl-section-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(26px,4vw,38px);letter-spacing:-.02em;color:var(--ink,#0D0D0D);line-height:1.1;}
        .dl-schools-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
        .dl-school-card{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.08));border-radius:16px;padding:20px 24px;box-shadow:0 2px 12px rgba(13,13,13,.06);transition:box-shadow .2s,transform .2s,border-color .2s;cursor:default;display:flex;flex-direction:column;align-items:center;text-align:center;}
        .dl-school-card:hover{box-shadow:0 8px 28px rgba(13,13,13,.13);transform:translateY(-3px);border-color:#C0392B;}
        .dl-school-num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:11px;color:#C0392B;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;}
        .dl-school-logo{width:72px;height:72px;border-radius:8px;object-fit:cover;display:block;}
        .dl-school-initials{width:72px;height:72px;border-radius:8px;background:rgba(192,57,43,.1);border:1px solid rgba(192,57,43,.2);display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:#C0392B;letter-spacing:.04em;}
        .dl-school-logo-wrap{margin-bottom:14px;display:flex;justify-content:center;}
        .dl-school-name-row{display:flex;align-items:flex-start;gap:6px;justify-content:center;}
        .dl-school-name{font-family:"Satoshi",sans-serif;font-weight:600;font-size:15px;color:var(--ink,#0D0D0D);line-height:1.35;}

        /* ── ¿Qué es? ── */
        .dl-about{background:var(--card-bg,#fff);padding:100px 40px;border-top:1px solid var(--card-border,rgba(13,13,13,.06));}
        .dl-about__inner{max-width:1100px;margin:0 auto;}
        .dl-about__row{display:grid;grid-template-columns:55fr 45fr;align-items:start;}
        .dl-about__left{padding-right:60px;border-right:1px solid rgba(192,57,43,.2);}
        .dl-about__right{padding-left:60px;}
        .dl-about-eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#C0392B;margin-bottom:16px;}
        .dl-about-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(28px,4vw,44px);letter-spacing:-.02em;color:var(--ink,#0D0D0D);line-height:1.15;margin-bottom:20px;}
        .dl-about-text{font-family:"Inter",sans-serif;font-size:16px;line-height:1.7;color:var(--mute,#6B6B6B);margin-bottom:32px;}
        .dl-stats-col{display:flex;flex-direction:column;gap:14px;}
        .dl-stat-card{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.08));border-radius:16px;padding:24px;text-align:center;}
        .dl-stat-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(32px,4vw,48px);color:#C0392B;line-height:1;letter-spacing:-.03em;}
        .dl-stat-label{font-family:"Inter",sans-serif;font-weight:500;font-size:12px;color:var(--mute,#6B6B6B);text-transform:uppercase;letter-spacing:.1em;margin-top:8px;}

        /* ── Final CTA ── */
        .dl-final{background:#0D0D0D;padding:100px 40px;text-align:center;position:relative;overflow:hidden;}
        .dl-final::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 110%,rgba(192,57,43,.15),transparent 70%);pointer-events:none;}
        .dl-final-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(30px,5vw,52px);color:#fff;letter-spacing:-.03em;margin-bottom:12px;}
        .dl-final-sub{font-size:17px;color:rgba(255,255,255,.5);margin-bottom:36px;}

        /* ── Footer ── */
        .dl-footer{background:#0D0D0D;border-top:1px solid rgba(255,255,255,.06);padding:24px 40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;}
        .dl-footer-text{font-size:12.5px;color:rgba(255,255,255,.3);}

        @media(max-width:960px){
          .dl-nav{padding:14px 20px;} .dl-nav-links{display:none;}
          .dl-hero{padding:80px 24px 100px;}
          .dl-countdown{display:grid;grid-template-columns:repeat(2,1fr);}
          .dl-schools{padding:80px 24px;} .dl-schools-grid{grid-template-columns:repeat(2,1fr);}
          .dl-about{padding:80px 24px;}
          .dl-about__row{grid-template-columns:1fr;}
          .dl-about__left{padding-right:0;border-right:none;border-bottom:1px solid rgba(192,57,43,.2);padding-bottom:48px;margin-bottom:0;}
          .dl-about__right{padding-left:0;padding-top:48px;}
          .dl-stats-col{flex-direction:row;}
          .dl-stat-card{flex:1;}
          .dl-final{padding:80px 24px;}
          .dl-footer{padding:20px 24px;}
        }
        @media(max-width:520px){
          .dl-schools-grid{grid-template-columns:1fr;}
          .dl-stats-col{flex-direction:column;}
          .dl-countdown{grid-template-columns:repeat(2,1fr);}
        }
      `}</style>

      {/* Nav */}
      <nav className="dl-nav">
        <Logo light />
        <div className="dl-nav-links">
          <a href="/">Inicio</a>
          <a href="/news">Noticias</a>
          <a href="/submit" style={{ color: '#C0392B', fontWeight: 700 }}>Subir proyecto →</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="dl-hero">
        <motion.div
          initial="hidden" animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <motion.div variants={fadeUp}>
            <div className="dl-eyebrow"><span />GUAJIRA 2026</div>
          </motion.div>

          <motion.h1 className="dl-title" variants={fadeUp}>
            Día de<br /><em>Liderazgo</em>
          </motion.h1>

          <motion.p className="dl-subtitle" variants={fadeUp}>
            8 colegios. 1 día. Un proyecto que cambia tu comunidad.
          </motion.p>

          <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
            {cd.expired ? (
              <p className="dl-expired-msg">¡El evento ha comenzado! 🎉</p>
            ) : (
              <div className="dl-countdown">
                <div className="dl-countdown-unit">
                  <div className="dl-countdown-num">{String(cd.days).padStart(2, '0')}</div>
                  <div className="dl-countdown-label">Días</div>
                </div>
                <div className="dl-countdown-unit">
                  <div className="dl-countdown-num">{String(cd.hours).padStart(2, '0')}</div>
                  <div className="dl-countdown-label">Horas</div>
                </div>
                <div className="dl-countdown-unit">
                  <div className="dl-countdown-num">{String(cd.minutes).padStart(2, '0')}</div>
                  <div className="dl-countdown-label">Minutos</div>
                </div>
                <div className="dl-countdown-unit" style={{ borderRight: 'none' }}>
                  <div className="dl-countdown-num">{String(cd.seconds).padStart(2, '0')}</div>
                  <div className="dl-countdown-label">Segundos</div>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp}>
            <Link href="/submit" className="dl-cta-primary">Subir mi proyecto →</Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Colegios participantes ── */}
      <section className="dl-schools">
        <div className="dl-schools__inner">
          <motion.div
            className="dl-schools-header"
            initial={pref ? false : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.div className="dl-section-eyebrow" variants={fadeUp}>Participantes</motion.div>
            <motion.h2 className="dl-section-title" variants={fadeUp}>Colegios participantes</motion.h2>
          </motion.div>

          <motion.div
            className="dl-schools-grid"
            initial={pref ? false : 'hidden'}
            whileInView="visible"
            viewport={{ once: true }}
            variants={schoolStagger}
          >
            {schools.map((school, i) => (
              <motion.div key={school.name} className="dl-school-card" variants={schoolCard}>
                <div className="dl-school-num">{String(i + 1).padStart(2, '0')}</div>
                <div className="dl-school-logo-wrap">
                  {school.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={school.logo_url} alt={school.name} className="dl-school-logo" />
                  ) : (
                    <div className="dl-school-initials">{getInitials(school.name)}</div>
                  )}
                </div>
                <div className="dl-school-name-row">
                  <PinIcon />
                  <span className="dl-school-name">{school.name}</span>
                </div>
                {school.code && <CodeBadge code={school.code} />}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── ¿Qué es el Día de Liderazgo? ── */}
      <section className="dl-about">
        <div className="dl-about__inner">
          <div className="dl-about__row">

            {/* Left: eyebrow + title + description + CTA */}
            <motion.div
              className="dl-about__left"
              initial={pref ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.div className="dl-about-eyebrow" variants={fadeUp}>
                DÍA DE LIDERAZGO · LA GUAJIRA
              </motion.div>
              <motion.h2 className="dl-about-title" variants={fadeUp}>
                ¿Qué es el Día de Liderazgo?
              </motion.h2>
              <motion.p className="dl-about-text" variants={fadeUp}>
                Una jornada donde estudiantes de La Guajira documentan y presentan sus proyectos de liderazgo comunitario. Cada proyecto es evaluado por coordinadores del programa The Big Leader de Big Family.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Link href="/submit" className="dl-cta-primary">Participar ahora →</Link>
              </motion.div>
            </motion.div>

            {/* Right: 3 stat cards stacked */}
            <div className="dl-about__right">
              <div className="dl-stats-col">
                {STATS.map((s, i) => (
                  <motion.div
                    key={i}
                    className="dl-stat-card"
                    initial={pref ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.1 }}
                  >
                    <div className="dl-stat-num">
                      {s.countUp ? <CountUp to={s.value as number} /> : s.display}
                    </div>
                    <div className="dl-stat-label">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="dl-final">
        <motion.div
          initial="hidden" whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <motion.h2 className="dl-final-title" variants={fadeUp}>
            ¿Listo para subir tu proyecto?
          </motion.h2>
          <motion.p className="dl-final-sub" variants={fadeUp}>
            Completa tu proyecto y envíalo antes del 16 de mayo
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/submit" className="dl-cta-primary">Comenzar ahora →</Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="dl-footer">
        <Logo light />
        <span className="dl-footer-text">The Big Leader · Día de Liderazgo 2026 · La Guajira</span>
      </footer>
    </>
  )
}
