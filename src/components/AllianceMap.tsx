'use client'

import { useEffect, useRef, useState, memo } from 'react'
import { m, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'
import { geoMercator, geoPath } from 'd3-geo'

// ── Public types ──────────────────────────────────────────────────────────────
export interface Ally { name: string; lat: number; lng: number }
export interface AllianceMapProps {
  view?: 'guajira' | 'colombia' | 'world'
  showArcs?: boolean
  allies?: Ally[]
}

// ── Internal types ────────────────────────────────────────────────────────────
interface School { name: string; municipality: string; lat: number; lng: number; initials: string }
interface Projected extends School { x: number; y: number; idx: number }
interface Conn { path: string; from: number; to: number }

// ── Static data ───────────────────────────────────────────────────────────────
const SCHOOLS: School[] = [
  { name: 'IE Técnica María Inmaculada',    municipality: 'Riohacha',           lat: 11.5442, lng: -72.9065, initials: 'TM' },
  { name: 'Instituto Pedagógico',            municipality: 'Riohacha',           lat: 11.5444, lng: -72.9073, initials: 'IP' },
  { name: 'IE Comfamiliar',                  municipality: 'Riohacha',           lat: 11.5350, lng: -72.9100, initials: 'CF' },
  { name: 'C.E. Ware Waren',                 municipality: 'Manaure',            lat: 11.7500, lng: -72.6500, initials: 'WW' },
  { name: 'IE Paulo VI',                     municipality: 'Riohacha',           lat: 11.5500, lng: -72.9200, initials: 'PV' },
  { name: 'IE Camino al Futuro',             municipality: 'Albania',            lat: 11.1300, lng: -72.6200, initials: 'CA' },
  { name: 'IE Colombia Mía',                 municipality: 'Maicao',             lat: 11.3833, lng: -72.2167, initials: 'CM' },
  { name: 'IE El Carmelo',                   municipality: 'San Juan del Cesar', lat: 10.7667, lng: -73.0167, initials: 'EC' },
]

// Municipality summary for the text panel
const MUNICIPALITIES = (() => {
  const map = new Map<string, number>()
  SCHOOLS.forEach(s => map.set(s.municipality, (map.get(s.municipality) ?? 0) + 1))
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
})()

// Rough polygon of La Guajira — used when GeoJSON fetch fails
const FALLBACK_GEO = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name: 'La Guajira' },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-73.40, 10.38], [-73.00, 10.38], [-72.50, 10.50], [-72.00, 10.65],
        [-71.80, 10.75], [-71.50, 11.10], [-71.20, 11.40], [-71.10, 11.70],
        [-71.30, 12.00], [-71.60, 12.20], [-72.10, 12.40], [-72.40, 12.47],
        [-72.80, 12.25], [-73.10, 11.90], [-73.30, 11.50], [-73.40, 11.00],
        [-73.40, 10.38],
      ]],
    },
  }],
}

// SVG viewport dimensions
const W = 480
const H = 520
const PAD = 32

// Title split into words for stagger animation
const TITLE_WORDS = ['8', 'colegios.', 'Una', 'sola', 'familia.']

// ── Helper: quadratic bezier path between two projected points ────────────────
function connectionPath(a: Projected, b: Projected): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const offset = Math.min(len * 0.2, 24)
  const cx = mx - (dy / len) * offset
  const cy = my + (dx / len) * offset
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}

// ── Pulse rings — isolated memo so infinite animations don't re-render the map ─
const PulseRing = memo(function PulseRing({
  x, y, idx,
}: { x: number; y: number; idx: number }) {
  const d1 = idx * 0.4
  const d2 = idx * 0.4 + 0.5
  return (
    <>
      <m.circle
        cx={x} cy={y} r={20}
        fill="var(--accent,#C0392B)"
        fillOpacity={0.06}
        style={{ transformOrigin: `${x}px ${y}px`, willChange: 'transform, opacity' }}
        animate={{ scale: [1, 2.5, 2.5], opacity: [0.06, 0, 0] }}
        transition={{ duration: 3, delay: d1, ease: [0, 0, 0.2, 1], repeat: Infinity }}
      />
      <m.circle
        cx={x} cy={y} r={10}
        fill="none"
        stroke="var(--accent,#C0392B)"
        strokeOpacity={0.3}
        strokeWidth={1}
        style={{ transformOrigin: `${x}px ${y}px`, willChange: 'transform, opacity' }}
        animate={{ scale: [1, 1.8, 1.8], opacity: [0.3, 0, 0] }}
        transition={{ duration: 3, delay: d2, ease: [0, 0, 0.2, 1], repeat: Infinity }}
      />
    </>
  )
})

// ── Main component ────────────────────────────────────────────────────────────
export default function AllianceMap({ view = 'guajira' }: AllianceMapProps) {
  const prefersReduced = useReducedMotion()
  const sectionRef     = useRef<HTMLElement>(null)
  const inView         = useInView(sectionRef, { once: true, margin: '-20% 0px' })

  const [geoPathStr, setGeoPathStr] = useState('')
  const [projected,  setProjected]  = useState<Projected[]>([])
  const [conns,      setConns]      = useState<Conn[]>([])
  const [hovered,    setHovered]    = useState<number | null>(null)
  const [mapReady,   setMapReady]   = useState(false)

  // Only 'guajira' view is implemented; future views handled by extending this effect
  useEffect(() => {
    if (view !== 'guajira') return
    let cancelled = false

    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let geo: any = FALLBACK_GEO
      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/marcopeg/colombia-geojson/master/departments/la-guajira.json',
          { cache: 'force-cache' },
        )
        if (res.ok) geo = await res.json()
      } catch { /* fallback used */ }

      if (cancelled) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projection = geoMercator().fitExtent([[PAD, PAD], [W - PAD, H - PAD]], geo as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gen        = geoPath().projection(projection)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dStr       = gen(geo as any) ?? ''

      const proj: Projected[] = SCHOOLS.map((s, idx) => {
        const [px, py] = projection([s.lng, s.lat]) ?? [0, 0]
        // Spread Riohacha cluster slightly so markers don't fully overlap
        const jitter = idx < 5 ? (idx - 2) * 6 : 0
        return { ...s, x: px + jitter, y: py + (idx < 5 ? (idx - 2) * 3 : 0), idx }
      })

      const connections: Conn[] = []
      for (let i = 0; i < proj.length; i++) {
        for (let j = i + 1; j < proj.length; j++) {
          connections.push({ path: connectionPath(proj[i], proj[j]), from: i, to: j })
        }
      }

      setGeoPathStr(dStr)
      setProjected(proj)
      setConns(connections)
      setMapReady(true)
    }

    load()
    return () => { cancelled = true }
  }, [view])

  const lineOpacity = (from: number, to: number) => {
    if (hovered === null) return 0.08
    return from === hovered || to === hovered ? 0.28 : 0.03
  }

  const animate    = (prefersReduced || !inView) ? false : undefined
  const shouldAnim = !prefersReduced && inView

  return (
    <section ref={sectionRef} id="nuestra-red" className="amap-section">
      <style>{`
        .amap-section{background:var(--bg,#F5F3EF);padding:96px 40px;border-top:1px solid var(--line-strong,rgba(13,13,13,.14));overflow:hidden;}
        .amap-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:5fr 4fr;gap:72px;align-items:center;}
        .amap-wrap{position:relative;width:100%;}
        .amap-wrap svg{width:100%;height:auto;display:block;}
        .amap-text{display:flex;flex-direction:column;}
        .amap-eyebrow{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--accent,#C0392B);margin-bottom:16px;}
        .amap-title{font-family:"Satoshi",sans-serif;font-weight:600;font-size:32px;color:var(--ink,#0D0D0D);line-height:1.2;letter-spacing:-.02em;margin-bottom:12px;}
        .amap-sub{font-family:"Instrument Serif",serif;font-style:italic;font-size:18px;color:var(--ink-2,#2D2D2D);line-height:1.5;margin-bottom:28px;}
        .amap-muns{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px;}
        .amap-mun{font-family:"Satoshi",sans-serif;font-size:12px;color:var(--mute,#6B6B6B);background:rgba(13,13,13,.05);border-radius:999px;padding:4px 12px;white-space:nowrap;}
        .amap-mun-count{color:var(--accent,#C0392B);font-weight:600;margin-left:2px;}
        .amap-cta{font-family:"Satoshi",sans-serif;font-size:14px;font-weight:500;color:var(--ink,#0D0D0D);text-decoration:none;display:inline-flex;align-items:center;gap:6px;border-bottom:1px solid var(--line,rgba(13,13,13,.10));padding-bottom:2px;width:fit-content;transition:color .2s cubic-bezier(.22,1,.36,1),border-color .2s cubic-bezier(.22,1,.36,1);}
        .amap-cta:hover{color:var(--accent,#C0392B);border-color:var(--accent,#C0392B);}
        .amap-cta:active{transform:scale(0.98);}
        .amap-tooltip{position:absolute;pointer-events:none;z-index:10;transform:translate(-50%,calc(-100% - 20px));}
        .amap-tooltip-outer{background:var(--bg,#F5F3EF);border:1px solid var(--line,rgba(13,13,13,.10));border-radius:16px;padding:4px;box-shadow:0 8px 24px rgba(13,13,13,.10);}
        .amap-tooltip-inner{background:rgba(13,13,13,.03);border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:10px;white-space:nowrap;}
        .amap-tooltip-avatar{width:28px;height:28px;border-radius:50%;background:rgba(192,57,43,.10);color:var(--accent,#C0392B);font-family:"Satoshi",sans-serif;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .amap-tooltip-name{font-family:"Satoshi",sans-serif;font-size:12px;font-weight:600;color:var(--ink,#0D0D0D);line-height:1.3;}
        .amap-tooltip-mun{font-family:"Satoshi",sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--mute,#6B6B6B);margin-top:2px;}
        @media(max-width:960px){.amap-inner{grid-template-columns:1fr;gap:40px;}.amap-section{padding:80px 24px;}}
      `}</style>

      <div className="amap-inner">

        {/* ── MAP ── */}
        <m.div
          className="amap-wrap"
          initial={animate === false ? false : { opacity: 0, scale: 0.97 }}
          animate={shouldAnim ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" aria-label="Mapa de colegios aliados en La Guajira" role="img">
            <defs>
              <filter id="amap-noise" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" result="noise"/>
                <feColorMatrix type="saturate" values="0" in="noise" result="gray"/>
                <feComposite in="SourceGraphic" in2="gray" operator="arithmetic" k1="0" k2="1" k3="0.04" k4="0"/>
              </filter>
            </defs>

            {/* Department fill */}
            {geoPathStr && (
              <>
                <m.path
                  d={geoPathStr}
                  fill="#EDE8E0"
                  initial={animate === false ? false : { opacity: 0 }}
                  animate={shouldAnim ? { opacity: 1 } : {}}
                  transition={{ duration: 0.6, delay: 0.8, ease: 'easeOut' }}
                />
                {/* Noise texture overlay */}
                <path d={geoPathStr} fill="url(#amap-noise)" aria-hidden="true" />
                {/* Animated border draw */}
                <m.path
                  d={geoPathStr}
                  fill="none"
                  stroke="var(--accent,#C0392B)"
                  strokeOpacity={0.3}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={animate === false ? false : { pathLength: 0, opacity: 0 }}
                  animate={shouldAnim ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ pathLength: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.3 } }}
                />
              </>
            )}

            {/* Connection lines */}
            {mapReady && conns.map((c, ci) => (
              <m.path
                key={ci}
                d={c.path}
                fill="none"
                stroke="var(--accent,#C0392B)"
                strokeWidth={1}
                style={{
                  opacity: shouldAnim ? lineOpacity(c.from, c.to) : 0,
                  transition: 'opacity 300ms cubic-bezier(.22,1,.36,1)',
                }}
                initial={animate === false ? false : { pathLength: 0 }}
                animate={shouldAnim ? { pathLength: 1 } : {}}
                transition={{ duration: 1.8, delay: 1.0 + ci * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}

            {/* School markers */}
            {mapReady && projected.map((s, i) => (
              <g
                key={s.name}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Pulse rings — memoized to isolate infinite animation re-renders */}
                {!prefersReduced && inView && <PulseRing x={s.x} y={s.y} idx={i} />}

                {/* Núcleo */}
                <m.circle
                  cx={s.x} cy={s.y}
                  r={5}
                  fill="var(--accent,#C0392B)"
                  style={{
                    transformOrigin: `${s.x}px ${s.y}px`,
                    filter: hovered === i
                      ? 'drop-shadow(0 0 12px rgba(192,57,43,.7))'
                      : 'drop-shadow(0 0 6px rgba(192,57,43,.5))',
                    willChange: 'transform, opacity',
                    transition: 'filter 300ms cubic-bezier(.22,1,.36,1)',
                  }}
                  initial={animate === false ? false : { scale: 0, opacity: 0 }}
                  animate={shouldAnim ? { scale: 1, opacity: 1 } : {}}
                  whileHover={{ scale: 1.5, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 1.4 + i * 0.12 }}
                />

                {/* Tooltip stem */}
                {hovered === i && (
                  <line
                    x1={s.x} y1={s.y - 6}
                    x2={s.x} y2={s.y - 24}
                    stroke="var(--accent,#C0392B)"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                )}
              </g>
            ))}
          </svg>

          {/* HTML tooltip floating above SVG */}
          <AnimatePresence>
            {hovered !== null && projected[hovered] && (() => {
              const s = projected[hovered]
              return (
                <m.div
                  key={hovered}
                  className="amap-tooltip"
                  style={{
                    left: `${(s.x / W) * 100}%`,
                    top:  `${(s.y / H) * 100}%`,
                  }}
                  initial={{ opacity: 0, y: 4, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                >
                  <div className="amap-tooltip-outer">
                    <div className="amap-tooltip-inner">
                      <div className="amap-tooltip-avatar">{s.initials}</div>
                      <div>
                        <div className="amap-tooltip-name">{s.name}</div>
                        <div className="amap-tooltip-mun">{s.municipality}</div>
                      </div>
                    </div>
                  </div>
                </m.div>
              )
            })()}
          </AnimatePresence>
        </m.div>

        {/* ── TEXT PANEL ── */}
        <div className="amap-text">
          <m.p
            className="amap-eyebrow"
            initial={animate === false ? false : { opacity: 0, x: 16 }}
            animate={shouldAnim ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >NUESTRA RED</m.p>

          <h2 className="amap-title" aria-label="8 colegios. Una sola familia.">
            {TITLE_WORDS.map((word, i) => (
              <m.span
                key={i}
                style={{ display: 'inline-block', marginRight: '0.3em' }}
                initial={animate === false ? false : { opacity: 0, y: 8 }}
                animate={shouldAnim ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              >{word}</m.span>
            ))}
          </h2>

          <m.p
            className="amap-sub"
            initial={animate === false ? false : { opacity: 0, x: 16 }}
            animate={shouldAnim ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            Desde La Guajira, construyendo líderes que transforman Colombia.
          </m.p>

          <m.div
            className="amap-muns"
            initial={animate === false ? false : { opacity: 0, x: 16 }}
            animate={shouldAnim ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.70, ease: [0.22, 1, 0.36, 1] }}
          >
            {MUNICIPALITIES.map(([mun, count]) => (
              <span key={mun} className="amap-mun">
                {mun}{count > 1 && <span className="amap-mun-count"> ×{count}</span>}
              </span>
            ))}
          </m.div>

          <m.a
            href="/news"
            className="amap-cta"
            initial={animate === false ? false : { opacity: 0, x: 16 }}
            animate={shouldAnim ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.78, ease: [0.22, 1, 0.36, 1] }}
          >
            Ver todos los colegios →
          </m.a>
        </div>
      </div>
    </section>
  )
}
