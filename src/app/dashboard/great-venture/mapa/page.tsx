'use client'
export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'

// ── Types ─────────────────────────────────────────────────────────────────────
interface TeamMember { nombre: string; rol: string }
interface Plan       { id: string; texto: string; fecha: string; completado: boolean }
interface GVData     { meta_nucleo: string; creencias: string; paradigma: string; equipo: TeamMember[]; planes: Plan[] }

type NodeKey = 'meta' | 'creencias' | 'paradigma' | 'equipo' | 'planes'

// ── SVG constants ─────────────────────────────────────────────────────────────
const W  = 900, H  = 680
const CX = 450, CY = 340
const CR = 80    // central node radius
const SR = 56    // satellite node radius
const SD = 240   // satellite distance from center

const SATELLITES: { key: NodeKey; label: string; angle: number }[] = [
  { key: 'creencias', label: 'CREENCIAS', angle: -90  },
  { key: 'paradigma', label: 'PARADIGMA', angle:   0  },
  { key: 'planes',    label: 'PLANES',    angle:  90  },
  { key: 'equipo',    label: 'EQUIPO',    angle: 180  },
]

function rad(d: number) { return (d * Math.PI) / 180 }
function sat(angle: number) {
  return { x: CX + SD * Math.cos(rad(angle)), y: CY + SD * Math.sin(rad(angle)) }
}
function curvePath(angle: number) {
  const { x: x2, y: y2 } = sat(angle)
  const dx = x2 - CX, dy = y2 - CY
  const cpx = CX + dx * 0.5 + dy * 0.12
  const cpy = CY + dy * 0.5 - dx * 0.12
  return `M${CX},${CY} Q${cpx},${cpy} ${x2},${y2}`
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_GV: GVData = {
  meta_nucleo: 'Crear un programa de mentoría entre estudiantes en los 8 colegios de La Guajira',
  creencias:   'Creo que el liderazgo nace en la comunidad, no en los libros',
  paradigma:   'Veo en cada joven el potencial de cambiar su entorno',
  equipo:      [{ nombre: 'Luis B.', rol: 'mi mentor' }, { nombre: 'Samuel', rol: 'me da feedback' }, { nombre: 'María', rol: 'ejecución' }],
  planes:      [
    { id: 'p1', texto: 'Hablar con el rector esta semana',            fecha: '2026-06-07', completado: false },
    { id: 'p2', texto: 'Formar el primer grupo piloto',               fecha: '2026-07-01', completado: false },
    { id: 'p3', texto: 'Presentar en el Día de Liderazgo',            fecha: '2026-05-16', completado: true  },
  ],
}

const genId = () => `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

// ── Component ─────────────────────────────────────────────────────────────────
export default function GreatVentureMapaPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapRef      = useRef<HTMLDivElement>(null)
  const pref        = useReducedMotion()

  const [data,      setData]      = useState<GVData>(MOCK_GV)
  const [userId,    setUserId]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [ready,     setReady]     = useState(false)
  const [panel,     setPanel]     = useState<NodeKey | null>(null)

  // Panel edit state
  const [editText,      setEditText]      = useState('')
  const [editNombre,    setEditNombre]    = useState('')
  const [editRol,       setEditRol]       = useState('')
  const [editPlanText,  setEditPlanText]  = useState('')
  const [editPlanDate,  setEditPlanDate]  = useState('')

  // ── Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      if (MOCK_MODE) {
        setData(MOCK_GV); setUserId(MOCK.currentUser.id); setLoading(false)
        setTimeout(() => setReady(true), 100)
        return
      }
      if (!supabaseRef.current) supabaseRef.current = createClient()
      const sb = supabaseRef.current
      if (!sb) return
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      const { data: gv } = await sb.from('great_ventures').select('*').eq('user_id', user.id).maybeSingle()
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
      const sb = supabaseRef.current; if (!sb) return
      await sb.from('great_ventures').upsert(
        { user_id: userId, ...d, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    }, 800)
  }, [userId])

  function updateData(partial: Partial<GVData>) {
    setData(prev => { const next = { ...prev, ...partial }; scheduleSave(next); return next })
  }

  // ── Panel open/close ─────────────────────────────────────────────────────
  function openPanel(key: NodeKey) {
    setPanel(key)
    if (key === 'meta')      setEditText(data.meta_nucleo)
    if (key === 'creencias') setEditText(data.creencias)
    if (key === 'paradigma') setEditText(data.paradigma)
    setEditNombre(''); setEditRol(''); setEditPlanText(''); setEditPlanDate('')
  }
  function closePanel() { setPanel(null) }

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

  // ── Export PNG ──────────────────────────────────────────────────────────
  async function exportPNG() {
    const el = mapRef.current
    if (!el) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#0D0D0D', logging: false })
      const a = document.createElement('a')
      a.download = 'great-venture.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    } catch (err) { console.error('[export]', err) }
  }

  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#C0392B', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#0D0D0D', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .gvm-top{position:absolute;top:0;left:0;right:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:20px 28px;}
        .gvm-top-btn{background:none;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:7px 14px;font-family:"Satoshi",sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,.55);cursor:pointer;transition:border-color .2s,color .2s;}
        .gvm-top-btn:hover{border-color:rgba(255,255,255,.35);color:rgba(255,255,255,.85);}
        .gvm-export{background:none;border:1px solid rgba(192,57,43,.4);border-radius:999px;padding:7px 14px;font-family:"Satoshi",sans-serif;font-size:12px;font-weight:700;color:#C0392B;cursor:pointer;transition:border-color .2s,background .2s;}
        .gvm-export:hover{background:rgba(192,57,43,.08);}
        .gvm-canvas{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
        .gvm-svg-wrap{width:100%;max-width:900px;aspect-ratio:900/680;}
        .gvm-bottom{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);}
        .gvm-dash-btn{padding:12px 28px;background:rgba(192,57,43,.15);border:1px solid rgba(192,57,43,.35);border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#C0392B;cursor:pointer;transition:background .2s;white-space:nowrap;}
        .gvm-dash-btn:hover{background:rgba(192,57,43,.25);}

        /* Panel */
        .gvm-panel{position:fixed;top:0;right:0;bottom:0;width:360px;background:rgba(20,19,17,0.98);border-left:1px solid rgba(255,255,255,.08);backdrop-filter:blur(12px);z-index:20;overflow-y:auto;padding:28px 24px;}
        .gvm-panel__title{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:16px;}
        .gvm-panel__close{position:absolute;top:20px;right:20px;background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);font-size:18px;line-height:1;transition:color .15s;padding:4px;}
        .gvm-panel__close:hover{color:rgba(255,255,255,.8);}
        .gvm-ta{width:100%;min-height:140px;padding:12px 14px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);border-radius:12px;font-family:"Satoshi",sans-serif;font-size:14px;color:rgba(255,255,255,.85);line-height:1.65;resize:vertical;outline:none;transition:border-color .2s;}
        .gvm-ta:focus{border-color:rgba(192,57,43,.5);}
        .gvm-save-btn{margin-top:12px;width:100%;padding:10px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s;}
        .gvm-save-btn:hover{background:#a93226;}
        .gvm-p-input{width:100%;padding:9px 12px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-family:"Satoshi",sans-serif;font-size:13px;color:rgba(255,255,255,.8);outline:none;transition:border-color .2s;margin-bottom:8px;}
        .gvm-p-input:focus{border-color:rgba(192,57,43,.5);}
        .gvm-p-add{padding:8px 14px;background:#C0392B;border:none;border-radius:8px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:12px;color:#fff;cursor:pointer;margin-bottom:12px;}
        .gvm-p-add:disabled{opacity:.4;cursor:not-allowed;}
        .gvm-p-chip{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;margin-bottom:6px;}
        .gvm-p-chip-x{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.3);font-size:14px;margin-left:auto;padding:2px;transition:color .15s;}
        .gvm-p-chip-x:hover{color:#C0392B;}
        .gvm-p-check{width:16px;height:16px;border-radius:4px;border:1.5px solid rgba(255,255,255,.25);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;}
        .gvm-p-check.done{background:#22c55e;border-color:#22c55e;}
      `}</style>

      {/* Top controls */}
      <div className="gvm-top">
        <button className="gvm-top-btn" onClick={() => router.push('/dashboard/great-venture')}>← Volver al wizard</button>
        <button className="gvm-export" onClick={exportPNG}>Exportar PNG</button>
      </div>

      {/* Map canvas */}
      <m.div
        className="gvm-canvas"
        initial={pref ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div ref={mapRef} className="gvm-svg-wrap">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: '100%' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Connection curves */}
            {ready && SATELLITES.map((s, i) => (
              <m.path
                key={s.key}
                d={curvePath(s.angle)}
                stroke="rgba(192,57,43,0.4)"
                strokeWidth={1.5}
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.6 + i * 0.15 }}
              />
            ))}

            {/* Central node — Meta Núcleo */}
            <m.circle
              cx={CX} cy={CY} r={CR}
              fill="#C0392B"
              initial={pref ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.3 }}
              style={{ cursor: 'pointer', transformOrigin: `${CX}px ${CY}px` }}
              onClick={() => openPanel('meta')}
            />
            {ready && (
              <m.g
                initial={pref ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
              >
                <foreignObject x={CX - 62} y={CY - 50} width={124} height={100} style={{ cursor: 'pointer', pointerEvents: 'none' }}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 124, height: 100, padding: '8px',
                      textAlign: 'center', overflow: 'hidden',
                    }}
                  >
                    <span style={{
                      fontFamily: '"Instrument Serif", serif',
                      fontStyle: 'italic',
                      fontSize: 12,
                      color: '#fff',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {data.meta_nucleo || 'Tu Meta Núcleo'}
                    </span>
                  </div>
                </foreignObject>
              </m.g>
            )}

            {/* Satellite nodes */}
            {SATELLITES.map((s, i) => {
              const { x, y } = sat(s.angle)
              return (
                <m.g
                  key={s.key}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openPanel(s.key)}
                  initial={pref ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 1.2 + i * 0.15 }}
                  whileHover={{ scale: 1.06 }}
                >
                  <circle
                    cx={x} cy={y} r={SR}
                    fill="rgba(255,255,255,0.05)"
                    stroke={panel === s.key ? 'rgba(192,57,43,0.7)' : 'rgba(255,255,255,0.12)'}
                    strokeWidth={1.5}
                  />
                  {/* Node label */}
                  <text
                    x={x} y={y - 20}
                    textAnchor="middle"
                    style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 8, fontWeight: 700, fill: 'rgba(255,255,255,0.45)', letterSpacing: '0.14em', textTransform: 'uppercase' }}
                  >
                    {s.label}
                  </text>
                  {/* Node content */}
                  {ready && (
                    <m.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 + i * 0.1 }}>
                      <foreignObject x={x - 44} y={y - 12} width={88} height={48} style={{ pointerEvents: 'none' }}>
                        <div style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          width: 88, height: 48, padding: '4px', textAlign: 'center', overflow: 'hidden',
                        }}>
                          {s.key === 'equipo' && data.equipo.length > 0 ? (
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                              {data.equipo.slice(0, 4).map((mem, mi) => (
                                <div key={mi} style={{
                                  width: 20, height: 20, borderRadius: '50%',
                                  background: 'rgba(192,57,43,0.7)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 8, fontWeight: 700, color: '#fff',
                                  fontFamily: 'Satoshi, sans-serif',
                                }}>
                                  {mem.nombre.charAt(0).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          ) : s.key === 'planes' && data.planes.length > 0 ? (
                            <div style={{ textAlign: 'left', width: '100%' }}>
                              {data.planes.slice(0, 3).map((p, pi) => (
                                <div key={pi} style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 8, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>
                                  · {truncate(p.texto, 18)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {truncate(
                                s.key === 'creencias' ? data.creencias : data.paradigma,
                                40
                              )}
                            </span>
                          )}
                        </div>
                      </foreignObject>
                    </m.g>
                  )}
                </m.g>
              )
            })}

            {/* Central node label */}
            {ready && (
              <m.text
                x={CX} y={CY + CR + 16}
                textAnchor="middle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.9 }}
                style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 9, fill: 'rgba(255,255,255,0.3)', letterSpacing: '0.16em' }}
              >
                META NÚCLEO
              </m.text>
            )}
          </svg>
        </div>
      </m.div>

      {/* Bottom CTA */}
      <div className="gvm-bottom">
        <button className="gvm-dash-btn" onClick={() => router.push('/dashboard')}>
          Ir a mi dashboard →
        </button>
      </div>

      {/* Edit panel */}
      <AnimatePresence>
        {panel && (
          <m.div
            className="gvm-panel"
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          >
            <button className="gvm-panel__close" onClick={closePanel} aria-label="Cerrar">×</button>

            {(panel === 'meta' || panel === 'creencias' || panel === 'paradigma') && (
              <>
                <div className="gvm-panel__title">
                  {panel === 'meta' ? 'META NÚCLEO' : panel === 'creencias' ? 'CREENCIAS' : 'PARADIGMA'}
                </div>
                <textarea
                  className="gvm-ta"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={savePanel}
                  placeholder={
                    panel === 'meta' ? 'Tu gran sueño como líder...' :
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

            {panel === 'equipo' && (
              <>
                <div className="gvm-panel__title">EQUIPO DE PODER</div>
                <input
                  className="gvm-p-input"
                  placeholder="Nombre"
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  maxLength={50}
                />
                <input
                  className="gvm-p-input"
                  placeholder="Rol en tu vida"
                  value={editRol}
                  onChange={e => setEditRol(e.target.value)}
                  maxLength={80}
                />
                <button className="gvm-p-add" onClick={addEquipoMember} disabled={!editNombre.trim() || data.equipo.length >= 5}>
                  + Agregar
                </button>
                {data.equipo.map((m, i) => (
                  <div key={i} className="gvm-p-chip">
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(192,57,43,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'Satoshi,sans-serif', flexShrink: 0 }}>
                      {m.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 13, color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>{m.nombre}</div>
                      {m.rol && <div style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{m.rol}</div>}
                    </div>
                    <button className="gvm-p-chip-x" onClick={() => removeEquipoMember(i)}>×</button>
                  </div>
                ))}
              </>
            )}

            {panel === 'planes' && (
              <>
                <div className="gvm-panel__title">PLANES DE ACCIÓN</div>
                <input
                  className="gvm-p-input"
                  placeholder="Describe el paso..."
                  value={editPlanText}
                  onChange={e => setEditPlanText(e.target.value)}
                  maxLength={120}
                />
                <input
                  className="gvm-p-input"
                  type="date"
                  value={editPlanDate}
                  onChange={e => setEditPlanDate(e.target.value)}
                />
                <button className="gvm-p-add" onClick={addPlan} disabled={!editPlanText.trim() || data.planes.length >= 5}>
                  + Agregar paso
                </button>
                {data.planes.map(p => (
                  <div key={p.id} className="gvm-p-chip">
                    <button
                      className={`gvm-p-check${p.completado ? ' done' : ''}`}
                      onClick={() => togglePlan(p.id)}
                    >
                      {p.completado && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 12, color: p.completado ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.8)', textDecoration: p.completado ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.texto}</div>
                      {p.fecha && <div style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}</div>}
                    </div>
                    <button className="gvm-p-chip-x" onClick={() => removePlan(p.id)}>×</button>
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
