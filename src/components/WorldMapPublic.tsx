'use client'

import React, { memo, useEffect, useRef, useState } from 'react'
import { m, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'
import * as topojson from 'topojson-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Country {
  code:   string
  name:   string
  flag:   string
  x:      number
  y:      number
  weight: 'high' | 'medium' | 'low'
  isoId:  number          // ISO 3166-1 numeric for topojson fill matching
  tooltip?: string
}

// ── Data — Colombia origin + 10 real destination countries ────────────────────
const COUNTRIES: Country[] = [
  { code: 'co', name: 'Colombia',       flag: '🇨🇴', x: 294, y: 237, weight: 'high',   isoId: 170 },
  // HIGH — confirmed institutional presence
  { code: 'us', name: 'Estados Unidos', flag: '🇺🇸', x: 231, y: 144, weight: 'high',   isoId: 840, tooltip: 'IB Americas Conference · Orlando' },
  { code: 'ca', name: 'Canadá',         flag: '🇨🇦', x: 233, y:  94, weight: 'high',   isoId: 124, tooltip: 'Alumni — Concordia University' },
  { code: 'es', name: 'España',         flag: '🇪🇸', x: 490, y: 139, weight: 'high',   isoId: 724, tooltip: 'Congreso Iberoamericano · Madrid · 3er lugar' },
  // MEDIUM — active network
  { code: 'mx', name: 'México',         flag: '🇲🇽', x: 215, y: 184, weight: 'medium', isoId: 484, tooltip: 'Red de colegios aliados' },
  { code: 've', name: 'Venezuela',      flag: '🇻🇪', x: 315, y: 221, weight: 'medium', isoId: 862, tooltip: 'Red de colegios aliados' },
  { code: 'br', name: 'Brasil',         flag: '🇧🇷', x: 356, y: 289, weight: 'medium', isoId:  76, tooltip: 'Red de colegios aliados' },
  { code: 'ar', name: 'Argentina',      flag: '🇦🇷', x: 323, y: 357, weight: 'medium', isoId:  32, tooltip: 'Red de colegios aliados' },
  { code: 'fr', name: 'Francia',        flag: '🇫🇷', x: 506, y: 122, weight: 'medium', isoId: 250, tooltip: 'Red de colegios aliados' },
  // LOW — emerging connections
  { code: 'gt', name: 'Guatemala',      flag: '🇬🇹', x: 249, y: 209, weight: 'low',    isoId: 320, tooltip: 'Red de colegios aliados' },
  { code: 'in', name: 'India',          flag: '🇮🇳', x: 714, y: 170, weight: 'low',    isoId: 356, tooltip: 'Red de colegios aliados' },
]

// ISO numeric IDs of the 10 connected destinations (FIX 4)
const CONNECTED_ISO = new Set([840, 124, 724, 484, 862, 76, 32, 250, 320, 356])

// All arcs radiate from Colombia
const CONNECTION_PAIRS: [string, string][] = [
  ['co', 'us'], ['co', 'ca'], ['co', 'es'],
  ['co', 'mx'], ['co', 've'], ['co', 'br'],
  ['co', 'ar'], ['co', 'fr'], ['co', 'gt'], ['co', 'in'],
]

const WMP_STATS = [
  { value: COUNTRIES.length - 1,    label: 'Países'   },
  { value: CONNECTION_PAIRS.length, label: 'Alianzas' },
  { value: 1,                       label: 'Origen'   },
]

const TITLE_WORDS = ['Una', 'red', 'que', 'crece.']

// ── Helpers ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function geoToPath(geometry: any): string {
  if (!geometry) return ''
  function ring(coords: [number, number][]): string {
    return coords.map(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * 1000
      const y = ((90 - lat) / 180) * 500
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join('') + 'Z'
  }
  if (geometry.type === 'Polygon')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return geometry.coordinates.map((r: any) => ring(r)).join('')
  if (geometry.type === 'MultiPolygon')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return geometry.coordinates.map((poly: any) => poly.map((r: any) => ring(r)).join('')).join('')
  return ''
}

function arcPath(a: Country, b: Country): string {
  const mx = (a.x + b.x) / 2
  const my = Math.min(a.y, b.y) - 60
  return `M ${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}`
}

function getCountry(code: string): Country {
  return COUNTRIES.find(c => c.code === code)!
}

// FIX 2 — Arc weight hierarchy (high.opacity 0.75 per spec)
function arcWeightStyle(weight: 'high' | 'medium' | 'low') {
  if (weight === 'high')   return { strokeWidth: 1.5, strokeOpacity: 0.75 }
  if (weight === 'medium') return { strokeWidth: 1,   strokeOpacity: 0.5  }
  return                         { strokeWidth: 0.6, strokeOpacity: 0.35 }
}

// ── Count-up stat number ───────────────────────────────────────────────────────
function StatNum({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const raf = useRef<number>(0)
  const inV = useInView(ref, { once: true, margin: '-60px' })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inV) return
    const t0 = performance.now(), dur = 1200
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1)
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [inV, to])
  return <span ref={ref}>{v}</span>
}

// ── Main component ────────────────────────────────────────────────────────────
export default memo(function WorldMapPublic() {
  const sectionRef     = useRef<HTMLElement>(null)
  const inView         = useInView(sectionRef, { once: true, margin: '-15% 0px' })
  const prefersReduced = useReducedMotion()

  const [colombiaPath, setColombiaPath] = useState('')
  // FIX 4 — store connected flag alongside each world path
  const [countryPaths, setCountryPaths] = useState<{ d: string; connected: boolean }[]>([])
  const [mapReady,     setMapReady]     = useState(false)
  const [hovered,      setHovered]      = useState<Country | null>(null)

  const shouldAnim = !prefersReduced && inView

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json', { cache: 'force-cache' })
      .then(r => r.json())
      .then(topo => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fc = topojson.feature(topo as any, (topo as any).objects.countries) as any
        const paths: { d: string; connected: boolean }[] = []
        let coPath = ''
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fc.features.forEach((f: any) => {
          const d = geoToPath(f.geometry)
          if (!d) return
          if (f.id === 170) coPath = d  // Colombia ISO numeric 170
          else paths.push({ d, connected: CONNECTED_ISO.has(f.id) })
        })
        setColombiaPath(coPath)
        setCountryPaths(paths)
      })
      .catch(() => { /* render without fills */ })
      .finally(() => setMapReady(true))
  }, [])

  return (
    <section ref={sectionRef} id="alianzas-globales" className="wmp-section">
      <style>{`
        @keyframes wmp-aura {
          0%   { transform: scale(1); opacity: 0.08; }
          100% { transform: scale(2); opacity: 0;    }
        }
        @keyframes wmp-ring {
          0%   { opacity: 0.22; }
          100% { opacity: 0.03; }
        }

        .wmp-section {
          background: var(--bg, #F5F3EF);
          padding: 96px 0 80px;
          overflow: hidden;
          border-top: 1px solid var(--line-strong, rgba(13,13,13,.14));
        }
        .wmp-header {
          text-align: center;
          padding: 0 40px;
          margin-bottom: 40px;
        }
        .wmp-eyebrow {
          font-family: "Satoshi", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--accent, #C0392B);
          margin-bottom: 14px;
        }
        .wmp-title {
          font-family: "Satoshi", sans-serif;
          font-weight: 600;
          font-size: 36px;
          letter-spacing: -.5px;
          color: var(--ink, #0D0D0D);
          line-height: 1.2;
          margin-bottom: 12px;
        }
        .wmp-sub {
          font-family: "Instrument Serif", serif;
          font-style: italic;
          font-size: 18px;
          color: var(--mute, #6B6B6B);
          line-height: 1.5;
          max-width: 540px;
          margin: 0 auto;
        }
        .wmp-map-outer { position: relative; }
        .wmp-map-wrap {
          position: relative;
          overflow: hidden;
          mask-image: linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%);
        }
        .wmp-map-wrap svg { width: 100%; height: auto; display: block; }
        .wmp-skeleton {
          height: 420px;
          background: rgba(13,13,13,.04);
          animation: wmp-shimmer 1.8s ease-in-out infinite;
        }
        @keyframes wmp-shimmer {
          0%,100% { opacity: .5; }
          50%      { opacity: 1;  }
        }

        /* ── Country labels — desktop only ── */
        .wmp-country-label {
          pointer-events: none;
          user-select: none;
        }
        @media (max-width: 768px) {
          .wmp-country-label { display: none; }
        }

        /* FIX 3 — Tooltip ────────────────────────────────────────── */
        .wmp-tooltip {
          position: absolute;
          pointer-events: none;
          z-index: 10;
          transform: translate(-50%, calc(-100% - 14px));
        }
        .wmp-tip-box {
          background: var(--ink, #0D0D0D);
          color: var(--bg, #F5F3EF);
          font-family: "Satoshi", sans-serif;
          font-size: 11px;
          line-height: 1.5;
          padding: 6px 12px;
          border-radius: 6px;
          max-width: 200px;
          white-space: normal;
        }
        .wmp-tip-name {
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 2px;
        }
        .wmp-tip-detail { opacity: 0.75; }

        /* ── Stats row ───────────────────────────────────────────── */
        .wmp-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 28px;
          padding: 0 40px;
        }
        .wmp-stat {
          flex: 1;
          text-align: center;
          padding: 0 32px;
          max-width: 240px;
        }
        .wmp-stat-num {
          font-family: var(--font-mono, 'Geist Mono', 'JetBrains Mono', monospace);
          font-size: 32px;
          font-weight: 600;
          color: var(--ink, #0D0D0D);
          line-height: 1;
          margin-bottom: 6px;
        }
        .wmp-stat-label {
          font-family: "Satoshi", sans-serif;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .14em;
          color: var(--mute, #6B6B6B);
        }
        .wmp-stat-sep {
          width: 1px;
          height: 32px;
          background: var(--line-strong, rgba(13,13,13,.14));
          flex-shrink: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .wmp-section circle[style*="wmp-aura"],
          .wmp-section circle[style*="wmp-ring"] { display: none; }
        }
        @media (max-width: 960px) {
          .wmp-section { padding: 80px 0 60px; }
          .wmp-header  { padding: 0 24px; }
          .wmp-stats   { padding: 0 24px; }
          .wmp-stat    { padding: 0 16px; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="wmp-header">
        <m.p
          className="wmp-eyebrow"
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={shouldAnim ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >ALCANCE GLOBAL</m.p>

        <h2 className="wmp-title" aria-label="Una red que crece.">
          {TITLE_WORDS.map((word, i) => (
            <m.span
              key={i}
              style={{ display: 'inline-block', marginRight: '0.28em' }}
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              animate={shouldAnim ? { opacity: 1, y: 0 } : {}}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.08 + i * 0.08 }}
            >{word}</m.span>
          ))}
        </h2>

        <m.p
          className="wmp-sub"
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={shouldAnim ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.44 }}
        >
          Conectando líderes de La Guajira con aliados en todo el mundo.
        </m.p>
      </div>

      {/* ── Map ── */}
      <div className="wmp-map-outer">
        {!mapReady ? (
          <div className="wmp-skeleton" />
        ) : (
          <m.div
            className="wmp-map-wrap"
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={shouldAnim ? { opacity: 1 } : {}}
            transition={{ type: 'spring', stiffness: 80, damping: 22 }}
            onTouchStart={() => setHovered(null)}
          >
            <svg
              viewBox="0 0 1000 500"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Mapa mundial de alianzas Big Family"
              role="img"
            >
              {/* FIX 4 — World base: connected countries get accent tint */}
              {countryPaths.map(({ d, connected }, i) => (
                <path
                  key={i}
                  d={d}
                  fill={connected ? 'rgba(192,57,43,0.06)' : 'var(--bg-2,#EFECE6)'}
                  stroke={connected ? 'rgba(192,57,43,0.15)' : 'var(--line,rgba(13,13,13,.10))'}
                  strokeWidth="0.3"
                />
              ))}

              {/* FIX 4 — Colombia: deeper tint, thicker stroke */}
              {colombiaPath && (
                <m.path
                  d={colombiaPath}
                  fill="rgba(192,57,43,0.12)"
                  stroke="var(--accent,#C0392B)"
                  strokeWidth={0.8}
                  strokeOpacity={0.5}
                  initial={prefersReduced ? false : { opacity: 0 }}
                  animate={shouldAnim ? { opacity: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 80, damping: 22, delay: 0.5 }}
                />
              )}

              {/* Connection arcs — weight-based stroke hierarchy */}
              {CONNECTION_PAIRS.map(([a, b], i) => {
                const ca = getCountry(a)
                const cb = getCountry(b)
                const path = arcPath(ca, cb)
                const { strokeWidth, strokeOpacity } = arcWeightStyle(cb.weight)
                return (
                  <g key={i}>
                    <m.path
                      d={path}
                      fill="none"
                      stroke="var(--accent,#C0392B)"
                      strokeOpacity={strokeOpacity}
                      strokeWidth={strokeWidth}
                      strokeDasharray="5 5"
                      initial={prefersReduced ? false : { pathLength: 0, opacity: 0 }}
                      animate={shouldAnim ? { pathLength: 1, opacity: 1 } : {}}
                      transition={{
                        pathLength: { duration: 0.7, delay: 0.9 + i * 0.18, ease: [0.22, 1, 0.36, 1] },
                        opacity:    { duration: 0.3, delay: 0.9 + i * 0.18 },
                      }}
                    />
                    {/* Traveling particle */}
                    {!prefersReduced && inView && (
                      <circle r="2" fill="var(--accent,#C0392B)" fillOpacity="0.7">
                        {React.createElement('animateMotion', {
                          path,
                          dur: `${4 + i * 0.4}s`,
                          repeatCount: 'indefinite',
                        })}
                      </circle>
                    )}
                  </g>
                )
              })}

              {/* Country dots + labels */}
              {COUNTRIES.map((country, i) => {
                const isHQ = country.code === 'co'
                // FIX 1 — Venezuela label shifted right to avoid Colombia overlap
                const isVenezuela = country.code === 've'
                const labelX      = isVenezuela ? country.x + 12 : country.x
                const labelY      = isVenezuela ? country.y + 13  : country.y + 14
                const labelAnchor = isVenezuela ? 'start'          : 'middle'

                return (
                  <g
                    key={country.code}
                    style={{ cursor: isHQ ? 'default' : 'pointer' }}
                    onMouseEnter={() => { if (!isHQ) setHovered(country) }}
                    onMouseLeave={() => { if (!isHQ) setHovered(null) }}
                    onTouchStart={e => {
                      e.stopPropagation()
                      if (!isHQ) setHovered(v => v?.code === country.code ? null : country)
                    }}
                  >
                    {isHQ ? (
                      <>
                        {/* FIX 1 — Colombia: 2 permanent FM pulse rings (exception: loop animation) */}
                        {!prefersReduced && shouldAnim && (
                          <>
                            <m.circle
                              cx={country.x} cy={country.y} r={10}
                              fill="var(--accent,#C0392B)"
                              style={{ transformOrigin: `${country.x}px ${country.y}px`, pointerEvents: 'none' }}
                              animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 0 }}
                            />
                            <m.circle
                              cx={country.x} cy={country.y} r={10}
                              fill="var(--accent,#C0392B)"
                              style={{ transformOrigin: `${country.x}px ${country.y}px`, pointerEvents: 'none' }}
                              animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 0.8 }}
                            />
                          </>
                        )}

                        {/* FIX 1 — Colombia HQ dot: r=10, white stroke */}
                        <m.circle
                          cx={country.x} cy={country.y} r={10}
                          fill="var(--accent,#C0392B)"
                          stroke="white"
                          strokeWidth={2}
                          style={{
                            transformOrigin: `${country.x}px ${country.y}px`,
                            filter: 'drop-shadow(0 0 6px rgba(192,57,43,.6))',
                            willChange: 'transform, opacity',
                          }}
                          initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                          animate={shouldAnim ? { scale: 1, opacity: 1 } : {}}
                          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 1.3 }}
                        />

                        {/* FIX 1 — Colombia label: bold 13px */}
                        <m.text
                          className="wmp-country-label"
                          x={country.x}
                          y={country.y - 16}
                          textAnchor="middle"
                          style={{
                            fontFamily: '"Satoshi",sans-serif',
                            fontSize: 13,
                            fontWeight: 700,
                            fill: 'var(--ink,#0D0D0D)',
                          }}
                          initial={prefersReduced ? false : { opacity: 0 }}
                          animate={shouldAnim ? { opacity: 1 } : {}}
                          transition={{ duration: 0.4, delay: 1.8 }}
                        >Colombia</m.text>
                      </>
                    ) : (
                      <>
                        {/* FIX 1 — Destination hover pulse ring (AnimatePresence) */}
                        <AnimatePresence>
                          {!prefersReduced && hovered?.code === country.code && (
                            <m.circle
                              key="hover-pulse"
                              cx={country.x} cy={country.y} r={5}
                              fill="var(--accent,#C0392B)"
                              style={{ transformOrigin: `${country.x}px ${country.y}px`, pointerEvents: 'none' }}
                              animate={{ scale: [1, 3], opacity: [0.5, 0] }}
                              exit={{ opacity: 0 }}
                              transition={{ repeat: Infinity, duration: 0.9, ease: 'easeOut' }}
                            />
                          )}
                        </AnimatePresence>

                        {/* FIX 1 — Destination dot: r=5, opacity 0.85, scale 1.8 on hover */}
                        <m.circle
                          cx={country.x}
                          cy={country.y}
                          r={5}
                          fill="var(--accent,#C0392B)"
                          fillOpacity={0.85}
                          style={{
                            transformOrigin: `${country.x}px ${country.y}px`,
                            filter: 'drop-shadow(0 0 3px rgba(192,57,43,.4))',
                            willChange: 'transform, opacity',
                          }}
                          initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                          animate={shouldAnim ? { scale: 1, opacity: 1 } : {}}
                          whileHover={{ scale: 1.8, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 1.3 + i * 0.08 }}
                        />

                        {/* Destination label — always visible desktop, Venezuela offset FIX 1 */}
                        <m.text
                          className="wmp-country-label"
                          x={labelX}
                          y={labelY}
                          textAnchor={labelAnchor}
                          style={{
                            fontFamily: '"Satoshi",sans-serif',
                            fontSize: 10,
                            fill: 'var(--ink,#0D0D0D)',
                            fillOpacity: 0.65,
                          }}
                          initial={prefersReduced ? false : { opacity: 0 }}
                          animate={shouldAnim ? { opacity: 0.65 } : {}}
                          transition={{ duration: 0.4, delay: 1.6 + i * 0.06 }}
                        >
                          {country.name}
                        </m.text>
                      </>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* FIX 3 — Tooltip with spring + real program data */}
            <AnimatePresence>
              {hovered && (
                <m.div
                  key={hovered.code}
                  className="wmp-tooltip"
                  style={{
                    left: `${(hovered.x / 1000) * 100}%`,
                    top:  `${(hovered.y / 500) * 100}%`,
                  }}
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                >
                  <div className="wmp-tip-box">
                    <div className="wmp-tip-name">
                      <span>{hovered.flag}</span>
                      <span>{hovered.name}</span>
                    </div>
                    {hovered.tooltip && (
                      <div className="wmp-tip-detail">{hovered.tooltip}</div>
                    )}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="wmp-stats">
        {WMP_STATS.flatMap((s, i) => [
          i > 0 ? <div key={`sep-${i}`} className="wmp-stat-sep" aria-hidden="true" /> : null,
          <m.div
            key={s.label}
            className="wmp-stat"
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={shouldAnim ? { opacity: 1, y: 0 } : {}}
            transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.5 + i * 0.12 }}
          >
            <div className="wmp-stat-num"><StatNum to={s.value} /></div>
            <div className="wmp-stat-label">{s.label}</div>
          </m.div>,
        ])}
      </div>
    </section>
  )
})
