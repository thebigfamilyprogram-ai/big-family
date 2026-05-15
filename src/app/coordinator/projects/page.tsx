'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, useReducedMotion } from 'framer-motion'
import ProjectCard, { type Project, type ProjectComment } from '@/components/ProjectCard'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'draft' | 'pending' | 'approved' | 'rejected'

interface CoordInfo {
  full_name:   string
  school_id:   string
  school_name: string
  user_id:     string
}

interface EnrichedProject extends Project {
  comments:  ProjectComment[]
  resultado?: string | null
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoordinatorProjectsPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,  setLoading]  = useState(true)
  const [coord,    setCoord]    = useState<CoordInfo | null>(null)
  const [projects, setProjects] = useState<EnrichedProject[]>([])

  const [filterStatus,   setFilterStatus]   = useState<StatusFilter>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [search,         setSearch]         = useState('')
  const pref = useReducedMotion()

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, school_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role !== 'coordinator' && profile?.role !== 'admin') { router.push('/dashboard'); return }

      setCoord({
        full_name:   profile?.full_name ?? '—',
        school_id:   profile?.school_id ?? '',
        school_name: 'Todos los colegios',
        user_id:     user.id,
      })

      // All coordinators and admins see every project from every school
      const { data: rows } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (!rows || rows.length === 0) { setLoading(false); return }

      const ids      = rows.map((r: { id: string; user_id: string; school_id: string | null }) => r.id)
      const userIds  = [...new Set(rows.map((r: { id: string; user_id: string; school_id: string | null }) => r.user_id))]
      const schoolIds = [...new Set(rows.map((r: { id: string; user_id: string; school_id: string | null }) => r.school_id).filter(Boolean))]

      const [{ data: imgs }, { data: likes }, { data: cmts }, { data: profiles }, { data: evals }, { data: schools }] = await Promise.all([
        supabase.from('project_images').select('project_id, url').in('project_id', ids),
        supabase.from('project_likes').select('project_id').in('project_id', ids),
        supabase.from('project_comments').select('project_id, id, body, created_at').in('project_id', ids),
        supabase.from('profiles').select('id, full_name').in('id', userIds),
        supabase.from('capstone_evaluations').select('project_id, resultado').in('project_id', ids),
        schoolIds.length ? supabase.from('schools').select('id, name').in('id', schoolIds) : Promise.resolve({ data: [] }),
      ])

      const profileMap: Record<string, string> = {}
      profiles?.forEach((p: { id: string; full_name: string | null }) => { profileMap[p.id] = p.full_name ?? '—' })

      const evalMap: Record<string, string | null> = {}
      evals?.forEach((e: { project_id: string; resultado: string | null }) => { evalMap[e.project_id] = e.resultado })

      const schoolMap: Record<string, string> = {}
      schools?.forEach((s: { id: string; name: string }) => { schoolMap[s.id] = s.name })

      const enriched: EnrichedProject[] = rows
        .map((p: { id: string; title: string; description: string; category: string; status: 'draft' | 'pending' | 'approved' | 'rejected'; created_at: string; user_id: string; school_id: string | null; video_url: string | null; pdf_url: string | null; rejection_reason: string | null; approved_at: string | null; completion_percentage: number }) => ({
          ...p,
          images:         imgs?.filter((i: { project_id: string; url: string }) => i.project_id === p.id).map((i: { project_id: string; url: string }) => i.url) ?? [],
          likes_count:    likes?.filter((l: { project_id: string }) => l.project_id === p.id).length ?? 0,
          comments_count: cmts?.filter((c: { project_id: string; id: string; body: string; created_at: string }) => c.project_id === p.id).length ?? 0,
          full_name:      profileMap[p.user_id] ?? '—',
          school_name:    schoolMap[p.school_id ?? ''] ?? '—',
          comments:       (cmts?.filter((c: { project_id: string; id: string; body: string; created_at: string }) => c.project_id === p.id) ?? []) as ProjectComment[],
          resultado:      evalMap[p.id] ?? null,
        }))
        // pending → draft → approved/rejected, then newest within group
        .sort((a: EnrichedProject, b: EnrichedProject) => {
          const ord = { pending: 0, draft: 1, approved: 2, rejected: 2 } as Record<string, number>
          const ao = ord[a.status] ?? 2
          const bo = ord[b.status] ?? 2
          if (ao !== bo) return ao - bo
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

      setProjects(enriched)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApprove(projectId: string) {
    if (!supabaseRef.current) return
    const supabase = supabaseRef.current
    if (projectId.startsWith('revoke-')) {
      const id = projectId.replace('revoke-', '')
      await supabase.from('projects').update({ status: 'pending', approved_at: null, approved_by: null }).eq('id', id)
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'pending', approved_at: null } : p))
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('projects')
      .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id })
      .eq('id', projectId)
    setProjects(prev => prev.map(p => p.id === projectId
      ? { ...p, status: 'approved', approved_at: new Date().toISOString() }
      : p
    ))
  }

  async function handleReject(projectId: string, reason: string) {
    if (!supabaseRef.current) return
    const supabase = supabaseRef.current
    await supabase
      .from('projects')
      .update({ status: 'rejected', rejection_reason: reason || null })
      .eq('id', projectId)
    setProjects(prev => prev.map(p => p.id === projectId
      ? { ...p, status: 'rejected', rejection_reason: reason }
      : p
    ))
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return projects.filter(p => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (filterCategory && p.category !== filterCategory) return false
      if (q && !p.title.toLowerCase().includes(q) && !(p.full_name ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [projects, filterStatus, filterCategory, search])

  const counts = useMemo(() => ({
    total:    projects.length,
    draft:    projects.filter(p => p.status === 'draft').length,
    pending:  projects.filter(p => p.status === 'pending').length,
    approved: projects.filter(p => p.status === 'approved').length,
    rejected: projects.filter(p => p.status === 'rejected').length,
  }), [projects])

  async function handleLogout() {
    if (supabaseRef.current) await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  const FILTER_TABS: { value: StatusFilter; label: string }[] = [
    { value: 'all',      label: 'Todos' },
    { value: 'draft',    label: 'Borrador' },
    { value: 'pending',  label: 'En revisión' },
    { value: 'approved', label: 'Aprobados' },
    { value: 'rejected', label: 'Rechazados' },
  ]

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;min-height:100vh;color:#0D0D0D;}

        /* Nav */
        .cpj-nav{position:sticky;top:0;z-index:30;background:rgba(245,243,239,.88);backdrop-filter:saturate(150%) blur(16px);border-bottom:1px solid rgba(13,13,13,.08);height:62px;display:flex;align-items:center;padding:0 40px;gap:24px;}
        .cpj-brand{display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;color:#0D0D0D;flex-shrink:0;}
        .cpj-school{flex:1;text-align:center;font-size:13.5px;font-weight:600;color:#2D2D2D;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .cpj-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
        .cpj-badge{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;background:#FFF4E6;color:#7A4A00;border:1px solid #FFD699;border-radius:999px;padding:3px 10px;font-weight:700;}
        .cpj-btn{background:transparent;border:1px solid rgba(13,13,13,.12);border-radius:999px;padding:8px 16px;font-size:13px;color:#0D0D0D;cursor:pointer;transition:border-color .2s,background .2s;white-space:nowrap;font-family:inherit;}
        .cpj-btn:hover{border-color:#0D0D0D;background:rgba(13,13,13,.04);}
        .cpj-btn--active{background:#0D0D0D !important;color:#fff !important;border-color:#0D0D0D !important;}
        .cpj-btn--ghost{background:none;border:1px solid rgba(13,13,13,.14);border-radius:999px;padding:7px 14px;font-size:12px;color:#6B6B6B;cursor:pointer;transition:all .2s;white-space:nowrap;}
        .cpj-btn--ghost:hover{border-color:#0D0D0D;color:#0D0D0D;}

        /* Main */
        .cpj-main{max-width:860px;margin:0 auto;padding:44px 40px 80px;}

        /* Header */
        .cpj-header{margin-bottom:28px;}
        .cpj-header h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:28px;letter-spacing:-.022em;color:#0D0D0D;}
        .cpj-header p{margin-top:5px;font-size:13.5px;color:#6B6B6B;}

        /* Stats row */
        .cpj-stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px;}
        .cpj-stat{background:#fff;border:1px solid rgba(13,13,13,.07);border-radius:12px;padding:14px 18px;min-width:110px;box-shadow:0 1px 6px -2px rgba(13,13,13,.06);}
        .cpj-stat__num{font-family:"Satoshi",sans-serif;font-weight:800;font-size:26px;color:#0D0D0D;line-height:1;}
        .cpj-stat__label{font-size:11.5px;color:#9a9690;margin-top:4px;}
        .badge-pending{display:inline-block;padding:1px 7px;borderRadius:999px;background:#FEF3C7;color:#92400E;font-size:11px;fontWeight:600;verticalAlign:middle;}
        .badge-approved{display:inline-block;padding:1px 7px;border-radius:999px;background:#D1FAE5;color:#065F46;font-size:11px;font-weight:600;vertical-align:middle;}
        .badge-rejected{display:inline-block;padding:1px 7px;border-radius:999px;background:#FEE2E2;color:#991B1B;font-size:11px;font-weight:600;vertical-align:middle;}

        /* Filters */
        .cpj-filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:28px;}
        .cpj-tab{padding:8px 16px;border-radius:999px;background:rgba(13,13,13,.06);color:#6B6B6B;border:none;font-family:"Satoshi",sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .18s;}
        .cpj-tab:hover{background:rgba(13,13,13,.1);color:#0D0D0D;}
        .cpj-tab.active{background:#0D0D0D;color:#fff;}
        .cpj-select{padding:8px 32px 8px 12px;border-radius:999px;border:1px solid rgba(13,13,13,.14);background:#fff;font-size:13px;font-family:inherit;color:#0D0D0D;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B6B6B' stroke-width='1.3' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;cursor:pointer;}
        .cpj-search{padding:8px 14px 8px 34px;border:1px solid rgba(13,13,13,.14);border-radius:999px;font-size:13px;font-family:inherit;outline:none;background:#fff;color:#0D0D0D;transition:border-color .18s;}
        .cpj-search:focus{border-color:#0D0D0D;}
        .cpj-search-wrap{position:relative;}
        .cpj-search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#9a9690;pointer-events:none;}

        /* Feed */
        .cpj-feed{display:flex;flex-direction:column;gap:20px;}
        .cpj-empty{background:#fff;border:1px solid rgba(13,13,13,.07);border-radius:20px;padding:48px;text-align:center;color:#9a9690;font-size:15px;}

        @media(max-width:860px){
          .cpj-main{padding:28px 20px 60px;}
          .cpj-nav{padding:0 20px;}
          .cpj-school{display:none;}
        }
      `}</style>

      {/* Nav */}
      <nav className="cpj-nav">
        <a className="cpj-brand" href="/">
          <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          Big Family
        </a>
        <div className="cpj-school">
          {loading ? <Sk w={160} h={13} r={6} /> : coord?.school_name}
        </div>
        <div className="cpj-right">
          <span className="cpj-badge">Coordinador</span>
          <button className="cpj-btn" onClick={() => router.push('/coordinator')}>Panel principal</button>
          <button className="cpj-btn cpj-btn--active">Proyectos</button>
          <button className="cpj-btn" onClick={() => router.push('/coordinator/modules')}>Módulos</button>
          <button className="cpj-btn" onClick={() => router.push('/coordinator/news')}>Noticias</button>
          <button className="cpj-btn" onClick={() => router.push('/dashboard')}>Dashboard</button>
          <button className="cpj-btn--ghost" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </nav>

      <motion.main
        className="cpj-main"
        initial={pref ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="cpj-header">
          <h1>Proyectos de Liderazgo</h1>
          <p>Revisa y aprueba proyectos para la certificación The Big Leader · {coord?.school_name}</p>
        </div>

        {/* Stats */}
        {loading ? (
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 70, width: 120, borderRadius: 12, background: 'rgba(13,13,13,.05)' }} />)}
          </div>
        ) : (
          <div className="cpj-stats">
            {([
              { num: counts.total,    label: 'Total proyectos', color: undefined    },
              { num: counts.draft,    label: 'Borradores',      color: '#444441'    },
              { num: counts.pending,  label: 'En revisión',     color: '#92400E'    },
              { num: counts.approved, label: 'Aprobados',       color: '#065F46'    },
              { num: counts.rejected, label: 'Rechazados',      color: '#991B1B'    },
            ] as { num: number; label: string; color: string | undefined }[]).map((s, i) => (
              <motion.div
                key={s.label}
                className="cpj-stat"
                initial={pref ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
              >
                <div className="cpj-stat__num" style={{ color: s.color }}>{s.num}</div>
                <div className="cpj-stat__label">{s.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="cpj-filters">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              className={`cpj-tab${filterStatus === tab.value ? ' active' : ''}`}
              onClick={() => setFilterStatus(tab.value)}
            >
              {tab.label}
              {tab.value !== 'all' && counts[tab.value] > 0 && (
                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 999, background: filterStatus === tab.value ? 'rgba(255,255,255,.2)' : 'rgba(13,13,13,.08)', fontSize: 11 }}>
                  {counts[tab.value]}
                </span>
              )}
            </button>
          ))}

          <select
            className="cpj-select"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            <option value="liderazgo-comunitario">Liderazgo comunitario</option>
            <option value="innovacion-social">Innovación social</option>
            <option value="medio-ambiente">Medio ambiente</option>
            <option value="educacion">Educación</option>
            <option value="salud-bienestar">Salud y bienestar</option>
            <option value="emprendimiento">Emprendimiento</option>
          </select>

          <div className="cpj-search-wrap">
            <svg className="cpj-search-icon" width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              className="cpj-search"
              type="text"
              placeholder="Buscar por estudiante o título…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[1,2].map(i => <div key={i} style={{ height: 400, borderRadius: 20, background: 'rgba(13,13,13,.04)' }} />)}
          </div>
        ) : (
          <div className="cpj-feed">
            {filtered.length === 0 ? (
              <div className="cpj-empty">
                {projects.length === 0
                  ? 'Los estudiantes de tu colegio aún no han subido proyectos.'
                  : 'No hay proyectos con esos filtros.'}
              </div>
            ) : (
              filtered.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={pref ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: pref ? 0 : i * 0.06 }}
                >
                  <ProjectCard
                    project={project}
                    mode="coordinator"
                    coordinatorId={coord?.user_id}
                    initialComments={project.comments}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onEvaluate={id => router.push(`/coordinator/projects/${id}/evaluate`)}
                    resultado={project.resultado}
                  />
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.main>
    </>
  )
}
