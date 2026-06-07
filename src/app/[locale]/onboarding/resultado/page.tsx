'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion as m } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'
import { PILLAR_ANGLES, type Pillar } from '@/lib/bigFiveQuestions'

// ── Types ─────────────────────────────────────────────────────────────────────
interface LeaderProfile {
  arquetipo:           string
  descripcion:         string
  mensaje_bienvenida:  string
  fortaleza_principal: string
  reto_principal:      string
  fortalezas:          Pillar[]
  areas_crecimiento:   Pillar[]
  big_five:            { O: number; C: number; E: number; A: number; N: number; ES: number }
}

// ── Mock ──────────────────────────────────────────────────────────────────────
const MOCK_RESULT: LeaderProfile = {
  arquetipo:           'Líder Visionaria',
  descripcion:         'Tienes una capacidad natural para ver lo que otros no ven. Tu energía y apertura generan movimiento a tu alrededor, y tu capacidad de inspirar es genuina. Eres el tipo de líder que define hacia dónde va el grupo, no quien solo lo sigue.',
  mensaje_bienvenida:  'Valentina, tu manera de conectar ideas con acción es lo que el programa necesita. Tu ruta comienza ahora.',
  fortaleza_principal: 'Tu mayor fortaleza es la capacidad de transformar visiones abstractas en entusiasmo concreto.',
  reto_principal:      'Tu reto es aprender a construir estructuras que sostengan tus ideas cuando la energía inicial se agota.',
  fortalezas:          ['Norte', 'Acción'],
  areas_crecimiento:   ['Yo', 'Vínculo'],
  big_five:            { O: 85, C: 42, E: 78, A: 38, N: 35, ES: 65 },
}

// ── Pentagon constants ─────────────────────────────────────────────────────────
const SVG_SIZE = 320
const CX = 160
const CY = 160
const R  = 120

const PILLARS: { key: Pillar; dim: 'O' | 'C' | 'E' | 'A' | 'ES' }[] = [
  { key: 'Norte',  dim: 'O'  },
  { key: 'Acción', dim: 'E'  },
  { key: 'Legado', dim: 'ES' },
  { key: 'Vínculo', dim: 'A' },
  { key: 'Yo',     dim: 'C'  },
]

function toRad(deg: number) { return (deg * Math.PI) / 180 }

function pentagonPath(scores: Record<string, number>, scale = 1): string {
  const pts = PILLARS.map(p => {
    const angle = toRad(PILLAR_ANGLES[p.key])
    const r = ((scores[p.dim] ?? 50) / 100) * R * scale
    return `${CX + r * Math.cos(angle)},${CY + r * Math.sin(angle)}`
  })
  return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} Z`
}

function labelPos(pillar: Pillar, extraR = 22): { x: number; y: number } {
  const angle = toRad(PILLAR_ANGLES[pillar])
  return {
    x: CX + (R + extraR) * Math.cos(angle),
    y: CY + (R + extraR) * Math.sin(angle),
  }
}

// ── Spring presets ────────────────────────────────────────────────────────────
const springNatural = { type: 'spring' as const, stiffness: 140, damping: 20 }
const springHeavy   = { type: 'spring' as const, stiffness: 80,  damping: 18 }

// ── Component ─────────────────────────────────────────────────────────────────
export default function OnboardingResultadoPage() {
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [profile, setProfile] = useState<LeaderProfile | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function load() {
      if (MOCK_MODE) {
        const stored = sessionStorage.getItem('bf_result')
        setProfile(stored ? JSON.parse(stored) : MOCK_RESULT)
        setReady(true)
        return
      }

      // Try sessionStorage first (set by test page on completion)
      const stored = sessionStorage.getItem('bf_result')
      if (stored) {
        setProfile(JSON.parse(stored))
        setReady(true)
        return
      }

      // Fallback: fetch from Supabase
      if (!supabaseRef.current) supabaseRef.current = createClient()
      const supabase = supabaseRef.current
      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('leadership_profile, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

      if (!profileData?.onboarding_completed || !profileData.leadership_profile) {
        router.replace('/onboarding/test')
        return
      }

      setProfile(profileData.leadership_profile as LeaderProfile)
      setReady(true)
    }
    load()
  }, [router])

  if (!ready || !profile) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--mute)', opacity: 0.4 }} />
      </div>
    )
  }

  const { big_five, arquetipo, descripcion, mensaje_bienvenida, fortalezas, areas_crecimiento } = profile
  const pillarData = { O: big_five.O, C: big_five.C, E: big_five.E, A: big_five.A, ES: big_five.ES }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '80px 24px 120px',
    }}>
      <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* 1 — Eyebrow pill */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springNatural, delay: 0.0 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '5px 14px',
            borderRadius: 100,
            border: '1.5px solid #C0392B',
            marginBottom: 24,
          }}
        >
          <span style={{
            fontFamily: 'Satoshi, sans-serif',
            fontSize: 10,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#C0392B',
          }}>
            Tu Perfil de Líder
          </span>
        </m.div>

        {/* 2 — Archetype name */}
        <m.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springHeavy, delay: 0.3 }}
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            lineHeight: 1.1,
            color: 'var(--ink)',
            textAlign: 'center',
            marginBottom: 24,
            textWrap: 'balance',
          }}
        >
          {arquetipo}
        </m.h1>

        {/* 3 — Description */}
        <m.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springNatural, delay: 0.6 }}
          style={{
            fontFamily: 'Satoshi, sans-serif',
            fontSize: 18,
            lineHeight: 1.65,
            color: 'var(--ink-2)',
            textAlign: 'center',
            maxWidth: 520,
            marginBottom: 60,
            textWrap: 'pretty',
          }}
        >
          {descripcion}
        </m.p>

        {/* 4 — Pentagon SVG */}
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springHeavy, delay: 1.0 }}
          style={{ marginBottom: 52, width: '100%', maxWidth: 360 }}
        >
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            style={{ width: '100%', height: 'auto', overflow: 'visible' }}
          >
            {/* Grid lines center → vertex */}
            {PILLARS.map(p => {
              const angle = toRad(PILLAR_ANGLES[p.key])
              return (
                <line
                  key={p.key}
                  x1={CX}
                  y1={CY}
                  x2={CX + R * Math.cos(angle)}
                  y2={CY + R * Math.sin(angle)}
                  stroke="var(--line)"
                  strokeWidth={1}
                />
              )
            })}

            {/* Reference polygon — max 100% */}
            <polygon
              points={PILLARS.map(p => {
                const angle = toRad(PILLAR_ANGLES[p.key])
                return `${CX + R * Math.cos(angle)},${CY + R * Math.sin(angle)}`
              }).join(' ')}
              fill="none"
              stroke="var(--bg-2)"
              strokeWidth={1.5}
            />

            {/* 50% reference ring */}
            <polygon
              points={PILLARS.map(p => {
                const angle = toRad(PILLAR_ANGLES[p.key])
                return `${CX + R * 0.5 * Math.cos(angle)},${CY + R * 0.5 * Math.sin(angle)}`
              }).join(' ')}
              fill="none"
              stroke="var(--line)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />

            {/* Profile polygon — animated */}
            <m.path
              d={pentagonPath(pillarData)}
              fill="rgba(192,57,43,0.10)"
              stroke="#C0392B"
              strokeWidth={2}
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ...springHeavy, delay: 1.0 }}
            />

            {/* Vertex dots */}
            {PILLARS.map(p => {
              const angle = toRad(PILLAR_ANGLES[p.key])
              const score = pillarData[p.dim] ?? 50
              const r = (score / 100) * R
              const isStrength = fortalezas.includes(p.key)
              const isGrowth = areas_crecimiento.includes(p.key)
              return (
                <m.circle
                  key={p.key}
                  cx={CX + r * Math.cos(angle)}
                  cy={CY + r * Math.sin(angle)}
                  r={5}
                  fill={isStrength ? 'var(--accent-teal, #0F7B6C)' : isGrowth ? '#C0392B' : 'var(--mute)'}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springSnappy, delay: 1.8 + PILLARS.indexOf(p) * 0.06 }}
                />
              )
            })}

            {/* Vertex labels */}
            {PILLARS.map(p => {
              const pos = labelPos(p.key)
              const score = pillarData[p.dim] ?? 50
              const isTop = PILLAR_ANGLES[p.key] === -90
              const isBottom = PILLAR_ANGLES[p.key] > 50 && PILLAR_ANGLES[p.key] < 130
              return (
                <g key={p.key}>
                  <text
                    x={pos.x}
                    y={pos.y + (isTop ? -6 : isBottom ? 6 : 0)}
                    textAnchor="middle"
                    dominantBaseline={isTop ? 'auto' : 'middle'}
                    style={{
                      fontFamily: 'Satoshi, sans-serif',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fill: 'var(--ink)',
                    }}
                  >
                    {p.key}
                  </text>
                  <text
                    x={pos.x}
                    y={pos.y + (isTop ? 10 : isBottom ? 20 : 14)}
                    textAnchor="middle"
                    style={{
                      fontFamily: 'Satoshi, sans-serif',
                      fontSize: 10,
                      fill: 'var(--mute)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {score}%
                  </text>
                </g>
              )
            })}
          </svg>
        </m.div>

        {/* 5 — Strengths and growth areas */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springNatural, delay: 1.5 }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            width: '100%',
            marginBottom: 52,
          }}
        >
          {/* Fortalezas */}
          <div style={{
            padding: '24px 20px',
            borderRadius: 16,
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
          }}>
            <p style={{
              fontFamily: 'Satoshi, sans-serif',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--accent-teal, #0F7B6C)',
              marginBottom: 14,
              fontWeight: 700,
            }}>
              Tus Fortalezas
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {fortalezas.length > 0 ? fortalezas.map(f => (
                <span key={f} style={{
                  display: 'inline-block',
                  padding: '5px 12px',
                  borderRadius: 100,
                  background: 'rgba(15,123,108,0.10)',
                  border: '1px solid rgba(15,123,108,0.20)',
                  fontFamily: 'Satoshi, sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--accent-teal, #0F7B6C)',
                }}>
                  {f}
                </span>
              )) : (
                <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: 'var(--mute)' }}>
                  Equilibrado en todas las áreas
                </span>
              )}
            </div>
          </div>

          {/* Áreas de crecimiento */}
          <div style={{
            padding: '24px 20px',
            borderRadius: 16,
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
          }}>
            <p style={{
              fontFamily: 'Satoshi, sans-serif',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#C0392B',
              marginBottom: 14,
              fontWeight: 700,
            }}>
              A Desarrollar
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {areas_crecimiento.length > 0 ? areas_crecimiento.map(a => (
                <span key={a} style={{
                  display: 'inline-block',
                  padding: '5px 12px',
                  borderRadius: 100,
                  background: 'rgba(192,57,43,0.08)',
                  border: '1px solid rgba(192,57,43,0.18)',
                  fontFamily: 'Satoshi, sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#C0392B',
                }}>
                  {a}
                </span>
              )) : (
                <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: 'var(--mute)' }}>
                  Perfil muy balanceado
                </span>
              )}
            </div>
          </div>
        </m.div>

        {/* 6 — Welcome message */}
        <m.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springNatural, delay: 2.0 }}
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            lineHeight: 1.6,
            color: 'var(--mute)',
            textAlign: 'center',
            maxWidth: 480,
            marginBottom: 44,
            textWrap: 'pretty',
          }}
        >
          {mensaje_bienvenida}
        </m.p>

        {/* 7 — CTA */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springNatural, delay: 2.4 }}
        >
          <m.button
            onClick={() => router.push('/dashboard')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 32px',
              borderRadius: 100,
              background: '#C0392B',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Satoshi, sans-serif',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.01em',
            }}
          >
            Comenzar mi ruta
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
            }}>
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </m.button>
        </m.div>

        {/* Divider + detail cards */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.8 }}
          style={{
            width: '100%',
            marginTop: 64,
            paddingTop: 40,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <DetailCard
            label="Tu Fortaleza Principal"
            text={profile.fortaleza_principal}
            accent="var(--accent-teal, #0F7B6C)"
          />
          <DetailCard
            label="Tu Reto Principal"
            text={profile.reto_principal}
            accent="#C0392B"
          />
        </m.div>

      </div>
    </div>
  )
}

// ── Detail card ───────────────────────────────────────────────────────────────
function DetailCard({ label, text, accent }: { label: string; text: string; accent: string }) {
  return (
    <div style={{
      padding: '20px 24px',
      borderRadius: 14,
      background: 'var(--card-bg)',
      border: '1px solid var(--line)',
      borderLeft: `3px solid ${accent}`,
    }}>
      <p style={{
        fontFamily: 'Satoshi, sans-serif',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: accent,
        marginBottom: 8,
        fontWeight: 700,
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: 'Satoshi, sans-serif',
        fontSize: 15,
        lineHeight: 1.6,
        color: 'var(--ink)',
      }}>
        {text}
      </p>
    </div>
  )
}

// ── Spring for vertex dots (used inline) ──────────────────────────────────────
const springSnappy = { type: 'spring' as const, stiffness: 200, damping: 22 }
