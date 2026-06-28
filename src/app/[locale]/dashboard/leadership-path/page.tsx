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

// Línea serpenteante del zigzag interior — coordenadas porcentuales (viewBox 0 0 100 100,
// preserveAspectRatio="none" para que se estire a la altura real del contenedor). Oscila
// izquierda/derecha por tramo y conecta cada tramo con una curva suave (control points
// horizontales en el punto medio de cada Y), evocando un camino orgánico — no intenta
// alinear exactamente con cada nodo (los nodos alternan por flexDirection row/row-reverse,
// un sistema de posicionamiento distinto), es un fondo decorativo.
function buildZigzagPath(totalSlots: number): string {
  const pts = Array.from({ length: totalSlots + 1 }, (_, i) => ({
    x: i % 2 === 0 ? 30 : 70,
    y: (i / totalSlots) * 100,
  }))
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const cy = (pts[i].y + pts[i + 1].y) / 2
    d += ` C ${pts[i].x} ${cy}, ${pts[i + 1].x} ${cy}, ${pts[i + 1].x} ${pts[i + 1].y}`
  }
  return d
}
const ZIGZAG_PATH_D = buildZigzagPath(TOTAL_NODES)

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

  // Pilar del módulo que el estudiante debe completar ahora — la ruta marítima
  // hacia ESE pilar lleva el punto animado, el resto quedan estáticas.
  const activeRoutePillar: Pillar | null = activeModuleIdx !== -1
    ? MODULE_PILLAR[nodes[activeModuleIdx].module.order_index]
    : null

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
        .lp-connector-dot{filter:drop-shadow(0 0 3px rgba(0,0,0,.25));}

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
        /* Capstone — pico de montaña (clip-path triángulo), no card rectangular.
           El contenido se empaqueta hacia la base ancha (flex-end) — centrado
           normal pondría el ícono cerca del vértice angosto y lo recortaría. */
        .lp-hub-capstone{
          width:80px;height:80px;
          clip-path:polygon(50% 0%, 100% 100%, 0% 100%);
          border:2px solid rgba(192,57,43,0.4);
          box-shadow:0 8px 24px rgba(192,57,43,0.15);
          justify-content:flex-end;
          padding-bottom:10px;
        }
        [data-theme="dark"] .lp-hub-capstone{box-shadow:0 8px 24px rgba(192,57,43,0.25);}
        .lp-hub-capstone .lp-hub-label{margin-top:2px;font-size:9px;}
        .lp-hub-gv{width:88px;height:88px;border-radius:14px;}
        .lp-hub-gv .lp-hub-label{font-size:9px;}

        .lp-skeleton-island{position:absolute;transform:translate(-50%,-50%);width:190px;height:190px;border-radius:50%;background:linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%);background-size:400% 100%;animation:shimmer 1.4s ease infinite;}

        .lp-back-btn{display:inline-flex;align-items:center;padding:8px 16px;border:1px solid var(--line);border-radius:999px;background:none;color:var(--mute);font-size:13px;cursor:pointer;font-family:"Satoshi",sans-serif;margin-bottom:20px;transition:border-color .2s,color .2s;}
        .lp-back-btn:hover{border-color:var(--ink);color:var(--ink);}

        .lp-zigzag{position:relative;max-width:560px;margin:0 auto;padding:40px 24px;width:100%;}
        /* Línea serpenteante — SVG con preserveAspectRatio="none" para estirarse a la
           altura real del contenedor (variable según contenido); el "relleno" usa el
           truco pathLength/dashoffset en vez de height%, porque ahora es una curva. */
        .lp-zigzag-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
        .lp-zigzag-line-path{stroke:var(--line);stroke-width:2px;fill:none;}
        .lp-zigzag-line-fill-path{stroke-width:2px;fill:none;transition:stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1);}
        /* Fallback recto para mobile — la curva orgánica oscila izq/centro/der, lo cual
           no tiene sentido cuando los nodos colapsan a una sola columna alineada. */
        .lp-zigzag-mobile-line-bg{display:none;position:absolute;left:27px;top:0;bottom:0;width:2px;background:var(--line);}
        .lp-zigzag-mobile-line-fill{display:none;position:absolute;left:27px;top:0;width:2px;transition:height 0.6s cubic-bezier(0.22,1,0.36,1);}
        .lp-node-row{position:relative;display:flex;align-items:center;gap:10px;margin-bottom:32px;}
        .lp-node-row:last-child{margin-bottom:0;}
        .lp-connector-arm{width:24px;height:0;border-top:1.5px solid var(--line);flex-shrink:0;align-self:center;}
        .lp-node-circle{width:56px;height:56px;border-radius:50%;flex-shrink:0;position:relative;z-index:1;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;}
        .lp-node-circle--milestone{border-radius:12px;width:64px;height:64px;font-size:24px;}
        .lp-node-banner{position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#fff;padding:2px 6px;border-radius:2px;white-space:nowrap;z-index:2;}
        .lp-node-info{flex:1;min-width:0;}
        .lp-node-module-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;}
        .lp-node-title{font-family:"Satoshi",sans-serif;font-weight:600;font-size:17px;color:var(--ink);margin-top:2px;}
        .lp-node-xp{font-size:12px;font-weight:700;margin-top:4px;}
        .lp-node-status{font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-top:4px;font-weight:600;}
        .lp-node-cta{margin-top:8px;padding:8px 16px;border-radius:100px;border:none;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:"Satoshi",sans-serif;}
        .lp-node-done{margin-top:8px;display:inline-flex;font-size:11px;font-weight:700;color:#16a34a;}

        @media(max-width:768px){
          .lp-map-container{min-height:900px;overflow:visible;}
          .lp-connectors{display:none;}
          .lp-islands-wrap{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;justify-items:center;}
          .lp-island-btn{position:static!important;transform:none!important;width:100px!important;height:100px!important;top:auto!important;left:auto!important;}
          .lp-hubs-wrap{display:flex;gap:16px;justify-content:center;margin-top:24px;flex-wrap:wrap;}
          .lp-hub{position:static!important;transform:none!important;top:auto!important;left:auto!important;}
          .lp-node-row{flex-direction:row!important;}
          .lp-zigzag-svg{display:none;}
          .lp-zigzag-mobile-line-bg,.lp-zigzag-mobile-line-fill{display:block;}
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
                    const isActiveRoute = activeRoutePillar === p
                    return (
                      <g key={p}>
                        <path className="lp-connector-halo" d={d} />
                        <path className="lp-connector-path" d={d} stroke={`rgba(${PILLAR_RGB[p]},0.3)`} strokeDasharray="3 8" />
                        {isActiveRoute && (
                          <circle r="3" fill={PILLAR_COLORS[p].solid} className="lp-connector-dot">
                            <animateMotion dur="4s" repeatCount="indefinite" path={d} />
                          </circle>
                        )}
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
                    className="lp-hub lp-hub-capstone"
                    style={{
                      background: capstoneState === 'evaluado' ? 'rgba(192,57,43,0.06)' : 'var(--card-bg)',
                      opacity: capstoneState === 'bloqueado' ? 0.5 : 1,
                      top: `${CAPSTONE_POS.top}%`, left: `${CAPSTONE_POS.left}%`,
                    }}
                    onClick={handleCapstoneClick}
                  >
                    <span className="lp-hub-icon">🏔️</span>
                    <span className="lp-hub-label">CIMA · CAPSTONE</span>
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

            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 32, color: PILLAR_COLORS[island].solid }}>{island}</h2>
              <div style={{ fontSize: 18, color: 'var(--mute)', marginTop: 4 }}>{pillarScores[island]}%</div>
              <p style={{ fontSize: 13, color: 'var(--mute)', marginTop: 8 }}>{t(`pillarDescriptions.${PILLAR_I18N_KEY[island]}`)}</p>
            </div>

            <div className="lp-zigzag">
              <svg className="lp-zigzag-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path className="lp-zigzag-line-path" d={ZIGZAG_PATH_D} />
                <path
                  className="lp-zigzag-line-fill-path"
                  d={ZIGZAG_PATH_D}
                  stroke={fillColor}
                  pathLength={100}
                  strokeDasharray={100}
                  strokeDashoffset={100 - fillPct}
                />
              </svg>
              <div className="lp-zigzag-mobile-line-bg" />
              <div className="lp-zigzag-mobile-line-fill" style={{ height: `${fillPct}%`, background: fillColor }} />

              {nodes.map((node, idx) => {
                const pillarColor = PILLAR_COLORS[MODULE_PILLAR[node.module.order_index]].solid
                const circleBg = node.state === 'completed' ? pillarColor : node.state === 'locked' ? 'var(--bg-2)' : 'var(--card-bg)'
                const circleBorder = node.state === 'completed' ? 'none' : node.state === 'locked' ? '1.5px solid var(--line)' : `3px solid ${pillarColor}`
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
                    <div
                      className="lp-node-circle"
                      style={{
                        background: circleBg, border: circleBorder,
                        color: node.state === 'active' ? pillarColor : '#fff',
                        opacity: node.state === 'locked' ? 0.45 : 1,
                        filter: node.state === 'locked' ? 'blur(0.5px)' : 'none',
                      }}
                    >
                      {node.state === 'completed' && (
                        <>
                          <span className="lp-node-banner" style={{ background: pillarColor }}>{t('checkpointLabel')}</span>
                          <span style={{ fontSize: 20, color: '#fff' }}>✓</span>
                        </>
                      )}
                      {node.state === 'active' && (
                        <>
                          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={pillarColor}/>
                            <circle cx="12" cy="9" r="2.5" fill="white"/>
                          </svg>
                          <PulseRing color={pillarColor} />
                        </>
                      )}
                      {node.state === 'locked' && <span style={{ fontSize: 14, color: 'var(--mute)' }}>🔒</span>}
                    </div>
                    <div className="lp-connector-arm" />
                    <div className="lp-node-info">
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
                    border: `2px dashed ${capstoneState === 'evaluado' ? '#C0392B' : 'var(--card-border)'}`,
                    opacity: capstoneState === 'bloqueado' ? 0.5 : 1,
                  }}
                >
                  <span className="lp-node-banner" style={{ background: 'var(--ink)' }}>{t('finalDestinationLabel')}</span>
                  🏆
                </div>
                <div className="lp-connector-arm" />
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
                <div className="lp-node-circle lp-node-circle--milestone" style={{ background: 'var(--card-bg)', border: '2px dashed var(--card-border)' }}>
                  <span className="lp-node-banner" style={{ background: 'var(--ink)' }}>{t('specialMissionLabel')}</span>
                  🗺️
                </div>
                <div className="lp-connector-arm" />
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
