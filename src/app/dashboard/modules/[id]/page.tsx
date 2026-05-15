'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DashboardSidebar from '@/components/DashboardSidebar'
import VideoPlayer from '@/components/VideoPlayer'
import { ToastContainer } from '@/components/Toast'

interface ModuleData {
  id: string
  title: string
  description: string
  level: string
  xp_reward: number
  order_index: number
  video_url: string | null
  duration_minutes: number | null
}

interface AttemptSummary {
  count: number
  bestScore: number | null
}

const LEVEL_MAP: Record<string, { label: string; bg: string; color: string }> = {
  junior: { label: 'Junior Leader', bg: '#FEF3C7',             color: '#92400E' },
  senior: { label: 'Senior Leader', bg: 'rgba(192,57,43,0.1)', color: '#C0392B' },
}

const LEARN_POINTS = [
  'Desarrollar habilidades de liderazgo prácticas',
  'Aplicar conceptos a situaciones reales de tu entorno',
  'Reflexionar sobre tu impacto en la comunidad',
  'Construir confianza para liderar equipos',
]

function Sk({ w = '100%', h = 16 }: { w?: string | number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

export default function ModulePage() {
  const { id: moduleId } = useParams<{ id: string }>()
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,   setLoading]   = useState(true)
  const [mod,       setMod]       = useState<ModuleData | null>(null)
  const [userId,    setUserId]    = useState<string | null>(null)
  const [userName,  setUserName]  = useState('…')
  const [userInit,  setUserInit]  = useState('L')
  const [qCount,    setQCount]    = useState(0)
  const [attempts,  setAttempts]  = useState<AttemptSummary>({ count: 0, bestScore: null })

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [{ data: profile }, { data: modRow }, { data: qs }, { data: att }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase.from('modules').select('*').eq('id', moduleId).maybeSingle(),
        supabase.from('questions').select('id', { count: 'exact' }).eq('module_id', moduleId),
        supabase.from('quiz_attempts').select('score').eq('user_id', user.id).eq('module_id', moduleId),
      ])

      const name = profile?.full_name ?? user.email ?? 'Leader'
      setUserName(name)
      setUserInit(name.charAt(0).toUpperCase())

      if (!modRow) { router.push('/dashboard/leadership-path'); return }

      // Sequential lock check: if this is not module 1, previous must be completed
      if (modRow.order_index > 1) {
        const { data: prevMod } = await supabase
          .from('modules')
          .select('id')
          .eq('order_index', modRow.order_index - 1)
          .eq('status', 'published')
          .maybeSingle()
        if (prevMod) {
          const { data: prevProgress } = await supabase
            .from('progress')
            .select('completed')
            .eq('user_id', user.id)
            .eq('module_id', prevMod.id)
            .maybeSingle()
          if (!prevProgress?.completed) {
            router.replace('/dashboard')
            return
          }
        }
      }

      setMod(modRow as ModuleData)
      setQCount(qs?.length ?? 0)

      const scores = att?.map((a: { score: number }) => a.score) ?? []
      setAttempts({
        count: scores.length,
        bestScore: scores.length > 0 ? Math.max(...scores) : null,
      })

      setLoading(false)
    }
    boot()
  }, [moduleId]) // eslint-disable-line react-hooks/exhaustive-deps

  const lv = mod ? (LEVEL_MAP[mod.level] ?? LEVEL_MAP['senior']) : null
  const attemptsLeft = Math.max(0, 2 - attempts.count)

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Inter",system-ui,sans-serif;color:var(--ink);}
        .mp-shell{display:flex;min-height:100vh;background:var(--bg);}
        .mp-main{flex:1;min-width:0;overflow-x:hidden;}
        .mp-inner{max-width:1100px;margin:0 auto;padding:36px 40px 80px;}
        .mp-crumb{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mute);margin-bottom:28px;flex-wrap:wrap;}
        .mp-crumb a{color:var(--mute);text-decoration:none;transition:color .15s;}
        .mp-crumb a:hover{color:#C0392B;}
        .mp-crumb-sep{color:var(--line);}
        .mp-header{margin-bottom:32px;}
        .mp-eyebrow{font-size:11px;font-weight:700;letter-spacing:.18em;color:#C0392B;text-transform:uppercase;margin-bottom:10px;}
        .mp-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:32px;letter-spacing:-0.02em;color:var(--ink);margin-bottom:14px;}
        .mp-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .mp-columns{display:grid;grid-template-columns:1fr 320px;gap:28px;align-items:start;}
        .mp-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;box-shadow:0 2px 12px -4px rgba(13,13,13,.07);}
        .mp-section{margin-bottom:22px;}
        .mp-section-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin-bottom:12px;}
        .mp-desc{font-size:15px;color:var(--ink-2);line-height:1.7;}
        .mp-learn-item{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;font-size:14px;color:var(--ink-2);line-height:1.5;}
        .mp-check{color:#C0392B;flex-shrink:0;margin-top:2px;}
        .mp-divider{height:1px;background:var(--line-soft);margin:20px 0;}
        .mp-quiz-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--ink-2);margin-bottom:8px;}
        .mp-quiz-label{color:var(--mute);}
        .badge-pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;}
        .badge-green{background:#D1FAE5;color:#065F46;}
        .badge-yellow{background:#FFFBEB;color:#92400E;}
        .badge-red{background:#FEE2E2;color:#991B1B;}
        @media(max-width:900px){
          .mp-columns{grid-template-columns:1fr;}
          .mp-inner{padding:24px 20px 60px;}
        }
      `}</style>

      <div className="mp-shell">
        <DashboardSidebar activePage="leadership-path" userName={userName} userInitial={userInit} />

        <main className="mp-main">
          <div className="mp-inner">
            {/* Breadcrumb */}
            <div className="mp-crumb">
              <a href="/dashboard">Dashboard</a>
              <span className="mp-crumb-sep">/</span>
              <a href="/dashboard/leadership-path">Leadership Path</a>
              <span className="mp-crumb-sep">/</span>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {loading ? '…' : mod?.title}
              </span>
            </div>

            {/* Header */}
            <div className="mp-header">
              <div className="mp-eyebrow">
                Módulo {mod ? String(mod.order_index).padStart(2, '0') : '—'}
              </div>
              {loading
                ? <div style={{ marginBottom: 14 }}><Sk h={36} w="60%" /></div>
                : <h1 className="mp-title">{mod?.title}</h1>
              }
              <div className="mp-meta">
                {lv && (
                  <span style={{ padding: '4px 12px', borderRadius: 999, background: lv.bg, color: lv.color, fontSize: 12, fontWeight: 700, fontFamily: '"Satoshi",sans-serif' }}>
                    {lv.label}
                  </span>
                )}
                {mod && (
                  <span style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(192,57,43,0.1)', color: '#C0392B', fontSize: 12, fontWeight: 700, fontFamily: '"Satoshi",sans-serif' }}>
                    {mod.xp_reward} XP
                  </span>
                )}
                {mod?.duration_minutes && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--mute)' }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M6.5 3.5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    {mod.duration_minutes} minutos
                  </span>
                )}
              </div>
            </div>

            {/* Two-column layout */}
            <div className="mp-columns">
              {/* Left: Video */}
              <div>
                {loading
                  ? <div style={{ aspectRatio: '16/9', borderRadius: 14, background: 'var(--bg-2)' }} />
                  : userId && (
                    <VideoPlayer
                      videoUrl={mod?.video_url ?? ''}
                      moduleId={moduleId}
                      userId={userId}
                    />
                  )
                }
              </div>

              {/* Right: Info card */}
              <div className="mp-card">
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[80, 100, 60, 90, 70].map((w, i) => <Sk key={i} w={`${w}%`} />)}
                  </div>
                ) : (
                  <>
                    {/* Description */}
                    <div className="mp-section">
                      <div className="mp-section-title">Sobre este módulo</div>
                      <p className="mp-desc">{mod?.description}</p>
                    </div>

                    <div className="mp-divider" />

                    {/* Learning points */}
                    <div className="mp-section">
                      <div className="mp-section-title">Lo que aprenderás</div>
                      {LEARN_POINTS.map((pt, i) => (
                        <div key={i} className="mp-learn-item">
                          <svg className="mp-check" width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M2.5 7.5l3.5 3.5 6-6" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {pt}
                        </div>
                      ))}
                    </div>

                    <div className="mp-divider" />

                    {/* Quiz info */}
                    <div className="mp-section" style={{ marginBottom: 0 }}>
                      <div className="mp-section-title">Cuestionario</div>
                      <div className="mp-quiz-row">
                        <span className="mp-quiz-label">Preguntas</span>
                        <span style={{ fontWeight: 600 }}>{qCount}</span>
                      </div>
                      <div className="mp-quiz-row">
                        <span className="mp-quiz-label">Tipos</span>
                        <span style={{ fontSize: 12, color: 'var(--mute)' }}>Opción múltiple · V/F · Reflexión</span>
                      </div>
                      <div className="mp-quiz-row">
                        <span className="mp-quiz-label">Mínimo para aprobar</span>
                        <span style={{ fontWeight: 600 }}>70%</span>
                      </div>
                      {attempts.bestScore !== null && (
                        <div className="mp-quiz-row">
                          <span className="mp-quiz-label">Ãšltimo resultado</span>
                          <span className={`badge-pill ${attempts.bestScore >= 70 ? 'badge-green' : 'badge-red'}`}>
                            {attempts.bestScore}%
                          </span>
                        </div>
                      )}

                      <div style={{ marginTop: 16 }}>
                        {attemptsLeft === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEE2E2', borderRadius: 10 }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="6" stroke="#991B1B" strokeWidth="1.4"/>
                              <path d="M7 4v3M7 10h.01" stroke="#991B1B" strokeWidth="1.4" strokeLinecap="round"/>
                            </svg>
                            <span style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 600 }}>Has usado todos tus intentos</span>
                          </div>
                        ) : attemptsLeft === 1 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FFFBEB', borderRadius: 10 }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M7 1L13 12H1L7 1Z" stroke="#92400E" strokeWidth="1.4" strokeLinejoin="round"/>
                              <path d="M7 5.5v2.5M7 10h.01" stroke="#92400E" strokeWidth="1.4" strokeLinecap="round"/>
                            </svg>
                            <span style={{ fontSize: 12.5, color: '#92400E', fontWeight: 600 }}>Te queda 1 intento</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#D1FAE5', borderRadius: 10 }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="6" stroke="#065F46" strokeWidth="1.4"/>
                              <path d="M4 7l2.5 2.5L10 5" stroke="#065F46" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span style={{ fontSize: 12.5, color: '#065F46', fontWeight: 600 }}>2 intentos disponibles</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <ToastContainer />
    </>
  )
}
