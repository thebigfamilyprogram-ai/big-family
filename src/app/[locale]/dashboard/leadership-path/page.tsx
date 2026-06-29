'use client'

export const dynamic = 'force-dynamic'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
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

// Triplete "R,G,B" por pilar — para componer rgba() dinámico en las 3 capas de
// profundidad de cada isla (sombra/gradiente/borde) vía la custom property --island-rgb.
const PILLAR_RGB: Record<Pillar, string> = {
  Yo: '192,57,43', Norte: '15,123,108', Vínculo: '212,130,26', Acción: '83,74,183', Legado: '99,153,34',
}

// Border-radius irregular por isla — forma orgánica, no círculo perfecto.
const PILLAR_SHAPE: Record<Pillar, string> = {
  Yo:      '60% 40% 55% 45% / 45% 55% 40% 60%',
  Norte:   '45% 55% 40% 60% / 60% 40% 55% 45%',
  Vínculo: '55% 45% 60% 40% / 40% 60% 45% 55%',
  Acción:  '40% 60% 45% 55% / 55% 45% 60% 40%',
  Legado:  '50% 50% 60% 40% / 40% 60% 50% 50%',
}

// Pillar → sufijo de key i18n (ascii, las keys del JSON no llevan tilde/mayúscula)
const PILLAR_I18N_KEY: Record<Pillar, string> = {
  Yo: 'yo', Norte: 'norte', Vínculo: 'vinculo', Acción: 'accion', Legado: 'legado',
}

const CAPSTONE_POS = { top: 42, left: 42 }
const GREAT_VENTURE_POS = { top: 65, left: 62 }

// Alto vertical por nodo del zigzag orgánico — mayor en mobile porque el texto pasa
// de ir al lado del círculo a ir debajo (columna), necesita más espacio.
const NODE_HEIGHT_DESKTOP = 110
const NODE_HEIGHT_MOBILE = 150
const NARROW_BREAKPOINT = 480

// Animaciones perpetuas — cada una vive en su propio componente memoizado, ver CLAUDE.md.
// Nodo activo: dos pulse rings concéntricos con delay escalonado.
const PulseRing1 = memo(function PulseRing1({ color }: { color: string }) {
  return (
    <m.div
      style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `2px solid ${color}`, pointerEvents: 'none' }}
      animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
    />
  )
})
const PulseRing2 = memo(function PulseRing2({ color }: { color: string }) {
  return (
    <m.div
      style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: `2px solid ${color}`, pointerEvents: 'none' }}
      animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
    />
  )
})
// Niebla pulsante sobre nodos bloqueados — "fog of war".
const FogPulse = memo(function FogPulse() {
  return (
    <m.div
      style={{
        position: 'absolute', top: '50%', left: '50%', width: 80, height: 80,
        marginTop: -40, marginLeft: -40, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, var(--bg) 0%, transparent 70%)',
      }}
      animate={{ opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
})
// Borde rotando en conic-gradient detrás de la card premium del Capstone (mapa + isla).
const CapstoneCardBorder = memo(function CapstoneCardBorder({ cardSize, radius, reduceMotion }: { cardSize: number; radius: number; reduceMotion: boolean }) {
  return (
    <m.div
      style={{
        position: 'absolute', top: -2, left: -2, width: cardSize + 4, height: cardSize + 4,
        borderRadius: radius + 2, zIndex: 0, pointerEvents: 'none',
        background: 'conic-gradient(from 0deg, rgba(192,57,43,0.8) 0%, rgba(212,130,26,0.6) 25%, rgba(15,123,108,0.6) 50%, rgba(83,74,183,0.6) 75%, rgba(192,57,43,0.8) 100%)',
      }}
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={reduceMotion ? undefined : { duration: 4, repeat: Infinity, ease: 'linear' }}
    />
  )
})
// Partículas convergentes hacia la card del Capstone — 2 por pilar (10 máx), coloreadas
// solo si ese pilar ya está completo; el resto en gris. Solo en la vista isla.
const CapstoneParticles = memo(function CapstoneParticles({ userId, pillarDone, pillarColors }: { userId: string; pillarDone: boolean[]; pillarColors: string[] }) {
  const particles = pillarDone.flatMap((done, pIdx) =>
    [0, 1].map(sub => ({ idx: pIdx * 2 + sub, color: done ? pillarColors[pIdx] : 'var(--line-strong)' }))
  )
  return (
    <>
      {particles.map(p => {
        const angle = seededRandom(userId, 500 + p.idx) * Math.PI * 2
        const startX = Math.cos(angle) * 180
        const startY = Math.sin(angle) * 180
        return (
          <m.div
            key={p.idx}
            style={{ position: 'absolute', top: '50%', left: '50%', width: 5, height: 5, borderRadius: '50%', background: p.color, pointerEvents: 'none' }}
            animate={{ x: [startX, startX * 0.6, startX * 0.3, 0], y: [startY, startY * 0.6, startY * 0.3, 0], opacity: [0.3, 0.6, 0.8, 0], scale: [1, 1.2, 0.8, 0] }}
            transition={{ duration: 3 + p.idx * 0.4, repeat: Infinity, delay: p.idx * 0.3, ease: 'easeInOut' }}
          />
        )
      })}
    </>
  )
})

// Curva de conexión isla→hito — coordenadas porcentuales (viewBox 0 0 100 100),
// adaptado de WorldMapPublic.tsx's arcPath() a un espacio de coordenadas %.
function islandArcPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2
  const my = Math.min(a.y, b.y) - 8
  return `M ${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}`
}

// Path orgánico del zigzag interior — único por estudiante (seed = userId), en píxeles
// reales (no %), cubre solo los módulos (los hitos finales se posicionan aparte como
// cards "destino", no forman parte de esta curva). Reemplaza el S simétrico genérico.
function seededRandom(seed: string, index: number): number {
  let hash = 0
  const str = seed + index.toString()
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return (Math.abs(hash) % 100) / 100
}

interface OrganicPoint { x: number; y: number }

function generateOrganicPoints(userId: string, nodeCount: number, containerWidth: number, nodeHeight: number): OrganicPoint[] {
  const centerX = containerWidth / 2
  const variance = 80
  return Array.from({ length: nodeCount }, (_, i) => ({
    x: centerX + (seededRandom(userId, i * 3) - 0.5) * variance * 2,
    y: i * nodeHeight + nodeHeight / 2,
  }))
}

// Control point único por estudiante para el tramo que termina en `segmentIdx` —
// ambos lados de la curva de ese tramo comparten esta misma x (un solo "brazo").
function organicControlX(userId: string, containerWidth: number, segmentIdx: number): number {
  const centerX = containerWidth / 2
  return centerX + (seededRandom(userId, segmentIdx * 3 + 1) - 0.5) * 120
}

// Path único (todos los puntos unidos) — usado como halo de fondo, muy tenue.
function generateOrganicPath(userId: string, nodeCount: number, containerWidth: number, nodeHeight: number): string {
  const points = generateOrganicPoints(userId, nodeCount, containerWidth, nodeHeight)
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const cpx = organicControlX(userId, containerWidth, i)
    d += ` C ${cpx} ${points[i - 1].y + nodeHeight * 0.4} ${cpx} ${points[i].y - nodeHeight * 0.6} ${points[i].x} ${points[i].y}`
  }
  return d
}

// Mismos tramos que generateOrganicPath pero como segmentos independientes — permite
// variar stroke-width por tramo (más fino al inicio del recorrido, más grueso al presente).
function generateOrganicSegments(userId: string, nodeCount: number, containerWidth: number, nodeHeight: number): string[] {
  const points = generateOrganicPoints(userId, nodeCount, containerWidth, nodeHeight)
  const segments: string[] = []
  for (let i = 1; i < points.length; i++) {
    const cpx = organicControlX(userId, containerWidth, i)
    segments.push(
      `M ${points[i - 1].x} ${points[i - 1].y} C ${cpx} ${points[i - 1].y + nodeHeight * 0.4} ${cpx} ${points[i].y - nodeHeight * 0.6} ${points[i].x} ${points[i].y}`
    )
  }
  return segments
}

// Confeti al completar todos los módulos — mismo truco (dot absoluto + keyframe CSS)
// que ya usa modules/[id]/quiz/page.tsx para celebrar fases, con los 5 colores de pilar.
function leadershipConfettiParticles(colors: string[]) {
  return Array.from({ length: 28 }, (_, i) => ({
    color: colors[i % colors.length],
    tx: `${Math.round(Math.random() * 220 - 110)}px`,
    rot: `${Math.round(Math.random() * 360)}deg`,
    delay: Math.random() * 0.4,
  }))
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

  // userId — seed del path orgánico (único por estudiante). 'mock-student' en MOCK_MODE.
  const [userId, setUserId] = useState('mock-student')

  // Ancho real del contenedor del zigzag, en px — el path orgánico necesita coordenadas
  // reales (no %), así que se mide del DOM en vez de usar un viewBox porcentual.
  const [containerWidth, setContainerWidth] = useState(560)
  const zigzagContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (view !== 'island') return
    function measure() {
      if (zigzagContainerRef.current) setContainerWidth(zigzagContainerRef.current.clientWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [view])

  const isNarrow = containerWidth < NARROW_BREAKPOINT
  const nodeHeight = isNarrow ? NODE_HEIGHT_MOBILE : NODE_HEIGHT_DESKTOP

  const organicPoints = useMemo(
    () => generateOrganicPoints(userId, nodes.length, containerWidth, nodeHeight),
    [userId, nodes.length, containerWidth, nodeHeight]
  )
  const organicSegments = useMemo(
    () => generateOrganicSegments(userId, nodes.length, containerWidth, nodeHeight),
    [userId, nodes.length, containerWidth, nodeHeight]
  )
  const organicHaloPath = useMemo(
    () => nodes.length > 0 ? generateOrganicPath(userId, nodes.length, containerWidth, nodeHeight) : '',
    [userId, nodes.length, containerWidth, nodeHeight]
  )

  // Gate de entrada para el count-up del score y la barra de progreso del header de isla.
  const [scoreReveal, setScoreReveal] = useState(false)
  useEffect(() => {
    setScoreReveal(false)
    if (view !== 'island') return
    const tm = setTimeout(() => setScoreReveal(true), 450)
    return () => clearTimeout(tm)
  }, [view, activeIsland])

  const [showConfetti,       setShowConfetti]       = useState(false)
  const [confettiParticles,  setConfettiParticles]  = useState<{ color: string; tx: string; rot: string; delay: number }[]>([])

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

  // Por pilar: ¿están sus módulos completos? — para colorear las CapstoneParticles.
  const pillarDoneList  = PILLARS.map(p => {
    const mods = nodes.filter(n => MODULE_PILLAR[n.module.order_index] === p)
    return mods.length > 0 && mods.every(n => n.state === 'completed')
  })
  const pillarColorList = PILLARS.map(p => PILLAR_COLORS[p].solid)
  const capstoneState: 'bloqueado' | 'enviado' | 'evaluado' | 'en_progreso' =
    capstoneLocked                                              ? 'bloqueado'  :
    userProjects.some(p => p.status === 'pending')              ? 'enviado'    :
    diploma || userProjects.some(p => p.status === 'approved')  ? 'evaluado'   :
                                                                    'en_progreso'

  // Confeti al entrar a la isla con los 7 módulos completos.
  useEffect(() => {
    if (view !== 'island' || !allModulesDone || pref) { setShowConfetti(false); return }
    setShowConfetti(false)
    const tm = setTimeout(() => {
      setConfettiParticles(leadershipConfettiParticles(PILLARS.map(p => PILLAR_COLORS[p].solid)))
      setShowConfetti(true)
    }, 1500)
    return () => clearTimeout(tm)
  }, [view, activeIsland, allModulesDone, pref])

  const pillarScores: Record<Pillar, number> = leaderProfile
    ? getPillarScores(leaderProfile.big_five)
    : { Yo: 0, Norte: 0, Vínculo: 0, Acción: 0, Legado: 0 }

  const island = activeIsland ?? 'Yo'
  const strengthList: Pillar[] = (leaderProfile?.fortalezas.length ? leaderProfile.fortalezas : [island]) as Pillar[]
  const gvPillar1 = strengthList[0]
  const gvPillar2 = strengthList[1] ?? strengthList[0]

  const activeModuleIdx = nodes.findIndex(n => n.state === 'active')
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
        .lp-eyebrow{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#C0392B;margin-bottom:8px;}
        .lp-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:36px;color:var(--ink);letter-spacing:-0.01em;}
        .lp-subtitle{font-family:"Instrument Serif",serif;font-style:italic;font-size:14px;color:var(--mute);margin-top:6px;}
        .zone1-stats{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-top:14px;}
        .zone1-stat-num{font-family:"Satoshi",sans-serif;font-weight:600;font-size:16px;color:var(--ink);font-variant-numeric:tabular-nums;}
        .zone1-stat-label{font-size:11px;color:var(--mute);}
        .zone1-sep{color:var(--mute);}

        .lp-map-container{position:relative;width:100%;min-height:720px;overflow:visible;background:var(--bg);padding-bottom:80px;}
        .lp-sea{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
        .lp-sea-ring{stroke:var(--line);stroke-width:.5px;fill:none;opacity:.3;}
        .lp-connectors{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
        .lp-connector-halo{stroke:var(--line);stroke-width:8px;opacity:.06;fill:none;}
        .lp-connector-path{stroke-width:2px;opacity:.3;fill:none;}

        /* Isla — forma orgánica (border-radius irregular vía --island-shape) con 4 capas:
           sombra de elevación, gradiente interno, borde con brillo, highlight inset. El
           color de pilar llega vía --island-rgb (inline, "R,G,B") para poder componer
           rgba() dinámico sin JS de tema — el contraste de modo oscuro se resuelve solo
           con [data-theme="dark"], igual que el resto del CSS. */
        .lp-island-btn{
          position:absolute;transform:translate(-50%,-50%);
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          cursor:pointer;background:none;font-family:"Satoshi",sans-serif;padding:8px;
          border-radius:var(--island-shape,50%);
          --op-grad-1:0.18;--op-grad-2:0.08;--op-grad-3:0.04;--op-border:0.35;
          --op-shadow-1:0.20;--op-shadow-2:0.15;--op-shadow-3:0.25;--shadow-blur-1:12px;
          background:radial-gradient(circle at 35% 35%, rgba(var(--island-rgb),var(--op-grad-1)) 0%, rgba(var(--island-rgb),var(--op-grad-2)) 60%, rgba(var(--island-rgb),var(--op-grad-3)) 100%);
          border:1.5px solid rgba(var(--island-rgb),var(--op-border));
          box-shadow:0 var(--shadow-blur-1) 40px rgba(var(--island-rgb),var(--op-shadow-1)), 0 4px 12px rgba(var(--island-rgb),var(--op-shadow-2)), 0 0 0 1px rgba(var(--island-rgb),var(--op-shadow-3)), inset 0 1px 0 rgba(255,255,255,0.4);
          transition:border-color .2s;
        }
        .lp-island-btn:hover{--shadow-blur-1:20px;}
        .lp-island-btn--active{--op-border:0.8;}
        [data-theme="dark"] .lp-island-btn{--op-grad-1:0.23;--op-grad-2:0.13;--op-grad-3:0.09;--op-border:0.55;}

        .lp-island-icon{font-size:28px;line-height:1;margin-bottom:8px;filter:drop-shadow(0 2px 4px rgba(var(--island-rgb),0.3));}
        .lp-island-name{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;font-size:15px;margin-bottom:4px;}
        .lp-island-score{font-family:"Satoshi",sans-serif;font-size:32px;font-weight:700;color:var(--ink);line-height:1;margin-bottom:6px;}
        .lp-badge{font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:100px;}
        .lp-badge.strength{background:rgba(15,123,108,.15);color:#0F7B6C;}
        .lp-badge.growth{background:rgba(192,57,43,.12);color:#C0392B;}
        [data-theme="dark"] .lp-badge.strength{background:rgba(15,123,108,.25);}
        [data-theme="dark"] .lp-badge.growth{background:rgba(192,57,43,.22);}

        .lp-hub{
          position:absolute;transform:translate(-50%,-50%);background:var(--card-bg);border:none;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          cursor:pointer;font-family:"Satoshi",sans-serif;
          box-shadow:0 8px 24px rgba(13,13,13,.12), 0 2px 6px rgba(13,13,13,.08), 0 0 0 1px rgba(13,13,13,.06);
        }
        [data-theme="dark"] .lp-hub{box-shadow:0 8px 24px rgba(0,0,0,.4), 0 2px 6px rgba(0,0,0,.3), 0 0 0 1px rgba(255,255,255,.08);}
        .lp-hub-icon{font-size:28px;}
        .lp-hub-label{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin-top:6px;}
        .lp-hub-gv{width:88px;height:88px;border-radius:14px;}
        .lp-hub-gv .lp-hub-label{font-size:9px;}
        /* Anchor invisible para la card premium del Capstone en el mapa — solo posiciona/clickea,
           el contenido visible es .capstone-card por dentro. */
        .lp-hub-anchor{position:absolute;transform:translate(-50%,-50%);background:none;border:none;cursor:pointer;padding:0;}

        .lp-skeleton-island{position:absolute;transform:translate(-50%,-50%);width:190px;height:190px;border-radius:50%;background:linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%);background-size:400% 100%;animation:shimmer 1.4s ease infinite;}

        .lp-back-btn{display:inline-flex;align-items:center;padding:8px 16px;border:1px solid var(--line);border-radius:999px;background:none;color:var(--mute);font-size:13px;cursor:pointer;font-family:"Satoshi",sans-serif;margin-bottom:20px;transition:border-color .2s,color .2s;}
        .lp-back-btn:hover{border-color:var(--ink);color:var(--ink);}

        /* Contenedor del zigzag — los nodos ahora son hijos position:absolute, posicionados
           con las coordenadas del path orgánico (generateOrganicPoints), no con flexbox. */
        .lp-zigzag{position:relative;max-width:560px;margin:0 auto;padding:40px 24px;width:100%;}
        .lp-node-circle{border-radius:50%;flex-shrink:0;position:relative;z-index:1;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;}
        /* Nodo completado — anillo exterior delgado en vez de banner flotante */
        .lp-node-circle--done{box-shadow:0 4px var(--node-shadow-blur,12px) rgba(var(--node-rgb),0.35);transition:box-shadow .2s;}
        .lp-node-circle--done:hover{--node-shadow-blur:18px;}
        .lp-node-ring{position:absolute;inset:-6px;border-radius:50%;border:1.5px solid;pointer-events:none;}
        .lp-node-info{flex:1;min-width:0;}
        .lp-node-module-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;}
        .lp-node-title{font-family:"Satoshi",sans-serif;font-weight:600;font-size:17px;color:var(--ink);margin-top:2px;}
        .lp-node-xp{font-size:12px;font-weight:700;margin-top:4px;}
        .lp-node-status{font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-top:4px;font-weight:600;}
        .lp-node-cta{margin-top:8px;padding:8px 16px;border-radius:100px;border:none;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:"Satoshi",sans-serif;}
        .lp-node-done{margin-top:8px;display:inline-flex;font-size:11px;font-weight:700;color:#16a34a;}

        /* Tooltip "SIGUIENTE" del nodo activo — siempre visible, al lado del nodo. */
        .lp-node-tooltip{position:absolute;top:50%;transform:translateY(-50%);background:var(--card-bg);border:1px solid;border-radius:10px;padding:10px 14px;box-shadow:0 4px 16px rgba(13,13,13,0.08);white-space:nowrap;z-index:4;}
        .lp-node-tooltip--right{left:calc(100% + 14px);}
        .lp-node-tooltip--left{right:calc(100% + 14px);}
        .lp-tooltip-eyebrow{display:block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;}
        .lp-tooltip-title{display:block;font-size:14px;font-weight:600;color:var(--ink);margin-top:2px;}
        .lp-tooltip-arrow{position:absolute;top:50%;width:8px;height:8px;transform:translateY(-50%) rotate(45deg);background:var(--card-bg);}
        .lp-tooltip-arrow--right{left:-4px;}
        .lp-tooltip-arrow--left{right:-4px;}

        /* Card premium del Capstone — usada en mapa (.capstone-card--sm) y en isla (tamaño base).
           overflow:hidden para que el glow radial interno respete las esquinas redondeadas;
           el borde conic-gradient (CapstoneCardBorder) y las partículas viven en el wrapper
           padre, position:relative, que sí permite overflow visible. */
        .capstone-card{
          position:relative;z-index:1;width:140px;height:140px;border-radius:20px;
          background:var(--card-bg);overflow:hidden;cursor:pointer;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          box-shadow:0 0 0 1px rgba(192,57,43,0.15), 0 8px 32px rgba(192,57,43,0.20), 0 24px 64px rgba(192,57,43,0.12), inset 0 1px 0 rgba(255,255,255,0.8);
        }
        [data-theme="dark"] .capstone-card{box-shadow:0 0 0 1px rgba(192,57,43,0.3), 0 8px 32px rgba(192,57,43,0.25), 0 24px 64px rgba(192,57,43,0.15), inset 0 1px 0 rgba(255,255,255,0.1);}
        .capstone-card-glow{position:absolute;inset:0;border-radius:20px;background:radial-gradient(circle at center, rgba(192,57,43,0.06) 0%, transparent 70%);pointer-events:none;}
        .capstone-card-eyebrow{position:relative;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--mute);margin-top:8px;}
        .capstone-card-title{position:relative;font-size:16px;font-family:"Instrument Serif",serif;font-style:italic;color:#C0392B;margin-top:2px;}
        .capstone-card-xp{position:relative;font-size:11px;color:var(--mute);margin-top:6px;}
        .capstone-card--sm{width:100px;height:100px;border-radius:16px;}
        .capstone-card--sm .capstone-card-eyebrow{margin-top:4px;}
        /* Hito Great Venture — hexágono via clip-path. */
        .lp-zznode-gv{
          width:88px;height:88px;flex-shrink:0;cursor:pointer;
          clip-path:polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          position:relative;z-index:1;
        }
        .lp-zznode-gv-label{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:4px;text-align:center;padding:0 8px;}

        /* Header de vista isla — tipografía editorial + score animado */
        .lp-island-headline{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;font-size:36px;}
        .lp-island-score-row{display:block;font-size:18px;font-weight:400;color:var(--mute);margin-top:4px;font-variant-numeric:tabular-nums;}
        .lp-score-bar-track{width:200px;height:2px;background:var(--line);border-radius:100px;margin-top:10px;overflow:hidden;}
        .lp-score-bar-fill{height:100%;border-radius:100px;transition:width 1.2s cubic-bezier(0.22,1,0.36,1);}

        /* Confeti al completar todos los módulos de la isla */
        @keyframes lpConfettiBurst{0%{transform:translate(0,0) rotate(0deg);opacity:1}100%{transform:translate(var(--tx),90px) rotate(var(--rot));opacity:0}}
        .lp-confetti-dot{position:absolute;top:0;left:50%;width:7px;height:7px;border-radius:2px;animation:lpConfettiBurst .9s ease-out forwards;pointer-events:none;}

        @media(max-width:768px){
          .lp-map-container{min-height:900px;overflow:visible;}
          .lp-connectors{display:none;}
          .lp-islands-wrap{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;justify-items:center;}
          .lp-island-btn{position:static!important;transform:none!important;width:100px!important;height:100px!important;top:auto!important;left:auto!important;}
          .lp-hubs-wrap{display:flex;gap:16px;justify-content:center;margin-top:24px;flex-wrap:wrap;}
          .lp-hub,.lp-hub-anchor{position:static!important;transform:none!important;top:auto!important;left:auto!important;}
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
                {/* "Mar" — curvas de nivel topográficas sutiles centradas en el Capstone */}
                <svg className="lp-sea" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {[10, 20, 30, 40].map(r => (
                    <ellipse key={r} className="lp-sea-ring" cx={CAPSTONE_POS.left} cy={CAPSTONE_POS.top} rx={r} ry={r} />
                  ))}
                </svg>

                <svg className="lp-connectors" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {PILLARS.map(p => {
                    const pos = PILLAR_POSITIONS[p]
                    const d = islandArcPath({ x: pos.left, y: pos.top }, { x: CAPSTONE_POS.left, y: CAPSTONE_POS.top })
                    return (
                      <g key={p}>
                        <path className="lp-connector-halo" d={d} />
                        <path className="lp-connector-path" d={d} stroke={`rgba(${PILLAR_RGB[p]},0.3)`} strokeDasharray="3 8" />
                      </g>
                    )
                  })}
                </svg>

                <div className="lp-islands-wrap">
                  {PILLARS.map((pillar, i) => {
                    const pos = PILLAR_POSITIONS[pillar]
                    const score = pillarScores[pillar]
                    const size = 160 + (score / 100) * 60
                    const isStrength = leaderProfile?.fortalezas.includes(pillar)
                    const isGrowth   = leaderProfile?.areas_crecimiento.includes(pillar)
                    const isActive   = activeIsland === pillar
                    return (
                      <m.button
                        key={pillar}
                        className={`lp-island-btn${isActive ? ' lp-island-btn--active' : ''}`}
                        style={{
                          top: `${pos.top}%`, left: `${pos.left}%`,
                          width: size, height: size,
                          '--island-rgb': PILLAR_RGB[pillar],
                          '--island-shape': PILLAR_SHAPE[pillar],
                        } as React.CSSProperties}
                        initial={pref ? false : { scale: 0, opacity: 0 }}
                        animate={{ scale: isActive ? 1.03 : 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.1 }}
                        whileHover={{ scale: 1.06, y: -4 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setActiveIsland(pillar); setView('island') }}
                      >
                        <span className="lp-island-icon">{PILLAR_ICONS[pillar]}</span>
                        <span className="lp-island-name" style={{ color: PILLAR_COLORS[pillar].solid }}>{pillar}</span>
                        <span className="lp-island-score">{score}%</span>
                        {isStrength && <span className="lp-badge strength">{tModules('strengthBadge')}</span>}
                        {isGrowth && <span className="lp-badge growth">{tModules('growthBadge')}</span>}
                      </m.button>
                    )
                  })}
                </div>

                <div className="lp-hubs-wrap">
                  <button
                    className="lp-hub-anchor"
                    style={{
                      top: `${CAPSTONE_POS.top}%`, left: `${CAPSTONE_POS.left}%`,
                      width: 104, height: 104,
                    }}
                    onClick={handleCapstoneClick}
                  >
                    <div style={{ position: 'relative', width: 100, height: 100 }}>
                      <CapstoneCardBorder cardSize={100} radius={16} reduceMotion={!!pref} />
                      <div
                        className="capstone-card capstone-card--sm"
                        style={{
                          background: capstoneState === 'evaluado' ? 'rgba(192,57,43,0.06)' : 'var(--card-bg)',
                          opacity: capstoneState === 'bloqueado' ? 0.5 : 1,
                        }}
                      >
                        <div className="capstone-card-glow" />
                        <span style={{ position: 'relative', fontSize: 24, filter: 'drop-shadow(0 2px 6px rgba(192,57,43,0.4))' }}>🏆</span>
                        <span className="capstone-card-eyebrow">CAPSTONE</span>
                      </div>
                    </div>
                  </button>
                  <button
                    className="lp-hub lp-hub-gv"
                    style={{ top: `${GREAT_VENTURE_POS.top}%`, left: `${GREAT_VENTURE_POS.left}%` }}
                    onClick={() => router.push('/dashboard/great-venture')}
                  >
                    <span className="lp-hub-icon">🗺️</span>
                    <span className="lp-hub-label">GREAT VENTURE</span>
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

            <m.div
              style={{ position: 'relative', marginBottom: 28 }}
              initial={pref ? false : { opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              <h2 className="lp-island-headline" style={{ color: PILLAR_COLORS[island].solid }}>{island}</h2>
              <div className="lp-island-score-row">
                {scoreReveal ? <AnimatedNumber value={pillarScores[island]} suffix="%" /> : '0%'}
              </div>
              <div className="lp-score-bar-track">
                <div className="lp-score-bar-fill" style={{ width: scoreReveal ? `${pillarScores[island]}%` : '0%', background: PILLAR_COLORS[island].solid }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--mute)', marginTop: 10 }}>{t(`pillarDescriptions.${PILLAR_I18N_KEY[island]}`)}</p>

              {showConfetti && confettiParticles.map((p, pi) => (
                <div
                  key={pi}
                  className="lp-confetti-dot"
                  style={{ background: p.color, '--tx': p.tx, '--rot': p.rot, animationDelay: `${p.delay}s` } as React.CSSProperties}
                />
              ))}
            </m.div>

            <div
              className="lp-zigzag"
              ref={zigzagContainerRef}
              style={{ minHeight: (nodes.length + 2) * nodeHeight + 40 }}
            >
              {containerWidth > 0 && nodes.length > 0 && (
                <svg width={containerWidth} height={nodes.length * nodeHeight} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                  <path d={organicHaloPath} stroke="var(--line)" strokeWidth={8} opacity={0.06} fill="none" />
                  {organicSegments.map((seg, i) => (
                    <path
                      key={i}
                      d={seg}
                      stroke={fillColor}
                      strokeWidth={1.5 + (i / Math.max(organicSegments.length - 1, 1)) * 1.5}
                      strokeLinecap="round"
                      fill="none"
                    />
                  ))}
                </svg>
              )}

              {nodes.map((node, idx) => {
                const modulePillar = MODULE_PILLAR[node.module.order_index]
                const pillarColor  = PILLAR_COLORS[modulePillar].solid
                const pillarRgb    = PILLAR_RGB[modulePillar]
                const circleBg     = node.state === 'completed' ? pillarColor : node.state === 'locked' ? 'var(--bg-2)' : 'var(--card-bg)'
                const circleBorder = node.state === 'completed' ? 'none' : node.state === 'locked' ? '1.5px solid var(--line)' : `3px solid ${pillarColor}`
                const statusColor  = node.state === 'completed' ? '#16a34a' : node.state === 'active' ? pillarColor : 'var(--mute)'
                const circleSize   = node.state === 'completed' ? 52 : node.state === 'active' ? 68 : 48
                const pt = organicPoints[idx] ?? { x: containerWidth / 2, y: idx * nodeHeight + nodeHeight / 2 }
                const onLeftSide = pt.x < containerWidth / 2
                const tooltipSide: 'left' | 'right' = onLeftSide ? 'right' : 'left'
                const infoOffset = circleSize / 2 + 14
                return (
                  // NOTA: el centrado (-50%,-50%) vive en wrappers planos (no motion), nunca
                  // junto a un x/y/scale animado por Framer Motion en el MISMO elemento —
                  // FM reescribe el `transform` completo a partir de sus propios valores
                  // animados y descarta cualquier transform estático puesto en el mismo nodo.
                  <div
                    key={node.module.id}
                    style={{ position: 'absolute', left: pt.x, top: pt.y, cursor: node.state !== 'locked' ? 'pointer' : 'default' }}
                    onClick={node.state !== 'locked' ? () => setSelected(node) : undefined}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: circleSize, height: circleSize, transform: 'translate(-50%,-50%)' }}>
                      <m.div
                        className={`lp-node-circle${node.state === 'completed' ? ' lp-node-circle--done' : ''}`}
                        style={{
                          width: '100%', height: '100%',
                          background: circleBg, border: circleBorder,
                          color: node.state === 'active' ? pillarColor : '#fff',
                          opacity: node.state === 'locked' ? 0.4 : 1,
                          filter: node.state === 'locked' ? 'blur(0.5px)' : 'none',
                          boxShadow: node.state === 'active' ? `0 0 0 6px rgba(${pillarRgb},0.12), 0 8px 24px rgba(${pillarRgb},0.25)` : undefined,
                          '--node-rgb': pillarRgb,
                        } as React.CSSProperties}
                        initial={pref ? false : { opacity: 0, x: onLeftSide ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.09, type: 'spring', stiffness: 180, damping: 20 }}
                        whileHover={node.state === 'completed' ? { scale: 1.08, y: -2 } : undefined}
                      >
                        {node.state === 'completed' && (
                          <>
                            <span className="lp-node-ring" style={{ borderColor: `rgba(${pillarRgb},0.3)` }} />
                            <span style={{ fontSize: 20, color: '#fff' }}>✓</span>
                          </>
                        )}
                        {node.state === 'active' && (
                          <>
                            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={pillarColor}/>
                              <circle cx="12" cy="9" r="2.5" fill="white"/>
                            </svg>
                            <PulseRing1 color={pillarColor} />
                            <PulseRing2 color={pillarColor} />
                            {!isNarrow && (
                              <div className={`lp-node-tooltip lp-node-tooltip--${tooltipSide}`} style={{ borderColor: `rgba(${pillarRgb},0.3)` }}>
                                <span className="lp-tooltip-eyebrow" style={{ color: pillarColor }}>{t('nextLabel')}</span>
                                <span className="lp-tooltip-title">{node.module.title}</span>
                                <span className={`lp-tooltip-arrow lp-tooltip-arrow--${tooltipSide}`} />
                              </div>
                            )}
                          </>
                        )}
                        {node.state === 'locked' && (
                          <>
                            <span style={{ fontSize: 14, color: 'var(--mute)' }}>🔒</span>
                            <FogPulse />
                          </>
                        )}
                      </m.div>
                    </div>
                    <div
                      style={
                        isNarrow
                          ? { position: 'absolute', top: circleSize / 2 + 14, left: 0, transform: 'translateX(-50%)', width: 220 }
                          : onLeftSide
                            ? { position: 'absolute', top: 0, left: infoOffset, transform: 'translateY(-50%)', width: 180 }
                            : { position: 'absolute', top: 0, right: infoOffset, transform: 'translateY(-50%)', width: 180 }
                      }
                    >
                      <m.div
                        className="lp-node-info"
                        style={{ textAlign: isNarrow ? 'center' : onLeftSide ? 'left' : 'right' }}
                        initial={pref ? false : { opacity: 0, x: onLeftSide ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.09, type: 'spring', stiffness: 180, damping: 20 }}
                      >
                        <div className="lp-node-module-label" style={{ color: pillarColor }}>
                          {String(node.module.order_index).padStart(2, '0')} · {t('moduleLabel')}
                        </div>
                        <div className="lp-node-title">{node.module.title}</div>
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
                      </m.div>
                    </div>
                  </div>
                )
              })}

              {/* Hito — Capstone, card premium con borde conic-gradient + partículas convergentes.
                  Wrapper plano para el centrado estático; el x/y animado va en un hijo sin transform propio. */}
              <div
                style={{ position: 'absolute', left: containerWidth / 2, top: nodes.length * nodeHeight + nodeHeight / 2, cursor: 'pointer' }}
                onClick={handleCapstoneClick}
              >
                <div style={{ transform: 'translate(-50%,-50%)' }}>
                  <m.div
                    initial={pref ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: capstoneState === 'bloqueado' ? 0.5 : 1, y: 0 }}
                    transition={{ delay: 0.1 + nodes.length * 0.09, type: 'spring', stiffness: 180, damping: 20 }}
                  >
                    <div style={{ position: 'relative', width: 140, height: 140 }}>
                      <CapstoneCardBorder cardSize={140} radius={20} reduceMotion={!!pref} />
                      <div className="capstone-card" style={{ background: capstoneState === 'evaluado' ? 'rgba(192,57,43,0.06)' : 'var(--card-bg)' }}>
                        <div className="capstone-card-glow" />
                        <span style={{ position: 'relative', fontSize: 32, filter: 'drop-shadow(0 2px 8px rgba(192,57,43,0.4))' }}>🏆</span>
                        <span className="capstone-card-eyebrow">PROYECTO</span>
                        <span className="capstone-card-title">Capstone</span>
                        <span className="capstone-card-xp">★ 500 XP</span>
                      </div>
                      {!pref && <CapstoneParticles userId={userId} pillarDone={pillarDoneList} pillarColors={pillarColorList} />}
                    </div>
                  </m.div>
                </div>
              </div>

              {/* Hito — Great Venture, hexágono via clip-path (sin cambios de diseño) */}
              <div
                style={{ position: 'absolute', left: containerWidth / 2, top: (nodes.length + 1) * nodeHeight + nodeHeight / 2, cursor: 'pointer' }}
                onClick={() => router.push('/dashboard/great-venture')}
              >
                <div style={{ transform: 'translate(-50%,-50%)' }}>
                  <m.div
                    initial={pref ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + (nodes.length + 1) * 0.09, type: 'spring', stiffness: 180, damping: 20 }}
                  >
                    <m.div
                      className="lp-zznode-gv"
                      style={{
                        background: `linear-gradient(135deg, rgba(${PILLAR_RGB[gvPillar1]},0.2) 0%, rgba(${PILLAR_RGB[gvPillar2]},0.1) 100%)`,
                        border: `2px solid rgba(${PILLAR_RGB[gvPillar1]},0.4)`,
                      }}
                      whileHover={{ rotate: [0, 12, 0], scale: 1.06 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                    >
                      <span style={{ fontSize: 28 }}>🗺️</span>
                      <span className="lp-zznode-gv-label" style={{ color: PILLAR_COLORS[gvPillar1].solid }}>{t('greatVentureTagline')}</span>
                    </m.div>
                  </m.div>
                </div>
              </div>
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
