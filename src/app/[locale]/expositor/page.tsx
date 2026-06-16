'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'
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

interface ModuleAnalytics {
  completed:       number
  avg_score:       number | null
  completion_rate: number   // 0-100
}

type LabelMap = Record<string, { label: string; color: string; bg: string }>

function Badge({ map, value }: { map: LabelMap; value: string }) {
  const s = map[value] ?? { label: value, color: '#444', bg: '#eee' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: s.color, background: s.bg, display: 'inline-block' }}>
      {s.label}
    </span>
  )
}

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
  )
}

export default function ExpositorPage() {
  const router      = useRouter()
  const t           = useTranslations('expositor.modulesPage')
  const tStatus     = useTranslations('expositor.moduleStatus')
  const tCommon     = useTranslations('common')
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const LEVEL_LABELS: LabelMap = {
    junior: { label: t('levelJunior'), color: '#92400E', bg: '#FEF3C7' },
    senior: { label: t('levelSenior'), color: '#C0392B', bg: 'rgba(192,57,43,0.1)' },
  }

  const STATUS_LABELS: LabelMap = {
    draft:     { label: tStatus('draft'),     color: '#444441', bg: '#F1EFE8' },
    pending:   { label: tStatus('pending'),   color: '#92400E', bg: '#FEF3C7' },
    published: { label: tStatus('published'), color: '#065F46', bg: '#D1FAE5' },
    rejected:  { label: tStatus('rejected'),  color: '#991B1B', bg: '#FEE2E2' },
  }

  const [loading,      setLoading]      = useState(true)
  const [userName,     setUserName]     = useState('…')
  const [userInitial,  setUserInitial]  = useState('E')
  const [modules,      setModules]      = useState<ModuleRow[]>([])
  const [analytics,    setAnalytics]    = useState<Record<string, ModuleAnalytics>>({})
  const [deleteTarget, setDeleteTarget] = useState<ModuleRow | null>(null)
  const [deleting,     setDeleting]     = useState(false)
  const pref = useReducedMotion()

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    let cancelled = false
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('display_name, role').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (!profile || profile.role !== 'expositor') { router.replace('/login'); return }

      const fullName = profile.display_name ?? user.email ?? 'Expositor'
      setUserName(fullName)
      setUserInitial(fullName.charAt(0).toUpperCase())

      const { data: mods } = await supabase
        .from('modules')
        .select('id, title, level, status, duration_minutes, rejection_reason')
        .eq('created_by', user.id)
        .order('order_index', { ascending: true })

      if (cancelled) return

      if (mods && mods.length > 0) {
        const modIds = mods.map((m: { id: string }) => m.id)
        const [{ data: qs }, { data: progRows }, { data: quizRows }, { count: totalStudents }] = await Promise.all([
          supabase.from('questions').select('module_id').in('module_id', modIds),
          supabase.from('progress').select('module_id').in('module_id', modIds).eq('completed', true),
          supabase.from('quiz_attempts').select('module_id, score').in('module_id', modIds),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        ])
        if (cancelled) return

        const total = totalStudents ?? 1
        const qMap: Record<string, number> = {}
        qs?.forEach((q: { module_id: string }) => { qMap[q.module_id] = (qMap[q.module_id] ?? 0) + 1 })

        const compMap: Record<string, number> = {}
        progRows?.forEach((r: { module_id: string }) => { compMap[r.module_id] = (compMap[r.module_id] ?? 0) + 1 })

        const scoreMap: Record<string, number[]> = {}
        quizRows?.forEach((r: { module_id: string; score: number | null }) => {
          if (r.score != null) { if (!scoreMap[r.module_id]) scoreMap[r.module_id] = []; scoreMap[r.module_id].push(r.score) }
        })

        const analyticsResult: Record<string, ModuleAnalytics> = {}
        modIds.forEach((id: string) => {
          const completed = compMap[id] ?? 0
          const scores    = scoreMap[id] ?? []
          analyticsResult[id] = {
            completed,
            avg_score:       scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
            completion_rate: Math.round((completed / total) * 100),
          }
        })

        // Mock overrides
        if (MOCK_MODE) {
          modIds.forEach((id: string, i: number) => {
            analyticsResult[id] = {
              completed:       [12, 9, 7, 5, 3, 2][i % 6],
              avg_score:       [82, 76, 88, 71, 65, 90][i % 6],
              completion_rate: [78, 55, 42, 31, 18, 12][i % 6],
            }
          })
        }

        setAnalytics(analyticsResult)
        setModules(mods.map((m: { id: string; title: string; level: string; status: string; duration_minutes: number | null; rejection_reason: string | null }) => ({ ...m, question_count: qMap[m.id] ?? 0 })))
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
                
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Satoshi",sans-serif;color:var(--ink);}
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
        .mod-analytics{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;}
        .mod-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11.5px;font-weight:600;border:1px solid transparent;}
        .mod-pill--green{background:rgba(42,157,143,.1);color:#2A9D8F;border-color:rgba(42,157,143,.2);}
        .mod-pill--amber{background:rgba(212,130,26,.1);color:#D4821A;border-color:rgba(212,130,26,.2);}
        .mod-pill--red{background:rgba(192,57,43,.08);color:#C0392B;border-color:rgba(192,57,43,.2);}
        .mod-pill--neutral{background:var(--bg-2);color:var(--mute);border-color:var(--line);}
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

        <m.div
          className="exp-content"
          initial={pref ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
        >
          {/* Header */}
          <div className="exp-header">
            <div>
              <div className="exp-title">{t('pageTitle')}</div>
              <div className="exp-subtitle">{t('panelSubtitle', { name: userName })}</div>
            </div>
            <m.button
              className="btn-new"
              onClick={() => router.push('/expositor/modules/new')}
              whileHover={pref ? undefined : { scale: 1.02 }}
              whileTap={pref ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              {t('newModuleBtn')}
            </m.button>
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
                { label: t('statTotal'),       num: stats.total,     accent: false                 },
                { label: t('statPublished'),   num: stats.published, accent: stats.published > 0   },
                { label: tStatus('pending'),   num: stats.pending,   accent: false                 },
                { label: t('statRejected'),    num: stats.rejected,  accent: stats.rejected > 0    },
              ] as { label: string; num: number; accent: boolean }[]).map((s, i) => (
                <m.div
                  key={s.label}
                  className="stat-card"
                  initial={pref ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 27, delay: i * 0.07 }}
                >
                  <div className="stat-label">{s.label}</div>
                  <div className={`stat-num${s.accent ? ' accent' : ''}`}>{s.num}</div>
                </m.div>
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
              <p style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{t('emptyTitle')}</p>
              <p style={{ fontSize: 14, marginBottom: 24 }}>{t('emptySubtitle')}</p>
              <button className="btn-new" onClick={() => router.push('/expositor/modules/new')}>{t('createModuleBtn')}</button>
            </div>
          ) : (
            <div className="mod-list">
              {modules.map((mod, i) => (
                <m.div
                  key={mod.id}
                  className="mod-card"
                  initial={pref ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: pref ? 0 : i * 0.04 }}
                >
                  <div className="mod-card-row">
                    <div className="mod-card-title">{mod.title || <span style={{ color: 'var(--mute)', fontStyle: 'italic' }}>{t('untitledModule')}</span>}</div>
                    <div className="mod-card-meta">
                      {mod.level && <Badge map={LEVEL_LABELS} value={mod.level} />}
                      <Badge map={STATUS_LABELS} value={mod.status} />
                      {mod.duration_minutes > 0 && (
                        <span className="mod-card-detail">{mod.duration_minutes} min</span>
                      )}
                      <span className="mod-card-detail">
                        {mod.question_count === 1
                          ? t('questionCountSingular', { count: mod.question_count })
                          : t('questionCountPlural', { count: mod.question_count })}
                      </span>
                    </div>
                    <button className="btn-edit" onClick={() => router.push(`/expositor/modules/${mod.id}/edit`)}>
                      {t('editBtn')}
                    </button>
                    {mod.status === 'draft' && (
                      <button className="btn-delete" onClick={() => setDeleteTarget(mod)}>
                        {t('deleteBtn')}
                      </button>
                    )}
                  </div>
                  {/* Analytics pills — only for published modules */}
                  {mod.status === 'published' && analytics[mod.id] && (() => {
                    const a = analytics[mod.id]
                    const rateClass = a.completion_rate >= 60 ? 'mod-pill--green' : a.completion_rate >= 30 ? 'mod-pill--amber' : 'mod-pill--red'
                    return (
                      <div className="mod-analytics">
                        <span className={`mod-pill ${rateClass}`}>
                          {a.completed === 1
                            ? t('completedSingular', { count: a.completed })
                            : t('completedPlural', { count: a.completed })}
                        </span>
                        {a.avg_score !== null && (
                          <span className="mod-pill mod-pill--neutral">
                            {t('quizAvgLabel', { value: a.avg_score })}
                          </span>
                        )}
                        <span className={`mod-pill ${rateClass}`}>
                          {t('completionRateLabel', { value: a.completion_rate })}
                        </span>
                      </div>
                    )
                  })()}
                  {mod.status === 'rejected' && mod.rejection_reason && (
                    <div className="mod-rejection">
                      <strong>{t('rejectionReasonLabel')}</strong> {mod.rejection_reason}
                    </div>
                  )}
                </m.div>
              ))}
            </div>
          )}
        </m.div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <m.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => { if (!deleting) setDeleteTarget(null) }}
          >
            <m.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--card-bg)', borderRadius: 20, padding: '36px 32px', maxWidth: 420, width: '100%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.25)' }}
            >
              <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 10 }}>
                {t('deleteModalTitle')}
              </div>
              <p style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.6, marginBottom: 8 }}>
                {t('deleteModalBody1')}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 24 }}>
                "{deleteTarget.title || t('untitledModule')}"
              </p>
              <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 24 }}>
                {t('deleteModalBody2')}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={{ padding: '10px 20px', borderRadius: 999, background: 'transparent', color: 'var(--mute)', border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{ padding: '10px 22px', borderRadius: 999, background: '#991B1B', color: '#fff', border: 'none', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
                >
                  {deleting ? t('deletingBtn') : t('confirmDeleteBtn')}
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
