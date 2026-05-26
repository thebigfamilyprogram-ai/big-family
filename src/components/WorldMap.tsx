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

const INFO: Record<string, { name: string; flag: string; region: string }> = {
  co: { name: 'Colombia',        flag: '🇨🇴', region: 'Sudamérica'     },
  py: { name: 'Paraguay',        flag: '🇵🇾', region: 'Sudamérica'     },
  us: { name: 'Estados Unidos',  flag: '🇺🇸', region: 'Norteamérica'   },
  ca: { name: 'Canadá',          flag: '🇨🇦', region: 'Norteamérica'   },
  mx: { name: 'México',          flag: '🇲🇽', region: 'Norteamérica'   },
  cr: { name: 'Costa Rica',      flag: '🇨🇷', region: 'Centroamérica'  },
  gt: { name: 'Guatemala',       flag: '🇬🇹', region: 'Centroamérica'  },
  ni: { name: 'Nicaragua',       flag: '🇳🇮', region: 'Centroamérica'  },
  fr: { name: 'Francia',         flag: '🇫🇷', region: 'Europa'         },
  de: { name: 'Alemania',        flag: '🇩🇪', region: 'Europa'         },
  es: { name: 'España',          flag: '🇪🇸', region: 'Europa'         },
  ae: { name: 'Emiratos Árabes', flag: '🇦🇪', region: 'Medio Oriente'  },
}

// Entry order — Colombia first as hub
const ORDER = ['co','ca','us','mx','gt','ni','cr','py','fr','de','es','ae']

// ── Types ──────────────────────────────────────────────────────────────────────

interface Target { code: string; path: string; cx: number; cy: number }
interface Arc {
  id: string; code: string; color: string; d: string
  coX: number; coY: number; x2: number; y2: number
  delay: number; particleDur: number
}
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

  // Load world-atlas topojson client-side
  useEffect(() => {
    import('world-atlas/countries-110m.json').then((mod: any) => {
      setGeo(mod.default ?? mod)
    })
  }, [])

  // Track container size with ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const sync = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setDims({ w: r.width, h: r.height })
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Compute all geometry once geo + dims are ready
  const map = useMemo<MapData | null>(() => {
    if (!geo || dims.w === 0 || dims.h === 0) return null

    const { features: all } = feature(geo, geo.objects.countries) as any

    // fitSize fills the container exactly — no manual scale/translate needed
    const proj = geoNaturalEarth1()
      .fitSize([dims.w, dims.h], { type: 'FeatureCollection', features: all } as any)
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
      let i = 0
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
          delay:       ORDER.indexOf(t.code) * 0.12 + 0.5,
          particleDur: 3 + i++ * 0.25,
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
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: .8; }
          100% { transform: scale(2.5); opacity: 0;  }
        }
        @keyframes wmDraw { to { stroke-dashoffset: 0; } }
        @keyframes tipIn  {
          from { opacity: 0; transform: translate(-50%, calc(-100% - 12px)); }
          to   { opacity: 1; transform: translate(-50%, calc(-100% - 8px));  }
        }
        @media (prefers-reduced-motion: reduce) {
          .wm-arc  { animation: none !important; stroke-dashoffset: 0 !important; }
          .wm-ring { animation: none !important; }
        }
      `}</style>

      {/* ── Map container — fills parent, ResizeObserver watches this ─────────── */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', minHeight: 0 }}
        onMouseLeave={() => setTooltip(null)}
      >
        {map && (
          <svg
            viewBox={`0 0 ${map.w} ${map.h}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', overflow: 'visible' }}
            aria-label="Mapa mundial — países conectados a Big Family"
          >
            <defs>
              {/* Gradient per arc: Colombia-red → region-color */}
              {map.arcs.map(a => (
                <linearGradient
                  key={`grad-${a.code}`} id={`grad-${a.code}`}
                  x1={a.coX} y1={a.coY} x2={a.x2} y2={a.y2}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%"   stopColor="#C0392B" stopOpacity={0.8} />
                  <stop offset="100%" stopColor={a.color} stopOpacity={0.6} />
                </linearGradient>
              ))}
              {/* Arc paths referenced by <mpath> for particle travel */}
              {map.arcs.map(a => <path key={a.id} id={a.id} d={a.d} />)}
            </defs>

            {/* ── Ocean background ───────────────────────────────────────────── */}
            <m.rect
              width={map.w} height={map.h} fill="#E8F4F8" rx={12}
              initial={reduced ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4 }}
            />

            {/* ── All base countries ─────────────────────────────────────────── */}
            <m.g
              initial={reduced ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4 }}
            >
              {map.base.map((d, i) => (
                <path key={i} d={d}
                  fill="var(--bg-2,#EFECE6)"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={0.5}
                />
              ))}
            </m.g>

            {/* ── Connection arcs with gradient stroke ───────────────────────── */}
            {map.arcs.map((a, i) => (
              <g key={a.code}>
                <path
                  d={a.d} fill="none"
                  stroke={`url(#grad-${a.code})`}
                  strokeWidth={1.5} opacity={0.7}
                  strokeDasharray={2000}
                  strokeDashoffset={reduced ? 0 : 2000}
                  className="wm-arc"
                  style={inView && !reduced ? {
                    animation: `wmDraw 0.6s ease forwards ${a.delay}s`,
                  } : undefined}
                />
                {!reduced && (
                  <circle r={2.5} fill={COLOR[a.code]} opacity={0.9}>
                    <animateMotion
                      dur={`${a.particleDur}s`}
                      repeatCount="indefinite"
                      begin={`${a.delay + 1.5}s`}
                    >
                      {/* @ts-ignore — mpath xlinkHref is valid SVG */}
                      <mpath xlinkHref={`#${a.id}`} />
                    </animateMotion>
                  </circle>
                )}
              </g>
            ))}

            {/* ── Target countries — colored, spring scale-in ────────────────── */}
            {map.targets.map(t => {
              const color = COLOR[t.code]
              const isHub = t.code === 'co'
              const delay = ORDER.indexOf(t.code) * 0.12 + 0.3
              return (
                <m.path
                  key={t.code}
                  d={t.path}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={isHub ? 2 : 1.5}
                  style={{
                    filter:          `drop-shadow(0 0 6px ${color}80)`,
                    transformBox:    'fill-box',
                    transformOrigin: '50% 50%',
                    cursor:          'pointer',
                  }}
                  initial={reduced ? false : { opacity: 0, scale: 0 }}
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

            {/* ── Country name labels ────────────────────────────────────────── */}
            {map.targets.map(t => {
              const info = INFO[t.code]
              if (!info) return null
              return (
                <text
                  key={`lbl-${t.code}`}
                  x={t.cx} y={t.cy + 3}
                  textAnchor="middle"
                  fontSize={9} fontWeight={600} fill="#fff"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {info.name}
                </text>
              )
            })}

            {/* ── Pulse rings + solid dots ───────────────────────────────────── */}
            {map.targets.map(t => {
              const color    = COLOR[t.code]
              const isHub    = t.code === 'co'
              const r        = isHub ? 6 : 5
              const dotDelay = ORDER.indexOf(t.code) * 0.12 + 0.9

              return (
                <g key={`dot-${t.code}`}>
                  <circle cx={t.cx} cy={t.cy} r={r} fill={color} className="wm-ring"
                    style={{ transformOrigin: `${t.cx}px ${t.cy}px`, transformBox: 'fill-box',
                      animation: inView && !reduced ? `pulse-ring 2s ease-out ${dotDelay}s infinite` : undefined }} />
                  <circle cx={t.cx} cy={t.cy} r={r} fill={color} className="wm-ring"
                    style={{ transformOrigin: `${t.cx}px ${t.cy}px`, transformBox: 'fill-box',
                      animation: inView && !reduced ? `pulse-ring 2s ease-out ${dotDelay + 0.6}s infinite` : undefined }} />
                  {isHub && (
                    <circle cx={t.cx} cy={t.cy} r={r} fill={color} className="wm-ring"
                      style={{ transformOrigin: `${t.cx}px ${t.cy}px`, transformBox: 'fill-box',
                        animation: inView && !reduced ? `pulse-ring 2s ease-out ${dotDelay + 1.2}s infinite` : undefined }} />
                  )}
                  <m.circle cx={t.cx} cy={t.cy} fill={color}
                    initial={{ r: 0 }}
                    animate={inView ? { r } : { r: 0 }}
                    transition={{ delay: dotDelay, type: 'spring', stiffness: 300, damping: 15 }}
                  />
                </g>
              )
            })}
          </svg>
        )}

        {/* ── Tooltip ────────────────────────────────────────────────────────── */}
        {tooltip && (() => {
          const info = INFO[tooltip.code]
          if (!info) return null
          return (
            <div style={{
              position: 'absolute',
              left: tooltip.x, top: tooltip.y,
              transform: 'translate(-50%, calc(-100% - 8px))',
              background: 'var(--card-bg,#fff)',
              border: '1px solid var(--line,rgba(13,13,13,0.1))',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '8px 12px',
              pointerEvents: 'none',
              zIndex: 10,
              fontFamily: '"Satoshi",sans-serif',
              whiteSpace: 'nowrap',
              animation: 'tipIn 0.15s ease forwards',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink,#0D0D0D)' }}>
                <span>{info.flag}</span>
                <span>{info.name}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--mute,#6B6B6B)', marginTop: 3 }}>{info.region}</div>
            </div>
          )
        })()}
      </div>

      {/* ── Live stats bar ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 20, padding: '6px 0 2px',
        fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
        fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--mute,#6B6B6B)',
      }}>
        <span>
          <strong style={{ color: 'var(--ink,#0D0D0D)', fontWeight: 700 }}>
            <AnimatedNumber value={Object.keys(ISO_NUM).length} loading={false} />
          </strong>{' '}Países
        </span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>
          <strong style={{ color: 'var(--ink,#0D0D0D)', fontWeight: 700 }}>
            <AnimatedNumber value={statsLoading ? 0 : stats.totalStudents} loading={statsLoading} />
          </strong>{' '}Estudiantes
        </span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>
          <strong style={{ color: 'var(--ink,#0D0D0D)', fontWeight: 700 }}>
            <AnimatedNumber value={statsLoading ? 0 : stats.totalBadges} loading={statsLoading} />
          </strong>{' '}Insignias
        </span>
      </div>
    </div>
  )
}
