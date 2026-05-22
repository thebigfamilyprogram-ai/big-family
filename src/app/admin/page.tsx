'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { showToast, ToastContainer } from '@/components/Toast'

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = 'stats' | 'users' | 'projects' | 'evaluations'

interface UserRow {
  id:          string
  full_name:   string | null
  email:       string | null
  role:        string | null
  created_at:  string
  school_name: string | null
}

interface ProjectRow {
  id:           string
  title:        string | null
  status:       string
  submitted_at: string | null
  created_at:   string
  student_name: string | null
  school_name:  string | null
}

interface EvalRow {
  id:               string
  project_id:       string
  project_title:    string | null
  student_name:     string | null
  coordinator_name: string | null
  resultado:        string | null
  feedback:         string | null
  evaluated_at:     string
  admin_confirmed:  boolean
}

interface Stats {
  students:       number
  total_projects: number
  submitted:      number
  approved:       number
  rejected:       number
}

// ── Meta maps ─────────────────────────────────────────────────────────────────
const RESULTADO_META: Record<string, { label: string; color: string; bg: string }> = {
  mencion_honor:     { label: 'Mención de Honor',  color: '#713F12', bg: '#FEF9C3' },
  certificado:       { label: 'Certificado',        color: '#065F46', bg: '#D1FAE5' },
  retroalimentacion: { label: 'Retroalimentación',  color: '#92400E', bg: '#FEF3C7' },
  no_certificado:    { label: 'No certificado',     color: '#991B1B', bg: '#FEE2E2' },
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Borrador',  color: '#6B6B6B', bg: 'rgba(13,13,13,.07)' },
  pending:  { label: 'Pendiente', color: '#92400E', bg: '#FEF3C7'            },
  approved: { label: 'Aprobado',  color: '#065F46', bg: '#D1FAE5'            },
  rejected: { label: 'Rechazado', color: '#991B1B', bg: '#FEE2E2'            },
}

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  student:     { label: 'Estudiante',  color: '#0D0D0D', bg: 'rgba(13,13,13,.07)' },
  coordinator: { label: 'Coordinador', color: '#4C1D95', bg: '#EDE9FE'            },
  expositor:   { label: 'Expositor',   color: '#065F46', bg: '#D1FAE5'            },
  admin:       { label: 'Admin',       color: '#fff',    bg: '#C0392B'            },
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, color, background: bg, fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function StatCard({ num, label, accent = false }: { num: number; label: string; accent?: boolean }) {
  return (
    <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,rgba(13,13,13,.07))', borderRadius: 16, padding: '24px 28px', boxShadow: '0 2px 12px -4px rgba(13,13,13,.07)' }}>
      <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 900, fontSize: 40, letterSpacing: '-.03em', lineHeight: 1, color: accent ? '#C0392B' : 'var(--ink,#0D0D0D)' }}>{num.toLocaleString('es-CO')}</div>
      <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 8, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [tab,       setTab]       = useState<Tab>('stats')
  const [booting,   setBooting]   = useState(true)
  const [adminName, setAdminName] = useState('Admin')

  const [users,    setUsers]    = useState<UserRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [evals,    setEvals]    = useState<EvalRow[]>([])
  const [stats,    setStats]    = useState<Stats | null>(null)

  const [loadingUsers,    setLoadingUsers]    = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingEvals,    setLoadingEvals]    = useState(false)

  const [userSearch,     setUserSearch]     = useState('')
  const [projectStatus,  setProjectStatus]  = useState('all')
  const [confirmingId,   setConfirmingId]   = useState<string | null>(null)
  const [userPage,       setUserPage]       = useState(0)
  const [projectPage,    setProjectPage]    = useState(0)

  // ── Boot: auth check + stats ───────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('full_name, role').eq('id', user.id).maybeSingle()

      if (profile?.role !== 'admin') { router.replace('/dashboard'); return }

      setAdminName(profile?.full_name ?? 'Admin')
      await fetchStats(supabase)
      setBooting(false)
    }
    boot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy tab loading ───────────────────────────────────────────────────────
  useEffect(() => {
    if (booting) return
    if (tab === 'users'       && users.length    === 0) fetchUsers()
    if (tab === 'projects'    && projects.length === 0) fetchProjects()
    if (tab === 'evaluations' && evals.length    === 0) fetchEvals()
  }, [tab, booting]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetchers ──────────────────────────────────────────────────────────
  async function fetchStats(sb: ReturnType<typeof createClient>) {
    const [
      { count: students },
      { count: total_projects },
      { count: submitted },
      { count: approved },
      { count: rejected },
    ] = await Promise.all([
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      sb.from('projects').select('id', { count: 'exact', head: true }),
      sb.from('projects').select('id', { count: 'exact', head: true }).in('status', ['pending', 'approved', 'rejected']),
      sb.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      sb.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    ])
    setStats({ students: students ?? 0, total_projects: total_projects ?? 0, submitted: submitted ?? 0, approved: approved ?? 0, rejected: rejected ?? 0 })
  }

  async function fetchUsers() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    setLoadingUsers(true)

    const { data: profileData } = await supabase
      .from('profiles').select('id, full_name, email, role, created_at, school_id')
      .order('created_at', { ascending: false })

    if (!profileData) { setLoadingUsers(false); return }

    const schoolIds = [...new Set(profileData.map((p: { school_id: string | null }) => p.school_id).filter(Boolean))] as string[]
    const { data: schoolData } = schoolIds.length
      ? await supabase.from('schools').select('id, name').in('id', schoolIds)
      : { data: [] as { id: string; name: string }[] }

    const schoolMap: Record<string, string> = {}
    schoolData?.forEach((s: { id: string; name: string }) => { schoolMap[s.id] = s.name })

    setUsers(profileData.map((u: { id: string; full_name: string | null; email: string | null; role: string | null; created_at: string; school_id: string | null }) => ({
      id:          u.id,
      full_name:   u.full_name,
      email:       u.email,
      role:        u.role,
      created_at:  u.created_at,
      school_name: u.school_id ? (schoolMap[u.school_id] ?? null) : null,
    })))
    setLoadingUsers(false)
  }

  async function fetchProjects() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    setLoadingProjects(true)

    const { data: projData } = await supabase
      .from('projects').select('id, title, status, submitted_at, created_at, user_id, school_id')
      .order('created_at', { ascending: false })

    if (!projData) { setLoadingProjects(false); return }

    const userIds   = [...new Set(projData.map((p: { user_id: string }) => p.user_id).filter(Boolean))] as string[]
    const schoolIds = [...new Set(projData.map((p: { school_id: string | null }) => p.school_id).filter(Boolean))] as string[]

    const [{ data: profileData }, { data: schoolData }] = await Promise.all([
      userIds.length   ? supabase.from('profiles').select('id, full_name').in('id', userIds)   : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      schoolIds.length ? supabase.from('schools').select('id, name').in('id', schoolIds)       : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ])

    const profileMap: Record<string, string> = {}
    profileData?.forEach((p: { id: string; full_name: string | null }) => { profileMap[p.id] = p.full_name ?? '—' })
    const schoolMap: Record<string, string> = {}
    schoolData?.forEach((s: { id: string; name: string }) => { schoolMap[s.id] = s.name })

    setProjects(projData.map((p: { id: string; title: string | null; status: string; submitted_at: string | null; created_at: string; user_id: string; school_id: string | null }) => ({
      id:           p.id,
      title:        p.title,
      status:       p.status,
      submitted_at: p.submitted_at,
      created_at:   p.created_at,
      student_name: p.user_id   ? (profileMap[p.user_id]   ?? null) : null,
      school_name:  p.school_id ? (schoolMap[p.school_id]  ?? null) : null,
    })))
    setLoadingProjects(false)
  }

  async function fetchEvals() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    setLoadingEvals(true)

    const { data: evalData } = await supabase
      .from('capstone_evaluations')
      .select('id, project_id, resultado, feedback, evaluated_at, admin_confirmed, coordinator_id, projects(title, user_id)')
      .order('evaluated_at', { ascending: false })

    if (!evalData || evalData.length === 0) { setEvals([]); setLoadingEvals(false); return }

    const studentIds = [...new Set(evalData.map((e: { projects: { user_id: string } | null }) => e.projects?.user_id).filter(Boolean))] as string[]
    const coordIds   = [...new Set(evalData.map((e: { coordinator_id: string | null }) => e.coordinator_id).filter(Boolean))] as string[]
    const allIds     = [...new Set([...studentIds, ...coordIds])]

    const { data: people } = allIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', allIds)
      : { data: [] as { id: string; full_name: string | null }[] }

    const peopleMap: Record<string, string> = {}
    people?.forEach((p: { id: string; full_name: string | null }) => { peopleMap[p.id] = p.full_name ?? '—' })

    setEvals(evalData.map((e: { id: string; project_id: string; resultado: string | null; feedback: string | null; evaluated_at: string; admin_confirmed: boolean; coordinator_id: string | null; projects: { title: string | null; user_id: string } | null }) => ({
      id:               e.id,
      project_id:       e.project_id,
      project_title:    e.projects?.title ?? null,
      student_name:     e.projects?.user_id ? (peopleMap[e.projects.user_id] ?? null) : null,
      coordinator_name: e.coordinator_id   ? (peopleMap[e.coordinator_id]   ?? null) : null,
      resultado:        e.resultado,
      feedback:         e.feedback,
      evaluated_at:     e.evaluated_at,
      admin_confirmed:  e.admin_confirmed ?? false,
    })))
    setLoadingEvals(false)
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleConfirm(evalId: string) {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    setConfirmingId(evalId)
    const { error } = await supabase
      .from('capstone_evaluations').update({ admin_confirmed: true }).eq('id', evalId)
    setConfirmingId(null)
    if (error) { showToast('error', 'Error al confirmar evaluación'); return }
    setEvals(prev => prev.map(e => e.id === evalId ? { ...e, admin_confirmed: true } : e))
    showToast('success', 'Evaluación confirmada ✓')
  }

  async function handleLogout() {
    if (supabaseRef.current) await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const PAGE_SIZE = 20

  const filteredUsers = useMemo(() => {
    setUserPage(0)
    if (!userSearch.trim()) return users
    const q = userSearch.toLowerCase()
    return users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.school_name?.toLowerCase().includes(q)
    )
  }, [users, userSearch])

  const filteredProjects = useMemo(() => {
    setProjectPage(0)
    return projectStatus === 'all' ? projects : projects.filter(p => p.status === projectStatus)
  }, [projects, projectStatus])

  const pagedUsers    = filteredUsers.slice(userPage * PAGE_SIZE, (userPage + 1) * PAGE_SIZE)
  const pagedProjects = filteredProjects.slice(projectPage * PAGE_SIZE, (projectPage + 1) * PAGE_SIZE)
  const totalUserPages    = Math.ceil(filteredUsers.length / PAGE_SIZE)
  const totalProjectPages = Math.ceil(filteredProjects.length / PAGE_SIZE)

  // ── Render ─────────────────────────────────────────────────────────────────
  if (booting) {
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
        <div style={{ minHeight: '100vh', background: 'var(--bg,#F5F3EF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', color: '#6B6B6B', fontSize: 14 }}>
          Verificando acceso…
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg,#F5F3EF);font-family:"Inter",system-ui,sans-serif;min-height:100vh;color:var(--ink,#0D0D0D);}

        /* Nav */
        .adm-nav{position:sticky;top:0;z-index:30;background:rgba(245,243,239,.88);backdrop-filter:saturate(150%) blur(16px);border-bottom:1px solid rgba(13,13,13,.08);height:62px;display:flex;align-items:center;padding:0 40px;gap:16px;}
        .adm-brand{display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;color:var(--ink,#0D0D0D);}
        .adm-spacer{flex:1;}
        .adm-super-badge{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;border-radius:999px;padding:3px 10px;font-weight:700;font-family:"Satoshi",sans-serif;}
        .adm-ghost{background:none;border:1px solid rgba(13,13,13,.14);border-radius:999px;padding:7px 14px;font-size:12px;color:#6B6B6B;cursor:pointer;transition:all .2s;font-family:inherit;}
        .adm-ghost:hover{border-color:var(--ink,#0D0D0D);color:var(--ink,#0D0D0D);}

        /* Layout */
        .adm-main{max-width:1100px;margin:0 auto;padding:44px 40px 80px;}
        .adm-header{margin-bottom:32px;}
        .adm-header h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:28px;letter-spacing:-.022em;}
        .adm-header p{margin-top:5px;font-size:13.5px;color:#6B6B6B;}

        /* Tabs */
        .adm-tabs{display:flex;gap:8px;margin-bottom:32px;}
        .adm-tab{padding:8px 22px;border-radius:999px;border:none;font-family:"Satoshi",sans-serif;font-weight:600;font-size:13.5px;cursor:pointer;transition:all .18s;background:rgba(13,13,13,.06);color:#6B6B6B;}
        .adm-tab:hover{background:rgba(13,13,13,.1);color:var(--ink,#0D0D0D);}
        .adm-tab.active{background:var(--ink,#0D0D0D);color:#fff;}

        /* Stats grid */
        .adm-stats-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;}

        /* Card + table */
        .adm-card{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.07));border-radius:16px;overflow:hidden;box-shadow:0 2px 12px -4px rgba(13,13,13,.07);}
        .adm-table-wrap{overflow-x:auto;}
        table{width:100%;border-collapse:collapse;}
        th{font-family:"Satoshi",sans-serif;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#9a9690;padding:14px 20px;text-align:left;border-bottom:1px solid rgba(13,13,13,.06);background:var(--bg-2,#EFECE6);}
        td{padding:14px 20px;font-size:13.5px;border-bottom:1px solid rgba(13,13,13,.04);vertical-align:middle;}
        tr:last-child td{border-bottom:none;}
        tr:hover td{background:rgba(13,13,13,.015);}

        /* Filter controls */
        .adm-search{width:100%;max-width:340px;padding:10px 16px;border:1.5px solid rgba(13,13,13,.12);border-radius:10px;font-size:13.5px;font-family:inherit;outline:none;background:var(--card-bg,#fff);color:var(--ink,#0D0D0D);margin-bottom:20px;display:block;}
        .adm-search:focus{border-color:#C0392B;}
        .adm-filter-row{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap;}
        .adm-filter-btn{padding:6px 16px;border-radius:999px;border:1.5px solid rgba(13,13,13,.12);font-family:"Satoshi",sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;background:none;color:#6B6B6B;}
        .adm-filter-btn:hover{border-color:var(--ink,#0D0D0D);color:var(--ink,#0D0D0D);}
        .adm-filter-btn.active{background:var(--ink,#0D0D0D);border-color:var(--ink,#0D0D0D);color:#fff;}

        /* Eval cards */
        .adm-eval-list{display:flex;flex-direction:column;gap:16px;}
        .adm-eval-card{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.07));border-radius:14px;padding:22px 24px;box-shadow:0 2px 8px -4px rgba(13,13,13,.07);}
        .adm-eval-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:4px;}
        .adm-eval-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;}
        .adm-eval-meta{font-size:12.5px;color:#6B6B6B;margin-top:4px;line-height:1.5;}
        .adm-eval-feedback{font-size:13.5px;color:#2D2D2D;line-height:1.65;padding:12px 14px;background:var(--bg-2,#EFECE6);border-radius:10px;margin-top:14px;}

        /* Empty */
        .adm-empty{text-align:center;padding:60px 40px;color:#9a9690;font-size:13.5px;}

        /* Pagination */
        .adm-pagination{display:flex;align-items:center;justify-content:space-between;margin-top:14px;gap:12px;}
        .adm-page-info{font-size:12.5px;color:#9a9690;}
        .adm-page-btns{display:flex;gap:6px;}
        .adm-page-btn{padding:6px 16px;border-radius:999px;border:1.5px solid rgba(13,13,13,.12);font-family:"Satoshi",sans-serif;font-size:12.5px;font-weight:600;cursor:pointer;background:none;color:#6B6B6B;transition:all .15s;}
        .adm-page-btn:hover:not(:disabled){border-color:var(--ink,#0D0D0D);color:var(--ink,#0D0D0D);}
        .adm-page-btn:disabled{opacity:.35;cursor:not-allowed;}

        @media(max-width:1000px){
          .adm-stats-grid{grid-template-columns:repeat(3,1fr);}
          .adm-main{padding:28px 20px 60px;}
          .adm-nav{padding:0 20px;}
        }
        @media(max-width:600px){
          .adm-stats-grid{grid-template-columns:repeat(2,1fr);}
          td,th{padding:12px 14px;}
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="adm-nav">
        <a className="adm-brand" href="/">
          <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          Big Family
        </a>
        <div className="adm-spacer" />
        <span className="adm-super-badge">Super Admin</span>
        <span style={{ fontSize: 13, color: '#6B6B6B' }}>{adminName}</span>
        <button className="adm-ghost" onClick={handleLogout}>Cerrar sesión</button>
      </nav>

      <main className="adm-main">
        {/* Header */}
        <div className="adm-header">
          <h1>Panel de Administración</h1>
          <p>Vista global del programa · Solo accesible para administradores</p>
        </div>

        {/* Tabs */}
        <div className="adm-tabs">
          {([
            { key: 'stats',       label: 'Estadísticas' },
            { key: 'users',       label: 'Usuarios'     },
            { key: 'projects',    label: 'Proyectos'    },
            { key: 'evaluations', label: 'Evaluaciones' },
          ] as const).map(t => (
            <button key={t.key} className={`adm-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ESTADÍSTICAS ── */}
        {tab === 'stats' && (
          <div className="adm-stats-grid">
            {stats ? (
              <>
                <StatCard num={stats.students}       label="Estudiantes"        accent />
                <StatCard num={stats.total_projects} label="Proyectos totales"  />
                <StatCard num={stats.submitted}      label="Enviados"           />
                <StatCard num={stats.approved}       label="Aprobados"          />
                <StatCard num={stats.rejected}       label="Rechazados"         />
              </>
            ) : (
              [...Array(5)].map((_, i) => (
                <div key={i} style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,rgba(13,13,13,.07))', borderRadius: 16, padding: '24px 28px' }}>
                  <Sk w={64} h={40} r={8} />
                  <div style={{ marginTop: 12 }}><Sk w={80} h={12} r={4} /></div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── USUARIOS ── */}
        {tab === 'users' && (
          <>
            <input
              className="adm-search"
              placeholder="Buscar por nombre, email o colegio…"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
            <div className="adm-card">
              <div className="adm-table-wrap">
                {loadingUsers ? (
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[...Array(6)].map((_, i) => <Sk key={i} h={18} r={6} />)}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="adm-empty">No hay usuarios que coincidan</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Colegio</th>
                        <th>Rol</th>
                        <th>Registrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUsers.map(u => {
                        const rm = ROLE_META[u.role ?? ''] ?? { label: u.role ?? '—', color: '#6B6B6B', bg: 'rgba(13,13,13,.06)' }
                        return (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 600 }}>{u.full_name ?? '—'}</td>
                            <td style={{ color: '#6B6B6B', fontSize: 13 }}>{u.email ?? '—'}</td>
                            <td>{u.school_name ?? '—'}</td>
                            <td><Badge label={rm.label} color={rm.color} bg={rm.bg} /></td>
                            <td style={{ color: '#9a9690', fontSize: 13 }}>
                              {new Date(u.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            {filteredUsers.length > 0 && (
              <div className="adm-pagination">
                <span className="adm-page-info">
                  {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} · Página {userPage + 1} de {totalUserPages}
                </span>
                <div className="adm-page-btns">
                  <button className="adm-page-btn" disabled={userPage === 0} onClick={() => setUserPage(p => p - 1)}>← Anterior</button>
                  <button className="adm-page-btn" disabled={userPage >= totalUserPages - 1} onClick={() => setUserPage(p => p + 1)}>Siguiente →</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PROYECTOS ── */}
        {tab === 'projects' && (
          <>
            <div className="adm-filter-row">
              {(['all', 'draft', 'pending', 'approved', 'rejected'] as const).map(s => (
                <button
                  key={s}
                  className={`adm-filter-btn${projectStatus === s ? ' active' : ''}`}
                  onClick={() => setProjectStatus(s)}
                >
                  {s === 'all' ? 'Todos' : (STATUS_META[s]?.label ?? s)}
                </button>
              ))}
            </div>
            <div className="adm-card">
              <div className="adm-table-wrap">
                {loadingProjects ? (
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[...Array(6)].map((_, i) => <Sk key={i} h={18} r={6} />)}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="adm-empty">No hay proyectos con este filtro</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Estudiante</th>
                        <th>Colegio</th>
                        <th>Estado</th>
                        <th>Enviado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedProjects.map(p => {
                        const sm = STATUS_META[p.status] ?? { label: p.status, color: '#6B6B6B', bg: 'rgba(13,13,13,.06)' }
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600, maxWidth: 280 }}>{p.title || '(Sin título)'}</td>
                            <td>{p.student_name ?? '—'}</td>
                            <td>{p.school_name ?? '—'}</td>
                            <td><Badge label={sm.label} color={sm.color} bg={sm.bg} /></td>
                            <td style={{ color: '#9a9690', fontSize: 13 }}>
                              {p.submitted_at
                                ? new Date(p.submitted_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            {filteredProjects.length > 0 && (
              <div className="adm-pagination">
                <span className="adm-page-info">
                  {filteredProjects.length} proyecto{filteredProjects.length !== 1 ? 's' : ''} · Página {projectPage + 1} de {totalProjectPages}
                </span>
                <div className="adm-page-btns">
                  <button className="adm-page-btn" disabled={projectPage === 0} onClick={() => setProjectPage(p => p - 1)}>← Anterior</button>
                  <button className="adm-page-btn" disabled={projectPage >= totalProjectPages - 1} onClick={() => setProjectPage(p => p + 1)}>Siguiente →</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── EVALUACIONES ── */}
        {tab === 'evaluations' && (
          loadingEvals ? (
            <div className="adm-eval-list">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="adm-eval-card">
                  <Sk w="50%" h={20} r={6} />
                  <div style={{ marginTop: 10 }}><Sk w="70%" h={14} r={5} /></div>
                </div>
              ))}
            </div>
          ) : evals.length === 0 ? (
            <div className="adm-card"><div className="adm-empty">No hay evaluaciones de capstone aún</div></div>
          ) : (
            <div className="adm-eval-list">
              {evals.map(ev => {
                const rm = ev.resultado ? (RESULTADO_META[ev.resultado] ?? { label: ev.resultado, color: '#6B6B6B', bg: 'rgba(13,13,13,.06)' }) : null
                return (
                  <div key={ev.id} className="adm-eval-card">
                    <div className="adm-eval-top">
                      <div style={{ minWidth: 0 }}>
                        <div className="adm-eval-title">{ev.project_title ?? '(Sin título)'}</div>
                        <div className="adm-eval-meta">
                          Estudiante: <strong>{ev.student_name ?? '—'}</strong>
                          {' · '}Coordinador: <strong>{ev.coordinator_name ?? '—'}</strong>
                          {' · '}{new Date(ev.evaluated_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        {rm && <div style={{ marginTop: 8 }}><Badge label={rm.label} color={rm.color} bg={rm.bg} /></div>}
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        {ev.admin_confirmed ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 999, background: '#D1FAE5', color: '#065F46', fontSize: 12.5, fontWeight: 700, fontFamily: 'Satoshi,sans-serif' }}>
                            ✓ Confirmado
                          </span>
                        ) : (
                          <button
                            disabled={confirmingId === ev.id}
                            onClick={() => handleConfirm(ev.id)}
                            style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: '#0D0D0D', color: '#fff', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 12.5, cursor: confirmingId === ev.id ? 'not-allowed' : 'pointer', opacity: confirmingId === ev.id ? 0.6 : 1, whiteSpace: 'nowrap' }}
                          >
                            {confirmingId === ev.id ? 'Confirmando…' : 'Confirmar evaluación'}
                          </button>
                        )}
                      </div>
                    </div>

                    {ev.feedback && (
                      <div className="adm-eval-feedback">
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#9a9690', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Retroalimentación del coordinador</div>
                        {ev.feedback}
                      </div>
                    )}
                  </div>
                )
              })}
              <p style={{ fontSize: 12.5, color: '#9a9690' }}>
                {evals.filter(e => e.admin_confirmed).length} de {evals.length} confirmadas
              </p>
            </div>
          )
        )}
      </main>

      <ToastContainer />
    </>
  )
}
