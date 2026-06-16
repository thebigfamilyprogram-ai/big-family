'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { m, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULE_PILAR: Record<number, string> = {
  1: 'Yo', 2: 'Norte', 3: 'Vínculo',
  4: 'Vínculo', 5: 'Acción', 6: 'Acción', 7: 'Legado',
}
const PILLAR_MODS: Record<string, number[]> = {
  Yo: [1], Norte: [2], Vínculo: [3, 4], Acción: [4, 5, 6], Legado: [7],
}
const PILLARS = ['Yo', 'Norte', 'Vínculo', 'Acción', 'Legado'] as const

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

interface LeaderProfile {
  arquetipo:        string
  fortalezas:       string[]
  areasCrecimiento: string[]
  big_five:         { O: number; C: number; E: number; A: number; ES: number }
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

// ─── Pentagon SVG (right panel) ───────────────────────────────────────────────

function PanelPentagon({ bf, fortalezas, crec }: {
  bf: { O: number; C: number; E: number; A: number; ES: number }
  fortalezas: string[]
  crec:       string[]
}) {
  const CX = 80, CY = 80, R = 55
  const VERTS = [
    { key: 'Yo',      angle: -90,  score: bf.C  },
    { key: 'Norte',   angle: -18,  score: bf.O  },
    { key: 'Acción',  angle:  54,  score: bf.E  },
    { key: 'Legado',  angle:  126, score: bf.ES },
    { key: 'Vínculo', angle:  198, score: bf.A  },
  ]
  const rad = (d: number) => d * Math.PI / 180
  const pt  = (a: number, r: number) => `${CX + r * Math.cos(rad(a))},${CY + r * Math.sin(rad(a))}`
  const refPts  = VERTS.map(v => pt(v.angle, R)).join(' ')
  const profPts = VERTS.map(v => pt(v.angle, (v.score / 100) * R)).join(' ')
  return (
    <svg viewBox="0 0 160 160" width={140} height={140} aria-hidden="true">
      {VERTS.map(v => {
        const [x2, y2] = [CX + R * Math.cos(rad(v.angle)), CY + R * Math.sin(rad(v.angle))]
        return <line key={v.key} x1={CX} y1={CY} x2={x2} y2={y2} stroke="var(--line)" strokeWidth={0.8} />
      })}
      <polygon points={refPts} fill="none" stroke="var(--bg-2)" strokeWidth={1.5} />
      <polygon points={profPts} fill="rgba(192,57,43,0.12)" stroke="#C0392B" strokeWidth={1.5} />
      {VERTS.map(v => {
        const cx = CX + (v.score / 100) * R * Math.cos(rad(v.angle))
        const cy = CY + (v.score / 100) * R * Math.sin(rad(v.angle))
        return (
          <circle key={v.key} cx={cx} cy={cy} r={3.5}
            fill={fortalezas.includes(v.key) ? 'var(--accent-teal,#0F7B6C)' : crec.includes(v.key) ? '#C0392B' : 'var(--bg-2)'} />
        )
      })}
    </svg>
  )
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({ mod, idx, onStart }: { mod: StudentModule; idx: number; onStart: () => void }) {
  const t = useTranslations('dashboard.modules')
  const tm = useTranslations('dashboard.modulesPage')
  const isCompleted = mod.state === 'completed'
  const isActive    = mod.state === 'active'
  const isLocked    = mod.state === 'locked'
  const stateColor  = isCompleted ? 'var(--success-text,#065F46)' : isActive ? 'var(--accent)' : 'var(--mute)'
  const stateBg     = isCompleted ? 'var(--success-bg,#D1FAE5)'   : isActive ? 'rgba(192,57,43,.07)' : 'var(--bg-2)'
  const stateLabel  = isCompleted ? t('completed') : isActive ? t('available') : t('locked')

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: idx * 0.06 }}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border,rgba(13,13,13,.08))',
        borderRadius: 16, padding: '22px 24px',
        display: 'flex', gap: 18, alignItems: 'flex-start',
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
        {isCompleted ? <CheckIcon /> : isLocked ? <LockIcon /> : (
          <span style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 15, fontWeight: 700 }}>
            {String(mod.order_index).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ink)', lineHeight: 1.3 }}>
            {mod.title}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: stateBg, color: stateColor, display: 'flex', alignItems: 'center', gap: 4 }}>
            {isCompleted && <CheckIcon />}{isLocked && <LockIcon />}{stateLabel}
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
              {tm('bestScore', { score: mod.best_score })}
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
            fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13,
            color: isCompleted ? 'var(--ink)' : '#fff', whiteSpace: 'nowrap',
          }}>
            {isCompleted ? t('reviewBtn') : tm('startBtn')}
          </div>
        </div>
      )}
    </m.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModulesListPage() {
  const router  = useRouter()
  const pref    = useReducedMotion()
  const sbRef   = useRef<ReturnType<typeof createClient> | null>(null)
  const t       = useTranslations('dashboard.modulesPage')

  const [loading,       setLoading]       = useState(true)
  const [modules,       setModules]       = useState<StudentModule[]>([])
  const [userInfo,      setUserInfo]      = useState<UserInfo>({ name: '…', initial: 'L', school: '', unread: 0 })
  const [leaderProfile, setLeaderProfile] = useState<LeaderProfile | null>(null)
  const [streak,        setStreak]        = useState(0)
  const [totalXPFull,   setTotalXPFull]   = useState(0)

  useEffect(() => {
    if (!sbRef.current) sbRef.current = createClient()
    const supabase = sbRef.current

    async function load() {
      if (MOCK_MODE) {
        const raw = MOCK.modules as { id:string; title:string; order:number; xpReward:number; duration:string; status:string }[]
        const mockStudent = MOCK.students?.find((s: { id: string }) => s.id === 's1') as { modules?: number; xp?: number; streak?: number } | undefined
        const completed = mockStudent?.modules ?? 6
        const built: StudentModule[] = raw.map((m, i) => ({
          id: m.id, title: m.title, description: null,
          xp_reward: m.xpReward, order_index: m.order,
          duration_minutes: parseInt(m.duration) || null, status: m.status,
          state:      i < completed ? 'completed' : i === completed ? 'active' : 'locked',
          best_score: i < completed ? 85 : null,
          attempts:   i < completed ? 1 : 0,
        }))
        setModules(built)
        setUserInfo({ name: MOCK.currentUser?.name ?? 'Valentina Torres', initial: 'V', school: 'IE Técnica María Inmaculada', unread: 0 })
        setLeaderProfile({
          arquetipo:        'Líder Visionaria',
          fortalezas:       ['Norte', 'Acción'],
          areasCrecimiento: ['Yo', 'Vínculo'],
          big_five:         { O: 85, C: 42, E: 78, A: 38, ES: 65 },
        })
        setStreak(mockStudent?.streak ?? 7)
        setTotalXPFull(mockStudent?.xp ?? 1840)
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, school_id, school_level, leadership_profile')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile) { router.push('/login'); return }

      const level = (profile as { school_level?: string | null })?.school_level ?? 'senior'

      const [
        { data: schoolRow },
        { data: rawMods },
        { data: xpRows },
        { data: progDates },
      ] = await Promise.all([
        profile.school_id
          ? supabase.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('modules').select('id,title,description,xp_reward,order_index,duration_minutes,status').eq('status', 'published').eq('level', level).order('order_index'),
        supabase.from('xp_log').select('amount').eq('user_id', user.id),
        supabase.from('progress').select('completed_at').eq('user_id', user.id).eq('completed', true),
      ])

      const moduleIds = (rawMods ?? []).map((m: { id: string }) => m.id)
      const [{ data: prog }, { data: attRows }] = await Promise.all([
        supabase.from('progress').select('module_id, completed').eq('user_id', user.id),
        moduleIds.length
          ? supabase.from('quiz_attempts').select('module_id, score, passed').eq('user_id', user.id).in('module_id', moduleIds)
          : Promise.resolve({ data: [] as { module_id:string; score:number|null; passed:boolean }[] }),
      ])

      const completedIds = new Set((prog ?? []).filter((p: { completed: boolean|null }) => p.completed).map((p: { module_id: string }) => p.module_id))
      const attMap: Record<string, { best: number | null; count: number }> = {}
      for (const r of attRows ?? []) {
        if (!attMap[r.module_id]) attMap[r.module_id] = { best: null, count: 0 }
        attMap[r.module_id].count++
        if (r.score != null && (attMap[r.module_id].best === null || r.score > attMap[r.module_id].best!)) attMap[r.module_id].best = r.score
      }

      let foundActive = false
      const built: StudentModule[] = (rawMods ?? []).map((m: Module) => {
        const att = attMap[m.id]
        if (completedIds.has(m.id)) return { ...m, state: 'completed', best_score: att?.best ?? null, attempts: att?.count ?? 0 }
        if (!foundActive) { foundActive = true; return { ...m, state: 'active', best_score: null, attempts: att?.count ?? 0 } }
        return { ...m, state: 'locked', best_score: null, attempts: 0 }
      })

      // Streak calculation
      const DAY = 86_400_000
      const dates = (progDates ?? []).map((r: { completed_at: string|null }) => r.completed_at).filter(Boolean) as string[]
      const unique = [...new Set(dates.map(d => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt.getTime() }))].sort((a,b) => b-a)
      let streakDays = 0
      if (unique.length) {
        const now = new Date(); now.setHours(0,0,0,0)
        let expected = now.getTime()
        for (const ts of unique) {
          if (ts >= expected - 1000 && ts <= expected + 1000) { streakDays++; expected -= DAY }
          else if (ts < expected - DAY) break
        }
      }

      // Leadership profile
      const lp = profile.leadership_profile as { arquetipo?: string; fortalezas?: string[]; areas_crecimiento?: string[]; big_five?: { O:number; C:number; E:number; A:number; N:number; ES:number } } | null
      if (lp?.arquetipo && lp?.big_five) {
        setLeaderProfile({
          arquetipo:        lp.arquetipo,
          fortalezas:       lp.fortalezas ?? [],
          areasCrecimiento: lp.areas_crecimiento ?? [],
          big_five:         { O: lp.big_five.O, C: lp.big_five.C, E: lp.big_five.E, A: lp.big_five.A, ES: lp.big_five.ES },
        })
      }

      const xpTotal = (xpRows ?? []).reduce((s: number, r: { amount: number|null }) => s + (r.amount ?? 0), 0)
      setTotalXPFull(xpTotal)
      setStreak(streakDays)
      setModules(built)
      setUserInfo({
        name:    (profile as { display_name?: string|null })?.display_name ?? '…',
        initial: (profile as { display_name?: string|null })?.display_name?.[0]?.toUpperCase() ?? 'L',
        school:  (schoolRow as { name?: string }|null)?.name ?? '',
        unread:  0,
      })
      setLoading(false)
    }

    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const completedCount = modules.filter(m => m.state === 'completed').length

  // ── Derived panel data ───────────────────────────────────────────────────
  const pillarProgress = PILLARS.map(pillar => {
    const modsInPillar   = PILLAR_MODS[pillar]
    const total          = modules.filter(m => modsInPillar.includes(m.order_index)).length
    const done           = modules.filter(m => modsInPillar.includes(m.order_index) && m.state === 'completed').length
    const pct            = total > 0 ? Math.round(done / total * 100) : 0
    const isStrength     = leaderProfile?.fortalezas.includes(pillar) ?? false
    const isGrowth       = leaderProfile?.areasCrecimiento.includes(pillar) ?? false
    return { pillar, pct, total, done, isStrength, isGrowth }
  })

  const recommendedModule = (() => {
    if (!leaderProfile) return modules.find(m => m.state === 'active') ?? null
    for (const area of leaderProfile.areasCrecimiento) {
      const pillarMods = PILLAR_MODS[area] ?? []
      const mod = modules.find(m => pillarMods.includes(m.order_index) && m.state !== 'completed')
      if (mod) return mod
    }
    return modules.find(m => m.state === 'active') ?? null
  })()

  const allDone = modules.length > 0 && completedCount === modules.length

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Satoshi",sans-serif;color:var(--ink);}

        /* flex:1 from layout, column with scrollable body */
        .mod-main{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;}

        /* sticky header — never scrolls */
        .mod-header{position:sticky;top:0;z-index:10;background:var(--bg);backdrop-filter:blur(16px);border-bottom:1px solid var(--line);padding:20px 40px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;flex-shrink:0;}
        .mod-header h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:22px;letter-spacing:-.02em;color:var(--ink);}
        .mod-header p{font-size:13px;color:var(--mute);margin-top:3px;}

        /* scrollable body — 2-column grid */
        .mod-body{flex:1;overflow-y:auto;display:grid;grid-template-columns:1fr 320px;gap:32px;padding:32px 40px 80px;align-items:start;}

        /* left column */
        .mod-left{min-width:0;}
        .mod-stats{display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap;}
        .mod-stat{background:var(--card-bg);border:1px solid var(--card-border,rgba(13,13,13,.08));border-radius:12px;padding:16px 20px;min-width:110px;}
        .mod-stat__num{font-family:var(--font-mono,monospace);font-size:28px;font-weight:700;color:var(--ink);line-height:1;}
        .mod-stat__label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--mute);margin-top:4px;font-weight:600;}
        .mod-grid{display:flex;flex-direction:column;gap:12px;}

        /* right panel */
        .mod-panel{position:sticky;top:24px;background:var(--card-bg);border:1px solid var(--card-border,rgba(13,13,13,.08));border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:20px;}
        .mod-panel__sep{height:1px;background:var(--line);flex-shrink:0;}
        .panel-label{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);margin-bottom:12px;}
        .panel-pill{padding:3px 9px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;}
        .panel-pill-str{background:rgba(15,123,108,.1);color:var(--accent-teal,#0F7B6C);border:1px solid rgba(15,123,108,.2);}
        .panel-pill-crec{background:rgba(192,57,43,.08);color:#C0392B;border:1px solid rgba(192,57,43,.2);}
        .panel-stat__num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:1.4rem;color:#C0392B;font-variant-numeric:tabular-nums;line-height:1;}
        .panel-stat__lbl{font-family:"Satoshi",sans-serif;font-size:11px;color:var(--mute);margin-top:2px;}

        /* responsive */
        @media(max-width:1024px){
          .mod-body{grid-template-columns:1fr;}
          .mod-panel{position:static;order:-1;}
        }
        @media(max-width:768px){
          .mod-header{padding:16px 20px;}
          .mod-body{padding:20px 20px 60px;gap:20px;}
        }
      `}</style>

      <main className="mod-main">

        {/* ── Header ── */}
        <div className="mod-header">
          <div>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          {!loading && (
            <m.button
              type="button"
              onClick={() => router.push('/dashboard/leadership-path')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'transparent', border: '1.5px solid var(--card-border,rgba(13,13,13,.12))', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--ink)', cursor: 'pointer' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {t('viewMapBtn')}
            </m.button>
          )}
        </div>

        {/* ── Scrollable body — 2 columns ── */}
        <div className="mod-body">

          {/* ── Left: module list ── */}
          <div className="mod-left">
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
                  <div className="mod-stat__label">{t('stats.completed')}</div>
                </div>
                <div className="mod-stat">
                  <div className="mod-stat__num" style={{ color: 'var(--accent)' }}>{totalXPFull.toLocaleString()}</div>
                  <div className="mod-stat__label">{t('stats.xpEarned')}</div>
                </div>
                <div className="mod-stat">
                  <div className="mod-stat__num">{modules.length - completedCount}</div>
                  <div className="mod-stat__label">{t('stats.remaining')}</div>
                </div>
              </m.div>
            )}

            {/* Module list */}
            <div className="mod-grid">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: '22px 24px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                    <Sk w={48} h={48} r={12} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Sk w="60%" h={18} /><Sk w="90%" h={14} /><Sk w="40%" h={12} />
                    </div>
                  </div>
                ))
              ) : modules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(192,57,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>{t('emptyState.title')}</p>
                  <p style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.6, maxWidth: 320 }}>{t('emptyState.body')}</p>
                </div>
              ) : (
                modules.map((mod, idx) => (
                  <ModuleCard key={mod.id} mod={mod} idx={idx} onStart={() => router.push(`/dashboard/modules/${mod.id}`)} />
                ))
              )}
            </div>
          </div>

          {/* ── Right panel ── */}
          <m.div
            className="mod-panel"
            initial={pref ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26, duration: 0.4 }}
          >
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Sk w={140} h={140} r={999} />
                <Sk w="60%" h={14} /><Sk w="100%" h={10} /><Sk w="100%" h={10} /><Sk w="80%" h={10} />
              </div>
            ) : leaderProfile ? (
              <>
                {/* Bloque 1 — Perfil de líder */}
                <div>
                  <div className="panel-label">{t('panel.leaderProfile')}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                    <PanelPentagon bf={leaderProfile.big_five} fortalezas={leaderProfile.fortalezas} crec={leaderProfile.areasCrecimiento} />
                  </div>
                  <p style={{ fontFamily: '"Instrument Serif",serif', fontStyle: 'italic', fontSize: '1rem', color: '#C0392B', textAlign: 'center', marginBottom: 10 }}>
                    {leaderProfile.arquetipo}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
                    {leaderProfile.fortalezas.map(f => <span key={f} className="panel-pill panel-pill-str">{f} ↑</span>)}
                    {leaderProfile.areasCrecimiento.map(a => <span key={a} className="panel-pill panel-pill-crec">{a} ↓</span>)}
                  </div>
                </div>

                <div className="mod-panel__sep" />

                {/* Bloque 2 — Progreso por pilar */}
                <div>
                  <div className="panel-label">{t('panel.pillarProgress')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pillarProgress.map(({ pillar, pct, isStrength, isGrowth }) => (
                      <div key={pillar}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 12, fontWeight: 600, color: isStrength ? 'var(--accent-teal,#0F7B6C)' : isGrowth ? '#C0392B' : 'var(--ink)' }}>
                            {pillar}
                          </span>
                          <span style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 11, color: 'var(--mute)', fontVariantNumeric: 'tabular-nums' }}>
                            {pct}%
                          </span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 999,
                            width: `${pct}%`,
                            background: isStrength ? 'var(--accent-teal,#0F7B6C)' : isGrowth ? '#C0392B' : 'var(--mute)',
                            transition: 'width .5s cubic-bezier(.4,0,.2,1)',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mod-panel__sep" />

                {/* Bloque 3 — Recomendado */}
                <div>
                  <div className="panel-label">{t('panel.recommended')}</div>
                  {allDone ? (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--accent-teal,#0F7B6C)', marginBottom: 6 }}>
                        {t('allDone.title')}
                      </p>
                      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 12, color: 'var(--mute)', lineHeight: 1.5, marginBottom: 10 }}>
                        {t('allDone.body')}
                      </p>
                      <button
                        onClick={() => router.push('/certificacion')}
                        style={{ padding: '8px 16px', borderRadius: 999, background: '#C0392B', border: 'none', fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 12, color: '#fff', cursor: 'pointer' }}
                      >
                        {t('allDone.cta')}
                      </button>
                    </div>
                  ) : recommendedModule ? (
                    <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: '14px 14px 12px' }}>
                      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#C0392B', marginBottom: 4 }}>
                        {MODULE_PILAR[recommendedModule.order_index] ?? '—'}
                      </p>
                      <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>
                        {recommendedModule.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#C0392B', fontWeight: 600 }}>
                          <StarIcon /> {recommendedModule.xp_reward} XP
                        </span>
                        <button
                          onClick={() => router.push(`/dashboard/modules/${recommendedModule.id}`)}
                          style={{ padding: '7px 14px', borderRadius: 999, background: '#C0392B', border: 'none', fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 12, color: '#fff', cursor: 'pointer' }}
                        >
                          {t('recommendedCta')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 13, color: 'var(--mute)' }}>{t('noRecommended')}</p>
                  )}
                </div>

                <div className="mod-panel__sep" />

                {/* Bloque 4 — Stats rápidos */}
                <div>
                  <div className="panel-label">{t('panel.summary')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { num: totalXPFull.toLocaleString('es-CO'), lbl: t('summaryLabels.xpTotal') },
                      { num: `${completedCount}`, lbl: t('summaryLabels.modules') },
                      { num: `${streak}`, lbl: t('summaryLabels.streak') },
                    ].map(({ num, lbl }) => (
                      <div key={lbl} style={{ textAlign: 'center', padding: '10px 6px', background: 'var(--bg-2)', borderRadius: 10 }}>
                        <div className="panel-stat__num">{num}</div>
                        <div className="panel-stat__lbl">{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              // No profile — minimal panel
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="panel-label">{t('panel.summary')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { num: `${completedCount}/${modules.length}`, lbl: t('stats.completed'), color: 'var(--accent)' },
                    { num: totalXPFull.toLocaleString('es-CO'),   lbl: t('summaryLabels.xpTotal'), color: '#C0392B' },
                  ].map(({ num, lbl, color }) => (
                    <div key={lbl} style={{ textAlign: 'center', padding: '14px 10px', background: 'var(--bg-2)', borderRadius: 12 }}>
                      <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: '1.3rem', color, fontVariantNumeric: 'tabular-nums' }}>{num}</div>
                      <div style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--mute)', marginTop: 3 }}>{lbl}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 12, color: 'var(--mute)', lineHeight: 1.5, paddingTop: 4 }}>
                  {t('noProfile.body')}
                </div>
                <button
                  onClick={() => router.push('/onboarding/test')}
                  style={{ padding: '9px 16px', borderRadius: 999, background: '#C0392B', border: 'none', fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 12, color: '#fff', cursor: 'pointer', width: '100%' }}
                >
                  {t('noProfile.cta')}
                </button>
              </div>
            )}
          </m.div>

        </div>
      </main>
    </>
  )
}
