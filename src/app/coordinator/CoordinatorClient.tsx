'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { createClient } from '@/lib/supabase'
import { motion, useReducedMotion } from 'framer-motion'

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

type SortKey = keyof Pick<StudentData, 'full_name' | 'created_at' | 'total_xp' | 'modules_completed' | 'tab_switches'>
type SortDir  = 'asc' | 'desc'

const PAGE_SIZE = 10
const ONE_WEEK  = 7 * 24 * 60 * 60 * 1000

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)',
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

  const [loading,  setLoading]  = useState(true)
  const [coord,    setCoord]    = useState<CoordProfile | null>(null)
  const [students, setStudents] = useState<StudentData[]>([])

  const [search,  setSearch]  = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('total_xp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page,    setPage]    = useState(1)
  const [hovBar,  setHovBar]  = useState<number | null>(null)
  const pref = useReducedMotion()

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    async function load() {
      const schoolId = initialSchoolId

      const { data: schoolRow } = await supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .maybeSingle()

      setCoord({
        full_name:   initialFullName,
        school_id:   schoolId,
        school_name: schoolRow?.name ?? 'Mi colegio',
      })

      const { data: studs } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('school_id', schoolId)
        .eq('role', 'student')

      if (!studs || studs.length === 0) { setLoading(false); return }

      const ids = studs.map((s: { id: string }) => s.id)

      const { data: xpRows } = await supabase
        .from('xp_log')
        .select('user_id, amount')
        .in('user_id', ids)

      const xpMap: Record<string, number> = {}
      xpRows?.forEach(r => { xpMap[r.user_id] = (xpMap[r.user_id] ?? 0) + r.amount })

      const { data: progRows } = await supabase
        .from('progress')
        .select('user_id')
        .in('user_id', ids)
        .eq('completed', true)

      const modMap: Record<string, number> = {}
      progRows?.forEach(r => { modMap[r.user_id] = (modMap[r.user_id] ?? 0) + 1 })

      const since = new Date(Date.now() - ONE_WEEK).toISOString()
      const [{ data: activeRows }, { data: switchRows }] = await Promise.all([
        supabase.from('xp_log').select('user_id').in('user_id', ids).gte('created_at', since),
        supabase.from('quiz_attempts').select('user_id, tab_switches').in('user_id', ids),
      ])

      const activeSet = new Set(activeRows?.map(r => r.user_id))

      const switchMap: Record<string, number> = {}
      switchRows?.forEach(r => { switchMap[r.user_id] = (switchMap[r.user_id] ?? 0) + (r.tab_switches ?? 0) })

      setStudents(studs.map(s => ({
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
  }, [])

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
    if (sortKey !== col) return <span style={{ color: '#ccc', marginLeft: 4 }}>↕</span>
    return <span style={{ color: '#C0392B', marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  async function handleLogout() {
    if (supabaseRef.current) await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Inter",system-ui,sans-serif;min-height:100vh;color:var(--ink);}
        .nav{position:sticky;top:0;z-index:30;background:var(--bg);backdrop-filter:saturate(150%) blur(16px);border-bottom:1px solid var(--line);height:62px;display:flex;align-items:center;padding:0 40px;gap:24px;}
        .nav__brand{display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;color:var(--ink);flex-shrink:0;}
        .nav__school{flex:1;text-align:center;font-size:13.5px;font-weight:600;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .nav__right{display:flex;align-items:center;gap:12px;flex-shrink:0;}
        .nav__badge{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;background:#FFF4E6;color:#7A4A00;border:1px solid #FFD699;border-radius:999px;padding:3px 10px;font-weight:700;}
        .nav__name{font-size:13px;color:var(--ink-2);font-weight:500;}
        .btn-dashboard{background:transparent;border:1px solid var(--line);border-radius:999px;padding:8px 16px;font-size:13px;color:var(--ink);cursor:pointer;transition:border-color .2s,background .2s;white-space:nowrap;font-family:inherit;}
        .btn-dashboard:hover{border-color:var(--ink);background:var(--line);}
        .btn-logout{background:none;border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:12px;color:var(--mute);cursor:pointer;transition:all .2s;white-space:nowrap;}
        .btn-logout:hover{border-color:var(--ink);color:var(--ink);}
        .main{max-width:1200px;margin:0 auto;padding:44px 40px 80px;}
        .page-header{margin-bottom:36px;}
        .page-header h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:28px;letter-spacing:-0.022em;color:var(--ink);}
        .page-header p{margin-top:5px;font-size:13.5px;color:var(--mute);}
        .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;}
        .mcard{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:22px 24px;box-shadow:0 2px 12px -4px rgba(13,13,13,.07);}
        .mcard__label{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);font-weight:600;margin-bottom:10px;}
        .mcard__num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:36px;letter-spacing:-0.03em;line-height:1;color:var(--ink);}
        .mcard__num.accent{color:#C0392B;}
        .mcard__sub{margin-top:6px;font-size:12px;color:var(--mute);}
        .panel{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:28px;box-shadow:0 2px 12px -4px rgba(13,13,13,.07);margin-bottom:24px;}
        .panel__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);margin-bottom:20px;}
        .chart-wrap{overflow-x:auto;}
        .table-top{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
        .search{flex:1;padding:10px 14px 10px 36px;border:1px solid var(--line);border-radius:10px;font-size:13.5px;font-family:inherit;outline:none;background:var(--bg-2);color:var(--ink);transition:border-color .2s;max-width:320px;}
        .search:focus{border-color:var(--ink);background:var(--card-bg);}
        .search-wrap{position:relative;}
        .search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--mute);}
        .tbl{width:100%;border-collapse:collapse;font-size:13px;}
        .tbl th{text-align:left;padding:10px 14px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);font-weight:600;border-bottom:1px solid var(--line);white-space:nowrap;cursor:pointer;user-select:none;}
        .tbl th:hover{color:var(--ink);}
        .tbl td{padding:12px 14px;border-bottom:1px solid var(--line-soft);color:var(--ink-2);vertical-align:middle;}
        .tbl tr:last-child td{border-bottom:none;}
        .tbl tr:nth-child(even) td{background:var(--bg-2);}
        .tbl tbody tr{cursor:pointer;transition:background .15s;}
        .tbl tbody tr:hover td{background:rgba(13,13,13,0.02)!important;}
        .badge-active{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:#eaf3de;color:#27500A;border-radius:999px;font-size:11px;font-weight:600;}
        .badge-inactive{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:var(--line);color:var(--mute);border-radius:999px;font-size:11px;font-weight:600;}
        .dot{width:5px;height:5px;border-radius:50%;}
        .dot.green{background:#27500A;}
        .dot.gray{background:var(--mute);}
        .pagination{display:flex;align-items:center;justify-content:space-between;margin-top:18px;font-size:12.5px;color:var(--mute);}
        .pg-btns{display:flex;gap:6px;}
        .pg-btn{padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:none;font-size:12px;cursor:pointer;color:var(--ink-2);transition:all .15s;}
        .pg-btn:hover:not(:disabled){border-color:var(--ink);color:var(--ink);}
        .pg-btn:disabled{opacity:.4;cursor:default;}
        .pg-btn.active{background:var(--ink);color:var(--bg);border-color:var(--ink);}
        @media(max-width:900px){
          .metrics{grid-template-columns:repeat(2,1fr);}
          .main{padding:28px 20px 60px;}
          .nav{padding:0 20px;}
          .nav__school{display:none;}
        }
        @media(max-width:600px){
          .metrics{grid-template-columns:1fr 1fr;}
          .tbl th:nth-child(3),.tbl td:nth-child(3){display:none;}
        }
      `}</style>

      <nav className="nav">
        <a className="nav__brand" href="/">
          <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          Big Family
        </a>
        <div className="nav__school">
          {loading ? <Sk w={160} h={14} r={6} /> : coord?.school_name}
        </div>
        <div className="nav__right">
          <span className="nav__badge">Coordinador</span>
          <span className="nav__name">
            {loading ? <Sk w={100} h={13} r={5} /> : coord?.full_name}
          </span>
          <button className="btn-dashboard" onClick={() => router.push('/coordinator/projects')}>Proyectos</button>
          <button className="btn-dashboard" onClick={() => router.push('/coordinator/modules')}>Módulos</button>
          <button className="btn-dashboard" onClick={() => router.push('/coordinator/news')}>Noticias</button>
          <button className="btn-dashboard" onClick={() => router.push('/dashboard')}>Ver Dashboard</button>
          <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </nav>

      <motion.main
        className="main"
        initial={pref ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="page-header">
          <h1>Panel del Coordinador</h1>
          <p>Seguimiento de tus estudiantes · {coord?.school_name}</p>
        </div>

        <div className="metrics">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mcard">
                <Sk w="60%" h={10} r={5} />
                <div style={{ marginTop: 14 }}><Sk w="50%" h={36} r={6} /></div>
                <div style={{ marginTop: 8 }}><Sk w="70%" h={10} r={5} /></div>
              </div>
            ))
          ) : (<>
            <motion.div className="mcard" initial={pref ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0 }}>
              <div className="mcard__label">Estudiantes</div>
              <div className="mcard__num">{metrics.total}</div>
              <div className="mcard__sub">registrados en el colegio</div>
            </motion.div>
            <motion.div className="mcard" initial={pref ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.07 }}>
              <div className="mcard__label">Promedio XP</div>
              <div className="mcard__num">{metrics.avgXp.toLocaleString()}</div>
              <div className="mcard__sub">puntos por estudiante</div>
            </motion.div>
            <motion.div className="mcard" initial={pref ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.14 }}>
              <div className="mcard__label">Módulos completados</div>
              <div className="mcard__num">{metrics.totalMods}</div>
              <div className="mcard__sub">en total por el grupo</div>
            </motion.div>
            <motion.div className="mcard" initial={pref ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.21 }}>
              <div className="mcard__label">Activos esta semana</div>
              <div className={`mcard__num ${metrics.activeCount > 0 ? 'accent' : ''}`}>
                {metrics.activeCount}
              </div>
              <div className="mcard__sub">de {metrics.total} estudiantes</div>
            </motion.div>
          </>)}
        </div>

        <div className="panel">
          <div className="panel__title">XP por estudiante — Top 10</div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 6 }).map((_, i) => <Sk key={i} h={18} r={5} w={`${90 - i * 8}%`} />)}
            </div>
          ) : chartData.length === 0 ? (
            <p style={{ color: '#9a9690', fontSize: 13 }}>Sin datos de XP todavía.</p>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 44)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,13,13,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9a9690' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: '#2D2D2D' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(13,13,13,0.04)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const d = payload[0].payload
                      return (
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, boxShadow: '0 8px 24px -8px rgba(13,13,13,.2)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{d.fullName}</div>
                          <div style={{ color: '#C0392B', fontFamily: 'Satoshi', fontWeight: 700, fontSize: 20, marginTop: 2 }}>{d.xp.toLocaleString()} <span style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 400 }}>XP</span></div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="xp" radius={[0, 5, 5, 0]} maxBarSize={28}
                    onMouseEnter={(_, i) => setHovBar(i)}
                    onMouseLeave={() => setHovBar(null)}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={hovBar === i ? '#C0392B' : '#0D0D0D'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel__title">Estudiantes</div>
          <div className="table-top">
            <div className="search-wrap">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
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
            <span style={{ fontSize: 12, color: '#9a9690', marginLeft: 'auto' }}>
              {filtered.length} estudiante{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => <Sk key={i} h={20} r={5} />)}
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
                      <th onClick={() => toggleSort('total_xp')}>XP total <SortArrow col="total_xp" /></th>
                      <th onClick={() => toggleSort('modules_completed')}>Módulos <SortArrow col="modules_completed" /></th>
                      <th onClick={() => toggleSort('tab_switches')}>Salidas <SortArrow col="tab_switches" /></th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: '#9a9690', padding: '32px 0' }}>
                          {search ? 'Sin resultados para esa búsqueda.' : 'No hay estudiantes registrados todavía.'}
                        </td>
                      </tr>
                    ) : pageRows.map(s => (
                      <tr
                        key={s.id}
                        onClick={() => router.push('/coordinator/students/' + s.id)}
                        title="Ver perfil completo →"
                      >
                        <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                        <td style={{ color: '#6B6B6B' }}>{s.email}</td>
                        <td style={{ color: '#6B6B6B', whiteSpace: 'nowrap' }}>
                          {new Date(s.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'Satoshi', fontWeight: 700 }}>{s.total_xp.toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: '#9a9690', marginLeft: 3 }}>xp</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{s.modules_completed}</td>
                        <td style={{ textAlign: 'center' }}>
                          {s.tab_switches === 0 ? null : s.tab_switches > 3 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#FEE2E2', color: '#991B1B', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                              ⚠️ {s.tab_switches} salidas
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#FFFBEB', color: '#92400E', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                              {s.tab_switches} salidas
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
                        ? <span key={`e${i}`} style={{ padding: '0 4px', color: '#9a9690' }}>…</span>
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
      </motion.main>
    </>
  )
}
