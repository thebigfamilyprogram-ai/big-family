'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import DashboardSidebar from '@/components/DashboardSidebar'

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

const PHASES = [
  { label: 'FASE 1', name: 'Core Foundations',  range: [1, 3]   },
  { label: 'FASE 2', name: 'Network Expansion',  range: [4, 6]   },
  { label: 'FASE 3', name: 'Community Impact',   range: [7, 9]   },
  { label: 'FASE 4', name: 'SUMMIT',             range: [10, 99] },
]

const LEARN_BULLETS = [
  'Desarrollar habilidades de liderazgo prácticas',
  'Aplicar conceptos a situaciones reales de tu entorno',
  'Construir confianza para liderar equipos',
]

const CONFETTI_COLORS = ['#C0392B','#F39C12','#27AE60','#2980B9','#8E44AD','#E74C3C','#F1C40F','#1ABC9C']

/* ─── Layout constants ─── */
const SVG_W         = 360
const ZIGZAG_XS     = [SVG_W * 0.50, SVG_W * 0.65, SVG_W * 0.35]
const NODE_SPACING  = 135   // px between consecutive node centers
const NODE_R        = 36    // node radius (72px diameter)
const PHASE_CARD_H  = 68    // vertical space consumed by a phase card
const PHASE_CARD_GAP = 22   // gap below phase card before next node
const SVG_MARGIN_T  = 52
const SVG_MARGIN_B  = 70

/* ─── Icons ─── */
const NODE_ICONS: Record<number, React.ReactNode> = {
  1: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3L14.5 8.5H20L15.5 12L17.5 18L12 14.5L6.5 18L8.5 12L4 8.5H9.5L12 3Z" fill="currentColor"/></svg>,
  2: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C12 2 8 7 8 13a4 4 0 0 0 8 0c0-6-4-11-4-11Z" fill="currentColor"/><path d="M12 17v3M10 20h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  3: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M2 12h20M12 2c-3 2.5-5 6-5 10s2 7.5 5 10M12 2c3 2.5 5 6 5 10s-2 7.5-5 10" stroke="currentColor" strokeWidth="1.8"/></svg>,
  4: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  5: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  6: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M9 4v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  7: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L15 9H22L16.5 13.5L18.5 21L12 16.5L5.5 21L7.5 13.5L2 9H9L12 2Z" fill="currentColor"/></svg>,
  8: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3L3 8v5c0 5 3.5 9.74 9 11 5.5-1.26 9-6 9-11V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  9: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Z" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
}

const LOCK_ICON = (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <rect x="4" y="10" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M7 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const CHECK_ICON = (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path d="M5 13l5.5 5.5L21 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/* ─── Helpers ─── */

function buildBezierPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const h = pts[i + 1].y - pts[i].y
    d += ` C ${pts[i].x},${pts[i].y + h * 0.42} ${pts[i + 1].x},${pts[i + 1].y - h * 0.42} ${pts[i + 1].x},${pts[i + 1].y}`
  }
  return d
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const DAY = 86_400_000
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const todayTs = now.getTime()
  const unique = [...new Set(
    dates.filter(Boolean).map(d => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt.getTime() })
  )].sort((a, b) => b - a)
  if (!unique.length || unique[0] < todayTs - DAY) return 0
  let streak = 0, expected = todayTs
  for (const ts of unique) {
    if (ts >= expected - 1000 && ts <= expected + 1000) { streak++; expected -= DAY }
    else if (ts < expected - DAY) break
  }
  return streak
}

function getPhaseFor(nodes: PathNode[], idx: number) {
  const oi = nodes[idx]?.module.order_index ?? idx + 1
  return PHASES.find(p => oi >= p.range[0] && oi <= p.range[1])
}

function isPhaseStart(nodes: PathNode[], idx: number): boolean {
  if (idx === 0) return true
  return getPhaseFor(nodes, idx)?.label !== getPhaseFor(nodes, idx - 1)?.label
}

interface PhaseSlot { type: 'phase'; y: number; phase: typeof PHASES[0] }
interface NodeSlot  { type: 'node';  nodeY: number; nodeIdx: number; zigIdx: number }
type Slot = PhaseSlot | NodeSlot

function buildSlots(nodes: PathNode[]) {
  const slots: Slot[] = []
  let y = SVG_MARGIN_T
  let zigIdx = 0
  nodes.forEach((_, i) => {
    if (isPhaseStart(nodes, i)) {
      slots.push({ type: 'phase', y, phase: getPhaseFor(nodes, i)! })
      y += PHASE_CARD_H + PHASE_CARD_GAP
    }
    slots.push({ type: 'node', nodeY: y + NODE_R, nodeIdx: i, zigIdx: zigIdx++ })
    y += NODE_SPACING
  })
  return { slots, totalH: y + SVG_MARGIN_B }
}

/* ─── Confetti seed (stable per phase label) ─── */
function phaseConfettiParticles(label: string) {
  // Deterministic-ish using label char codes so it doesn't re-randomise on re-render
  return CONFETTI_COLORS.map((color, i) => {
    const seed = label.charCodeAt(i % label.length) + i * 37
    const tx = ((seed % 180) - 90) + 'px'
    const rot = (seed * 7 % 360) + 'deg'
    return { color, tx, rot, delay: i * 0.07 }
  })
}

/* ═══════════════════════════════════════════════════════════ */
export default function LeadershipPathPage() {
  const router   = useRouter()
  const supabase = createClient()
  const srm      = useReducedMotion()

  const [loading,         setLoading]         = useState(true)
  const [nodes,           setNodes]           = useState<PathNode[]>([])
  const [userName,        setUserName]        = useState('Líder Big Family')
  const [totalXP,         setTotalXP]         = useState(0)
  const [streak,          setStreak]          = useState(0)
  const [attMap,          setAttMap]          = useState<Record<string, AttemptData>>({})
  const [qCountMap,       setQCountMap]       = useState<Record<string, number>>({})
  const [selected,        setSelected]        = useState<PathNode | null>(null)
  const [hoveredLocked,   setHoveredLocked]   = useState<string | null>(null)
  const [celebPhases,     setCelebPhases]     = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const { data: { user: au } } = await supabase.auth.getUser()
      if (!au) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('full_name, school_level').eq('id', au.id).maybeSingle()
      const level = profile?.school_level ?? 'senior'

      const { data: mods } = await supabase
        .from('modules').select('*').eq('level', level).order('order_index')

      const moduleIds = (mods ?? []).map(m => m.id)

      const base = [
        supabase.from('xp_log').select('amount').eq('user_id', au.id),
        supabase.from('progress').select('module_id, completed').eq('user_id', au.id),
        supabase.from('progress').select('completed_at').eq('user_id', au.id).eq('completed', true),
      ] as const

      const extra = moduleIds.length
        ? [
            supabase.from('quiz_attempts').select('module_id, score, passed').eq('user_id', au.id).in('module_id', moduleIds),
            supabase.from('questions').select('module_id').in('module_id', moduleIds),
          ] as const
        : [
            Promise.resolve({ data: [] as { module_id: string; score: number; passed: boolean }[], error: null }),
            Promise.resolve({ data: [] as { module_id: string }[], error: null }),
          ] as const

      const [
        { data: xpRows },
        { data: prog },
        { data: progDates },
        { data: attRows },
        { data: qRows },
      ] = await Promise.all([...base, ...extra])

      const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.module_id))
      const total_xp     = (xpRows ?? []).reduce((s, r) => s + (r.amount ?? 0), 0)
      const streakDays   = calcStreak((progDates ?? []).map(r => r.completed_at).filter(Boolean) as string[])

      // Aggregate attempts
      const aMap: Record<string, AttemptData> = {}
      for (const r of attRows ?? []) {
        const e = aMap[r.module_id]
        if (!e) { aMap[r.module_id] = { count: 1, bestScore: r.score ?? null, passed: !!r.passed } }
        else {
          e.count++
          if (r.score != null && (e.bestScore === null || r.score > e.bestScore)) e.bestScore = r.score
          if (r.passed) e.passed = true
        }
      }

      // Aggregate question counts
      const qMap: Record<string, number> = {}
      for (const r of qRows ?? []) qMap[r.module_id] = (qMap[r.module_id] ?? 0) + 1

      // Build nodes
      let foundActive = false
      const built: PathNode[] = (mods ?? []).map(mod => {
        if (completedIds.has(mod.id)) return { module: mod as Module, state: 'completed' }
        if (!foundActive) { foundActive = true; return { module: mod as Module, state: 'active' } }
        return { module: mod as Module, state: 'locked' }
      })

      // Detect newly-completed phases for confetti
      const newCeleb = new Set<string>()
      PHASES.forEach(ph => {
        const phNodes = built.filter(n => n.module.order_index >= ph.range[0] && n.module.order_index <= ph.range[1])
        if (phNodes.length > 0 && phNodes.every(n => n.state === 'completed')) {
          const key = `phase_celebrated_${ph.label}`
          if (typeof localStorage !== 'undefined' && !localStorage.getItem(key)) {
            localStorage.setItem(key, '1')
            newCeleb.add(ph.label)
          }
        }
      })

      setUserName(profile?.full_name ?? 'Líder Big Family')
      setTotalXP(total_xp)
      setStreak(streakDays)
      setAttMap(aMap)
      setQCountMap(qMap)
      setNodes(built)
      setCelebPhases(newCeleb)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to active node
  useEffect(() => {
    if (loading || !nodes.length) return
    setTimeout(() => {
      document.getElementById('active-node')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 800)
  }, [loading, nodes])

  const { slots, totalH } = useMemo(
    () => loading ? { slots: [] as Slot[], totalH: 400 } : buildSlots(nodes),
    [nodes, loading]
  )

  const nodePositions = useMemo(
    () => (slots.filter((s): s is NodeSlot => s.type === 'node')
      .map(s => ({ x: ZIGZAG_XS[s.zigIdx % 3], y: s.nodeY }))),
    [slots]
  )

  const completedCount = nodes.filter(n => n.state === 'completed').length
  const fullPath       = useMemo(() => buildBezierPath(nodePositions), [nodePositions])
  const completedPath  = useMemo(
    () => buildBezierPath(nodePositions.slice(0, Math.max(completedCount + 1, 1))),
    [nodePositions, completedCount]
  )

  const remainingHours = useMemo(() => {
    const mins = nodes.filter(n => n.state !== 'completed')
      .reduce((s, n) => s + (n.module.duration_minutes ?? 30), 0)
    return Math.round(mins / 6) / 10
  }, [nodes])

  function isPhaseComplete(label: string) {
    const ph = PHASES.find(p => p.label === label)
    if (!ph) return false
    const pn = nodes.filter(n => n.module.order_index >= ph.range[0] && n.module.order_index <= ph.range[1])
    return pn.length > 0 && pn.every(n => n.state === 'completed')
  }

  function phaseModuleCount(label: string) {
    const ph = PHASES.find(p => p.label === label)
    if (!ph) return 0
    return nodes.filter(n => n.module.order_index >= ph.range[0] && n.module.order_index <= ph.range[1]).length
  }

  const selAtt   = selected ? (attMap[selected.module.id]   ?? { count: 0, bestScore: null, passed: false }) : null
  const selQCount = selected ? (qCountMap[selected.module.id] ?? 0) : 0
  const selPhase  = selected
    ? PHASES.find(p => selected.module.order_index >= p.range[0] && selected.module.order_index <= p.range[1])
    : null

  const userInitial = userName[0]?.toUpperCase() ?? 'L'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        @keyframes pulseGlow{0%,100%{filter:drop-shadow(0 0 2px rgba(192,57,43,.4))}50%{filter:drop-shadow(0 0 8px rgba(192,57,43,.8))}}
        @keyframes confettiPhase{0%{transform:translate(0,0) rotate(0deg);opacity:1}100%{transform:translate(var(--tx),80px) rotate(var(--rot));opacity:0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Inter",system-ui,sans-serif;color:var(--ink);}
        .lp-layout{display:grid;grid-template-columns:260px 1fr;min-height:100vh;max-width:1280px;margin:0 auto;}
        .lp-main{display:flex;flex-direction:column;min-width:0;overflow:hidden;}
        .lp-header{position:sticky;top:0;z-index:10;background:var(--bg);backdrop-filter:blur(16px);border-bottom:1px solid var(--line);padding:20px 40px;display:flex;align-items:center;justify-content:space-between;}
        .lp-header h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:22px;letter-spacing:-.02em;color:var(--ink);}
        .lp-header p{font-size:13px;color:var(--mute);margin-top:3px;}
        .lp-scroll{overflow-y:auto;flex:1;display:flex;flex-direction:column;align-items:center;padding:32px 20px 80px;}
        .lp-path-wrap{position:relative;}
        .node-wrap{position:absolute;transform:translate(-50%,-50%);}
        .node{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;will-change:transform;}
        .node-completed{background:#C0392B;color:#fff;box-shadow:0 0 0 8px rgba(192,57,43,.15);}
        .node-active{background:var(--card-bg);border:3px solid #C0392B;color:#C0392B;box-shadow:0 4px 24px -6px rgba(192,57,43,.3);}
        .node-locked{background:var(--bg-2);border:2px solid var(--line);color:var(--mute);opacity:.6;cursor:default;overflow:visible;}
        .continue-badge{position:absolute;top:-44px;left:50%;transform:translateX(-50%);white-space:nowrap;background:#C0392B;color:#fff;font-family:"Satoshi",sans-serif;font-weight:700;font-size:11px;padding:5px 12px;border-radius:999px;pointer-events:none;}
        .continue-badge::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:#C0392B;}
        .sk{border-radius:8px;background:linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%);background-size:400% 100%;animation:shimmer 1.4s ease infinite;}
        .phase-confetti-dot{position:absolute;width:7px;height:7px;border-radius:2px;top:50%;left:50%;animation:confettiPhase .8s ease-out forwards;pointer-events:none;}
        @media(max-width:860px){
          .lp-layout{grid-template-columns:1fr;}
          .sidebar{display:none;}
          .lp-header{padding:16px 20px;}
        }
      `}</style>

      <div className="lp-layout">
        <DashboardSidebar activePage="leadership-path" userName={userName} userInitial={userInitial} />

        <div className="lp-main">
          {/* Header */}
          <div className="lp-header">
            <div>
              <h1>Leadership Path</h1>
              <p>Tu camino de aprendizaje personalizado</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {streak >= 3 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(192,57,43,0.1)', borderRadius: 999, fontSize: 12, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, color: '#C0392B' }}>
                  🔥 {streak} días
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12 }}>
                <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 18, color: '#C0392B' }}>{totalXP.toLocaleString()}</span>
                <span style={{ fontSize: 11, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 600 }}>IC</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                <span style={{ color: '#C0392B' }}>{completedCount}</span> / {nodes.length} módulos
              </div>
            </div>
          </div>

          {/* Scroll area */}
          <div className="lp-scroll">

            {/* ── Progress summary card ── */}
            {!loading && nodes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  width: '100%', maxWidth: SVG_W + 60,
                  background: 'var(--card-bg)',
                  border: '1px solid rgba(13,13,13,0.08)',
                  borderRadius: 16, padding: '20px 28px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 32,
                  boxShadow: '0 2px 12px rgba(13,13,13,0.06)',
                  flexWrap: 'wrap', gap: 16,
                }}
              >
                <div>
                  <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 8 }}>
                    {completedCount} de {nodes.length} módulos completados
                  </div>
                  <div style={{ width: 200, height: 6, borderRadius: 999, background: '#f0ede8', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: nodes.length ? `${(completedCount / nodes.length) * 100}%` : '0%' }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                      style={{ height: '100%', background: '#C0392B', borderRadius: 999 }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 22, color: '#C0392B' }}>
                    ⭐ {totalXP.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>XP ganados</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--mute)', fontSize: 13 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  ~{remainingHours} horas restantes
                </div>
              </motion.div>
            )}

            {/* ── Path ── */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, paddingTop: 40 }}>
                {[1,2,3,4].map(i => <div key={i} className="sk" style={{ width: 72, height: 72, borderRadius: '50%' }} />)}
              </div>
            ) : nodes.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(192,57,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 10 }}>Próximamente</div>
                <div style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.6, maxWidth: 300 }}>
                  Estamos preparando el contenido para tu nivel. ¡Vuelve pronto para comenzar tu camino de liderazgo!
                </div>
              </div>
            ) : (
              <div className="lp-path-wrap" style={{ width: SVG_W, height: totalH }}>

                {/* SVG path */}
                <svg width={SVG_W} height={totalH} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                  {fullPath && (
                    <path d={fullPath} fill="none" stroke="#e0ddd8" strokeWidth="3" strokeDasharray="8 6" />
                  )}
                  {completedPath && completedCount > 0 && (
                    <motion.path
                      d={completedPath}
                      fill="none"
                      stroke="#C0392B"
                      strokeWidth="4"
                      strokeLinecap="round"
                      style={streak >= 3 ? { animation: 'pulseGlow 2s ease-in-out infinite' } : {}}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={srm ? { duration: 0 } : { duration: 1.5, ease: 'easeInOut', delay: 0.3 }}
                    />
                  )}
                </svg>

                {/* Slots */}
                {slots.map((slot, si) => {

                  /* ── Phase card ── */
                  if (slot.type === 'phase') {
                    const complete    = isPhaseComplete(slot.phase.label)
                    const modCount    = phaseModuleCount(slot.phase.label)
                    const celebrating = celebPhases.has(slot.phase.label)
                    const particles   = celebrating ? phaseConfettiParticles(slot.phase.label) : []

                    return (
                      <motion.div
                        key={`phase-${slot.phase.label}`}
                        style={{
                          position: 'absolute',
                          top: slot.y,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 280,
                          background: complete
                            ? 'linear-gradient(135deg,rgba(192,57,43,0.08),rgba(192,57,43,0.02))'
                            : 'var(--card-bg)',
                          border: `1px solid ${complete ? 'rgba(192,57,43,0.3)' : 'rgba(13,13,13,0.08)'}`,
                          borderRadius: 14,
                          padding: '14px 20px',
                          display: 'flex', alignItems: 'center', gap: 12,
                          boxShadow: '0 2px 12px rgba(13,13,13,0.06)',
                          overflow: 'visible',
                          zIndex: 2,
                        }}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={srm ? { duration: 0.15 } : { duration: 0.45 }}
                      >
                        {/* Phase confetti */}
                        {particles.map((p, pi) => (
                          <div
                            key={pi}
                            className="phase-confetti-dot"
                            style={{ background: p.color, '--tx': p.tx, '--rot': p.rot, animationDelay: `${p.delay}s` } as React.CSSProperties}
                          />
                        ))}

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C0392B', marginBottom: 2 }}>
                            {slot.phase.label}
                          </div>
                          <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                            {slot.phase.name}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                          <span style={{ fontSize: 12, color: '#6B6B6B' }}>{modCount} módulos</span>
                          {complete && (
                            <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(192,57,43,0.1)', color: '#C0392B', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 999, whiteSpace: 'nowrap' }}>
                              ✓ Fase completada
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )
                  }

                  /* ── Node ── */
                  const node     = nodes[slot.nodeIdx]
                  const prevNode = slot.nodeIdx > 0 ? nodes[slot.nodeIdx - 1] : null
                  const posX     = ZIGZAG_XS[slot.zigIdx % 3]
                  const posY     = slot.nodeY
                  const isActive    = node.state === 'active'
                  const isCompleted = node.state === 'completed'
                  const isLocked    = node.state === 'locked'

                  const springEntry = srm
                    ? { duration: 0.15 }
                    : { type: 'spring' as const, stiffness: 200, damping: 20, delay: slot.nodeIdx * 0.07 }

                  return (
                    <motion.div
                      key={node.module.id}
                      id={isActive ? 'active-node' : undefined}
                      className="node-wrap"
                      style={{ left: posX, top: posY }}
                      initial={{ opacity: 0, y: 40, scale: 0.8 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={springEntry}
                    >
                      {/* "Continúa aquí" badge */}
                      {isActive && (
                        <motion.div
                          className="continue-badge"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8 + slot.nodeIdx * 0.07 }}
                        >
                          ¡Continúa aquí!
                        </motion.div>
                      )}

                      {/* Streak badge — right of active node */}
                      {isActive && streak >= 3 && (
                        <div style={{
                          position: 'absolute',
                          left: NODE_R * 2 + 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(192,57,43,0.1)',
                          borderRadius: 999, padding: '3px 8px',
                          fontSize: 11, fontFamily: '"Satoshi",sans-serif',
                          fontWeight: 600, color: '#C0392B',
                          whiteSpace: 'nowrap',
                        }}>
                          🔥 {streak} días
                        </div>
                      )}

                      {/* ── Completed node ── */}
                      {isCompleted && (
                        <motion.div
                          className="node node-completed"
                          whileHover={srm ? {} : { scale: 1.05 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          onClick={() => setSelected(node)}
                        >
                          {CHECK_ICON}
                        </motion.div>
                      )}

                      {/* ── Active node ── */}
                      {isActive && (
                        <motion.div
                          className="node node-active"
                          animate={srm ? {} : { scale: [1, 1.06, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          whileHover={srm ? {} : { scale: 1.1 }}
                          onClick={() => setSelected(node)}
                        >
                          {NODE_ICONS[node.module.order_index] ?? NODE_ICONS[1]}
                        </motion.div>
                      )}

                      {/* ── Locked node ── */}
                      {isLocked && (
                        <div
                          className="node node-locked"
                          onMouseEnter={() => setHoveredLocked(node.module.id)}
                          onMouseLeave={() => setHoveredLocked(null)}
                        >
                          {LOCK_ICON}
                          <AnimatePresence>
                            {hoveredLocked === node.module.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                  position: 'absolute',
                                  bottom: '110%', left: '50%', transform: 'translateX(-50%)',
                                  background: '#0D0D0D', color: '#fff',
                                  fontSize: 12, borderRadius: 8,
                                  padding: '8px 12px',
                                  maxWidth: 200, textAlign: 'center',
                                  whiteSpace: 'normal', lineHeight: 1.4,
                                  pointerEvents: 'none', zIndex: 30,
                                }}
                              >
                                🔒 Completa &ldquo;{prevNode?.module.title ?? 'el módulo anterior'}&rdquo; para desbloquear
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Module name */}
                      <div style={{
                        position: 'absolute',
                        top: NODE_R * 2 + 8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: 'Inter,sans-serif',
                        color: isLocked ? 'var(--mute)' : '#0D0D0D',
                        textAlign: 'center',
                        maxWidth: 120,
                        whiteSpace: 'normal',
                        lineHeight: 1.35,
                      }}>
                        {String(node.module.order_index).padStart(2, '0')} · {node.module.title}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Side panel ── */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 49 }}
              onClick={() => setSelected(null)}
            />

            {/* Panel */}
            <motion.div
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
              {/* Close */}
              <button
                onClick={() => setSelected(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Phase badge */}
              {selPhase && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C0392B', marginBottom: 8 }}>
                  {selPhase.label} · {selPhase.name}
                </div>
              )}

              {/* Title */}
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 26, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 10 }}>
                {selected.module.title}
              </div>

              {/* Description */}
              <div style={{ fontSize: 14, color: '#6B6B6B', lineHeight: 1.65, marginBottom: 20 }}>
                {selected.module.description}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#C0392B', background: 'rgba(192,57,43,0.08)', padding: '5px 10px', borderRadius: 999 }}>
                  ⭐ {selected.module.xp_reward} XP
                </div>
                {selected.module.duration_minutes && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--mute)', background: 'var(--bg-2)', padding: '5px 10px', borderRadius: 999 }}>
                    🕐 {selected.module.duration_minutes} min
                  </div>
                )}
                {selQCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--mute)', background: 'var(--bg-2)', padding: '5px 10px', borderRadius: 999 }}>
                    📝 {selQCount} preguntas
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(13,13,13,0.08)', marginBottom: 18 }} />

              {/* Learn bullets */}
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 10 }}>Lo que aprenderás:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {LEARN_BULLETS.map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#6B6B6B', lineHeight: 1.5 }}>
                    <span style={{ color: '#C0392B', flexShrink: 0 }}>✓</span>{b}
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(13,13,13,0.08)', marginBottom: 18 }} />

              {/* Attempts info */}
              {selAtt && (
                <div style={{ marginBottom: 20 }}>
                  {selAtt.count === 0 ? (
                    <div style={{ padding: '10px 14px', background: '#D1FAE5', borderRadius: 10, fontSize: 13, color: '#065F46', fontWeight: 600 }}>✓ 2 intentos disponibles</div>
                  ) : selAtt.count === 1 ? (
                    <div style={{ padding: '10px 14px', background: '#FFFBEB', borderRadius: 10, fontSize: 13, color: '#92400E', fontWeight: 600 }}>⚠ 1 intento restante</div>
                  ) : (
                    <div style={{ padding: '10px 14px', background: '#FEE2E2', borderRadius: 10, fontSize: 13, color: '#991B1B', fontWeight: 600 }}>✗ Sin intentos disponibles</div>
                  )}
                </div>
              )}

              {/* CTA */}
              <div style={{ marginTop: 'auto' }}>
                {selected.state === 'completed' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#D1FAE5', borderRadius: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: '#065F46', fontWeight: 700 }}>✓ Módulo completado</span>
                      {selAtt?.bestScore != null && (
                        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#065F46', fontWeight: 600 }}>{selAtt.bestScore}%</span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/modules/${selected.module.id}`)}
                      style={{ width: '100%', padding: '14px', background: 'transparent', border: '1.5px solid rgba(13,13,13,0.15)', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--ink)', cursor: 'pointer' }}
                    >
                      Revisar módulo
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => router.push(`/dashboard/modules/${selected.module.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#a93226')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#C0392B')}
                    style={{ width: '100%', padding: '14px', background: '#C0392B', border: 'none', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: '#fff', cursor: 'pointer', transition: 'background .2s' }}
                  >
                    Comenzar módulo →
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
