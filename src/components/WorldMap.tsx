'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { m, useInView, useReducedMotion } from 'framer-motion'
import { geoNaturalEarth1, geoPath, geoCentroid } from 'd3-geo'
import { feature } from 'topojson-client'
import AnimatedNumber from './AnimatedNumber'
import { useRealtimeStats } from '@/hooks/useRealtimeStats'

// ── Static data ────────────────────────────────────────────────────────────────

const ISO_NUM: Record<string, number> = {
  ca: 124, us: 840, mx: 484, gt: 320, ni: 558, cr: 188,
  co: 170, py: 600, fr: 250, de: 276, es: 724, ae: 784,
}

const COLOR: Record<string, string> = {
  co: '#C0392B', py: '#C0392B',
  us: '#2563EB', ca: '#2563EB', mx: '#2563EB',
  cr: '#F59E0B', gt: '#F59E0B', ni: '#F59E0B',
  es: '#059669', fr: '#059669', de: '#059669', ae: '#059669',
}

// No flag field — emoji-free per project policy
const INFO: Record<string, { name: string; region: string }> = {
  co: { name: 'Colombia',        region: 'Sudamérica'    },
  py: { name: 'Paraguay',        region: 'Sudamérica'    },
  us: { name: 'Estados Unidos',  region: 'Norteamérica'  },
  ca: { name: 'Canadá',          region: 'Norteamérica'  },
  mx: { name: 'México',          region: 'Norteamérica'  },
  cr: { name: 'Costa Rica',      region: 'Centroamérica' },
  gt: { name: 'Guatemala',       region: 'Centroamérica' },
  ni: { name: 'Nicaragua',       region: 'Centroamérica' },
  fr: { name: 'Francia',         region: 'Europa'        },
  de: { name: 'Alemania',        region: 'Europa'        },
  es: { name: 'España',          region: 'Europa'        },
  ae: { name: 'Emiratos Árabes', region: 'Medio Oriente' },
}

const ORDER = ['co', 'ca', 'us', 'mx', 'gt', 'ni', 'cr', 'py', 'fr', 'de', 'es', 'ae']

const GLOW_IDS = ['glow-red', 'glow-blue', 'glow-yellow', 'glow-green'] as const

function colorToGlowId(color: string) {
  if (color === '#C0392B') return 'glow-red'
  if (color === '#2563EB') return 'glow-blue'
  if (color === '#F59E0B') return 'glow-yellow'
  return 'glow-green'
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Target { code: string; path: string; cx: number; cy: number }
interface Arc    { id: string; code: string; color: string; d: string; coX: number; coY: number; x2: number; y2: number; delay: number }
interface MapData { w: number; h: number; base: string[]; targets: Target[]; arcs: Arc[] }

// ── Component ──────────────────────────────────────────────────────────────────

export default function WorldMap() {
  const rootRef      = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inView  = useInView(rootRef, { once: true, margin: '-80px' })
  const reduced = useReducedMotion()
  const { stats, loading: statsLoading } = useRealtimeStats()

  const [geo,  setGeo]  = useState<any>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [tooltip, setTooltip] = useState<{ code: string; x: number; y: number } | null>(null)

  useEffect(() => {
    import('world-atlas/countries-110m.json').then((mod: any) => {
      setGeo(mod.default ?? mod)
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setDims({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const map = useMemo<MapData | null>(() => {
    if (!geo || dims.w === 0 || dims.h === 0) return null

    const { features: all } = feature(geo, geo.objects.countries) as any

    // fitExtent with 20px margin on each side, then zoom 1.2× for larger presence
    const proj = geoNaturalEarth1()
      .fitExtent([[20, 20], [dims.w - 20, dims.h - 20]], { type: 'FeatureCollection', features: all } as any)
    proj.scale(proj.scale() * 1.2)

    const pg = geoPath(proj)

    const codeById: Record<number, string> = {}
    for (const [c, id] of Object.entries(ISO_NUM)) codeById[id as number] = c

    const base: string[]    = []
    const targets: Target[] = []

    for (const f of all) {
      const code = codeById[+f.id]
      const d    = pg(f) ?? ''
      if (!d) continue
      if (code) {
        const pt = proj(geoCentroid(f) as [number, number])
        if (!pt || isNaN(pt[0]) || isNaN(pt[1])) continue
        targets.push({ code, path: d, cx: pt[0], cy: pt[1] })
      } else {
        base.push(d)
      }
    }

    targets.sort((a, b) => {
      const ai = ORDER.indexOf(a.code), bi = ORDER.indexOf(b.code)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })

    const co = targets.find(t => t.code === 'co')
    const arcs: Arc[] = []
    if (co) {
      for (const t of targets) {
        if (t.code === 'co') continue
        const mx   = (co.cx + t.cx) / 2
        const my   = (co.cy + t.cy) / 2
        const len  = Math.hypot(t.cx - co.cx, t.cy - co.cy)
        const lift = Math.min(80, Math.max(30, len * 0.3))
        arcs.push({
          id: `wm-arc-${t.code}`, code: t.code, color: COLOR[t.code],
          d:  `M${co.cx.toFixed(1)},${co.cy.toFixed(1)} Q${mx.toFixed(1)},${(my - lift).toFixed(1)} ${t.cx.toFixed(1)},${t.cy.toFixed(1)}`,
          coX: co.cx, coY: co.cy, x2: t.cx, y2: t.cy,
          delay: ORDER.indexOf(t.code) * 0.08 + 0.8,
        })
      }
    }

    return { w: dims.w, h: dims.h, base, targets, arcs }
  }, [geo, dims])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <style>{`
        @keyframes tipIn {
          from { opacity: 0; transform: translate(-50%, calc(-100% - 12px)); }
          to   { opacity: 1; transform: translate(-50%, calc(-100% - 8px));  }
        }
        @media (prefers-reduced-motion: reduce) {
          .wm-radar { display: none !important; }
        }
        @media (max-width: 768px) {
          .wm-label { display: none; }
        }
      `}</style>

      {/* Map container — overflow clips anything that escapes the 1.2× zoom */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {map && (
          <svg
            viewBox={`0 0 ${map.w} ${map.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
            aria-label="Mapa mundial — países conectados a Big Family"
          >
            <defs>
              {/* Ocean: radial gradient that fades to landing bg at edges */}
              <radialGradient id="ocean-fade" cx="50%" cy="50%" r="70%">
                <stop offset="0%"   stopColor="#E8F0F5" stopOpacity="1"/>
                <stop offset="100%" stopColor="#F5F3EF" stopOpacity="0"/>
              </radialGradient>

              {/* Glow blur filters — one per accent color */}
              {GLOW_IDS.map(id => (
                <filter key={id} id={id} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              ))}

              {/* Gradient per arc: Colombia-red → region-color */}
              {map.arcs.map(a => (
                <linearGradient
                  key={`grad-${a.code}`} id={`grad-${a.code}`}
                  x1={a.coX} y1={a.coY} x2={a.x2} y2={a.y2}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%"   stopColor="#C0392B" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor={a.color}  stopOpacity={0.6}/>
                </linearGradient>
              ))}
            </defs>

            {/* Step 1 — ocean: radial gradient fades seamlessly to --bg */}
            <m.rect
              width={map.w} height={map.h} fill="url(#ocean-fade)"
              initial={reduced ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4 }}
            />

            {/* Step 1 — base countries: subtle relief */}
            <m.g
              initial={reduced ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4 }}
            >
              {map.base.map((d, i) => (
                <path key={i} d={d} fill="#E8E4DC" stroke="#F5F3EF" strokeWidth={0.8}/>
              ))}
            </m.g>

            {/* Halos — colored circles behind each target, make small countries visible */}
            {map.targets.map(t => (
              <circle
                key={`halo-${t.code}`}
                cx={t.cx} cy={t.cy} r={12}
                fill={COLOR[t.code]} opacity={0.2}
              />
            ))}

            {/* Step 2 — target countries with glow, Colombia first */}
            {map.targets.map(t => {
              const color = COLOR[t.code]
              const isHub = t.code === 'co'
              const delay = ORDER.indexOf(t.code) * 0.1 + 0.3
              return (
                <m.path
                  key={t.code}
                  d={t.path}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={isHub ? 1.5 : 1}
                  filter={`url(#${colorToGlowId(color)})`}
                  style={{ cursor: 'pointer', transformBox: 'fill-box', transformOrigin: '50% 50%' }}
                  initial={reduced ? false : { opacity: 0, scale: 0.5 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
                  onMouseEnter={e => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (!rect) return
                    setTooltip({ code: t.code, x: e.clientX - rect.left, y: e.clientY - rect.top })
                  }}
                  onMouseMove={e => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (!rect) return
                    setTooltip({ code: t.code, x: e.clientX - rect.left, y: e.clientY - rect.top })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}

            {/* Step 3 — thin solid arcs, no dash, elegant gradient */}
            {map.arcs.map(a => (
              <m.path
                key={a.code}
                d={a.d}
                fill="none"
                stroke={`url(#grad-${a.code})`}
                strokeWidth={0.8}
                initial={reduced ? false : { opacity: 0 }}
                animate={inView ? { opacity: 0.5 } : {}}
                transition={{ delay: a.delay, duration: 0.6 }}
              />
            ))}

            {/* Colombia hub label */}
            {map.targets.filter(t => t.code === 'co').map(t => (
              <text
                key="lbl-co"
                x={t.cx} y={t.cy - 14}
                textAnchor="middle"
                fontSize={7}
                fontWeight={700}
                letterSpacing="0.12em"
                fill="white"
                className="wm-label"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                BOGOTÁ
              </text>
            ))}

            {/* Step 4 — radar rings + solid dots */}
            {map.targets.map(t => {
              const color = COLOR[t.code]
              const isHub = t.code === 'co'
              const r     = isHub ? 8 : 5
              const delay = ORDER.indexOf(t.code) * 0.1 + 1.5
              const rings = isHub ? 3 : 2

              return (
                <g key={`dot-${t.code}`}>
                  {/* SVG animate radar rings */}
                  {!reduced && Array.from({ length: rings }).map((_, ri) => (
                    <circle
                      key={ri}
                      cx={t.cx} cy={t.cy} r={r}
                      fill="none" stroke={color} strokeWidth={1}
                      className="wm-radar"
                    >
                      <animate
                        attributeName="r"
                        from={String(r)} to={isHub ? '24' : '18'}
                        dur={isHub ? '2.5s' : '2s'}
                        begin={`${delay + ri * 0.8}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.6" to="0"
                        dur={isHub ? '2.5s' : '2s'}
                        begin={`${delay + ri * 0.8}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                  {/* Solid dot — spring pop, Colombia gets white border */}
                  <m.circle
                    cx={t.cx} cy={t.cy}
                    fill={color}
                    stroke={isHub ? 'white' : 'none'}
                    strokeWidth={isHub ? 2 : 0}
                    initial={{ r: 0 }}
                    animate={inView ? { r } : { r: 0 }}
                    transition={{ delay, type: 'spring', stiffness: 400, damping: 20 }}
                  />
                </g>
              )
            })}
          </svg>
        )}

        {/* Tooltip — dark, compact, country name only */}
        {tooltip && (() => {
          const info = INFO[tooltip.code]
          if (!info) return null
          return (
            <div style={{
              position: 'absolute',
              left: tooltip.x, top: tooltip.y,
              transform: 'translate(-50%, calc(-100% - 8px))',
              background: 'var(--ink,#0D0D0D)',
              color: 'var(--bg,#F5F3EF)',
              padding: '6px 10px',
              borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              zIndex: 10,
              fontFamily: '"Satoshi",sans-serif',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
              animation: 'tipIn 0.15s ease forwards',
            }}>
              {info.name}
            </div>
          )
        })()}
      </div>

      {/* Live stats bar */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 20, padding: '6px 0 2px',
        fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
        fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--mute,#6B6B6B)',
      }}>
        <span>
          <strong style={{ color: 'var(--ink,#0D0D0D)', fontWeight: 700 }}>
            <AnimatedNumber value={Object.keys(ISO_NUM).length} loading={false}/>
          </strong>{' '}Países
        </span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>
          <strong style={{ color: 'var(--ink,#0D0D0D)', fontWeight: 700 }}>
            <AnimatedNumber value={statsLoading ? 0 : stats.totalStudents} loading={statsLoading}/>
          </strong>{' '}Estudiantes
        </span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>
          <strong style={{ color: 'var(--ink,#0D0D0D)', fontWeight: 700 }}>
            <AnimatedNumber value={statsLoading ? 0 : stats.totalBadges} loading={statsLoading}/>
          </strong>{' '}Insignias
        </span>
      </div>
    </div>
  )
}
