'use client'
export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'

// ── Types ─────────────────────────────────────────────────────────────────────
interface TeamMember { nombre: string; rol: string }
interface Plan { id: string; texto: string; fecha: string; completado: boolean }

interface GVData {
  meta_nucleo: string
  creencias:   string
  paradigma:   string
  equipo:      TeamMember[]
  planes:      Plan[]
}

interface LeaderProfile {
  arquetipo:         string
  areas_crecimiento: string[]
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STEP_NAMES = ['meta', 'creencias', 'paradigma', 'equipo', 'planes'] as const
const TOTAL = 5

const EMPTY: GVData = { meta_nucleo: '', creencias: '', paradigma: '', equipo: [], planes: [] }

const MOCK_GV: GVData = {
  meta_nucleo: 'Crear un programa de mentoría entre estudiantes en los 8 colegios de La Guajira',
  creencias:   'Creo que el liderazgo nace en la comunidad, no en los libros',
  paradigma:   'Veo en cada joven el potencial de cambiar su entorno',
  equipo:      [{ nombre: 'Luis B.', rol: 'mi mentor' }, { nombre: 'Samuel', rol: 'me da feedback' }, { nombre: 'María', rol: 'ejecución' }],
  planes:      [
    { id: 'p1', texto: 'Hablar con el rector esta semana',                  fecha: '2026-06-07', completado: false },
    { id: 'p2', texto: 'Formar el primer grupo piloto en marzo',             fecha: '2026-07-01', completado: false },
    { id: 'p3', texto: 'Presentar resultados en el Día de Liderazgo',       fecha: '2026-05-16', completado: true  },
  ],
}

const genId = () => `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

// ── Adaptive titles ───────────────────────────────────────────────────────────
type WizardT = ReturnType<typeof useTranslations<'dashboard.greatVenture.wizard'>>

function getStep1Title(profile: LeaderProfile | null, t: WizardT): string {
  if (!profile) return t('step1.titleDefault')
  const a = profile.arquetipo.toLowerCase()
  if (a.includes('visionari')) return t('step1.titleVisionario')
  if (a.includes('constructor')) return t('step1.titleConstructor')
  if (a.includes('resilient')) return t('step1.titleResiliente')
  if (a.includes('conector')) return t('step1.titleConector')
  if (a.includes('estratega')) return t('step1.titleEstratega')
  return t('step1.titleDefault')
}

function getStep2Title(profile: LeaderProfile | null, t: WizardT): string {
  if (!profile) return t('step2.titleDefault')
  const crec = profile.areas_crecimiento[0]
  if (crec === 'Vínculo') return t('step2.titleVinculo')
  if (crec === 'Acción')  return t('step2.titleAccion')
  if (crec === 'Norte')   return t('step2.titleNorte')
  return t('step2.titleDefault')
}

function getStep4Title(profile: LeaderProfile | null, t: WizardT): string {
  if (!profile) return t('step4.titleDefault')
  const a = profile.arquetipo.toLowerCase()
  if (a.includes('visionari')) return t('step4.titleVisionario')
  if (a.includes('estratega'))  return t('step4.titleEstratega')
  return t('step4.titleDefault')
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GreatVenturePage() {
  const router      = useRouter()
  const t           = useTranslations('dashboard.greatVenture.wizard')
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [step,         setStep]         = useState(0)
  const [direction,    setDirection]    = useState<1 | -1>(1)
  const [data,         setData]         = useState<GVData>(EMPTY)
  const [profile,      setProfile]      = useState<LeaderProfile | null>(null)
  const [userId,       setUserId]       = useState('')
  const [saved,        setSaved]        = useState(false)
  const [loading,      setLoading]      = useState(true)

  // Dynamic input state for step 4 (team)
  const [teamNombre,   setTeamNombre]   = useState('')
  const [teamRol,      setTeamRol]      = useState('')
  // Dynamic input state for step 5 (plans)
  const [planTexto,    setPlanTexto]    = useState('')
  const [planFecha,    setPlanFecha]    = useState('')

  // ── Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      if (MOCK_MODE) {
        setData(MOCK_GV)
        setProfile({ arquetipo: 'Líder Visionaria', areas_crecimiento: ['Yo', 'Vínculo'] })
        setUserId(MOCK.currentUser.id)
        setLoading(false)
        return
      }
      if (!supabaseRef.current) supabaseRef.current = createClient()
      const sb = supabaseRef.current
      if (!sb) return

      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const [{ data: prof }, { data: gv }] = await Promise.all([
        sb.from('profiles').select('leadership_profile').eq('id', user.id).maybeSingle(),
        sb.from('great_ventures').select('*').eq('user_id', user.id).maybeSingle(),
      ])

      if (prof?.leadership_profile) setProfile(prof.leadership_profile as LeaderProfile)
      if (gv) {
        setData({
          meta_nucleo: gv.meta_nucleo ?? '',
          creencias:   gv.creencias ?? '',
          paradigma:   gv.paradigma ?? '',
          equipo:      (gv.equipo as TeamMember[]) ?? [],
          planes:      (gv.planes as Plan[]) ?? [],
        })
      }
      setLoading(false)
    }
    boot()
  }, [router])

  // ── Auto-save ────────────────────────────────────────────────────────────
  const scheduleSave = useCallback((d: GVData) => {
    if (MOCK_MODE || !userId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!supabaseRef.current) supabaseRef.current = createClient()
      const sb = supabaseRef.current
      if (!sb) return
      await sb.from('great_ventures').upsert(
        { user_id: userId, ...d, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    }, 800)
  }, [userId])

  function updateData(partial: Partial<GVData>) {
    setData(prev => {
      const next = { ...prev, ...partial }
      scheduleSave(next)
      return next
    })
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  function next() {
    if (step < TOTAL - 1) { setDirection(1); setStep(s => s + 1) }
    else router.push('/dashboard/great-venture/mapa')
  }
  function prev() {
    if (step > 0) { setDirection(-1); setStep(s => s - 1) }
  }

  // ── Team helpers ─────────────────────────────────────────────────────────
  function addTeam() {
    if (!teamNombre.trim() || data.equipo.length >= 5) return
    updateData({ equipo: [...data.equipo, { nombre: teamNombre.trim(), rol: teamRol.trim() }] })
    setTeamNombre(''); setTeamRol('')
  }
  function removeTeam(i: number) {
    updateData({ equipo: data.equipo.filter((_, idx) => idx !== i) })
  }

  // ── Plan helpers ─────────────────────────────────────────────────────────
  function addPlan() {
    if (!planTexto.trim() || data.planes.length >= 5) return
    updateData({ planes: [...data.planes, { id: genId(), texto: planTexto.trim(), fecha: planFecha, completado: false }] })
    setPlanTexto(''); setPlanFecha('')
  }
  function removePlan(id: string) {
    updateData({ planes: data.planes.filter(p => p.id !== id) })
  }
  function togglePlan(id: string) {
    updateData({ planes: data.planes.map(p => p.id === id ? { ...p, completado: !p.completado } : p) })
  }

  const wordCount = data.meta_nucleo.trim() ? data.meta_nucleo.trim().split(/\s+/).filter(Boolean).length : 0

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: '#C0392B', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', overflow: 'auto' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .gv-wrap{min-height:100dvh;display:flex;flex-direction:column;align-items:center;}
        .gv-header{width:100%;max-width:760px;padding:32px 24px 0;}
        .gv-brand{font-family:"Satoshi",sans-serif;font-weight:700;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#C0392B;margin-bottom:24px;}
        .gv-segs{display:flex;gap:6px;margin-bottom:10px;}
        .gv-seg{flex:1;height:3px;border-radius:3px;transition:background .4s cubic-bezier(0.22,1,0.36,1);}
        .gv-names{display:flex;gap:0;margin-bottom:40px;}
        .gv-sname{flex:1;font-family:"Satoshi",sans-serif;font-size:10px;color:var(--mute);letter-spacing:.05em;text-align:center;transition:color .3s;}
        .gv-sname.active{color:var(--ink);font-weight:700;}
        .gv-body{width:100%;max-width:680px;padding:0 24px;flex:1;position:relative;}
        .gv-step{width:100%;}
        .gv-eyebrow{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#C0392B;margin-bottom:16px;}
        .gv-q{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(1.2rem,3vw,1.75rem);color:var(--ink);line-height:1.3;text-wrap:balance;margin-bottom:12px;}
        .gv-sub{font-family:"Satoshi",sans-serif;font-size:15px;color:var(--mute);line-height:1.65;margin-bottom:28px;}
        .gv-ta{width:100%;min-height:160px;padding:16px 18px;background:var(--card-bg);border:1.5px solid var(--line);border-radius:14px;font-family:"Satoshi",sans-serif;font-size:16px;color:var(--ink);line-height:1.7;resize:vertical;outline:none;transition:border-color .2s;}
        .gv-ta:focus{border-color:rgba(192,57,43,.5);}
        .gv-wc{display:flex;align-items:center;gap:10px;margin-top:8px;}
        .gv-wc-bar{flex:1;height:3px;background:var(--line);border-radius:3px;overflow:hidden;}
        .gv-wc-fill{height:100%;border-radius:3px;transition:width .3s;}
        .gv-wc-txt{font-family:"Satoshi",sans-serif;font-size:11px;color:var(--mute);white-space:nowrap;font-variant-numeric:tabular-nums;}
        .gv-input{width:100%;padding:11px 14px;background:var(--card-bg);border:1.5px solid var(--line);border-radius:10px;font-family:"Satoshi",sans-serif;font-size:14px;color:var(--ink);outline:none;transition:border-color .2s;}
        .gv-input:focus{border-color:rgba(192,57,43,.5);}
        .gv-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
        .gv-add{padding:9px 16px;background:#C0392B;border:none;border-radius:9px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s;flex-shrink:0;}
        .gv-add:hover{background:#a93226;}
        .gv-add:disabled{opacity:.4;cursor:not-allowed;}
        .gv-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
        .gv-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px 6px 12px;background:var(--bg-2);border:1px solid var(--line);border-radius:999px;font-family:"Satoshi",sans-serif;font-size:13px;color:var(--ink);}
        .gv-chip-x{background:none;border:none;cursor:pointer;color:var(--mute);font-size:14px;line-height:1;padding:1px;transition:color .15s;}
        .gv-chip-x:hover{color:#C0392B;}
        .gv-plan-list{display:flex;flex-direction:column;gap:8px;margin-top:12px;}
        .gv-plan-card{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--card-bg);border:1px solid var(--line);border-radius:12px;}
        .gv-plan-check{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;margin-top:1px;transition:background .15s,border-color .15s;}
        .gv-plan-check.done{background:#22c55e;border-color:#22c55e;}
        .gv-plan-body{flex:1;min-width:0;}
        .gv-plan-txt{font-family:"Satoshi",sans-serif;font-size:14px;color:var(--ink);line-height:1.4;}
        .gv-plan-txt.done{text-decoration:line-through;color:var(--mute);}
        .gv-plan-date{font-family:"Satoshi",sans-serif;font-size:11px;color:var(--mute);margin-top:2px;}
        .gv-plan-x{background:none;border:none;cursor:pointer;color:var(--mute);font-size:14px;padding:2px;transition:color .15s;flex-shrink:0;}
        .gv-plan-x:hover{color:#C0392B;}
        .gv-nav{display:flex;align-items:center;justify-content:space-between;padding:32px 24px 40px;width:100%;max-width:680px;}
        .gv-btn-prev{padding:11px 22px;background:none;border:1px solid var(--line);border-radius:999px;font-family:"Satoshi",sans-serif;font-size:13px;font-weight:600;color:var(--mute);cursor:pointer;transition:border-color .2s,color .2s;}
        .gv-btn-prev:hover{border-color:var(--ink);color:var(--ink);}
        .gv-btn-next{padding:11px 26px;background:#C0392B;border:none;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:13px;font-weight:700;color:#fff;cursor:pointer;transition:background .2s;}
        .gv-btn-next:hover{background:#a93226;}
        .gv-saved{position:fixed;top:20px;right:24px;display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--card-bg);border:1px solid var(--line);border-radius:999px;font-family:"Satoshi",sans-serif;font-size:12px;color:var(--accent-teal,#0F7B6C);box-shadow:0 2px 8px rgba(13,13,13,.08);}
        .gv-close{position:fixed;top:20px;left:24px;background:none;border:none;cursor:pointer;color:var(--mute);font-family:"Satoshi",sans-serif;font-size:13px;font-weight:600;padding:6px 12px;transition:color .2s;}
        .gv-close:hover{color:var(--ink);}
        @media(max-width:600px){.gv-row2{grid-template-columns:1fr;}}
      `}</style>

      {/* Close / back to dashboard */}
      <button className="gv-close" onClick={() => router.push('/dashboard')}>{t('closeBtn')}</button>

      {/* Auto-save indicator */}
      <AnimatePresence>
        {saved && (
          <m.div
            key="saved"
            className="gv-saved"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('saved')}
          </m.div>
        )}
      </AnimatePresence>

      <div className="gv-wrap">
        {/* Header */}
        <div className="gv-header">
          <div className="gv-brand">THE GREAT VENTURE</div>

          {/* Progress segments */}
          <div className="gv-segs">
            {STEP_NAMES.map((_, i) => (
              <m.div
                key={i}
                className="gv-seg"
                animate={{
                  background: i < step
                    ? 'var(--accent-teal,#0F7B6C)'
                    : i === step
                      ? '#C0392B'
                      : 'var(--bg-2)',
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              />
            ))}
          </div>
          <div className="gv-names">
            {STEP_NAMES.map((name, i) => (
              <div key={i} className={`gv-sname${i === step ? ' active' : ''}`}>{t(`stepNames.${name}`)}</div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="gv-body">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <m.div
              key={step}
              className="gv-step"
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 40, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -40, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              {step === 0 && (
                <StepMeta
                  data={data}
                  profile={profile}
                  wordCount={wordCount}
                  onChange={v => updateData({ meta_nucleo: v })}
                />
              )}
              {step === 1 && (
                <StepCreencias
                  data={data}
                  profile={profile}
                  onChange={v => updateData({ creencias: v })}
                />
              )}
              {step === 2 && (
                <StepParadigma
                  data={data}
                  onChange={v => updateData({ paradigma: v })}
                />
              )}
              {step === 3 && (
                <StepEquipo
                  data={data}
                  profile={profile}
                  teamNombre={teamNombre}
                  teamRol={teamRol}
                  onNombre={setTeamNombre}
                  onRol={setTeamRol}
                  onAdd={addTeam}
                  onRemove={removeTeam}
                />
              )}
              {step === 4 && (
                <StepPlanes
                  data={data}
                  planTexto={planTexto}
                  planFecha={planFecha}
                  onTexto={setPlanTexto}
                  onFecha={setPlanFecha}
                  onAdd={addPlan}
                  onRemove={removePlan}
                  onToggle={togglePlan}
                />
              )}
            </m.div>
          </AnimatePresence>
        </div>

        {/* Nav */}
        <div className="gv-nav">
          <m.button
            className="gv-btn-prev"
            onClick={prev}
            style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
            whileHover={pref ? undefined : { scale: 1.02 }}
            whileTap={pref ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            {t('nav.previous')}
          </m.button>
          <m.button
            className="gv-btn-next"
            onClick={next}
            whileHover={pref ? undefined : { scale: 1.02 }}
            whileTap={pref ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            {step === TOTAL - 1 ? t('nav.viewMap') : t('nav.next')}
          </m.button>
        </div>
      </div>
    </div>
  )
}

// ── Step 1 — Meta Núcleo ──────────────────────────────────────────────────────
function StepMeta({ data, profile, wordCount, onChange }: {
  data: GVData; profile: LeaderProfile | null; wordCount: number; onChange: (v: string) => void
}) {
  const t = useTranslations('dashboard.greatVenture.wizard')
  const barPct = Math.min((wordCount / 150) * 100, 100)
  const barColor = wordCount < 20 ? '#D4821A' : wordCount > 150 ? '#C0392B' : '#0F7B6C'

  return (
    <>
      <div className="gv-eyebrow">{t('step1.eyebrow')}</div>
      <h2 className="gv-q">{getStep1Title(profile, t)}</h2>
      <p className="gv-sub">{t('step1.subtitle')}</p>
      <textarea
        className="gv-ta"
        value={data.meta_nucleo}
        onChange={e => onChange(e.target.value)}
        placeholder={t('step1.placeholder')}
        maxLength={1500}
      />
      <div className="gv-wc">
        <div className="gv-wc-bar">
          <div className="gv-wc-fill" style={{ width: `${barPct}%`, background: barColor }} />
        </div>
        <span className="gv-wc-txt" style={{ color: wordCount < 20 ? '#D4821A' : wordCount > 150 ? '#C0392B' : 'var(--mute)' }}>
          {t('step1.wordCount', { count: wordCount })}
        </span>
      </div>
    </>
  )
}

// ── Step 2 — Creencias ────────────────────────────────────────────────────────
function StepCreencias({ data, profile, onChange }: {
  data: GVData; profile: LeaderProfile | null; onChange: (v: string) => void
}) {
  const t = useTranslations('dashboard.greatVenture.wizard')
  return (
    <>
      <div className="gv-eyebrow">{t('step2.eyebrow')}</div>
      <h2 className="gv-q">{getStep2Title(profile, t)}</h2>
      <p className="gv-sub">{t('step2.subtitle')}</p>
      <textarea
        className="gv-ta"
        value={data.creencias}
        onChange={e => onChange(e.target.value)}
        placeholder={t('step2.placeholder')}
        maxLength={1500}
      />
    </>
  )
}

// ── Step 3 — Paradigma ────────────────────────────────────────────────────────
function StepParadigma({ data, onChange }: {
  data: GVData; onChange: (v: string) => void
}) {
  const t = useTranslations('dashboard.greatVenture.wizard')
  return (
    <>
      <div className="gv-eyebrow">{t('step3.eyebrow')}</div>
      <h2 className="gv-q">{t('step3.title')}</h2>
      <p className="gv-sub">{t('step3.subtitle')}</p>
      <textarea
        className="gv-ta"
        value={data.paradigma}
        onChange={e => onChange(e.target.value)}
        placeholder={t('step3.placeholder')}
        maxLength={1500}
      />
    </>
  )
}

// ── Step 4 — Equipo ───────────────────────────────────────────────────────────
function StepEquipo({ data, profile, teamNombre, teamRol, onNombre, onRol, onAdd, onRemove }: {
  data: GVData; profile: LeaderProfile | null
  teamNombre: string; teamRol: string
  onNombre: (v: string) => void; onRol: (v: string) => void
  onAdd: () => void; onRemove: (i: number) => void
}) {
  const t = useTranslations('dashboard.greatVenture.wizard')
  const canAdd = teamNombre.trim().length > 0 && data.equipo.length < 5

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); onAdd() }
  }

  return (
    <>
      <div className="gv-eyebrow">{t('step4.eyebrow')}</div>
      <h2 className="gv-q">{getStep4Title(profile, t)}</h2>
      <p className="gv-sub">{t('step4.subtitle')}</p>

      <div className="gv-row2">
        <input
          className="gv-input"
          placeholder={t('step4.namePlaceholder')}
          value={teamNombre}
          onChange={e => onNombre(e.target.value)}
          onKeyDown={handleKey}
          maxLength={50}
        />
        <input
          className="gv-input"
          placeholder={t('step4.rolePlaceholder')}
          value={teamRol}
          onChange={e => onRol(e.target.value)}
          onKeyDown={handleKey}
          maxLength={80}
        />
      </div>
      <button className="gv-add" onClick={onAdd} disabled={!canAdd}>
        {t('step4.addPersonBtn')}
      </button>
      {data.equipo.length >= 5 && (
        <p style={{ fontSize: 12, color: 'var(--mute)', marginTop: 8 }}>{t('step4.maxReached')}</p>
      )}

      <div className="gv-chips">
        <AnimatePresence>
          {data.equipo.map((mem, i) => (
            <m.div
              key={`${mem.nombre}-${i}`}
              className="gv-chip"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              <span style={{ fontWeight: 700 }}>{mem.nombre}</span>
              {mem.rol && <span style={{ color: 'var(--mute)', fontSize: 12 }}>— {mem.rol}</span>}
              <button className="gv-chip-x" onClick={() => onRemove(i)} aria-label={t('step4.removeAria', { name: mem.nombre })}>×</button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}

// ── Step 5 — Planes ───────────────────────────────────────────────────────────
function StepPlanes({ data, planTexto, planFecha, onTexto, onFecha, onAdd, onRemove, onToggle }: {
  data: GVData
  planTexto: string; planFecha: string
  onTexto: (v: string) => void; onFecha: (v: string) => void
  onAdd: () => void; onRemove: (id: string) => void; onToggle: (id: string) => void
}) {
  const t = useTranslations('dashboard.greatVenture.wizard')
  const canAdd = planTexto.trim().length > 0 && data.planes.length < 5

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); onAdd() }
  }

  return (
    <>
      <div className="gv-eyebrow">{t('step5.eyebrow')}</div>
      <h2 className="gv-q">{t('step5.title')}</h2>
      <p className="gv-sub">{t('step5.subtitle')}</p>

      <div className="gv-row2">
        <input
          className="gv-input"
          placeholder={t('step5.textPlaceholder')}
          value={planTexto}
          onChange={e => onTexto(e.target.value)}
          onKeyDown={handleKey}
          maxLength={120}
          style={{ gridColumn: 'span 1' }}
        />
        <input
          className="gv-input"
          type="date"
          value={planFecha}
          onChange={e => onFecha(e.target.value)}
        />
      </div>
      <button className="gv-add" onClick={onAdd} disabled={!canAdd}>
        {t('step5.addStepBtn')}
      </button>
      {data.planes.length >= 5 && (
        <p style={{ fontSize: 12, color: 'var(--mute)', marginTop: 8 }}>{t('step5.maxReached')}</p>
      )}

      <div className="gv-plan-list">
        <AnimatePresence>
          {data.planes.map(p => (
            <m.div
              key={p.id}
              className="gv-plan-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              <button
                className={`gv-plan-check${p.completado ? ' done' : ''}`}
                onClick={() => onToggle(p.id)}
                aria-label={p.completado ? t('step5.markIncompleteAria') : t('step5.markCompleteAria')}
              >
                {p.completado && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <div className="gv-plan-body">
                <div className={`gv-plan-txt${p.completado ? ' done' : ''}`}>{p.texto}</div>
                {p.fecha && (
                  <div className="gv-plan-date">
                    {new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
              <button className="gv-plan-x" onClick={() => onRemove(p.id)} aria-label={t('step5.removeStepAria')}>×</button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
