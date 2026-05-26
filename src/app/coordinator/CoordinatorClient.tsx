'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area,
} from 'recharts'
import { createClient } from '@/lib/supabase'
import { m, useReducedMotion } from 'framer-motion'
import CoordinatorSidebar from '@/components/CoordinatorSidebar'

interface CoordProfile {
  full_name:   string
  school_id:   string
  school_name: string
}

interface StudentData {
  id:                string
  full_name:         string
  email:             string
  created_at:        string
  total_xp:          number
  modules_completed: number
  active_this_week:  boolean
  tab_switches:      number
}

interface WeekActivity {
  week:   string
  xp:     number
  active: number
}

type SortKey = keyof Pick<StudentData, 'full_name' | 'created_at' | 'total_xp' | 'modules_completed' | 'tab_switches'>
type SortDir  = 'asc' | 'desc'

const PAGE_SIZE = 10
const ONE_WEEK  = 7 * 24 * 60 * 60 * 1000

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

interface Props {
  initialFullName: string
  initialSchoolId: string
}

export default function CoordinatorClient({ initialFullName, initialSchoolId }: Props) {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,      setLoading]      = useState(true)
  const [coord,        setCoord]        = useState<CoordProfile | null>(null)
  const [students,     setStudents]     = useState<StudentData[]>([])
  const [weeklyData,   setWeeklyData]   = useState<WeekActivity[]>([])
  const [prevActive,   setPrevActive]   = useState(0)
  const [prevMods,     setPrevMods]     = useState(0)
  const [hovBar,       setHovBar]       = useState<number | null>(null)

  const [search,  setSearch]  = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('total_xp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page,    setPage]    = useState(1)
  const pref = useReducedMotion()

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    async function load() {
      const schoolId = initialSchoolId

      const { data: schoolRow } = await supabase
        .from('schools').select('name').eq('id', schoolId).maybeSingle()

      setCoord({
        full_name:   initialFullName,
        school_id:   schoolId,
        school_name: schoolRow?.name ?? 'Mi colegio',
      })

      const { data: studs } = await supabase
        .from('profiles').select('id, full_name, email, created_at')
        .eq('school_id', schoolId).eq('role', 'student')

      if (!studs || studs.length === 0) { setLoading(false); return }

      const ids = studs.map((s: { id: string }) => s.id)

      const since  = new Date(Date.now() - ONE_WEEK).toISOString()
      const since2w = new Date(Date.now() - 2 * ONE_WEEK).toISOString()
      const since8w = new Date(Date.now() - 8 * ONE_WEEK).toISOString()

      const [
        { data: xpRows },
        { data: progRows },
        { data: activeRows },
        { data: prevActiveRows },
        { data: switchRows },
        { data: xpWeekly },
      ] = await Promise.all([
        supabase.from('xp_log').select('user_id, amount').in('user_id', ids),
        supabase.from('progress').select('user_id').in('user_id', ids).eq('completed', true),
        supabase.from('xp_log').select('user_id').in('user_id', ids).gte('created_at', since),
        supabase.from('xp_log').select('user_id').in('user_id', ids).gte('created_at', since2w).lt('created_at', since),
        supabase.from('quiz_attempts').select('user_id, tab_switches').in('user_id', ids),
        supabase.from('xp_log').select('user_id, amount, created_at').in('user_id', ids).gte('created_at', since8w),
      ])

      const xpMap: Record<string, number> = {}
      xpRows?.forEach((r: { user_id: string; amount: number }) => { xpMap[r.user_id] = (xpMap[r.user_id] ?? 0) + r.amount })

      const modMap: Record<string, number> = {}
      progRows?.forEach((r: { user_id: string }) => { modMap[r.user_id] = (modMap[r.user_id] ?? 0) + 1 })

      const activeSet     = new Set(activeRows?.map((r: { user_id: string }) => r.user_id))
      const prevActiveSet = new Set(prevActiveRows?.map((r: { user_id: string }) => r.user_id))

      const switchMap: Record<string, number> = {}
      switchRows?.forEach((r: { user_id: string; tab_switches: number | null }) => { switchMap[r.user_id] = (switchMap[r.user_id] ?? 0) + (r.tab_switches ?? 0) })

      // ── Weekly activity last 4 weeks ──
      const wMap: Record<string, { xp: number; active: Set<string> }> = {}
      for (let i = 3; i >= 0; i--) {
        wMap[`S${4 - i}`] = { xp: 0, active: new Set() }
      }
      xpWeekly?.forEach((r: { user_id: string; amount: number; created_at: string }) => {
        const daysAgo = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)
        const weekIdx = Math.min(3, Math.floor(daysAgo / 7))
        const key = `S${4 - weekIdx}`
        if (wMap[key]) {
          wMap[key].xp += r.amount
          wMap[key].active.add(r.user_id)
        }
      })
      setWeeklyData(Object.entries(wMap).map(([week, v]) => ({ week, xp: v.xp, active: v.active.size })))
      setPrevActive(prevActiveSet.size)
      const prevModsTotal = Object.values(modMap).reduce((s, v) => s + v, 0)
      setPrevMods(Math.max(0, prevModsTotal - (modMap ? Object.values(modMap).filter(v => v > 0).length : 0)))

      setStudents(studs.map((s: { id: string; full_name: string | null; email: string | null; created_at: string }) => ({
        id:                s.id,
        full_name:         s.full_name ?? '—',
        email:             s.email ?? '—',
        created_at:        s.created_at,
        total_xp:          xpMap[s.id] ?? 0,
        modules_completed: modMap[s.id] ?? 0,
        active_this_week:  activeSet.has(s.id),
        tab_switches:      switchMap[s.id] ?? 0,
      })))

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const metrics = useMemo(() => {
    if (!students.length) return { total: 0, avgXp: 0, totalMods: 0, activeCount: 0 }
    const total       = students.length
    const avgXp       = Math.round(students.reduce((s, r) => s + r.total_xp, 0) / total)
    const totalMods   = students.reduce((s, r) => s + r.modules_completed, 0)
    const activeCount = students.filter(s => s.active_this_week).length
    return { total, avgXp, totalMods, activeCount }
  }, [students])

  const chartData = useMemo(() =>
    [...students]
      .sort((a, b) => b.total_xp - a.total_xp)
      .slice(0, 10)
      .map(s => ({ name: s.full_name.split(' ')[0], fullName: s.full_name, xp: s.total_xp })),
    [students]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter(s =>
      s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    )
  }, [students, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  function SortArrow({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ color: 'var(--line)', marginLeft: 4, fontSize: 10 }}>↕</span>
    return <span style={{ color: 'var(--accent,#C0392B)', marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const deltaActive = metrics.activeCount - prevActive

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Satoshi",sans-serif;min-height:100dvh;color:var(--ink);}
        .coord-layout{display:flex;height:100dvh;overflow:hidden;width:100%;}
        .main{flex:1;min-width:0;overflow-y:auto;padding:36px 32px 80px;}

        /* ── Page header ── */
        .page-hd{margin-bottom:28px;}
        .page-hd h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:26px;letter-spacing:-0.022em;color:var(--ink);}
        .page-hd p{margin-top:4px;font-size:13px;color:var(--mute);}

        /* ── KPI bento ── */
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
        @media(max-width:1000px){.kpi-grid{grid-template-columns:repeat(2,1fr);}}
        .kpi-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:20px 22px;box-shadow:var(--shadow-card);}
        .kpi-label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);font-weight:700;margin-bottom:10px;}
        .kpi-num{font-family:var(--font-mono,"JetBrains Mono",monospace);font-variant-numeric:tabular-nums;font-weight:700;font-size:34px;letter-spacing:-.02em;line-height:1;color:var(--ink);}
        .kpi-delta{display:flex;align-items:center;gap:3px;margin-top:8px;font-size:11.5px;font-weight:700;font-family:"Satoshi",sans-serif;}
        .kpi-delta.up{color:var(--accent-teal,#0F7B6C);}
        .kpi-delta.down{color:var(--accent,#C0392B);}
        .kpi-delta.neutral{color:var(--mute);}

        /* ── Charts bento ── */
        .charts-bento{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
        @media(max-width:900px){.charts-bento{grid-template-columns:1fr;}}
        .panel{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;box-shadow:var(--shadow-card);}
        .panel__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);margin-bottom:18px;}

        /* ── Table panel ── */
        .table-top{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
        .search{flex:1;padding:9px 14px 9px 34px;border:1px solid var(--line);border-radius:9px;font-size:13px;font-family:inherit;outline:none;background:var(--surface-1,var(--bg-2));color:var(--ink);transition:border-color .2s;max-width:300px;}
        .search:focus{border-color:var(--ink);background:var(--card-bg);}
        .search-wrap{position:relative;}
        .search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--mute);}
        .tbl{width:100%;border-collapse:collapse;font-size:12.5px;}
        .tbl th{text-align:left;padding:9px 14px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute);font-weight:700;border-bottom:1px solid var(--line);white-space:nowrap;cursor:pointer;user-select:none;}
        .tbl th:hover{color:var(--ink);}
        .tbl td{padding:11px 14px;border-bottom:1px solid var(--line-soft);color:var(--ink-2);vertical-align:middle;}
        .tbl tr:last-child td{border-bottom:none;}
        .tbl tbody tr{cursor:pointer;transition:background .12s;}
        .tbl tbody tr:hover td{background:var(--surface-3,var(--bg-2))!important;}
        .badge-active{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:rgba(15,123,108,.1);color:var(--accent-teal,#0F7B6C);border-radius:999px;font-size:11px;font-weight:700;}
        .badge-inactive{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:var(--line);color:var(--mute);border-radius:999px;font-size:11px;font-weight:600;}
        .dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
        .dot.green{background:var(--accent-teal,#0F7B6C);}
        .dot.gray{background:var(--mute);}
        .pagination{display:flex;align-items:center;justify-content:space-between;margin-top:16px;font-size:12px;color:var(--mute);}
        .pg-btns{display:flex;gap:5px;}
        .pg-btn{padding:5px 11px;border:1px solid var(--line);border-radius:7px;background:none;font-size:11.5px;cursor:pointer;color:var(--ink-2);transition:all .12s;font-family:"Satoshi",sans-serif;}
        .pg-btn:hover:not(:disabled){border-color:var(--ink);color:var(--ink);}
        .pg-btn:disabled{opacity:.35;cursor:default;}
        .pg-btn.active{background:var(--ink);color:var(--bg);border-color:var(--ink);}
        @media(max-width:900px){.main{padding:24px 16px 60px;}}
        @media(max-width:600px){
          .tbl th:nth-child(3),.tbl td:nth-child(3){display:none;}
          .kpi-grid{grid-template-columns:1fr 1fr;}
        }
      `}</style>

      <div className="coord-layout">
        <CoordinatorSidebar
          userName={loading ? '…' : (coord?.full_name ?? '…')}
          userInitial={coord?.full_name?.[0]?.toUpperCase() ?? 'C'}
          schoolName={loading ? '…' : (coord?.school_name ?? 'Mi Colegio')}
        />

        <m.main
          className="main"
          initial={pref ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="page-hd">
            <h1>Panel del Coordinador</h1>
            <p>Seguimiento de tus estudiantes · {coord?.school_name}</p>
          </div>

          {/* ── KPI Grid ── */}
          <m.div
            className="kpi-grid"
            initial={pref ? false : 'hidden'}
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="kpi-card">
                  <Sk w="60%" h={10} r={4} />
                  <div style={{ marginTop: 12 }}><Sk w="50%" h={34} r={6} /></div>
                  <div style={{ marginTop: 8 }}><Sk w="70%" h={10} r={4} /></div>
                </div>
              ))
            ) : ([
              {
                label: 'Estudiantes',
                num: metrics.total,
                border: 'var(--line-strong)',
                color: 'var(--ink)',
                delta: undefined as number | undefined,
                deltaLabel: '',
              },
              {
                label: 'Promedio XP',
                num: metrics.avgXp,
                border: 'var(--accent-amber,#D4821A)',
                color: 'var(--accent-amber,#D4821A)',
                delta: undefined as number | undefined,
                deltaLabel: '',
              },
              {
                label: 'Módulos completados',
                num: metrics.totalMods,
                border: 'var(--accent-teal,#0F7B6C)',
                color: 'var(--accent-teal,#0F7B6C)',
                delta: metrics.totalMods - prevMods,
                deltaLabel: 'vs sem. ant.',
              },
              {
                label: 'Activos esta semana',
                num: metrics.activeCount,
                border: 'var(--accent,#C0392B)',
                color: metrics.activeCount > 0 ? 'var(--accent,#C0392B)' : 'var(--ink)',
                delta: deltaActive,
                deltaLabel: 'vs sem. ant.',
              },
            ] as const).map(({ label, num, border, color, delta, deltaLabel }) => {
              const isUp   = delta !== undefined && delta > 0
              const isDown = delta !== undefined && delta < 0
              return (
                <m.div
                  key={label}
                  className="kpi-card"
                  style={{ borderLeft: `3px solid ${border}` }}
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } }}
                >
                  <div className="kpi-label">{label}</div>
                  <div className="kpi-num" style={{ color }}>{num.toLocaleString('es-CO')}</div>
                  {delta !== undefined && (
                    <div className={`kpi-delta ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
                      <span>{isUp ? '↑' : isDown ? '↓' : '–'}</span>
                      <span>{Math.abs(delta)}</span>
                      <span style={{ fontWeight: 400, opacity: 0.65, fontSize: 11 }}>{deltaLabel}</span>
                    </div>
                  )}
                </m.div>
              )
            })}
          </m.div>

          {/* ── Charts Bento ── */}
          <div className="charts-bento">
            {/* Bar chart: XP Top 10 */}
            <div className="panel">
              <div className="panel__title">XP por estudiante — Top 10</div>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Array.from({ length: 6 }).map((_, i) => <Sk key={i} h={16} r={4} w={`${90 - i * 8}%`} />)}
                </div>
              ) : chartData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--mute)', fontSize: 13 }}>Sin datos de XP todavía.</div>
              ) : (
                <m.div
                  initial={pref ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 40)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.5} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--mute)', fontFamily: 'Satoshi,sans-serif' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: 'var(--ink-2)', fontFamily: 'Satoshi,sans-serif' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(13,13,13,0.04)' }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null
                          const d = payload[0].payload
                          return (
                            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow-raised)', fontFamily: '"Satoshi",sans-serif' }}>
                              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{d.fullName}</div>
                              <div style={{ color: 'var(--accent-amber,#D4821A)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 18 }}>{d.xp.toLocaleString('es-CO')} <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 400 }}>XP</span></div>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="xp" radius={[0, 4, 4, 0]} maxBarSize={24}
                        onMouseEnter={(_, i) => setHovBar(i)}
                        onMouseLeave={() => setHovBar(null)}
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={hovBar === i ? 'var(--accent,#C0392B)' : 'var(--ink,#0D0D0D)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </m.div>
              )}
            </div>

            {/* Area chart: Weekly activity */}
            <div className="panel">
              <div className="panel__title">Actividad del colegio — últimas 4 semanas</div>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[70, 50, 90, 60].map((w, i) => <Sk key={i} w={`${w}%`} h={10} r={4} />)}
                </div>
              ) : weeklyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--mute)', fontSize: 13 }}>Sin actividad registrada.</div>
              ) : (
                <m.div
                  initial={pref ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={weeklyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#C0392B" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#C0392B" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#0F7B6C" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#0F7B6C" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--mute)', fontFamily: 'Satoshi,sans-serif' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--mute)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow-raised)', fontFamily: '"Satoshi",sans-serif' }}>
                              <div style={{ fontWeight: 700, color: 'var(--mute)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                              {payload.map((p, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: 2, background: p.color as string }} />
                                  <span style={{ color: 'var(--ink-2)' }}>{p.name === 'xp' ? 'XP total' : 'Estudiantes activos'}: </span>
                                  <span style={{ fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{(p.value as number).toLocaleString('es-CO')}</span>
                                </div>
                              ))}
                            </div>
                          )
                        }}
                      />
                      <Area type="monotone" dataKey="xp"     stroke="#C0392B" strokeWidth={2} fill="url(#xpGrad)"     dot={{ r: 3, fill: '#C0392B', strokeWidth: 0 }} name="xp" />
                      <Area type="monotone" dataKey="active" stroke="#0F7B6C" strokeWidth={2} fill="url(#activeGrad)" dot={{ r: 3, fill: '#0F7B6C', strokeWidth: 0 }} name="active" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    {[{ color: '#C0392B', label: 'XP total' }, { color: '#0F7B6C', label: 'Activos' }].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                        <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: '"Satoshi",sans-serif' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </m.div>
              )}
            </div>
          </div>

          {/* ── Students table ── */}
          <div className="panel">
            <div className="panel__title">Estudiantes</div>
            <div className="table-top">
              <div className="search-wrap">
                <svg className="search-icon" width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  className="search"
                  type="text"
                  placeholder="Buscar por nombre o email…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
              <span style={{ fontSize: 12, color: 'var(--mute)', marginLeft: 'auto', fontFamily: '"Satoshi",sans-serif' }}>
                {filtered.length} estudiante{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => <Sk key={i} h={18} r={4} />)}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th onClick={() => toggleSort('full_name')}>Nombre <SortArrow col="full_name" /></th>
                        <th>Email</th>
                        <th onClick={() => toggleSort('created_at')}>Registro <SortArrow col="created_at" /></th>
                        <th onClick={() => toggleSort('total_xp')} style={{ textAlign: 'right' }}>XP <SortArrow col="total_xp" /></th>
                        <th onClick={() => toggleSort('modules_completed')} style={{ textAlign: 'right' }}>Módulos <SortArrow col="modules_completed" /></th>
                        <th onClick={() => toggleSort('tab_switches')} style={{ textAlign: 'right' }}>Salidas <SortArrow col="tab_switches" /></th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--mute)', padding: '40px 0', fontSize: 13 }}>
                            {search ? 'Sin resultados para esa búsqueda.' : 'No hay estudiantes registrados todavía.'}
                          </td>
                        </tr>
                      ) : pageRows.map(s => (
                        <tr key={s.id} onClick={() => router.push('/coordinator/students/' + s.id)} title="Ver perfil completo →">
                          <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.full_name}</td>
                          <td style={{ color: 'var(--mute)', fontSize: 12 }}>{s.email}</td>
                          <td style={{ color: 'var(--mute)', whiteSpace: 'nowrap', fontSize: 12 }}>
                            {new Date(s.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-amber,#D4821A)' }}>{s.total_xp.toLocaleString('es-CO')}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.modules_completed}</td>
                          <td style={{ textAlign: 'right' }}>
                            {s.tab_switches === 0 ? <span style={{ color: 'var(--mute)', fontSize: 11 }}>—</span> : s.tab_switches > 3 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'rgba(192,57,43,.1)', color: 'var(--accent,#C0392B)', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                                ⚠ {s.tab_switches}
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'rgba(212,130,26,.1)', color: 'var(--accent-amber,#D4821A)', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                                {s.tab_switches}
                              </span>
                            )}
                          </td>
                          <td>
                            {s.active_this_week ? (
                              <span className="badge-active"><span className="dot green" />Activo</span>
                            ) : (
                              <span className="badge-inactive"><span className="dot gray" />Inactivo</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}</span>
                    <div className="pg-btns">
                      <button className="pg-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Ant.</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                        .reduce<(number | '…')[]>((acc, p, i, arr) => {
                          if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                          acc.push(p); return acc
                        }, [])
                        .map((p, i) => p === '…'
                          ? <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--mute)' }}>…</span>
                          : <button key={p} className={`pg-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p as number)}>{p}</button>
                        )
                      }
                      <button className="pg-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Sig. →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </m.main>
      </div>
    </>
  )
}
