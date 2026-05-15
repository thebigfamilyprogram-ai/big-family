'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardSidebar from '@/components/DashboardSidebar'
import ProjectCard, { type Project } from '@/components/ProjectCard'
import { showToast } from '@/components/Toast'

export default function ProjectsPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,      setLoading]      = useState(true)
  const [userName,     setUserName]     = useState('…')
  const [initial,      setInitial]      = useState('L')
  const [projects,     setProjects]     = useState<Project[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const name = profile?.full_name ?? user.email ?? 'Leader'
      setUserName(name)
      setInitial(name.charAt(0).toUpperCase())

      const { data: rows } = await supabase
        .from('projects')
        .select('id, title, description, category, status, completion_percentage, created_at, school_id, user_id, video_url, pdf_url, rejection_reason, approved_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      console.log('projects:', rows)
      if (rows?.length) console.log('project fields:', rows[0])

      if (rows && rows.length > 0) {
        const ids = rows.map((r: { id: string }) => r.id)
        const [{ data: imgs }, { data: likes }, { data: cmts }] = await Promise.all([
          supabase.from('project_images').select('project_id, url').in('project_id', ids),
          supabase.from('project_likes').select('project_id').in('project_id', ids),
          supabase.from('project_comments').select('project_id').in('project_id', ids),
        ])
        setProjects(rows.map((p: { id: string; title: string; description: string; category: string; status: 'draft' | 'pending' | 'approved' | 'rejected'; created_at: string; user_id: string; school_id: string | null; video_url: string | null; pdf_url: string | null; rejection_reason: string | null; approved_at: string | null; completion_percentage: number }) => ({
          ...p,
          images:         imgs?.filter((i: { project_id: string; url: string }) => i.project_id === p.id).map((i: { project_id: string; url: string }) => i.url) ?? [],
          likes_count:    likes?.filter((l: { project_id: string }) => l.project_id === p.id).length ?? 0,
          comments_count: cmts?.filter((c: { project_id: string }) => c.project_id === p.id).length ?? 0,
        })))
      }

      setLoading(false)
    }
    boot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleNewProject() {
    const existingDraft = projects.find(p => p.status === 'draft')
    if (existingDraft) {
      router.push(`/dashboard/projects/${existingDraft.id}/edit`)
    } else {
      router.push('/dashboard/projects/new')
    }
  }

  async function handleDelete(project: Project) {
    if (!supabaseRef.current) return
    const supabase = supabaseRef.current
    setDeleting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setDeleting(false); return }

    await Promise.all([
      supabase.from('project_images').delete().eq('project_id', project.id),
      supabase.from('project_likes').delete().eq('project_id', project.id),
      supabase.from('project_comments').delete().eq('project_id', project.id),
    ])
    await supabase.from('projects').delete().eq('id', project.id).eq('user_id', user.id)

    if (project.images.length > 0) {
      const paths = project.images.map(url => {
        const marker = '/project-images/'
        const idx = url.indexOf(marker)
        return idx >= 0 ? url.slice(idx + marker.length) : url
      })
      await supabase.storage.from('project-images').remove(paths)
    }

    setProjects(prev => prev.filter(p => p.id !== project.id))
    setDeleteTarget(null)
    setDeleting(false)
    showToast('success', 'Proyecto eliminado')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
        <DashboardSidebar activePage="projects" />
        <div style={{ flex: 1, padding: 40, overflow: 'auto' }}>
          <div style={{ height: 36, width: 200, borderRadius: 8, background: 'rgba(13,13,13,.07)', marginBottom: 28 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 280, borderRadius: 16, background: 'rgba(13,13,13,.05)' }} />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap');
        .pj-header{padding:36px 40px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap;}
        .pj-header__left{}
        .pj-eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.18em;color:#C0392B;text-transform:uppercase;font-weight:700;margin-bottom:10px;}
        .pj-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:28px;color:var(--ink);letter-spacing:-.02em;margin-bottom:6px;}
        .pj-sub{font-size:14px;color:var(--mute);font-family:Inter,sans-serif;}
        .btn-new{padding:11px 22px;border-radius:999px;background:#C0392B;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:background .2s;white-space:nowrap;align-self:center;}
        .btn-new:hover{background:#a93226;}
        .pj-content{padding:28px 40px 60px;}
        .pj-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;}
        .pj-empty{background:var(--card-bg);border:1px solid var(--card-border);border-radius:20px;padding:64px 40px;text-align:center;box-shadow:0 2px 12px -4px rgba(13,13,13,.06);}
        .pj-empty__icon{width:64px;height:64px;border-radius:50%;background:rgba(192,57,43,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
        .pj-empty__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:var(--ink);margin-bottom:8px;}
        .pj-empty__sub{font-size:14px;color:var(--mute);max-width:360px;margin:0 auto 24px;line-height:1.6;}
        .btn-empty{padding:12px 28px;border-radius:999px;background:#C0392B;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:background .2s;}
        .btn-empty:hover{background:#a93226;}
        .pj-card-wrap{position:relative;}
        .pj-delete-btn{position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:6px;border:none;background:transparent;color:#991B1B;font-family:Inter,sans-serif;font-size:12px;cursor:pointer;opacity:0;transition:opacity .15s,background .15s;}
        .pj-card-wrap:hover .pj-delete-btn{opacity:1;}
        .pj-delete-btn:hover{background:rgba(153,27,27,0.08);}
        .pj-card-footer{padding:12px 16px;border-top:1px solid rgba(13,13,13,.06);display:flex;align-items:center;justify-content:space-between;gap:12px;}
        .pj-progress-bar{flex:1;height:4px;background:rgba(13,13,13,.08);border-radius:999px;overflow:hidden;}
        .pj-progress-fill{height:100%;border-radius:999px;background:#C0392B;transition:width .4s ease;}
        .pj-progress-label{font-size:11px;color:#9a9690;white-space:nowrap;}
        .btn-action{padding:7px 14px;border-radius:999px;font-size:12px;font-family:"Satoshi",sans-serif;font-weight:700;cursor:pointer;border:none;white-space:nowrap;transition:all .2s;}
        .btn-action.draft{background:#0D0D0D;color:#fff;}
        .btn-action.draft:hover{background:#333;}
        .btn-action.pending{background:rgba(13,13,13,.07);color:#9a9690;cursor:default;}
        .btn-action.approved{background:#D1FAE5;color:#065F46;}
        .btn-action.rejected{background:#C0392B;color:#fff;}
        .btn-action.rejected:hover{background:#a93226;}
        @media(max-width:900px){
          .pj-grid{grid-template-columns:1fr;}
          .pj-header,.pj-content{padding-left:20px;padding-right:20px;}
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <DashboardSidebar activePage="projects" userName={userName} userInitial={initial} />

        <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          <div className="pj-header">
            <div className="pj-header__left">
              <div className="pj-eyebrow">The Big Leader</div>
              <h1 className="pj-title">Mis Proyectos</h1>
              <p className="pj-sub">Documenta tu impacto para la certificación The Big Leader</p>
            </div>
            <button className="btn-new" onClick={handleNewProject}>
              + Nuevo Proyecto
            </button>
          </div>

          <div className="pj-content">
            {projects.length === 0 ? (
              <div className="pj-empty">
                <div className="pj-empty__icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M2 7C2 5.9 2.9 5 4 5H9.5L11 7H20C21.1 7 22 7.9 22 9V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V7Z" stroke="#C0392B" strokeWidth="1.6" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="pj-empty__title">Aún no tienes proyectos</div>
                <p className="pj-empty__sub">
                  Sube tu primer proyecto de liderazgo y da el primer paso hacia tu certificación.
                </p>
                <button className="btn-empty" onClick={handleNewProject}>
                  Subir primer proyecto
                </button>
              </div>
            ) : (
              <div className="pj-grid">
                <AnimatePresence>
                  {projects.map((project, i) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.08 }}
                    >
                      <div className="pj-card-wrap">
                        <ProjectCard project={project} mode="student" />
                        <button className="pj-delete-btn" onClick={() => setDeleteTarget(project)}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4h12M5 4V2.5h6V4M6 7v5M10 7v5M3 4l1 9.5h8L13 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Eliminar
                        </button>
                        <div className="pj-card-footer">
                          <div className="pj-progress-bar">
                            <div className="pj-progress-fill" style={{ width: `${(project as any).completion_percentage ?? 0}%` }} />
                          </div>
                          <span className="pj-progress-label">{(project as any).completion_percentage ?? 0}%</span>
                          {project.status === 'draft' && (
                            <button className="btn-action draft" onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}>
                              Continuar →
                            </button>
                          )}
                          {project.status === 'pending' && (
                            <button className="btn-action pending" disabled>En revisión</button>
                          )}
                          {project.status === 'approved' && (
                            <button className="btn-action approved">Ver proyecto ✓</button>
                          )}
                          {project.status === 'rejected' && (
                            <button className="btn-action rejected" onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}>
                              Revisar y reenviar
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            key="delete-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => { if (!deleting) setDeleteTarget(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--card-bg)', borderRadius: 20, padding: '32px 28px', maxWidth: 420, width: '100%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.25)' }}
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(153,27,27,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M5 4V2.5h6V4M6 7v5M10 7v5M3 4l1 9.5h8L13 4" stroke="#991B1B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 10 }}>
                ¿Eliminar proyecto?
              </div>
              <div style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.6, marginBottom: 28 }}>
                Esta acción no se puede deshacer. El proyecto y todas sus imágenes serán eliminados.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={{ padding: '10px 20px', borderRadius: 999, background: 'transparent', color: 'var(--mute)', border: '1px solid var(--line)', fontFamily: '"Satoshi",sans-serif', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget)}
                  disabled={deleting}
                  style={{ padding: '10px 20px', borderRadius: 999, background: '#991B1B', color: '#fff', border: 'none', fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
                >
                  {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
