'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import { m, useReducedMotion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import { useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts'

interface Module {
  id: string
  title: string
  description: string
  xp_reward: number
  order_index: number
}
interface ProgressRow { module_id: string; completed: boolean }
interface WeeklyXP { week: string; xp: number }
interface LeaderProfile {
  arquetipo:         string
  fortalezas:        string[]
  areas_crecimiento: string[]
  big_five: { O: number; C: number; E: number; A: number; N: number; ES: number }
}
interface DiplomaInfo { projectId: string; resultado: string }

const MODULE_PILLAR: Record<number, string> = {
  1: 'Yo', 2: 'Norte', 3: 'Vínculo', 4: 'Vínculo', 5: 'Acción', 6: 'Acción', 7: 'Legado',
}
const PILLAR_MODS: Record<string, number[]> = {
  Yo: [1], Norte: [2], Vínculo: [3, 4], Acción: [4, 5, 6], Legado: [7],
}
const PILLAR_ORDER = ['Yo', 'Norte', 'Vínculo', 'Acción', 'Legado'] as const

const MOCK_LEADER_PROFILE: LeaderProfile = {
  arquetipo: 'Líder Visionaria', fortalezas: ['Norte', 'Acción'],
  areas_crecimiento: ['Yo', 'Vínculo'], big_five: { O: 85, C: 42, E: 78, A: 38, N: 35, ES: 65 },
}

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)',
      backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

function AnimatedKPI({ value, locale = 'es-CO' }: { value: number; locale?: string }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now(), dur = 900
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1)
      setDisplayed(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [value])
  return <>{displayed.toLocaleString(locale)}</>
}

export default function ProgresoPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()
  const t           = useTranslations('dashboard.home')
  const tModules    = useTranslations('dashboard.modules')

  const [loading,       setLoading]       = useState(true)
  const [modules,       setModules]       = useState<Module[]>([])
  const [progressRows,  setProgressRows]  = useState<ProgressRow[]>([])
  const [leaderProfile, setLeaderProfile] = useState<LeaderProfile | null>(null)
  const [weeklyXP,      setWeeklyXP]      = useState<WeeklyXP[]>([])
  const [streak,        setStreak]        = useState(0)
  const [rankPos,       setRankPos]       = useState<number | null>(null)
  const [totalXP,       setTotalXP]       = useState(0)
  const [diploma,       setDiploma]       = useState<DiplomaInfo | null>(null)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    async function load() {
      if (MOCK_MODE) {
        const s = MOCK.students[0]
        setModules(MOCK.modules.map(m => ({ id: m.id, title: m.title, description: '', xp_reward: m.xpReward, order_index: m.order })))
        setProgressRows([
          { module_id: 'm1', completed: true }, { module_id: 'm2', completed: true },
          { module_id: 'm3', completed: true }, { module_id: 'm4', completed: true },
          { module_id: 'm5', completed: true },
        ])
        setWeeklyXP(MOCK.currentStudentWeeklyXP)
        setStreak(s.streak)
        setRankPos(s.rank)
        setTotalXP(s.xp)
        setDiploma({ projectId: 'mock-project-1', resultado: 'certificado' })
        setLeaderProfile(MOCK_LEADER_PROFILE)
        setLoading(false)
        return
      }

      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.replace('/login'); return }

      const [profileRes, xpRes, modsRes, progRes, projRes] = await Promise.all([
        supabase.from('profiles').select('school_id, leadership_profile').eq('id', authUser.id).maybeSingle(),
        supabase.from('xp_log').select('amount').eq('user_id', authUser.id),
        supabase.from('modules').select('*').eq('status', 'published').order('order_index'),
        supabase.from('progress').select('module_id, completed').eq('user_id', authUser.id),
        supabase.from('projects').select('id, status').eq('user_id', authUser.id),
      ])

      const profile  = profileRes.data
      const xpRows   = xpRes.data ?? []
      const mods     = modsRes.data ?? []
      const prog     = progRes.data ?? []
      const projects = projRes.data ?? []

      if (profile?.leadership_profile) setLeaderProfile(profile.leadership_profile as LeaderProfile)

      const total_xp = xpRows.reduce((s: number, r: { amount: number }) => s + r.amount, 0)
      setTotalXP(total_xp)

      if (projects.length > 0) {
        const projectIds = projects.map((p: { id: string }) => p.id)
        const { data: evals } = await supabase
          .from('capstone_evaluations').select('project_id, resultado')
          .in('project_id', projectIds).in('resultado', ['certificado', 'mencion_honor']).limit(1).maybeSingle()
        if (evals) setDiploma({ projectId: evals.project_id, resultado: evals.resultado })
      }

      try {
        const since4w = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
        const { data: xpDated } = await supabase
          .from('xp_log').select('amount, created_at').eq('user_id', authUser.id).gte('created_at', since4w)
        const weekMap: Record<string, number> = {}
        const now = new Date()
        for (let i = 3; i >= 0; i--) {
          const d = new Date(now); d.setDate(d.getDate() - i * 7)
          weekMap[`S${4 - i}`] = 0
        }
        xpDated?.forEach((r: { amount: number; created_at: string }) => {
          const weekIdx = Math.min(3, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000 / 7))
          const key = `S${4 - weekIdx}`
          if (weekMap[key] !== undefined) weekMap[key] += r.amount
        })
        setWeeklyXP(Object.entries(weekMap).map(([week, xp]) => ({ week, xp })))

        const { data: xpDays } = await supabase
          .from('xp_log').select('created_at').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(60)
        if (xpDays && xpDays.length > 0) {
          const daySet = new Set(xpDays.map((r: { created_at: string }) => new Date(r.created_at).toISOString().slice(0, 10)))
          let s = 0
          const today = new Date()
          for (let i = 0; i < 60; i++) {
            const d = new Date(today); d.setDate(d.getDate() - i)
            if (daySet.has(d.toISOString().slice(0, 10))) s++; else break
          }
          setStreak(s)
        }

        if (profile?.school_id) {
          const { data: schoolStudents } = await supabase
            .from('profiles').select('id').eq('school_id', profile.school_id).eq('role', 'student')
          if (schoolStudents && schoolStudents.length > 0) {
            const sids = schoolStudents.map((p: { id: string }) => p.id)
            const { data: schoolXP } = await supabase.from('xp_log').select('user_id, amount').in('user_id', sids)
            const xpByUser: Record<string, number> = {}
            schoolXP?.forEach((r: { user_id: string; amount: number }) => { xpByUser[r.user_id] = (xpByUser[r.user_id] ?? 0) + r.amount })
            setRankPos(Object.values(xpByUser).filter(v => v > total_xp).length + 1)
          } else { setRankPos(0) }
        } else { setRankPos(0) }
      } catch { setRankPos(0) }

      setModules(mods)
      setProgressRows(prog)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const completedIds   = new Set(progressRows.filter(p => p.completed).map(p => p.module_id))
  const totalModules   = modules.length
  const completedCount = completedIds.size
  const visionPct      = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0
  const sortedModules  = [...modules].sort((a, b) => a.order_index - b.order_index)
  const lockedIds = new Set<string>()
  for (let i = 1; i < sortedModules.length; i++) {
    if (!completedIds.has(sortedModules[i - 1].id)) {
      sortedModules.slice(i).forEach(m => lockedIds.add(m.id))
      break
    }
  }

  return (
    <>
      <style>{`
        @keyframes shimmer { to { background-position: -200% center } }
        @keyframes drawCheck { to { stroke-dashoffset: 0 } }
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);color:var(--ink);}
        .prog-wrap{flex:1;min-width:0;overflow-y:auto;padding:32px 28px;display:flex;flex-direction:column;gap:24px;}
        .prog-header{display:flex;flex-direction:column;gap:4px;}
        .prog-eyebrow{font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#C0392B;}
        .prog-h1{font-family:"Satoshi",sans-serif;font-weight:700;font-size:28px;letter-spacing:-0.02em;color:var(--ink);line-height:1.15;}
        .prog-h1 em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;}
        .prog-section-label{font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);margin-bottom:14px;}
        .prog-divider{height:1px;background:var(--line);}
        .kpi-bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;}
        @media(max-width:1100px){.kpi-bento{grid-template-columns:repeat(2,minmax(0,1fr));}}
        @media(max-width:600px){.kpi-bento{grid-template-columns:1fr;}}
        .kpi-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:20px 22px;box-shadow:var(--shadow-card);transition:transform .2s;}
        .kpi-card:hover{transform:translateY(-1px);}
        .kpi-num{font-family:var(--font-mono,"JetBrains Mono",monospace);font-variant-numeric:tabular-nums;font-weight:700;font-size:32px;letter-spacing:-.02em;line-height:1;}
        .kpi-label{font-size:10.5px;color:var(--mute);margin-top:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:600;}
        .pillar-pills{display:flex;gap:10px;flex-wrap:wrap;}
        .pillar-pill{flex:1;min-width:100px;display:flex;flex-direction:column;gap:5px;padding:12px 14px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:12px;box-shadow:var(--shadow-card);}
        .pillar-pill__header{display:flex;justify-content:space-between;align-items:center;}
        .pillar-pill__name{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;}
        .pillar-pill__pct{font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;}
        .pillar-pill__track{height:3px;background:var(--line);border-radius:999px;overflow:hidden;}
        .pillar-pill__bar{height:100%;border-radius:999px;transition:width .5s cubic-bezier(.4,0,.2,1);}
        .charts-row{display:grid;grid-template-columns:8fr 4fr;gap:16px;}
        @media(max-width:860px){.charts-row{grid-template-columns:1fr;}}
        .card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;box-shadow:0 2px 16px -6px rgba(13,13,13,.08);}
        .mods-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
        .mod-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:20px;box-shadow:var(--shadow-card);display:flex;flex-direction:column;gap:10px;transition:box-shadow .25s,transform .25s;}
        .mod-card:hover{box-shadow:0 6px 24px -8px rgba(13,13,13,.14);transform:translateY(-1px);}
        .mod-card.done{background:var(--bg-2);opacity:0.72;}
        .mod-card.locked{opacity:.45;cursor:default;pointer-events:none;}
        .mod-num{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#C0392B;}
        .mod-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);line-height:1.35;}
        .mod-desc{font-size:12px;color:var(--mute);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .mod-xp{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:rgba(192,57,43,.08);color:#C0392B;border-radius:999px;font-size:11px;font-weight:700;width:fit-content;}
        .mod-prog-track{height:4px;background:var(--line);border-radius:999px;overflow:hidden;}
        .mod-prog-bar{height:100%;background:#C0392B;border-radius:999px;transition:width .5s;}
        .mod-prog-bar.green{background:#22c55e;}
        .btn-start{padding:9px 14px;background:var(--ink);border:none;border-radius:9px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:12px;color:var(--bg);cursor:pointer;transition:background .2s;width:100%;margin-top:2px;}
        .btn-start:hover{background:#C0392B;}
        .done-badge{display:flex;align-items:center;justify-content:center;gap:5px;padding:9px;background:rgba(34,197,94,.1);border-radius:9px;font-size:12px;font-weight:700;color:#16a34a;margin-top:2px;}
        .done-check-path{stroke-dasharray:20;stroke-dashoffset:20;animation:drawCheck .4s cubic-bezier(0.22,1,0.36,1) forwards;}
        .lock-badge{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;background:var(--line);border-radius:9px;font-size:12px;font-weight:600;color:var(--mute);margin-top:2px;}
        .mod-profile-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.03em;white-space:nowrap;}
        .mod-profile-badge.strength{background:rgba(15,123,108,.1);color:var(--accent-teal,#0F7B6C);border:1px solid rgba(15,123,108,.2);}
        .mod-profile-badge.growth{background:rgba(192,57,43,.08);color:#C0392B;border:1px solid rgba(192,57,43,.2);}
        .btn-ghost{padding:10px 18px;background:none;border:1px solid var(--line);border-radius:10px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer;transition:border-color .2s,background .2s;font-family:"Satoshi",sans-serif;}
        .btn-ghost:hover{border-color:var(--ink);}
        @media(max-width:1200px){.mods-grid{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:860px){.mods-grid{grid-template-columns:1fr;}}
        @media(max-width:768px){.mods-grid{grid-template-columns:repeat(2,1fr);}.prog-wrap{padding:24px 16px;}}
      `}</style>

      <m.main
        className="prog-wrap"
        initial={pref ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      >
        {/* Header */}
        <div className="prog-header">
          <div className="prog-eyebrow">Dashboard</div>
          <h1 className="prog-h1">Mi <em>Progreso</em></h1>
        </div>

        <div className="prog-divider" />

        {/* KPI Bento */}
        <div>
          <div className="prog-section-label">Tus estadísticas</div>
          <m.div
            className="kpi-bento"
            initial={pref ? false : 'hidden'}
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          >
            {([
              { label: t('stats.xpTotal'),           val: loading ? null : totalXP,         color: 'var(--accent-amber,#D4821A)', border: 'var(--accent-amber,#D4821A)', isRank: false },
              { label: t('kpiLabels.modules'),        val: loading ? null : completedCount,   color: 'var(--accent-teal,#0F7B6C)',  border: 'var(--accent-teal,#0F7B6C)',  isRank: false },
              { label: t('kpiLabels.streakDays'),     val: loading ? null : streak,           color: 'var(--ink)',                  border: 'var(--line-strong)',            isRank: false },
              { label: t('kpiLabels.schoolRanking'), val: loading ? null : (rankPos ?? 0),   color: 'var(--accent,#C0392B)',       border: 'var(--accent,#C0392B)',        isRank: true  },
            ]).map(({ label, val, color, border, isRank }) => (
              <m.div
                key={label}
                className="kpi-card"
                style={{ borderLeft: `3px solid ${border}` }}
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } }}
              >
                {val === null
                  ? <><Sk w="50%" h={32} r={6} /><div style={{ marginTop: 9 }}><Sk w="70%" h={10} r={4} /></div></>
                  : <>
                      <div className="kpi-num" style={{ color }}>
                        {isRank ? (val === 0 ? '—' : `#${val}`) : <AnimatedKPI value={val} />}
                      </div>
                      <div className="kpi-label">{label}</div>
                    </>
                }
              </m.div>
            ))}
          </m.div>
        </div>

        <div className="prog-divider" />

        {/* Tu perfil de líder — pillar bars */}
        <div>
          <div className="prog-section-label">Tu perfil de líder</div>
          <div className="pillar-pills">
            {PILLAR_ORDER.map(pillar => {
              const modsInPillar = PILLAR_MODS[pillar]
              const completedInPillar = loading ? 0 : modules.filter(m => modsInPillar.includes(m.order_index) && completedIds.has(m.id)).length
              const pct = modsInPillar.length > 0 ? Math.round(completedInPillar / modsInPillar.length * 100) : 0
              const isStrength = leaderProfile?.fortalezas.includes(pillar)
              const isGrowth   = leaderProfile?.areas_crecimiento.includes(pillar)
              const color = isStrength ? 'var(--accent-teal,#0F7B6C)' : isGrowth ? '#C0392B' : 'var(--mute)'
              return (
                <div key={pillar} className="pillar-pill">
                  {loading
                    ? <><Sk w="60%" h={10} r={4} /><Sk w="100%" h={3} r={999} /></>
                    : <>
                        <div className="pillar-pill__header">
                          <span className="pillar-pill__name" style={{ color }}>{pillar}</span>
                          <span className="pillar-pill__pct" style={{ color }}>{pct}%</span>
                        </div>
                        <div className="pillar-pill__track">
                          <div className="pillar-pill__bar" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </>
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* Tu avance en el programa — charts */}
        <div>
          <div className="prog-section-label">Tu avance en el programa</div>
          <div className="charts-row">
            {/* XP Line Chart */}
            <div className="card" style={{ padding: '22px 20px 16px' }}>
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 16 }}>
                {t('charts.xpProgress')}
              </div>
              {loading || weeklyXP.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[80, 60, 100, 70].map((w, i) => <Sk key={i} w={`${w}%`} h={10} r={4} />)}
                </div>
              ) : (
                <m.div
                  initial={pref ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 26 }}
                >
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={weeklyXP} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--mute)', fontFamily: 'Satoshi,sans-serif' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--mute)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null
                          return (
                            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontFamily: '"Satoshi",sans-serif' }}>
                              <span style={{ fontWeight: 700, color: 'var(--accent-amber,#D4821A)' }}>{payload[0].value?.toLocaleString('es-CO')} XP</span>
                            </div>
                          )
                        }}
                      />
                      <Line type="monotone" dataKey="xp" stroke="var(--accent-amber,#D4821A)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-amber,#D4821A)', strokeWidth: 0 }} activeDot={{ r: 5, fill: 'var(--accent-amber,#D4821A)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </m.div>
              )}
            </div>

            {/* Leadership RadialBarChart */}
            <div className="card" style={{ padding: '22px 20px 16px' }}>
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 16 }}>
                {t('charts.leadershipPath')}
              </div>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}><Sk w={120} h={120} r={999} /></div>
              ) : (() => {
                const pillars = [
                  { name: t('charts.pillarVision'),    fill: '#C0392B', value: visionPct },
                  { name: t('charts.pillarModules'),   fill: '#D4821A', value: totalModules > 0 ? Math.round(completedCount / totalModules * 100) : 0 },
                  { name: t('charts.pillarImpact'),    fill: '#0F7B6C', value: diploma ? 100 : 0 },
                  { name: t('charts.pillarCommunity'), fill: '#8C7B6E', value: 0 },
                  { name: t('charts.pillarProjects'),  fill: '#6B6B6B', value: 0 },
                ]
                const hasProgress = pillars.some(p => p.value > 0)
                if (!hasProgress) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 10 }}>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.3 }}>
                        <circle cx="16" cy="16" r="13" stroke="var(--mute)" strokeWidth="2"/>
                        <circle cx="16" cy="16" r="8" stroke="var(--mute)" strokeWidth="1.5" strokeDasharray="4 3"/>
                        <circle cx="16" cy="16" r="2.5" fill="var(--mute)"/>
                      </svg>
                      <div style={{ fontSize: 12.5, color: 'var(--mute)', textAlign: 'center', lineHeight: 1.5, fontFamily: '"Satoshi",sans-serif' }}>{t('charts.emptyState')}</div>
                    </div>
                  )
                }
                return (
                  <m.div
                    initial={pref ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 26, delay: 0.1 }}
                  >
                    <ResponsiveContainer width="100%" height={140}>
                      <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={68} data={pillars} startAngle={90} endAngle={-270}>
                        <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'var(--line)' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null
                            const d = payload[0].payload
                            return (
                              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontFamily: '"Satoshi",sans-serif' }}>
                                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{d.name}: </span>
                                <span style={{ color: d.fill }}>{d.value}%</span>
                              </div>
                            )
                          }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 4 }}>
                      {pillars.map(p => (
                        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 7, height: 7, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: '"Satoshi",sans-serif' }}>{p.name} {p.value}%</span>
                        </div>
                      ))}
                    </div>
                  </m.div>
                )
              })()}
            </div>
          </div>
        </div>

        <div className="prog-divider" />

        {/* Mis módulos — grid completo */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="prog-section-label" style={{ marginBottom: 0 }}>{t('zone3.modulesTitle')}</div>
            {!loading && (
              <span style={{ padding: '3px 10px', background: 'var(--line)', color: 'var(--mute)', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                {completedCount}/{totalModules}
              </span>
            )}
          </div>

          {loading ? (
            <div className="mods-grid">
              {[1, 2, 3].map(i => (
                <div key={i} className="mod-card" style={{ gap: 12 }}>
                  <Sk w="40%" h={10} r={5} />
                  <Sk w="70%" h={14} r={6} />
                  <Sk w="100%" h={10} r={5} />
                  <Sk w="60px" h={20} r={999} />
                  <Sk w="100%" h={4} r={999} />
                  <Sk w="100%" h={34} r={9} />
                </div>
              ))}
            </div>
          ) : totalModules === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--mute)', fontSize: 13, border: '1px dashed var(--line)', borderRadius: 14 }}>
              {t('modulesAvailable.empty')}
            </div>
          ) : (
            <m.div
              className="mods-grid"
              initial={pref ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            >
              {sortedModules.map((mod) => {
                const isDone   = completedIds.has(mod.id)
                const isLocked = lockedIds.has(mod.id)
                return (
                  <m.div
                    key={mod.id}
                    variants={fadeUp}
                    className={`mod-card ${isDone ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={!isLocked && !isDone ? () => router.push(`/dashboard/modules/${mod.id}`) : undefined}
                    style={!isLocked && !isDone ? { cursor: 'pointer' } : undefined}
                  >
                    <div className="mod-num" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {String(mod.order_index).padStart(2, '0')}
                      {isLocked && (
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" style={{ opacity: .4 }}>
                          <rect x="2" y="6" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      )}
                      {leaderProfile && (() => {
                        const pillar = MODULE_PILLAR[mod.order_index]
                        if (!pillar) return null
                        if (leaderProfile.fortalezas.includes(pillar))
                          return <span className="mod-profile-badge strength">{tModules('strengthBadge')}</span>
                        if (leaderProfile.areas_crecimiento.includes(pillar))
                          return <span className="mod-profile-badge growth">{tModules('growthBadge')}</span>
                        return null
                      })()}
                    </div>
                    <div className="mod-name">{mod.title}</div>
                    <div className="mod-desc">{mod.description}</div>
                    <div className="mod-xp">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M5 0L6.2 3.8H10L6.9 6.1L8.1 10L5 7.6L1.9 10L3.1 6.1L0 3.8H3.8L5 0Z"/>
                      </svg>
                      {mod.xp_reward ?? 100} XP
                    </div>
                    <div className="mod-prog-track">
                      <div className={`mod-prog-bar ${isDone ? 'green' : ''}`} style={{ width: isDone ? '100%' : '0%' }} />
                    </div>
                    {isDone ? (
                      <div className="done-badge">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ overflow: 'visible' }}>
                          <path className="done-check-path" d="M2 7l3 3 6-6" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {tModules('completed')}
                      </div>
                    ) : isLocked ? (
                      <div className="lock-badge">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <rect x="2" y="6" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                        {tModules('locked')}
                      </div>
                    ) : (
                      <m.button
                        className="btn-start"
                        onClick={e => { e.stopPropagation(); router.push(`/dashboard/modules/${mod.id}`) }}
                        whileHover={pref ? undefined : { scale: 1.02 }}
                        whileTap={pref ? undefined : { scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                      >
                        {t('modulesAvailable.startBtn')}
                      </m.button>
                    )}
                  </m.div>
                )
              })}
            </m.div>
          )}
        </div>

        {/* Ver programa completo */}
        <m.button
          className="btn-ghost"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => router.push('/dashboard/leadership-path')}
          whileHover={pref ? undefined : { scale: 1.02 }}
          whileTap={pref ? undefined : { scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          {t('leadershipProgress.viewFullProgram')}
        </m.button>
      </m.main>
    </>
  )
}
