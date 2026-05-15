'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import ExpositorSidebar from '@/components/ExpositorSidebar'

interface ModuleRow {
  id:               string
  title:            string
  level:            string
  status:           string
  duration_minutes: number
  rejection_reason: string | null
  question_count:   number
}

const LEVEL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  junior: { label: 'Junior', color: '#92400E', bg: '#FEF3C7' },
  senior: { label: 'Senior', color: '#C0392B', bg: 'rgba(192,57,43,0.1)' },
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Borrador',    color: '#444441', bg: '#F1EFE8' },
  pending:   { label: 'En revisión', color: '#92400E', bg: '#FEF3C7' },
  published: { label: 'Publicado',   color: '#065F46', bg: '#D1FAE5' },
  rejected:  { label: 'Rechazado',   color: '#991B1B', bg: '#FEE2E2' },
}

function Badge({ map, value }: { map: typeof STATUS_LABELS; value: string }) {
  const s = map[value] ?? { label: value, color: '#444', bg: '#eee' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: s.color, background: s.bg, display: 'inline-block' }}>
      {s.label}
    </span>
  )
}

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
  )
}

export default function ExpositorPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,      setLoading]      = useState(true)
  const [userName,     setUserName]     = useState('…')
  const [userInitial,  setUserInitial]  = useState('E')
  const [modules,      setModules]      = useState<ModuleRow[]>([])
  const [deleteTarget, setDeleteTarget] = useState<ModuleRow | null>(null)
  const [deleting,     setDeleting]     = useState(false)
  const pref = useReducedMotion()

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    let cancelled = false
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('full_name, role').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (!profile || profile.role !== 'expositor') { router.replace('/login'); return }

      const fullName = profile.full_name ?? user.email ?? 'Expositor'
      setUserName(fullName)
      setUserInitial(fullName.charAt(0).toUpperCase())

      const { data: mods } = await supabase
        .from('modules')
        .select('id, title, level, status, duration_minutes, rejection_reason')
        .eq('created_by', user.id)
        .order('order_index', { ascending: true })

      if (cancelled) return

      if (mods && mods.length > 0) {
        const { data: qs } = await supabase
          .from('questions').select('module_id').in('module_id', mods.map(m => m.id))
        if (cancelled) return
        const qMap: Record<string, number> = {}
        qs?.forEach(q => { qMap[q.module_id] = (qMap[q.module_id] ?? 0) + 1 })
        setModules(mods.map(m => ({ ...m, question_count: qMap[m.id] ?? 0 })))
      }

      setLoading(false)
    }
    boot()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function confirmDelete() {
    if (!deleteTarget || !supabaseRef.current) return
    const supabase = supabaseRef.current
    setDeleting(true)
    await supabase.from('questions').delete().eq('module_id', deleteTarget.id)
    await supabase.from('modules').delete().eq('id', deleteTarget.id)
    setModules(prev => prev.filter(m => m.id !== deleteTarget.id))
    setDeleting(false)
    setDeleteTarget(null)
  }

  const stats = {
    total:     modules.length,
    published: modules.filter(m => m.status === 'published').length,
    pending:   modules.filter(m => m.status === 'pending').length,
    rejected:  modules.filter(m => m.status === 'rejected').length,
  }

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Inter",system-ui,sans-serif;color:var(--ink);}
        .exp-content{flex:1;overflow:auto;padding:40px 48px 80px;min-width:0;}
        .exp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;gap:16px;flex-wrap:wrap;}
        .exp-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:28px;letter-spacing:-.022em;color:var(--ink);}
        .exp-subtitle{font-size:13.5px;color:var(--mute);margin-top:3px;}
        .btn-new{padding:11px 22px;border-radius:999px;background:#C0392B;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:background .2s;white-space:nowrap;}
        .btn-new:hover{background:#a93226;}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:32px;}
        .stat-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:20px 22px;}
        .stat-label{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);font-weight:600;margin-bottom:8px;}
        .stat-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:34px;letter-spacing:-.03em;color:var(--ink);}
        .stat-num.accent{color:#C0392B;}
        .mod-list{display:flex;flex-direction:column;gap:14px;}
        .mod-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:22px 24px;box-shadow:0 2px 10px -4px rgba(13,13,13,.06);transition:box-shadow .2s;}
        .mod-card:hover{box-shadow:0 4px 20px -6px rgba(13,13,13,.12);}
        .mod-card-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
        .mod-card-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);flex:1;min-width:160px;}
        .mod-card-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .mod-card-detail{font-size:12px;color:var(--mute);}
        .btn-edit{padding:8px 18px;border-radius:999px;border:1.5px solid var(--line);background:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:var(--ink);cursor:pointer;transition:all .18s;white-space:nowrap;}
        .btn-edit:hover{border-color:#C0392B;color:#C0392B;}
        .btn-delete{padding:8px 14px;border-radius:999px;border:1.5px solid transparent;background:none;font-family:"Satoshi",sans-serif;font-weight:600;font-size:13px;color:var(--mute);cursor:pointer;transition:all .18s;white-space:nowrap;}
        .btn-delete:hover{border-color:#FCA5A5;color:#991B1B;background:#FFF5F5;}
        .mod-rejection{margin-top:12px;padding:10px 14px;background:#FFF5F5;border:1px solid #FCA5A5;border-radius:8px;font-size:13px;color:#7F1D1D;line-height:1.5;}
        .empty-state{text-align:center;padding:80px 0;color:var(--mute);}
        @media(max-width:900px){
          .exp-content{padding:24px 20px 60px;}
          .stats{grid-template-columns:repeat(2,1fr);}
        }
        @media(max-width:600px){
          .stats{grid-template-columns:1fr 1fr;}
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <ExpositorSidebar activePage="modules" userName={userName} userInitial={userInitial} />

        <motion.div
          className="exp-content"
          initial={pref ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="exp-header">
            <div>
              <div className="exp-title">Mis Módulos</div>
              <div className="exp-subtitle">Panel del Expositor · {userName}</div>
            </div>
            <motion.button
              className="btn-new"
              onClick={() => router.push('/expositor/modules/new')}
              whileHover={pref ? undefined : { scale: 1.02 }}
              whileTap={pref ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              + Nuevo módulo
            </motion.button>
          </div>

          {/* Stats */}
          {loading ? (
            <div className="stats">
              {[0,1,2,3].map(i => (
                <div key={i} className="stat-card">
                  <Sk w="55%" h={10} r={5} />
                  <div style={{ marginTop: 12 }}><Sk w="40%" h={32} r={6} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="stats">
              {([
                { label: 'Total',       num: stats.total,     accent: false                 },
                { label: 'Publicados',  num: stats.published, accent: stats.published > 0   },
                { label: 'En revisión', num: stats.pending,   accent: false                 },
                { label: 'Rechazados',  num: stats.rejected,  accent: stats.rejected > 0    },
              ] as { label: string; num: number; accent: boolean }[]).map((s, i) => (
                <motion.div
                  key={s.label}
                  className="stat-card"
                  initial={pref ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
                >
                  <div className="stat-label">{s.label}</div>
                  <div className={`stat-num${s.accent ? ' accent' : ''}`}>{s.num}</div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Module list */}
          {loading ? (
            <div className="mod-list">
              {[0,1,2].map(i => (
                <div key={i} className="mod-card">
                  <Sk w="50%" h={18} r={6} />
                  <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                    <Sk w={70} h={22} r={999} />
                    <Sk w={80} h={22} r={999} />
                  </div>
                </div>
              ))}
            </div>
          ) : modules.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 16px', opacity: .35 }}>
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 12h8M8 8h5M8 16h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <p style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Sin módulos todavía</p>
              <p style={{ fontSize: 14, marginBottom: 24 }}>Crea tu primer módulo para empezar.</p>
              <button className="btn-new" onClick={() => router.push('/expositor/modules/new')}>+ Crear módulo</button>
            </div>
          ) : (
            <div className="mod-list">
              {modules.map((mod, i) => (
                <motion.div
                  key={mod.id}
                  className="mod-card"
                  initial={pref ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: pref ? 0 : i * 0.04 }}
                >
                  <div className="mod-card-row">
                    <div className="mod-card-title">{mod.title || <span style={{ color: 'var(--mute)', fontStyle: 'italic' }}>Sin título</span>}</div>
                    <div className="mod-card-meta">
                      {mod.level && <Badge map={LEVEL_LABELS} value={mod.level} />}
                      <Badge map={STATUS_LABELS} value={mod.status} />
                      {mod.duration_minutes > 0 && (
                        <span className="mod-card-detail">{mod.duration_minutes} min</span>
                      )}
                      <span className="mod-card-detail">{mod.question_count} pregunta{mod.question_count !== 1 ? 's' : ''}</span>
                    </div>
                    <button className="btn-edit" onClick={() => router.push(`/expositor/modules/${mod.id}/edit`)}>
                      Editar →
                    </button>
                    {mod.status === 'draft' && (
                      <button className="btn-delete" onClick={() => setDeleteTarget(mod)}>
                        Eliminar
                      </button>
                    )}
                  </div>
                  {mod.status === 'rejected' && mod.rejection_reason && (
                    <div className="mod-rejection">
                      <strong>Motivo de rechazo:</strong> {mod.rejection_reason}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => { if (!deleting) setDeleteTarget(null) }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--card-bg)', borderRadius: 20, padding: '36px 32px', maxWidth: 420, width: '100%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.25)' }}
            >
              <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 10 }}>
                ¿Eliminar módulo?
              </div>
              <p style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.6, marginBottom: 8 }}>
                Esto eliminará permanentemente
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 24 }}>
                "{deleteTarget.title || 'Sin título'}"
              </p>
              <p style={{ fontSize: 13, color: '#9a9690', marginBottom: 24 }}>
                También se eliminarán todas sus preguntas. Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={{ padding: '10px 20px', borderRadius: 999, background: 'transparent', color: 'var(--mute)', border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{ padding: '10px 22px', borderRadius: 999, background: '#991B1B', color: '#fff', border: 'none', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
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
