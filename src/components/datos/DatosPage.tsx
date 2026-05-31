'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line,
  AreaChart, Area, PieChart, Pie,
} from 'recharts'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import AppSidebar from '@/components/AppSidebar'
import StatCard from '@/components/shared/StatCard'

// ── Constants ─────────────────────────────────────────────────────────────────

const C = {
  accent:  '#C0392B',
  amber:   '#D4813A',
  teal:    '#2A9D8F',
  muted:   '#8B8B8B',
  purple:  '#6B6FCF',
  green:   '#27AE60',
}

const CHART_COLORS = [C.accent, C.teal, C.amber, C.muted, C.purple, C.green]

const PIE_COLORS: Record<string, string> = {
  pending:  C.amber,
  approved: C.teal,
  rejected: C.accent,
  default:  C.muted,
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SchoolStat {
  school_id:         string
  school_name:       string
  student_count:     number
  total_xp:          number
  avg_xp:            number
  modules_completed: number
  projects_total:    number
  projects_approved: number
  score:             number
}

interface SummaryData {
  totalStudents:    number
  totalXP:          number
  avgXP:            number
  modulesCompleted: number
  pendingProjects:  number
  approvedProjects: number
  rejectedProjects: number
  badgesAwarded:    number
  activeThisWeek:   number
  retentionRate:    number
  schoolStats:      SchoolStat[]
  weeklyGrowth:     { week: string; students: number }[]
  weeklyActivity:   { week: string; actions: number }[]
  xpBySchool:       { school: string; avg_xp: number }[]
  modulesBySchool:  { school: string; modules: number }[]
  projectsByStatus: { name: string; value: number }[]
}

type TabKey = 'resumen' | 'constructor' | 'insights'

type ChartType   = 'bar' | 'line' | 'area' | 'pie'
type MetricKey   = 'xp_total' | 'xp_avg' | 'students' | 'modules' | 'projects' | 'badges' | 'activity'
type DimensionKey = 'school' | 'week' | 'status'

interface ConstructorConfig {
  mode:        'quick' | 'advanced'
  quickPreset: string
  metric:      MetricKey
  dimension:   DimensionKey
  chartType:   ChartType
  showValues:  boolean
  showAvg:     boolean
}

interface SavedDashboard {
  id:         string
  name:       string
  config:     ConstructorConfig
  created_at: string
}

interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface DatosPageProps {
  role?:         'coordinator' | 'admin'
  showSidebar?:  boolean
  userName?:     string
  userInitial?:  string
  schoolName?:   string
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function shortName(name: string): string {
  return name.replace(/^(I\.?E\.?|C\.?E\.?|Instituto|Colegio)\s+/i, '').slice(0, 16)
}

function fmtXP(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function groupByWeek(dates: string[]): { week: string; count: number }[] {
  const map: Record<string, number> = {}
  dates.forEach(d => {
    const date   = new Date(d)
    const mon    = new Date(date)
    mon.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    const key    = mon.toISOString().slice(5, 10) // MM-DD
    map[key]     = (map[key] ?? 0) + 1
  })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([week, count]) => ({ week, count }))
}

function downloadCSV(rows: object[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv     = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify((r as Record<string, unknown>)[h] ?? '')).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function exportChartPNG(containerRef: React.RefObject<HTMLDivElement | null>) {
  const svg = containerRef.current?.querySelector('svg')
  if (!svg) return
  const data    = new XMLSerializer().serializeToString(svg)
  const blob    = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
  const url     = URL.createObjectURL(blob)
  const img     = new Image()
  img.onload = () => {
    const canvas  = document.createElement('canvas')
    canvas.width  = svg.clientWidth  || 600
    canvas.height = svg.clientHeight || 380
    const ctx     = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    const a = document.createElement('a')
    a.download = 'grafica.png'; a.href = canvas.toDataURL('image/png'); a.click()
  }
  img.src = url
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchSummary(sb: ReturnType<typeof createClient>): Promise<SummaryData> {
  const weekAgo       = new Date(Date.now() -  7 * 86400000).toISOString()
  const monthAgo      = new Date(Date.now() - 30 * 86400000).toISOString()
  const eightWeeksAgo = new Date(Date.now() - 56 * 86400000).toISOString()

  const [
    studentsRes, xpRes, progressRes, projectsRes, badgesRes,
    weekActRes, monthActRes, schoolsRes, growthRes, activityRes,
  ] = await Promise.all([
    sb.from('profiles').select('id, school_id').eq('role', 'student'),
    sb.from('xp_log').select('user_id, xp'),
    sb.from('progress').select('user_id').eq('completed', true),
    sb.from('projects').select('status, school_id'),
    sb.from('user_badges').select('id'),
    sb.from('activity_feed').select('user_id').gte('created_at', weekAgo),
    sb.from('activity_feed').select('user_id').gte('created_at', monthAgo),
    sb.from('schools').select('id, name'),
    sb.from('profiles').select('created_at').eq('role', 'student').gte('created_at', eightWeeksAgo),
    sb.from('activity_feed').select('created_at').gte('created_at', eightWeeksAgo),
  ])

  const students = studentsRes.data ?? []
  const xpLogs   = xpRes.data    ?? []
  const progress = progressRes.data ?? []
  const projects = projectsRes.data ?? []
  const schools  = schoolsRes.data  ?? []

  // Aggregate XP per student
  const xpByUser: Record<string, number> = {}
  xpLogs.forEach((r: any) => { xpByUser[r.user_id] = (xpByUser[r.user_id] ?? 0) + r.xp })

  const modulesByUser: Record<string, number> = {}
  progress.forEach((r: any) => { modulesByUser[r.user_id] = (modulesByUser[r.user_id] ?? 0) + 1 })

  const totalStudents     = students.length
  const totalXP           = Object.values(xpByUser).reduce((a, b) => a + b, 0)
  const avgXP             = totalStudents ? Math.round(totalXP / totalStudents) : 0
  const modulesCompleted  = progress.length
  const pendingProjects   = projects.filter((p: any) => p.status === 'pending').length
  const approvedProjects  = projects.filter((p: any) => p.status === 'approved').length
  const rejectedProjects  = projects.filter((p: any) => p.status === 'rejected').length
  const badgesAwarded     = badgesRes.data?.length ?? 0
  const activeThisWeek    = new Set(weekActRes.data?.map((r: any) => r.user_id) ?? []).size
  const activeThisMonth   = new Set(monthActRes.data?.map((r: any) => r.user_id) ?? []).size
  const retentionRate     = totalStudents ? Math.round(activeThisMonth / totalStudents * 100) : 0

  // Per-school aggregation
  const schoolMap: Record<string, string> = {}
  schools.forEach((s: any) => { schoolMap[s.id] = s.name })

  type SchoolAgg = { students: number; xp: number; modules: number; projects: number; approved: number }
  const agg: Record<string, SchoolAgg> = {}
  const init = (): SchoolAgg => ({ students: 0, xp: 0, modules: 0, projects: 0, approved: 0 })

  students.forEach((s: any) => {
    const sid  = s.school_id ?? 'unknown'
    if (!agg[sid]) agg[sid] = init()
    agg[sid].students++
    agg[sid].xp      += xpByUser[s.id]      ?? 0
    agg[sid].modules += modulesByUser[s.id] ?? 0
  })

  projects.forEach((p: any) => {
    const sid = p.school_id ?? 'unknown'
    if (!agg[sid]) agg[sid] = init()
    agg[sid].projects++
    if (p.status === 'approved') agg[sid].approved++
  })

  // Compute school score
  const rawAvgXPs = Object.values(agg).map(a => a.students ? a.xp / a.students : 0)
  const maxAvgXP  = Math.max(...rawAvgXPs, 1)

  const schoolStats: SchoolStat[] = Object.entries(agg).map(([sid, a]) => {
    const avg_xp       = a.students ? Math.round(a.xp / a.students) : 0
    const xpScore      = (avg_xp / maxAvgXP) * 40
    const moduleRate   = a.students ? Math.min(a.modules / a.students / 5, 1) : 0
    const projectRate  = a.projects ? a.approved / a.projects : 0
    const score        = Math.round(xpScore + moduleRate * 30 + projectRate * 30)
    return {
      school_id:         sid,
      school_name:       schoolMap[sid] ?? sid,
      student_count:     a.students,
      total_xp:          a.xp,
      avg_xp,
      modules_completed: a.modules,
      projects_total:    a.projects,
      projects_approved: a.approved,
      score,
    }
  }).sort((a, b) => b.score - a.score)

  const weeklyGrowth   = groupByWeek(growthRes.data?.map((r: any) => r.created_at)   ?? []).map(r => ({ week: r.week, students: r.count }))
  const weeklyActivity = groupByWeek(activityRes.data?.map((r: any) => r.created_at) ?? []).map(r => ({ week: r.week, actions:  r.count }))
  const xpBySchool     = schoolStats.slice(0, 7).map(s => ({ school: shortName(s.school_name), avg_xp: s.avg_xp }))
  const modulesBySchool = schoolStats.slice(0, 7).map(s => ({ school: shortName(s.school_name), modules: s.modules_completed }))
  const projectsByStatus = [
    { name: 'Enviados',   value: pendingProjects  },
    { name: 'Aprobados',  value: approvedProjects },
    { name: 'Rechazados', value: rejectedProjects },
  ].filter(p => p.value > 0)

  return {
    totalStudents, totalXP, avgXP, modulesCompleted,
    pendingProjects, approvedProjects, rejectedProjects,
    badgesAwarded, activeThisWeek, retentionRate,
    schoolStats, weeklyGrowth, weeklyActivity,
    xpBySchool, modulesBySchool, projectsByStatus,
  }
}

// ── Small shared components ───────────────────────────────────────────────────

function ChartSkeleton({ h = 280 }: { h?: number }) {
  return (
    <div style={{
      height: h, borderRadius: 12,
      background: 'linear-gradient(90deg,var(--bg-2,#EFECE6) 25%,var(--card-bg,#fff) 50%,var(--bg-2,#EFECE6) 75%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

function ErrorCard({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div style={{
      padding: '20px 24px', borderRadius: 12,
      border: '1px solid rgba(192,57,43,.2)',
      background: 'rgba(192,57,43,.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    }}>
      <span style={{ fontSize: 13, color: 'var(--ink-2,#2D2D2D)' }}>⚠ {msg}</span>
      <button
        onClick={onRetry}
        style={{
          padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(192,57,43,.3)',
          background: 'transparent', color: 'var(--accent,#C0392B)',
          fontSize: 12, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, cursor: 'pointer',
        }}
      >Reintentar</button>
    </div>
  )
}

function CT({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--card-bg,#fff)', border: '1px solid var(--line,rgba(13,13,13,.1))',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      fontFamily: '"Satoshi",sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,.08)',
    }}>
      {label && <p style={{ margin: '0 0 6px', color: 'var(--mute,#6B6B6B)', fontSize: 11 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.value >= 100 ? fmtXP(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

const GRID_STYLE = { stroke: 'var(--line,rgba(13,13,13,.08))', strokeDasharray: '3 3' }
const TICK_STYLE = { fontSize: 11, fill: 'var(--mute,#6B6B6B)', fontFamily: '"Satoshi",sans-serif' }

// Inline markdown renderer (avoids ESM issues with react-markdown v10)
function renderMd(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## '))  return <h3 key={i} style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 5px', color: 'var(--ink,#0D0D0D)', fontFamily: '"Satoshi",sans-serif' }}>{line.slice(3)}</h3>
    if (line.startsWith('# '))   return <h2 key={i} style={{ fontSize: 16, fontWeight: 700, margin: '18px 0 7px', color: 'var(--ink,#0D0D0D)', fontFamily: '"Satoshi",sans-serif' }}>{line.slice(2)}</h2>
    if (line.startsWith('- '))   return <li key={i} style={{ fontSize: 13, color: 'var(--ink-2,#2D2D2D)', marginLeft: 18, marginBottom: 3, lineHeight: 1.6 }}>{parseBold(line.slice(2))}</li>
    if (line === '')             return <div key={i} style={{ height: 7 }} />
    return <p key={i} style={{ fontSize: 13, color: 'var(--ink-2,#2D2D2D)', lineHeight: 1.65, margin: '3px 0', fontFamily: '"Satoshi",sans-serif' }}>{parseBold(line)}</p>
  })
}
function parseBold(text: string): React.ReactNode {
  return text.split(/(\*\*.*?\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

// ── TAB 1 — Resumen ───────────────────────────────────────────────────────────

type SortKey = keyof Omit<SchoolStat, 'school_id' | 'school_name'>
type SortDir  = 'asc' | 'desc'

const ResumenContent = memo(function ResumenContent({
  data, loading, error, onRetry,
}: { data: SummaryData | null; loading: boolean; error: string; onRetry: () => void }) {

  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(k: SortKey) {
    setSortDir(prev => k === sortKey ? (prev === 'desc' ? 'asc' : 'desc') : 'desc')
    setSortKey(k)
  }

  const sorted = data?.schoolStats.slice().sort((a, b) => {
    const v = (a[sortKey] as number) - (b[sortKey] as number)
    return sortDir === 'desc' ? -v : v
  }) ?? []

  function exportSchoolCSV() {
    if (!data?.schoolStats.length) return
    downloadCSV(data.schoolStats.map(s => ({
      Colegio:     s.school_name,
      Estudiantes: s.student_count,
      XP_Total:    s.total_xp,
      XP_Promedio: s.avg_xp,
      Módulos:     s.modules_completed,
      Proyectos:   s.projects_total,
      Aprobados:   s.projects_approved,
      Score:       s.score,
    })), 'ranking-colegios.csv')
  }

  if (error) return <ErrorCard msg={error} onRetry={onRetry} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <ChartSkeleton key={i} h={100} />)
          : [
            { num: data?.totalStudents  ?? 0, label: 'Estudiantes',            accent: false                  },
            { num: data?.totalXP        ?? 0, label: 'XP Total',               accent: false, suffix: ' xp'  },
            { num: data?.avgXP          ?? 0, label: 'XP Promedio',            accent: true                   },
            { num: data?.modulesCompleted ?? 0, label: 'Módulos completados',  accent: false                  },
            { num: data?.badgesAwarded  ?? 0, label: 'Badges otorgados',       accent: false                  },
            { num: (data?.pendingProjects ?? 0) + (data?.approvedProjects ?? 0) + (data?.rejectedProjects ?? 0), label: 'Proyectos enviados', accent: false },
            { num: data?.activeThisWeek ?? 0, label: 'Activos esta semana',    accent: false                  },
            { num: data?.retentionRate  ?? 0, label: 'Retención 30 días',      accent: false, suffix: '%'    },
          ].map((kpi, i) => (
            <StatCard key={i} {...kpi} />
          ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="XP promedio por colegio" loading={loading}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.xpBySchool ?? []} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid {...GRID_STYLE} horizontal={false} />
              <XAxis type="number" tick={TICK_STYLE} />
              <YAxis type="category" dataKey="school" tick={TICK_STYLE} width={90} />
              <Tooltip content={<CT />} />
              <Bar dataKey="avg_xp" name="XP Prom." fill={C.accent} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Proyectos por estado" loading={loading}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data?.projectsByStatus ?? []}
                dataKey="value" nameKey="name"
                cx="50%" cy="50%"
                outerRadius={90} innerRadius={50}
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                labelLine={false}
              >
                {(data?.projectsByStatus ?? []).map((entry, i) => (
                  <Cell key={i} fill={PIE_COLORS[entry.name.toLowerCase().replace('enviados','pending').replace('aprobados','approved').replace('rechazados','rejected')] ?? CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CT />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <ChartCard title="Crecimiento semanal (8 sem.)" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.weeklyGrowth ?? []}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="week" tick={TICK_STYLE} />
              <YAxis tick={TICK_STYLE} />
              <Tooltip content={<CT />} />
              <Line type="monotone" dataKey="students" name="Nuevos" stroke={C.teal} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Actividad semanal global" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data?.weeklyActivity ?? []}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.accent} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="week" tick={TICK_STYLE} />
              <YAxis tick={TICK_STYLE} />
              <Tooltip content={<CT />} />
              <Area type="monotone" dataKey="actions" name="Acciones" stroke={C.accent} strokeWidth={2} fill="url(#actGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Módulos por colegio" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.modulesBySchool ?? []}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="school" tick={{ ...TICK_STYLE, fontSize: 9 }} />
              <YAxis tick={TICK_STYLE} />
              <Tooltip content={<CT />} />
              <Bar dataKey="modules" name="Módulos" fill={C.purple} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Ranking table */}
      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,rgba(13,13,13,.08))', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line,rgba(13,13,13,.08))' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink,#0D0D0D)', fontFamily: '"Satoshi",sans-serif' }}>Ranking de colegios</span>
          <button
            onClick={exportSchoolCSV}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--line,rgba(13,13,13,.1))', background: 'transparent', fontSize: 12, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, color: 'var(--mute,#6B6B6B)', cursor: 'pointer' }}
          >Exportar CSV</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {loading ? <div style={{ padding: 20 }}><ChartSkeleton h={160} /></div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: '"Satoshi",sans-serif', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-2,#EFECE6)' }}>
                  {([
                    { k: null,               label: 'Colegio'       },
                    { k: 'student_count',    label: 'Estudiantes'   },
                    { k: 'total_xp',         label: 'XP Total'      },
                    { k: 'avg_xp',           label: 'XP Prom.'      },
                    { k: 'modules_completed',label: 'Módulos'       },
                    { k: 'projects_total',   label: 'Proyectos'     },
                    { k: 'score',            label: 'Score'         },
                  ] as { k: SortKey | null; label: string }[]).map(({ k, label }) => (
                    <th
                      key={label}
                      onClick={k ? () => handleSort(k) : undefined}
                      style={{
                        padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11,
                        letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--mute,#6B6B6B)',
                        cursor: k ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      {label}{k && k === sortKey ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => (
                  <tr key={s.school_id} style={{ borderBottom: '1px solid var(--line,rgba(13,13,13,.06))' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--ink,#0D0D0D)' }}>
                      <span style={{ marginRight: 8, opacity: 0.4, fontSize: 11 }}>{i + 1}</span>
                      {s.school_name}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--ink-2,#2D2D2D)' }}>{s.student_count}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--ink-2,#2D2D2D)' }}>{fmtXP(s.total_xp)}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--ink-2,#2D2D2D)' }}>{s.avg_xp}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--ink-2,#2D2D2D)' }}>{s.modules_completed}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--ink-2,#2D2D2D)' }}>{s.projects_total}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          height: 4, width: Math.max(s.score, 4), maxWidth: 80, borderRadius: 4,
                          background: s.score >= 60 ? C.teal : s.score >= 30 ? C.amber : C.muted,
                        }} />
                        <span style={{ fontWeight: 700, color: 'var(--ink,#0D0D0D)', fontSize: 13 }}>{s.score}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
})

// ── Shared chart card wrapper ─────────────────────────────────────────────────

function ChartCard({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,rgba(13,13,13,.08))', borderRadius: 14, padding: '16px 20px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink,#0D0D0D)', fontFamily: '"Satoshi",sans-serif', marginBottom: 14 }}>{title}</div>
      {loading ? <ChartSkeleton /> : children}
    </div>
  )
}

// ── TAB 2 — Constructor ───────────────────────────────────────────────────────

const QUICK_PRESETS = [
  { value: 'xp_school',       label: 'XP por colegio'          },
  { value: 'students_school', label: 'Estudiantes por colegio'  },
  { value: 'modules_school',  label: 'Progreso de módulos'      },
  { value: 'projects_status', label: 'Proyectos por estado'     },
  { value: 'activity_weekly', label: 'Actividad semanal'        },
  { value: 'ranking',         label: 'Rankings comparativos'    },
]

const METRICS: { value: MetricKey; label: string }[] = [
  { value: 'xp_avg',    label: 'XP Promedio'            },
  { value: 'xp_total',  label: 'XP Total'               },
  { value: 'students',  label: 'Conteo estudiantes'      },
  { value: 'modules',   label: 'Módulos completados'     },
  { value: 'projects',  label: 'Proyectos aprobados'     },
  { value: 'badges',    label: 'Badges otorgados'        },
  { value: 'activity',  label: 'Actividad (acciones)'    },
]

const DIMENSIONS: { value: DimensionKey; label: string }[] = [
  { value: 'school', label: 'Por colegio'   },
  { value: 'week',   label: 'Por semana'    },
  { value: 'status', label: 'Por estado'    },
]

const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: 'bar',  label: 'Barras',  icon: '▬' },
  { value: 'line', label: 'Línea',   icon: '╱' },
  { value: 'area', label: 'Área',    icon: '◺' },
  { value: 'pie',  label: 'Pastel',  icon: '◒' },
]

const DEFAULT_CONFIG: ConstructorConfig = {
  mode:        'quick',
  quickPreset: 'xp_school',
  metric:      'xp_avg',
  dimension:   'school',
  chartType:   'bar',
  showValues:  false,
  showAvg:     false,
}

const ConstructorContent = memo(function ConstructorContent({
  summaryData,
}: { summaryData: SummaryData | null }) {

  const [config,        setConfig]        = useState<ConstructorConfig>(DEFAULT_CONFIG)
  const [chartData,     setChartData]     = useState<Record<string, unknown>[]>([])
  const [chartReady,    setChartReady]    = useState(false)
  const [generating,    setGenerating]    = useState(false)
  const [savedDashes,   setSavedDashes]   = useState<SavedDashboard[]>([])
  const [saveModal,     setSaveModal]     = useState(false)
  const [saveName,      setSaveName]      = useState('')
  const [saving,        setSaving]        = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const sbRef    = useRef<ReturnType<typeof createClient> | null>(null)
  const getSB    = () => { if (!sbRef.current) sbRef.current = createClient(); return sbRef.current }

  // Load saved dashboards on mount
  useEffect(() => {
    void loadSaved()
  }, [])

  async function loadSaved() {
    try {
      const { data } = await getSB().from('saved_dashboards').select('id, name, config, created_at').order('created_at', { ascending: false }).limit(20)
      setSavedDashes((data as SavedDashboard[]) ?? [])
    } catch { /* table might not exist yet */ }
  }

  function getPresetData(preset: string): { data: Record<string, unknown>[]; chartType: ChartType; xKey: string; yKey: string; yLabel: string } {
    if (!summaryData) return { data: [], chartType: 'bar', xKey: 'x', yKey: 'y', yLabel: '' }
    switch (preset) {
      case 'xp_school':       return { data: summaryData.xpBySchool.map(r => ({ x: r.school, y: r.avg_xp })), chartType: 'bar',  xKey: 'x', yKey: 'y', yLabel: 'XP Prom.' }
      case 'students_school': return { data: summaryData.schoolStats.map(s => ({ x: shortName(s.school_name), y: s.student_count })), chartType: 'bar', xKey: 'x', yKey: 'y', yLabel: 'Estudiantes' }
      case 'modules_school':  return { data: summaryData.modulesBySchool.map(r => ({ x: r.school, y: r.modules })), chartType: 'bar', xKey: 'x', yKey: 'y', yLabel: 'Módulos' }
      case 'projects_status': return { data: summaryData.projectsByStatus.map(r => ({ x: r.name, y: r.value })), chartType: 'pie', xKey: 'x', yKey: 'y', yLabel: 'Proyectos' }
      case 'activity_weekly': return { data: summaryData.weeklyActivity.map(r => ({ x: r.week, y: r.actions })), chartType: 'area', xKey: 'x', yKey: 'y', yLabel: 'Acciones' }
      case 'ranking':         return { data: summaryData.schoolStats.map(s => ({ x: shortName(s.school_name), y: s.score })), chartType: 'bar', xKey: 'x', yKey: 'y', yLabel: 'Score' }
      default:                return { data: [], chartType: 'bar', xKey: 'x', yKey: 'y', yLabel: '' }
    }
  }

  function generate() {
    setGenerating(true)
    if (config.mode === 'quick') {
      const preset = getPresetData(config.quickPreset)
      setChartData(preset.data)
      setConfig(prev => ({ ...prev, chartType: preset.chartType }))
    } else {
      // Advanced mode: use summary data based on metric + dimension
      if (!summaryData) { setChartData([]); setGenerating(false); return }
      let result: Record<string, unknown>[] = []
      if (config.dimension === 'school') {
        result = summaryData.schoolStats.map(s => ({
          x: shortName(s.school_name),
          y: config.metric === 'xp_avg' ? s.avg_xp
            : config.metric === 'xp_total' ? s.total_xp
            : config.metric === 'students' ? s.student_count
            : config.metric === 'modules'  ? s.modules_completed
            : config.metric === 'projects' ? s.projects_approved : 0,
        }))
      } else if (config.dimension === 'week') {
        result = config.metric === 'activity'
          ? summaryData.weeklyActivity.map(r => ({ x: r.week, y: r.actions }))
          : summaryData.weeklyGrowth.map(r => ({ x: r.week, y: r.students }))
      } else if (config.dimension === 'status') {
        result = summaryData.projectsByStatus.map(r => ({ x: r.name, y: r.value }))
      }
      setChartData(result)
    }
    setGenerating(false)
    setChartReady(true)
  }

  const presetMeta = getPresetData(config.quickPreset)

  function renderChart() {
    const data   = chartReady ? chartData : []
    const cType  = config.chartType
    const avg    = data.length ? data.reduce((s, r) => s + (r.y as number), 0) / data.length : 0

    if (cType === 'pie') return (
      <PieChart>
        <Pie data={data.map(r => ({ name: r.x, value: r.y }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={3}
          label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}
        >
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip content={<CT />} />
      </PieChart>
    )
    if (cType === 'line') return (
      <LineChart data={data}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey="x" tick={TICK_STYLE} />
        <YAxis tick={TICK_STYLE} />
        <Tooltip content={<CT />} />
        <Line type="monotone" dataKey="y" name="Valor" stroke={C.accent} strokeWidth={2} dot={false} />
        {config.showAvg && <Line type="monotone" dataKey={() => avg} name="Promedio" stroke={C.muted} strokeDasharray="4 4" dot={false} />}
      </LineChart>
    )
    if (cType === 'area') return (
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={C.accent} stopOpacity={0.15} />
            <stop offset="95%" stopColor={C.accent} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey="x" tick={TICK_STYLE} />
        <YAxis tick={TICK_STYLE} />
        <Tooltip content={<CT />} />
        <Area type="monotone" dataKey="y" name="Valor" stroke={C.accent} strokeWidth={2} fill="url(#cg)" />
      </AreaChart>
    )
    return (
      <BarChart data={data}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey="x" tick={{ ...TICK_STYLE, fontSize: 10 }} />
        <YAxis tick={TICK_STYLE} />
        <Tooltip content={<CT />} />
        <Bar dataKey="y" name="Valor" fill={C.accent} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    )
  }

  async function saveDashboard() {
    if (!saveName.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await getSB().auth.getUser()
      if (!user) return
      await getSB().from('saved_dashboards').insert({ user_id: user.id, name: saveName.trim(), config })
      setSaveModal(false)
      setSaveName('')
      await loadSaved()
    } catch { /* table might not exist */ }
    setSaving(false)
  }

  async function deleteDashboard(id: string) {
    try {
      await getSB().from('saved_dashboards').delete().eq('id', id)
      setSavedDashes(prev => prev.filter(d => d.id !== id))
    } catch {}
  }

  const sel: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line,rgba(13,13,13,.1))', background: 'var(--card-bg,#fff)', fontSize: 13, color: 'var(--ink,#0D0D0D)', fontFamily: '"Satoshi",sans-serif', width: '100%', cursor: 'pointer' }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mute,#6B6B6B)', marginBottom: 6, display: 'block', fontFamily: '"Satoshi",sans-serif' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

      {/* Panel de configuración */}
      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,rgba(13,13,13,.08))', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['quick', 'advanced'] as const).map(m => (
            <button key={m}
              onClick={() => setConfig(p => ({ ...p, mode: m }))}
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: config.mode === m ? 'var(--accent,#C0392B)' : 'var(--line,rgba(13,13,13,.1))', background: config.mode === m ? 'rgba(192,57,43,.08)' : 'transparent', color: config.mode === m ? 'var(--accent,#C0392B)' : 'var(--mute,#6B6B6B)' }}
            >{m === 'quick' ? 'Modo rápido' : 'Avanzado'}</button>
          ))}
        </div>

        {config.mode === 'quick' ? (
          <div>
            <span style={lbl}>Métrica predefinida</span>
            <select style={sel} value={config.quickPreset} onChange={e => setConfig(p => ({ ...p, quickPreset: e.target.value }))}>
              {QUICK_PRESETS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div>
              <span style={lbl}>Métrica (eje Y)</span>
              <select style={sel} value={config.metric} onChange={e => setConfig(p => ({ ...p, metric: e.target.value as MetricKey }))}>
                {METRICS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <span style={lbl}>Dimensión (eje X)</span>
              <select style={sel} value={config.dimension} onChange={e => setConfig(p => ({ ...p, dimension: e.target.value as DimensionKey }))}>
                {DIMENSIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <span style={lbl}>Tipo de gráfica</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {CHART_TYPES.map(ct => (
                  <button key={ct.value}
                    onClick={() => setConfig(p => ({ ...p, chartType: ct.value }))}
                    style={{ padding: '10px 4px', borderRadius: 8, fontSize: 18, border: '1px solid', cursor: 'pointer', borderColor: config.chartType === ct.value ? 'var(--accent,#C0392B)' : 'var(--line)', background: config.chartType === ct.value ? 'rgba(192,57,43,.08)' : 'transparent' }}
                    title={ct.label}
                  >{ct.icon}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: '"Satoshi",sans-serif', color: 'var(--ink-2,#2D2D2D)', cursor: 'pointer' }}>
                <input type="checkbox" checked={config.showValues} onChange={e => setConfig(p => ({ ...p, showValues: e.target.checked }))} />
                Mostrar valores
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: '"Satoshi",sans-serif', color: 'var(--ink-2,#2D2D2D)', cursor: 'pointer' }}>
                <input type="checkbox" checked={config.showAvg} onChange={e => setConfig(p => ({ ...p, showAvg: e.target.checked }))} />
                Línea de promedio
              </label>
            </div>
          </>
        )}

        <button
          onClick={generate}
          disabled={generating || !summaryData}
          style={{ padding: '11px 0', borderRadius: 10, background: 'var(--accent,#C0392B)', color: '#fff', border: 'none', fontSize: 13, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, cursor: 'pointer', opacity: (!summaryData || generating) ? 0.5 : 1 }}
        >{generating ? 'Generando…' : 'Generar gráfica'}</button>

        {/* Saved dashboards */}
        {savedDashes.length > 0 && (
          <div>
            <span style={lbl}>Mis dashboards</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {savedDashes.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-2,#EFECE6)' }}>
                  <span style={{ flex: 1, fontSize: 12, fontFamily: '"Satoshi",sans-serif', color: 'var(--ink,#0D0D0D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <button onClick={() => { setConfig(d.config); setChartReady(false) }} style={{ fontSize: 11, color: 'var(--accent,#C0392B)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"Satoshi",sans-serif', fontWeight: 600 }}>Cargar</button>
                  <button onClick={() => deleteDashboard(d.id)} style={{ fontSize: 11, color: 'var(--mute,#6B6B6B)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chart display */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div ref={chartRef} style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,rgba(13,13,13,.08))', borderRadius: 14, padding: '20px 20px 14px', minHeight: 340 }}>
          {!chartReady ? (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute,#6B6B6B)', fontSize: 13, fontFamily: '"Satoshi",sans-serif' }}>
              Configura y presiona &ldquo;Generar gráfica&rdquo;
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              {renderChart()}
            </ResponsiveContainer>
          )}
        </div>

        {chartReady && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSaveModal(true)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card-bg,#fff)', fontSize: 12, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, color: 'var(--ink-2,#2D2D2D)', cursor: 'pointer' }}>Guardar dashboard</button>
            <button onClick={() => exportChartPNG(chartRef)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card-bg,#fff)', fontSize: 12, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, color: 'var(--ink-2,#2D2D2D)', cursor: 'pointer' }}>Exportar PNG</button>
            <button
              onClick={() => downloadCSV(chartData, 'datos-grafica.csv')}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card-bg,#fff)', fontSize: 12, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, color: 'var(--ink-2,#2D2D2D)', cursor: 'pointer' }}
            >Exportar CSV</button>
          </div>
        )}
      </div>

      {/* Save modal */}
      <AnimatePresence>
        {saveModal && (
          <>
            <m.div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSaveModal(false)}
            />
            <m.div
              style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border)', borderRadius: 16, padding: 28, width: 360 }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: '"Satoshi",sans-serif', marginBottom: 16 }}>Guardar dashboard</h3>
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void saveDashboard() }}
                placeholder="Nombre del dashboard"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, fontFamily: '"Satoshi",sans-serif', background: 'var(--bg-2,#EFECE6)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => setSaveModal(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', fontSize: 13, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, color: 'var(--mute)', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => void saveDashboard()} disabled={saving || !saveName.trim()} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--accent,#C0392B)', color: '#fff', fontSize: 13, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
})

// ── TAB 3 — IA Insights ───────────────────────────────────────────────────────

const CHIPS = [
  '¿Qué colegio necesita más atención?',
  '¿Cuál es la tendencia de XP este mes?',
  '¿Qué módulo tiene menos completaciones?',
  '¿Dónde hay más abandono?',
  'Resumen ejecutivo del programa',
]

const InsightsContent = memo(function InsightsContent({
  summaryData, loading: dataLoading,
}: { summaryData: SummaryData | null; loading: boolean }) {

  const [autoInsight,  setAutoInsight]  = useState('')
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiError,      setAiError]      = useState('')
  const [messages,     setMessages]     = useState<ChatMessage[]>([])
  const [input,        setInput]        = useState('')
  const [chatLoading,  setChatLoading]  = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  async function callInsights(msgs: ChatMessage[]) {
    const res = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, dataContext: buildContext() }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error ?? 'Error del servidor')
    }
    const { text } = await res.json()
    return text as string
  }

  function buildContext() {
    if (!summaryData) return {}
    return {
      totalStudents:   summaryData.totalStudents,
      totalXP:         summaryData.totalXP,
      avgXP:           summaryData.avgXP,
      modulesCompleted:summaryData.modulesCompleted,
      retentionRate:   summaryData.retentionRate,
      activeThisWeek:  summaryData.activeThisWeek,
      projectStats:    { pending: summaryData.pendingProjects, approved: summaryData.approvedProjects, rejected: summaryData.rejectedProjects },
      schools:         summaryData.schoolStats.map(s => ({ name: s.school_name, students: s.student_count, avgXP: s.avg_xp, modules: s.modules_completed, projects: s.projects_total, score: s.score })),
      topPerformers:   summaryData.schoolStats.slice(0, 2).map(s => s.school_name),
      bottomPerformers:summaryData.schoolStats.slice(-2).map(s => s.school_name),
    }
  }

  async function generateAuto() {
    if (dataLoading || !summaryData) return
    setAiLoading(true); setAiError('')
    try {
      const text = await callInsights([{ role: 'user', content: 'Genera un análisis completo del programa con los datos proporcionados. Identifica fortalezas, debilidades, y 3 acciones concretas prioritarias.' }])
      setAutoInsight(text)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Error inesperado')
    }
    setAiLoading(false)
  }

  useEffect(() => {
    if (!dataLoading && summaryData && !autoInsight && !aiLoading) {
      void generateAuto()
    }
  }, [dataLoading, summaryData]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage(text: string) {
    if (!text.trim() || messages.length >= 20) return
    const userMsg: ChatMessage = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next); setInput(''); setChatLoading(true)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    try {
      const reply = await callInsights(next)
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'desconocido'}` }])
    }
    setChatLoading(false)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, alignItems: 'start', minHeight: 0 }}>

      {/* Auto insights panel */}
      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,rgba(13,13,13,.08))', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-2,#EFECE6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: '"Satoshi",sans-serif' }}>Análisis automático</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', background: 'rgba(192,57,43,.1)', color: 'var(--accent,#C0392B)', borderRadius: 999, padding: '3px 9px', fontFamily: '"Satoshi",sans-serif', animation: aiLoading ? 'pulse 1.5s ease infinite' : 'none' }}>IA</span>
          </div>
          <button onClick={generateAuto} disabled={aiLoading || dataLoading} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', fontSize: 12, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, color: 'var(--mute)', cursor: 'pointer', opacity: (aiLoading || dataLoading) ? 0.5 : 1 }}>
            {aiLoading ? 'Analizando…' : 'Regenerar'}
          </button>
        </div>
        <div style={{ padding: '20px 24px', maxHeight: 520, overflowY: 'auto' }}>
          {aiError && <ErrorCard msg={aiError} onRetry={generateAuto} />}
          {aiLoading && !aiError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[100, 85, 90, 70, 80].map((w, i) => <ChartSkeleton key={i} h={14} />)}
            </div>
          )}
          {!aiLoading && autoInsight && (
            <div>{renderMd(autoInsight)}</div>
          )}
          {!aiLoading && !autoInsight && !aiError && (
            <p style={{ color: 'var(--mute)', fontSize: 13, fontFamily: '"Satoshi",sans-serif' }}>Esperando datos para generar análisis…</p>
          )}
        </div>
        <div style={{ padding: '10px 24px', borderTop: '1px solid var(--line)', fontSize: 10.5, color: 'var(--mute)', fontFamily: '"Satoshi",sans-serif' }}>
          Análisis basado en datos reales de Supabase · Generado por Claude
        </div>
      </div>

      {/* Chat panel */}
      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,rgba(13,13,13,.08))', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', background: 'var(--bg-2,#EFECE6)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: '"Satoshi",sans-serif' }}>Pregunta sobre tus datos</span>
          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--mute)', fontFamily: '"Satoshi",sans-serif' }}>{messages.length}/20 mensajes</span>
        </div>

        {/* Suggestion chips */}
        {messages.length === 0 && (
          <div style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: 6, borderBottom: '1px solid var(--line)' }}>
            {CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--bg-2,#EFECE6)', fontSize: 11, fontFamily: '"Satoshi",sans-serif', color: 'var(--ink-2)', cursor: 'pointer' }}
              >{chip}</button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', minHeight: 200, maxHeight: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
              <div style={{
                padding: '10px 14px', borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                background: msg.role === 'user' ? 'var(--accent,#C0392B)' : 'var(--bg-2,#EFECE6)',
                color: msg.role === 'user' ? '#fff' : 'var(--ink,#0D0D0D)',
                fontSize: 13, fontFamily: '"Satoshi",sans-serif', lineHeight: 1.55,
              }}>
                {msg.role === 'assistant' ? renderMd(msg.content) : msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '12px 12px 12px 3px', background: 'var(--bg-2,#EFECE6)', fontSize: 13, color: 'var(--mute)' }}>…</div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(input) } }}
            placeholder={messages.length >= 20 ? 'Límite alcanzado' : 'Pregunta sobre los datos…'}
            disabled={messages.length >= 20 || chatLoading}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-2,#EFECE6)', fontSize: 13, fontFamily: '"Satoshi",sans-serif', color: 'var(--ink)', outline: 'none' }}
          />
          <button
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || messages.length >= 20 || chatLoading}
            style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--accent,#C0392B)', color: '#fff', border: 'none', fontSize: 13, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, cursor: 'pointer', opacity: (!input.trim() || messages.length >= 20) ? 0.4 : 1 }}
          >→</button>
        </div>
      </div>
    </div>
  )
})

// ── Main DatosPage ────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'resumen',     label: 'Resumen'       },
  { key: 'constructor', label: 'Constructor'   },
  { key: 'insights',    label: 'IA Insights'   },
]

export default memo(function DatosPage({
  role = 'coordinator',
  showSidebar = true,
  userName = '…',
  userInitial = 'U',
  schoolName,
}: DatosPageProps) {
  const [tab,         setTab]         = useState<TabKey>('resumen')
  const [summary,     setSummary]     = useState<SummaryData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [dataError,   setDataError]   = useState('')
  const [updatedAt,   setUpdatedAt]   = useState('')
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null)
  const getSB = () => { if (!sbRef.current) sbRef.current = createClient(); return sbRef.current }

  const load = useCallback(async () => {
    setLoadingData(true); setDataError('')
    try {
      if (MOCK_MODE) {
        const k = MOCK.analytics.kpis
        setSummary({
          totalStudents:    k.totalStudents,
          totalXP:          k.totalXP,
          avgXP:            k.avgXP,
          modulesCompleted: k.modulesCompleted,
          pendingProjects:  k.projectsPending,
          approvedProjects: k.projectsApproved,
          rejectedProjects: k.projectsRejected,
          badgesAwarded:    k.badgesAwarded,
          activeThisWeek:   k.activeThisWeek,
          retentionRate:    k.retentionRate,
          schoolStats: MOCK.schools.map(s => ({
            school_id:         s.id,
            school_name:       s.name,
            student_count:     s.students,
            total_xp:          s.students * s.avgXP,
            avg_xp:            s.avgXP,
            modules_completed: s.modulesCompleted,
            projects_total:    s.projectsApproved + 3,
            projects_approved: s.projectsApproved,
            score:             s.score,
          })),
          weeklyGrowth:     MOCK.analytics.weeklyGrowth,
          weeklyActivity:   MOCK.analytics.weeklyActivity,
          xpBySchool:       MOCK.schools.map(s => ({ school: s.name.replace(/^(I\.?E\.?|C\.?E\.?|Instituto|Colegio)\s+/i,'').slice(0,16), avg_xp: s.avgXP })),
          modulesBySchool:  MOCK.schools.map(s => ({ school: s.name.replace(/^(I\.?E\.?|C\.?E\.?|Instituto|Colegio)\s+/i,'').slice(0,16), modules: s.modulesCompleted })),
          projectsByStatus: [
            { name:'Enviados',   value: k.projectsPending },
            { name:'Aprobados',  value: k.projectsApproved },
            { name:'Rechazados', value: k.projectsRejected },
          ],
        })
        setUpdatedAt(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }))
        setLoadingData(false)
        return
      }
      const data = await fetchSummary(getSB())
      setSummary(data)
      setUpdatedAt(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }))
    } catch (e) {
      setDataError(e instanceof Error ? e.message : 'Error cargando datos')
    }
    setLoadingData(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load() }, [load])

  const mainContent = (
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '32px 36px', gap: 24, overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink,#0D0D0D)', fontFamily: '"Satoshi",sans-serif', letterSpacing: '-.02em', margin: 0 }}>Centro de Datos</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--mute,#6B6B6B)', fontFamily: '"Satoshi",sans-serif' }}>Análisis completo del programa Big Family</p>
            </div>
            {updatedAt && (
              <span style={{ fontSize: 11, color: 'var(--mute,#6B6B6B)', fontFamily: '"Satoshi",sans-serif', background: 'var(--card-bg,#fff)', border: '1px solid var(--line)', borderRadius: 999, padding: '5px 12px' }}>
                Actualizado {updatedAt}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--line,rgba(13,13,13,.1))', paddingBottom: 0 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  position: 'relative', padding: '10px 18px 12px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13.5, fontFamily: '"Satoshi",sans-serif', fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? 'var(--ink,#0D0D0D)' : 'var(--mute,#6B6B6B)',
                  transition: 'color .15s',
                }}
              >
                {t.label}
                {tab === t.key && (
                  <m.div
                    layoutId="datos-tab-indicator"
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'var(--accent,#C0392B)', borderRadius: '2px 2px 0 0' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                {t.key === 'insights' && (
                  <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'rgba(192,57,43,.1)', color: 'var(--accent,#C0392B)', borderRadius: 999, padding: '1px 6px' }}>IA</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <m.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === 'resumen'     && <ResumenContent data={summary} loading={loadingData} error={dataError} onRetry={load} />}
              {tab === 'constructor' && <ConstructorContent summaryData={summary} />}
              {tab === 'insights'    && <InsightsContent summaryData={summary} loading={loadingData} />}
            </m.div>
          </AnimatePresence>
      </main>
  )

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
      {showSidebar ? (
        <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg,#F5F3EF)' }}>
          <AppSidebar
            role={role}
            userName={userName}
            userInitial={userInitial}
            schoolName={schoolName}
          />
          {mainContent}
        </div>
      ) : mainContent}
    </>
  )
})
