'use client'
export const dynamic = 'force-dynamic'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'

// ── Types ─────────────────────────────────────────────────────────────────────
interface TeamMember { nombre: string; rol: string }
interface Plan       { id: string; texto: string; fecha: string; completado: boolean }
interface GVData     { meta_nucleo: string; creencias: string; paradigma: string; equipo: TeamMember[]; planes: Plan[] }

type NodeKey = 'meta' | 'creencias' | 'paradigma' | 'equipo' | 'planes'

// ── SVG geometry ──────────────────────────────────────────────────────────────
// viewBox 800 × 600 — central ellipse at (400, 300)
const CX = 400, CY = 300  // ellipse center
const ERX = 110, ERY = 75  // ellipse radii

// Satellite node centers (hardcoded — cardinal positions)
const SAT = {
  creencias: { cx: 400, cy:  90 },
  paradigma: { cx: 680, cy: 300 },
  planes:    { cx: 400, cy: 510 },
  equipo:    { cx: 120, cy: 300 },
} as const

// Rect dimensions for satellite nodes: w=140, h=110, rx=16
const RW = 140, RH = 110, RRX = 16

// Bezier curves from (CX,CY) to each satellite center — lateral offset 30px
const CONN_PATHS: Record<string, string> = {
  creencias: `M${CX},${CY} Q430,195 400,90`,
  paradigma: `M${CX},${CY} Q540,330 680,300`,
  planes:    `M${CX},${CY} Q370,405 400,510`,
  equipo:    `M${CX},${CY} Q260,270 120,300`,
}

// Per-node design tokens
const NODE_CFG: Record<string, { label: string; stroke: string; labelColor: string; lineColor: string }> = {
  creencias: { label: 'CREENCIAS', stroke: '#0F7B6C', labelColor: '#0F7B6C', lineColor: '#0F7B6C' },
  paradigma: { label: 'PARADIGMA', stroke: '#D4821A', labelColor: '#D4821A', lineColor: '#D4821A' },
  planes:    { label: 'PLANES',    stroke: '#C0392B', labelColor: '#C0392B', lineColor: '#C0392B' },
  equipo:    { label: 'EQUIPO',    stroke: 'rgba(13,13,13,0.28)', labelColor: 'rgba(13,13,13,0.5)', lineColor: 'rgba(13,13,13,0.18)' },
}

const SAT_KEYS = ['creencias', 'paradigma', 'planes', 'equipo'] as const

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_GV: GVData = {
  meta_nucleo: 'Crear un programa de mentoría entre estudiantes en los 8 colegios de La Guajira',
  creencias:   'Creo que el liderazgo nace en la comunidad, no en los libros. Cada joven tiene algo valioso que enseñar.',
  paradigma:   'Veo en cada obstáculo una oportunidad de aprender. Mi comunidad tiene más fortalezas que problemas.',
  equipo: [
    { nombre: 'Luis B.',  rol: 'Mentor'    },
    { nombre: 'Samuel',   rol: 'Feedback'  },
    { nombre: 'María',    rol: 'Ejecución' },
  ],
  planes: [
    { id: 'p1', texto: 'Hablar con el rector esta semana',          fecha: '2026-06-07', completado: false },
    { id: 'p2', texto: 'Formar el primer grupo piloto en marzo',    fecha: '2026-07-01', completado: false },
    { id: 'p3', texto: 'Presentar resultados en el Día de Liderazgo', fecha: '2026-05-16', completado: true },
  ],
}

const genId = () => `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── MapSVG — memoized to prevent re-render on panel state changes ─────────────
interface MapSVGProps {
  data:      GVData
  panel:     NodeKey | null
  hovered:   NodeKey | null
  pref:      boolean | null
  ready:     boolean
  onNodeClick:  (k: NodeKey) => void
  onNodeEnter:  (k: NodeKey) => void
  onNodeLeave:  () => void
}

const MapSVG = memo(function MapSVG({
  data, panel, hovered, pref, ready,
  onNodeClick, onNodeEnter, onNodeLeave,
}: MapSVGProps) {

  function nodeContent(key: string) {
    const { equipo, planes, creencias, paradigma } = data
    const cfg = NODE_CFG[key]

    if (key === 'equipo') {
      const visible = equipo.slice(0, 3)
      const extra   = equipo.length - 3
      return (
        <div style={{ padding: '8px 8px 6px', height: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: cfg.labelColor, textTransform: 'uppercase' }}>
            {cfg.label}
          </span>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {visible.map((mem, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: '50%', background: '#C0392B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'Satoshi,sans-serif', flexShrink: 0,
              }}>
                {mem.nombre.charAt(0).toUpperCase()}
              </div>
            ))}
            {extra > 0 && (
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: 'var(--mute)', fontFamily: 'Satoshi,sans-serif',
              }}>
                +{extra}
              </div>
            )}
          </div>
          {visible.length > 0 && (
            <div style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 9, color: 'var(--mute)', textAlign: 'center', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {visible.map(m => m.nombre).join(', ')}
            </div>
          )}
        </div>
      )
    }

    if (key === 'planes') {
      return (
        <div style={{ padding: '8px 8px 6px', height: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: cfg.labelColor, textTransform: 'uppercase' }}>
            {cfg.label}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {planes.slice(0, 3).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                  background: p.completado ? '#0F7B6C' : '#C0392B',
                }} />
                <span style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 10, color: p.completado ? 'var(--mute)' : 'var(--ink-2)', lineHeight: 1.4, textDecoration: p.completado ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.texto}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // creencias / paradigma — text
    const text = key === 'creencias' ? creencias : paradigma
    return (
      <div style={{ padding: '8px 8px 6px', height: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: cfg.labelColor, textTransform: 'uppercase' }}>
          {cfg.label}
        </span>
        <span style={{
          fontFamily: 'Satoshi,sans-serif', fontSize: 11,
          color: 'var(--ink-2,#2D2D2D)', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {text || '—'}
        </span>
      </div>
    )
  }

  return (
    <svg
      viewBox="0 0 800 600"
      style={{ width: '100%', height: 'auto', display: 'block', minWidth: 600 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Dot grid pattern */}
        <pattern id="gv-dotgrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.8" fill="rgba(13,13,13,0.06)" />
        </pattern>
        {/* Central ellipse shadow */}
        <filter id="gv-shadow-red" x="-30%" y="-40%" width="160%" height="180%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#C0392B" floodOpacity="0.35" />
        </filter>
        {/* Card node shadow */}
        <filter id="gv-shadow-card" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(13,13,13,0.08)" />
        </filter>
      </defs>

      {/* Dot grid background */}
      <rect width="800" height="600" fill="url(#gv-dotgrid)" />

      {/* Connection lines — drawn below nodes */}
      {ready && SAT_KEYS.map((key, i) => {
        const isHov = hovered === key
        const cfg   = NODE_CFG[key]
        return (
          <m.path
            key={key}
            d={CONN_PATHS[key]}
            stroke={isHov ? cfg.lineColor : 'rgba(13,13,13,0.14)'}
            strokeWidth={1.5}
            fill="none"
            style={{ transition: 'stroke 0.2s' }}
            initial={pref ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 1.4 + i * 0.02, ease: [0.22, 1, 0.36, 1] }}
          />
        )
      })}

      {/* Central ellipse */}
      <m.ellipse
        cx={CX} cy={CY} rx={ERX} ry={ERY}
        fill="#C0392B"
        filter="url(#gv-shadow-red)"
        style={{ cursor: 'pointer', transformOrigin: `${CX}px ${CY}px` }}
        initial={pref ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: panel === 'meta' ? 1.03 : 1.02 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.7 }}
        onClick={() => onNodeClick('meta')}
        onHoverStart={() => onNodeEnter('meta')}
        onHoverEnd={onNodeLeave}
      />

      {/* Central text */}
      {ready && (
        <m.g
          initial={pref ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 1.1 }}
          style={{ pointerEvents: 'none' }}
        >
          <foreignObject x={CX - 90} y={CY - 50} width={180} height={90}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 180, height: 90, padding: '0 10px', textAlign: 'center', overflow: 'hidden',
            }}>
              <span style={{
                fontFamily: '"Instrument Serif",serif', fontStyle: 'italic',
                fontSize: data.meta_nucleo.split(/\s+/).length <= 8 ? 15 : 13,
                fontWeight: 600, color: '#FFFFFF', lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {data.meta_nucleo || 'Tu Meta Núcleo'}
              </span>
            </div>
          </foreignObject>
        </m.g>
      )}

      {/* "META NÚCLEO" label below ellipse */}
      {ready && (
        <m.text
          x={CX} y={CY + ERY + 18}
          textAnchor="middle"
          initial={pref ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.9 }}
          style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 9, fontWeight: 700, fill: '#C0392B', letterSpacing: '0.2em', pointerEvents: 'none' }}
        >
          META NÚCLEO
        </m.text>
      )}

      {/* Satellite nodes */}
      {SAT_KEYS.map((key, i) => {
        const { cx, cy } = SAT[key]
        const rx = cx - RW / 2, ry = cy - RH / 2
        const cfg    = NODE_CFG[key]
        const isOpen = panel === key
        const isDim  = !!panel && panel !== key && panel !== 'meta'

        return (
          <m.g
            key={key}
            style={{ cursor: 'pointer', transformOrigin: `${cx}px ${cy}px` }}
            initial={pref ? false : { scale: 0.8, opacity: 0 }}
            animate={{
              scale:   isOpen ? 1.03 : isDim ? 0.97 : 1,
              opacity: isDim ? 0.4 : 1,
            }}
            whileHover={{ scale: isOpen ? 1.03 : 1.04 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22, delay: pref ? 0 : 1.8 + i * 0.1 }}
            onClick={() => onNodeClick(key)}
            onHoverStart={() => onNodeEnter(key)}
            onHoverEnd={onNodeLeave}
          >
            <rect
              x={rx} y={ry} width={RW} height={RH} rx={RRX}
              fill="var(--card-bg,#fff)"
              stroke={isOpen || hovered === key ? cfg.stroke : cfg.stroke}
              strokeWidth={isOpen || hovered === key ? 2 : 1.5}
              filter="url(#gv-shadow-card)"
              style={{ transition: 'stroke-width 0.15s' }}
            />
            {/* Content */}
            {ready && (
              <m.g
                initial={pref ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 22, delay: pref ? 0 : 2.2 + i * 0.08 }}
                style={{ pointerEvents: 'none' }}
              >
                <foreignObject x={rx + 8} y={ry + 8} width={RW - 16} height={RH - 16}>
                  {nodeContent(key)}
                </foreignObject>
              </m.g>
            )}
          </m.g>
        )
      })}
    </svg>
  )
})

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GreatVentureMapaPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapRef      = useRef<HTMLDivElement>(null)
  const pref        = useReducedMotion()

  const [data,       setData]       = useState<GVData>(MOCK_GV)
  const [userId,     setUserId]     = useState('')
  const [userName,   setUserName]   = useState('')
  const [updatedAt,  setUpdatedAt]  = useState('')
  const [loading,    setLoading]    = useState(true)
  const [ready,      setReady]      = useState(false)
  const [panel,      setPanel]      = useState<NodeKey | null>(null)
  const [hovered,    setHovered]    = useState<NodeKey | null>(null)
  const [autoSaved,  setAutoSaved]  = useState(false)

  // Panel edit state
  const [editText,     setEditText]     = useState('')
  const [editNombre,   setEditNombre]   = useState('')
  const [editRol,      setEditRol]      = useState('')
  const [editPlanText, setEditPlanText] = useState('')
  const [editPlanDate, setEditPlanDate] = useState('')

  // ── Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      if (MOCK_MODE) {
        setData(MOCK_GV)
        setUserId(MOCK.currentUser.id)
        setUserName(MOCK.currentUser.name.split(' ')[0])
        setUpdatedAt(new Date().toISOString())
        setLoading(false)
        setTimeout(() => setReady(true), 100)
        return
      }
      if (!supabaseRef.current) supabaseRef.current = createClient()
      const sb = supabaseRef.current
      if (!sb) return
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const [{ data: prof }, { data: gv }] = await Promise.all([
        sb.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
        sb.from('great_ventures').select('*').eq('user_id', user.id).maybeSingle(),
      ])

      if (prof?.display_name) setUserName(prof.display_name.split(' ')[0])
      if (gv) {
        setData({
          meta_nucleo: gv.meta_nucleo ?? '',
          creencias:   gv.creencias ?? '',
          paradigma:   gv.paradigma ?? '',
          equipo:      (gv.equipo as TeamMember[]) ?? [],
          planes:      (gv.planes as Plan[]) ?? [],
        })
        setUpdatedAt(gv.updated_at ?? '')
      }
      setLoading(false)
      setTimeout(() => setReady(true), 100)
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
      const now = new Date().toISOString()
      await sb.from('great_ventures').upsert(
        { user_id: userId, ...d, updated_at: now },
        { onConflict: 'user_id' }
      )
      setUpdatedAt(now)
      setAutoSaved(true)
      setTimeout(() => setAutoSaved(false), 2200)
    }, 800)
  }, [userId])

  function updateData(partial: Partial<GVData>) {
    setData(prev => { const next = { ...prev, ...partial }; scheduleSave(next); return next })
  }

  // ── Panel ────────────────────────────────────────────────────────────────
  const openPanel = useCallback((key: NodeKey) => {
    setPanel(key)
    setEditText(
      key === 'meta'      ? data.meta_nucleo :
      key === 'creencias' ? data.creencias :
      key === 'paradigma' ? data.paradigma : ''
    )
    setEditNombre(''); setEditRol(''); setEditPlanText(''); setEditPlanDate('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.meta_nucleo, data.creencias, data.paradigma])

  const closePanel = useCallback(() => setPanel(null), [])

  function savePanel() {
    if (panel === 'meta')      updateData({ meta_nucleo: editText })
    if (panel === 'creencias') updateData({ creencias: editText })
    if (panel === 'paradigma') updateData({ paradigma: editText })
  }

  function addEquipoMember() {
    if (!editNombre.trim() || data.equipo.length >= 5) return
    updateData({ equipo: [...data.equipo, { nombre: editNombre.trim(), rol: editRol.trim() }] })
    setEditNombre(''); setEditRol('')
  }
  function removeEquipoMember(i: number) {
    updateData({ equipo: data.equipo.filter((_, idx) => idx !== i) })
  }
  function addPlan() {
    if (!editPlanText.trim() || data.planes.length >= 5) return
    updateData({ planes: [...data.planes, { id: genId(), texto: editPlanText.trim(), fecha: editPlanDate, completado: false }] })
    setEditPlanText(''); setEditPlanDate('')
  }
  function removePlan(id: string) {
    updateData({ planes: data.planes.filter(p => p.id !== id) })
  }
  function togglePlan(id: string) {
    updateData({ planes: data.planes.map(p => p.id === id ? { ...p, completado: !p.completado } : p) })
  }

  const onNodeEnter  = useCallback((k: NodeKey) => setHovered(k), [])
  const onNodeLeave  = useCallback(() => setHovered(null), [])

  // ── Export ───────────────────────────────────────────────────────────────
  async function exportPNG() {
    const el = mapRef.current
    if (!el) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true,
        backgroundColor: 'var(--card-bg, #ffffff)',
        logging: false,
      })
      const a = document.createElement('a')
      a.download = `great-venture-${userName || 'mapa'}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    } catch (err) { console.error('[export]', err) }
  }

  // ── Panel node config ────────────────────────────────────────────────────
  const panelCfg = panel && panel !== 'meta' ? NODE_CFG[panel] : null
  const panelColor = panel === 'meta' ? '#C0392B' : panelCfg?.labelColor ?? 'var(--ink)'

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: '#C0392B', animation: 'gv-spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', overflowY: 'auto' }}>
      <style>{`
        @keyframes gv-spin{to{transform:rotate(360deg)}}
        .gvm-inner{max-width:900px;margin:0 auto;padding:40px 24px 80px;}
        .gvm-header{margin-bottom:32px;}
        .gvm-eyebrow{font-family:"Satoshi",sans-serif;font-weight:700;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#C0392B;margin-bottom:10px;}
        .gvm-title{font-family:"Instrument Serif",serif;font-style:italic;font-size:clamp(1.8rem,4vw,2.8rem);color:var(--ink);letter-spacing:-0.01em;line-height:1.1;margin-bottom:8px;}
        .gvm-updated{font-family:"Satoshi",sans-serif;font-size:13px;color:var(--mute);}
        .gvm-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:24px;padding:48px;box-shadow:0 4px 16px rgba(13,13,13,.08),0 2px 6px rgba(13,13,13,.04);position:relative;overflow:hidden;}
        .gvm-card-scroll{overflow-x:auto;}
        .gvm-actions{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:28px;flex-wrap:wrap;}
        .gvm-btn-ghost{padding:10px 20px;background:none;border:1px solid var(--line);border-radius:999px;font-family:"Satoshi",sans-serif;font-size:13px;font-weight:600;color:var(--mute);cursor:pointer;transition:border-color .2s,color .2s;}
        .gvm-btn-ghost:hover{border-color:var(--ink);color:var(--ink);}
        .gvm-btn-outline{padding:10px 20px;background:none;border:1px solid var(--ink);border-radius:999px;font-family:"Satoshi",sans-serif;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;transition:background .2s,color .2s;}
        .gvm-btn-outline:hover{background:var(--ink);color:var(--bg);}
        .gvm-btn-primary{padding:10px 24px;background:#C0392B;border:none;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:13px;font-weight:700;color:#fff;cursor:pointer;transition:background .2s;}
        .gvm-btn-primary:hover{background:#a93226;}

        /* Edit panel — light */
        .gvm-panel{position:fixed;top:0;right:0;bottom:0;width:320px;background:var(--card-bg);border-left:1px solid var(--card-border);z-index:300;overflow-y:auto;padding:32px 24px;}
        .gvm-panel__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
        .gvm-panel__title{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;}
        .gvm-panel__close{background:none;border:none;cursor:pointer;color:var(--mute);font-size:18px;padding:4px;line-height:1;transition:color .15s;}
        .gvm-panel__close:hover{color:var(--ink);}
        .gvm-panel__saved{font-family:"Satoshi",sans-serif;font-size:11px;color:var(--accent-teal,#0F7B6C);display:flex;align-items:center;gap:4px;}
        .gvm-ta{width:100%;min-height:140px;padding:12px 14px;background:var(--bg-2);border:1.5px solid var(--line);border-radius:12px;font-family:"Satoshi",sans-serif;font-size:14px;color:var(--ink);line-height:1.65;resize:vertical;outline:none;transition:border-color .2s;}
        .gvm-ta:focus{border-color:rgba(192,57,43,.5);}
        .gvm-save-btn{margin-top:12px;width:100%;padding:10px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s;}
        .gvm-save-btn:hover{background:#a93226;}
        .gvm-input{width:100%;padding:9px 12px;background:var(--bg-2);border:1.5px solid var(--line);border-radius:9px;font-family:"Satoshi",sans-serif;font-size:13px;color:var(--ink);outline:none;transition:border-color .2s;margin-bottom:8px;}
        .gvm-input:focus{border-color:rgba(192,57,43,.5);}
        .gvm-add-btn{padding:8px 14px;background:#C0392B;border:none;border-radius:8px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:12px;color:#fff;cursor:pointer;margin-bottom:12px;}
        .gvm-add-btn:disabled{opacity:.4;cursor:not-allowed;}
        .gvm-chip{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg-2);border:1px solid var(--line);border-radius:8px;margin-bottom:6px;}
        .gvm-chip-x{background:none;border:none;cursor:pointer;color:var(--mute);font-size:14px;margin-left:auto;padding:2px;transition:color .15s;}
        .gvm-chip-x:hover{color:#C0392B;}
        .gvm-pcheck{width:16px;height:16px;border-radius:4px;border:1.5px solid var(--line);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s,border-color .15s;}
        .gvm-pcheck.done{background:#22c55e;border-color:#22c55e;}
        @media(max-width:768px){
          .gvm-inner{padding:24px 16px 60px;}
          .gvm-card{padding:24px 16px;}
          .gvm-panel{top:auto;right:0;left:0;bottom:0;width:100%;border-left:none;border-top:1px solid var(--card-border);border-radius:20px 20px 0 0;padding:24px 20px 40px;}
        }
      `}</style>

      <div className="gvm-inner">
        {/* ── Header ── */}
        <m.header
          className="gvm-header"
          initial={pref ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.3 }}
        >
          <div className="gvm-eyebrow">THE GREAT VENTURE</div>
          <h1 className="gvm-title">
            El mapa de {userName || 'tu liderazgo'}
          </h1>
          {updatedAt && (
            <p className="gvm-updated">Actualizado el {fmtDate(updatedAt)}</p>
          )}
        </m.header>

        {/* ── Map card ── */}
        <m.div
          ref={mapRef}
          className="gvm-card"
          initial={pref ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="gvm-card-scroll">
            <MapSVG
              data={data}
              panel={panel}
              hovered={hovered}
              pref={pref}
              ready={ready}
              onNodeClick={openPanel}
              onNodeEnter={onNodeEnter}
              onNodeLeave={onNodeLeave}
            />
          </div>
        </m.div>

        {/* ── Action buttons ── */}
        <div className="gvm-actions">
          <m.button
            className="gvm-btn-ghost"
            onClick={() => router.push('/dashboard/great-venture')}
            whileHover={pref ? undefined : { y: -1, scale: 1.01 }}
            whileTap={pref ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            ← Editar en wizard
          </m.button>
          <m.button
            className="gvm-btn-outline"
            onClick={exportPNG}
            whileHover={pref ? undefined : { y: -1, scale: 1.01 }}
            whileTap={pref ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            Exportar PNG
          </m.button>
          <m.button
            className="gvm-btn-primary"
            onClick={() => router.push('/dashboard')}
            whileHover={pref ? undefined : { y: -1, scale: 1.01 }}
            whileTap={pref ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            Ir al dashboard →
          </m.button>
        </div>
      </div>

      {/* ── Edit panel ── */}
      <AnimatePresence>
        {panel && (
          <m.div
            className="gvm-panel"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            style={{ ['--panel-color' as string]: panelColor }}
          >
            <div className="gvm-panel__head">
              <span className="gvm-panel__title" style={{ color: panelColor }}>
                {panel === 'meta' ? 'META NÚCLEO' : NODE_CFG[panel].label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AnimatePresence>
                  {autoSaved && (
                    <m.span
                      className="gvm-panel__saved"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Guardado
                    </m.span>
                  )}
                </AnimatePresence>
                <button className="gvm-panel__close" onClick={closePanel}>×</button>
              </div>
            </div>

            {/* Text panels */}
            {(panel === 'meta' || panel === 'creencias' || panel === 'paradigma') && (
              <>
                <textarea
                  className="gvm-ta"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={savePanel}
                  placeholder={
                    panel === 'meta'      ? 'Tu gran sueño como líder...' :
                    panel === 'creencias' ? 'Las convicciones que te sostienen...' :
                                           'Cómo ves y lees el mundo...'
                  }
                  maxLength={1500}
                />
                <button className="gvm-save-btn" onClick={() => { savePanel(); closePanel() }}>
                  Guardar
                </button>
              </>
            )}

            {/* Equipo panel */}
            {panel === 'equipo' && (
              <>
                <input className="gvm-input" placeholder="Nombre" value={editNombre} onChange={e => setEditNombre(e.target.value)} maxLength={50} />
                <input className="gvm-input" placeholder="Rol en tu vida" value={editRol} onChange={e => setEditRol(e.target.value)} maxLength={80} />
                <button className="gvm-add-btn" onClick={addEquipoMember} disabled={!editNombre.trim() || data.equipo.length >= 5}>
                  + Agregar persona
                </button>
                {data.equipo.map((mem, i) => (
                  <div key={i} className="gvm-chip">
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#C0392B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'Satoshi,sans-serif', flexShrink: 0 }}>
                      {mem.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 13, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mem.nombre}</div>
                      {mem.rol && <div style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 11, color: 'var(--mute)' }}>{mem.rol}</div>}
                    </div>
                    <button className="gvm-chip-x" onClick={() => removeEquipoMember(i)}>×</button>
                  </div>
                ))}
              </>
            )}

            {/* Planes panel */}
            {panel === 'planes' && (
              <>
                <input className="gvm-input" placeholder="Describe el paso..." value={editPlanText} onChange={e => setEditPlanText(e.target.value)} maxLength={120} />
                <input className="gvm-input" type="date" value={editPlanDate} onChange={e => setEditPlanDate(e.target.value)} />
                <button className="gvm-add-btn" onClick={addPlan} disabled={!editPlanText.trim() || data.planes.length >= 5}>
                  + Agregar paso
                </button>
                {data.planes.map(p => (
                  <div key={p.id} className="gvm-chip">
                    <button className={`gvm-pcheck${p.completado ? ' done' : ''}`} onClick={() => togglePlan(p.id)}>
                      {p.completado && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 13, color: p.completado ? 'var(--mute)' : 'var(--ink)', textDecoration: p.completado ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.texto}</div>
                      {p.fecha && <div style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{fmtDate(p.fecha + 'T00:00:00')}</div>}
                    </div>
                    <button className="gvm-chip-x" onClick={() => removePlan(p.id)}>×</button>
                  </div>
                ))}
              </>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
