'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { m } from 'framer-motion'

interface School {
  id: string
  name: string
}

interface StudentReport {
  id: string
  display_name: string
  email: string
  school_id: string
  school_name: string
  school_level: string | null
  created_at: string
  total_xp: number
  modules_completed: number
  badges_earned: number
  project_title: string | null
  project_status: string | null
  capstone_resultado: string | null
  goals_active: number
  goals_completed: number
  quiz_attempts: number
}

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

export default function AdminReportPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,        setLoading]        = useState(true)
  const [exporting,      setExporting]      = useState(false)
  const [students,       setStudents]       = useState<StudentReport[]>([])
  const [schools,        setSchools]        = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState('all')
  const [showAllCols,    setShowAllCols]    = useState(false)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function load() {
      const { data: { user } } = await sb!.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await sb!.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role !== 'admin') { router.replace('/dashboard'); return }

      const { data: schoolsData } = await sb!.from('schools').select('id, name').order('name')
      setSchools(schoolsData ?? [])

      const schoolMap: Record<string, string> = {}
      schoolsData?.forEach((s: { id: string; name: string }) => { schoolMap[s.id] = s.name })

      const { data: studs } = await sb!.from('profiles').select('id, display_name, email, school_level, school_id, created_at').eq('role', 'student')
      if (!studs || studs.length === 0) { setLoading(false); return }

      const ids = studs.map((s: { id: string }) => s.id)
      const [
        { data: xpRows }, { data: progRows }, { data: badgeRows },
        { data: projRows }, { data: evalRows }, { data: goalRows }, { data: quizRows },
      ] = await Promise.all([
        sb!.from('xp_log').select('user_id, amount').in('user_id', ids),
        sb!.from('progress').select('user_id').eq('completed', true).in('user_id', ids),
        sb!.from('user_badges').select('user_id').in('user_id', ids),
        sb!.from('projects').select('user_id, title, status').in('user_id', ids).order('created_at', { ascending: false }),
        sb!.from('capstone_evaluations').select('project_id, resultado, projects(user_id)').in('resultado', ['certificado','mencion_honor']),
        sb!.from('goals').select('user_id, status').in('user_id', ids),
        sb!.from('quiz_attempts').select('user_id').in('user_id', ids),
      ])

      const xpMap: Record<string, number> = {}
      xpRows?.forEach((r: { user_id: string; amount: number }) => { xpMap[r.user_id] = (xpMap[r.user_id] ?? 0) + r.amount })
      const modMap: Record<string, number> = {}
      progRows?.forEach((r: { user_id: string }) => { modMap[r.user_id] = (modMap[r.user_id] ?? 0) + 1 })
      const badgeMap: Record<string, number> = {}
      badgeRows?.forEach((r: { user_id: string }) => { badgeMap[r.user_id] = (badgeMap[r.user_id] ?? 0) + 1 })
      const projMap: Record<string, { title: string | null; status: string }> = {}
      projRows?.forEach((r: { user_id: string; title: string | null; status: string }) => { if (!projMap[r.user_id]) projMap[r.user_id] = { title: r.title, status: r.status } })
      const evalMap: Record<string, string> = {}
      evalRows?.forEach((e: { resultado: string | null; projects: { user_id: string } | null }) => {
        if (e.projects?.user_id) evalMap[e.projects.user_id] = e.resultado ?? ''
      })
      const goalActive: Record<string, number> = {}; const goalDone: Record<string, number> = {}
      goalRows?.forEach((g: { user_id: string; status: string }) => {
        if (g.status === 'active') goalActive[g.user_id] = (goalActive[g.user_id] ?? 0) + 1
        if (g.status === 'completed') goalDone[g.user_id] = (goalDone[g.user_id] ?? 0) + 1
      })
      const quizMap: Record<string, number> = {}
      quizRows?.forEach((r: { user_id: string }) => { quizMap[r.user_id] = (quizMap[r.user_id] ?? 0) + 1 })

      setStudents(studs.map((s: { id: string; display_name: string | null; email: string | null; school_level: string | null; school_id: string | null; created_at: string }) => ({
        id: s.id, display_name: s.display_name ?? '—', email: s.email ?? '—',
        school_id: s.school_id ?? '', school_name: s.school_id ? (schoolMap[s.school_id] ?? '—') : '—',
        school_level: s.school_level, created_at: s.created_at,
        total_xp: xpMap[s.id] ?? 0, modules_completed: modMap[s.id] ?? 0, badges_earned: badgeMap[s.id] ?? 0,
        project_title: projMap[s.id]?.title ?? null, project_status: projMap[s.id]?.status ?? null,
        capstone_resultado: evalMap[s.id] ?? null,
        goals_active: goalActive[s.id] ?? 0, goals_completed: goalDone[s.id] ?? 0,
        quiz_attempts: quizMap[s.id] ?? 0,
      })))
      setLoading(false)
    }
    load()
  }, [])

  const displayed = selectedSchool === 'all' ? students : students.filter(s => s.school_id === selectedSchool)
  const selectedSchoolName = selectedSchool === 'all' ? 'Todos los colegios' : (schools.find(s => s.id === selectedSchool)?.name ?? '')

  async function handleExport() {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'landscape' })

      doc.setFontSize(20); doc.setTextColor(192, 57, 43)
      doc.text('Big Family — Reporte Global', 14, 18)
      doc.setFontSize(11); doc.setTextColor(100)
      doc.text(`${selectedSchoolName} · Exportado: ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 26)

      // Group by school if all
      const schoolGroups = selectedSchool === 'all'
        ? schools.map(s => ({ name: s.name, rows: displayed.filter(d => d.school_id === s.id) })).filter(g => g.rows.length > 0)
        : [{ name: selectedSchoolName, rows: displayed }]

      let currentY = 34
      schoolGroups.forEach(group => {
        doc.setFontSize(12); doc.setTextColor(192, 57, 43)
        doc.text(group.name, 14, currentY + 10)
        autoTable(doc, {
          startY: currentY + 14,
          head: [['Nombre', 'Email', 'Nivel', 'XP', 'Módulos', 'Proyecto', 'Capstone', 'Metas']],
          body: group.rows.map(s => [
            s.display_name, s.email, s.school_level ?? '—', s.total_xp,
            s.modules_completed, s.project_title ?? '—', s.capstone_resultado ?? '—',
            `${s.goals_completed}/${s.goals_active + s.goals_completed}`,
          ]),
          headStyles: { fillColor: [192, 57, 43], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 243, 239] },
          styles: { fontSize: 8 },
        })
        currentY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
      })

      // Summary
      doc.setFontSize(10); doc.setTextColor(60)
      const certified = displayed.filter(s => s.capstone_resultado !== null).length
      const avgXp = displayed.length > 0 ? Math.round(displayed.reduce((s, r) => s + r.total_xp, 0) / displayed.length) : 0
      doc.text(`Total: ${displayed.length} estudiantes  |  Certificados: ${certified}  |  XP promedio: ${avgXp}`, 14, currentY + 6)

      doc.save(`reporte-big-family-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('[PDF export]', err)
    }
    setExporting(false)
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
        .btn-sm{padding:7px 14px;border:1px solid var(--line);border-radius:999px;font-size:12.5px;font-weight:500;color:var(--ink);cursor:pointer;background:none;transition:all .2s;}
        .btn-sm:hover{border-color:var(--ink);}
        .btn-export{padding:10px 22px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s;}
        .btn-export:hover{background:#a93226;}
        .btn-export:disabled{opacity:.5;cursor:not-allowed;}
        .main{max-width:1200px;margin:0 auto;padding:40px 40px 80px;}
        .tbl-wrap{overflow-x:auto;border:1px solid var(--card-border);border-radius:14px;background:var(--card-bg);}
        table{width:100%;border-collapse:collapse;font-size:12.5px;}
        th{padding:11px 14px;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);font-weight:600;border-bottom:1px solid var(--line);text-align:left;background:var(--bg-2);white-space:nowrap;}
        td{padding:11px 14px;border-bottom:1px solid var(--line-soft);color:var(--ink-2);vertical-align:middle;}
        tr:last-child td{border-bottom:none;}
        tbody tr:nth-child(even) td{background:var(--bg-2);}
        .filter-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
        .filter-btn{padding:6px 14px;border-radius:999px;border:1.5px solid var(--line);font-size:12px;font-weight:600;cursor:pointer;background:none;color:var(--mute);transition:all .15s;}
        .filter-btn:hover,.filter-btn.active{background:var(--ink);border-color:var(--ink);color:#fff;}
        .col-toggle{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;background:none;color:var(--mute);transition:all .15s;}
        .col-toggle:hover{border-color:var(--ink);color:var(--ink);}
      `}</style>

      <nav className="nav">
        <a href="/admin" style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ink)', textDecoration: 'none' }}>Big Family</a>
        <span style={{ fontSize: 12, color: 'var(--mute)' }}>→ Reporte PDF</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button className="btn-sm" onClick={() => router.push('/admin')}>Panel Admin</button>
          <button className="btn-sm" onClick={handleLogout}>Salir</button>
        </div>
      </nav>

      <m.div className="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 4 }}>Reporte Global</h1>
            <p style={{ fontSize: 13, color: 'var(--mute)' }}>{displayed.length} estudiante{displayed.length !== 1 ? 's' : ''} · {selectedSchoolName}</p>
          </div>
          <m.button
            className="btn-export"
            onClick={handleExport}
            disabled={loading || exporting || displayed.length === 0}
            title={displayed.length === 0 ? 'No hay estudiantes para exportar' : undefined}
            whileHover={loading || displayed.length === 0 ? undefined : { scale: 1.02 }}
            whileTap={loading || displayed.length === 0 ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            {exporting ? 'Generando PDF…' : '↓ Exportar Reporte PDF'}
          </m.button>
        </div>

        {/* School filter */}
        {!loading && (
          <div className="filter-row">
            <button className={`filter-btn ${selectedSchool === 'all' ? 'active' : ''}`} onClick={() => setSelectedSchool('all')}>Todos los colegios</button>
            {schools.map(s => (
              <button key={s.id} className={`filter-btn ${selectedSchool === s.id ? 'active' : ''}`} onClick={() => setSelectedSchool(s.id)}>{s.name}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button type="button" className="col-toggle" onClick={() => setShowAllCols(s => !s)}>
            {showAllCols ? '↑ Menos columnas' : '↓ Mostrar todas las columnas'}
          </button>
        </div>

        <div className="tbl-wrap">
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4,5].map(i => <Sk key={i} h={20} r={6} />)}
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>Sin datos.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Colegio</th>
                  <th>Nivel</th>
                  <th>XP Total</th>
                  <th>Módulos</th>
                  <th>Capstone</th>
                  {showAllCols && <><th>Badges</th><th>Proyecto</th><th>Metas</th></>}
                </tr>
              </thead>
              <tbody>
                {displayed.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.display_name}</td>
                    <td style={{ color: 'var(--mute)', fontSize: 12 }}>{s.school_name}</td>
                    <td>{s.school_level === 'junior' ? 'Junior' : 'Senior'}</td>
                    <td style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, color: '#C0392B' }}>{s.total_xp.toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }}>{s.modules_completed}</td>
                    <td>{s.capstone_resultado ? <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(34,197,94,.15)', color: '#065F46' }}>{s.capstone_resultado}</span> : '—'}</td>
                    {showAllCols && <>
                      <td style={{ textAlign: 'center' }}>{s.badges_earned}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.project_title ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{s.goals_completed}/{s.goals_active + s.goals_completed}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </m.div>
    </>
  )
}
