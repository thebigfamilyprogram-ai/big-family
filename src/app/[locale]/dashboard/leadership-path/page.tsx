'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import { PILLARS, type Pillar, getPillarScores } from '@/lib/bigFiveQuestions'
import AnimatedNumber from '@/components/AnimatedNumber'

interface Module {
  id: string
  title: string
  description: string
  xp_reward: number
  order_index: number
  duration_minutes: number | null
}

type NodeState = 'completed' | 'active' | 'locked'

interface PathNode {
  module: Module
  state: NodeState
}

interface AttemptData {
  count: number
  bestScore: number | null
  passed: boolean
}

interface LeaderProfile {
  arquetipo: string
  fortalezas: string[]
  areas_crecimiento: string[]
  big_five: { O: number; C: number; E: number; A: number; N: number; ES: number }
  meta_nucleo?: string
}

const MOCK_LEADER_PROFILE: LeaderProfile = {
  arquetipo: 'Líder Visionaria',
  fortalezas: ['Norte', 'Acción'],
  areas_crecimiento: ['Yo', 'Vínculo'],
  big_five: { O: 85, C: 42, E: 78, A: 38, N: 35, ES: 65 },
}

// Module → pilar, por order_index (mismo mapeo que dashboard/page.tsx, duplicado a propósito)
const MODULE_PILLAR: Record<number, Pillar> = {
  1: 'Yo', 2: 'Norte', 3: 'Vínculo', 4: 'Vínculo', 5: 'Acción', 6: 'Acción', 7: 'Legado',
}

// Pillar → sufijo de key i18n (ascii, las keys del JSON no llevan tilde/mayúscula)
const PILLAR_I18N_KEY: Record<Pillar, string> = {
  Yo: 'yo', Norte: 'norte', Vínculo: 'vinculo', Acción: 'accion', Legado: 'legado',
}

// Sello del Capstone — misma técnica que el diploma real (certificacion/[id]/page.tsx:
// arco SVG vía textPath + doble anillo concéntrico), id de path propio para no colisionar
// si ambas páginas llegaran a montarse juntas.
function CapstoneSeal({ color, label, locked }: { color: string; label: string; locked: boolean }) {
  return (
    <svg viewBox="0 0 100 100" width="76" height="76" aria-hidden="true" focusable="false" className="atlas-seal" style={{ opacity: locked ? 0.55 : 1 }}>
      <defs>
        <path id="lp-capstone-seal-arc" d="M 8 50 A 42 42 0 0 0 92 50" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="0.6" />
      <text fill={color} fontSize="6.8" fontFamily="Satoshi, sans-serif" fontWeight="700" letterSpacing="1.5">
        <textPath href="#lp-capstone-seal-arc" startOffset="50%" textAnchor="middle">{label}</textPath>
      </text>
      <path
        d="M50 36 L53.5 45.1 L63.3 45.7 L55.7 51.8 L58.2 61.3 L50 56 L41.8 61.3 L44.3 51.8 L36.7 45.7 L46.5 45.1Z"
        fill={color}
      />
    </svg>
  )
}

export default function LeadershipPathPage() {
  const router      = useRouter()
  const t           = useTranslations('dashboard.leadershipPathPage')
  const tModules    = useTranslations('dashboard.modules')
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()

  const [loading,       setLoading]       = useState(true)
  const [nodes,         setNodes]         = useState<PathNode[]>([])
  const [leaderProfile, setLeaderProfile] = useState<LeaderProfile | null>(null)
  const [totalXP,       setTotalXP]       = useState(0)
  const [attMap,        setAttMap]        = useState<Record<string, AttemptData>>({})
  const [qCountMap,     setQCountMap]     = useState<Record<string, number>>({})
  const [selected,      setSelected]      = useState<PathNode | null>(null)
  const [userProjects,  setUserProjects]  = useState<{ id: string; status: string }[]>([])
  const [diploma,       setDiploma]       = useState<{ projectId: string; resultado: string } | null>(null)
  const [userId,        setUserId]        = useState('mock-student')

  // Pilar expandido en el grid — reemplaza la vista "isla" anterior: en vez de navegar a
  // una pantalla aparte, la lista de módulos de ese pilar aparece inline debajo del grid.
  const [expandedPillar, setExpandedPillar] = useState<Pillar | null>(null)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    async function load() {
      if (MOCK_MODE) {
        const mockModules: Module[] = MOCK.modules
          .map(m => ({ id: m.id, title: m.title, description: '', xp_reward: m.xpReward, order_index: m.order, duration_minutes: null }))
          .sort((a, b) => a.order_index - b.order_index)
        const completedIds = new Set(['m1', 'm2', 'm3', 'm4', 'm5'])
        let foundActive = false
        const built: PathNode[] = mockModules.map(mod => {
          if (completedIds.has(mod.id)) return { module: mod, state: 'completed' as NodeState }
          if (!foundActive) { foundActive = true; return { module: mod, state: 'active' as NodeState } }
          return { module: mod, state: 'locked' as NodeState }
        })
        setNodes(built)
        setLeaderProfile(MOCK_LEADER_PROFILE)
        setTotalXP(MOCK.students[0]?.xp ?? 1840)
        setUserProjects([{ id: 'mock-project-1', status: 'approved' }])
        const activeMock = built.find(n => n.state === 'active')
        if (activeMock) {
          setAttMap({ [activeMock.module.id]: { count: 1, bestScore: 65, passed: false } })
          setQCountMap({ [activeMock.module.id]: 8 })
        }
        setLoading(false)
        return
      }

      const { data: { user: au } } = await supabase.auth.getUser()
      if (!au) { router.replace('/login'); return }
      setUserId(au.id)

      const [profileRes, modsRes, progRes, xpRes, projRes] = await Promise.all([
        supabase.from('profiles').select('display_name, leadership_profile').eq('id', au.id).maybeSingle(),
        supabase.from('modules').select('*').eq('status', 'published').order('order_index'),
        supabase.from('progress').select('module_id, completed').eq('user_id', au.id),
        supabase.from('xp_log').select('amount').eq('user_id', au.id),
        supabase.from('projects').select('id, status').eq('user_id', au.id),
      ])

      const mods = (modsRes.data ?? []) as Module[]
      const moduleIds = mods.map(m => m.id)

      const [attRes, qRes] = moduleIds.length
        ? await Promise.all([
            supabase.from('quiz_attempts').select('module_id, score, passed').eq('user_id', au.id).in('module_id', moduleIds),
            supabase.from('questions').select('module_id').in('module_id', moduleIds),
          ])
        : [{ data: [] as { module_id: string; score: number | null; passed: boolean }[] }, { data: [] as { module_id: string }[] }]

      const userProjectsData = projRes.data ?? []
      let diplomaInfo: { projectId: string; resultado: string } | null = null
      if (userProjectsData.length > 0) {
        const { data: evals } = await supabase
          .from('capstone_evaluations')
          .select('project_id, resultado')
          .in('project_id', userProjectsData.map((p: { id: string }) => p.id))
          .in('resultado', ['certificado', 'mencion_honor'])
          .limit(1).maybeSingle()
        if (evals) diplomaInfo = { projectId: evals.project_id, resultado: evals.resultado }
      }

      const completedIds = new Set(
        (progRes.data ?? []).filter((p: { completed: boolean | null }) => p.completed).map((p: { module_id: string }) => p.module_id)
      )
      const total_xp = (xpRes.data ?? []).reduce((s: number, r: { amount: number | null }) => s + (r.amount ?? 0), 0)

      const aMap: Record<string, AttemptData> = {}
      for (const r of attRes.data ?? []) {
        const e = aMap[r.module_id]
        if (!e) { aMap[r.module_id] = { count: 1, bestScore: r.score ?? null, passed: !!r.passed } }
        else {
          e.count++
          if (r.score != null && (e.bestScore === null || r.score > e.bestScore)) e.bestScore = r.score
          if (r.passed) e.passed = true
        }
      }
      const qMap: Record<string, number> = {}
      for (const r of qRes.data ?? []) qMap[r.module_id] = (qMap[r.module_id] ?? 0) + 1

      const sorted = [...mods].sort((a, b) => a.order_index - b.order_index)
      let foundActive = false
      const built: PathNode[] = sorted.map(mod => {
        if (completedIds.has(mod.id)) return { module: mod, state: 'completed' as NodeState }
        if (!foundActive) { foundActive = true; return { module: mod, state: 'active' as NodeState } }
        return { module: mod, state: 'locked' as NodeState }
      })

      setNodes(built)
      setTotalXP(total_xp)
      setAttMap(aMap)
      setQCountMap(qMap)
      setUserProjects(userProjectsData)
      setDiploma(diplomaInfo)
      if (profileRes.data?.leadership_profile) setLeaderProfile(profileRes.data.leadership_profile as LeaderProfile)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalModules   = nodes.length
  const completedCount = nodes.filter(n => n.state === 'completed').length
  const allModulesDone = totalModules > 0 && completedCount >= totalModules
  const capstoneLocked = !allModulesDone
  const capstoneState: 'bloqueado' | 'enviado' | 'evaluado' | 'en_progreso' =
    capstoneLocked                                              ? 'bloqueado'  :
    userProjects.some(p => p.status === 'pending')              ? 'enviado'    :
    diploma || userProjects.some(p => p.status === 'approved')  ? 'evaluado'   :
                                                                    'en_progreso'

  const pillarScores: Record<Pillar, number> = leaderProfile
    ? getPillarScores(leaderProfile.big_five)
    : { Yo: 0, Norte: 0, Vínculo: 0, Acción: 0, Legado: 0 }

  // Pilar dominante — sale del score real, nunca hardcodeado. La jerarquía visual (qué
  // panel es grande) se recalcula por estudiante; el label "fortaleza"/"área clave" sigue
  // viniendo de leaderProfile.fortalezas/areas_crecimiento, que es una fuente distinta y
  // puede no coincidir 1:1 con "el pilar de mayor score" si el perfil está desactualizado.
  const sortedPillars = useMemo(
    () => [...PILLARS].sort((a, b) => pillarScores[b] - pillarScores[a]),
    [pillarScores] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const dominantPillar = sortedPillars[0] ?? 'Yo'
  const secondaryPillars = sortedPillars.slice(1)

  function handleCapstoneClick() {
    if (capstoneState === 'bloqueado' || capstoneState === 'enviado') return
    if (capstoneState === 'en_progreso') router.push('/dashboard/projects/new')
    else router.push(diploma ? `/certificacion/${diploma.projectId}` : '/dashboard/projects')
  }

  const selAtt    = selected ? (attMap[selected.module.id] ?? { count: 0, bestScore: null, passed: false }) : null
  const selQCount = selected ? (qCountMap[selected.module.id] ?? 0) : 0
  const selPillar = selected ? MODULE_PILLAR[selected.module.order_index] : null

  const STATUS_LABEL: Record<NodeState, string> = {
    completed: t('statusCompleted'), active: t('statusActive'), locked: t('statusLocked'),
  }

  const sealColor = capstoneState === 'bloqueado' ? 'var(--mute)' : 'var(--accent)'

  return (
    <div
      className="atlas-page"
      style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}
    >
      <div className="atlas-grain" />
      <style>{`
        .atlas-page{position:relative;}
        .atlas-grain{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:0.03;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");}

        .atlas-header{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px;}
        .atlas-eyebrow{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);margin-bottom:10px;}
        .atlas-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(34px,5vw,52px);color:var(--ink);letter-spacing:-0.02em;line-height:1.05;}
        .atlas-subtitle{font-family:"Instrument Serif",serif;font-style:italic;font-size:clamp(18px,2vw,22px);color:var(--ink-2);margin-top:10px;max-width:560px;}
        .atlas-stats{font-family:"Satoshi",sans-serif;font-size:14px;color:var(--mute);font-variant-numeric:tabular-nums;white-space:nowrap;}
        .atlas-stats strong{color:var(--ink);font-weight:600;}

        .atlas-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(12,1fr);gap:20px;margin-top:32px;}

        .atlas-panel{text-align:left;background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;cursor:pointer;font-family:inherit;box-shadow:var(--shadow-card);transition:box-shadow .2s;display:flex;flex-direction:column;}
        .atlas-panel:hover{box-shadow:var(--shadow-raised);}
        .atlas-panel--dominant{grid-column:span 7;grid-row:span 2;padding:40px;justify-content:center;}
        .atlas-panel--small{padding:22px;justify-content:center;}
        .atlas-side{grid-column:span 5;grid-row:span 2;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-content:start;}
        .atlas-gv{grid-column:span 2;}

        .atlas-panel-name{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:var(--ink);display:block;}
        .atlas-panel--dominant .atlas-panel-name{font-size:clamp(40px,5vw,60px);line-height:1;margin-bottom:18px;}
        .atlas-panel--small .atlas-panel-name{font-size:19px;margin-bottom:10px;}
        .atlas-panel-name--accent{color:var(--accent);}

        .atlas-panel-score{font-family:"Satoshi",sans-serif;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums;display:block;}
        .atlas-panel--dominant .atlas-panel-score{font-size:38px;}
        .atlas-panel--small .atlas-panel-score{font-size:23px;}

        .atlas-panel-rule{height:1px;background:var(--line);margin:14px 0;}
        .atlas-panel--small .atlas-panel-rule{margin:8px 0;}

        .atlas-panel-status{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);display:block;}
        .atlas-panel-status--strength{color:var(--accent-teal);}
        .atlas-panel--small .atlas-panel-status{font-size:10px;}

        .atlas-panel-desc{font-size:15px;line-height:1.6;color:var(--ink-2);margin-top:14px;max-width:50ch;}
        .atlas-panel-meta{font-size:12px;color:var(--ink-2);margin-top:8px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

        .atlas-skeleton{background:linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%);background-size:400% 100%;animation:shimmer 1.4s ease infinite;cursor:default;}

        .atlas-expand{grid-column:span 12;background:var(--bg-2);border:1px solid var(--card-border);border-radius:16px;padding:8px;}
        .atlas-expand-row{display:flex;align-items:center;gap:16px;padding:14px 16px;border-radius:10px;cursor:pointer;transition:background .15s;}
        .atlas-expand-row:hover{background:var(--card-bg);}
        .atlas-expand-row + .atlas-expand-row{border-top:1px solid var(--line);}
        .atlas-expand-idx{font-family:"Satoshi",sans-serif;font-size:12px;font-weight:700;color:var(--mute);width:24px;flex-shrink:0;}
        .atlas-expand-title{flex:1;min-width:0;font-family:"Satoshi",sans-serif;font-weight:600;font-size:15px;color:var(--ink);}
        .atlas-expand-xp{font-size:12px;color:var(--accent);font-weight:600;flex-shrink:0;}
        .atlas-expand-status{font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;color:var(--mute);flex-shrink:0;width:90px;text-align:right;}

        /* Doble borde — misma técnica que .dp-card del diploma real (certificacion/[id]/page.tsx),
           dos pseudo-elementos en vez de un solo border, para que el anillo interior quede a
           menor opacity sin perder el grosor del exterior. */
        .atlas-capstone{position:relative;grid-column:span 12;background:var(--card-bg);border-radius:6px;padding:28px 32px;display:flex;align-items:center;gap:24px;cursor:pointer;min-height:110px;}
        .atlas-capstone::before{content:"";position:absolute;inset:0;border-radius:6px;border:2px solid var(--accent);pointer-events:none;}
        .atlas-capstone::after{content:"";position:absolute;inset:8px;border-radius:3px;border:1px solid rgba(192,57,43,0.25);pointer-events:none;}
        .atlas-capstone-body{flex:1;min-width:0;}
        .atlas-capstone-title{font-family:"Instrument Serif",serif;font-style:italic;font-size:24px;color:var(--ink);}
        .atlas-capstone-status{font-size:13px;color:var(--ink-2);margin-top:4px;}
        .atlas-capstone-cta{font-family:"Satoshi",sans-serif;font-weight:600;font-size:14px;color:var(--accent);white-space:nowrap;flex-shrink:0;}

        @media(max-width:768px){
          .atlas-grid{grid-template-columns:1fr;}
          .atlas-panel--dominant{grid-column:span 1;grid-row:auto;padding:28px;}
          .atlas-side{grid-column:span 1;grid-row:auto;}
          .atlas-expand{grid-column:span 1;}
          .atlas-capstone{grid-column:span 1;flex-wrap:wrap;}
        }
      `}</style>

      <header className="atlas-header">
        <div>
          <div className="atlas-eyebrow">{t('atlasEyebrow', { archetype: leaderProfile?.arquetipo ?? '—' })}</div>
          <h1 className="atlas-title">{t('pageTitle')}</h1>
          <p className="atlas-subtitle">{t('atlasSubtitle')}</p>
        </div>
        <div className="atlas-stats">
          <strong>{completedCount}</strong>/{totalModules} {t('zone1StatsModules')}
          <span style={{ margin: '0 8px' }}>·</span>
          <strong>{totalXP.toLocaleString('es-CO')}</strong> XP
        </div>
      </header>

      {loading ? (
        <div className="atlas-grid">
          <div className="atlas-panel atlas-panel--dominant atlas-skeleton" />
          <div className="atlas-side">
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="atlas-panel atlas-panel--small atlas-skeleton" />)}
          </div>
          <div className="atlas-capstone atlas-skeleton" />
        </div>
      ) : (
        <div className="atlas-grid">
          <m.button
            className="atlas-panel atlas-panel--dominant"
            initial={pref ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 170, damping: 21 }}
            whileHover={{ y: -2 }}
            onClick={() => setExpandedPillar(p => p === dominantPillar ? null : dominantPillar)}
          >
            <span className={`atlas-panel-name${leaderProfile?.fortalezas.includes(dominantPillar) ? ' atlas-panel-name--accent' : ''}`}>
              {dominantPillar}
            </span>
            <span className="atlas-panel-score"><AnimatedNumber value={pillarScores[dominantPillar]} suffix="%" /></span>
            <div className="atlas-panel-rule" />
            {leaderProfile?.fortalezas.includes(dominantPillar) && (
              <span className="atlas-panel-status atlas-panel-status--strength">{tModules('strengthBadge')}</span>
            )}
            {leaderProfile?.areas_crecimiento.includes(dominantPillar) && (
              <span className="atlas-panel-status">{tModules('growthBadge')}</span>
            )}
            <p className="atlas-panel-desc">{t(`pillarDescriptions.${PILLAR_I18N_KEY[dominantPillar]}`)}</p>
          </m.button>

          <div className="atlas-side">
            {secondaryPillars.map((pillar, i) => (
              <m.button
                key={pillar}
                className="atlas-panel atlas-panel--small"
                initial={pref ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 170, damping: 21, delay: (i + 1) * 0.05 }}
                whileHover={{ y: -2 }}
                onClick={() => setExpandedPillar(p => p === pillar ? null : pillar)}
              >
                <span className={`atlas-panel-name${leaderProfile?.fortalezas.includes(pillar) ? ' atlas-panel-name--accent' : ''}`}>{pillar}</span>
                <span className="atlas-panel-score">{pillarScores[pillar]}%</span>
                <div className="atlas-panel-rule" />
                {leaderProfile?.fortalezas.includes(pillar) && (
                  <span className="atlas-panel-status atlas-panel-status--strength">{tModules('strengthBadge')}</span>
                )}
                {leaderProfile?.areas_crecimiento.includes(pillar) && (
                  <span className="atlas-panel-status">{tModules('growthBadge')}</span>
                )}
              </m.button>
            ))}

            <m.button
              className="atlas-panel atlas-panel--small atlas-gv"
              initial={pref ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 170, damping: 21, delay: 0.25 }}
              whileHover={{ y: -2 }}
              onClick={() => router.push('/dashboard/great-venture')}
            >
              <span className="atlas-panel-name">{t('greatVentureTagline')}</span>
              {leaderProfile?.meta_nucleo && (
                <p className="atlas-panel-meta">{leaderProfile.meta_nucleo.slice(0, 80)}</p>
              )}
            </m.button>
          </div>

          <AnimatePresence>
            {expandedPillar && (
              <m.div
                className="atlas-expand"
                initial={pref ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              >
                {nodes.filter(n => MODULE_PILLAR[n.module.order_index] === expandedPillar).map(node => (
                  <div key={node.module.id} className="atlas-expand-row" onClick={() => setSelected(node)}>
                    <span className="atlas-expand-idx">{String(node.module.order_index).padStart(2, '0')}</span>
                    <span className="atlas-expand-title">{node.module.title}</span>
                    <span className="atlas-expand-xp">★ {node.module.xp_reward} XP</span>
                    <span className="atlas-expand-status">{STATUS_LABEL[node.state]}</span>
                  </div>
                ))}
              </m.div>
            )}
          </AnimatePresence>

          <m.div
            className="atlas-capstone"
            initial={pref ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: capstoneState === 'bloqueado' ? 0.65 : 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 170, damping: 21, delay: 0.3 }}
            onClick={handleCapstoneClick}
          >
            <CapstoneSeal color={sealColor} label={t('capstoneStrip.sealLabel')} locked={capstoneState === 'bloqueado'} />
            <div className="atlas-capstone-body">
              <div className="atlas-capstone-title">{t('capstoneStrip.title')}</div>
              <div className="atlas-capstone-status">
                {capstoneState === 'evaluado'
                  ? (diploma ? t('capstoneStrip.states.evaluadoCertificado') : t('capstoneStrip.states.evaluado'))
                  : t(`capstoneStrip.states.${capstoneState}`)}
              </div>
            </div>
            {capstoneState === 'en_progreso' && <span className="atlas-capstone-cta">{t('capstoneStrip.ctaContinue')}</span>}
            {capstoneState === 'evaluado' && (
              <span className="atlas-capstone-cta">{diploma ? t('capstoneStrip.ctaViewDiploma') : t('capstoneStrip.ctaView')}</span>
            )}
          </m.div>
        </div>
      )}

      {/* ── Panel lateral de detalle — preservado del diseño anterior ── */}
      <AnimatePresence>
        {selected && (
          <>
            <m.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 49 }}
              onClick={() => setSelected(null)}
            />
            <m.div
              key="panel"
              initial={{ opacity: 0, x: 320 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 320 }}
              transition={{ type: 'spring', stiffness: 200, damping: 28 }}
              style={{
                position: 'fixed', right: 0, top: 0, bottom: 0,
                width: 340,
                background: 'var(--card-bg)',
                borderLeft: '1px solid rgba(13,13,13,0.08)',
                boxShadow: '-20px 0 60px rgba(13,13,13,0.12)',
                padding: '32px 28px',
                zIndex: 50,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <button
                onClick={() => setSelected(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>

              {selPillar && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                  {selPillar}
                </div>
              )}

              <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 26, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 10 }}>
                {selected.module.title}
              </div>

              <div style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.65, marginBottom: 20 }}>
                {selected.module.description}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#C0392B', background: 'rgba(192,57,43,0.08)', padding: '5px 10px', borderRadius: 999 }}>
                  ⭐ {selected.module.xp_reward} XP
                </div>
                {selected.module.duration_minutes && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--mute)', background: 'var(--bg-2)', padding: '5px 10px', borderRadius: 999 }}>
                    {t('durationMinutes', { minutes: selected.module.duration_minutes })}
                  </div>
                )}
                {selQCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--mute)', background: 'var(--bg-2)', padding: '5px 10px', borderRadius: 999 }}>
                    {t('questionCount', { count: selQCount })}
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'rgba(13,13,13,0.08)', marginBottom: 18 }} />

              <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 10 }}>{t('whatYouWillLearn')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {(t.raw('learnBullets') as string[]).map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--mute)', lineHeight: 1.5 }}>
                    <span style={{ color: '#C0392B', flexShrink: 0 }}>✓</span>{b}
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: 'rgba(13,13,13,0.08)', marginBottom: 18 }} />

              {selAtt && (
                <div style={{ marginBottom: 20 }}>
                  {selAtt.count === 0 ? (
                    <div style={{ padding: '10px 14px', background: '#D1FAE5', borderRadius: 10, fontSize: 13, color: '#065F46', fontWeight: 600 }}>{t('attemptsAvailable')}</div>
                  ) : selAtt.count === 1 ? (
                    <div style={{ padding: '10px 14px', background: '#FFFBEB', borderRadius: 10, fontSize: 13, color: '#92400E', fontWeight: 600 }}>{t('attemptRemaining')}</div>
                  ) : (
                    <div style={{ padding: '10px 14px', background: '#FEE2E2', borderRadius: 10, fontSize: 13, color: '#991B1B', fontWeight: 600 }}>{t('noAttemptsLeft')}</div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 'auto' }}>
                {selected.state === 'completed' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#D1FAE5', borderRadius: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: '#065F46', fontWeight: 700 }}>{t('moduleCompleted')}</span>
                      {selAtt?.bestScore != null && (
                        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#065F46', fontWeight: 600 }}>{selAtt.bestScore}%</span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/modules/${selected.module.id}`)}
                      style={{ width: '100%', padding: '14px', background: 'transparent', border: '1.5px solid rgba(13,13,13,0.15)', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--ink)', cursor: 'pointer' }}
                    >
                      {t('reviewModule')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => router.push(`/dashboard/modules/${selected.module.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#a93226')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#C0392B')}
                    style={{ width: '100%', padding: '14px', background: '#C0392B', border: 'none', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: '#fff', cursor: 'pointer', transition: 'background .2s' }}
                  >
                    {t('startModule')}
                  </button>
                )}
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
