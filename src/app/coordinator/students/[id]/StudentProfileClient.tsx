'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/components/Toast'

// ── Interfaces ──────────────────────────────────────────────────────────────
interface StudentProfile {
  id: string
  full_name: string
  email: string
  created_at: string
  school_name: string
}

interface ModuleRow {
  id: string
  title: string
  order_index: number
  xp_reward: number | null
  completed: boolean
  completed_at: string | null
  video_percent: number | null
}

interface QuizAttempt {
  id: string
  module_id: string
  module_title: string
  score: number
  time_taken: number | null
  tab_switches: number
  created_at: string
}

interface Project {
  id: string
  title: string
  category: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface Note {
  id: string
  content: string
  created_at: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function getLevel(xp: number): { label: string; color: string; bg: string } {
  if (xp >= 1000) return { label: 'Senior Leader', color: '#C0392B', bg: 'rgba(192,57,43,0.1)' }
  return                  { label: 'Junior Leader', color: '#92400E', bg: '#FEF3C7' }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(secs: number | null) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

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

function Avatar({ name, size = 80 }: { name: string; size?: number }) {
  const palettes = [
    ['#C0392B', '#922B21'],
    ['#1E40AF', '#1E3A8A'],
    ['#065F46', '#064E3B'],
    ['#7A4A00', '#6D4000'],
    ['#4B0082', '#380062'],
  ]
  const idx = (name.charCodeAt(0) ?? 0) % palettes.length
  const [c1, c2] = palettes[idx]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Satoshi, sans-serif', fontWeight: 900,
      fontSize: size * 0.38, color: '#fff', flexShrink: 0,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  studentId: string
  coordinatorId: string
  coordinatorName: string
  coordinatorSchoolId: string
  lastSignIn: string | null
}

export default function StudentProfileClient({
  studentId, coordinatorId, coordinatorName, lastSignIn,
}: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,         setLoading]         = useState(true)
  const [profile,         setProfile]         = useState<StudentProfile | null>(null)
  const [totalXp,         setTotalXp]         = useState(0)
  const [modules,         setModules]         = useState<ModuleRow[]>([])
  const [quizAttempts,    setQuizAttempts]    = useState<QuizAttempt[]>([])
  const [projects,        setProjects]        = useState<Project[]>([])
  const [notes,           setNotes]           = useState<Note[]>([])
  const [newNote,         setNewNote]         = useState('')
  const [savingNote,      setSavingNote]      = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [
        profileRes,
        xpRes,
        allModulesRes,
        progressRes,
        attemptsRes,
        videoRes,
        projectsRes,
        notesRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, created_at, schools(name)')
          .eq('id', studentId)
          .maybeSingle(),
        supabase
          .from('xp_log')
          .select('amount')
          .eq('user_id', studentId),
        supabase
          .from('modules')
          .select('id, title, order_index, xp_reward')
          .order('order_index'),
        supabase
          .from('progress')
          .select('module_id, completed, completed_at')
          .eq('user_id', studentId),
        supabase
          .from('quiz_attempts')
          .select('id, module_id, score, time_taken, tab_switches, created_at, modules(title)')
          .eq('user_id', studentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('video_progress')
          .select('module_id, percent_watched')
          .eq('user_id', studentId),
        supabase
          .from('projects')
          .select('id, title, category, status, created_at')
          .eq('user_id', studentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('coordinator_notes')
          .select('id, content, created_at')
          .eq('coordinator_id', coordinatorId)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false }),
      ])

      if (profileRes.data) {
        const p = profileRes.data as any
        setProfile({
          id:          p.id,
          full_name:   p.full_name ?? '—',
          email:       p.email ?? '—',
          created_at:  p.created_at,
          school_name: p.schools?.name ?? '—',
        })
      }

      const xpTotal = xpRes.data?.reduce((s, r) => s + (r.amount ?? 0), 0) ?? 0
      setTotalXp(xpTotal)

      const progressMap: Record<string, { completed: boolean; completed_at: string | null }> = {}
      progressRes.data?.forEach((p: any) => {
        progressMap[p.module_id] = { completed: p.completed ?? false, completed_at: p.completed_at ?? null }
      })

      const vpMap: Record<string, number> = {}
      videoRes.data?.forEach((v: any) => { vpMap[v.module_id] = v.percent_watched ?? 0 })

      setModules((allModulesRes.data ?? []).map((m: any): ModuleRow => ({
        id:           m.id,
        title:        m.title ?? '—',
        order_index:  m.order_index ?? 0,
        xp_reward:    m.xp_reward ?? null,
        completed:    progressMap[m.id]?.completed ?? false,
        completed_at: progressMap[m.id]?.completed_at ?? null,
        video_percent: vpMap[m.id] ?? null,
      })))

      setQuizAttempts((attemptsRes.data ?? []).map((a: any): QuizAttempt => ({
        id:           a.id,
        module_id:    a.module_id,
        module_title: (a.modules as any)?.title ?? '—',
        score:        a.score ?? 0,
        time_taken:   a.time_taken ?? null,
        tab_switches: a.tab_switches ?? 0,
        created_at:   a.created_at,
      })))

      setProjects((projectsRes.data ?? []) as Project[])
      setNotes((notesRes.data ?? []) as Note[])
      setLoading(false)
    }
    load()
  }, [studentId])

  async function handleSaveNote() {
    const content = newNote.trim()
    if (!content) return
    setSavingNote(true)
    const { data, error } = await supabase
      .from('coordinator_notes')
      .insert({ coordinator_id: coordinatorId, student_id: studentId, content })
      .select('id, content, created_at')
      .maybeSingle()
    setSavingNote(false)
    if (error) { showToast('error', 'Error al guardar la nota'); return }
    setNotes(prev => [data as Note, ...prev])
    setNewNote('')
    showToast('success', 'Nota guardada')
  }

  async function handleDeleteNote(noteId: string) {
    const { error } = await supabase
      .from('coordinator_notes')
      .delete()
      .eq('id', noteId)
    if (error) { showToast('error', 'Error al eliminar la nota'); return }
    setNotes(prev => prev.filter(n => n.id !== noteId))
    setDeleteConfirmId(null)
    showToast('success', 'Nota eliminada')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const level         = getLevel(totalXp)
  const completedCount = modules.filter(m => m.completed).length
  const totalModules  = modules.length
  const progressPct   = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0

  const attemptsByModule: Record<string, QuizAttempt[]> = {}
  quizAttempts.forEach(a => {
    if (!attemptsByModule[a.module_id]) attemptsByModule[a.module_id] = []
    attemptsByModule[a.module_id].push(a)
  })

  const STATUS_MAP = {
    pending:  { label: 'En revisión', cls: 'badge-orange' },
    approved: { label: 'Aprobado',    cls: 'badge-green'  },
    rejected: { label: 'Rechazado',   cls: 'badge-red'    },
  } as const

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Inter",system-ui,sans-serif;min-height:100vh;color:var(--ink);}

        .nav{position:sticky;top:0;z-index:30;background:var(--bg);backdrop-filter:saturate(150%) blur(16px);border-bottom:1px solid var(--line);height:62px;display:flex;align-items:center;padding:0 40px;gap:24px;}
        .nav__brand{display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;color:var(--ink);flex-shrink:0;}
        .nav__right{display:flex;align-items:center;gap:12px;flex-shrink:0;margin-left:auto;}
        .nav__badge{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;background:#FFF4E6;color:#7A4A00;border:1px solid #FFD699;border-radius:999px;padding:3px 10px;font-weight:700;}
        .nav__name{font-size:13px;color:var(--ink-2);font-weight:500;}
        .btn-nav{background:transparent;border:1px solid var(--line);border-radius:999px;padding:8px 16px;font-size:13px;color:var(--ink);cursor:pointer;transition:border-color .2s,background .2s;white-space:nowrap;font-family:inherit;}
        .btn-nav:hover{border-color:var(--ink);background:var(--line);}
        .btn-logout{background:none;border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:12px;color:var(--mute);cursor:pointer;transition:all .2s;white-space:nowrap;font-family:inherit;}
        .btn-logout:hover{border-color:var(--ink);color:var(--ink);}

        .main{max-width:900px;margin:0 auto;padding:44px 24px 80px;}
        .breadcrumb{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mute);margin-bottom:28px;}
        .breadcrumb a{color:var(--mute);text-decoration:none;cursor:pointer;transition:color .15s;}
        .breadcrumb a:hover{color:var(--ink);}

        .card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:28px;box-shadow:0 2px 12px -4px rgba(13,13,13,.07);margin-bottom:24px;}
        .section-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:var(--ink);margin-bottom:20px;}

        .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;}
        .stat-box{text-align:center;}
        .stat-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:30px;color:#C0392B;line-height:1;}
        .stat-label{font-size:11px;color:var(--mute);margin-top:5px;line-height:1.3;}

        .progress-bar-bg{background:rgba(13,13,13,.08);border-radius:999px;height:8px;overflow:hidden;margin-bottom:8px;}
        .progress-bar-fill{height:100%;border-radius:999px;background:#C0392B;transition:width .4s ease;}

        .mod-row{display:flex;align-items:flex-start;gap:16px;padding:16px 0;border-bottom:1px solid var(--line-soft);}
        .mod-row:last-child{border-bottom:none;}
        .mod-num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#C0392B;min-width:28px;padding-top:2px;}
        .mod-center{flex:1;min-width:0;}
        .mod-title{font-family:"Satoshi",sans-serif;font-weight:600;font-size:15px;color:var(--ink);margin-bottom:4px;}
        .mod-right{text-align:right;min-width:150px;}
        .mini-bar-bg{background:rgba(13,13,13,.08);border-radius:999px;height:4px;overflow:hidden;margin-top:5px;width:100px;}
        .mini-bar-fill{height:100%;border-radius:999px;background:#C0392B;}

        .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600;}
        .badge-green{background:#D1FAE5;color:#065F46;}
        .badge-gray{background:var(--line);color:var(--mute);}
        .badge-red{background:#FEE2E2;color:#991B1B;}
        .badge-orange{background:#FFFBEB;color:#92400E;}
        .badge-blue{background:#EFF6FF;color:#1E40AF;}
        .badge-xp{background:#FFF4E6;color:#7A4A00;font-size:10px;margin-left:6px;padding:2px 7px;}

        .proj-row{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--line-soft);}
        .proj-row:last-child{border-bottom:none;}

        .tbl{width:100%;border-collapse:collapse;font-size:13px;}
        .tbl th{text-align:left;padding:10px 14px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);font-weight:600;border-bottom:1px solid var(--line);white-space:nowrap;}
        .tbl td{padding:12px 14px;border-bottom:1px solid var(--line-soft);color:var(--ink-2);vertical-align:middle;}
        .tbl tr:last-child td{border-bottom:none;}

        .note-card{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:12px;padding:14px 16px;margin-bottom:10px;}
        .note-text{font-size:14px;color:var(--ink);line-height:1.55;}
        .note-footer{display:flex;align-items:center;justify-content:space-between;margin-top:8px;}
        .note-date{font-size:12px;color:#aaa;}
        .btn-del{background:none;border:none;cursor:pointer;color:#C0392B;opacity:.55;padding:4px;transition:opacity .15s;display:flex;align-items:center;border-radius:6px;}
        .btn-del:hover{opacity:1;}

        .empty-state{text-align:center;padding:36px 0;color:var(--mute);font-size:14px;}

        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;}
        .modal-box{background:var(--card-bg);border-radius:16px;padding:28px;max-width:360px;width:100%;box-shadow:0 20px 60px -10px rgba(0,0,0,.3);}

        @media(max-width:700px){
          .stat-grid{grid-template-columns:repeat(2,1fr);}
          .nav{padding:0 16px;gap:10px;}
          .main{padding:28px 16px 60px;}
          .mod-right{min-width:100px;}
          .nav__name{display:none;}
        }
      `}</style>

      {/* Navbar */}
      <nav className="nav">
        <a className="nav__brand" href="/">
          <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9"  cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          Big Family
        </a>
        <div className="nav__right">
          <span className="nav__badge">Coordinador</span>
          <span className="nav__name">{coordinatorName}</span>
          <button className="btn-nav" onClick={() => router.push('/coordinator/projects')}>Proyectos</button>
          <button className="btn-nav" onClick={() => router.push('/coordinator')}>Panel</button>
          <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </nav>

      <main className="main">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <a onClick={() => router.push('/coordinator')}>Panel</a>
          <span style={{ color: 'var(--line)' }}>›</span>
          <a onClick={() => router.push('/coordinator')}>Estudiantes</a>
          <span style={{ color: 'var(--line)' }}>›</span>
          <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>
            {loading ? '…' : profile?.full_name}
          </span>
        </div>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, type: 'spring', stiffness: 200, damping: 24 }}
        >
          {loading ? (
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Sk w={80} h={80} r={40} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <Sk w="55%" h={28} r={6} />
                <div style={{ marginTop: 10 }}><Sk w="38%" h={13} r={5} /></div>
                <div style={{ marginTop: 6  }}><Sk w="44%" h={13} r={5} /></div>
              </div>
            </div>
          ) : profile ? (
            <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Left */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flex: '1 1 260px', minWidth: 0 }}>
                <div>
                  <Avatar name={profile.full_name} size={80} />
                  <div style={{ marginTop: 10, textAlign: 'center' }}>
                    <span
                      className="badge"
                      style={{ background: level.bg, color: level.color, fontSize: 10.5, padding: '3px 10px' }}
                    >
                      {level.label}
                    </span>
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 900, fontSize: 28, color: '#0D0D0D', letterSpacing: '-0.022em', lineHeight: 1.15 }}>
                    {profile.full_name}
                  </h1>
                  <p style={{ fontSize: 14, color: '#6B6B6B', marginTop: 6  }}>{profile.email}</p>
                  <p style={{ fontSize: 14, color: '#6B6B6B', marginTop: 3  }}>{profile.school_name}</p>
                  <p style={{ fontSize: 13, color: '#9a9690', marginTop: 10 }}>Miembro desde {fmtDate(profile.created_at)}</p>
                </div>
              </div>

              {/* Right — stats */}
              <div className="stat-grid" style={{ flex: '0 0 auto' }}>
                <div className="stat-box">
                  <div className="stat-num">{totalXp.toLocaleString()}</div>
                  <div className="stat-label">XP Total</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num" style={{ color: 'var(--ink)', fontSize: 26 }}>
                    {completedCount}
                    <span style={{ fontSize: 16, color: 'var(--mute)', fontWeight: 400 }}> / {totalModules}</span>
                  </div>
                  <div className="stat-label">Módulos<br />completados</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num" style={{ color: 'var(--ink)' }}>{projects.length}</div>
                  <div className="stat-label">Proyectos<br />subidos</div>
                </div>
                <div className="stat-box">
                  <div style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', lineHeight: 1.3 }}>
                    {lastSignIn ? fmtDate(lastSignIn) : 'Nunca'}
                  </div>
                  <div className="stat-label">Ãšltimo<br />acceso</div>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>

        {/* ── SECCIÃ“N 1 — MÃ“DULOS ─────────────────────────────────────────── */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="section-title">Progreso de Módulos</div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Array.from({ length: 4 }).map((_, i) => <Sk key={i} h={20} r={5} />)}
            </div>
          ) : (
            <>
              {/* Barra general */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--mute)' }}>
                  <span>{completedCount} de {totalModules} módulos completados</span>
                  <span style={{ fontWeight: 700, color: '#C0392B' }}>{progressPct}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              {/* Lista */}
              <div>
                {modules.map(m => {
                  const attempts = (attemptsByModule[m.id] ?? [])
                    .slice()
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  return (
                    <div key={m.id} className="mod-row">
                      <div className="mod-num">
                        {String(m.order_index + 1).padStart(2, '0')}
                      </div>

                      <div className="mod-center">
                        <div className="mod-title">
                          {m.title}
                          {m.xp_reward ? <span className="badge badge-xp">{m.xp_reward} XP</span> : null}
                        </div>
                        {m.completed ? (
                          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="badge badge-green">✓ Completado</span>
                            {m.completed_at && (
                              <span style={{ fontSize: 12, color: '#6B6B6B' }}>
                                Completado el {fmtDate(m.completed_at)}
                              </span>
                            )}
                          </div>
                        ) : (m.video_percent ?? 0) > 0 ? (
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: 12, color: '#6B6B6B' }}>
                              Video: {Math.round(m.video_percent!)}% visto
                            </span>
                            <div className="mini-bar-bg">
                              <div className="mini-bar-fill" style={{ width: `${Math.round(m.video_percent!)}%` }} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: 4 }}>
                            <span className="badge badge-gray">Sin iniciar</span>
                          </div>
                        )}
                      </div>

                      <div className="mod-right">
                        {attempts.length === 0 ? (
                          <span style={{ fontSize: 12, color: '#9a9690' }}>Sin intentar</span>
                        ) : attempts.slice(0, 2).map((att, idx) => (
                          <div key={att.id} style={{ marginBottom: idx === 0 && attempts.length > 1 ? 4 : 0 }}>
                            <span className={`badge ${att.score >= 70 ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10.5 }}>
                              Intento {idx + 1}: {att.score}%
                            </span>
                            {att.tab_switches > 0 && (
                              <span style={{ fontSize: 10, color: '#C0392B', marginLeft: 5 }}>
                                ⚠ï¸ {att.tab_switches}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {modules.length === 0 && (
                  <div className="empty-state">No hay módulos disponibles.</div>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* ── SECCIÃ“N 2 — PROYECTOS ──────────────────────────────────────── */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="section-title">Proyectos subidos</div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 2 }).map((_, i) => <Sk key={i} h={56} r={10} />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">Este estudiante aún no ha subido proyectos.</div>
          ) : (
            <div>
              {projects.map(p => {
                const st = STATUS_MAP[p.status] ?? STATUS_MAP.pending
                return (
                  <div key={p.id} className="proj-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 5 }}>
                        {p.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(192,57,43,.1)', color: '#C0392B', borderRadius: 999, fontWeight: 600 }}>
                          {p.category}
                        </span>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                        <span style={{ fontSize: 12, color: '#6B6B6B' }}>{fmtDate(p.created_at)}</span>
                      </div>
                    </div>
                    <a
                      href="/coordinator/projects"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '7px 14px', border: '1px solid var(--line)', borderRadius: 999,
                        fontSize: 12, color: 'var(--ink)', textDecoration: 'none',
                        whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s',
                      }}
                    >
                      Ver proyecto →
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* ── SECCIÃ“N 3 — HISTORIAL DE CUESTIONARIOS ─────────────────────── */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="section-title">Historial de cuestionarios</div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 3 }).map((_, i) => <Sk key={i} h={18} r={5} />)}
            </div>
          ) : quizAttempts.length === 0 ? (
            <div className="empty-state">Este estudiante no ha realizado ningún cuestionario.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Módulo</th>
                    <th>Intento #</th>
                    <th>Puntaje</th>
                    <th>Tiempo</th>
                    <th>Salidas</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {quizAttempts.map(att => {
                    const sameModule = quizAttempts
                      .filter(a => a.module_id === att.module_id)
                      .slice()
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    const attNum = sameModule.findIndex(a => a.id === att.id) + 1
                    const passed = att.score >= 70
                    return (
                      <tr key={att.id}>
                        <td style={{ fontWeight: 500 }}>{att.module_title}</td>
                        <td style={{ color: '#6B6B6B' }}>{attNum}</td>
                        <td style={{ color: passed ? '#065F46' : '#991B1B', fontFamily: 'Satoshi, sans-serif', fontWeight: 700 }}>
                          {att.score}%
                        </td>
                        <td style={{ color: '#6B6B6B', whiteSpace: 'nowrap' }}>{fmtTime(att.time_taken)}</td>
                        <td>
                          {att.tab_switches > 0
                            ? <span style={{ color: '#C0392B', fontWeight: 700 }}>⚠ï¸ {att.tab_switches}</span>
                            : <span style={{ color: 'var(--mute)' }}>0</span>
                          }
                        </td>
                        <td style={{ color: '#6B6B6B', whiteSpace: 'nowrap' }}>{fmtDate(att.created_at)}</td>
                        <td>
                          <span className={`badge ${passed ? 'badge-green' : 'badge-red'}`}>
                            {passed ? 'Aprobado' : 'Reprobado'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* ── SECCIÃ“N 4 — NOTAS PRIVADAS ─────────────────────────────────── */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="section-title">Notas privadas</div>
          <p style={{ fontSize: 13, color: '#6B6B6B', fontStyle: 'italic', marginBottom: 20, marginTop: -12 }}>
            Solo tú puedes ver estas notas
          </p>

          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Agrega una nota sobre este estudiante..."
            style={{
              width: '100%', minHeight: 100, border: '1px solid rgba(13,13,13,0.12)',
              borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'Inter, sans-serif',
              color: 'var(--ink)', background: 'var(--bg)', resize: 'vertical',
              outline: 'none', transition: 'border-color .2s', lineHeight: 1.55,
            }}
            onFocus={e => { e.target.style.borderColor = '#C0392B' }}
            onBlur={e  => { e.target.style.borderColor = 'rgba(13,13,13,0.12)' }}
          />
          <button
            onClick={handleSaveNote}
            disabled={savingNote || !newNote.trim()}
            style={{
              marginTop: 12, padding: '10px 22px', background: '#C0392B',
              color: '#fff', border: 'none', borderRadius: 999, fontSize: 13.5,
              fontWeight: 600, cursor: savingNote || !newNote.trim() ? 'not-allowed' : 'pointer',
              opacity: savingNote || !newNote.trim() ? 0.55 : 1,
              fontFamily: 'inherit', transition: 'opacity .15s',
            }}
          >
            {savingNote ? 'Guardando…' : 'Guardar nota'}
          </button>

          {loading ? (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 2 }).map((_, i) => <Sk key={i} h={70} r={10} />)}
            </div>
          ) : notes.length > 0 ? (
            <div style={{ marginTop: 24 }}>
              <AnimatePresence>
                {notes.map(note => (
                  <motion.div
                    key={note.id}
                    className="note-card"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                  >
                    <p className="note-text">{note.content}</p>
                    <div className="note-footer">
                      <span className="note-date">{fmtDate(note.created_at)}</span>
                      <button
                        className="btn-del"
                        onClick={() => setDeleteConfirmId(note.id)}
                        title="Eliminar nota"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <p style={{ marginTop: 20, fontSize: 13, color: 'var(--mute)', fontStyle: 'italic' }}>
              Aún no has agregado notas sobre este estudiante.
            </p>
          )}
        </motion.div>
      </main>

      {/* Modal confirmación de borrado */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              className="modal-box"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 10 }}>
                ¿Eliminar esta nota?
              </h3>
              <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24, lineHeight: 1.5 }}>
                Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{ padding: '9px 18px', border: '1px solid var(--line)', borderRadius: 999, background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink)', fontFamily: 'inherit' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteNote(deleteConfirmId)}
                  style={{ padding: '9px 18px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
