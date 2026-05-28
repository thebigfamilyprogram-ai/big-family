'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { m, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'
import * as topojson from 'topojson-client'

// ── Shared data — mirrors dashboard/global-map/page.tsx ───────────────────────
interface Country { code: string; name: string; flag: string; x: number; y: number; students: number; xp: number }

const COUNTRIES: Country[] = [
  { code: 'co', name: 'Colombia',       flag: '🇨🇴', x: 294, y: 237, students: 1240, xp: 98400 },
  { code: 'us', name: 'Estados Unidos', flag: '🇺🇸', x: 231, y: 144, students: 820,  xp: 71200 },
  { code: 'ca', name: 'Canadá',         flag: '🇨🇦', x: 233, y:  94, students: 410,  xp: 38900 },
  { code: 'es', name: 'España',         flag: '🇪🇸', x: 490, y: 139, students: 620,  xp: 55100 },
  { code: 'fr', name: 'Francia',        flag: '🇫🇷', x: 506, y: 122, students: 380,  xp: 33800 },
  { code: 'de', name: 'Alemania',       flag: '🇩🇪', x: 529, y: 108, students: 290,  xp: 25400 },
  { code: 'ae', name: 'Emiratos',       flag: '🇦🇪', x: 649, y: 185, students: 175,  xp: 16200 },
  { code: 'py', name: 'Paraguay',       flag: '🇵🇾', x: 338, y: 315, students: 260,  xp: 22100 },
  { code: 'mx', name: 'México',         flag: '🇲🇽', x: 215, y: 184, students: 560,  xp: 49300 },
  { code: 'br', name: 'Brasil',         flag: '🇧🇷', x: 356, y: 289, students: 440,  xp: 39600 },
  { code: 'gb', name: 'Reino Unido',    flag: '🇬🇧', x: 490, y:  96, students: 195,  xp: 17800 },
  { code: 'ar', name: 'Argentina',      flag: '🇦🇷', x: 323, y: 357, students: 310,  xp: 27400 },
]

const CONNECTION_PAIRS: [string, string][] = [
  ['co', 'us'], ['co', 'ca'], ['co', 'es'], ['us', 'fr'],
  ['us', 'de'], ['es', 'ae'], ['co', 'fr'], ['py', 'co'],
]

const WMP_STATS = [
  { value: COUNTRIES.length,        label: 'Países'   },
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

// ── Pulse circles — CSS-animated, isolated to prevent parent re-renders ────────
const PulseCircle = memo(function PulseCircle({
  x, y, idx,
}: { x: number; y: number; idx: number }) {
  const d1 = `${(idx * 0.35).toFixed(2)}s`
  const d2 = `${(idx * 0.35 + 0.5).toFixed(2)}s`
  return (
    <>
      {/* Aura */}
      <circle
        cx={x} cy={y} r={14}
        fill="var(--accent,#C0392B)"
        style={{
          transformOrigin: `${x}px ${y}px`,
          animation: `wmp-aura 3s ${d1} ease-out infinite`,
          willChange: 'transform, opacity',
        }}
      />
      {/* Ring */}
      <circle
        cx={x} cy={y} r={8}
        fill="none"
        stroke="var(--accent,#C0392B)"
        strokeWidth={1}
        style={{
          transformOrigin: `${x}px ${y}px`,
          animation: `wmp-ring 3s ${d2} ease-out infinite`,
          willChange: 'opacity',
        }}
      />
    </>
  )
})

// ── Main component ────────────────────────────────────────────────────────────
export default memo(function WorldMapPublic() {
  const sectionRef     = useRef<HTMLElement>(null)
  const inView         = useInView(sectionRef, { once: true, margin: '-15% 0px' })
  const prefersReduced = useReducedMotion()

  const [colombiaPath, setColombiaPath] = useState('')
  const [countryPaths, setCountryPaths] = useState<string[]>([])
  const [mapReady,     setMapReady]     = useState(false)
  const [hovered,      setHovered]      = useState<Country | null>(null)

  const shouldAnim = !prefersReduced && inView

  // Fetch world-atlas + separate Colombia for individual highlight
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json', { cache: 'force-cache' })
      .then(r => r.json())
      .then(topo => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fc = topojson.feature(topo as any, (topo as any).objects.countries) as any
        const paths: string[] = []
        let coPath = ''
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fc.features.forEach((f: any) => {
          const d = geoToPath(f.geometry)
          if (!d) return
          if (f.id === 170) coPath = d  // Colombia ISO numeric 170
          else paths.push(d)
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
          0%   { transform: scale(1);   opacity: 0.08; }
          100% { transform: scale(2);   opacity: 0;    }
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
        .wmp-map-outer {
          position: relative;
        }
        .wmp-map-wrap {
          position: relative;
          overflow: hidden;
          mask-image: linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%);
        }
        .wmp-map-wrap svg {
          width: 100%;
          height: auto;
          display: block;
        }
        .wmp-skeleton {
          height: 420px;
          background: rgba(13,13,13,.04);
          animation: wmp-shimmer 1.8s ease-in-out infinite;
        }
        @keyframes wmp-shimmer {
          0%,100% { opacity: .5; }
          50%      { opacity: 1;  }
        }
        .wmp-tooltip {
          position: absolute;
          pointer-events: none;
          z-index: 10;
          transform: translate(-50%, calc(-100% - 18px));
        }
        .wmp-tip-outer {
          background: var(--bg, #F5F3EF);
          border: 1px solid var(--line, rgba(13,13,13,.10));
          border-radius: 10px;
          padding: 4px;
          box-shadow: var(--shadow-raised, 0 4px 16px rgba(13,13,13,.08));
        }
        .wmp-tip-inner {
          padding: 6px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .wmp-tip-flag { font-size: 18px; }
        .wmp-tip-name {
          font-family: "Satoshi", sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--ink, #0D0D0D);
        }
        .wmp-tip-sub {
          font-family: "Satoshi", sans-serif;
          font-size: 11px;
          color: var(--mute, #6B6B6B);
          margin-top: 1px;
        }
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
            transition={{ type: 'spring', stiffness: 80, damping: 22, delay: 0 }}
          >
            <svg
              viewBox="0 0 1000 500"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Mapa mundial de alianzas Big Family"
              role="img"
            >
              {/* Other countries */}
              {countryPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="var(--bg-2,#EFECE6)"
                  stroke="var(--line,rgba(13,13,13,.10))"
                  strokeWidth="0.3"
                />
              ))}

              {/* Colombia — highlighted origin */}
              {colombiaPath && (
                <m.path
                  d={colombiaPath}
                  fill="var(--accent,#C0392B)"
                  fillOpacity={0.15}
                  stroke="var(--accent,#C0392B)"
                  strokeWidth={0.5}
                  strokeOpacity={0.4}
                  initial={prefersReduced ? false : { opacity: 0 }}
                  animate={shouldAnim ? { opacity: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 80, damping: 22, delay: 0.5 }}
                />
              )}

              {/* Connection arcs */}
              {CONNECTION_PAIRS.map(([a, b], i) => {
                const ca = getCountry(a)
                const cb = getCountry(b)
                const path = arcPath(ca, cb)
                return (
                  <g key={i}>
                    <m.path
                      d={path}
                      fill="none"
                      stroke="var(--accent,#C0392B)"
                      strokeOpacity={0.18}
                      strokeWidth={1}
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

              {/* Country dots — 3 layers per dot */}
              {COUNTRIES.map((country, i) => {
                const isHQ = country.code === 'co'
                return (
                  <g
                    key={country.code}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered(country)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Pulse rings — memoized, CSS-animated */}
                    {!prefersReduced && inView && (
                      <PulseCircle x={country.x} y={country.y} idx={i} />
                    )}

                    {/* Core */}
                    <m.circle
                      cx={country.x}
                      cy={country.y}
                      r={isHQ ? 7 : 4}
                      fill="var(--accent,#C0392B)"
                      style={{
                        transformOrigin: `${country.x}px ${country.y}px`,
                        filter: 'drop-shadow(0 0 4px rgba(192,57,43,.5))',
                        willChange: 'transform, opacity',
                      }}
                      initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                      animate={shouldAnim ? { scale: 1, opacity: 1 } : {}}
                      whileHover={{ scale: 1.5, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 1.3 + i * 0.08 }}
                    />

                    {/* Colombia HQ: double ring + always-visible label */}
                    {isHQ && (
                      <>
                        <m.circle
                          cx={country.x} cy={country.y} r={11}
                          fill="none"
                          stroke="var(--accent,#C0392B)"
                          strokeWidth={1}
                          strokeOpacity={0.35}
                          initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                          animate={shouldAnim ? { scale: 1, opacity: 1 } : {}}
                          transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 1.5 }}
                        />
                        <m.text
                          x={country.x - 8}
                          y={country.y - 16}
                          style={{
                            fontFamily: '"Satoshi",sans-serif',
                            fontSize: 10,
                            fontWeight: 500,
                            fill: 'var(--ink,#0D0D0D)',
                          }}
                          initial={prefersReduced ? false : { opacity: 0 }}
                          animate={shouldAnim ? { opacity: 1 } : {}}
                          transition={{ duration: 0.4, delay: 1.8 }}
                        >Colombia</m.text>
                      </>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Floating tooltip */}
            <AnimatePresence>
              {hovered && (
                <m.div
                  key={hovered.code}
                  className="wmp-tooltip"
                  style={{
                    left: `${(hovered.x / 1000) * 100}%`,
                    top:  `${(hovered.y / 500) * 100}%`,
                  }}
                  initial={{ opacity: 0, y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                >
                  <div className="wmp-tip-outer">
                    <div className="wmp-tip-inner">
                      <span className="wmp-tip-flag">{hovered.flag}</span>
                      <div>
                        <div className="wmp-tip-name">{hovered.name}</div>
                        <div className="wmp-tip-sub">{hovered.students.toLocaleString('es-CO')} líderes</div>
                      </div>
                    </div>
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

// Required for createElement('animateMotion') in the JSX above
import React from 'react'
