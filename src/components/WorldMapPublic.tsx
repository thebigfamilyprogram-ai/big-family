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

// ── Floating achievement cards — España, EEUU, Canadá ─────────────────────────
const FLOATING_CARD_CODES = new Set(['us', 'ca', 'es'])

interface FloatingCard {
  code:           string
  eyebrow:        string
  title:          string
  sub:            string
  cardLeft:       string
  cardTop:        string
  cardLeftMobile: string
  cardTopMobile:  string
  lineX:          number  // SVG-space approx card center X for connector
  lineY:          number  // SVG-space approx card center Y for connector
}

const FLOATING_CARDS: FloatingCard[] = [
  {
    code: 'ca', eyebrow: '🎓 Alumni destacado',
    title: 'Concordia University', sub: 'VP Latin Students',
    cardLeft: '1%',  cardTop: '1%',
    cardLeftMobile: '0%', cardTopMobile: '2%',
    lineX: 90,  lineY: 36,   // dot at (233, 94)
  },
  {
    code: 'us', eyebrow: '🎤 Presentación oficial',
    title: 'IB Americas Conference', sub: 'Orlando, Florida',
    cardLeft: '1%',  cardTop: '22%',
    cardLeftMobile: '0%', cardTopMobile: '40%',
    lineX: 90,  lineY: 147,  // dot at (231, 144)
  },
  {
    code: 'es', eyebrow: '🏆 3er Lugar',
    title: 'Congreso Iberoamericano', sub: 'Madrid · MBC Educación',
    cardLeft: '56%', cardTop: '1%',
    cardLeftMobile: '54%', cardTopMobile: '2%',
    lineX: 640, lineY: 36,   // dot at (490, 139)
  },
]

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
  const [modalCountry, setModalCountry] = useState<Country | null>(null)

  const shouldAnim = !prefersReduced && inView

  useEffect(() => {
    if (!modalCountry) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalCountry(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalCountry])

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

        /* ── Connector lines — hidden on mobile ── */
        .wmp-connector-line { display: block; }
        @media (max-width: 640px) { .wmp-connector-line { display: none; } }

        /* ── Floating achievement cards ──────────────────────────── */
        .wmp-floating-card {
          position: absolute;
          left: var(--fc-left);
          top:  var(--fc-top);
          max-width: 160px;
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--card-border, rgba(13,13,13,0.08));
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 2px 12px rgba(13,13,13,0.10), 0 1px 3px rgba(13,13,13,0.06);
          pointer-events: all;
          cursor: default;
          z-index: 2;
        }
        .wmp-fc-eyebrow {
          font-family: "Satoshi", sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: var(--accent, #C0392B);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 3px;
          line-height: 1.4;
        }
        .wmp-fc-title {
          font-family: "Satoshi", sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--ink, #0D0D0D);
          margin: 0 0 2px;
          line-height: 1.3;
        }
        .wmp-fc-sub {
          font-family: "Satoshi", sans-serif;
          font-size: 11px;
          color: var(--mute, #6B6B6B);
          margin: 0;
          line-height: 1.4;
        }
        @media (max-width: 640px) {
          .wmp-floating-card {
            left: var(--fc-left-m);
            top:  var(--fc-top-m);
            max-width: 128px;
            padding: 7px 9px;
          }
          .wmp-fc-title { font-size: 11px; }
          .wmp-fc-sub   { display: none; }
        }

        /* ── Modal overlay + modal ───────────────────────────────── */
        .wmp-modal-overlay {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(13,13,13,0.4);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        }
        .wmp-modal {
          position: relative;
          background: var(--card-bg, #ffffff);
          border-radius: 16px;
          padding: 24px;
          width: 280px;
          max-width: calc(100% - 32px);
          box-shadow: 0 8px 32px rgba(13,13,13,0.16), 0 2px 8px rgba(13,13,13,0.08);
          z-index: 21;
        }
        .wmp-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--mute, #6B6B6B);
          font-size: 16px;
          padding: 4px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wmp-modal-name {
          font-family: "Satoshi", sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--ink, #0D0D0D);
          margin: 0 0 10px;
          padding-right: 24px;
          line-height: 1.2;
        }
        .wmp-modal-tag {
          display: inline-block;
          background: rgba(192,57,43,0.08);
          color: var(--accent, #C0392B);
          font-family: "Satoshi", sans-serif;
          font-size: 11px;
          border-radius: 99px;
          padding: 3px 10px;
          margin-bottom: 12px;
        }
        .wmp-modal-sep {
          height: 1px;
          background: var(--line, rgba(13,13,13,0.10));
          margin: 0 0 12px;
        }
        .wmp-modal-text {
          font-family: "Satoshi", sans-serif;
          font-size: 13px;
          color: var(--mute, #6B6B6B);
          line-height: 1.6;
          margin: 0;
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
              {/* 1 — Base map: non-Colombia countries, connected ones get accent tint */}
              {countryPaths.map(({ d, connected }, i) => (
                <path
                  key={i}
                  d={d}
                  fill={connected ? 'rgba(192,57,43,0.05)' : 'var(--bg-2,#EFECE6)'}
                  stroke={connected ? 'rgba(192,57,43,0.12)' : 'var(--line,rgba(13,13,13,.10))'}
                  strokeWidth="0.3"
                />
              ))}

              {/* 2 — Arcs only (no particles yet) */}
              {CONNECTION_PAIRS.map(([a, b], i) => {
                const ca = getCountry(a)
                const cb = getCountry(b)
                const path = arcPath(ca, cb)
                const { strokeWidth, strokeOpacity } = arcWeightStyle(cb.weight)
                return (
                  <m.path
                    key={i}
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
                )
              })}

              {/* 3 — Traveling particles (above arcs) */}
              {!prefersReduced && inView && CONNECTION_PAIRS.map(([a, b], i) => {
                const ca = getCountry(a)
                const cb = getCountry(b)
                const path = arcPath(ca, cb)
                return (
                  <circle key={i} r="2" fill="var(--accent,#C0392B)" fillOpacity="0.7">
                    {React.createElement('animateMotion', {
                      path,
                      dur: `${4 + i * 0.4}s`,
                      repeatCount: 'indefinite',
                    })}
                  </circle>
                )
              })}

              {/* 4 — Destination dots + labels */}
              {COUNTRIES.filter(c => c.code !== 'co').map(country => {
                const i = COUNTRIES.indexOf(country)
                const isFloating  = FLOATING_CARD_CODES.has(country.code)
                const isVenezuela = country.code === 've'
                const labelX      = isVenezuela ? country.x + 12 : country.x
                const labelY      = isVenezuela ? country.y + 13  : country.y + 14
                const labelAnchor = isVenezuela ? 'start'          : 'middle'
                return (
                  <g
                    key={country.code}
                    style={{ cursor: isFloating ? 'default' : 'pointer' }}
                    onMouseEnter={() => { if (!isFloating) setHovered(country) }}
                    onMouseLeave={() => { if (!isFloating) setHovered(null) }}
                    onClick={() => { if (!isFloating) setModalCountry(country) }}
                  >
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
                  </g>
                )
              })}

              {/* 5 — Connector lines for floating cards (above dots, below HTML layer) */}
              {shouldAnim && FLOATING_CARDS.map(fc => {
                const country = getCountry(fc.code)
                return (
                  <line
                    key={`conn-${fc.code}`}
                    className="wmp-connector-line"
                    x1={fc.lineX}
                    y1={fc.lineY}
                    x2={country.x}
                    y2={country.y}
                    stroke="var(--accent,#C0392B)"
                    strokeOpacity="0.3"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    style={{ pointerEvents: 'none' }}
                  />
                )
              })}

              {/* 6 — Colombia origin: always rendered last, always on top */}
              <g style={{ cursor: 'default' }}>
                {colombiaPath && (
                  <m.path
                    d={colombiaPath}
                    fill="rgba(192,57,43,0.10)"
                    stroke="rgba(192,57,43,0.25)"
                    strokeWidth={0.8}
                    initial={prefersReduced ? false : { opacity: 0 }}
                    animate={shouldAnim ? { opacity: 1 } : {}}
                    transition={{ type: 'spring', stiffness: 80, damping: 22, delay: 0.5 }}
                  />
                )}
                {!prefersReduced && shouldAnim && (
                  <>
                    <m.circle
                      cx={COUNTRIES[0].x} cy={COUNTRIES[0].y} r={10}
                      fill="var(--accent,#C0392B)"
                      style={{ transformOrigin: `${COUNTRIES[0].x}px ${COUNTRIES[0].y}px`, pointerEvents: 'none' }}
                      animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 0 }}
                    />
                    <m.circle
                      cx={COUNTRIES[0].x} cy={COUNTRIES[0].y} r={10}
                      fill="var(--accent,#C0392B)"
                      style={{ transformOrigin: `${COUNTRIES[0].x}px ${COUNTRIES[0].y}px`, pointerEvents: 'none' }}
                      animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 0.8 }}
                    />
                  </>
                )}
                <m.circle
                  cx={COUNTRIES[0].x} cy={COUNTRIES[0].y} r={10}
                  fill="var(--accent,#C0392B)"
                  stroke="white"
                  strokeWidth={2}
                  style={{
                    transformOrigin: `${COUNTRIES[0].x}px ${COUNTRIES[0].y}px`,
                    filter: 'drop-shadow(0 0 6px rgba(192,57,43,.6))',
                    willChange: 'transform, opacity',
                  }}
                  initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                  animate={shouldAnim ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 1.3 }}
                />
                <m.text
                  className="wmp-country-label"
                  x={COUNTRIES[0].x}
                  y={COUNTRIES[0].y - 16}
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
              </g>
            </svg>

            {/* Floating achievement cards — España, EEUU, Canadá */}
            {FLOATING_CARDS.map((fc, i) => (
              <m.div
                key={fc.code}
                className="wmp-floating-card"
                style={{
                  '--fc-left':   fc.cardLeft,
                  '--fc-top':    fc.cardTop,
                  '--fc-left-m': fc.cardLeftMobile,
                  '--fc-top-m':  fc.cardTopMobile,
                } as React.CSSProperties}
                initial={prefersReduced ? false : { opacity: 0, y: -8, scale: 0.95 }}
                animate={shouldAnim ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 2.0 + i * 0.15 }}
                whileHover={{ y: -2, scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              >
                <p className="wmp-fc-eyebrow">{fc.eyebrow}</p>
                <p className="wmp-fc-title">{fc.title}</p>
                <p className="wmp-fc-sub">{fc.sub}</p>
              </m.div>
            ))}

            {/* Modal — click on network dots to open */}
            <AnimatePresence>
              {modalCountry && (
                <>
                  <m.div
                    className="wmp-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setModalCountry(null)}
                  />
                  <m.div
                    key={modalCountry.code}
                    className="wmp-modal"
                    initial={{ opacity: 0, scale: 0.92, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <m.button
                      className="wmp-modal-close"
                      onClick={() => setModalCountry(null)}
                      whileHover={{ rotate: 90, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                      aria-label="Cerrar"
                    >✕</m.button>
                    <p className="wmp-modal-name">{modalCountry.flag} {modalCountry.name}</p>
                    <span className="wmp-modal-tag">Red de colegios aliados</span>
                    <div className="wmp-modal-sep" />
                    <p className="wmp-modal-text">
                      Big Family mantiene conexión activa con instituciones educativas
                      en {modalCountry.name}, expandiendo la red de liderazgo juvenil
                      a nivel internacional.
                    </p>
                  </m.div>
                </>
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
