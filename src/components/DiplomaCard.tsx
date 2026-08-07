'use client'

import { m } from 'framer-motion'
import type { DiplomaData } from '@/lib/diploma'
import { formatDate, arquetipoCode } from '@/lib/diploma'

// ── Seal SVG ─────────────────────────────────────────────────────────────────

// Beaded ring — small dots evenly spaced on a circle, classic wax-seal detail
function BeadRing({ r, count, size }: { r: number; count: number; size: number }) {
  const dots = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2
    return { cx: 50 + r * Math.cos(a), cy: 50 + r * Math.sin(a) }
  })
  return (
    <>
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={size} fill="#C0392B" opacity={0.55} />
      ))}
    </>
  )
}

export function Seal({ size = 94 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Counter-clockwise from (8,50) through top to (92,50) — text reads L→R at top */}
        <path id="cert-seal-arc" d="M 8 50 A 42 42 0 0 0 92 50" />
        <radialGradient id="cert-seal-glow" cx="50%" cy="42%" r="60%">
          <stop offset="0%"  stopColor="#C0392B" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#C0392B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Wax-like radial tint behind everything */}
      <circle cx="50" cy="50" r="46" fill="url(#cert-seal-glow)" />

      {/* Outer ring */}
      <circle cx="50" cy="50" r="47" fill="none" stroke="#C0392B" strokeWidth="1.5" />
      {/* Beaded detail ring — sits between outer and inner rings */}
      <BeadRing r={43.5} count={40} size={0.55} />
      {/* Inner ring */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#C0392B" strokeWidth="0.6" />
      {/* Innermost hairline — third ring, tight around the star */}
      <circle cx="50" cy="50" r="24" fill="none" stroke="#C0392B" strokeWidth="0.5" opacity="0.4" />

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

// ── Animation helper ────────────────────────────────────────────────────────
// When `animated` is false (compact preview inside a modal that already has
// its own entrance animation), every element just renders in its resting
// state — no motion props at all, so `m.*` behaves like a plain element.
type Init = Record<string, number>
function fx(
  animated: boolean,
  initial: Init,
  delayOrTransition: number | { type: 'spring'; stiffness: number; damping: number; delay: number },
) {
  if (!animated) return {}
  const animate: Init = {}
  for (const k of Object.keys(initial)) animate[k] = k === 'opacity' || k.startsWith('scale') ? 1 : 0
  const transition = typeof delayOrTransition === 'number'
    ? { type: 'spring' as const, stiffness: 120, damping: 20, delay: delayOrTransition }
    : delayOrTransition
  return { initial, animate, transition }
}

// ── DiplomaCard ──────────────────────────────────────────────────────────────

export interface DiplomaCardProps {
  data: DiplomaData
  certNumberText: string
  qrDataUrl?: string | null
  /** Smaller footprint for the landing-page preview modal. Default: full size. */
  compact?: boolean
  /** Staggered entrance per element. Default: true. Set false when the parent
   *  (e.g. a modal) already handles its own single entrance animation. */
  animated?: boolean
}

export default function DiplomaCard({
  data, certNumberText, qrDataUrl, compact = false, animated = true,
}: DiplomaCardProps) {
  const isMencion = data.resultado === 'mencion_honor'
  const c = compact

  return (
    <div className={`dc-card${c ? ' dc-card--compact' : ''}`}>
      <style>{`
        .dc-card{
          background:var(--card-bg,#FFFFFF);border-radius:4px;
          padding:${c ? '32px 30px' : '60px 76px'};
          position:relative;width:100%;
          box-shadow:${c ? 'none' : '0 20px 60px rgba(0,0,0,.07),0 4px 16px rgba(0,0,0,.04)'};
        }
        .dc-card::before{
          content:"";position:absolute;inset:0;border-radius:4px;
          border:${c ? '2.5px' : '3px'} solid #C0392B;pointer-events:none;
        }
        .dc-card::after{
          content:"";position:absolute;inset:${c ? '9px' : '14px'};border-radius:2px;
          border:1px solid rgba(192,57,43,.28);pointer-events:none;
        }
        .dc-sep{height:1px;background:rgba(192,57,43,.22);}
        .dc-sig-line{height:1px;background:var(--line,rgba(13,13,13,.14));margin-bottom:9px;width:${c ? '150px' : '200px'};}
        .dc-val-logo{height:${c ? '26px' : '48px'};object-fit:contain;}
        .dc-stats-row{display:flex;justify-content:center;align-items:center;margin:${c ? '18px' : '30px'} 0;flex-wrap:wrap;gap:0;}
        .dc-stats-cell{text-align:center;padding:${c ? '6px 16px' : '10px 24px'};}
        .dc-stats-vsep{width:1px;height:${c ? '30px' : '40px'};background:rgba(13,13,13,.12);flex-shrink:0;}
        ${!c ? `
        @media(max-width:640px){
          .dc-card{padding:44px 28px;max-width:100%;}
          .dc-card::after{inset:9px;}
          .dc-stats-row{flex-direction:column;gap:18px;}
          .dc-stats-vsep{display:none;}
          .dc-val-logo{height:36px;}
        }
        @media(max-width:480px){
          .dc-card{padding:36px 20px;}
          .dc-card::after{inset:7px;}
          .dc-sig-line{width:100%;}
          .dc-firma-row{flex-direction:column;gap:20px;align-items:center;}
        }
        @media print{
          .dc-card{box-shadow:none!important;max-width:100%!important;}
        }
        ` : `
        @media(max-width:420px){
          .dc-stats-row{flex-direction:column;gap:14px;}
          .dc-stats-vsep{display:none;}
          .dc-firma-row{flex-direction:column;gap:16px;align-items:center;text-align:center;}
        }
        `}
      `}</style>

      {/* 1 — Membrete institucional: logo colegio | sep | programa */}
      <m.div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: c ? 10 : 16, marginBottom: c ? 12 : 18,
        }}
        {...fx(animated, { opacity: 0, y: 10 }, 0.55)}
      >
        <img
          src="/Logo_ColegioAlbania.png"
          alt="Colegio Albania"
          style={{ height: c ? 26 : 36, objectFit: 'contain' }}
        />
        <div style={{ width: 1, height: c ? 20 : 28, background: 'rgba(13,13,13,.15)', flexShrink: 0 }} />
        <p style={{
          fontFamily: '"Satoshi",sans-serif', fontWeight: 700,
          fontSize: c ? 9.5 : 11, letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'var(--ink,#0D0D0D)',
        }}>
          The Big Family Program
        </p>
      </m.div>

      {/* 2 — Separador */}
      <m.div {...fx(animated, { opacity: 0, scaleX: 0 }, 0.65)} style={{ transformOrigin: 'center' }}>
        <div className="dc-sep" />
      </m.div>

      {/* 3 — "Este certificado se otorga a" */}
      <m.p
        style={{
          textAlign: 'center', marginTop: c ? 20 : 36, marginBottom: c ? 10 : 18,
          fontFamily: '"Satoshi",sans-serif', fontSize: c ? 12 : 13.5,
          color: 'var(--mute,#6B6B6B)', fontStyle: 'italic',
        }}
        {...fx(animated, { opacity: 0, y: 8 }, 0.75)}
      >
        Este certificado se otorga a
      </m.p>

      {/* 4 — Nombre del estudiante — Instrument Serif italic */}
      <m.h1
        style={{
          textAlign: 'center', marginBottom: data.leaderProfile ? (c ? 4 : 6) : (c ? 14 : 24),
          fontFamily: '"Instrument Serif",serif', fontStyle: 'italic', fontWeight: 400,
          fontSize: c ? 'clamp(1.9rem,4.4vw,2.9rem)' : 'clamp(2.5rem,6vw,4.4rem)',
          lineHeight: 1.08, color: 'var(--ink,#0D0D0D)', letterSpacing: '-0.02em',
        }}
        {...fx(animated, { opacity: 0, y: 16 }, { type: 'spring', stiffness: 100, damping: 18, delay: 0.85 })}
      >
        {data.studentName}
      </m.h1>

      {/* 4b — Arquetipo de líder — solo si tiene perfil */}
      {data.leaderProfile && (
        <m.p
          style={{
            textAlign: 'center', marginBottom: c ? 12 : 20,
            fontFamily: '"Instrument Serif",serif', fontStyle: 'italic',
            fontSize: c ? 'clamp(0.85rem,1.9vw,1.05rem)' : 'clamp(1rem,2vw,1.3rem)',
            color: '#C0392B', lineHeight: 1.2,
          }}
          {...fx(animated, { opacity: 0, y: 8 }, 0.92)}
        >
          {data.leaderProfile.arquetipo}
        </m.p>
      )}

      {/* 5 — "por haber completado exitosamente..." */}
      <m.p
        style={{
          textAlign: 'center', marginBottom: c ? 10 : 16,
          fontFamily: '"Satoshi",sans-serif', fontSize: c ? 12.5 : 14,
          color: 'var(--mute,#6B6B6B)',
        }}
        {...fx(animated, { opacity: 0, y: 8 }, 0.95)}
      >
        por haber completado exitosamente el programa de liderazgo
      </m.p>

      {/* 6 — THE BIG LEADER — el logro central, flanqueado por líneas ornamentales */}
      <m.div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: c ? 10 : 14,
          marginBottom: isMencion ? (c ? 8 : 10) : (c ? 16 : 26),
        }}
        {...fx(animated, { opacity: 0, y: 8 }, 1.05)}
      >
        <span style={{ width: c ? 18 : 28, height: 1, background: 'rgba(192,57,43,.35)', flexShrink: 0 }} />
        <p style={{
          fontFamily: '"Satoshi",sans-serif', fontWeight: 700,
          fontSize: c ? 13 : 16, letterSpacing: c ? '0.22em' : '0.26em', textTransform: 'uppercase',
          color: '#C0392B', whiteSpace: 'nowrap',
        }}>
          The Big Leader
        </p>
        <span style={{ width: c ? 18 : 28, height: 1, background: 'rgba(192,57,43,.35)', flexShrink: 0 }} />
      </m.div>

      {/* Mención de Honor badge — amber, solo si aplica */}
      {isMencion && (
        <m.div
          style={{ textAlign: 'center', marginBottom: c ? 14 : 22 }}
          {...fx(animated, { opacity: 0, scale: 0.88 }, 1.1)}
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
          textAlign: 'center', marginBottom: c ? 5 : 8,
          fontFamily: '"Satoshi",sans-serif', fontSize: c ? 12 : 13,
          color: 'var(--mute,#6B6B6B)',
        }}
        {...fx(animated, { opacity: 0, y: 6 }, 1.15)}
      >
        {data.schoolName}
      </m.p>

      {/* 8 — Fecha */}
      <m.p
        style={{
          textAlign: 'center', marginBottom: c ? 18 : 34,
          fontFamily: '"Satoshi",sans-serif', fontSize: c ? 12 : 13,
          color: 'var(--mute,#6B6B6B)',
        }}
        {...fx(animated, { opacity: 0, y: 6 }, 1.25)}
      >
        {formatDate(data.certDate)}
      </m.p>

      {/* 9 — Separador */}
      <m.div {...fx(animated, { opacity: 0, scaleX: 0 }, 1.35)} style={{ transformOrigin: 'center' }}>
        <div className="dc-sep" />
      </m.div>

      {/* 10 — Stats + Validaciones en fila única */}
      <m.div className="dc-stats-row" {...fx(animated, { opacity: 0, y: 8 }, 1.45)}>
        {/* XP */}
        <div className="dc-stats-cell">
          <div style={{
            fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: c ? 27 : 38,
            color: '#C0392B', letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            {data.totalXP.toLocaleString('es-CO')}
          </div>
          <div style={{
            fontFamily: '"Satoshi",sans-serif', fontSize: c ? 8.5 : 10,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--mute,#6B6B6B)', marginTop: c ? 5 : 7,
          }}>
            Puntos de Impacto
          </div>
        </div>

        <div className="dc-stats-vsep" />

        {/* Módulos */}
        <div className="dc-stats-cell">
          <div style={{
            fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: c ? 27 : 38,
            color: '#C0392B', letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            {data.modulesCompleted}
          </div>
          <div style={{
            fontFamily: '"Satoshi",sans-serif', fontSize: c ? 8.5 : 10,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--mute,#6B6B6B)', marginTop: c ? 5 : 7,
          }}>
            Módulos Completados
          </div>
        </div>

        <div className="dc-stats-vsep" />

        {/* Validaciones */}
        <div className="dc-stats-cell">
          <p style={{
            fontFamily: '"Satoshi",sans-serif', fontSize: c ? 8.5 : 10,
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: 'var(--mute,#6B6B6B)', marginBottom: c ? 7 : 10,
          }}>
            RECONOCIDO POR
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: c ? 10 : 16 }}>
            <img src="/cognia.png"                               alt="Cognia"                   className="dc-val-logo" />
            <img src="/International_Baccalaureate_Logo.svg.png" alt="International Baccalaureate" className="dc-val-logo" />
            <img src="/tri.png"                                  alt="Tri-Association"          className="dc-val-logo" />
          </div>
        </div>
      </m.div>

      {/* 11 — Separador pre-firma */}
      <m.div {...fx(animated, { opacity: 0, scaleX: 0 }, 1.55)} style={{ transformOrigin: 'center' }}>
        <div className="dc-sep" />
      </m.div>

      {/* 12 — Firma | Cert number | Sello */}
      <m.div
        className="dc-firma-row"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginTop: c ? 16 : 32,
        }}
        {...fx(animated, { opacity: 0, y: 8 }, 1.65)}
      >
        {/* Firma */}
        <div>
          <div className="dc-sig-line" />
          <p style={{
            fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: c ? 12 : 13.5,
            color: 'var(--ink,#0D0D0D)',
          }}>
            Luis Hernando Barrios
          </p>
          <p style={{
            fontFamily: '"Satoshi",sans-serif', fontSize: c ? 10.5 : 11.5,
            color: 'var(--mute,#6B6B6B)', marginTop: 3,
          }}>
            Fundador, The Big Family Program
          </p>
        </div>

        {/* Número de certificado + arquetipo code — centro */}
        <p style={{
          fontFamily: '"Satoshi",sans-serif', fontSize: c ? 9.5 : 11,
          letterSpacing: '0.24em', color: 'var(--mute,#6B6B6B)',
          alignSelf: 'flex-end', paddingBottom: 2, textAlign: 'center',
        }}>
          {certNumberText}
          {data.leaderProfile && (
            <span style={{ opacity: 0.6 }}>{` · ${arquetipoCode(data.leaderProfile.arquetipo)}`}</span>
          )}
        </p>

        {/* Sello + QR side by side */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <Seal size={c ? 60 : 94} />
          {qrDataUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <img
                src={qrDataUrl}
                alt="QR para verificar certificado"
                width={c ? 48 : 64}
                height={c ? 48 : 64}
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
  )
}
