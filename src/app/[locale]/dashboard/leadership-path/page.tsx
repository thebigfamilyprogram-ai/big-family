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
  // Campo opcional — puede no existir todavía en leadership_profile (JSONB). No se agrega
  // ninguna query nueva para traerlo: si ya viene dentro del JSON ya fetcheado, se usa;
  // si no, simplemente no se muestra (ver GREAT_VENTURE_POS render).
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

const PILLAR_POSITIONS: Record<Pillar, { top: number; left: number }> = {
  Yo:      { top: 15, left: 20 },
  Norte:   { top: 10, left: 55 },
  Vínculo: { top: 45, left: 10 },
  Acción:  { top: 40, left: 70 },
  Legado:  { top: 70, left: 40 },
}

// Paleta wayuu por pilar — vía custom properties --wp-* (definidas en .leadership-path-page,
// ver <style>), no hex sueltos, para que un futuro retoque de paleta sea de un solo lugar.
const PILLAR_COLORS: Record<Pillar, { solid: string; soft: string }> = {
  Yo:      { solid: 'var(--wp-yo)',      soft: 'rgba(217,64,64,.12)' },
  Norte:   { solid: 'var(--wp-norte)',   soft: 'rgba(26,158,138,.12)' },
  Vínculo: { solid: 'var(--wp-vinculo)', soft: 'rgba(232,149,42,.12)' },
  Acción:  { solid: 'var(--wp-accion)',  soft: 'rgba(123,111,212,.12)' },
  Legado:  { solid: 'var(--wp-legado)',  soft: 'rgba(79,173,91,.12)' },
}

const PILLAR_ICONS: Record<Pillar, string> = {
  Yo: '🧠', Norte: '🧭', Vínculo: '🤝', Acción: '⚡', Legado: '🌱',
}

// Triplete "R,G,B" por pilar (equivalentes a --wp-*) — para componer rgba() dinámico
// en sombras/gradientes/bordes vía custom properties; CSS no permite desestructurar
// un var() hex en sus componentes, así que este triplete vive en paralelo.
const PILLAR_RGB: Record<Pillar, string> = {
  Yo: '217,64,64', Norte: '26,158,138', Vínculo: '232,149,42', Acción: '123,111,212', Legado: '79,173,91',
}

// Rombo wayuu — forma base de islas y nodos (rotada 45° en los hitos del mapa = cuadrado).
const WAYUU_DIAMOND_CLIP = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
// Octágono — forma exclusiva del Capstone, el momento más importante del recorrido.
const CAPSTONE_OCTAGON_CLIP = 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
// Hexágono vertical — forma exclusiva del Great Venture, distinta de islas y Capstone.
const GV_HEXAGON_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

// Pillar → sufijo de key i18n (ascii, las keys del JSON no llevan tilde/mayúscula)
const PILLAR_I18N_KEY: Record<Pillar, string> = {
  Yo: 'yo', Norte: 'norte', Vínculo: 'vinculo', Acción: 'accion', Legado: 'legado',
}

const CAPSTONE_POS = { top: 42, left: 42 }
const GREAT_VENTURE_POS = { top: 65, left: 62 }

// Alto vertical aproximado de cada fila del path — los nodos ya no se posicionan con esto
// (ahora es flexbox normal, ver Sesión 15), solo lo usa la curva SVG decorativa de fondo
// y el offset Y de Capstone/Great Venture; ≈ misma altura real de una fila flex (min-height
// 80px + padding 16px×2), así que la curva no se desalinea de forma perceptible.
const NODE_HEIGHT = 112
const NARROW_BREAKPOINT = 480

// Animaciones perpetuas — cada una vive en su propio componente memoizado, ver CLAUDE.md.
// Nodo activo: dos pulse rings concéntricos con delay escalonado.
const PulseRing1 = memo(function PulseRing1({ color, reduceMotion }: { color: string; reduceMotion: boolean }) {
  return (
    <m.div
      style={{ position: 'absolute', inset: -8, clipPath: WAYUU_DIAMOND_CLIP, border: `1px solid ${color}`, pointerEvents: 'none' }}
      animate={reduceMotion ? undefined : { scale: [1, 1.6], opacity: [0.5, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
    />
  )
})
const PulseRing2 = memo(function PulseRing2({ color, reduceMotion }: { color: string; reduceMotion: boolean }) {
  return (
    <m.div
      style={{ position: 'absolute', inset: -16, clipPath: WAYUU_DIAMOND_CLIP, border: `1px solid ${color}`, pointerEvents: 'none' }}
      animate={reduceMotion ? undefined : { scale: [1, 1.6], opacity: [0.5, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
    />
  )
})
// Niebla pulsante sobre nodos bloqueados — "fog of war".
const FogPulse = memo(function FogPulse({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <m.div
      style={{
        position: 'absolute', top: '50%', left: '50%', width: 80, height: 80,
        marginTop: -40, marginLeft: -40, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, var(--wp-bg) 0%, transparent 70%)',
        opacity: reduceMotion ? 0.4 : undefined,
      }}
      animate={reduceMotion ? undefined : { opacity: [0.35, 0.5, 0.35] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
})
// Brillo blanco pulsante sobre el tramo del path ya completado.
const PathShimmer = memo(function PathShimmer({ d, reduceMotion }: { d: string; reduceMotion: boolean }) {
  if (reduceMotion) return null
  return (
    <m.path
      d={d}
      stroke="#fff"
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
      animate={{ opacity: [0, 0.4, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
})
// Borde conic-gradient de 5 colores wayuu rotando — el octágono del Capstone.
const CapstoneOctagonBorder = memo(function CapstoneOctagonBorder({ size, reduceMotion }: { size: number; reduceMotion: boolean }) {
  return (
    <m.div
      style={{
        position: 'absolute', inset: 0, width: size, height: size, clipPath: CAPSTONE_OCTAGON_CLIP, pointerEvents: 'none',
        background: 'conic-gradient(from 0deg, #D94040 0deg 72deg, #1A9E8A 72deg 144deg, #E8952A 144deg 216deg, #7B6FD4 216deg 288deg, #4FAD5B 288deg 360deg)',
      }}
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={reduceMotion ? undefined : { duration: 8, repeat: Infinity, ease: 'linear' }}
    />
  )
})
// Símbolo geométrico wayuu del Capstone — rombo central + 4 rombos diagonales + 8 puntos
// trazando el octágono. SVG estático (sin animación), igual viewBox para ambos tamaños.
const WayuuCapstoneSymbol = memo(function WayuuCapstoneSymbol({ primaryColor, secondaryColor }: { primaryColor: string; secondaryColor: string }) {
  const vertices: [number, number][] = [[18, 0], [42, 0], [60, 18], [60, 42], [42, 60], [18, 60], [0, 42], [0, 18]]
  const diagonals: [number, number][] = [[44, 16], [44, 44], [16, 44], [16, 16]]
  return (
    <svg viewBox="0 0 60 60" width={40} height={40}>
      {vertices.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2} fill="var(--wp-ink-2)" />)}
      {diagonals.map(([x, y], i) => (
        <polygon key={i} points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`} fill={secondaryColor} />
      ))}
      <polygon points="30,15 45,30 30,45 15,30" fill={primaryColor} />
    </svg>
  )
})
// Brújula wayuu del Great Venture — círculo + 4 triángulos direccionales + punto central.
// SVG estático (sin animación).
const WayuuCompass = memo(function WayuuCompass({ color, size }: { color: string; size: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <circle cx={16} cy={16} r={12} stroke={color} strokeWidth={1.5} fill="none" />
      <polygon points="13,4 19,4 16,10" fill={color} />
      <polygon points="13,28 19,28 16,22" fill={color} />
      <polygon points="28,13 28,19 22,16" fill={color} fillOpacity={0.4} />
      <polygon points="4,13 4,19 10,16" fill={color} fillOpacity={0.4} />
      <circle cx={16} cy={16} r={2} fill={color} />
    </svg>
  )
})
// Patrón de rombos wayuu en cadena — fondo fijo de toda la página, estático (sin animación).
const WayuuBackground = memo(function WayuuBackground() {
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.035 }}>
      <defs>
        <pattern id="wayuu-diamond" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
          <polygon points="24,4 44,24 24,44 4,24" fill="none" stroke="var(--wp-ink)" strokeWidth={1} />
          <polygon points="24,12 36,24 24,36 12,24" fill="none" stroke="var(--wp-ink)" strokeWidth={0.5} />
          <circle cx={24} cy={24} r={2} fill="var(--wp-ink)" />
          <circle cx={24} cy={4} r={1} fill="var(--wp-ink)" />
          <circle cx={44} cy={24} r={1} fill="var(--wp-ink)" />
          <circle cx={24} cy={44} r={1} fill="var(--wp-ink)" />
          <circle cx={4} cy={24} r={1} fill="var(--wp-ink)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wayuu-diamond)" />
    </svg>
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

// Mismos tramos que generateOrganicPoints pero como segmentos independientes — permite
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

  // Toggle dark/light propio de esta página — independiente del tema global del sitio.
  const [isDark, setIsDark] = useState(true)

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
  const nodeHeight = NODE_HEIGHT // alias breve — solo alimenta la curva decorativa y el offset Y de los hitos

  const organicSegments = useMemo(
    () => generateOrganicSegments(userId, nodes.length, containerWidth, nodeHeight),
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

  // Color del Great Venture — pilar más fuerte del estudiante; #C0392B solo si todavía
  // no hay leaderProfile en absoluto (no si simplemente no hay fortalezas, ese caso ya
  // cae en 'Yo' vía strengthList más arriba).
  const gvColor = leaderProfile ? PILLAR_COLORS[gvPillar1].solid : '#C0392B'
  const gvRgb1  = leaderProfile ? PILLAR_RGB[gvPillar1] : '192,57,43'

  // El Capstone — octágono de 3 capas concéntricas con borde conic-gradient de 5 colores
  // wayuu. Mismo helper para mapa (120px) e isla (160px, +XP debajo).
  function renderCapstoneOctagon(size: number, showXp: boolean) {
    const mid = size - 12
    const inner = size - 24
    return (
      <div
        className="lp-capstone-hover"
        style={{ position: 'relative', width: size, height: size }}
        onClick={handleCapstoneClick}
      >
        <CapstoneOctagonBorder size={size} reduceMotion={!!pref} />
        <div
          className="lp-capstone-mid"
          style={{ position: 'absolute', top: (size - mid) / 2, left: (size - mid) / 2, width: mid, height: mid, clipPath: CAPSTONE_OCTAGON_CLIP }}
        />
        <div
          className="lp-capstone-inner"
          style={{
            position: 'absolute', top: (size - inner) / 2, left: (size - inner) / 2, width: inner, height: inner, clipPath: CAPSTONE_OCTAGON_CLIP,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: capstoneState === 'bloqueado' ? 0.5 : 1,
          }}
        >
          <WayuuCapstoneSymbol primaryColor="#C0392B" secondaryColor={gvColor} />
          <span className="lp-capstone-label">CAPSTONE</span>
          {showXp && <span className="lp-capstone-xp">★ 500 XP</span>}
        </div>
      </div>
    )
  }

  // El Great Venture — hexágono vertical con el color del pilar más fuerte del estudiante.
  // Mismo helper para mapa (88×104) e isla (110×130, +meta_nucleo si existe).
  function renderGreatVenture(width: number, height: number, showMeta: boolean) {
    return (
      <m.div
        className="lp-gv-hex"
        style={{ width, height }}
        whileHover={{ rotate: 30, scale: 1.08 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        onClick={() => router.push('/dashboard/great-venture')}
      >
        <div className="lp-gv-hex-border" style={{ background: `rgba(${gvRgb1},0.6)` }} />
        <div className="lp-gv-hex-fill" style={{ background: `rgba(${gvRgb1},0.15)` }}>
          <WayuuCompass color={gvColor} size={24} />
          <span className="lp-gv-label" style={{ color: gvColor }}>{t('greatVentureTagline')}</span>
          {showMeta && leaderProfile?.meta_nucleo && (
            <span className="lp-gv-meta">{leaderProfile.meta_nucleo.slice(0, 20)}</span>
          )}
        </div>
      </m.div>
    )
  }

  return (
    <div
      className="leadership-path-page"
      data-theme={isDark ? 'dark' : 'light'}
      style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}
    >
      <WayuuBackground />
      <button className="lp-theme-toggle" onClick={() => setIsDark(d => !d)}>
        {isDark ? '☀ Modo claro' : '◐ Modo oscuro'}
      </button>
      <style>{`
        :root, .leadership-path-page{
          --wp-bg:#0A0907; --wp-surface:#141210; --wp-surface-2:#1C1916;
          --wp-border:rgba(255,255,255,0.06); --wp-border-glow:rgba(255,255,255,0.12);
          --wp-ink:#F5F0E8; --wp-ink-2:#B8B0A0; --wp-mute:#6B6355;
          --wp-yo:#D94040; --wp-norte:#1A9E8A; --wp-vinculo:#E8952A; --wp-accion:#7B6FD4; --wp-legado:#4FAD5B;
        }
        .leadership-path-page[data-theme="light"]{
          --wp-bg:#FDFAF5; --wp-surface:#FFFFFF; --wp-surface-2:#F5F0E8;
          --wp-border:rgba(13,13,13,0.08); --wp-border-glow:rgba(13,13,13,0.15);
          --wp-ink:#0A0907; --wp-ink-2:#3D3830; --wp-mute:#8C8070;
        }
        .leadership-path-page{position:relative;background:var(--wp-bg);}
        .lp-theme-toggle{position:absolute;top:32px;right:28px;z-index:5;font-size:11px;padding:6px 14px;background:var(--wp-surface-2);border:1px solid var(--wp-border);border-radius:100px;color:var(--wp-ink-2);cursor:pointer;font-family:"Satoshi",sans-serif;}

        .lp-eyebrow{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--wp-yo);margin-bottom:8px;}
        .lp-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:36px;color:var(--wp-ink);letter-spacing:-0.01em;}
        .lp-subtitle{font-family:"Instrument Serif",serif;font-style:italic;font-size:14px;color:var(--wp-ink-2);margin-top:6px;}
        .zone1-stats{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-top:14px;}
        .zone1-stat-num{font-family:"Satoshi",sans-serif;font-weight:600;font-size:16px;color:var(--wp-ink);font-variant-numeric:tabular-nums;}
        .zone1-stat-label{font-size:11px;color:var(--wp-mute);}
        .zone1-sep{color:var(--wp-mute);}

        .lp-map-container{position:relative;width:100%;min-height:720px;overflow:visible;background:transparent;padding-bottom:80px;}
        .lp-sea{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
        .lp-sea-ring{stroke:var(--wp-border);stroke-width:.5px;fill:none;opacity:.6;}
        .lp-connectors{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
        .lp-connector-halo{stroke:var(--wp-border-glow);stroke-width:1px;fill:none;}
        .lp-connector-path{stroke-width:1px;opacity:.5;fill:none;}

        /* Isla — rombo wayuu. El relleno/glow van en .lp-island-shape (clip-path), el borde
           luminoso en .lp-island-border (mismo clip-path, 2px más grande, zIndex detrás) —
           clip-path recorta cualquier box-shadow/border puesto en el MISMO elemento, así que
           ambas capas viven en wrappers planos separados, nunca en el m.button animado. */
        .lp-island-anchor{position:absolute;transform:translate(-50%,-50%);}
        .lp-island-btn{
          position:relative;display:flex;width:100%;height:100%;
          align-items:center;justify-content:center;cursor:pointer;background:none;border:none;
          font-family:"Satoshi",sans-serif;padding:0;
          filter:drop-shadow(0 0 var(--island-glow,20px) rgba(var(--island-rgb),0.3));
        }
        .lp-island-btn:hover{--island-glow:32px;}
        .lp-island-border{position:absolute;inset:-2px;z-index:-1;clip-path:${WAYUU_DIAMOND_CLIP};background:linear-gradient(135deg, rgba(var(--island-rgb),0.6) 0%, rgba(var(--island-rgb),0.2) 50%, rgba(var(--island-rgb),0.6) 100%);}
        .lp-island-shape{
          position:absolute;inset:0;clip-path:${WAYUU_DIAMOND_CLIP};
          display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;
          background:radial-gradient(ellipse at center, rgba(var(--island-rgb),0.20) 0%, rgba(var(--island-rgb),0.08) 50%, transparent 100%);
        }
        .lp-island-icon{font-size:24px;line-height:1;margin-bottom:8px;filter:drop-shadow(0 0 6px rgba(var(--island-rgb),0.8));}
        .lp-island-name{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;font-size:13px;letter-spacing:0.02em;margin-bottom:4px;}
        .lp-island-score{font-family:"Satoshi",sans-serif;font-size:28px;font-weight:700;color:var(--wp-ink);line-height:1;margin-bottom:6px;}
        .lp-badge{font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:100px;}

        /* Anchor invisible para Capstone/Great Venture en el mapa — solo posiciona, el
           contenido visible (octágono/hexágono) lo dan los helpers renderCapstoneOctagon/
           renderGreatVenture, reusados también en la vista isla. */
        .lp-hub-anchor{position:absolute;transform:translate(-50%,-50%);}

        .lp-skeleton-island{position:absolute;transform:translate(-50%,-50%);width:190px;height:190px;clip-path:${WAYUU_DIAMOND_CLIP};background:linear-gradient(90deg,var(--wp-surface-2) 25%,var(--wp-surface) 50%,var(--wp-surface-2) 75%);background-size:400% 100%;animation:shimmer 1.4s ease infinite;}

        .lp-back-btn{display:inline-flex;align-items:center;padding:8px 16px;border:1px solid var(--wp-border);border-radius:999px;background:none;color:var(--wp-ink-2);font-size:13px;cursor:pointer;font-family:"Satoshi",sans-serif;margin-bottom:20px;transition:border-color .2s,color .2s;}
        .lp-back-btn:hover{border-color:var(--wp-ink-2);color:var(--wp-ink);}

        /* Contenedor del zigzag — la curva SVG de fondo es position:absolute, pointer-events:none,
           detrás de todo (z-index:0); cada fila es flexbox normal (z-index:1, position:relative)
           y NUNCA se superpone con la siguiente porque el alto real lo da el propio contenido,
           no una coordenada absoluta — ver Sesión 15 (antes el texto del módulo N+1 podía quedar
           encima del nodo del módulo N porque ambos usaban coordenadas independientes). */
        .lp-zigzag{position:relative;max-width:560px;margin:0 auto;padding:40px 24px;width:100%;}
        .lp-node-row{position:relative;z-index:1;display:flex;align-items:center;gap:24px;padding:16px 0;min-height:80px;}
        /* box-shadow nunca va en .lp-node-circle — tiene clip-path, que recorta cualquier
           sombra puesta en el MISMO elemento. Vive en este wrapper plano (sin clip-path). */
        .lp-node-shadow{position:relative;}
        .lp-node-shadow--done{box-shadow:0 0 0 1px rgba(var(--node-rgb),0.3), 0 0 16px rgba(var(--node-rgb),0.4);}
        .lp-node-shadow--active{box-shadow:0 0 0 2px rgba(var(--node-rgb),0.4), 0 0 32px rgba(var(--node-rgb),0.5), 0 0 64px rgba(var(--node-rgb),0.2);}
        .lp-node-border{position:absolute;inset:-2px;z-index:-1;clip-path:${WAYUU_DIAMOND_CLIP};}
        .lp-node-circle{clip-path:${WAYUU_DIAMOND_CLIP};flex-shrink:0;position:relative;z-index:1;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;}
        /* Anillo exterior del nodo completado — segundo rombo, mismo centro, sin relleno. */
        .lp-node-ring{position:absolute;top:50%;left:50%;width:68px;height:68px;margin-top:-34px;margin-left:-34px;clip-path:${WAYUU_DIAMOND_CLIP};border:1px solid;pointer-events:none;}
        .lp-node-info{flex:1;min-width:0;}
        .lp-node-module-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;}
        .lp-node-title{font-family:"Satoshi",sans-serif;font-weight:600;font-size:18px;color:var(--wp-ink);margin-top:2px;}
        .lp-node-xp{font-size:12px;font-weight:700;margin-top:4px;}
        .lp-node-status{font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-top:4px;font-weight:600;}
        .lp-node-cta{margin-top:8px;padding:8px 16px;border-radius:100px;border:none;color:var(--wp-bg);font-size:12px;font-weight:600;cursor:pointer;font-family:"Satoshi",sans-serif;}
        .lp-node-done{margin-top:8px;display:inline-flex;font-size:11px;font-weight:700;color:var(--wp-norte);}

        /* Tooltip "SIGUIENTE" del nodo activo — siempre visible, al lado del nodo. */
        .lp-node-tooltip{position:absolute;top:50%;transform:translateY(-50%);background:var(--wp-surface);border:1px solid var(--wp-border-glow);border-left-width:2px;box-shadow:0 4px 24px rgba(0,0,0,0.4);border-radius:10px;padding:10px 14px;white-space:nowrap;z-index:4;}
        .lp-node-tooltip--right{left:calc(100% + 14px);}
        .lp-node-tooltip--left{right:calc(100% + 14px);}
        .lp-tooltip-eyebrow{display:block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;}
        .lp-tooltip-title{display:block;font-size:14px;font-weight:600;color:var(--wp-ink);margin-top:2px;}
        .lp-tooltip-arrow{position:absolute;top:50%;width:8px;height:8px;transform:translateY(-50%) rotate(45deg);background:var(--wp-surface);}
        .lp-tooltip-arrow--right{left:-4px;}
        .lp-tooltip-arrow--left{right:-4px;}

        /* Capstone — octágono de 3 capas concéntricas (mismo clip-path, tamaños decrecientes).
           Excepción deliberada de forma: no es rombo como el resto, y mantiene su identidad
           roja de marca (#C0392B) en vez de un color de pilar — es el destino de TODO el
           recorrido, no pertenece a un solo pilar. Capa exterior = CapstoneOctagonBorder
           (conic-gradient rotando); capa media = "borde" de 6px en var(--wp-bg/--wp-surface)
           — pura CSS por tema, sin condicional JS; capa interior = glow radial sutil + símbolo. */
        .lp-capstone-hover{cursor:pointer;transition:filter .2s, transform .2s;}
        .lp-capstone-hover:hover{filter:brightness(1.15);transform:scale(1.04);}
        .lp-capstone-mid{background:var(--wp-bg);}
        .leadership-path-page[data-theme="light"] .lp-capstone-mid{background:var(--wp-surface);}
        .lp-capstone-inner{background:radial-gradient(circle at 35% 30%, rgba(255,255,255,0.06) 0%, transparent 60%);}
        .leadership-path-page[data-theme="light"] .lp-capstone-inner{background:radial-gradient(circle at 35% 30%, rgba(0,0,0,0.02) 0%, transparent 60%);}
        .lp-capstone-label{font-size:9px;font-weight:800;letter-spacing:0.15em;color:var(--wp-ink-2);text-transform:uppercase;margin-top:8px;}
        .lp-capstone-xp{font-size:10px;color:#C0392B;margin-top:4px;}

        /* Great Venture — hexágono vertical con el color del pilar más fuerte del estudiante;
           mismo truco de wrapper-borde-4px-más-grande que el resto de formas con clip-path. */
        .lp-gv-hex{position:relative;cursor:pointer;clip-path:${GV_HEXAGON_CLIP};}
        .lp-gv-hex-border{position:absolute;inset:-4px;z-index:-1;clip-path:${GV_HEXAGON_CLIP};}
        .lp-gv-hex-fill{position:absolute;inset:0;clip-path:${GV_HEXAGON_CLIP};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;}
        .lp-gv-label{font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-top:6px;text-align:center;}
        .lp-gv-meta{font-size:9px;color:var(--wp-ink-2);margin-top:3px;text-align:center;max-width:90px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

        /* Header de vista isla — tipografía editorial con luz propia (text-shadow) */
        .lp-island-headline{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;font-size:40px;}
        .lp-island-score-row{display:block;font-size:20px;font-weight:400;color:var(--wp-ink-2);margin-top:4px;font-variant-numeric:tabular-nums;}
        .lp-score-bar-track{width:200px;height:2px;background:var(--wp-border);border-radius:100px;margin-top:10px;overflow:hidden;}
        .lp-score-bar-fill{height:100%;border-radius:100px;transition:width 1.2s cubic-bezier(0.22,1,0.36,1);}

        /* Confeti al completar todos los módulos de la isla */
        @keyframes lpConfettiBurst{0%{transform:translate(0,0) rotate(0deg);opacity:1}100%{transform:translate(var(--tx),90px) rotate(var(--rot));opacity:0}}
        .lp-confetti-dot{position:absolute;top:0;left:50%;width:7px;height:7px;border-radius:2px;animation:lpConfettiBurst .9s ease-out forwards;pointer-events:none;}

        @media(max-width:768px){
          .lp-map-container{min-height:900px;overflow:visible;}
          .lp-connectors{display:none;}
          .lp-islands-wrap{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;justify-items:center;}
          .lp-island-anchor{position:static!important;transform:none!important;width:100px!important;height:100px!important;top:auto!important;left:auto!important;}
          .lp-hubs-wrap{display:flex;gap:16px;justify-content:center;margin-top:24px;flex-wrap:wrap;}
          .lp-hub-anchor{position:static!important;transform:none!important;top:auto!important;left:auto!important;}
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
                        <path className="lp-connector-path" d={d} stroke="var(--wp-border-glow)" strokeDasharray="2 4 8 4 2 4" />
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
                    const rgb        = PILLAR_RGB[pillar]
                    return (
                      // El centrado (-50%,-50%) vive en este wrapper plano; el m.button hijo
                      // anima scale/y sin transform propio — ver nota de Sesión 13 sobre FM.
                      <div key={pillar} className="lp-island-anchor" style={{ top: `${pos.top}%`, left: `${pos.left}%`, width: size, height: size }}>
                        <m.button
                          className="lp-island-btn"
                          style={{ '--island-rgb': rgb } as React.CSSProperties}
                          initial={pref ? false : { scale: 0, opacity: 0 }}
                          animate={{ scale: isActive ? 1.03 : 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.1 }}
                          whileHover={{ scale: 1.06, y: -4 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { setActiveIsland(pillar); setView('island') }}
                        >
                          <div className="lp-island-border" />
                          <div className="lp-island-shape">
                            <span className="lp-island-icon">{PILLAR_ICONS[pillar]}</span>
                            <span className="lp-island-name" style={{ color: PILLAR_COLORS[pillar].solid }}>{pillar}</span>
                            <span className="lp-island-score">{score}%</span>
                            {isStrength && (
                              <span className="lp-badge" style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)`, color: PILLAR_COLORS[pillar].solid }}>
                                {tModules('strengthBadge')}
                              </span>
                            )}
                            {isGrowth && (
                              <span className="lp-badge" style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)`, color: PILLAR_COLORS[pillar].solid }}>
                                {tModules('growthBadge')}
                              </span>
                            )}
                          </div>
                        </m.button>
                      </div>
                    )
                  })}
                </div>

                <div className="lp-hubs-wrap">
                  <div className="lp-hub-anchor" style={{ top: `${CAPSTONE_POS.top}%`, left: `${CAPSTONE_POS.left}%`, width: 120, height: 120 }}>
                    {renderCapstoneOctagon(120, false)}
                  </div>
                  <div className="lp-hub-anchor" style={{ top: `${GREAT_VENTURE_POS.top}%`, left: `${GREAT_VENTURE_POS.left}%`, width: 88, height: 104 }}>
                    {renderGreatVenture(88, 104, false)}
                  </div>
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
              <h2
                className="lp-island-headline"
                style={{ color: PILLAR_COLORS[island].solid, textShadow: `0 0 40px rgba(${PILLAR_RGB[island]},0.4)` }}
              >
                {island}
              </h2>
              <div className="lp-island-score-row">
                {scoreReveal ? <AnimatedNumber value={pillarScores[island]} suffix="%" /> : '0%'}
              </div>
              <div className="lp-score-bar-track">
                <div className="lp-score-bar-fill" style={{ width: scoreReveal ? `${pillarScores[island]}%` : '0%', background: PILLAR_COLORS[island].solid, boxShadow: `0 0 8px ${PILLAR_COLORS[island].solid}` }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--wp-mute)', marginTop: 10 }}>{t(`pillarDescriptions.${PILLAR_I18N_KEY[island]}`)}</p>

              {showConfetti && confettiParticles.map((p, pi) => (
                <div
                  key={pi}
                  className="lp-confetti-dot"
                  style={{ background: p.color, '--tx': p.tx, '--rot': p.rot, animationDelay: `${p.delay}s` } as React.CSSProperties}
                />
              ))}
            </m.div>

            <div className="lp-zigzag" ref={zigzagContainerRef}>
              {/* Curva decorativa de fondo — únicamente estética, ya no determina la posición
                  real de los nodos (esa la da el flex layout de abajo, ver Sesión 15: el texto
                  se superponía con el nodo siguiente porque dependía de esta misma curva). */}
              {containerWidth > 0 && nodes.length > 0 && (
                <svg width={containerWidth} height={nodes.length * nodeHeight} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}>
                  <defs>
                    <linearGradient id="wayuu-path-gradient" gradientUnits="userSpaceOnUse" x1={containerWidth / 2} y1={0} x2={containerWidth / 2} y2={nodes.length * nodeHeight}>
                      <stop offset="0%" stopColor={fillColor} stopOpacity={0.4} />
                      <stop offset="50%" stopColor={fillColor} stopOpacity={1} />
                      <stop offset="100%" stopColor={fillColor} stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  {organicSegments.map((seg, i) => {
                    const segmentDone = nodes[i]?.state === 'completed'
                    if (!segmentDone) {
                      return <path key={i} d={seg} stroke="var(--wp-border)" strokeWidth={2} strokeDasharray="4 8" strokeLinecap="round" fill="none" />
                    }
                    return (
                      <g key={i}>
                        <path d={seg} stroke={fillColor} strokeWidth={8} opacity={0.08} style={{ filter: 'blur(4px)' }} strokeLinecap="round" fill="none" />
                        <path d={seg} stroke="url(#wayuu-path-gradient)" strokeWidth={3} strokeLinecap="round" fill="none" />
                        <PathShimmer d={seg} reduceMotion={!!pref} />
                      </g>
                    )
                  })}
                </svg>
              )}

              {nodes.map((node, idx) => {
                const modulePillar = MODULE_PILLAR[node.module.order_index]
                const pillarColor  = PILLAR_COLORS[modulePillar].solid
                const pillarRgb    = PILLAR_RGB[modulePillar]
                const statusColor  = node.state === 'completed' ? 'var(--wp-norte)' : node.state === 'active' ? pillarColor : 'var(--wp-mute)'
                const circleSize   = node.state === 'completed' ? 52 : node.state === 'active' ? 72 : 48
                const isEven       = idx % 2 === 0

                const circleBlock = (
                  <div
                    key="circle"
                    className={`lp-node-shadow${node.state === 'completed' ? ' lp-node-shadow--done' : node.state === 'active' ? ' lp-node-shadow--active' : ''}`}
                    style={{ width: circleSize, height: circleSize, flexShrink: 0, '--node-rgb': pillarRgb } as React.CSSProperties}
                  >
                    {node.state !== 'completed' && (
                      <div className="lp-node-border" style={{ background: node.state === 'active' ? pillarColor : 'var(--wp-border)' }} />
                    )}
                    <m.div
                      className="lp-node-circle"
                      style={{
                        width: '100%', height: '100%',
                        background: node.state === 'completed' ? pillarColor : 'var(--wp-surface)',
                        color: node.state === 'completed' ? 'var(--wp-bg)' : pillarColor,
                        opacity: node.state === 'locked' ? 0.35 : 1,
                        filter: node.state === 'locked' ? 'blur(0.8px)' : 'none',
                      }}
                      initial={pref ? false : { opacity: 0, x: isEven ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.09, type: 'spring', stiffness: 180, damping: 20 }}
                      whileHover={node.state === 'completed' ? { scale: 1.08, y: -2 } : undefined}
                    >
                      {node.state === 'completed' && (
                        <>
                          <span className="lp-node-ring" style={{ borderColor: `rgba(${pillarRgb},0.25)` }} />
                          <span style={{ fontSize: 18, fontWeight: 700 }}>✓</span>
                        </>
                      )}
                      {node.state === 'active' && (
                        <>
                          <div style={{ width: 20, height: 20, clipPath: WAYUU_DIAMOND_CLIP, background: pillarColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 8, height: 8, clipPath: WAYUU_DIAMOND_CLIP, background: 'var(--wp-surface)' }} />
                          </div>
                          <PulseRing1 color={pillarColor} reduceMotion={!!pref} />
                          <PulseRing2 color={pillarColor} reduceMotion={!!pref} />
                          {!isNarrow && (
                            <div className={`lp-node-tooltip lp-node-tooltip--${isEven ? 'right' : 'left'}`} style={{ borderLeftColor: pillarColor }}>
                              <span className="lp-tooltip-eyebrow" style={{ color: pillarColor }}>{t('nextLabel')}</span>
                              <span className="lp-tooltip-title">{node.module.title}</span>
                              <span className={`lp-tooltip-arrow lp-tooltip-arrow--${isEven ? 'right' : 'left'}`} />
                            </div>
                          )}
                        </>
                      )}
                      {node.state === 'locked' && (
                        <>
                          <span style={{ fontSize: 14, color: 'var(--wp-mute)' }}>🔒</span>
                          <FogPulse reduceMotion={!!pref} />
                        </>
                      )}
                    </m.div>
                  </div>
                )

                const infoBlock = (
                  <m.div
                    key="info"
                    className="lp-node-info"
                    style={{ maxWidth: 180, textAlign: isEven ? 'left' : 'right' }}
                    initial={pref ? false : { opacity: 0, x: isEven ? -20 : 20 }}
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
                )

                return (
                  <div
                    key={node.module.id}
                    className="lp-node-row"
                    style={{ justifyContent: isEven ? 'flex-start' : 'flex-end', cursor: node.state !== 'locked' ? 'pointer' : 'default' }}
                    onClick={node.state !== 'locked' ? () => setSelected(node) : undefined}
                  >
                    {isEven ? <>{circleBlock}{infoBlock}</> : <>{infoBlock}{circleBlock}</>}
                  </div>
                )
              })}

              {/* Hito — Capstone, octágono de 3 capas con borde conic-gradient wayuu */}
              <div className="lp-node-row" style={{ justifyContent: nodes.length % 2 === 0 ? 'flex-start' : 'flex-end' }}>
                <m.div
                  initial={pref ? false : { opacity: 0, x: nodes.length % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + nodes.length * 0.09, type: 'spring', stiffness: 180, damping: 20 }}
                >
                  {renderCapstoneOctagon(160, true)}
                </m.div>
              </div>

              {/* Hito — Great Venture, hexágono vertical con el color del estudiante */}
              <div className="lp-node-row" style={{ justifyContent: (nodes.length + 1) % 2 === 0 ? 'flex-start' : 'flex-end' }}>
                <m.div
                  initial={pref ? false : { opacity: 0, x: (nodes.length + 1) % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + (nodes.length + 1) * 0.09, type: 'spring', stiffness: 180, damping: 20 }}
                >
                  {renderGreatVenture(110, 130, true)}
                </m.div>
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
