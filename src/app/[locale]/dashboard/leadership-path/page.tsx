'use client'

export const dynamic = 'force-dynamic'

import { memo, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import { PILLARS, type Pillar, getPillarScores } from '@/lib/bigFiveQuestions'

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

const PILLAR_POSITIONS: Record<Pillar, { top: number; left: number }> = {
  Yo:      { top: 15, left: 20 },
  Norte:   { top: 10, left: 55 },
  Vínculo: { top: 45, left: 10 },
  Acción:  { top: 40, left: 70 },
  Legado:  { top: 70, left: 40 },
}

const PILLAR_COLORS: Record<Pillar, { solid: string; soft: string }> = {
  Yo:      { solid: '#C0392B',                     soft: 'rgba(192,57,43,.12)' },
  Norte:   { solid: 'var(--accent-teal,#0F7B6C)',   soft: 'rgba(15,110,86,.12)' },
  Vínculo: { solid: 'var(--accent-amber,#D4821A)',  soft: 'rgba(212,130,26,.12)' },
  Acción:  { solid: 'var(--accent-purple,#534AB7)', soft: 'rgba(83,74,183,.12)' },
  Legado:  { solid: 'var(--accent-green,#639922)',  soft: 'rgba(99,153,34,.12)' },
}

const PILLAR_ICONS: Record<Pillar, string> = {
  Yo: '🧠', Norte: '🧭', Vínculo: '🤝', Acción: '⚡', Legado: '🌱',
}

// Pillar → sufijo de key i18n (ascii, las keys del JSON no llevan tilde/mayúscula)
const PILLAR_I18N_KEY: Record<Pillar, string> = {
  Yo: 'yo', Norte: 'norte', Vínculo: 'vinculo', Acción: 'accion', Legado: 'legado',
}

const CAPSTONE_POS = { top: 42, left: 42 }
const GREAT_VENTURE_POS = { top: 65, left: 62 }
const TOTAL_NODES = 9 // 7 módulos + Capstone + Great Venture

// Animación perpetua — vive en su propio componente memoizado, ver CLAUDE.md
const PulseRing = memo(function PulseRing({ color }: { color: string }) {
  return (
    <m.div
      style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `2px solid ${color}`, pointerEvents: 'none' }}
      animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
    />
  )
})

// Curva de conexión isla→hito — coordenadas porcentuales (viewBox 0 0 100 100),
// adaptado de WorldMapPublic.tsx's arcPath() a un espacio de coordenadas %.
function islandArcPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2
  const my = Math.min(a.y, b.y) - 8
  return `M ${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}`
}

export default function LeadershipPathPage() {
  const router      = useRouter()
  const t           = useTranslations('dashboard.leadershipPathPage')
  const tModules    = useTranslations('dashboard.modules')
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()

  const [view,         setView]         = useState<'map' | 'island'>('map')
  const [activeIsland, setActiveIsland] = useState<Pillar | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [nodes,         setNodes]         = useState<PathNode[]>([])
  const [leaderProfile, setLeaderProfile] = useState<LeaderProfile | null>(null)
  const [totalXP,       setTotalXP]       = useState(0)
  const [attMap,        setAttMap]        = useState<Record<string, AttemptData>>({})
  const [qCountMap,     setQCountMap]     = useState<Record<string, number>>({})
  const [selected,      setSelected]      = useState<PathNode | null>(null)
  const [userProjects,  setUserProjects]  = useState<{ id: string; status: string }[]>([])
  const [diploma,       setDiploma]       = useState<{ projectId: string; resultado: string } | null>(null)

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

  const island = activeIsland ?? 'Yo'

  const activeModuleIdx = nodes.findIndex(n => n.state === 'active')
  const fillIndex = activeModuleIdx !== -1 ? activeModuleIdx : (capstoneState === 'evaluado' ? 8 : 7)
  const fillPct   = (fillIndex / TOTAL_NODES) * 100
  const fillColor = activeModuleIdx !== -1
    ? PILLAR_COLORS[MODULE_PILLAR[nodes[activeModuleIdx].module.order_index]].solid
    : PILLAR_COLORS[island].solid

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

  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        .lp-eyebrow{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#C0392B;margin-bottom:8px;}
        .lp-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:28px;color:var(--ink);letter-spacing:-0.01em;}
        .lp-subtitle{font-size:13px;color:var(--mute);margin-top:6px;}
        .zone1-stats{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-top:14px;}
        .zone1-stat-num{font-family:"Satoshi",sans-serif;font-weight:600;font-size:16px;color:var(--ink);font-variant-numeric:tabular-nums;}
        .zone1-stat-label{font-size:11px;color:var(--mute);}
        .zone1-sep{color:var(--mute);}

        .lp-map-container{position:relative;width:100%;min-height:600px;overflow:hidden;background:var(--bg);}
        .lp-connectors{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
        .lp-island-btn{position:absolute;transform:translate(-50%,-50%);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;border:2px solid;background:none;font-family:"Satoshi",sans-serif;padding:8px;}
        .lp-island-name{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;}
        .lp-island-score{font-size:18px;font-weight:700;}
        .lp-badge{font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:999px;margin-top:2px;}
        .lp-badge.strength{background:rgba(15,123,108,.12);color:var(--accent-teal,#0F7B6C);}
        .lp-badge.growth{background:rgba(192,57,43,.1);color:#C0392B;}

        .lp-hub{position:absolute;transform:translate(-50%,-50%);border-radius:12px;background:var(--card-bg);border:2px solid var(--card-border);box-shadow:var(--shadow-raised);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;font-family:"Satoshi",sans-serif;}
        .lp-hub-capstone{width:96px;height:96px;font-size:10px;font-weight:700;text-transform:uppercase;}
        .lp-hub-gv{width:80px;height:80px;font-size:9px;font-weight:700;text-transform:uppercase;}
        .lp-hub-icon{font-size:22px;}

        .lp-skeleton-island{position:absolute;transform:translate(-50%,-50%);width:140px;height:140px;border-radius:50%;background:linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%);background-size:400% 100%;animation:shimmer 1.4s ease infinite;}

        .lp-back-btn{display:inline-flex;align-items:center;padding:8px 16px;border:1px solid var(--line);border-radius:999px;background:none;color:var(--mute);font-size:13px;cursor:pointer;font-family:"Satoshi",sans-serif;margin-bottom:20px;transition:border-color .2s,color .2s;}
        .lp-back-btn:hover{border-color:var(--ink);color:var(--ink);}

        .lp-zigzag{position:relative;max-width:560px;margin:0 auto;padding:40px 24px;width:100%;}
        .lp-zigzag-line-bg{position:absolute;left:50%;top:0;bottom:0;width:2px;background:var(--line);}
        .lp-zigzag-line-fill{position:absolute;left:50%;top:0;width:2px;transition:height 0.6s cubic-bezier(0.22,1,0.36,1);}
        .lp-node-row{position:relative;display:flex;align-items:center;margin-bottom:32px;}
        .lp-node-row:last-child{margin-bottom:0;}
        .lp-node-circle{width:56px;height:56px;border-radius:50%;flex-shrink:0;position:relative;z-index:1;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;}
        .lp-node-circle--milestone{border-radius:12px;width:64px;height:64px;font-size:24px;}
        .lp-node-info{margin:0 20px;flex:1;min-width:0;}
        .lp-node-title{font-family:"Satoshi",sans-serif;font-weight:600;font-size:16px;color:var(--ink);}
        .lp-node-xp{font-size:12px;font-weight:700;margin-top:4px;}
        .lp-node-status{font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-top:4px;font-weight:600;}
        .lp-node-cta{margin-top:8px;padding:8px 16px;border-radius:100px;border:none;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:"Satoshi",sans-serif;}
        .lp-node-done{margin-top:8px;display:inline-flex;font-size:11px;font-weight:700;color:#16a34a;}

        @media(max-width:768px){
          .lp-map-container{min-height:auto;overflow:visible;}
          .lp-connectors{display:none;}
          .lp-islands-wrap{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;justify-items:center;}
          .lp-island-btn{position:static!important;transform:none!important;width:100px!important;height:100px!important;top:auto!important;left:auto!important;}
          .lp-hubs-wrap{display:flex;gap:16px;justify-content:center;margin-top:24px;flex-wrap:wrap;}
          .lp-hub{position:static!important;transform:none!important;top:auto!important;left:auto!important;}
          .lp-node-row{flex-direction:row!important;}
          .lp-zigzag-line-bg,.lp-zigzag-line-fill{left:27px!important;}
        }
      `}</style>

      <AnimatePresence mode="wait">
        {view === 'map' ? (
          <m.div
            key="map"
            initial={pref ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <div style={{ marginBottom: 24 }}>
              <div className="lp-eyebrow">{t('mapEyebrow', { archetype: leaderProfile?.arquetipo ?? '—' })}</div>
              <h1 className="lp-title">{t('pageTitle')}</h1>
              <p className="lp-subtitle">{t('mapSubtitle')}</p>
              <div className="zone1-stats">
                <span><span className="zone1-stat-num">{completedCount}</span> <span className="zone1-stat-label">/ {totalModules} {t('zone1StatsModules')}</span></span>
                <span className="zone1-sep">·</span>
                <span><span className="zone1-stat-num">{totalXP.toLocaleString('es-CO')}</span> <span className="zone1-stat-label">XP</span></span>
              </div>
            </div>

            {loading ? (
              <div className="lp-map-container">
                {PILLARS.map(p => (
                  <div key={p} className="lp-skeleton-island" style={{ top: `${PILLAR_POSITIONS[p].top}%`, left: `${PILLAR_POSITIONS[p].left}%` }} />
                ))}
              </div>
            ) : (
              <div className="lp-map-container">
                <svg className="lp-connectors" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {PILLARS.map(p => {
                    const pos = PILLAR_POSITIONS[p]
                    return (
                      <path
                        key={p}
                        d={islandArcPath({ x: pos.left, y: pos.top }, { x: CAPSTONE_POS.left, y: CAPSTONE_POS.top })}
                        stroke="var(--line)" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.5} fill="none"
                      />
                    )
                  })}
                </svg>

                <div className="lp-islands-wrap">
                  {PILLARS.map((pillar, i) => {
                    const pos = PILLAR_POSITIONS[pillar]
                    const score = pillarScores[pillar]
                    const size = 120 + (score / 100) * 60
                    const isStrength = leaderProfile?.fortalezas.includes(pillar)
                    const isGrowth   = leaderProfile?.areas_crecimiento.includes(pillar)
                    return (
                      <m.button
                        key={pillar}
                        className="lp-island-btn"
                        style={{
                          top: `${pos.top}%`, left: `${pos.left}%`,
                          width: size, height: size,
                          background: PILLAR_COLORS[pillar].soft,
                          borderColor: PILLAR_COLORS[pillar].solid,
                        }}
                        initial={pref ? false : { scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.1 }}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setActiveIsland(pillar); setView('island') }}
                      >
                        <span style={{ fontSize: 24, lineHeight: 1 }}>{PILLAR_ICONS[pillar]}</span>
                        <span className="lp-island-name" style={{ color: PILLAR_COLORS[pillar].solid }}>{pillar}</span>
                        <span className="lp-island-score" style={{ color: PILLAR_COLORS[pillar].solid }}>{score}%</span>
                        {isStrength && <span className="lp-badge strength">{tModules('strengthBadge')}</span>}
                        {isGrowth && <span className="lp-badge growth">{tModules('growthBadge')}</span>}
                      </m.button>
                    )
                  })}
                </div>

                <div className="lp-hubs-wrap">
                  <button
                    className="lp-hub lp-hub-capstone"
                    style={{
                      borderColor: capstoneState === 'evaluado' ? '#C0392B' : 'var(--card-border)',
                      background: capstoneState === 'evaluado' ? 'rgba(192,57,43,0.06)' : 'var(--card-bg)',
                      opacity: capstoneState === 'bloqueado' ? 0.5 : 1,
                      top: `${CAPSTONE_POS.top}%`, left: `${CAPSTONE_POS.left}%`,
                    }}
                    onClick={handleCapstoneClick}
                  >
                    <span className="lp-hub-icon">🏆</span>
                    <span>CAPSTONE</span>
                  </button>
                  <button
                    className="lp-hub lp-hub-gv"
                    style={{ top: `${GREAT_VENTURE_POS.top}%`, left: `${GREAT_VENTURE_POS.left}%` }}
                    onClick={() => router.push('/dashboard/great-venture')}
                  >
                    <span className="lp-hub-icon">🗺️</span>
                    <span>GREAT VENTURE</span>
                  </button>
                </div>
              </div>
            )}
          </m.div>
        ) : (
          <m.div
            key="island"
            initial={pref ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <button className="lp-back-btn" onClick={() => { setView('map'); setActiveIsland(null) }}>
              ← {t('backToMap')}
            </button>

            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 32, color: PILLAR_COLORS[island].solid }}>{island}</h2>
              <div style={{ fontSize: 18, color: 'var(--mute)', marginTop: 4 }}>{pillarScores[island]}%</div>
              <p style={{ fontSize: 13, color: 'var(--mute)', marginTop: 8 }}>{t(`pillarDescriptions.${PILLAR_I18N_KEY[island]}`)}</p>
            </div>

            <div className="lp-zigzag">
              <div className="lp-zigzag-line-bg" />
              <div className="lp-zigzag-line-fill" style={{ height: `${fillPct}%`, background: fillColor }} />

              {nodes.map((node, idx) => {
                const pillarColor = PILLAR_COLORS[MODULE_PILLAR[node.module.order_index]].solid
                const circleBg = node.state === 'completed' ? pillarColor : node.state === 'locked' ? 'var(--bg-2)' : 'var(--card-bg)'
                const circleBorder = node.state === 'completed' ? `2px solid ${pillarColor}` : node.state === 'locked' ? '2px solid var(--line)' : `3px solid ${pillarColor}`
                const statusColor = node.state === 'completed' ? '#16a34a' : node.state === 'active' ? pillarColor : 'var(--mute)'
                return (
                  <m.div
                    key={node.module.id}
                    className="lp-node-row"
                    style={{ flexDirection: idx % 2 === 0 ? 'row' : 'row-reverse', cursor: node.state !== 'locked' ? 'pointer' : 'default' }}
                    initial={pref ? false : { opacity: 0, x: idx % 2 === 0 ? -16 : 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.07, type: 'spring', stiffness: 200, damping: 22 }}
                    onClick={node.state !== 'locked' ? () => setSelected(node) : undefined}
                  >
                    <div className="lp-node-circle" style={{ background: circleBg, border: circleBorder, color: node.state === 'active' ? pillarColor : '#fff' }}>
                      {node.state === 'completed' && <span style={{ fontSize: 20, color: '#fff' }}>✓</span>}
                      {node.state === 'active' && <>{String(node.module.order_index).padStart(2, '0')}<PulseRing color={pillarColor} /></>}
                      {node.state === 'locked' && <span style={{ fontSize: 16, color: 'var(--mute)' }}>🔒</span>}
                    </div>
                    <div className="lp-node-info">
                      <div className="lp-node-title">{String(node.module.order_index).padStart(2, '0')} — {node.module.title}</div>
                      <div className="lp-node-xp" style={{ color: pillarColor }}>★ {node.module.xp_reward} XP</div>
                      <div className="lp-node-status" style={{ color: statusColor }}>{STATUS_LABEL[node.state]}</div>
                      {node.state === 'active' && (
                        <button
                          className="lp-node-cta"
                          style={{ background: pillarColor }}
                          onClick={e => { e.stopPropagation(); router.push(`/dashboard/modules/${node.module.id}`) }}
                        >
                          {t('inlineStartBtn')}
                        </button>
                      )}
                      {node.state === 'completed' && <div className="lp-node-done">{t('completedBadge')}</div>}
                    </div>
                  </m.div>
                )
              })}

              {/* Hito — Capstone */}
              <m.div
                className="lp-node-row"
                style={{ flexDirection: nodes.length % 2 === 0 ? 'row' : 'row-reverse', cursor: 'pointer' }}
                initial={pref ? false : { opacity: 0, x: nodes.length % 2 === 0 ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: nodes.length * 0.07, type: 'spring', stiffness: 200, damping: 22 }}
                onClick={handleCapstoneClick}
              >
                <div
                  className="lp-node-circle lp-node-circle--milestone"
                  style={{
                    background: capstoneState === 'evaluado' ? 'rgba(192,57,43,0.06)' : 'var(--card-bg)',
                    border: capstoneState === 'evaluado' ? '2px solid #C0392B' : '2px solid var(--card-border)',
                    opacity: capstoneState === 'bloqueado' ? 0.5 : 1,
                  }}
                >
                  🏆
                </div>
                <div className="lp-node-info">
                  <div className="lp-node-title">Capstone</div>
                </div>
              </m.div>

              {/* Hito — Great Venture */}
              <m.div
                className="lp-node-row"
                style={{ flexDirection: (nodes.length + 1) % 2 === 0 ? 'row' : 'row-reverse', cursor: 'pointer' }}
                initial={pref ? false : { opacity: 0, x: (nodes.length + 1) % 2 === 0 ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (nodes.length + 1) * 0.07, type: 'spring', stiffness: 200, damping: 22 }}
                onClick={() => router.push('/dashboard/great-venture')}
              >
                <div className="lp-node-circle lp-node-circle--milestone" style={{ background: 'var(--card-bg)', border: '2px solid var(--card-border)' }}>
                  🗺️
                </div>
                <div className="lp-node-info">
                  <div className="lp-node-title">Great Venture</div>
                </div>
              </m.div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

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
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: PILLAR_COLORS[selPillar].solid, marginBottom: 8 }}>
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
