'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import { showToast, ToastContainer } from '@/components/Toast'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import AppSidebar from '@/components/AppSidebar'
import Badge from '@/components/shared/Badge'
import Skeleton from '@/components/shared/Skeleton'
import StatCard from '@/components/shared/StatCard'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line,
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = 'stats' | 'users' | 'projects' | 'evaluations' | 'goals'

interface UserRow {
  id:          string
  display_name:   string | null
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

interface SchoolXP {
  name: string
  avgXp: number
  count: number
}

interface WeeklyUsers {
  week: string
  count: number
}

// ── Meta maps ─────────────────────────────────────────────────────────────────
const RESULTADO_META: Record<string, { label: string; color: string; bg: string }> = {
  mencion_honor:     { label: 'Mención de Honor',  color: '#713F12', bg: '#FEF9C3' },
  certificado:       { label: 'Certificado',        color: '#065F46', bg: '#D1FAE5' },
  retroalimentacion: { label: 'Retroalimentación',  color: '#92400E', bg: '#FEF3C7' },
  no_certificado:    { label: 'No certificado',     color: '#991B1B', bg: '#FEE2E2' },
}

const STATUS_META: Record<string, { label: string; variant: 'draft' | 'pending' | 'approved' | 'rejected' }> = {
  draft:    { label: 'Borrador',  variant: 'draft'    },
  pending:  { label: 'Pendiente', variant: 'pending'  },
  approved: { label: 'Aprobado',  variant: 'approved' },
  rejected: { label: 'Rechazado', variant: 'rejected' },
}

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  student:     { label: 'Estudiante',  color: 'var(--ink)',       bg: 'rgba(13,13,13,.07)'       },
  coordinator: { label: 'Coordinador', color: 'var(--ink)',       bg: 'var(--bg-2,#EFECE6)'      },
  expositor:   { label: 'Expositor',   color: '#065F46',          bg: '#D1FAE5'                  },
  admin:       { label: 'Admin',       color: 'var(--bg,#F5F3EF)', bg: 'var(--accent,#C0392B)'   },
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router      = useRouter()
  const pref        = useReducedMotion()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [tab,       setTab]       = useState<Tab>('stats')
  const [booting,   setBooting]   = useState(true)
  const [adminName, setAdminName] = useState('Admin')

  const [users,       setUsers]       = useState<UserRow[]>([])
  const [projects,    setProjects]    = useState<ProjectRow[]>([])
  const [evals,       setEvals]       = useState<EvalRow[]>([])
  const [stats,       setStats]       = useState<Stats | null>(null)
  const [schoolXP,    setSchoolXP]    = useState<SchoolXP[]>([])
  const [weeklyUsers, setWeeklyUsers] = useState<WeeklyUsers[]>([])
  const [hovBarAdm,   setHovBarAdm]   = useState<number | null>(null)

  const [loadingUsers,    setLoadingUsers]    = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingEvals,    setLoadingEvals]    = useState(false)

  const [goalTemplates,       setGoalTemplates]       = useState<{ id: string; title: string; description: string | null; xp_reward: number }[]>([])
  const [loadingGoals,        setLoadingGoals]        = useState(false)
  const [tmplFormTitle,       setTmplFormTitle]       = useState('')
  const [tmplFormDesc,        setTmplFormDesc]        = useState('')
  const [tmplFormXp,          setTmplFormXp]          = useState(50)
  const [savingTmpl,          setSavingTmpl]          = useState(false)
  const [deletingTmpl,        setDeletingTmpl]        = useState<string | null>(null)

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
      if (MOCK_MODE) {
        setAdminName('Samuel Gómez Mendoza')
        const k = MOCK.analytics.kpis
        setStats({ students: k.totalStudents, total_projects: k.projectsSubmitted, submitted: k.projectsSubmitted, approved: k.projectsApproved, rejected: k.projectsRejected })
        setSchoolXP(MOCK.schools.map(s => ({ name: s.name, avgXp: s.avgXP, count: s.students })))
        setWeeklyUsers(MOCK.analytics.weeklyGrowth.map(w => ({ week: w.week, count: w.students })))
        setBooting(false)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('display_name, role').eq('id', user.id).maybeSingle()

      if (profile?.role !== 'admin') { router.replace('/dashboard'); return }

      setAdminName(profile?.display_name ?? 'Admin')
      await fetchStats(supabase)
      setBooting(false)
    }
    boot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy tab loading ───────────────────────────────────────────────────────
  useEffect(() => {
    if (booting) return
    if (tab === 'users'       && users.length         === 0) fetchUsers()
    if (tab === 'projects'    && projects.length      === 0) fetchProjects()
    if (tab === 'evaluations' && evals.length         === 0) fetchEvals()
    if (tab === 'goals'       && goalTemplates.length === 0) fetchGoalTemplates()
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

    // ── School XP averages ──
    try {
      const { data: allSchools } = await sb.from('schools').select('id, name')
      const { data: allProfiles } = await sb.from('profiles').select('id, school_id').eq('role', 'student')
      const { data: allXP } = await sb.from('xp_log').select('user_id, amount')

      if (allSchools && allProfiles && allXP) {
        const xpByUser: Record<string, number> = {}
        allXP.forEach((r: { user_id: string; amount: number }) => { xpByUser[r.user_id] = (xpByUser[r.user_id] ?? 0) + r.amount })

        const schoolData: SchoolXP[] = allSchools
          .map((s: { id: string; name: string }) => {
            const studentIds = allProfiles
              .filter((p: { school_id: string | null }) => p.school_id === s.id)
              .map((p: { id: string }) => p.id)
            const total = studentIds.reduce((sum: number, id: string) => sum + (xpByUser[id] ?? 0), 0)
            const count = studentIds.length
            return { name: s.name, avgXp: count > 0 ? Math.round(total / count) : 0, count }
          })
          .filter((s: SchoolXP) => s.count > 0)
          .sort((a: SchoolXP, b: SchoolXP) => b.avgXp - a.avgXp)
          .slice(0, 8)
        setSchoolXP(schoolData)
      }
    } catch { /* best-effort */ }

    // ── Weekly user growth (last 8 weeks) ──
    try {
      const since8w = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: newUsers } = await sb.from('profiles').select('created_at').gte('created_at', since8w).eq('role', 'student')
      const wMap: Record<string, number> = {}
      for (let i = 7; i >= 0; i--) wMap[`S${8 - i}`] = 0
      newUsers?.forEach((u: { created_at: string }) => {
        const daysAgo = Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000)
        const weekIdx = Math.min(7, Math.floor(daysAgo / 7))
        const key = `S${8 - weekIdx}`
        if (wMap[key] !== undefined) wMap[key]++
      })
      setWeeklyUsers(Object.entries(wMap).map(([week, count]) => ({ week, count })))
    } catch { /* best-effort */ }
  }

  async function fetchUsers() {
    if (MOCK_MODE) {
      setUsers(MOCK.students.map(s => ({
        id:          s.id,
        display_name:   s.name,
        email:       `${s.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'.')}@bigfamily.co`,
        role:        'student',
        created_at:  s.created_at,
        school_name: MOCK.schools.find(sc => sc.id === s.school_id)?.name ?? null,
      })))
      return
    }
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    setLoadingUsers(true)

    const { data: profileData } = await supabase
      .from('profiles').select('id, display_name, email, role, created_at, school_id')
      .order('created_at', { ascending: false })

    if (!profileData) { setLoadingUsers(false); return }

    const schoolIds = [...new Set(profileData.map((p: { school_id: string | null }) => p.school_id).filter(Boolean))] as string[]
    const { data: schoolData } = schoolIds.length
      ? await supabase.from('schools').select('id, name').in('id', schoolIds)
      : { data: [] as { id: string; name: string }[] }

    const schoolMap: Record<string, string> = {}
    schoolData?.forEach((s: { id: string; name: string }) => { schoolMap[s.id] = s.name })

    setUsers(profileData.map((u: { id: string; display_name: string | null; email: string | null; role: string | null; created_at: string; school_id: string | null }) => ({
      id:          u.id,
      display_name:   u.display_name,
      email:       u.email,
      role:        u.role,
      created_at:  u.created_at,
      school_name: u.school_id ? (schoolMap[u.school_id] ?? null) : null,
    })))
    setLoadingUsers(false)
  }

  async function fetchProjects() {
    if (MOCK_MODE) {
      setProjects(MOCK.projects.map(p => ({
        id:           p.id,
        title:        p.title,
        status:       p.status,
        submitted_at: p.createdAt,
        created_at:   p.createdAt,
        student_name: p.student,
        school_name:  MOCK.schools.find(s => s.id === p.school_id)?.name ?? null,
      })))
      return
    }
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
      userIds.length   ? supabase.from('profiles').select('id, display_name').in('id', userIds)   : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
      schoolIds.length ? supabase.from('schools').select('id, name').in('id', schoolIds)       : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ])

    const profileMap: Record<string, string> = {}
    profileData?.forEach((p: { id: string; display_name: string | null }) => { profileMap[p.id] = p.display_name ?? '—' })
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
    if (MOCK_MODE) { setEvals([]); return }
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
      ? await supabase.from('profiles').select('id, display_name').in('id', allIds)
      : { data: [] as { id: string; display_name: string | null }[] }

    const peopleMap: Record<string, string> = {}
    people?.forEach((p: { id: string; display_name: string | null }) => { peopleMap[p.id] = p.display_name ?? '—' })

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

  async function fetchGoalTemplates() {
    if (MOCK_MODE) { setGoalTemplates([]); return }
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    setLoadingGoals(true)
    const { data } = await supabase.from('goal_templates').select('*').order('created_at', { ascending: false })
    setGoalTemplates(data ?? [])
    setLoadingGoals(false)
  }

  async function handleCreateTemplate() {
    if (!tmplFormTitle.trim() || !supabaseRef.current) return
    const supabase = supabaseRef.current
    setSavingTmpl(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('goal_templates').insert({ title: tmplFormTitle.trim(), description: tmplFormDesc.trim() || null, xp_reward: tmplFormXp, created_by: user?.id }).select().maybeSingle()
    if (data) setGoalTemplates(prev => [data, ...prev])
    setTmplFormTitle(''); setTmplFormDesc(''); setTmplFormXp(50)
    setSavingTmpl(false)
  }

  async function handleDeleteTemplate(id: string) {
    if (!supabaseRef.current) return
    setDeletingTmpl(id)
    await supabaseRef.current.from('goal_templates').delete().eq('id', id)
    setGoalTemplates(prev => prev.filter(t => t.id !== id))
    setDeletingTmpl(null)
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
      u.display_name?.toLowerCase().includes(q) ||
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
        <style>{``}</style>
        <div style={{ minHeight: '100vh', background: 'var(--bg,#F5F3EF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', fontSize: 14 }}>
          Verificando acceso…
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
                
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Satoshi",sans-serif;min-height:100vh;color:var(--ink);}

        /* Layout */
        .adm-main{flex:1;min-width:0;overflow-y:auto;padding:44px var(--dashboard-padding,32px) 80px;}
        .adm-header{margin-bottom:32px;}
        .adm-header h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:28px;letter-spacing:-.022em;}
        .adm-header p{margin-top:5px;font-size:13.5px;color:#6B6B6B;}

        /* Stats grid */
        .adm-stats-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;}
        /* Charts bento */
        .adm-charts-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;}
        @media(max-width:900px){.adm-charts-row{grid-template-columns:1fr;}}
        .adm-chart-panel{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.07));border-radius:16px;padding:22px 20px;box-shadow:var(--shadow-card);}
        .adm-chart-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:13.5px;color:var(--ink);margin-bottom:16px;}
        /* School ranking table */
        .adm-rank-table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:20px;}
        .adm-rank-table th{text-align:left;padding:8px 14px;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);font-weight:700;border-bottom:1px solid var(--line);white-space:nowrap;}
        .adm-rank-table td{padding:10px 14px;border-bottom:1px solid var(--line-soft);color:var(--ink-2);vertical-align:middle;font-variant-numeric:tabular-nums;}
        .adm-rank-table tr:last-child td{border-bottom:none;}
        .adm-rank-table tbody tr:hover td{background:var(--surface-3,var(--bg-2));}

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
        .adm-search:focus{border-color:var(--accent,#C0392B);}
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

      <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', width: '100%', background: 'var(--bg)' }}>
      <AppSidebar
        role="admin"
        userName={adminName}
        userInitial={adminName[0]?.toUpperCase() ?? 'A'}
        activeTab={tab}
        onTabChange={(t) => setTab(t as Tab)}
      />

      <main className="adm-main">
        {/* Header */}
        <div className="adm-header">
          <h1>Panel de Administración</h1>
          <p>Vista global del programa · Solo accesible para administradores</p>
        </div>

        {/* ── ESTADÍSTICAS ── */}
        {tab === 'stats' && (
          <>
            <m.div
              className="adm-stats-grid"
              initial={pref ? false : 'hidden'}
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            >
              {stats ? (
                ([
                  { num: stats.students,       label: 'Estudiantes',       accentColor: 'var(--accent,#C0392B)' },
                  { num: stats.total_projects, label: 'Proyectos totales', accentColor: 'var(--line-strong)'    },
                  { num: stats.submitted,      label: 'Enviados',          accentColor: 'var(--accent-amber,#D4821A)' },
                  { num: stats.approved,       label: 'Aprobados',         accentColor: 'var(--accent-teal,#0F7B6C)' },
                  { num: stats.rejected,       label: 'Rechazados',        accentColor: 'var(--accent,#C0392B)'  },
                ] as const).map(s => (
                  <m.div
                    key={s.label}
                    variants={{ hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 22 } } }}
                  >
                    <StatCard num={s.num} label={s.label} accentColor={s.accentColor} />
                  </m.div>
                ))
              ) : (
                [...Array(5)].map((_, i) => (
                  <div key={i} style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,rgba(13,13,13,.07))', borderLeft: '3px solid var(--line-strong)', borderRadius: 14, padding: '20px 22px', boxShadow: 'var(--shadow-card)' }}>
                    <Skeleton w={64} h={34} r={6} />
                    <div style={{ marginTop: 10 }}><Skeleton w={80} h={10} r={4} /></div>
                  </div>
                ))
              )}
            </m.div>

            {/* ── Charts bento ── */}
            <div className="adm-charts-row">
              {/* XP por colegio */}
              <div className="adm-chart-panel">
                <div className="adm-chart-title">XP promedio por colegio</div>
                {schoolXP.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[90, 70, 80, 60].map((w, i) => <Skeleton key={i} h={12} r={4} w={`${w}%`} />)}
                  </div>
                ) : (
                  <m.div initial={pref ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 26 }}>
                    <ResponsiveContainer width="100%" height={Math.max(200, schoolXP.length * 38)}>
                      <BarChart data={schoolXP} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.5} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--mute)', fontFamily: 'Satoshi,sans-serif' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'var(--ink-2)', fontFamily: 'Satoshi,sans-serif' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(13,13,13,0.04)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null
                            const d = payload[0].payload as SchoolXP
                            return (
                              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow-raised)', fontFamily: '"Satoshi",sans-serif' }}>
                                <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{d.name}</div>
                                <div style={{ color: 'var(--accent-amber,#D4821A)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.avgXp.toLocaleString('es-CO')} XP avg</div>
                                <div style={{ color: 'var(--mute)', fontSize: 11 }}>{d.count} estudiantes</div>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="avgXp" radius={[0, 4, 4, 0]} maxBarSize={22}
                          onMouseEnter={(_, i) => setHovBarAdm(i)}
                          onMouseLeave={() => setHovBarAdm(null)}
                        >
                          {schoolXP.map((_, i) => (
                            <Cell key={i} fill={hovBarAdm === i ? 'var(--accent,#C0392B)' : 'var(--ink,#0D0D0D)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </m.div>
                )}
              </div>

              {/* Crecimiento de usuarios */}
              <div className="adm-chart-panel">
                <div className="adm-chart-title">Nuevos estudiantes — últimas 8 semanas</div>
                {weeklyUsers.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[60, 80, 50, 90].map((w, i) => <Skeleton key={i} h={10} r={4} w={`${w}%`} />)}
                  </div>
                ) : (
                  <m.div initial={pref ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 26, delay: 0.1 }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={weeklyUsers} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--mute)', fontFamily: 'Satoshi,sans-serif' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--mute)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.[0]) return null
                            return (
                              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow-raised)', fontFamily: '"Satoshi",sans-serif' }}>
                                <div style={{ color: 'var(--mute)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                                <span style={{ fontWeight: 700, color: 'var(--accent-teal,#0F7B6C)', fontVariantNumeric: 'tabular-nums' }}>+{payload[0].value} estudiantes</span>
                              </div>
                            )
                          }}
                        />
                        <Line type="monotone" dataKey="count" stroke="var(--accent-teal,#0F7B6C)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-teal,#0F7B6C)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </m.div>
                )}
              </div>
            </div>

            {/* ── School ranking table ── */}
            {schoolXP.length > 0 && (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: '20px', boxShadow: 'var(--shadow-card)', marginTop: 20 }}>
                <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginBottom: 14 }}>Ranking de colegios</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="adm-rank-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Colegio</th>
                        <th style={{ textAlign: 'right' }}>XP Promedio</th>
                        <th style={{ textAlign: 'right' }}>Estudiantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolXP.map((s, i) => (
                        <tr key={s.name}>
                          <td style={{ fontWeight: 700, color: i === 0 ? 'var(--accent-amber,#D4821A)' : i === 1 ? 'var(--mute)' : i === 2 ? 'var(--accent-muted,#8C7B6E)' : 'var(--mute)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                            {i + 1}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-amber,#D4821A)' }}>{s.avgXp.toLocaleString('es-CO')}</td>
                          <td style={{ textAlign: 'right', color: 'var(--mute)' }}>{s.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
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
                    {[...Array(6)].map((_, i) => <Skeleton key={i} h={18} r={6} />)}
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
                        const rm = ROLE_META[u.role ?? ''] ?? { label: u.role ?? '—', color: 'var(--mute)', bg: 'rgba(13,13,13,.06)' }
                        return (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 600 }}>{u.display_name ?? '—'}</td>
                            <td style={{ color: 'var(--mute)', fontSize: 13 }}>{u.email ?? '—'}</td>
                            <td>{u.school_name ?? '—'}</td>
                            <td><Badge label={rm.label} color={rm.color} bg={rm.bg} /></td>
                            <td style={{ color: 'var(--mute)', fontSize: 13 }}>
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
                  <m.button className="adm-page-btn" disabled={userPage === 0} onClick={() => setUserPage(p => p - 1)} whileHover={pref ? undefined : { scale: 1.02 }} whileTap={pref ? undefined : { scale: 0.96 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>← Anterior</m.button>
                  <m.button className="adm-page-btn" disabled={userPage >= totalUserPages - 1} onClick={() => setUserPage(p => p + 1)} whileHover={pref ? undefined : { scale: 1.02 }} whileTap={pref ? undefined : { scale: 0.96 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>Siguiente →</m.button>
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
                    {[...Array(6)].map((_, i) => <Skeleton key={i} h={18} r={6} />)}
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
                        const sm = STATUS_META[p.status] ?? { label: p.status, variant: 'draft' as const }
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600, maxWidth: 280 }}>{p.title || '(Sin título)'}</td>
                            <td>{p.student_name ?? '—'}</td>
                            <td>{p.school_name ?? '—'}</td>
                            <td><Badge label={sm.label} variant={sm.variant} /></td>
                            <td style={{ color: 'var(--mute)', fontSize: 13 }}>
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
                  <m.button className="adm-page-btn" disabled={projectPage === 0} onClick={() => setProjectPage(p => p - 1)} whileHover={pref ? undefined : { scale: 1.02 }} whileTap={pref ? undefined : { scale: 0.96 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>← Anterior</m.button>
                  <m.button className="adm-page-btn" disabled={projectPage >= totalProjectPages - 1} onClick={() => setProjectPage(p => p + 1)} whileHover={pref ? undefined : { scale: 1.02 }} whileTap={pref ? undefined : { scale: 0.96 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>Siguiente →</m.button>
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
                  <Skeleton w="50%" h={20} r={6} />
                  <div style={{ marginTop: 10 }}><Skeleton w="70%" h={14} r={5} /></div>
                </div>
              ))}
            </div>
          ) : evals.length === 0 ? (
            <div className="adm-card"><div className="adm-empty">No hay evaluaciones de capstone aún</div></div>
          ) : (
            <div className="adm-eval-list">
              {evals.map(ev => {
                const rm = ev.resultado ? (RESULTADO_META[ev.resultado] ?? { label: ev.resultado, color: 'var(--mute)', bg: 'rgba(13,13,13,.06)' }) : null
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
                        <AnimatePresence mode="wait" initial={false}>
                          {ev.admin_confirmed ? (
                            <m.span
                              key="confirmed"
                              layoutId={`confirm-${ev.id}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 999, background: '#D1FAE5', color: '#065F46', fontSize: 12.5, fontWeight: 700, fontFamily: 'Satoshi,sans-serif' }}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                            >
                              ✓ Confirmado
                            </m.span>
                          ) : (
                            <m.button
                              key="btn"
                              layoutId={`confirm-${ev.id}`}
                              disabled={confirmingId === ev.id}
                              onClick={() => handleConfirm(ev.id)}
                              style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: '#0D0D0D', color: '#fff', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 12.5, cursor: confirmingId === ev.id ? 'not-allowed' : 'pointer', opacity: confirmingId === ev.id ? 0.6 : 1, whiteSpace: 'nowrap' }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                            >
                              {confirmingId === ev.id ? 'Confirmando…' : 'Confirmar evaluación'}
                            </m.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {ev.feedback && (
                      <div className="adm-eval-feedback">
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Retroalimentación del coordinador</div>
                        {ev.feedback}
                      </div>
                    )}
                  </div>
                )
              })}
              <p style={{ fontSize: 12.5, color: 'var(--mute)' }}>
                {evals.filter(e => e.admin_confirmed).length} de {evals.length} confirmadas
              </p>
            </div>
          )
        )}
        {/* ── METAS / GOAL TEMPLATES ── */}
        {tab === 'goals' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
            <div className="adm-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Plantillas de metas del programa</div>
              {loadingGoals ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1,2,3].map(i => <Skeleton key={i} h={52} r={10} />)}
                </div>
              ) : goalTemplates.length === 0 ? (
                <div className="adm-empty">Sin plantillas todavía. Crea la primera →</div>
              ) : goalTemplates.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--line-soft,rgba(13,13,13,.05))' }}>
                  <div>
                    <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                    {t.description && <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 3 }}>{t.description}</div>}
                    <div style={{ fontSize: 11.5, color: '#b25a00', fontWeight: 600, marginTop: 4 }}>+{t.xp_reward} XP</div>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    disabled={deletingTmpl === t.id}
                    style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid #FCA5A5', background: 'none', color: '#991B1B', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', opacity: deletingTmpl === t.id ? 0.5 : 1 }}
                  >
                    {deletingTmpl === t.id ? '…' : 'Eliminar'}
                  </button>
                </div>
              ))}
            </div>

            <div className="adm-card" style={{ padding: 24, alignSelf: 'start' }}>
              <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Nueva plantilla</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Título</label>
                  <input value={tmplFormTitle} onChange={e => setTmplFormTitle(e.target.value)} placeholder="Ej: Organizar un taller comunitario" style={{ padding: '10px 14px', border: '1.5px solid rgba(13,13,13,.12)', borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--card-bg,#fff)', color: 'var(--ink,#0D0D0D)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Descripción</label>
                  <textarea value={tmplFormDesc} onChange={e => setTmplFormDesc(e.target.value)} placeholder="Descripción opcional..." rows={3} style={{ padding: '10px 14px', border: '1.5px solid rgba(13,13,13,.12)', borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--card-bg,#fff)', resize: 'vertical', color: 'var(--ink,#0D0D0D)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.06em' }}>XP al completar</label>
                  <input type="number" value={tmplFormXp} onChange={e => setTmplFormXp(Number(e.target.value))} min={10} max={500} step={10} style={{ padding: '10px 14px', border: '1.5px solid rgba(13,13,13,.12)', borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--card-bg,#fff)', color: 'var(--ink,#0D0D0D)' }} />
                </div>
                <button
                  onClick={handleCreateTemplate}
                  disabled={!tmplFormTitle.trim() || savingTmpl}
                  style={{ padding: '10px', background: tmplFormTitle.trim() ? '#0D0D0D' : 'rgba(13,13,13,.1)', border: 'none', borderRadius: 10, fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13, color: tmplFormTitle.trim() ? '#fff' : '#6B6B6B', cursor: tmplFormTitle.trim() ? 'pointer' : 'default', transition: 'all .2s' }}
                >
                  {savingTmpl ? 'Guardando…' : 'Crear plantilla'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      </div>

      <ToastContainer />
    </>
  )
}
