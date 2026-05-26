'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DashboardSidebar from '@/components/DashboardSidebar'

interface ProfileData {
  id:           string
  full_name:    string
  avatar_url:   string | null
  school_name:  string
  school_level: string | null
  user_badges:  string[]
  total_xp:     number
  modules_completed: number
  approved_projects: number
}

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)',
      backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

const LEVEL_MAP: Record<string, { label: string; bg: string; color: string }> = {
  junior: { label: 'Junior Leader', bg: '#FEF3C7',             color: '#92400E' },
  senior: { label: 'Senior Leader', bg: 'rgba(192,57,43,0.1)', color: '#C0392B' },
}

export default function StudentProfilePage() {
  const { id: studentId } = useParams<{ id: string }>()
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)
  const [profile,     setProfile]     = useState<ProfileData | null>(null)
  const [viewerName,  setViewerName]  = useState('…')
  const [viewerInit,  setViewerInit]  = useState('L')

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    let cancelled = false

    async function boot() {
      // Auth gate — any logged-in user can view
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      // Viewer identity for the sidebar
      const { data: viewerProfile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      if (!cancelled) {
        const vn = viewerProfile?.full_name ?? user.email ?? 'Leader'
        setViewerName(vn)
        setViewerInit(vn.charAt(0).toUpperCase())
      }

      // Fetch target student profile
      const { data: sp } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, school_level, user_badges, school_id')
        .eq('id', studentId)
        .maybeSingle()

      if (cancelled) return
      if (!sp) { setNotFound(true); setLoading(false); return }

      // Parallel fetches
      const [
        { data: xpRows },
        { data: progressRows },
        { data: projectRows },
        schoolResult,
      ] = await Promise.all([
        supabase.from('xp_log').select('amount').eq('user_id', studentId),
        supabase.from('progress').select('id').eq('user_id', studentId).eq('completed', true),
        supabase.from('projects').select('id').eq('user_id', studentId).eq('status', 'approved'),
        sp.school_id
          ? supabase.from('schools').select('name').eq('id', sp.school_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (cancelled) return

      const total_xp = xpRows?.reduce((s: number, r: { amount: number | null }) => s + (r.amount ?? 0), 0) ?? 0

      setProfile({
        id:                sp.id,
        full_name:         sp.full_name ?? '—',
        avatar_url:        sp.avatar_url ?? null,
        school_name:       (schoolResult.data as { name: string } | null)?.name ?? '—',
        school_level:      sp.school_level ?? null,
        user_badges:       Array.isArray(sp.user_badges) ? sp.user_badges : [],
        total_xp,
        modules_completed: progressRows?.length ?? 0,
        approved_projects: projectRows?.length ?? 0,
      })
      setLoading(false)
    }

    boot()
    return () => { cancelled = true }
  }, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const lv = profile?.school_level ? (LEVEL_MAP[profile.school_level] ?? LEVEL_MAP['senior']) : null

  return (
    <>
      <style>{`
                @keyframes
        *{box-sizing:border-box;margin:0;padding:0;}
        .sp-layout{display:flex;height:100dvh;overflow:hidden;width:100%;background:var(--bg);}
        .sp-main{flex:1;overflow:auto;min-width:0;}
        .sp-inner{max-width:760px;margin:0 auto;padding:36px 40px 80px;}
        .sp-crumb{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mute);margin-bottom:28px;}
        .sp-crumb a{color:var(--mute);text-decoration:none;transition:color .15s;cursor:pointer;}
        .sp-crumb a:hover{color:#C0392B;}
        .sp-crumb-sep{color:var(--line);}
        .sp-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:20px;padding:36px;box-shadow:0 2px 16px -6px rgba(13,13,13,.08);margin-bottom:20px;}
        .sp-avatar{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#C0392B 0%,#8B1A1A 100%);color:#fff;font-family:"Satoshi",sans-serif;font-weight:900;font-size:30px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;}
        .sp-avatar img{width:100%;height:100%;object-fit:cover;}
        .sp-name{font-family:"Satoshi",sans-serif;font-weight:900;font-size:26px;letter-spacing:-.02em;color:var(--ink);margin-bottom:6px;}
        .sp-school{font-size:14px;color:var(--mute);margin-bottom:10px;}
        .sp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:8px;}
        .sp-stat{background:var(--bg-2,#EFECE6);border-radius:14px;padding:20px;text-align:center;}
        .sp-stat-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:30px;color:var(--ink);line-height:1;}
        .sp-stat-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);margin-top:6px;}
        .sp-section-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);margin-bottom:16px;}
        .sp-badge{display:inline-flex;align-items:center;padding:5px 14px;border-radius:999px;font-size:12.5px;font-weight:700;background:rgba(192,57,43,.1);color:#C0392B;margin-right:8px;margin-bottom:8px;font-family:"Satoshi",sans-serif;}
        .sp-empty-badge{font-size:13.5px;color:var(--mute);font-style:italic;}
        @media(max-width:700px){
          .sp-inner{padding:24px 20px 60px;}
          .sp-stats{grid-template-columns:repeat(3,1fr);gap:10px;}
        }
      `}</style>

      <div className="sp-layout">
        <DashboardSidebar activePage="team-hub" userName={viewerName} userInitial={viewerInit} />

        <main className="sp-main">
          <div className="sp-inner">
            {/* Breadcrumb */}
            <nav className="sp-crumb" aria-label="Breadcrumb">
              <a onClick={() => router.push('/dashboard')}>Dashboard</a>
              <span className="sp-crumb-sep">›</span>
              <a onClick={() => router.push('/dashboard/team-hub')}>Team Hub</a>
              <span className="sp-crumb-sep">›</span>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {loading ? '…' : profile?.full_name ?? 'Perfil'}
              </span>
            </nav>

            {loading ? (
              <div className="sp-card">
                <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
                  <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(13,13,13,.07)', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                    <Sk w="55%" h={24} r={6} />
                    <Sk w="40%" h={14} r={5} />
                    <Sk w="120px" h={26} r={999} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                  {[0,1,2].map(i => <div key={i} style={{ height: 88, borderRadius: 14, background: 'rgba(13,13,13,.05)' }} />)}
                </div>
              </div>
            ) : notFound ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>👤</div>
                <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
                  Perfil no encontrado
                </div>
                <p style={{ fontSize: 14, color: 'var(--mute)', marginBottom: 24 }}>
                  Este estudiante no existe o no tienes acceso.
                </p>
                <button
                  onClick={() => router.push('/dashboard/team-hub')}
                  style={{ padding: '10px 24px', borderRadius: 999, background: '#C0392B', color: '#fff', border: 'none', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  Volver al Team Hub
                </button>
              </div>
            ) : profile ? (
              <>
                {/* Profile card */}
                <div className="sp-card">
                  <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap' }}>
                    <div className="sp-avatar">
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt={profile.full_name} /> // eslint-disable-line @next/next/no-img-element
                        : getInitials(profile.full_name)
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sp-name">{profile.full_name}</div>
                      <div className="sp-school">{profile.school_name}</div>
                      {lv && (
                        <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 999, background: lv.bg, color: lv.color, fontSize: 12.5, fontWeight: 700, fontFamily: '"Satoshi",sans-serif' }}>
                          {lv.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="sp-stats">
                    <div className="sp-stat">
                      <div className="sp-stat-num">{profile.total_xp.toLocaleString('es-CO')}</div>
                      <div className="sp-stat-label">XP Total</div>
                    </div>
                    <div className="sp-stat">
                      <div className="sp-stat-num">{profile.modules_completed}</div>
                      <div className="sp-stat-label">Módulos</div>
                    </div>
                    <div className="sp-stat">
                      <div className="sp-stat-num">{profile.approved_projects}</div>
                      <div className="sp-stat-label">Proyectos</div>
                    </div>
                  </div>
                </div>

                {/* Badges card */}
                <div className="sp-card">
                  <div className="sp-section-title">Insignias</div>
                  {profile.user_badges.length > 0 ? (
                    <div>
                      {profile.user_badges.map((badge, i) => (
                        <span key={i} className="sp-badge">{badge}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="sp-empty-badge">Este estudiante aún no tiene insignias.</div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </>
  )
}
