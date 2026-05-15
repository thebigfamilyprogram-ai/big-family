'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import * as topojson from 'topojson-client'
import DashboardSidebar from '@/components/DashboardSidebar'

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Country {
  code: string
  name: string
  flag: string
  x: number
  y: number
  students: number
  xp: number
}

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

const LEADERBOARD = [...COUNTRIES].sort((a, b) => b.xp - a.xp)
const MAX_XP = LEADERBOARD[0].xp

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCountry(code: string) {
  return COUNTRIES.find(c => c.code === code)!
}

function arcPath(a: Country, b: Country) {
  const mx = (a.x + b.x) / 2
  const my = Math.min(a.y, b.y) - 44
  return `M ${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}`
}

function dotRadius(students: number) {
  return 8 + (students / 1240) * 13
}

// Equirectangular: lon/lat → SVG xy (viewBox 0 0 1000 500)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function geoToPath(geometry: any): string {
  if (!geometry) return ''

  function ring(coords: [number, number][]): string {
    return (
      coords
        .map(([lon, lat], i) => {
          const x = ((lon + 180) / 360) * 1000
          const y = ((90 - lat) / 180) * 500
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join('') + 'Z'
    )
  }

  if (geometry.type === 'Polygon') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return geometry.coordinates.map((r: any) => ring(r)).join('')
  }
  if (geometry.type === 'MultiPolygon') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return geometry.coordinates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((poly: any) => poly.map((r: any) => ring(r)).join(''))
      .join('')
  }
  return ''
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GlobalMapPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [authLoading, setAuthLoading] = useState(true)
  const [userName, setUserName]       = useState('…')
  const [initial, setInitial]         = useState('L')
  const [counter, setCounter]         = useState(0)
  const [countryPaths, setCountryPaths] = useState<string[]>([])
  const [mapReady, setMapReady]       = useState(false)
  const [tooltip, setTooltip]         = useState<{ country: Country; x: number; y: number } | null>(null)

  // Auth
  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const name = profile?.full_name ?? user.email ?? 'Leader'
      setUserName(name)
      setInitial(name.charAt(0).toUpperCase())
      setAuthLoading(false)
    }
    boot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // World atlas
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topo => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fc = topojson.feature(topo as any, (topo as any).objects.countries) as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paths: string[] = fc.features
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((f: any) => geoToPath(f.geometry))
          .filter((p: string) => p.length > 0)
        setCountryPaths(paths)
      })
      .catch(() => {/* render without country fills */})
      .finally(() => setMapReady(true))
  }, [])

  // Count-up
  useEffect(() => {
    if (authLoading) return
    const total = COUNTRIES.reduce((s, c) => s + c.students, 0)
    let n = 0
    const step = Math.ceil(total / 60)
    const id = setInterval(() => {
      n += step
      if (n >= total) { setCounter(total); clearInterval(id) }
      else setCounter(n)
    }, 22)
    return () => clearInterval(id)
  }, [authLoading])

  function openTooltip(country: Country, e: React.MouseEvent) {
    e.stopPropagation()
    setTooltip({ country, x: e.clientX, y: e.clientY })
  }

  // Full-page auth skeleton
  if (authLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
        <DashboardSidebar activePage="global-map" />
        <div style={{ flex: 1, padding: '40px', overflow: 'auto' }}>
          <div style={{ height: 36, width: 280, borderRadius: 8, background: 'rgba(13,13,13,.07)', marginBottom: 28 }} />
          <div style={{ height: 380, borderRadius: 16, background: 'rgba(13,13,13,.05)' }} />
        </div>
      </div>
    )
  }

  const co     = getCountry('co')
  const coRank = LEADERBOARD.findIndex(c => c.code === 'co') + 1
  const total  = COUNTRIES.reduce((s, c) => s + c.students, 0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap');
        /* ── Header ── */
        .gm-header{padding:36px 40px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:24px;flex-wrap:wrap;}
        .gm-eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;color:#C0392B;text-transform:uppercase;font-weight:700;margin-bottom:12px;}
        .gm-title{font-family:"Instrument Serif",serif;font-style:italic;font-size:clamp(40px,5vw,64px);color:var(--ink);letter-spacing:-.03em;line-height:1.05;margin-bottom:8px;}
        .gm-sub{font-family:Inter,sans-serif;font-size:14px;color:var(--mute);}
        .gm-pills{display:flex;gap:10px;flex-wrap:wrap;align-self:center;}
        .gm-pill{padding:8px 18px;border-radius:999px;background:var(--card-bg);border:1px solid var(--card-border);font-size:12px;color:var(--ink);display:flex;align-items:center;gap:8px;font-family:"Satoshi",sans-serif;}
        .gm-pill b{color:var(--ink);font-weight:700;}
        .gm-pill__dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}

        /* ── Map ── */
        .gm-map-wrap{padding:24px 40px;}
        .gm-map-card{background:var(--bg);border:1px solid var(--card-border);border-radius:20px;overflow:hidden;position:relative;}
        .gm-map-card svg{display:block;width:100%;}
        @keyframes gm-shimmer{from{transform:translateX(-100%)}to{transform:translateX(200%)}}
        .gm-map-skeleton{height:420px;border-radius:20px;background:rgba(13,13,13,.04);position:relative;overflow:hidden;}
        .gm-map-skeleton::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:gm-shimmer 1.6s ease-in-out infinite;}

        /* ── Bottom ── */
        .gm-bottom{display:grid;grid-template-columns:1.8fr 1fr;gap:20px;padding:0 40px 40px;}

        /* ── Leaderboard (dark — unchanged) ── */
        .gm-lb{background:#141414;border:1px solid rgba(255,255,255,.07);border-radius:16px;overflow:hidden;}
        .gm-lb__head{padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;}
        .gm-lb__head span:last-child{font-weight:400;color:rgba(255,255,255,.32);}
        .gm-lb__row{display:grid;grid-template-columns:28px 28px 1fr 88px 78px;align-items:center;gap:10px;padding:11px 24px;border-bottom:1px solid rgba(255,255,255,.04);}
        .gm-lb__row:last-child{border:none;}
        .gm-lb__rank{font-size:10.5px;color:rgba(255,255,255,.28);font-weight:700;text-align:center;}
        .gm-lb__rank--1{color:#F6C90E;}
        .gm-lb__flag{font-size:17px;text-align:center;}
        .gm-lb__info{min-width:0;}
        .gm-lb__name{font-size:12.5px;color:rgba(255,255,255,.82);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .gm-lb__bar{height:2px;border-radius:999px;background:rgba(255,255,255,.06);margin-top:5px;overflow:hidden;}
        .gm-lb__students{font-size:11.5px;color:rgba(255,255,255,.4);text-align:right;}
        .gm-lb__xp{font-size:12px;font-weight:700;color:#C0392B;text-align:right;}

        /* ── Personal card (dark) ── */
        .gm-card{background:#141414;border:1px solid rgba(192,57,43,.2);border-radius:16px;padding:26px;position:relative;overflow:hidden;}
        .gm-card::before{content:'';position:absolute;top:-70px;right:-70px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(192,57,43,.12) 0%,transparent 70%);pointer-events:none;}
        .gm-card__eyebrow{font-size:10px;letter-spacing:.17em;color:#C0392B;text-transform:uppercase;font-weight:600;font-family:"Satoshi",sans-serif;margin-bottom:18px;}
        .gm-card__flag{font-size:38px;margin-bottom:10px;}
        .gm-card__country{font-family:"Satoshi",sans-serif;font-weight:900;font-size:23px;color:#fff;margin-bottom:4px;}
        .gm-card__rank{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:22px;}
        .gm-card__stat-label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:4px;font-family:"Satoshi",sans-serif;}
        .gm-card__stat-val{font-family:"Satoshi",sans-serif;font-weight:800;font-size:28px;color:#fff;line-height:1;}
        .gm-card__stat-sub{font-size:11px;color:rgba(255,255,255,.35);margin-top:3px;}
        .gm-card__sep{height:1px;background:rgba(255,255,255,.07);margin:18px 0;}
        .gm-card__prog-head{display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.38);margin-bottom:7px;}
        .gm-card__prog{height:4px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden;}

        /* ── Tooltip ── */
        .gm-tip{position:fixed;z-index:1000;background:rgba(14,14,14,.96);border:1px solid rgba(255,255,255,.11);border-radius:14px;padding:16px 20px;min-width:190px;pointer-events:none;backdrop-filter:blur(20px);}
        .gm-tip__flag{font-size:26px;margin-bottom:8px;}
        .gm-tip__name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:#fff;margin-bottom:12px;}
        .gm-tip__row{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:rgba(255,255,255,.45);margin-bottom:5px;}
        .gm-tip__row b{color:#fff;font-weight:600;}
        .gm-tip__bar{height:3px;border-radius:999px;background:rgba(255,255,255,.1);margin-top:12px;overflow:hidden;}
        .gm-tip__fill{height:100%;border-radius:999px;background:#C0392B;}

        @media(max-width:900px){
          .gm-header{padding:24px 20px 0;}
          .gm-map-wrap{padding:20px;}
          .gm-bottom{grid-template-columns:1fr;padding:0 20px 32px;}
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }} onClick={() => setTooltip(null)}>
        <DashboardSidebar activePage="global-map" userName={userName} userInitial={initial} />

        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* ── Header ── */}
          <div className="gm-header">
            <div>
              <div className="gm-eyebrow">Big Family Network</div>
              <h1 className="gm-title">Mapa Global</h1>
              <p className="gm-sub">Comunidad activa en {COUNTRIES.length} países</p>
            </div>
            <div className="gm-pills">
              <div className="gm-pill">
                <span className="gm-pill__dot" style={{ background: '#C0392B' }} />
                <span><b>{counter.toLocaleString()}</b> líderes activos</span>
              </div>
              <div className="gm-pill">
                <span className="gm-pill__dot" style={{ background: '#C0392B' }} />
                <span><b>{COUNTRIES.length}</b> países</span>
              </div>
              <div className="gm-pill">
                <span className="gm-pill__dot" style={{ background: '#27500A' }} />
                <span>Meta <b>2036</b></span>
              </div>
            </div>
          </div>

          {/* ── Map ── */}
          <div className="gm-map-wrap">
            {!mapReady ? (
              <div className="gm-map-skeleton" />
            ) : (
              <div className="gm-map-card">
                <svg viewBox="0 0 1000 500" style={{ background: 'transparent' }}>
                  <defs>
                    <pattern id="gm-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(13,13,13,0.04)" strokeWidth="0.5" />
                    </pattern>
                  </defs>

                  {/* Ocean grid */}
                  <rect width="1000" height="500" fill="url(#gm-grid)" />

                  {/* Real country fills from world-atlas */}
                  {countryPaths.map((d, i) => (
                    <path
                      key={i}
                      d={d}
                      fill="rgba(13,13,13,0.07)"
                      stroke="rgba(13,13,13,0.18)"
                      strokeWidth="0.4"
                    />
                  ))}

                  {/* Connection arcs */}
                  {CONNECTION_PAIRS.map(([a, b], i) => {
                    const ca = getCountry(a)
                    const cb = getCountry(b)
                    const path = arcPath(ca, cb)
                    return (
                      <g key={i}>
                        <motion.path
                          d={path}
                          fill="none"
                          stroke="rgba(192,57,43,0.3)"
                          strokeWidth="1.2"
                          strokeDasharray="6 5"
                          animate={{ strokeDashoffset: [0, -22] }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear', delay: i * 0.28 }}
                        />
                        <circle r="3.5" fill="#C0392B" opacity="0.9">
                          {
                            // @ts-ignore
                            <animateMotion
                              path={path}
                              dur={`${3.2 + i * 0.35}s`}
                              repeatCount="indefinite"
                            />
                          }
                        </circle>
                      </g>
                    )
                  })}

                  {/* Country dots */}
                  {COUNTRIES.map(country => {
                    const r = dotRadius(country.students)
                    return (
                      <g
                        key={country.code}
                        style={{ cursor: 'pointer' }}
                        onClick={e => openTooltip(country, e)}
                      >
                        <motion.circle
                          cx={country.x}
                          cy={country.y}
                          r={r}
                          fill="rgba(192,57,43,0.12)"
                          stroke="rgba(192,57,43,0.3)"
                          strokeWidth="1"
                          animate={{ scale: [1, 1.4, 1], opacity: [0.65, 0.1, 0.65] }}
                          transition={{
                            duration: 2.6,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: (country.x % 9) * 0.22,
                          }}
                          style={{ originX: `${country.x}px`, originY: `${country.y}px` }}
                        />
                        <circle cx={country.x} cy={country.y} r="5.5" fill="#C0392B" />
                        <circle cx={country.x} cy={country.y} r="3"   fill="#ff7060" />
                      </g>
                    )
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* ── Bottom ── */}
          <div className="gm-bottom">

            {/* Leaderboard */}
            <div className="gm-lb">
              <div className="gm-lb__head">
                <span>Ranking por País</span>
                <span>XP Total</span>
              </div>
              {LEADERBOARD.map((country, i) => (
                <div key={country.code} className="gm-lb__row">
                  <span className={`gm-lb__rank${i === 0 ? ' gm-lb__rank--1' : ''}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className="gm-lb__flag">{country.flag}</span>
                  <div className="gm-lb__info">
                    <div className="gm-lb__name">{country.name}</div>
                    <div className="gm-lb__bar">
                      <motion.div
                        style={{
                          height: '100%',
                          borderRadius: 999,
                          background: 'linear-gradient(90deg,#C0392B,#8B1A1A)',
                          originX: 0,
                        }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: country.xp / MAX_XP }}
                        transition={{ duration: 1, delay: 0.15 + i * 0.055, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <span className="gm-lb__students">{country.students.toLocaleString()} líderes</span>
                  <span className="gm-lb__xp">{(country.xp / 1000).toFixed(1)}K XP</span>
                </div>
              ))}
            </div>

            {/* Personal card */}
            <motion.div
              className="gm-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
            >
              <div className="gm-card__eyebrow">Tu País</div>
              <div className="gm-card__flag">{co.flag}</div>
              <div className="gm-card__country">{co.name}</div>
              <div className="gm-card__rank">Posición #{coRank} de {COUNTRIES.length} países</div>

              <div className="gm-card__stat-label">LÍDERES ACTIVOS</div>
              <div className="gm-card__stat-val">{co.students.toLocaleString()}</div>
              <div className="gm-card__stat-sub">de {total.toLocaleString()} en la red</div>

              <div className="gm-card__sep" />

              <div className="gm-card__stat-label">XP ACUMULADO</div>
              <div className="gm-card__stat-val">{(co.xp / 1000).toFixed(1)}K</div>

              <div className="gm-card__sep" />

              <div className="gm-card__prog-head">
                <span>Progreso vs. #1</span>
                <span>{Math.round(co.xp / MAX_XP * 100)}%</span>
              </div>
              <div className="gm-card__prog">
                <motion.div
                  style={{ height: '100%', borderRadius: 999, background: '#C0392B' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${co.xp / MAX_XP * 100}%` }}
                  transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

          </div>
        </main>
      </div>

      {/* ── Tooltip ── */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            className="gm-tip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, calc(-100% - 14px))',
            }}
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={  { opacity: 0, y: 4,  scale: 0.94 }}
            transition={{ duration: 0.16 }}
          >
            <div className="gm-tip__flag">{tooltip.country.flag}</div>
            <div className="gm-tip__name">{tooltip.country.name}</div>
            <div className="gm-tip__row">
              <span>Líderes</span>
              <b>{tooltip.country.students.toLocaleString()}</b>
            </div>
            <div className="gm-tip__row">
              <span>XP Total</span>
              <b>{(tooltip.country.xp / 1000).toFixed(1)}K</b>
            </div>
            <div className="gm-tip__row">
              <span>Ranking</span>
              <b>#{LEADERBOARD.findIndex(c => c.code === tooltip.country.code) + 1}</b>
            </div>
            <div className="gm-tip__bar">
              <div
                className="gm-tip__fill"
                style={{ width: `${tooltip.country.xp / MAX_XP * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
