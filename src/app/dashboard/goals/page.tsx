'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DashboardSidebar from '@/components/DashboardSidebar'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { springNatural, springSnappy } from '@/lib/animations'

interface Goal {
  id: string
  title: string
  description: string | null
  type: 'personal' | 'program'
  status: 'active' | 'completed' | 'expired'
  due_date: string | null
  xp_reward: number
  completed_at: string | null
  created_at: string
}

interface GoalTemplate {
  id: string
  title: string
  description: string | null
  xp_reward: number
}

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite', flexShrink: 0 }} />
}

function GoalRow({ goal, onComplete, completing }: { goal: Goal; onComplete: (g: Goal) => void; completing: boolean }) {
  const overdue = goal.due_date && goal.status === 'active' && new Date(goal.due_date) < new Date()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '16px 0', borderBottom: '1px solid var(--line-soft)' }}>
      {/* Touch-target wrapper: min 44×44px for mobile */}
      <div
        style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: goal.status === 'active' ? 'pointer' : 'default' }}
        onClick={() => goal.status === 'active' && !completing && onComplete(goal)}
      >
        <button
          tabIndex={-1}
          disabled={goal.status !== 'active' || completing}
          style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${goal.status === 'completed' ? '#22c55e' : '#C0392B'}`, background: goal.status === 'completed' ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'inherit', flexShrink: 0, transition: 'all .2s', pointerEvents: 'none' }}
        >
          {goal.status === 'completed' && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, color: goal.status === 'completed' ? 'var(--mute)' : 'var(--ink)', textDecoration: goal.status === 'completed' ? 'line-through' : 'none' }}>
            {goal.title}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: goal.type === 'program' ? 'rgba(192,57,43,.1)' : 'rgba(13,13,13,.07)', color: goal.type === 'program' ? '#C0392B' : 'var(--mute)' }}>
            {goal.type === 'program' ? 'Programa' : 'Personal'}
          </span>
          {goal.status === 'completed' && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#D1FAE5', color: '#065F46' }}>Completada</span>
          )}
        </div>
        {goal.description && (
          <div style={{ fontSize: 12.5, color: 'var(--mute)', marginTop: 3, lineHeight: 1.5 }}>{goal.description}</div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          {goal.due_date && (
            <span style={{ fontSize: 11.5, color: overdue ? '#C0392B' : 'var(--mute)', fontWeight: overdue ? 600 : 400 }}>
              {overdue ? '⚠ ' : ''}Vence: {new Date(goal.due_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
          <span style={{ fontSize: 11.5, color: '#b25a00', fontWeight: 600 }}>+{goal.xp_reward} XP</span>
        </div>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()

  const [loading,     setLoading]     = useState(true)
  const [goals,       setGoals]       = useState<Goal[]>([])
  const [templates,   setTemplates]   = useState<GoalTemplate[]>([])
  const [userId,      setUserId]      = useState('')
  const [userName,    setUserName]    = useState('…')
  const [userInitial, setUserInitial] = useState('L')
  const [completing,  setCompleting]  = useState<string | null>(null)

  // New goal form state
  const [showForm,       setShowForm]       = useState(false)
  const [formTitle,      setFormTitle]      = useState('')
  const [formDesc,       setFormDesc]       = useState('')
  const [formDue,        setFormDue]        = useState('')
  const [formXp,         setFormXp]         = useState(50)
  const [submitting,     setSubmitting]     = useState(false)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function load() {
      const { data: { user: authUser } } = await sb!.auth.getUser()
      if (!authUser) { router.replace('/login'); return }
      setUserId(authUser.id)

      const [{ data: profile }, { data: goalsData }, { data: tmplData }] = await Promise.all([
        sb!.from('profiles').select('full_name').eq('id', authUser.id).maybeSingle(),
        sb!.from('goals').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
        sb!.from('goal_templates').select('*').order('created_at', { ascending: false }),
      ])

      setUserName(profile?.full_name ?? 'Líder')
      setUserInitial((profile?.full_name ?? 'L')[0].toUpperCase())
      setGoals(goalsData ?? [])
      setTemplates(tmplData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleComplete(goal: Goal) {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb || completing) return
    setCompleting(goal.id)

    await sb.from('goals').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', goal.id)
    await sb.from('xp_log').insert({ user_id: userId, amount: goal.xp_reward, reason: `Meta completada: ${goal.title}` })
    await sb.from('activity_feed').insert({ user_id: userId, type: 'goal_completed', metadata: { goal_title: goal.title } }).select()

    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: 'completed', completed_at: new Date().toISOString() } : g))
    setCompleting(null)
  }

  async function handleCreateGoal() {
    if (!formTitle.trim() || !supabaseRef.current) return
    const sb = supabaseRef.current
    setSubmitting(true)
    const { data } = await sb.from('goals').insert({
      user_id: userId, title: formTitle.trim(), description: formDesc.trim() || null,
      type: 'personal', due_date: formDue || null, xp_reward: formXp,
    }).select().maybeSingle()
    if (data) setGoals(prev => [data, ...prev])
    setFormTitle(''); setFormDesc(''); setFormDue(''); setFormXp(50)
    setShowForm(false); setSubmitting(false)
  }

  async function handleAdoptTemplate(tmpl: GoalTemplate) {
    if (!supabaseRef.current) return
    const sb = supabaseRef.current
    const already = goals.some(g => g.title === tmpl.title && g.type === 'program' && g.status === 'active')
    if (already) return
    const { data } = await sb.from('goals').insert({
      user_id: userId, title: tmpl.title, description: tmpl.description,
      type: 'program', xp_reward: tmpl.xp_reward,
    }).select().maybeSingle()
    if (data) setGoals(prev => [data, ...prev])
  }

  const activeGoals    = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const totalGoals     = goals.length
  const completedPct   = totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0

  return (
    <>
      <style>{`
        
        .layout{display:flex;height:100dvh;overflow:hidden;width:100%;}
        .content{flex:1;min-width:0;overflow-y:auto;padding:32px 28px;display:flex;flex-direction:column;gap:20px;}
        .page-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:26px;letter-spacing:-0.02em;color:var(--ink);}
        .page-sub{font-size:13.5px;color:var(--mute);margin-top:4px;}
        .card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;box-shadow:0 2px 16px -6px rgba(13,13,13,.08);}
        .section-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:var(--ink);margin-bottom:16px;display:flex;align-items:center;gap:10px;}
        .section-badge{padding:3px 9px;background:var(--line);color:var(--mute);border-radius:999px;font-size:11px;font-weight:600;}
        .btn-primary{padding:10px 20px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s;}
        .btn-primary:hover{background:#a93226;}
        .btn-ghost{padding:9px 18px;background:none;border:1px solid var(--line);border-radius:10px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer;transition:all .2s;}
        .btn-ghost:hover{border-color:var(--ink);}
        .field{display:flex;flex-direction:column;gap:6px;}
        .field label{font-size:12px;font-weight:600;color:var(--mute);letter-spacing:.06em;text-transform:uppercase;}
        .field input,.field textarea{padding:10px 14px;border:1px solid var(--line);border-radius:10px;font-size:13.5px;font-family:inherit;outline:none;background:var(--bg-2);color:var(--ink);transition:border-color .2s,box-shadow .2s;}
        .field input:focus,.field textarea:focus{border-color:#C0392B;box-shadow:0 0 0 3px rgba(192,57,43,.12);}
        .field textarea,.field-textarea{padding:10px 14px;border:1px solid var(--line);border-radius:10px;font-size:13.5px;font-family:inherit;outline:none;background:var(--bg-2);color:var(--ink);transition:border-color .2s,box-shadow .2s;resize:vertical;width:100%;}
        .field-textarea:focus{border-color:#C0392B;box-shadow:0 0 0 3px rgba(192,57,43,.12);}
        .goals-progress-bar{height:6px;background:var(--line);border-radius:999px;overflow:hidden;margin-top:8px;}
        .tmpl-card{padding:14px 16px;border:1px solid var(--line);border-radius:12px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:space-between;gap:12px;}
        .tmpl-card:hover{border-color:#C0392B;background:rgba(192,57,43,.03);}
        .tmpl-card.adopted{cursor:default;}
        .tmpl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}
      `}</style>

      <div className="layout">
        <DashboardSidebar activePage="goals" userName={userName} userInitial={userInitial} />

        <m.main
          className="content"
          initial={pref ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <div className="page-title">Mis Metas</div>
            <div className="page-sub">Establece objetivos personales y del programa para ganar XP</div>
          </div>

          {/* Progress summary */}
          {!loading && totalGoals > 0 && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 14, padding: '18px 22px', boxShadow: '0 2px 12px -6px rgba(13,13,13,.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                  {completedGoals.length === totalGoals && totalGoals > 0
                    ? '🎉 ¡Todas las metas completadas!'
                    : `${completedGoals.length} de ${totalGoals} metas completadas`}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#C0392B' }}>{completedPct}%</span>
              </div>
              <div className="goals-progress-bar">
                <m.div
                  style={{ height: '100%', background: '#C0392B', borderRadius: 999 }}
                  initial={{ width: '0%' }}
                  whileInView={{ width: `${completedPct}%` }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.2 }}
                />
              </div>
            </div>
          )}

          {/* Completed goals — shown FIRST when there are no active goals */}
          {!loading && activeGoals.length === 0 && completedGoals.length > 0 && (
            <div className="card">
              <div className="section-title">
                Metas completadas
                <span className="section-badge">{completedGoals.length}</span>
              </div>
              {completedGoals.map(goal => (
                <GoalRow key={goal.id} goal={goal} onComplete={() => {}} completing={false} />
              ))}
            </div>
          )}

          {/* Active goals */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>
                Metas activas
                {!loading && <span className="section-badge">{activeGoals.length}</span>}
              </div>
              <m.button
                className="btn-primary"
                onClick={() => setShowForm(s => !s)}
                whileHover={pref ? undefined : { scale: 1.02 }}
                whileTap={pref ? undefined : { scale: 0.97 }}
                transition={springSnappy}
              >
                + Nueva meta
              </m.button>
            </div>

            {/* Create form */}
            <AnimatePresence>
              {showForm && (
                <m.div
                  key="form"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={springNatural}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '16px', background: 'var(--bg-2)', borderRadius: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="field">
                      <label>Título</label>
                      <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="¿Qué quieres lograr?" />
                    </div>
                    <div className="field">
                      <label>Descripción (opcional)</label>
                      <textarea className="field-textarea" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Describe tu meta..." rows={2} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="field">
                        <label>Fecha límite (opcional)</label>
                        <input type="date" value={formDue} onChange={e => setFormDue(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>XP al completar</label>
                        <input type="number" value={formXp} onChange={e => setFormXp(Number(e.target.value))} min={10} max={500} step={10} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn-primary" onClick={handleCreateGoal} disabled={!formTitle.trim() || submitting}>
                        {submitting ? 'Guardando…' : 'Crear meta'}
                      </button>
                      <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3].map(i => <Sk key={i} h={52} r={10} />)}
              </div>
            ) : activeGoals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--mute)', fontSize: 13 }}>
                No tienes metas activas. ¡Crea una o adopta una del programa!
              </div>
            ) : (
              <m.div
                initial={pref ? false : 'hidden'}
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
              >
                {activeGoals.map(goal => (
                  <m.div
                    key={goal.id}
                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: springNatural } }}
                  >
                    <GoalRow goal={goal} onComplete={handleComplete} completing={completing === goal.id} />
                  </m.div>
                ))}
              </m.div>
            )}
          </div>

          {/* Program templates */}
          {!loading && (
            <div className="card">
              <div className="section-title">
                Metas del programa
                {templates.length > 0 && <span className="section-badge">{templates.length}</span>}
              </div>
              {templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 20px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <circle cx="11" cy="11" r="9" stroke="var(--mute)" strokeWidth="1.5"/>
                      <path d="M11 7v4l2.5 2.5" stroke="var(--mute)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 6 }}>No hay plantillas del programa todavía</div>
                  <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.5 }}>El coordinador agregará metas del programa próximamente.</div>
                </div>
              ) : (
              <div className="tmpl-grid">
                {templates.map(tmpl => {
                  const adopted = goals.some(g => g.title === tmpl.title && g.type === 'program' && g.status === 'active')
                  return (
                    <m.div
                      key={tmpl.id}
                      className={`tmpl-card ${adopted ? 'adopted' : ''}`}
                      style={{ border: adopted ? '1px solid rgba(34,197,94,.3)' : undefined }}
                      onClick={() => !adopted && handleAdoptTemplate(tmpl)}
                      whileHover={!adopted && !pref ? { y: -2 } : undefined}
                      transition={springSnappy}
                    >
                      <div>
                        <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{tmpl.title}</div>
                        {tmpl.description && <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 3 }}>{tmpl.description}</div>}
                        <div style={{ marginTop: 6, fontSize: 11.5, color: 'rgba(180,90,0,.9)', fontWeight: 600 }}>+{tmpl.xp_reward} XP</div>
                      </div>
                      {adopted ? (
                        <span style={{ fontSize: 11, color: '#065F46', fontWeight: 700, background: 'rgba(34,197,94,.15)', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>✓ Adoptada</span>
                      ) : (
                        <span style={{ fontSize: 20, color: '#C0392B', fontWeight: 300, lineHeight: 1 }}>+</span>
                      )}
                    </m.div>
                  )
                })}
              </div>
              )}
            </div>
          )}

          {/* Completed goals — shown BELOW active when both exist */}
          {!loading && completedGoals.length > 0 && activeGoals.length > 0 && (
            <div className="card">
              <div className="section-title">
                Metas completadas
                <span className="section-badge">{completedGoals.length}</span>
              </div>
              {completedGoals.map(goal => (
                <GoalRow key={goal.id} goal={goal} onComplete={() => {}} completing={false} />
              ))}
            </div>
          )}

        </m.main>
      </div>
    </>
  )
}
