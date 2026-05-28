'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { m } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import AppSidebar from '@/components/AppSidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Module {
  id: string
  title: string
  description: string | null
  xp_reward: number
  order_index: number
  duration_minutes: number | null
  status: 'published' | string
}

interface StudentModule extends Module {
  state: 'completed' | 'active' | 'locked'
  best_score: number | null
  attempts: number
}

interface UserInfo {
  name: string
  initial: string
  school: string
  unread: number
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M7 1l1.8 4H13l-3.4 2.5 1.3 4L7 9 3.1 11.5l1.3-4L1 5h4.2L7 1Z" fill="currentColor"/>
  </svg>
)

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({ mod, idx, onStart }: { mod: StudentModule; idx: number; onStart: () => void }) {
  const isCompleted = mod.state === 'completed'
  const isActive    = mod.state === 'active'
  const isLocked    = mod.state === 'locked'

  const stateColor  = isCompleted ? 'var(--success-text,#065F46)' : isActive ? 'var(--accent)' : 'var(--mute)'
  const stateBg     = isCompleted ? 'var(--success-bg,#D1FAE5)'   : isActive ? 'rgba(192,57,43,.07)' : 'var(--bg-2)'
  const stateLabel  = isCompleted ? 'Completado' : isActive ? 'Disponible' : 'Bloqueado'

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: idx * 0.06 }}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border,rgba(13,13,13,.08))',
        borderRadius: 16,
        padding: '22px 24px',
        display: 'flex',
        gap: 18,
        alignItems: 'flex-start',
        opacity: isLocked ? 0.6 : 1,
        cursor: isLocked ? 'default' : 'pointer',
      }}
      whileHover={isLocked ? {} : { y: -2 }}
      onClick={isLocked ? undefined : onStart}
    >
      {/* Order number */}
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: isCompleted ? 'var(--accent)' : isActive ? 'rgba(192,57,43,.08)' : 'var(--bg-2)',
        border: isActive ? '2px solid var(--accent)' : '1px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isCompleted ? '#fff' : isActive ? 'var(--accent)' : 'var(--mute)',
      }}>
        {isCompleted
          ? <CheckIcon />
          : isLocked
            ? <LockIcon />
            : <span style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 15, fontWeight: 700 }}>
                {String(mod.order_index).padStart(2, '0')}
              </span>
        }
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ink)', lineHeight: 1.3 }}>
            {mod.title}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
            background: stateBg, color: stateColor,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {isCompleted && <CheckIcon />}
            {isLocked && <LockIcon />}
            {stateLabel}
          </span>
        </div>

        {mod.description && (
          <p style={{ fontSize: 13.5, color: 'var(--mute)', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
            {mod.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
            <StarIcon /> {mod.xp_reward} XP
          </span>
          {mod.duration_minutes && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--mute)' }}>
              <ClockIcon /> {mod.duration_minutes} min
            </span>
          )}
          {isCompleted && mod.best_score != null && (
            <span style={{ fontSize: 12, color: 'var(--success-text,#065F46)', fontWeight: 600 }}>
              Mejor: {mod.best_score}%
            </span>
          )}
          {isCompleted && mod.attempts > 0 && (
            <span style={{ fontSize: 12, color: 'var(--mute)' }}>
              {mod.attempts} intento{mod.attempts !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      {!isLocked && (
        <div style={{ flexShrink: 0 }}>
          <div style={{
            padding: '9px 18px',
            background: isCompleted ? 'transparent' : 'var(--accent)',
            border: isCompleted ? '1.5px solid var(--card-border,rgba(13,13,13,.12))' : 'none',
            borderRadius: 999,
            fontFamily: '"Satoshi",sans-serif',
            fontWeight: 700, fontSize: 13,
            color: isCompleted ? 'var(--ink)' : '#fff',
            whiteSpace: 'nowrap',
          }}>
            {isCompleted ? 'Revisar' : 'Comenzar →'}
          </div>
        </div>
      )}
    </m.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModulesListPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,  setLoading]  = useState(true)
  const [modules,  setModules]  = useState<StudentModule[]>([])
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '…', initial: 'L', school: '', unread: 0 })

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current

    async function load() {
      if (MOCK_MODE) {
        const raw = MOCK.modules as { id:string; title:string; order:number; xpReward:number; duration:string; status:string }[]
        const mockStudent = MOCK.students?.find((s: { id: string }) => s.id === 's1') as { modules?: number } | undefined
        const completed = mockStudent?.modules ?? 6
        const built: StudentModule[] = raw.map((m, i) => ({
          id:               m.id,
          title:            m.title,
          description:      null,
          xp_reward:        m.xpReward,
          order_index:      m.order,
          duration_minutes: parseInt(m.duration) || null,
          status:           m.status,
          state:            i < completed ? 'completed' : i === completed ? 'active' : 'locked',
          best_score:       i < completed ? 85 + Math.floor(Math.random() * 15) : null,
          attempts:         i < completed ? 1 : 0,
        }))
        setModules(built)
        setUserInfo({ name: MOCK.currentUser?.name ?? 'Valentina Torres', initial: 'V', school: 'IE Técnica María Inmaculada', unread: 0 })
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, school_id, school_level')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile) { router.push('/login'); return }

      const level = (profile as { school_level?: string | null })?.school_level ?? 'senior'

      const { data: schoolRow } = profile.school_id
        ? await supabase.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
        : { data: null }

      const { data: rawMods } = await supabase
        .from('modules')
        .select('id, title, description, xp_reward, order_index, duration_minutes, status')
        .eq('status', 'published')
        .eq('level', level)
        .order('order_index')

      const moduleIds = (rawMods ?? []).map((m: { id: string }) => m.id)

      const [{ data: prog }, { data: attRows }] = await Promise.all([
        supabase.from('progress').select('module_id, completed').eq('user_id', user.id),
        moduleIds.length
          ? supabase.from('quiz_attempts').select('module_id, score, passed').eq('user_id', user.id).in('module_id', moduleIds)
          : Promise.resolve({ data: [] as { module_id:string; score:number|null; passed:boolean }[] }),
      ])

      const completedIds = new Set(
        (prog ?? [])
          .filter((p: { completed: boolean | null }) => p.completed)
          .map((p: { module_id: string }) => p.module_id)
      )

      const attMap: Record<string, { best: number | null; count: number }> = {}
      for (const r of attRows ?? []) {
        if (!attMap[r.module_id]) attMap[r.module_id] = { best: null, count: 0 }
        attMap[r.module_id].count++
        if (r.score != null && (attMap[r.module_id].best === null || r.score > attMap[r.module_id].best!)) {
          attMap[r.module_id].best = r.score
        }
      }

      let foundActive = false
      const built: StudentModule[] = (rawMods ?? []).map((m: Module) => {
        const att = attMap[m.id]
        if (completedIds.has(m.id)) {
          return { ...m, state: 'completed', best_score: att?.best ?? null, attempts: att?.count ?? 0 }
        }
        if (!foundActive) {
          foundActive = true
          return { ...m, state: 'active', best_score: null, attempts: att?.count ?? 0 }
        }
        return { ...m, state: 'locked', best_score: null, attempts: 0 }
      })

      const displayName = (profile as { display_name?: string | null })?.display_name ?? '…'
      setModules(built)
      setUserInfo({
        name:    displayName,
        initial: displayName[0]?.toUpperCase() ?? 'L',
        school:  (schoolRow as { name?: string } | null)?.name ?? '',
        unread:  0,
      })
      setLoading(false)
    }

    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const completedCount = modules.filter(m => m.state === 'completed').length
  const totalXP        = modules.filter(m => m.state === 'completed').reduce((s, m) => s + m.xp_reward, 0)

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Satoshi",sans-serif;color:var(--ink);}
        .mod-layout{display:flex;min-height:100dvh;}
        .mod-main{flex:1;display:flex;flex-direction:column;min-width:0;}
        .mod-header{position:sticky;top:0;z-index:10;background:var(--bg);backdrop-filter:blur(16px);border-bottom:1px solid var(--line);padding:20px 40px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
        .mod-header h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:22px;letter-spacing:-.02em;color:var(--ink);}
        .mod-header p{font-size:13px;color:var(--mute);margin-top:3px;}
        .mod-content{padding:32px 40px 80px;max-width:860px;width:100%;}
        .mod-stats{display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap;}
        .mod-stat{background:var(--card-bg);border:1px solid var(--card-border,rgba(13,13,13,.08));border-radius:12px;padding:16px 20px;min-width:120px;}
        .mod-stat__num{font-family:var(--font-mono,monospace);font-size:28px;font-weight:700;color:var(--ink);line-height:1;}
        .mod-stat__label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--mute);margin-top:4px;font-weight:600;}
        .mod-grid{display:flex;flex-direction:column;gap:12px;}
        @media(max-width:768px){
          .mod-header{padding:16px 20px;}
          .mod-content{padding:24px 20px 60px;}
        }
      `}</style>

      <div className="mod-layout">
        <AppSidebar
          role="student"
          userName={userInfo.name}
          userInitial={userInfo.initial}
          schoolName={userInfo.school}
          unreadAnnouncements={userInfo.unread}
        />

        <main className="mod-main">
          {/* Header */}
          <div className="mod-header">
            <div>
              <h1>Módulos</h1>
              <p>Tu ruta de aprendizaje — completa cada módulo para avanzar</p>
            </div>
            {!loading && (
              <m.button
                type="button"
                onClick={() => router.push('/dashboard/leadership-path')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px',
                  background: 'transparent',
                  border: '1.5px solid var(--card-border,rgba(13,13,13,.12))',
                  borderRadius: 999,
                  fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 13,
                  color: 'var(--ink)', cursor: 'pointer',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                Ver en mapa →
              </m.button>
            )}
          </div>

          <div className="mod-content">
            {/* Stats summary */}
            {!loading && (
              <m.div
                className="mod-stats"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              >
                <div className="mod-stat">
                  <div className="mod-stat__num">{completedCount}/{modules.length}</div>
                  <div className="mod-stat__label">Completados</div>
                </div>
                <div className="mod-stat">
                  <div className="mod-stat__num" style={{ color: 'var(--accent)' }}>{totalXP.toLocaleString()}</div>
                  <div className="mod-stat__label">XP ganados</div>
                </div>
                <div className="mod-stat">
                  <div className="mod-stat__num">{modules.length - completedCount}</div>
                  <div className="mod-stat__label">Restantes</div>
                </div>
              </m.div>
            )}

            {/* Modules list */}
            <div className="mod-grid">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: '22px 24px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                    <Sk w={48} h={48} r={12} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Sk w="60%" h={18} />
                      <Sk w="90%" h={14} />
                      <Sk w="40%" h={12} />
                    </div>
                  </div>
                ))
              ) : modules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(192,57,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>Próximamente</p>
                  <p style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.6, maxWidth: 320 }}>
                    Los módulos de tu programa se publicarán pronto. ¡Mantente atento!
                  </p>
                </div>
              ) : (
                modules.map((mod, idx) => (
                  <ModuleCard
                    key={mod.id}
                    mod={mod}
                    idx={idx}
                    onStart={() => router.push(`/dashboard/modules/${mod.id}`)}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
