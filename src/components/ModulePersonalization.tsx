'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/components/Toast'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Reflexion    { pregunta: string; placeholder: string }
interface AutoEvalItem { pregunta: string; escala: string }

interface PersonalizationData {
  intro:              string
  reflexiones:        Reflexion[]
  entregable_enfoque: string
  autoevaluacion:     AutoEvalItem[]
}

export interface ModulePersonalizationProps {
  moduleId:  string
  moduleName: string
  modulePilar: string
  leadershipProfile: {
    arquetipo:        string
    fortalezas:       string[]
    areasCrecimiento: string[]
    big_five:         { O: number; C: number; E: number; A: number; ES: number }
  } | null
  track:  'junior' | 'senior'
  userId: string
  /** 'intro' = only Section 1, 'main' = Sections 2-4 */
  variant?: 'intro' | 'main'
}

// ── Pillar → color ────────────────────────────────────────────────────────────
const PILAR_COLOR: Record<string, string> = {
  Norte:  'var(--accent-teal,#0F7B6C)',
  Acción: 'var(--accent-teal,#0F7B6C)',
  Yo:     '#C0392B',
  Vínculo:'#C0392B',
  Legado: 'var(--accent-amber,#D4821A)',
}

function pilarColor(pilar: string, fortalezas: string[]): string {
  return fortalezas.includes(pilar)
    ? 'var(--accent-teal,#0F7B6C)'
    : PILAR_COLOR[pilar] ?? '#C0392B'
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ w = '100%', h = 14, r = 6 }: { w?: string; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)',
      backgroundSize: '400% 100%', animation: 'mp-shimmer 1.4s ease infinite',
    }} />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ModulePersonalization({
  moduleId, moduleName, modulePilar, leadershipProfile,
  track, userId, variant = 'intro',
}: ModulePersonalizationProps) {
  const pref     = useReducedMotion()
  const t        = useTranslations('modulePersonalization')
  const sbRef    = useRef<ReturnType<typeof createClient> | null>(null)

  const [data,         setData]         = useState<PersonalizationData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [reflexiones,  setReflexiones]  = useState<string[]>(['', '', ''])
  const [entregable,   setEntregable]   = useState('')
  const [evalScores,   setEvalScores]   = useState<Record<number, number>>({})
  const [saving,       setSaving]       = useState(false)
  const [evalDone,     setEvalDone]     = useState(false)
  const [confetti,     setConfetti]     = useState(false)

  // Skip entirely if no profile
  if (!leadershipProfile) return null

  const { arquetipo, fortalezas } = leadershipProfile
  const color = pilarColor(modulePilar, fortalezas)
  const cacheKey = `pz-${moduleId}-${userId}`

  // ── Fetch personalization ─────────────────────────────────────────────────
  const fetchPersonalization = useCallback(async () => {
    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) { setData(JSON.parse(cached)); setLoading(false); return }
    } catch { /* ignore */ }

    try {
      const res = await fetch('/api/modules/personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId, moduleName, modulePilar,
          userId, arquetipo,
          fortalezas: leadershipProfile.fortalezas,
          areasCrecimiento: leadershipProfile.areasCrecimiento,
          track,
          bigFive: leadershipProfile.big_five,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const json = await res.json() as PersonalizationData
      setData(json)
      try { localStorage.setItem(cacheKey, JSON.stringify(json)) } catch { /* ignore */ }
    } catch {
      // fallback: silent fail — component simply won't render
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, userId])

  // ── Load saved reflections from localStorage ──────────────────────────────
  useEffect(() => {
    fetchPersonalization()
    try {
      setReflexiones([
        localStorage.getItem(`pz-ref-${moduleId}-0`) ?? '',
        localStorage.getItem(`pz-ref-${moduleId}-1`) ?? '',
        localStorage.getItem(`pz-ref-${moduleId}-2`) ?? '',
      ])
      setEntregable(localStorage.getItem(`pz-ent-${moduleId}`) ?? '')
    } catch { /* ignore */ }
  }, [fetchPersonalization, moduleId])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleReflexionChange(i: number, val: string) {
    setReflexiones(prev => { const next = [...prev]; next[i] = val; return next })
    try { localStorage.setItem(`pz-ref-${moduleId}-${i}`, val) } catch { /* ignore */ }
  }

  function handleEntregableChange(val: string) {
    setEntregable(val)
    try { localStorage.setItem(`pz-ent-${moduleId}`, val) } catch { /* ignore */ }
  }

  async function handleCompleteEval() {
    if (!data) return
    setSaving(true)
    try {
      if (!sbRef.current) sbRef.current = createClient()
      const sb = sbRef.current
      if (sb && userId) {
        await sb.from('module_personalizations').upsert({
          user_id:       userId,
          module_id:     moduleId,
          reflexiones:   reflexiones.map((r, i) => ({ pregunta: data.reflexiones[i]?.pregunta, respuesta: r })),
          entregable,
          autoevaluacion: evalScores,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,module_id' })
      }
      setEvalDone(true)
      setConfetti(true)
      showToast('success', 'Módulo completado ✓')
      setTimeout(() => setConfetti(false), 800)
    } catch {
      showToast('error', 'Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const allEvalAnswered = data?.autoevaluacion.every((_, i) => evalScores[i] !== undefined) ?? false
  const SCALE_LABELS = t.raw('scaleLabels') as string[]

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '16px 0' }}>
        <style>{`@keyframes mp-shimmer{0%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
        {variant === 'intro' ? (
          <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Sk w="50%" h={10} />
            <Sk w="100%" h={12} />
            <Sk w="90%" h={12} />
            <Sk w="70%" h={12} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Sk w="70%" h={12} />
                <Sk w="100%" h={60} r={8} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!data) return null

  // ── SECTION 1 — Intro ─────────────────────────────────────────────────────
  const introSection = (
    <m.div
      initial={pref ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
      style={{
        borderLeft: `3px solid ${color}`,
        paddingLeft: 14,
        marginBottom: 4,
      }}
    >
      <p style={{
        fontFamily: '"Satoshi",sans-serif',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color,
        marginBottom: 6,
      }}>
        {t('forProfile')} · {arquetipo.toUpperCase()}
      </p>
      <p style={{
        fontFamily: '"Instrument Serif",serif',
        fontStyle: 'italic',
        fontSize: 14,
        color: 'var(--ink-2,#2D2D2D)',
        lineHeight: 1.65,
      }}>
        {data.intro}
      </p>
    </m.div>
  )

  if (variant === 'intro') return (
    <>
      <style>{`@keyframes mp-shimmer{0%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
      {introSection}
    </>
  )

  // ── SECTIONS 2–4 ─────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`
        @keyframes mp-shimmer{0%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes mp-confetti{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(40px) rotate(180deg)}}
        .mp-ta{width:100%;padding:10px 12px;border:1px solid var(--card-border);border-radius:10px;background:var(--bg);color:var(--ink);font-family:"Satoshi",sans-serif;font-size:13px;line-height:1.55;resize:none;outline:none;min-height:80px;transition:border-color .2s;}
        .mp-ta:focus{border-color:#C0392B;}
        .mp-eyebrow{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);margin-bottom:12px;}
      `}</style>

      {/* ── Section 2 — Reflexiones ── */}
      <m.div
        initial={pref ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 14,
          padding: '18px 16px',
          marginBottom: 12,
        }}
      >
        <div className="mp-eyebrow">{t('reflectionsTitle')}</div>
        <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 12, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.5 }}>
          {t('reflectionsDesc', { arquetipo })}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.reflexiones.map((ref, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#C0392B', color: '#fff',
                  fontFamily: '"Satoshi",sans-serif', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  {i + 1}
                </div>
                <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>
                  {ref.pregunta}
                </p>
              </div>
              <textarea
                className="mp-ta"
                value={reflexiones[i] ?? ''}
                onChange={e => handleReflexionChange(i, e.target.value)}
                placeholder={ref.placeholder}
                rows={3}
                style={{ marginLeft: 28 }}
              />
            </div>
          ))}
        </div>
      </m.div>

      {/* ── Section 3 — Entregable ── */}
      <m.div
        initial={pref ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.05 }}
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '18px 16px',
          marginBottom: 12,
        }}
      >
        <div className="mp-eyebrow">{t('deliverableTitle')}</div>
        <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 13, color: 'var(--ink-2,#2D2D2D)', lineHeight: 1.55, marginBottom: 12 }}>
          {data.entregable_enfoque}
        </p>
        <div style={{ height: 1, background: 'var(--line)', marginBottom: 12 }} />
        <textarea
          className="mp-ta"
          value={entregable}
          onChange={e => handleEntregableChange(e.target.value)}
          placeholder={t('deliverablePlaceholder')}
          rows={5}
          style={{ background: 'var(--card-bg)' }}
        />
        <m.button
          onClick={() => { if (entregable.trim()) showToast('success', 'Entregable guardado ✓') }}
          whileHover={pref ? undefined : { scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          style={{
            marginTop: 10, padding: '9px 20px',
            background: '#C0392B', border: 'none',
            borderRadius: 999,
            fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13,
            color: '#fff', cursor: 'pointer',
            opacity: entregable.trim() ? 1 : 0.5,
          }}
        >
          {t('saveDeliverable')}
        </m.button>
      </m.div>

      {/* ── Section 4 — Autoevaluación ── */}
      <m.div
        initial={pref ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.1 }}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 14,
          padding: '18px 16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Mini confetti burst */}
        {confetti && Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 6, height: 6,
              borderRadius: 2,
              background: ['#C0392B','#D4821A','#0F7B6C','#2980B9'][i % 4],
              top: '20%',
              left: `${10 + i * 11}%`,
              animation: `mp-confetti 0.8s ease-out ${i * 0.06}s both`,
              pointerEvents: 'none',
            }}
          />
        ))}

        <div className="mp-eyebrow">{t('selfEvalTitle')}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
          {data.autoevaluacion.map((item, i) => (
            <div key={i}>
              <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.4 }}>
                {item.pregunta}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SCALE_LABELS.map((label, v) => (
                  <m.button
                    key={v}
                    onClick={() => setEvalScores(prev => ({ ...prev, [i]: v + 1 }))}
                    whileTap={pref ? undefined : { scale: 0.97 }}
                    animate={{ scale: evalScores[i] === v + 1 ? 1.04 : 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    style={{
                      padding: '6px 11px',
                      borderRadius: 999,
                      border: 'none',
                      fontFamily: '"Satoshi",sans-serif',
                      fontSize: 11,
                      fontWeight: evalScores[i] === v + 1 ? 700 : 500,
                      cursor: 'pointer',
                      background: evalScores[i] === v + 1 ? '#C0392B' : 'var(--bg-2)',
                      color:      evalScores[i] === v + 1 ? '#fff'     : 'var(--mute)',
                      transition: 'background .15s, color .15s',
                    }}
                  >
                    {label}
                  </m.button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {evalDone ? (
          <div style={{
            padding: '10px 14px', background: 'rgba(15,123,108,.1)',
            borderRadius: 10, fontFamily: '"Satoshi",sans-serif',
            fontSize: 13, fontWeight: 700, color: 'var(--accent-teal,#0F7B6C)',
          }}>
            {t('selfEvalDone')}
          </div>
        ) : (
          <m.button
            onClick={handleCompleteEval}
            disabled={!allEvalAnswered || saving}
            whileHover={allEvalAnswered && !saving ? { scale: 1.01 } : undefined}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            style={{
              width: '100%', padding: '11px',
              background: allEvalAnswered ? '#C0392B' : 'var(--bg-2)',
              border: 'none', borderRadius: 999,
              fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13,
              color: allEvalAnswered ? '#fff' : 'var(--mute)',
              cursor: allEvalAnswered ? 'pointer' : 'not-allowed',
              transition: 'background .2s, color .2s',
            }}
          >
            {saving ? t('saving') : t('selfEvalBtn')}
          </m.button>
        )}
      </m.div>
    </div>
  )
}
