'use client'

import React, { memo, useEffect, useRef, useState } from 'react'
import { m, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'
import * as topojson from 'topojson-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Country {
  code:     string
  name:     string
  flag:     string
  x:        number
  y:        number
  weight:   'high' | 'medium' | 'low'
  isoId:    number
  tooltip?: string
}

// ── Data ──────────────────────────────────────────────────────────────────────
const COUNTRIES: Country[] = [
  { code: 'co', name: 'Colombia',       flag: '🇨🇴', x: 294, y: 237, weight: 'high',   isoId: 170 },
  { code: 'us', name: 'Estados Unidos', flag: '🇺🇸', x: 231, y: 144, weight: 'high',   isoId: 840, tooltip: 'IB Americas Conference · Orlando' },
  { code: 'ca', name: 'Canadá',         flag: '🇨🇦', x: 233, y:  94, weight: 'high',   isoId: 124, tooltip: 'Alumni — Concordia University' },
  { code: 'es', name: 'España',         flag: '🇪🇸', x: 490, y: 139, weight: 'high',   isoId: 724, tooltip: 'Congreso Iberoamericano · Madrid' },
  { code: 'mx', name: 'México',         flag: '🇲🇽', x: 215, y: 184, weight: 'medium', isoId: 484, tooltip: 'Red de colegios aliados' },
  { code: 've', name: 'Venezuela',      flag: '🇻🇪', x: 315, y: 221, weight: 'medium', isoId: 862, tooltip: 'Red de colegios aliados' },
  { code: 'br', name: 'Brasil',         flag: '🇧🇷', x: 356, y: 289, weight: 'medium', isoId:  76, tooltip: 'Red de colegios aliados' },
  { code: 'ar', name: 'Argentina',      flag: '🇦🇷', x: 323, y: 357, weight: 'medium', isoId:  32, tooltip: 'Red de colegios aliados' },
  { code: 'fr', name: 'Francia',        flag: '🇫🇷', x: 506, y: 122, weight: 'medium', isoId: 250, tooltip: 'Red de colegios aliados' },
  { code: 'gt', name: 'Guatemala',      flag: '🇬🇹', x: 249, y: 209, weight: 'low',    isoId: 320, tooltip: 'Red de colegios aliados' },
  { code: 'in', name: 'India',          flag: '🇮🇳', x: 714, y: 170, weight: 'low',    isoId: 356, tooltip: 'Red de colegios aliados' },
]

const CONNECTED_ISO = new Set([840, 124, 724, 484, 862, 76, 32, 250, 320, 356])

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
  code:    string
  eyebrow: string
  title:   string
  sub:     string
  left:    string   // % of map container left edge
  top:     string   // % of map container top edge
  lineX:   number   // SVG viewBox (0–1000) — card edge closest to dot
  lineY:   number   // SVG viewBox (0–500)
}

// Positions anchor cards near their geographic dots.
// lineX/Y: estimated card edge in SVG coords for the dashed connector line.
const FLOATING_CARDS: FloatingCard[] = [
  {
    code: 'us', eyebrow: '🎤 Presentación oficial',
    title: 'IB Americas Conference', sub: 'Orlando, Florida',
    left: '16%', top: '8%',
    lineX: 228, lineY: 68,   // card bottom-center ≈ SVG (228,68); dot at (231,144)
  },
  {
    code: 'ca', eyebrow: '🎓 Alumni destacado',
    title: 'Concordia University', sub: 'VP Latin Students',
    left: '24%', top: '2%',
    lineX: 312, lineY: 36,   // card bottom-right ≈ SVG (312,36); dot at (233,94)
  },
  {
    code: 'es', eyebrow: '🏆 3er Lugar',
    title: 'Congreso Iberoamericano', sub: 'Madrid · MBC Educación',
    left: '60%', top: '10%',
    lineX: 610, lineY: 90,   // card left-center ≈ SVG (610,90); dot at (490,139)
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

// 3 visual weights — high/medium/low
function arcStyle(weight: 'high' | 'medium' | 'low') {
  if (weight === 'high')   return { strokeWidth: 1.8, strokeOpacity: 0.80 }
  if (weight === 'medium') return { strokeWidth: 1.0, strokeOpacity: 0.45 }
  return                         { strokeWidth: 0.5, strokeOpacity: 0.25 }
}

// ── Count-up stat ─────────────────────────────────────────────────────────────
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
  const [countryPaths, setCountryPaths] = useState<{ d: string; connected: boolean }[]>([])
  const [mapReady,     setMapReady]     = useState(false)
  const [hovered,      setHovered]      = useState<Country | null>(null)
  const [modalCountry, setModalCountry] = useState<Country | null>(null)

  const shouldAnim = !prefersReduced && inView

  // Escape closes modal
  useEffect(() => {
    if (!modalCountry) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalCountry(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalCountry])

  // Load world topology
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
          if (f.id === 170) coPath = d
          else paths.push({ d, connected: CONNECTED_ISO.has(f.id) })
        })
        setColombiaPath(coPath)
        setCountryPaths(paths)
      })
      .catch(() => {})
      .finally(() => setMapReady(true))
  }, [])

  return (
    <section ref={sectionRef} id="alianzas-globales" className="wmp-section">
      <style>{`
        @keyframes wmp-shimmer {
          0%,100% { opacity: .5; }
          50%      { opacity: 1;  }
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

        /* Map container — position:relative is critical for cards + modal */
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

        /* Country labels — desktop only */
        .wmp-lbl {
          pointer-events: none;
          user-select: none;
        }
        @media (max-width: 768px) { .wmp-lbl { display: none; } }

        /* Connector lines — hidden on mobile */
        .wmp-conn { display: block; }
        @media (max-width: 640px) { .wmp-conn { display: none; } }

        /* ── Floating achievement cards ─────────────────────────── */
        .wmp-card {
          position: absolute;
          width: 152px;
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--card-border, rgba(13,13,13,0.08));
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 2px 12px rgba(13,13,13,0.09), 0 1px 3px rgba(13,13,13,0.05);
          pointer-events: all;
          cursor: default;
          z-index: 3;
        }
        .wmp-card-ey {
          font-family: "Satoshi", sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: var(--accent, #C0392B);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 3px;
          line-height: 1.4;
        }
        .wmp-card-ttl {
          font-family: "Satoshi", sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--ink, #0D0D0D);
          margin: 0 0 2px;
          line-height: 1.3;
        }
        .wmp-card-sub {
          font-family: "Satoshi", sans-serif;
          font-size: 11px;
          color: var(--mute, #6B6B6B);
          margin: 0;
          line-height: 1.4;
        }
        @media (max-width: 640px) {
          .wmp-card        { width: 118px; padding: 7px 9px; }
          .wmp-card-ttl    { font-size: 11px; }
          .wmp-card-sub    { display: none; }
        }

        /* ── Modal overlay + panel ─────────────────────────────── */
        .wmp-overlay {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(13,13,13,0.35);
          backdrop-filter: blur(1.5px);
          -webkit-backdrop-filter: blur(1.5px);
        }
        .wmp-modal {
          position: relative;
          width: 260px;
          max-width: calc(100% - 32px);
          background: var(--card-bg, #ffffff);
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(13,13,13,0.14), 0 2px 8px rgba(13,13,13,0.06);
        }
        .wmp-modal-x {
          position: absolute;
          top: 14px; right: 14px;
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
          font-size: 18px;
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
        .wmp-modal-txt {
          font-family: "Satoshi", sans-serif;
          font-size: 13px;
          color: var(--mute, #6B6B6B);
          line-height: 1.6;
          margin: 0;
        }

        /* ── Stats row ─────────────────────────────────────────── */
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
        .wmp-stat-lbl {
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
              {/* LAYER 1 — Base map
                  Connected countries: faint accent tint to distinguish the network.
                  Colombia: deeper tint, will be overridden by Layer 6 fill. */}
              {countryPaths.map(({ d, connected }, i) => (
                <path
                  key={i}
                  d={d}
                  fill={connected ? 'rgba(192,57,43,0.04)' : 'var(--bg-2,#EFECE6)'}
                  stroke={connected ? 'rgba(192,57,43,0.10)' : 'var(--line,rgba(13,13,13,.10))'}
                  strokeWidth="0.3"
                />
              ))}

              {/* LAYER 2 — Arcs: 3 weights communicate institutional importance
                  HIGH (1.8px, 0.80) → España, EEUU, Canadá
                  MEDIUM (1.0px, 0.45) → México, Venezuela, Brasil, Argentina, Francia
                  LOW (0.5px, 0.25) → Guatemala, India */}
              {CONNECTION_PAIRS.map(([a, b], i) => {
                const ca = getCountry(a)
                const cb = getCountry(b)
                const path = arcPath(ca, cb)
                const { strokeWidth, strokeOpacity } = arcStyle(cb.weight)
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

              {/* LAYER 3 — Traveling particles */}
              {!prefersReduced && inView && CONNECTION_PAIRS.map(([a, b], i) => {
                const ca   = getCountry(a)
                const cb   = getCountry(b)
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

              {/* LAYER 4 — Destination dots (r=4, no permanent pulse ring)
                  HIGH countries have floating cards — cursor:default, no modal.
                  MEDIUM/LOW countries open modal on click. */}
              {COUNTRIES.filter(c => c.code !== 'co').map(country => {
                const i           = COUNTRIES.indexOf(country)
                const isFloating  = FLOATING_CARD_CODES.has(country.code)
                const isVenezuela = country.code === 've'
                const labelX      = isVenezuela ? country.x + 12 : country.x
                const labelY      = country.y + 13
                const labelAnchor = isVenezuela ? 'start' : 'middle'
                return (
                  <g
                    key={country.code}
                    style={{ cursor: isFloating ? 'default' : 'pointer' }}
                    onMouseEnter={() => { if (!isFloating) setHovered(country) }}
                    onMouseLeave={() => { if (!isFloating) setHovered(null)    }}
                    onClick={() => { if (!isFloating) setModalCountry(country) }}
                  >
                    {/* Hover pulse — only for modal-enabled (non-floating) countries */}
                    <AnimatePresence>
                      {!prefersReduced && hovered?.code === country.code && (
                        <m.circle
                          key="ring"
                          cx={country.x} cy={country.y} r={4}
                          fill="var(--accent,#C0392B)"
                          style={{ transformOrigin: `${country.x}px ${country.y}px`, pointerEvents: 'none' }}
                          animate={{ scale: [1, 3.5], opacity: [0.45, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 0.9, ease: 'easeOut' }}
                        />
                      )}
                    </AnimatePresence>

                    <m.circle
                      cx={country.x} cy={country.y} r={4}
                      fill="var(--accent,#C0392B)"
                      fillOpacity={0.80}
                      style={{
                        transformOrigin: `${country.x}px ${country.y}px`,
                        filter: 'drop-shadow(0 0 3px rgba(192,57,43,.30))',
                        willChange: 'transform, opacity',
                      }}
                      initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                      animate={shouldAnim ? { scale: 1, opacity: 1 } : {}}
                      whileHover={!isFloating ? { scale: 1.7, transition: { type: 'spring', stiffness: 400, damping: 25 } } : {}}
                      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 1.3 + i * 0.08 }}
                    />

                    <m.text
                      className="wmp-lbl"
                      x={labelX} y={labelY}
                      textAnchor={labelAnchor}
                      style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 10, fill: 'var(--ink,#0D0D0D)', fillOpacity: 0.55 }}
                      initial={prefersReduced ? false : { opacity: 0 }}
                      animate={shouldAnim ? { opacity: 0.55 } : {}}
                      transition={{ duration: 0.4, delay: 1.6 + i * 0.06 }}
                    >{country.name}</m.text>
                  </g>
                )
              })}

              {/* LAYER 5 — Connector lines for floating cards
                  Rendered above dots but below HTML layer (SVG is always under HTML). */}
              {shouldAnim && FLOATING_CARDS.map(fc => {
                const country = getCountry(fc.code)
                return (
                  <line
                    key={`conn-${fc.code}`}
                    className="wmp-conn"
                    x1={fc.lineX} y1={fc.lineY}
                    x2={country.x} y2={country.y}
                    stroke="var(--accent,#C0392B)"
                    strokeOpacity="0.25"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    style={{ pointerEvents: 'none' }}
                  />
                )
              })}

              {/* LAYER 6 — Colombia: always last in SVG = always on top
                  r=9, strokeWidth=2.5, 2 pulse rings offset by 1s. */}
              <g style={{ cursor: 'default' }}>
                {colombiaPath && (
                  <m.path
                    d={colombiaPath}
                    fill="rgba(192,57,43,0.10)"
                    stroke="rgba(192,57,43,0.30)"
                    strokeWidth={1}
                    initial={prefersReduced ? false : { opacity: 0 }}
                    animate={shouldAnim ? { opacity: 1 } : {}}
                    transition={{ type: 'spring', stiffness: 80, damping: 22, delay: 0.5 }}
                  />
                )}
                {!prefersReduced && shouldAnim && (
                  <>
                    <m.circle
                      cx={COUNTRIES[0].x} cy={COUNTRIES[0].y} r={9}
                      fill="var(--accent,#C0392B)"
                      style={{ transformOrigin: `${COUNTRIES[0].x}px ${COUNTRIES[0].y}px`, pointerEvents: 'none' }}
                      animate={{ scale: [1, 3], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 0 }}
                    />
                    <m.circle
                      cx={COUNTRIES[0].x} cy={COUNTRIES[0].y} r={9}
                      fill="var(--accent,#C0392B)"
                      style={{ transformOrigin: `${COUNTRIES[0].x}px ${COUNTRIES[0].y}px`, pointerEvents: 'none' }}
                      animate={{ scale: [1, 3], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 1 }}
                    />
                  </>
                )}
                <m.circle
                  cx={COUNTRIES[0].x} cy={COUNTRIES[0].y} r={9}
                  fill="var(--accent,#C0392B)"
                  stroke="white"
                  strokeWidth={2.5}
                  style={{
                    transformOrigin: `${COUNTRIES[0].x}px ${COUNTRIES[0].y}px`,
                    filter: 'drop-shadow(0 0 6px rgba(192,57,43,.55))',
                    willChange: 'transform, opacity',
                  }}
                  initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                  animate={shouldAnim ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 1.3 }}
                />
                <m.text
                  className="wmp-lbl"
                  x={COUNTRIES[0].x}
                  y={COUNTRIES[0].y - 16}
                  textAnchor="middle"
                  style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 13, fontWeight: 700, fill: 'var(--ink,#0D0D0D)' }}
                  initial={prefersReduced ? false : { opacity: 0 }}
                  animate={shouldAnim ? { opacity: 1 } : {}}
                  transition={{ duration: 0.4, delay: 1.8 }}
                >Colombia</m.text>
              </g>
            </svg>

            {/* Floating cards — España, EEUU, Canadá
                position:absolute within .wmp-map-wrap (position:relative). */}
            {FLOATING_CARDS.map((fc, i) => (
              <m.div
                key={fc.code}
                className="wmp-card"
                style={{ left: fc.left, top: fc.top }}
                initial={prefersReduced ? false : { opacity: 0, y: -6, scale: 0.96 }}
                animate={shouldAnim ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 2.0 + i * 0.20 }}
                whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              >
                <p className="wmp-card-ey">{fc.eyebrow}</p>
                <p className="wmp-card-ttl">{fc.title}</p>
                <p className="wmp-card-sub">{fc.sub}</p>
              </m.div>
            ))}

            {/* Modal — overlay wraps modal so flex centers it within the map.
                Clicking overlay (outside modal) closes it. */}
            <AnimatePresence>
              {modalCountry && (
                <m.div
                  className="wmp-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setModalCountry(null)}
                >
                  <m.div
                    key={modalCountry.code}
                    className="wmp-modal"
                    initial={{ opacity: 0, scale: 0.90, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 6 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <m.button
                      className="wmp-modal-x"
                      onClick={() => setModalCountry(null)}
                      whileHover={{ rotate: 90, scale: 1.1, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                      aria-label="Cerrar"
                    >✕</m.button>
                    <p className="wmp-modal-name">{modalCountry.flag} {modalCountry.name}</p>
                    <span className="wmp-modal-tag">Red de colegios aliados</span>
                    <div className="wmp-modal-sep" />
                    <p className="wmp-modal-txt">
                      Big Family mantiene conexión activa con instituciones educativas
                      en {modalCountry.name}, expandiendo la red de liderazgo juvenil
                      a nivel internacional.
                    </p>
                  </m.div>
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
            <div className="wmp-stat-lbl">{s.label}</div>
          </m.div>,
        ])}
      </div>
    </section>
  )
})
