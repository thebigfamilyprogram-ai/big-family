'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
interface DiplomaData {
  student_name:     string
  school_name:      string
  project_title:    string
  approved_at:      string | null
  evaluated_at:     string | null
  resultado:        'certificado' | 'mencion_honor'
  coordinator_name: string
}

type PageState = 'loading' | 'found' | 'not-certified' | 'not-found'

// ── Confetti ──────────────────────────────────────────────────────────────────
function fireConfetti() {
  if (typeof window === 'undefined') return
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;'
  document.body.appendChild(wrap)
  const colors = ['#C0392B', '#8B1A1A', '#D4AF37', '#F5C842', '#B8860B', '#fffdf8', '#f0e8d8']
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('div')
    const size = 5 + Math.random() * 9
    const xStart = 20 + Math.random() * 60
    const xDrift = (Math.random() - 0.5) * 340
    const yUp = -(100 + Math.random() * 200)
    const delay = Math.random() * 0.5
    p.style.cssText = `
      position:absolute;width:${size}px;height:${size}px;
      left:${xStart}%;top:50%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > 0.45 ? '50%' : '1px'};
      animation:cffly ${1.5 + Math.random() * 1.8}s ease-in ${delay}s forwards;
      --dx:${xDrift}px;--dy:${yUp}px;
    `
    wrap.appendChild(p)
  }
  if (!document.getElementById('cf-cert-style')) {
    const s = document.createElement('style')
    s.id = 'cf-cert-style'
    s.textContent = '@keyframes cffly{0%{transform:translate(0,0) rotate(0deg);opacity:1}100%{transform:translate(var(--dx),calc(var(--dy) + 520px)) rotate(540deg);opacity:0}}'
    document.head.appendChild(s)
  }
  setTimeout(() => wrap.remove(), 3600)
}

// ── Shimmer sweep ─────────────────────────────────────────────────────────────
function Shimmer({ trigger }: { trigger: boolean }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          key="shimmer"
          initial={{ x: '-110%', skewX: '-8deg' }}
          animate={{ x: '220%', skewX: '-8deg' }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          style={{
            position: 'absolute', top: 0, bottom: 0, width: '45%',
            background: 'linear-gradient(105deg, transparent 10%, rgba(212,175,55,.28) 50%, transparent 90%)',
            pointerEvents: 'none', zIndex: 10,
          }}
        />
      )}
    </AnimatePresence>
  )
}

// ── Wax seal ──────────────────────────────────────────────────────────────────
function WaxSeal() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20, opacity: 0 }}
      animate={{ scale: [0, 1.18, 0.92, 1], rotate: ['-20deg', '4deg', '-2deg', '0deg'], opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 2.4, duration: 0.9 }}
      style={{ width: 88, height: 88, margin: '0 auto', cursor: 'default' }}
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Seal background */}
        <circle cx="50" cy="50" r="49" fill="#7A1010" />
        <circle cx="50" cy="50" r="46" fill="#911414" />
        {/* Dashed inner ring */}
        <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" strokeDasharray="3.5 2.5" />
        {/* Inner circle */}
        <circle cx="50" cy="50" r="34" fill="#A81818" />
        {/* BF logo mark */}
        <circle cx="50" cy="30" r="5.5" fill="rgba(255,255,255,.88)" />
        <path d="M50 36 L65 62 H35 Z" fill="rgba(255,255,255,.88)" />
        <circle cx="35" cy="38" r="3.5" fill="rgba(255,255,255,.5)" />
        <circle cx="65" cy="38" r="3.5" fill="rgba(255,255,255,.5)" />
        {/* Stars */}
        <text x="22" y="80" fontSize="7" fill="rgba(255,220,100,.65)" textAnchor="middle">★</text>
        <text x="78" y="80" fontSize="7" fill="rgba(255,220,100,.65)" textAnchor="middle">★</text>
        {/* Label */}
        <text x="50" y="75" fontSize="5" fill="rgba(255,255,255,.45)" textAnchor="middle" fontFamily="sans-serif" letterSpacing="1.5">BIG FAMILY</text>
      </svg>
    </motion.div>
  )
}

// ── Stagger variants ──────────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16, delayChildren: 0.45 } },
}

const itemVariants = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 110, damping: 18 } },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CertificacionPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [pageState,   setPageState]   = useState<PageState>('loading')
  const [data,        setData]        = useState<DiplomaData | null>(null)
  const [shimmer,     setShimmer]     = useState(false)
  const [confettiFired, setConfettiFired] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return

    async function load() {
      const { data: project } = await supabase
        .from('projects')
        .select('id, title, approved_at, user_id, school_id')
        .eq('id', id)
        .maybeSingle()

      if (!project) { setPageState('not-found'); return }

      const { data: evaluation } = await supabase
        .from('capstone_evaluations')
        .select('resultado, coordinator_id, evaluated_at')
        .eq('project_id', id)
        .maybeSingle()

      if (!evaluation || !['certificado', 'mencion_honor'].includes(evaluation.resultado ?? '')) {
        setPageState('not-certified'); return
      }

      const userIds = [project.user_id, evaluation.coordinator_id].filter(Boolean) as string[]
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
        : { data: [] as { id: string; full_name: string | null }[] }

      const pMap: Record<string, string> = {}
      profiles?.forEach((p: { id: string; full_name: string | null }) => { pMap[p.id] = p.full_name ?? '—' })

      const { data: school } = project.school_id
        ? await supabase.from('schools').select('name').eq('id', project.school_id).maybeSingle()
        : { data: null }

      setData({
        student_name:     pMap[project.user_id] ?? '—',
        school_name:      (school as { name: string } | null)?.name ?? '—',
        project_title:    project.title ?? '(Sin título)',
        approved_at:      project.approved_at,
        evaluated_at:     evaluation.evaluated_at,
        resultado:        evaluation.resultado as 'certificado' | 'mencion_honor',
        coordinator_name: evaluation.coordinator_id ? (pMap[evaluation.coordinator_id] ?? '—') : '—',
      })
      setPageState('found')
    }

    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trigger animations once diploma appears ────────────────────────────────
  useEffect(() => {
    if (pageState !== 'found' || confettiFired) return
    const t = setTimeout(() => {
      fireConfetti()
      setShimmer(true)
      setConfettiFired(true)
    }, 1100)
    return () => clearTimeout(t)
  }, [pageState, confettiFired])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ minHeight: '100vh', background: '#f0e8d8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(192,57,43,.15)', borderTopColor: '#C0392B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </>
    )
  }

  // ── Error states ───────────────────────────────────────────────────────────
  if (pageState === 'not-found' || pageState === 'not-certified') {
    return (
      <div style={{ minHeight: '100vh', background: '#f0e8d8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎓</div>
        <h1 style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 22, color: '#0D0D0D', marginBottom: 8 }}>
          {pageState === 'not-found' ? 'Certificado no encontrado' : 'Certificado no disponible'}
        </h1>
        <p style={{ fontSize: 14, color: '#6B6B6B', maxWidth: 360, lineHeight: 1.6 }}>
          {pageState === 'not-found'
            ? 'El proyecto solicitado no existe.'
            : 'Este proyecto aún no cuenta con una certificación o mención de honor.'}
        </p>
        <button
          onClick={() => router.back()}
          style={{ marginTop: 24, padding: '10px 24px', borderRadius: 999, border: 'none', background: '#0D0D0D', color: '#fff', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
        >
          Volver
        </button>
      </div>
    )
  }

  // ── Diploma ────────────────────────────────────────────────────────────────
  const isMencion = data!.resultado === 'mencion_honor'
  const displayDate = fmtDate(data!.approved_at ?? data!.evaluated_at)

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#f0e8d8;min-height:100vh;font-family:"Satoshi",system-ui,sans-serif;}

        .cert-page{
          min-height:100vh;display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          padding:40px 24px 80px;background:#f0e8d8;
        }

        /* ── Diploma shell ── */
        .diploma{
          position:relative;width:100%;max-width:780px;
          background:#fffdf9;
          border:1.5px solid rgba(192,57,43,.3);
          border-radius:3px;
          padding:64px 80px 52px;
          box-shadow:
            0 2px 0 0 rgba(192,57,43,.15),
            0 32px 80px -16px rgba(0,0,0,.18),
            inset 0 0 0 10px rgba(192,57,43,.04);
          overflow:hidden;text-align:center;
        }
        .diploma::before{
          content:"";position:absolute;inset:14px;
          border:1px solid rgba(192,57,43,.12);border-radius:1px;
          pointer-events:none;z-index:0;
        }
        .diploma > * { position:relative;z-index:1; }

        .d-eyebrow{font-family:"Satoshi",sans-serif;font-size:9.5px;letter-spacing:.38em;text-transform:uppercase;color:#C0392B;margin-bottom:5px;}
        .d-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(18px,3.5vw,26px);letter-spacing:.08em;text-transform:uppercase;color:#0D0D0D;margin-bottom:3px;}
        .d-subtitle{font-family:"Satoshi",sans-serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#9a9690;margin-bottom:32px;}
        .d-badge{
          display:inline-flex;align-items:center;gap:7px;
          padding:5px 16px 5px 10px;border-radius:999px;border:1.5px solid;
          font-family:"Satoshi",sans-serif;font-weight:700;font-size:11px;
          letter-spacing:.06em;text-transform:uppercase;margin-bottom:28px;
        }
        .d-badge.mencion{background:#FEF9C3;border-color:#FBBF24;color:#713F12;}
        .d-badge.cert{background:#D1FAE5;border-color:#34D399;color:#065F46;}
        .d-presented{font-family:"Instrument Serif",Georgia,serif;font-style:italic;font-size:17px;color:#9a9690;margin-bottom:10px;}
        .d-name{font-family:"Instrument Serif",Georgia,serif;font-style:italic;font-size:clamp(38px,7vw,58px);color:#0D0D0D;line-height:1;letter-spacing:-.01em;margin-bottom:7px;}
        .d-school{font-family:"Satoshi",sans-serif;font-size:13px;color:#6B6B6B;letter-spacing:.05em;margin-bottom:32px;}
        .d-divider{width:100px;height:1px;background:rgba(192,57,43,.22);margin:0 auto 30px;}
        .d-for{font-family:"Instrument Serif",Georgia,serif;font-style:italic;font-size:16px;color:#9a9690;margin-bottom:8px;}
        .d-project{font-family:"Instrument Serif",Georgia,serif;font-style:italic;font-size:clamp(17px,3vw,22px);color:#0D0D0D;line-height:1.4;margin-bottom:6px;}
        .d-date{font-family:"Satoshi",sans-serif;font-size:11.5px;color:#9a9690;letter-spacing:.08em;margin-bottom:36px;}
        .d-sigs{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:28px;}
        .d-sig-line{height:1px;background:rgba(13,13,13,.14);margin-bottom:7px;}
        .d-sig-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#0D0D0D;}
        .d-sig-role{font-family:"Satoshi",sans-serif;font-size:10.5px;color:#9a9690;letter-spacing:.06em;text-transform:uppercase;margin-top:2px;}

        /* ── Actions ── */
        .cert-actions{display:flex;justify-content:center;gap:12px;margin-top:28px;}
        .cert-btn{padding:12px 28px;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13.5px;cursor:pointer;transition:all .2s;border:none;}
        .cert-btn--dl{background:#C0392B;color:#fff;}
        .cert-btn--dl:hover{background:#a93226;}
        .cert-btn--back{background:transparent;border:1.5px solid rgba(13,13,13,.18);color:#6B6B6B;}
        .cert-btn--back:hover{border-color:#0D0D0D;color:#0D0D0D;}

        /* ── Print ── */
        @media print {
          html,body{background:#fff !important;}
          .no-print{display:none !important;}
          .cert-page{padding:0;background:#fff !important;min-height:unset;justify-content:flex-start;}
          .diploma{
            max-width:100%;width:100%;
            box-shadow:none !important;
            border:1.5px solid #C0392B !important;
            page-break-inside:avoid;
          }
        }

        @media(max-width:640px){
          .diploma{padding:40px 28px 40px;}
          .d-sigs{grid-template-columns:1fr;gap:20px;}
        }
      `}</style>

      <div className="cert-page">

        {/* ── Diploma ── */}
        <motion.div
          className="diploma"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 18 }}
        >
          {/* Gold shimmer sweep */}
          <Shimmer trigger={shimmer} />

          {/* All inner elements stagger in */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible">

            {/* 1 · Logo */}
            <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <svg width="26" height="26" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="10" r="6" fill="#C0392B"/>
                <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
                <circle cx="9" cy="18" r="4" fill="#9a9690"/>
                <circle cx="43" cy="18" r="4" fill="#9a9690"/>
              </svg>
              <span style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 16, color: '#0D0D0D', letterSpacing: '.02em' }}>Big Family</span>
            </motion.div>

            {/* 2 · Heading */}
            <motion.div variants={itemVariants}>
              <p className="d-eyebrow">The Big Leader Program</p>
              <h1 className="d-title">Certificado de Liderazgo</h1>
              <p className="d-subtitle">Programa de Formación de Líderes · Colombia</p>
            </motion.div>

            {/* 3 · resultado badge */}
            <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center' }}>
              <span className={`d-badge ${isMencion ? 'mencion' : 'cert'}`}>
                <span style={{ fontSize: 15 }}>{isMencion ? '🏆' : '✓'}</span>
                {isMencion ? 'Mención de Honor' : 'Certificado'}
              </span>
            </motion.div>

            {/* 4 · Student name */}
            <motion.div variants={itemVariants}>
              <p className="d-presented">se otorga con orgullo a</p>
              <h2 className="d-name">{data!.student_name}</h2>
              <p className="d-school">{data!.school_name}</p>
            </motion.div>

            {/* Divider */}
            <motion.div variants={itemVariants}>
              <div className="d-divider" />
            </motion.div>

            {/* 5 · Project */}
            <motion.div variants={itemVariants}>
              <p className="d-for">por haber completado con éxito el proyecto de liderazgo</p>
              <p className="d-project">"{data!.project_title}"</p>
              <p className="d-date">Aprobado el {displayDate}</p>
            </motion.div>

            {/* 6 · Signatures */}
            <motion.div variants={itemVariants} className="d-sigs">
              <div>
                <div className="d-sig-line" />
                <div className="d-sig-name">Luis Barrios</div>
                <div className="d-sig-role">Fundador · Big Family</div>
              </div>
              <div>
                <div className="d-sig-line" />
                <div className="d-sig-name">{data!.coordinator_name}</div>
                <div className="d-sig-role">Coordinador del Programa</div>
              </div>
            </motion.div>

          </motion.div>

          {/* 7 · Wax seal — animates in last */}
          <WaxSeal />

        </motion.div>

        {/* Actions */}
        <div className="cert-actions no-print">
          <button className="cert-btn cert-btn--dl" onClick={() => window.print()}>
            Descargar PDF
          </button>
          <button className="cert-btn cert-btn--back" onClick={() => router.back()}>
            Volver
          </button>
        </div>

      </div>
    </>
  )
}
