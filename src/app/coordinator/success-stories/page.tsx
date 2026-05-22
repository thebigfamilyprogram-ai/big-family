'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { springNatural } from '@/lib/animations'

interface Story {
  id: string
  title: string
  story: string
  cover_url: string | null
  published: boolean
  published_at: string | null
  student_name: string | null
  school_name: string | null
  project_title: string | null
  created_at: string
}

interface Student { id: string; full_name: string }

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

export default function CoordinatorSuccessStoriesPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,    setLoading]    = useState(true)
  const [stories,    setStories]    = useState<Story[]>([])
  const [students,   setStudents]   = useState<Student[]>([])
  const [selected,   setSelected]   = useState<Story | null>(null)
  const [coordName,  setCoordName]  = useState('')
  const [coordId,    setCoordId]    = useState('')
  const [schoolId,   setSchoolId]   = useState('')
  const [publishing, setPublishing] = useState<string | null>(null)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ student_id: '', title: '', story: '' })
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function load() {
      const { data: { user } } = await sb!.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await sb!.from('profiles').select('full_name, school_id, role').eq('id', user.id).maybeSingle()
      if (!profile || !['coordinator','admin'].includes(profile.role ?? '')) { router.replace('/dashboard'); return }
      setCoordName(profile.full_name ?? ''); setCoordId(user.id); setSchoolId(profile.school_id ?? '')

      const { data: sc } = await sb!.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
      const { data: storiesData } = await sb!.from('success_stories').select('id, title, story, cover_url, published, published_at, student_id, school_id, project_id, created_at').order('created_at', { ascending: false })
      const { data: studsData } = await sb!.from('profiles').select('id, full_name').eq('school_id', profile.school_id).eq('role', 'student')

      setStudents(studsData ?? [])

      if (!storiesData || storiesData.length === 0) { setLoading(false); return }

      const userIds   = [...new Set(storiesData.map((r: { student_id: string }) => r.student_id))] as string[]
      const schoolIds = [...new Set(storiesData.map((r: { school_id: string | null }) => r.school_id).filter(Boolean))] as string[]
      const projIds   = [...new Set(storiesData.map((r: { project_id: string | null }) => r.project_id).filter(Boolean))] as string[]

      const [{ data: profData }, { data: schoolData }, { data: projData }] = await Promise.all([
        sb!.from('profiles').select('id, full_name').in('id', userIds),
        schoolIds.length ? sb!.from('schools').select('id, name').in('id', schoolIds) : Promise.resolve({ data: [] }),
        projIds.length ? sb!.from('projects').select('id, title').in('id', projIds) : Promise.resolve({ data: [] }),
      ])

      const profMap: Record<string, string> = {}
      profData?.forEach((p: { id: string; full_name: string | null }) => { profMap[p.id] = p.full_name ?? '—' })
      const schoolMap: Record<string, string> = {}
      schoolData?.forEach((s: { id: string; name: string }) => { schoolMap[s.id] = s.name })
      const projMap: Record<string, string> = {}
      projData?.forEach((p: { id: string; title: string | null }) => { projMap[p.id] = p.title ?? '—' })

      setStories(storiesData.map((r: { id: string; title: string; story: string; cover_url: string | null; published: boolean; published_at: string | null; student_id: string; school_id: string | null; project_id: string | null; created_at: string }) => ({
        id: r.id, title: r.title, story: r.story, cover_url: r.cover_url,
        published: r.published, published_at: r.published_at, created_at: r.created_at,
        student_name: profMap[r.student_id] ?? null, school_name: r.school_id ? (schoolMap[r.school_id] ?? null) : null,
        project_title: r.project_id ? (projMap[r.project_id] ?? null) : null,
      })))
      setLoading(false)
    }
    load()
  }, [])

  async function handlePublish(id: string, publish: boolean) {
    if (!supabaseRef.current) return
    setPublishing(id)
    await supabaseRef.current.from('success_stories').update({ published: publish, published_at: publish ? new Date().toISOString() : null }).eq('id', id)
    setStories(prev => prev.map(s => s.id === id ? { ...s, published: publish, published_at: publish ? new Date().toISOString() : null } : s))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, published: publish } : null)
    setPublishing(null)
  }

  async function handleCreate() {
    if (!createForm.title.trim() || !createForm.story.trim() || !createForm.student_id || !supabaseRef.current) return
    setSaving(true)
    const { data } = await supabaseRef.current.from('success_stories').insert({
      student_id: createForm.student_id, title: createForm.title.trim(), story: createForm.story.trim(),
      school_id: schoolId, nominated_by: coordId,
    }).select().maybeSingle()
    if (data) {
      const stud = students.find(s => s.id === createForm.student_id)
      setStories(prev => [{ id: data.id, title: data.title, story: data.story, cover_url: null, published: false, published_at: null, created_at: data.created_at, student_name: stud?.full_name ?? null, school_name: null, project_title: null }, ...prev])
    }
    setCreateForm({ student_id: '', title: '', story: '' }); setShowCreate(false); setSaving(false)
  }

  async function handleLogout() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        .nav{position:sticky;top:0;z-index:30;background:var(--bg);border-bottom:1px solid var(--line);height:62px;display:flex;align-items:center;padding:0 40px;gap:16px;}
        .btn-sm{padding:7px 14px;border:1px solid var(--line);border-radius:999px;font-size:12.5px;font-weight:500;color:var(--ink);cursor:pointer;background:none;transition:all .2s;}
        .btn-sm:hover{border-color:var(--ink);}
        .btn-primary{padding:10px 20px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s;}
        .btn-primary:hover{background:#a93226;}
        .main{max-width:1100px;margin:0 auto;padding:40px 40px 80px;}
        .grid{display:grid;grid-template-columns:1fr 380px;gap:20px;}
        .panel{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;}
        .story-row{padding:14px 0;border-bottom:1px solid var(--line-soft);cursor:pointer;transition:background .1s;}
        .story-row:hover{background:rgba(192,57,43,.03);}
        .story-row.sel{background:rgba(192,57,43,.04);}
        .story-row:last-child{border-bottom:none;}
        .field{display:flex;flex-direction:column;gap:5px;}
        .field label{font-size:11.5px;font-weight:600;color:var(--mute);letter-spacing:.06em;text-transform:uppercase;}
        .field input,.field textarea,.field select{padding:9px 12px;border:1px solid var(--line);border-radius:9px;font-size:13.5px;font-family:inherit;outline:none;background:var(--bg-2);color:var(--ink);}
        .field input:focus,.field textarea:focus,.field select:focus{border-color:#C0392B;outline:none;}
        @media(max-width:900px){.grid{grid-template-columns:1fr;}}
      `}</style>

      <nav className="nav">
        <a href="/coordinator" style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ink)', textDecoration: 'none' }}>Big Family</a>
        <span style={{ fontSize: 12, color: 'var(--mute)' }}>→ Historias de Éxito</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--mute)' }}>{coordName}</span>
          <button className="btn-primary" onClick={() => setShowCreate(s => !s)}>
            {showCreate ? '× Cancelar' : '+ Nominar historia'}
          </button>
          <button className="btn-sm" onClick={() => router.push('/coordinator')}>Panel</button>
          <button className="btn-sm" onClick={handleLogout}>Salir</button>
        </div>
      </nav>

      <motion.div className="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <h1 style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 24 }}>Historias de Éxito</h1>

        <AnimatePresence>
          {showCreate && (
            <motion.div key="form" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={springNatural} style={{ overflow: 'hidden', marginBottom: 20 }}>
              <div className="panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Estudiante *</label>
                  <select value={createForm.student_id} onChange={e => setCreateForm(f => ({ ...f, student_id: e.target.value }))}>
                    <option value="">— Selecciona —</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Título *</label>
                  <input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="Título de la historia" />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Historia *</label>
                  <textarea value={createForm.story} onChange={e => setCreateForm(f => ({ ...f, story: e.target.value }))} rows={5} style={{ resize: 'vertical', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-2)', color: 'var(--ink)' }} placeholder="Describe el logro y el impacto..." />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                  <button className="btn-primary" onClick={handleCreate} disabled={!createForm.title.trim() || !createForm.story.trim() || !createForm.student_id || saving}>
                    {saving ? 'Guardando…' : 'Nominar historia'}
                  </button>
                  <button onClick={() => setShowCreate(false)} style={{ padding: '10px 18px', border: '1px solid var(--line)', borderRadius: 10, background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--mute)' }}>Cancelar</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid">
          <div className="panel">
            <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Todas las nominaciones</div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3].map(i => <Sk key={i} h={60} r={10} />)}
              </div>
            ) : stories.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--mute)' }}>Sin nominaciones todavía.</p>
            ) : stories.map(s => (
              <div key={s.id} className={`story-row ${selected?.id === s.id ? 'sel' : ''}`} onClick={() => setSelected(s)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{s.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: s.published ? '#D1FAE5' : 'rgba(192,57,43,.1)', color: s.published ? '#065F46' : '#C0392B' }}>
                    {s.published ? 'Publicada' : 'En revisión'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 3 }}>
                  {s.student_name && <span>{s.student_name}</span>}
                  {s.school_name && <span style={{ marginLeft: 8 }}>· {s.school_name}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
              {selected ? selected.title : 'Selecciona una historia'}
            </div>
            {!selected ? (
              <p style={{ fontSize: 13, color: 'var(--mute)' }}>Haz clic en una historia para ver detalles y publicarla.</p>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springNatural}>
                  {selected.cover_url && <img src={selected.cover_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }} />}
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 14, maxHeight: 180, overflow: 'auto' }}>{selected.story}</div>
                  <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 2, marginBottom: 14 }}>
                    {selected.student_name && <div>👤 {selected.student_name}</div>}
                    {selected.school_name && <div>🏫 {selected.school_name}</div>}
                    {selected.project_title && <div>📁 {selected.project_title}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {!selected.published ? (
                      <button
                        onClick={() => handlePublish(selected.id, true)}
                        disabled={publishing === selected.id}
                        style={{ padding: '10px 18px', background: '#065F46', border: 'none', borderRadius: 10, color: '#fff', fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: publishing === selected.id ? 0.5 : 1 }}
                      >
                        {publishing === selected.id ? '…' : '✓ Publicar'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePublish(selected.id, false)}
                        disabled={publishing === selected.id}
                        style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--mute)', fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: publishing === selected.id ? 0.5 : 1 }}
                      >
                        Despublicar
                      </button>
                    )}
                    <a href={`/success-stories/${selected.id}`} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 18px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, color: 'var(--ink)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      Ver página
                    </a>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}
