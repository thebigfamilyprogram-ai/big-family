'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { m, useInView, useReducedMotion } from 'framer-motion'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import AnimatedNumber from './AnimatedNumber'
import { useRealtimeStats } from '@/hooks/useRealtimeStats'

// ── Constants ────────────────────────────────────────────────────────────────

const W = 960, H = 500

// ISO 3166-1 numeric codes for each target country
const ISO_NUM: Record<string, number> = {
  ca: 124, us: 840, mx: 484, gt: 320, ni: 558, cr: 188,
  co: 170, py: 600, fr: 250, de: 276, es: 724, ae: 784,
}

// Region fill colors
const COLOR: Record<string, string> = {
  co: '#C0392B', py: '#C0392B',
  us: '#2563EB', ca: '#2563EB', mx: '#2563EB',
  cr: '#F59E0B', gt: '#F59E0B', ni: '#F59E0B',
  es: '#059669', fr: '#059669', de: '#059669', ae: '#059669',
}

// Entry stagger order — Colombia first as hub
const ORDER = ['co','ca','us','mx','gt','ni','cr','py','fr','de','es','ae']

// ── Types ─────────────────────────────────────────────────────────────────────

interface HitEntry { code: string; path: string; cx: number; cy: number }
interface ArcEntry {
  id: string; code: string; color: string
  d: string; delay: number; particleDur: number
}
interface MapData { base: string[]; hits: HitEntry[]; arcs: ArcEntry[] }

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorldMap() {
  const rootRef  = useRef<HTMLDivElement>(null)
  const inView   = useInView(rootRef, { once: true, margin: '-80px' })
  const reduced  = useReducedMotion()
  const { stats, loading: statsLoading } = useRealtimeStats()
  const [geo, setGeo] = useState<any>(null)

  // Load world-atlas topojson client-side only
  useEffect(() => {
    import('world-atlas/countries-110m.json').then((mod: any) => {
      setGeo(mod.default ?? mod)
    })
  }, [])

  // Build all map geometry once
  const map = useMemo<MapData | null>(() => {
    if (!geo) return null

    const proj = geoNaturalEarth1().scale(153).translate([W / 2, H / 2])
    const pg   = geoPath(proj)

    const { features } = feature(geo, geo.objects.countries) as any

    const codeById: Record<number, string> = {}
    for (const [c, id] of Object.entries(ISO_NUM)) codeById[id as number] = c

    const base: string[]    = []
    const hits: HitEntry[]  = []

    for (const f of features) {
      const code = codeById[+f.id]
      const d    = pg(f) ?? ''
      if (!d) continue

      if (code) {
        const c = pg.centroid(f)
        if (isNaN(c[0]) || isNaN(c[1])) continue
        hits.push({ code, path: d, cx: c[0], cy: c[1] })
      } else {
        base.push(d)
      }
    }

    hits.sort((a, b) => {
      const ai = ORDER.indexOf(a.code)
      const bi = ORDER.indexOf(b.code)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })

    const co = hits.find(h => h.code === 'co')
    const arcs: ArcEntry[] = co
      ? hits
          .filter(h => h.code !== 'co')
          .map((h, i) => {
            const mx   = (co.cx + h.cx) / 2
            const my   = (co.cy + h.cy) / 2
            const len  = Math.hypot(h.cx - co.cx, h.cy - co.cy)
            const lift = Math.min(90, Math.max(25, len * 0.35))
            const id   = `wm-arc-${h.code}`
            return {
              id,
              code: h.code,
              color: COLOR[h.code],
              d: `M${co.cx.toFixed(1)},${co.cy.toFixed(1)} Q${mx.toFixed(1)},${(my - lift).toFixed(1)} ${h.cx.toFixed(1)},${h.cy.toFixed(1)}`,
              delay:       ORDER.indexOf(h.code) * 0.12 + 0.5,
              particleDur: 3 + i * 0.25,
            }
          })
      : []

    return { base, hits, arcs }
  }, [geo])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <style>{`
        @keyframes wmPulse {
          0%   { transform: scale(1);   opacity: .85; }
          100% { transform: scale(4.5); opacity: 0;   }
        }
        @keyframes wmDraw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .wm-arc  { animation: none !important; stroke-dashoffset: 0 !important; }
          .wm-ring { animation: none !important; }
        }
      `}</style>

      {/* ── SVG map ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%" height="100%"
          style={{ display: 'block' }}
          aria-label="Mapa mundial — países conectados a Big Family"
        >
          {/* Arc path definitions for mpath reference */}
          <defs>
            {map?.arcs.map(a => (
              <path key={a.id} id={a.id} d={a.d} />
            ))}
          </defs>

          {/* ── Base countries ─────────────────────────────────────────────── */}
          <m.g
            initial={reduced ? false : { opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.35 }}
          >
            {map?.base.map((d, i) => (
              <path
                key={i} d={d}
                fill="var(--bg-2,#EFECE6)"
                stroke="var(--line,rgba(13,13,13,0.1))"
                strokeWidth={0.5}
              />
            ))}
          </m.g>

          {/* ── Arcs ───────────────────────────────────────────────────────── */}
          {map?.arcs.map((a, i) => (
            <g key={a.code}>
              {/* Visible arc line */}
              <path
                d={a.d}
                fill="none"
                stroke={a.color}
                strokeWidth={1}
                strokeOpacity={0.55}
                strokeDasharray={2000}
                strokeDashoffset={reduced ? 0 : 2000}
                className="wm-arc"
                style={inView && !reduced ? {
                  animation: `wmDraw 1.2s ease forwards ${a.delay}s`,
                } : undefined}
              />
              {/* Travelling particle */}
              {!reduced && (
                <circle r={2.5} fill={a.color} opacity={0.9}>
                  <animateMotion
                    dur={`${a.particleDur}s`}
                    repeatCount="indefinite"
                    begin={`${a.delay + 1.5}s`}
                  >
                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                    {/* @ts-ignore — mpath/xlinkHref is valid SVG */}
                    <mpath xlinkHref={`#${a.id}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          ))}

          {/* ── Target countries (highlighted) ─────────────────────────────── */}
          {map?.hits.map(h => {
            const color      = COLOR[h.code]
            const isHub      = h.code === 'co'
            const r          = isHub ? 6 : 4
            const entryDelay = ORDER.indexOf(h.code) * 0.12 + 0.3
            const dotDelay   = entryDelay + 0.9

            return (
              <m.g
                key={h.code}
                initial={reduced ? false : { opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: entryDelay, duration: 0.4 }}
              >
                {/* Country fill */}
                <path
                  d={h.path}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={isHub ? 2 : 1.5}
                  style={{ filter: `drop-shadow(0 0 5px ${color}99)` }}
                />

                {/* Pulse rings (CSS animation) */}
                <circle
                  className="wm-ring"
                  cx={h.cx} cy={h.cy} r={r}
                  fill={color}
                  style={{
                    transformOrigin: `${h.cx}px ${h.cy}px`,
                    transformBox: 'fill-box',
                    animation: inView && !reduced
                      ? `wmPulse 2.2s ease-out ${dotDelay}s infinite`
                      : undefined,
                  }}
                />
                <circle
                  className="wm-ring"
                  cx={h.cx} cy={h.cy} r={r}
                  fill={color}
                  style={{
                    transformOrigin: `${h.cx}px ${h.cy}px`,
                    transformBox: 'fill-box',
                    animation: inView && !reduced
                      ? `wmPulse 2.2s ease-out ${dotDelay + 0.7}s infinite`
                      : undefined,
                  }}
                />
                {isHub && (
                  <circle
                    className="wm-ring"
                    cx={h.cx} cy={h.cy} r={r}
                    fill={color}
                    style={{
                      transformOrigin: `${h.cx}px ${h.cy}px`,
                      transformBox: 'fill-box',
                      animation: inView && !reduced
                        ? `wmPulse 2.2s ease-out ${dotDelay + 1.4}s infinite`
                        : undefined,
                    }}
                  />
                )}

                {/* Solid dot — spring pop */}
                <m.circle
                  cx={h.cx} cy={h.cy}
                  initial={{ r: 0 }}
                  animate={inView ? { r } : { r: 0 }}
                  transition={{
                    delay: dotDelay,
                    type: 'spring',
                    stiffness: 300,
                    damping: 15,
                  }}
                  fill={color}
                />
              </m.g>
            )
          })}
        </svg>
      </div>

      {/* ── Live stats bar ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        padding: '6px 0 2px',
        fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
        fontSize: 11,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--mute,#6B6B6B)',
      }}>
        <span>
          <strong style={{ color: 'var(--ink,#0D0D0D)', fontWeight: 700 }}>
            <AnimatedNumber value={Object.keys(ISO_NUM).length} loading={false} />
          </strong>
          {' '}Países
        </span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>
          <strong style={{ color: 'var(--ink,#0D0D0D)', fontWeight: 700 }}>
            <AnimatedNumber value={statsLoading ? 0 : stats.totalStudents} loading={statsLoading} />
          </strong>
          {' '}Estudiantes
        </span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>
          <strong style={{ color: 'var(--ink,#0D0D0D)', fontWeight: 700 }}>
            <AnimatedNumber value={statsLoading ? 0 : stats.totalBadges} loading={statsLoading} />
          </strong>
          {' '}Insignias
        </span>
      </div>
    </div>
  )
}
