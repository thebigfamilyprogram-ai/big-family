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
type Tab = 'stats' | 'users' | 'projects' | 'evaluations' | 'goals' | 'codes' | 'schools'

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

  // ── Codes tab ─────────────────────────────────────────────────────────────────
  interface SchoolOption { id: string; name: string; code: string | null }
  interface CodeRow      { id: string; code: string; used: boolean; created_at: string; school_name?: string }
  const [codesSchools,       setCodesSchools]       = useState<SchoolOption[]>([])
  const [selCoordSchool,     setSelCoordSchool]     = useState('')
  const [lastCoordCode,      setLastCoordCode]      = useState('')
  const [coordCodesList,     setCoordCodesList]     = useState<CodeRow[]>([])
  const [lastExpoCode,       setLastExpoCode]       = useState('')
  const [expoCodesList,      setExpoCodesList]      = useState<CodeRow[]>([])
  const [generatingCoord,    setGeneratingCoord]    = useState(false)
  const [generatingExpo,     setGeneratingExpo]     = useState(false)
  const [loadingCodes,       setLoadingCodes]       = useState(false)

  // ── Schools tab ───────────────────────────────────────────────────────────────
  interface SchoolRow { id: string; name: string; code: string | null; city: string | null; logo_url: string | null; created_at: string; coord_count: number; student_count: number }
  const [schoolsList,        setSchoolsList]        = useState<SchoolRow[]>([])
  const [loadingSchools,     setLoadingSchools]     = useState(false)
  const [sfName,             setSfName]             = useState('')
  const [sfCode,             setSfCode]             = useState('')
  const [sfCity,             setSfCity]             = useState('')
  const [sfLogoFile,         setSfLogoFile]         = useState<File | null>(null)
  const [sfLogoPreview,      setSfLogoPreview]      = useState('')
  const [savingSchool,       setSavingSchool]       = useState(false)
  const [editSchool,         setEditSchool]         = useState<SchoolRow | null>(null)
  const [efName,             setEfName]             = useState('')
  const [efCity,             setEfCity]             = useState('')
  const [efLogoFile,         setEfLogoFile]         = useState<File | null>(null)
  const [efLogoPreview,      setEfLogoPreview]      = useState('')
  const [savingEdit,         setSavingEdit]         = useState(false)
  const logoInputRef  = useRef<HTMLInputElement>(null)
  const editLogoRef   = useRef<HTMLInputElement>(null)
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
    if (tab === 'codes'       && codesSchools.length  === 0) fetchCodesData()
    if (tab === 'schools'     && schoolsList.length   === 0) fetchSchoolsData()
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

  // ── Codes helpers ──────────────────────────────────────────────────────────────
  async function fetchCodesData() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (MOCK_MODE) {
      setCodesSchools(MOCK.schools.map(s => ({ id: s.id, name: s.name, code: s.id })))
      setLoadingCodes(false); return
    }
    setLoadingCodes(true)
    const [{ data: sch }, { data: coordRows }, { data: expoRows }] = await Promise.all([
      sb.from('schools').select('id, name, code').order('name'),
      sb.from('coordinator_codes').select('id, code, used, created_at, school_id').order('created_at', { ascending: false }).limit(10),
      sb.from('expositor_codes').select('id, code, used, created_at').order('created_at', { ascending: false }).limit(10),
    ])
    const schMap: Record<string, string> = {}
    sch?.forEach((s: { id: string; name: string }) => { schMap[s.id] = s.name })
    setCodesSchools((sch ?? []) as { id: string; name: string; code: string | null }[])
    setCoordCodesList((coordRows ?? []).map((r: { id: string; code: string; used: boolean; created_at: string; school_id: string }) => ({ ...r, school_name: schMap[r.school_id] })))
    setExpoCodesList((expoRows ?? []) as { id: string; code: string; used: boolean; created_at: string }[])
    setLoadingCodes(false)
  }

  async function generateCoordCode() {
    if (!selCoordSchool || !supabaseRef.current) return
    const sb = supabaseRef.current
    const school = codesSchools.find(s => s.id === selCoordSchool)
    const slug   = (school?.code ?? school?.name.slice(0, 4) ?? 'SCH').toUpperCase().replace(/\s+/g, '-')
    const code   = `COORD-BF-${slug}-${new Date().getFullYear()}`
    setGeneratingCoord(true)
    if (MOCK_MODE) {
      setLastCoordCode(code)
      setCoordCodesList(prev => [{ id: Date.now().toString(), code, used: false, created_at: new Date().toISOString(), school_name: school?.name }, ...prev].slice(0, 10))
      setGeneratingCoord(false); return
    }
    const { error } = await sb.from('coordinator_codes').insert({ code, school_id: selCoordSchool, used: false })
    if (error) { showToast('error', error.code === '23505' ? 'Ese código ya existe' : 'Error al generar'); setGeneratingCoord(false); return }
    setLastCoordCode(code)
    setCoordCodesList(prev => [{ id: Date.now().toString(), code, used: false, created_at: new Date().toISOString(), school_name: school?.name }, ...prev].slice(0, 10))
    showToast('success', 'Código generado')
    setGeneratingCoord(false)
  }

  async function generateExpoCode() {
    if (!supabaseRef.current) return
    const sb  = supabaseRef.current
    const yr  = new Date().getFullYear()
    const rnd = String(Math.floor(1000 + Math.random() * 9000))
    const code = `EXPO-BF-${yr}-${rnd}`
    setGeneratingExpo(true)
    if (MOCK_MODE) {
      setLastExpoCode(code)
      setExpoCodesList(prev => [{ id: Date.now().toString(), code, used: false, created_at: new Date().toISOString() }, ...prev].slice(0, 10))
      setGeneratingExpo(false); return
    }
    const { error } = await sb.from('expositor_codes').insert({ code, used: false })
    if (error) { showToast('error', 'Error al generar código'); setGeneratingExpo(false); return }
    setLastExpoCode(code)
    setExpoCodesList(prev => [{ id: Date.now().toString(), code, used: false, created_at: new Date().toISOString() }, ...prev].slice(0, 10))
    showToast('success', 'Código de expositor generado')
    setGeneratingExpo(false)
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => showToast('success', 'Copiado al portapapeles'))
  }

  // ── Schools helpers ────────────────────────────────────────────────────────────
  async function fetchSchoolsData() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (MOCK_MODE) {
      setSchoolsList(MOCK.schools.map(s => ({ id: s.id, name: s.name, code: s.id, city: 'Riohacha', logo_url: null, created_at: '2026-01-01T00:00:00Z', coord_count: 1, student_count: s.students })))
      return
    }
    setLoadingSchools(true)
    const [{ data: sch }, { data: coords }, { data: studs }] = await Promise.all([
      sb.from('schools').select('id, name, code, city, logo_url, created_at').order('name'),
      sb.from('profiles').select('school_id').eq('role', 'coordinator'),
      sb.from('profiles').select('school_id').eq('role', 'student'),
    ])
    const coordMap: Record<string, number> = {}
    coords?.forEach((r: { school_id: string | null }) => { if (r.school_id) coordMap[r.school_id] = (coordMap[r.school_id] ?? 0) + 1 })
    const studMap: Record<string, number> = {}
    studs?.forEach((r: { school_id: string | null }) => { if (r.school_id) studMap[r.school_id] = (studMap[r.school_id] ?? 0) + 1 })
    setSchoolsList((sch ?? []).map((s: { id: string; name: string; code: string | null; city: string | null; logo_url: string | null; created_at: string }) => ({ ...s, coord_count: coordMap[s.id] ?? 0, student_count: studMap[s.id] ?? 0 })))
    setLoadingSchools(false)
  }

  async function handleAddSchool() {
    if (!sfName.trim() || !sfCode.trim() || !supabaseRef.current) return
    const sb = supabaseRef.current
    setSavingSchool(true)
    let logo_url: string | null = null
    if (sfLogoFile) {
      const path = `${sfCode.trim().toLowerCase()}-${Date.now()}`
      const { data: up } = await sb.storage.from('school-logos').upload(path, sfLogoFile, { cacheControl: '3600', upsert: true })
      if (up) { const { data: { publicUrl } } = sb.storage.from('school-logos').getPublicUrl(up.path); logo_url = publicUrl }
    }
    const { data, error } = await sb.from('schools').insert({ name: sfName.trim(), code: sfCode.trim().toUpperCase(), city: sfCity.trim() || null, logo_url }).select().maybeSingle()
    if (error) { showToast('error', error.code === '23505' ? 'Ese código ya existe' : 'Error al crear el colegio'); setSavingSchool(false); return }
    if (data) setSchoolsList(prev => [{ ...data, coord_count: 0, student_count: 0 }, ...prev])
    setSfName(''); setSfCode(''); setSfCity(''); setSfLogoFile(null); setSfLogoPreview('')
    showToast('success', 'Colegio creado correctamente')
    setSavingSchool(false)
  }

  async function handleEditSchool() {
    if (!editSchool || !efName.trim() || !supabaseRef.current) return
    const sb = supabaseRef.current
    setSavingEdit(true)
    let logo_url = editSchool.logo_url
    if (efLogoFile) {
      const path = `${editSchool.code ?? editSchool.id}-${Date.now()}`
      const { data: up } = await sb.storage.from('school-logos').upload(path, efLogoFile, { cacheControl: '3600', upsert: true })
      if (up) { const { data: { publicUrl } } = sb.storage.from('school-logos').getPublicUrl(up.path); logo_url = publicUrl }
    }
    const { error } = await sb.from('schools').update({ name: efName.trim(), city: efCity.trim() || null, logo_url }).eq('id', editSchool.id)
    if (error) { showToast('error', 'Error al actualizar'); setSavingEdit(false); return }
    setSchoolsList(prev => prev.map(s => s.id === editSchool.id ? { ...s, name: efName.trim(), city: efCity.trim() || null, logo_url } : s))
    showToast('success', 'Colegio actualizado')
    setEditSchool(null); setEfLogoFile(null); setEfLogoPreview('')
    setSavingEdit(false)
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
        /* ── Codes tab ── */
        .codes-section{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:28px 24px;margin-bottom:20px;}
        .codes-section-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:var(--ink);margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid var(--line);}
        .codes-gen-row{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:20px;}
        .codes-select{flex:1;min-width:180px;padding:10px 14px;border:1.5px solid var(--line);border-radius:10px;font-family:"Satoshi",sans-serif;font-size:14px;background:var(--card-bg);color:var(--ink);outline:none;}
        .codes-select:focus{border-color:var(--ink);}
        .codes-output-row{display:flex;gap:8px;align-items:center;margin-bottom:16px;}
        .codes-output{flex:1;padding:11px 16px;border:1.5px solid var(--line);border-radius:10px;font-family:"Satoshi",sans-serif;font-size:14px;color:var(--ink);background:var(--bg-2);letter-spacing:.04em;}
        .codes-list-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line-soft);font-size:13px;}
        .codes-list-row:last-child{border-bottom:none;}
        .codes-badge-used{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#D1FAE5;color:#065F46;}
        .codes-badge-free{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:var(--bg-2);color:var(--mute);}
        /* ── Schools tab ── */
        .sch-grid{display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start;}
        .sch-table-wrap{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;overflow:hidden;}
        .sch-form-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;}
        .sch-form-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:var(--ink);margin-bottom:18px;}
        .sch-field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;}
        .sch-label{font-size:12px;font-weight:600;color:var(--mute);letter-spacing:.04em;}
        .sch-input{padding:10px 14px;border:1.5px solid var(--line);border-radius:10px;font-family:"Satoshi",sans-serif;font-size:14px;background:var(--card-bg);color:var(--ink);outline:none;}
        .sch-input:focus{border-color:var(--ink);}
        .sch-logo-area{border:2px dashed var(--line);border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:border-color .2s;margin-bottom:14px;}
        .sch-logo-area:hover{border-color:var(--ink);}
        .sch-logo-preview{width:80px;height:80px;object-fit:contain;border-radius:8px;margin:0 auto 8px;}
        /* Edit panel */
        .sch-edit-overlay{position:fixed;inset:0;background:rgba(13,13,13,.35);z-index:200;}
        .sch-edit-panel{position:fixed;top:0;right:0;bottom:0;width:360px;background:var(--card-bg);border-left:1px solid var(--card-border);padding:28px 24px;overflow-y:auto;z-index:201;box-shadow:-12px 0 40px rgba(13,13,13,.08);}
        .sch-edit-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:17px;color:var(--ink);margin-bottom:20px;}
        @media(max-width:900px){.sch-grid{grid-template-columns:1fr;}}

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

        {/* ── CÓDIGOS ── */}
        {tab === 'codes' && (
          <m.div initial={pref ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 24 }}>
            <div className="adm-section-title" style={{ marginBottom: 24 }}>Generador de Códigos de Acceso</div>

            {/* Coordinator codes */}
            <div className="codes-section">
              <div className="codes-section-title">Códigos de Coordinador</div>
              {loadingCodes ? (
                <Skeleton w="100%" h={40} r={10} />
              ) : (
                <>
                  <div className="codes-gen-row">
                    <select className="codes-select" value={selCoordSchool} onChange={e => setSelCoordSchool(e.target.value)}>
                      <option value="">Seleccionar colegio…</option>
                      {codesSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button
                      className="adm-btn adm-btn-primary"
                      disabled={!selCoordSchool || generatingCoord}
                      onClick={generateCoordCode}
                    >
                      {generatingCoord ? 'Generando…' : 'Generar código'}
                    </button>
                  </div>
                  {lastCoordCode && (
                    <div className="codes-output-row">
                      <div className="codes-output">{lastCoordCode}</div>
                      <button className="adm-btn adm-btn-ghost" onClick={() => copyCode(lastCoordCode)}>Copiar</button>
                    </div>
                  )}
                  {coordCodesList.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 8, fontWeight: 600 }}>Últimos generados</div>
                      {coordCodesList.map(row => (
                        <div key={row.id} className="codes-list-row">
                          <div>
                            <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--ink)', letterSpacing: '.02em' }}>{row.code}</div>
                            {row.school_name && <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 1 }}>{row.school_name}</div>}
                          </div>
                          <span className={row.used ? 'codes-badge-used' : 'codes-badge-free'}>{row.used ? 'Usado' : 'Libre'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Expositor codes */}
            <div className="codes-section">
              <div className="codes-section-title">Códigos de Expositor</div>
              <div className="codes-gen-row">
                <button
                  className="adm-btn adm-btn-primary"
                  disabled={generatingExpo}
                  onClick={generateExpoCode}
                >
                  {generatingExpo ? 'Generando…' : 'Generar código de expositor'}
                </button>
              </div>
              {lastExpoCode && (
                <div className="codes-output-row">
                  <div className="codes-output">{lastExpoCode}</div>
                  <button className="adm-btn adm-btn-ghost" onClick={() => copyCode(lastExpoCode)}>Copiar</button>
                </div>
              )}
              {expoCodesList.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 8, fontWeight: 600 }}>Últimos generados</div>
                  {expoCodesList.map(row => (
                    <div key={row.id} className="codes-list-row">
                      <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--ink)', letterSpacing: '.02em' }}>{row.code}</div>
                      <span className={row.used ? 'codes-badge-used' : 'codes-badge-free'}>{row.used ? 'Usado' : 'Libre'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </m.div>
        )}

        {/* ── COLEGIOS ── */}
        {tab === 'schools' && (
          <m.div initial={pref ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 24 }}>
            <div className="adm-section-title" style={{ marginBottom: 24 }}>Gestión de Colegios</div>
            <div className="sch-grid">

              {/* Table */}
              <div className="sch-table-wrap">
                {loadingSchools ? (
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1,2,3,4].map(i => <Skeleton key={i} w="100%" h={20} r={6} />)}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 600, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>Colegio</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 600, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>Código</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 600, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>Coords</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 600, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>Estudiantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolsList.map(s => (
                        <tr
                          key={s.id}
                          style={{ cursor: 'pointer', transition: 'background .15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                          onClick={() => { setEditSchool(s); setEfName(s.name); setEfCity(s.city ?? ''); setEfLogoFile(null); setEfLogoPreview(s.logo_url ?? '') }}
                        >
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {s.logo_url
                                ? <img src={s.logo_url} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
                                : <div style={{ width: 32, height: 32, background: 'var(--bg-2)', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--mute)', fontWeight: 700 }}>{s.name[0]}</div>
                              }
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.name}</div>
                                {s.city && <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 1 }}>{s.city}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', fontFamily: '"Satoshi",sans-serif', fontSize: 12, color: 'var(--mute)', letterSpacing: '.04em' }}>{s.code ?? '—'}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', textAlign: 'center', color: 'var(--ink)' }}>{s.coord_count}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', textAlign: 'center', fontWeight: 700, color: 'var(--ink)' }}>{s.student_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Add form */}
              <div className="sch-form-card">
                <div className="sch-form-title">Agregar colegio</div>
                <div className="sch-field">
                  <label className="sch-label">Nombre *</label>
                  <input className="sch-input" value={sfName} onChange={e => setSfName(e.target.value)} placeholder="IE Técnica María Inmaculada" />
                </div>
                <div className="sch-field">
                  <label className="sch-label">Código *</label>
                  <input className="sch-input" value={sfCode} onChange={e => setSfCode(e.target.value.toUpperCase())} placeholder="BF-COL-MIM-2026" style={{ letterSpacing: '.05em' }} />
                </div>
                <div className="sch-field">
                  <label className="sch-label">Ciudad</label>
                  <input className="sch-input" value={sfCity} onChange={e => setSfCity(e.target.value)} placeholder="Riohacha" />
                </div>
                {/* Logo upload */}
                <div
                  className="sch-logo-area"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {sfLogoPreview
                    ? <img src={sfLogoPreview} alt="Logo preview" className="sch-logo-preview" />
                    : <div style={{ fontSize: 13, color: 'var(--mute)' }}>📷 Subir logo (opcional)</div>
                  }
                  <input
                    ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setSfLogoFile(f); setSfLogoPreview(URL.createObjectURL(f)) } }}
                  />
                </div>
                <button
                  className="adm-btn adm-btn-primary" style={{ width: '100%' }}
                  disabled={!sfName.trim() || !sfCode.trim() || savingSchool}
                  onClick={handleAddSchool}
                >
                  {savingSchool ? 'Guardando…' : 'Crear colegio'}
                </button>
              </div>

            </div>

            {/* Edit panel */}
            <AnimatePresence>
              {editSchool && (
                <>
                  <m.div className="sch-edit-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={() => setEditSchool(null)} />
                  <m.div className="sch-edit-panel" initial={{ x: 360 }} animate={{ x: 0 }} exit={{ x: 360 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div className="sch-edit-title">Editar colegio</div>
                      <button onClick={() => setEditSchool(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', fontSize: 20 }}>×</button>
                    </div>
                    <div className="sch-field">
                      <label className="sch-label">Nombre *</label>
                      <input className="sch-input" value={efName} onChange={e => setEfName(e.target.value)} />
                    </div>
                    <div className="sch-field">
                      <label className="sch-label">Ciudad</label>
                      <input className="sch-input" value={efCity} onChange={e => setEfCity(e.target.value)} />
                    </div>
                    <div className="sch-logo-area" onClick={() => editLogoRef.current?.click()} style={{ marginBottom: 20 }}>
                      {efLogoPreview
                        ? <img src={efLogoPreview} alt="Logo" className="sch-logo-preview" />
                        : <div style={{ fontSize: 13, color: 'var(--mute)' }}>📷 Cambiar logo</div>
                      }
                      <input
                        ref={editLogoRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setEfLogoFile(f); setEfLogoPreview(URL.createObjectURL(f)) } }}
                      />
                    </div>
                    <button
                      className="adm-btn adm-btn-primary" style={{ width: '100%' }}
                      disabled={!efName.trim() || savingEdit}
                      onClick={handleEditSchool}
                    >
                      {savingEdit ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </m.div>
                </>
              )}
            </AnimatePresence>
          </m.div>
        )}

      </main>
      </div>

      <ToastContainer />
    </>
  )
}
