'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { m } from 'framer-motion'
import { Link } from 'next-view-transitions'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaderProfile {
  arquetipo: string
  big_five:  { O: number; C: number; E: number; A: number; N: number; ES: number }
}

interface DiplomaData {
  studentName:      string
  schoolName:       string
  resultado:        'certificado' | 'mencion_honor'
  certDate:         string
  totalXP:          number
  modulesCompleted: number
  leaderProfile:    LeaderProfile | null
}

// ── Confetti ─────────────────────────────────────────────────────────────────

const C_COLORS = ['#C0392B', '#D4821A', '#F5F3EF', '#E8C44A', '#A93226']

// Deterministic particles — golden-angle spread, no Math.random
const PARTICLES = Array.from({ length: 72 }, (_, i) => ({
  id:       i,
  color:    C_COLORS[i % C_COLORS.length],
  left:     ((i * 137.508) % 100).toFixed(2),
  delay:    ((i % 24) * 0.025).toFixed(3),
  duration: (1.6 + (i % 7) * 0.25).toFixed(2),
  tx:       ((i % 21) - 10) * 16,         // –160 to 160px
  rot:      (i * 67) % 720,
  size:     4 + (i % 4) * 2,
  circle:   i % 3 === 0,
}))

// Remove confetti from DOM after last particle fades out
const CONFETTI_TTL =
  Math.max(...PARTICLES.map(p => parseFloat(p.duration) + parseFloat(p.delay))) * 1000 + 300

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function certNumber(id: string, date: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, '') || '0'
  const num = (parseInt(hex.slice(-6) || hex, 16) % 9000) + 1000 // always 1000–9999
  return `CERT-${new Date(date).getFullYear()}-${String(num).padStart(4, '0')}`
}

// Deterministic cert ID for QR/verification — first 8 chars of UUID + year
function makeCertId(userId: string, date: string): string {
  const year = new Date(date).getFullYear()
  const part = userId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `BF${year}${part}`
}

function arquetipoCode(arquetipo: string | undefined): string {
  if (!arquetipo) return ''
  const parts = arquetipo.trim().split(/\s+/)
  return parts[parts.length - 1].toUpperCase()
}

// Mini 40×40 pentagon SVG — shows Big Five profile inline in diploma
function MiniPentagon({ profile }: { profile: LeaderProfile }) {
  const CX = 20, CY = 20, R = 14
  const toRad = (d: number) => (d * Math.PI) / 180
  const VERTS = [
    { angle: -90,  score: profile.big_five.C  },
    { angle: -18,  score: profile.big_five.O  },
    { angle:  54,  score: profile.big_five.E  },
    { angle: 126,  score: profile.big_five.ES },
    { angle: 198,  score: profile.big_five.A  },
  ]
  const pt = (angle: number, r: number) =>
    `${CX + r * Math.cos(toRad(angle))},${CY + r * Math.sin(toRad(angle))}`
  const refPts  = VERTS.map(v => pt(v.angle, R)).join(' ')
  const profPts = VERTS.map(v => pt(v.angle, ((v.score ?? 50) / 100) * R)).join(' ')
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden="true" style={{ flexShrink: 0 }}>
      <polygon points={refPts} fill="none" stroke="rgba(13,13,13,0.14)" strokeWidth={0.8} />
      <polygon points={profPts} fill="rgba(192,57,43,0.15)" stroke="#C0392B" strokeWidth={1} />
    </svg>
  )
}

// ── Seal SVG ─────────────────────────────────────────────────────────────────

function Seal() {
  return (
    <svg
      viewBox="0 0 100 100"
      width="84"
      height="84"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Counter-clockwise from (8,50) through top to (92,50) — text reads L→R at top */}
        <path id="cert-seal-arc" d="M 8 50 A 42 42 0 0 0 92 50" />
      </defs>

      {/* Outer ring */}
      <circle cx="50" cy="50" r="47" fill="none" stroke="#C0392B" strokeWidth="1.5" />
      {/* Inner ring */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#C0392B" strokeWidth="0.6" />

      {/* Arc text */}
      <text
        fill="#C0392B"
        fontSize="6.8"
        fontFamily="Satoshi, sans-serif"
        fontWeight="700"
        letterSpacing="1.5"
      >
        <textPath href="#cert-seal-arc" startOffset="50%" textAnchor="middle">
          BIG FAMILY · CERTIFIED
        </textPath>
      </text>

      {/* 5-pointed star — center (50,50), outer r=14, inner r=6 */}
      <path
        d="M50 36 L53.5 45.1 L63.3 45.7 L55.7 51.8 L58.2 61.3 L50 56 L41.8 61.3 L44.3 51.8 L36.7 45.7 L46.5 45.1Z"
        fill="#C0392B"
      />
    </svg>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CertificacionPage() {
  const params      = useParams()
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const rawId     = params?.id
  const studentId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? (rawId[0] ?? '') : ''

  const [loading,        setLoading]        = useState(true)
  const [data,           setData]           = useState<DiplomaData | null>(null)
  const [confettiActive, setConfettiActive] = useState(false)
  const [authed,         setAuthed]         = useState(false)
  const [qrDataUrl,      setQrDataUrl]      = useState<string | null>(null)

  // Remove confetti particles after animations complete
  useEffect(() => {
    if (!confettiActive) return
    const t = setTimeout(() => setConfettiActive(false), CONFETTI_TTL)
    return () => clearTimeout(t)
  }, [confettiActive])

  // Data fetch
  useEffect(() => {
    if (!studentId) { router.replace('/dashboard'); return }

    // MOCK_MODE: skip Supabase entirely
    if (MOCK_MODE) {
      const d = {
        ...MOCK.mockDiploma,
        leaderProfile: {
          arquetipo: 'Líder Visionaria',
          big_five:  { O: 85, C: 42, E: 78, A: 38, N: 35, ES: 65 },
        },
      }
      setData(d)
      setAuthed(true)
      const mockCertId = 'BF2026MOCKDATA'
      const url = `https://big-family-nu.vercel.app/verify/${mockCertId}`
      import('qrcode').then(QR => QR.default.toDataURL(url, { width: 128, margin: 1, color: { dark: '#0D0D0D', light: '#FFFFFF' } }).then(setQrDataUrl).catch(console.error))
      setLoading(false)
      return
    }

    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return

    async function load() {
      // 1. Student's projects → find certified capstone
      const { data: projects } = await sb!
        .from('projects')
        .select('id')
        .eq('user_id', studentId)

      const projectIds = (projects ?? []).map((p: { id: string }) => p.id)

      let eval_: { resultado: string; created_at: string } | null = null
      if (projectIds.length > 0) {
        const { data } = await sb!
          .from('capstone_evaluations')
          .select('resultado, created_at')
          .in('resultado', ['certificado', 'mencion_honor'])
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        eval_ = data
      }

      if (!eval_) {
        router.replace('/dashboard')
        return
      }

      // 2. Parallel fetch — profile, XP, modules, viewer auth
      const [
        { data: profile },
        { data: xpRows },
        { data: progRows },
        { data: { user: viewer } },
      ] = await Promise.all([
        sb!.from('profiles').select('display_name, school_id, leadership_profile').eq('id', studentId).maybeSingle(),
        sb!.from('xp_log').select('amount').eq('user_id', studentId),
        sb!.from('progress').select('id').eq('user_id', studentId).eq('completed', true),
        sb!.auth.getUser(),
      ])
      if (viewer) setAuthed(true)

      // 3. School name
      const schoolId = (profile as { school_id?: string | null } | null)?.school_id
      let schoolName = ''
      if (schoolId) {
        const { data: school } = await sb!
          .from('schools').select('name').eq('id', schoolId).maybeSingle()
        schoolName = (school as { name: string } | null)?.name ?? ''
      }

      const rawProfile = profile as { display_name?: string | null; school_id?: string | null; leadership_profile?: unknown } | null
      const lp = rawProfile?.leadership_profile as LeaderProfile | null ?? null
      const resolvedData: DiplomaData = {
        studentName:      rawProfile?.display_name ?? 'Estudiante',
        schoolName,
        resultado:        eval_.resultado as 'certificado' | 'mencion_honor',
        certDate:         eval_.created_at,
        totalXP:          (xpRows ?? []).reduce((s: number, r: { amount: number | null }) => s + (r.amount ?? 0), 0),
        modulesCompleted: progRows?.length ?? 0,
        leaderProfile:    lp,
      }
      setData(resolvedData)

      // Register cert for QR verification + generate QR
      const cId = makeCertId(studentId, eval_.created_at)
      // Fire-and-forget cert registration
      sb!.from('issued_certificates')
        .upsert({ cert_id: cId, user_id: studentId }, { onConflict: 'cert_id' })
        .select()
        .then(() => {})
      const verifyUrl = `https://big-family-nu.vercel.app/verify/${cId}`
      import('qrcode').then(QR => QR.default.toDataURL(verifyUrl, { width: 128, margin: 1, color: { dark: '#0D0D0D', light: '#FFFFFF' } }).then(setQrDataUrl).catch(console.error))

      setLoading(false)
    }

    load()
  }, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--bg,#FAF8F4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <style>{`@keyframes shimmer{0%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
        <div style={{
          width: '100%', maxWidth: 720, margin: '0 24px',
          background: 'var(--card-bg,#fff)', borderRadius: 4,
          outline: '2px solid #C0392B',
          padding: '56px 64px',
          display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center',
        }}>
          {[140, 36, 260, 72, 180, 48, 120, 36].map((w, i) => (
            <div key={i} style={{
              width: w, height: 14, borderRadius: 6,
              background: 'linear-gradient(90deg,var(--bg-2,#EFECE6) 25%,var(--card-bg,#fff) 50%,var(--bg-2,#EFECE6) 75%)',
              backgroundSize: '400% 100%',
              animation: 'shimmer 1.4s ease infinite',
            }} />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const isMencion = data.resultado === 'mencion_honor'

  // ── Spring transition delays for staggered entrance ──────────────────────────
  const sp = (delay: number) => ({
    type: 'spring' as const, stiffness: 120, damping: 20, delay,
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{font-family:"Satoshi",sans-serif;-webkit-font-smoothing:antialiased;}
        @keyframes cfall{
          0%  {opacity:1;transform:translateY(-20px) translateX(0) rotate(0deg);}
          85% {opacity:.8;}
          100%{opacity:0;transform:translateY(110vh) translateX(var(--tx)) rotate(var(--rot));}
        }
        .dp-page{
          min-height:100dvh;background:var(--bg,#FAF8F4);
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:40px 24px 60px;
        }
        .dp-card{
          background:var(--card-bg,#FFFFFF);border-radius:4px;
          padding:48px 72px;
          position:relative;width:100%;max-width:900px;
          box-shadow:0 20px 60px rgba(0,0,0,.07),0 4px 16px rgba(0,0,0,.04);
        }
        /* Outer ornamental border */
        .dp-card::before{
          content:"";position:absolute;inset:0;border-radius:4px;
          border:2px solid #C0392B;pointer-events:none;
        }
        /* Inner ornamental border — 6px gap from outer (outer is 2px, inset 8 = 6px gap) */
        .dp-card::after{
          content:"";position:absolute;inset:8px;border-radius:2px;
          border:1px solid rgba(192,57,43,.25);pointer-events:none;
        }
        .dp-sep{height:1px;background:rgba(192,57,43,.22);}
        .dp-sig-line{height:1px;background:var(--line,rgba(13,13,13,.14));margin-bottom:9px;width:200px;}
        .dp-val-logo{height:48px;object-fit:contain;}
        /* Stats+val row collapses to column on mobile */
        .dp-stats-row{display:flex;justify-content:center;align-items:center;margin:22px 0;flex-wrap:wrap;gap:0;}
        .dp-stats-cell{text-align:center;padding:10px 28px;}
        .dp-stats-vsep{width:1px;height:40px;background:rgba(13,13,13,.12);flex-shrink:0;}
        @media(max-width:640px){
          .dp-card{padding:40px 28px;max-width:100%;}
          .dp-card::after{inset:6px;}
          .dp-stats-row{flex-direction:column;gap:18px;}
          .dp-stats-vsep{display:none;}
          .dp-val-logo{height:36px;}
        }
        @media(max-width:480px){
          .dp-card{padding:32px 20px;}
          .dp-card::after{inset:5px;}
          .dp-sig-line{width:100%;}
          .dp-firma-row{flex-direction:column;gap:20px;align-items:center;}
        }
        @media print{
          .no-print{display:none!important;}
          html,body{background:#FAF8F4!important;}
          .dp-page{background:#FAF8F4!important;padding:0!important;min-height:auto!important;}
          .dp-card{box-shadow:none!important;max-width:100%!important;}
        }
      `}</style>

      {/* Confetti — fixed overlay, removed from DOM after TTL */}
      {confettiActive && PARTICLES.map(p => (
        <div
          key={p.id}
          style={{
            position: 'fixed', top: 0, left: `${p.left}%`,
            width: p.size, height: p.circle ? p.size : Math.round(p.size * 1.6),
            borderRadius: p.circle ? '50%' : 2,
            background: p.color,
            pointerEvents: 'none', zIndex: 9999,
            animation: `cfall ${p.duration}s ${p.delay}s ease-in both`,
            '--tx': `${p.tx}px`,
            '--rot': `${p.rot}deg`,
          } as React.CSSProperties}
        />
      ))}

      {/* Page wrapper — fades in first */}
      <m.div
        className="dp-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Diploma card — spring entry, fires confetti on complete */}
        <m.div
          style={{ width: '100%', maxWidth: 900 }}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.3 }}
          onAnimationComplete={() => setConfettiActive(true)}
        >
          <div className="dp-card">

            {/* 1 — Membrete institucional: logo colegio | sep | programa */}
            <m.div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 16, marginBottom: 18,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={sp(0.55)}
            >
              <img
                src="/Logo_ColegioAlbania.png"
                alt="Colegio Albania"
                style={{ height: 36, objectFit: 'contain' }}
              />
              <div style={{ width: 1, height: 28, background: 'rgba(13,13,13,.15)', flexShrink: 0 }} />
              <p style={{
                fontFamily: '"Satoshi",sans-serif', fontWeight: 700,
                fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase',
                color: 'var(--ink,#0D0D0D)',
              }}>
                The Big Family Program
              </p>
            </m.div>

            {/* 2 — Separador (scale desde centro) */}
            <m.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={sp(0.65)}
              style={{ transformOrigin: 'center' }}
            >
              <div className="dp-sep" />
            </m.div>

            {/* 3 — "Este certificado se otorga a" */}
            <m.p
              style={{
                textAlign: 'center', marginTop: 28, marginBottom: 14,
                fontFamily: '"Satoshi",sans-serif', fontSize: 13.5,
                color: 'var(--mute,#6B6B6B)', fontStyle: 'italic',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={sp(0.75)}
            >
              Este certificado se otorga a
            </m.p>

            {/* 4 — Nombre del estudiante — Instrument Serif italic */}
            <m.h1
              style={{
                textAlign: 'center', marginBottom: data.leaderProfile ? 4 : 20,
                fontFamily: '"Instrument Serif",serif', fontStyle: 'italic', fontWeight: 400,
                fontSize: 'clamp(2.2rem,5vw,3.6rem)',
                lineHeight: 1.1, color: 'var(--ink,#0D0D0D)', letterSpacing: '-0.02em',
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 18, delay: 0.85 }}
            >
              {data.studentName}
            </m.h1>

            {/* 4b — Arquetipo de líder — solo si tiene perfil */}
            {data.leaderProfile && (
              <m.p
                style={{
                  textAlign: 'center', marginBottom: 20,
                  fontFamily: '"Instrument Serif",serif', fontStyle: 'italic',
                  fontSize: 'clamp(1rem,2vw,1.3rem)',
                  color: '#C0392B', lineHeight: 1.2,
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={sp(0.92)}
              >
                {data.leaderProfile.arquetipo}
              </m.p>
            )}

            {/* 5 — "por haber completado exitosamente..." */}
            <m.p
              style={{
                textAlign: 'center', marginBottom: 10,
                fontFamily: '"Satoshi",sans-serif', fontSize: 14,
                color: 'var(--mute,#6B6B6B)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={sp(0.95)}
            >
              por haber completado exitosamente el programa de liderazgo
            </m.p>

            {/* 6 — THE BIG LEADER */}
            <m.p
              style={{
                textAlign: 'center', marginBottom: isMencion ? 8 : 22,
                fontFamily: '"Satoshi",sans-serif', fontWeight: 700,
                fontSize: 15, letterSpacing: '0.22em', textTransform: 'uppercase',
                color: '#C0392B',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={sp(1.05)}
            >
              The Big Leader
            </m.p>

            {/* Mención de Honor badge — amber, solo si aplica */}
            {isMencion && (
              <m.div
                style={{ textAlign: 'center', marginBottom: 22 }}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={sp(1.1)}
              >
                <span style={{
                  display: 'inline-block',
                  fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 10,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: 'var(--accent-amber,#D4821A)',
                  border: '1px solid rgba(212,130,26,.3)', borderRadius: 100,
                  padding: '4px 16px', background: 'rgba(212,130,26,.1)',
                }}>
                  ✦ MENCIÓN DE HONOR ✦
                </span>
              </m.div>
            )}

            {/* 7 — Colegio */}
            <m.p
              style={{
                textAlign: 'center', marginBottom: 6,
                fontFamily: '"Satoshi",sans-serif', fontSize: 13,
                color: 'var(--mute,#6B6B6B)',
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={sp(1.15)}
            >
              {data.schoolName}
            </m.p>

            {/* 8 — Fecha */}
            <m.p
              style={{
                textAlign: 'center', marginBottom: 28,
                fontFamily: '"Satoshi",sans-serif', fontSize: 13,
                color: 'var(--mute,#6B6B6B)',
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={sp(1.25)}
            >
              {formatDate(data.certDate)}
            </m.p>

            {/* 9 — Separador */}
            <m.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={sp(1.35)}
              style={{ transformOrigin: 'center' }}
            >
              <div className="dp-sep" />
            </m.div>

            {/* 10 — Stats + Validaciones en fila única (landscape) */}
            <m.div
              className="dp-stats-row"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={sp(1.45)}
            >
              {/* XP */}
              <div className="dp-stats-cell">
                <div style={{
                  fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 28,
                  color: '#C0392B', letterSpacing: '-0.02em',
                }}>
                  {data.totalXP.toLocaleString('es-CO')}
                </div>
                <div style={{
                  fontFamily: '"Satoshi",sans-serif', fontSize: 10,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'var(--mute,#6B6B6B)', marginTop: 4,
                }}>
                  Puntos de Impacto
                </div>
              </div>

              <div className="dp-stats-vsep" />

              {/* Módulos */}
              <div className="dp-stats-cell">
                <div style={{
                  fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 28,
                  color: '#C0392B', letterSpacing: '-0.02em',
                }}>
                  {data.modulesCompleted}
                </div>
                <div style={{
                  fontFamily: '"Satoshi",sans-serif', fontSize: 10,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'var(--mute,#6B6B6B)', marginTop: 4,
                }}>
                  Módulos Completados
                </div>
              </div>

              <div className="dp-stats-vsep" />

              {/* Validaciones */}
              <div className="dp-stats-cell">
                <p style={{
                  fontFamily: '"Satoshi",sans-serif', fontSize: 10,
                  letterSpacing: '0.28em', textTransform: 'uppercase',
                  color: 'var(--mute,#6B6B6B)', marginBottom: 10,
                }}>
                  RECONOCIDO POR
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <img src="/cognia.png"                               alt="Cognia"                   className="dp-val-logo" />
                  <img src="/International_Baccalaureate_Logo.svg.png" alt="International Baccalaureate" className="dp-val-logo" />
                  <img src="/tri.png"                                  alt="Tri-Association"          className="dp-val-logo" />
                </div>
              </div>
            </m.div>

            {/* 11 — Separador pre-firma */}
            <m.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={sp(1.55)}
              style={{ transformOrigin: 'center' }}
            >
              <div className="dp-sep" />
            </m.div>

            {/* 12 — Firma | Cert number | Sello */}
            <m.div
              className="dp-firma-row"
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                marginTop: 22,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={sp(1.65)}
            >
              {/* Firma */}
              <div>
                <div className="dp-sig-line" />
                <p style={{
                  fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13.5,
                  color: 'var(--ink,#0D0D0D)',
                }}>
                  Luis Hernando Barrios
                </p>
                <p style={{
                  fontFamily: '"Satoshi",sans-serif', fontSize: 11.5,
                  color: 'var(--mute,#6B6B6B)', marginTop: 3,
                }}>
                  Fundador, The Big Family Program
                </p>
              </div>

              {/* Número de certificado + arquetipo code — centro */}
              <p style={{
                fontFamily: '"Satoshi",sans-serif', fontSize: 11,
                letterSpacing: '0.24em', color: 'var(--mute,#6B6B6B)',
                alignSelf: 'flex-end', paddingBottom: 2, textAlign: 'center',
              }}>
                {certNumber(studentId, data.certDate)}
                {data.leaderProfile && (
                  <span style={{ opacity: 0.6 }}>{` · ${arquetipoCode(data.leaderProfile.arquetipo)}`}</span>
                )}
              </p>

              {/* Sello + QR side by side */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <Seal />
                {qrDataUrl && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <img
                      src={qrDataUrl}
                      alt="QR para verificar certificado"
                      width={64}
                      height={64}
                      style={{ display: 'block', borderRadius: 4 }}
                    />
                    <span style={{
                      fontFamily: '"Satoshi",sans-serif', fontSize: 8,
                      letterSpacing: '0.1em', color: 'var(--mute,#6B6B6B)',
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                      Verificar
                    </span>
                  </div>
                )}
              </div>
            </m.div>

          </div>
        </m.div>

        {/* Botones — solo para usuarios autenticados, ocultos en print */}
        {authed && <m.div
          className="no-print"
          style={{
            display: 'flex', gap: 12, marginTop: 28,
            flexWrap: 'wrap', justifyContent: 'center',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={sp(2.0)}
        >
          <button
            onClick={() => window.print()}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink,#0D0D0D)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,13,13,.25)' }}
            style={{
              padding: '11px 24px',
              border: '1.5px solid rgba(13,13,13,.25)', borderRadius: 999,
              background: 'transparent',
              fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14,
              color: 'var(--ink,#0D0D0D)', cursor: 'pointer', transition: 'border-color .2s',
            }}
          >
            Imprimir certificado
          </button>

          <Link
            href="/dashboard"
            style={{
              padding: '11px 24px',
              border: '1.5px solid transparent', borderRadius: 999,
              fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14,
              color: 'var(--mute,#6B6B6B)', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center',
              transition: 'color .2s',
            }}
          >
            Volver al dashboard
          </Link>
        </m.div>}
      </m.div>
    </>
  )
}
