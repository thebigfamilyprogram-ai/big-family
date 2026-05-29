'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { m } from 'framer-motion'

interface StudentGoalSummary {
  id: string
  display_name: string
  email: string
  active: number
  completed: number
}

interface StudentGoal {
  id: string
  title: string
  type: string
  status: string
  due_date: string | null
  xp_reward: number
  completed_at: string | null
  created_at: string
}

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

export default function CoordinatorGoalsPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,    setLoading]    = useState(true)
  const [students,   setStudents]   = useState<StudentGoalSummary[]>([])
  const [selected,   setSelected]   = useState<StudentGoalSummary | null>(null)
  const [detail,     setDetail]     = useState<StudentGoal[]>([])
  const [loadDetail, setLoadDetail] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [coordName,  setCoordName]  = useState('')

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function load() {
      const { data: { user } } = await sb!.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await sb!.from('profiles').select('display_name, school_id, role').eq('id', user.id).maybeSingle()
      if (!profile || !['coordinator','admin'].includes(profile.role ?? '')) { router.replace('/dashboard'); return }

      setCoordName(profile.display_name ?? '')

      const { data: school } = await sb!.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
      setSchoolName(school?.name ?? '')

      const { data: studs } = await sb!.from('profiles').select('id, display_name, email').eq('school_id', profile.school_id).eq('role', 'student')
      if (!studs || studs.length === 0) { setLoading(false); return }

      const ids = studs.map((s: { id: string }) => s.id)
      const { data: goalsData } = await sb!.from('goals').select('user_id, status').in('user_id', ids)

      const countMap: Record<string, { active: number; completed: number }> = {}
      goalsData?.forEach((g: { user_id: string; status: string }) => {
        if (!countMap[g.user_id]) countMap[g.user_id] = { active: 0, completed: 0 }
        if (g.status === 'active') countMap[g.user_id].active++
        if (g.status === 'completed') countMap[g.user_id].completed++
      })

      setStudents(studs.map((s: { id: string; display_name: string | null; email: string | null }) => ({
        id: s.id, display_name: s.display_name ?? '—', email: s.email ?? '—',
        active: countMap[s.id]?.active ?? 0,
        completed: countMap[s.id]?.completed ?? 0,
      })))
      setLoading(false)
    }
    load()
  }, [])

  async function handleSelectStudent(s: StudentGoalSummary) {
    setSelected(s)
    setDetail([])
    setLoadDetail(true)
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    const { data } = await sb!.from('goals').select('*').eq('user_id', s.id).order('created_at', { ascending: false })
    setDetail(data ?? [])
    setLoadDetail(false)
  }

  async function handleLogout() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <style>{`
        
        *{box-sizing:border-box;margin:0;padding:0;}
        .nav{position:sticky;top:0;z-index:30;background:var(--bg);border-bottom:1px solid var(--line);height:62px;display:flex;align-items:center;padding:0 40px;gap:16px;}
        .nav__brand{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);text-decoration:none;}
        .nav__right{display:flex;align-items:center;gap:12px;margin-left:auto;}
        .btn-sm{padding:7px 14px;border:1px solid var(--line);border-radius:999px;font-size:12.5px;font-weight:500;color:var(--ink);cursor:pointer;background:none;transition:all .2s;}
        .btn-sm:hover{border-color:var(--ink);background:var(--line);}
        .main{overflow-y:auto;flex:1;min-width:0;max-width:1100px;margin:0 auto;padding:40px 40px 80px;}
        .page-h{font-family:"Satoshi",sans-serif;font-weight:900;font-size:26px;letter-spacing:-0.02em;color:var(--ink);margin-bottom:6px;}
        .page-sub{font-size:13px;color:var(--mute);margin-bottom:28px;}
        .grid{display:grid;grid-template-columns:1fr 400px;gap:20px;}
        .panel{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;}
        .panel__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:var(--ink);margin-bottom:16px;}
        .tbl{width:100%;border-collapse:collapse;font-size:13px;}
        .tbl th{text-align:left;padding:9px 12px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);font-weight:600;border-bottom:1px solid var(--line);}
        .tbl td{padding:11px 12px;border-bottom:1px solid var(--line-soft);color:var(--ink-2);vertical-align:middle;}
        .tbl tbody tr{cursor:pointer;transition:background .15s;}
        .tbl tbody tr:hover td,.tbl tbody tr.sel td{background:rgba(192,57,43,.04)!important;}
        .goal-row{padding:14px 0;border-bottom:1px solid var(--line-soft);}
        .goal-row:last-child{border-bottom:none;}
        @media(max-width:900px){.grid{grid-template-columns:1fr;}}
      `}</style>

      <m.div className="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 28 }}>
        <h1 className="page-h">Metas de estudiantes</h1>
        <p className="page-sub">{schoolName} — Seguimiento de objetivos personales y del programa</p>

        <div className="grid">
          <div className="panel">
            <div className="panel__title">Estudiantes</div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4].map(i => <Sk key={i} h={40} r={8} />)}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Activas</th>
                      <th>Completadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--mute)', padding: '24px 0' }}>Sin estudiantes</td></tr>
                    ) : students.map(s => (
                      <tr key={s.id} className={selected?.id === s.id ? 'sel' : ''} onClick={() => handleSelectStudent(s)}>
                        <td style={{ fontWeight: 500 }}>{s.display_name}</td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 999, background: s.active > 0 ? 'rgba(192,57,43,.1)' : 'var(--line)', color: s.active > 0 ? '#C0392B' : 'var(--mute)', fontSize: 11, fontWeight: 700 }}>
                            {s.active}
                          </span>
                        </td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 999, background: s.completed > 0 ? '#D1FAE5' : 'var(--line)', color: s.completed > 0 ? '#065F46' : 'var(--mute)', fontSize: 11, fontWeight: 700 }}>
                            {s.completed}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel__title">
              {selected ? `${selected.display_name}` : 'Selecciona un estudiante'}
            </div>
            {!selected && (
              <p style={{ fontSize: 13, color: 'var(--mute)' }}>Haz clic en un estudiante para ver sus metas.</p>
            )}
            {loadDetail && <Sk h={40} r={8} />}
            {selected && !loadDetail && detail.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--mute)' }}>No tiene metas registradas.</p>
            )}
            {selected && !loadDetail && detail.map(g => (
              <div key={g.id} className="goal-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5, color: g.status === 'completed' ? 'var(--mute)' : 'var(--ink)', textDecoration: g.status === 'completed' ? 'line-through' : 'none' }}>{g.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: g.status === 'completed' ? '#D1FAE5' : g.status === 'expired' ? '#FEE2E2' : 'rgba(192,57,43,.1)', color: g.status === 'completed' ? '#065F46' : g.status === 'expired' ? '#991B1B' : '#C0392B' }}>
                    {g.status === 'active' ? 'Activa' : g.status === 'completed' ? 'Completada' : 'Expirada'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--line)', color: 'var(--mute)' }}>
                    {g.type === 'program' ? 'Programa' : 'Personal'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 5, fontSize: 11.5, color: 'var(--mute)' }}>
                  {g.due_date && <span>Vence: {new Date(g.due_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                  <span style={{ color: '#b25a00', fontWeight: 600 }}>+{g.xp_reward} XP</span>
                  {g.completed_at && <span style={{ color: '#065F46' }}>✓ {new Date(g.completed_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </m.div>
    </>
  )
}
