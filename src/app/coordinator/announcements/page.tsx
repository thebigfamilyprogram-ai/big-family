'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { m, AnimatePresence } from 'framer-motion'
import { springNatural } from '@/lib/animations'

interface Announcement {
  id: string
  title: string
  content: string
  category: string
  target: string
  created_at: string
  expires_at: string | null
}

interface School { id: string; name: string }

const CATEGORIES = ['Operativo', 'Motivacional', 'Evento', 'Logro'] as const
const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  'Operativo':    { bg: 'rgba(59,130,246,.15)',  color: '#3B82F6' },
  'Motivacional': { bg: 'rgba(34,197,94,.15)',   color: '#16a34a' },
  'Evento':       { bg: 'rgba(192,57,43,.15)',   color: '#C0392B' },
  'Logro':        { bg: 'rgba(245,158,11,.15)',  color: '#d97706' },
}
const EMPTY_FORM = { title: '', content: '', category: 'Operativo' as string, target: 'all', expires_at: '' }

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

export default function CoordinatorAnnouncementsPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,        setLoading]        = useState(true)
  const [announcements,  setAnnouncements]  = useState<Announcement[]>([])
  const [schools,        setSchools]        = useState<School[]>([])
  const [userId,         setUserId]         = useState('')
  const [coordName,      setCoordName]      = useState('')
  const [showForm,       setShowForm]       = useState(false)
  const [editing,        setEditing]        = useState<string | null>(null)
  const [form,           setForm]           = useState(EMPTY_FORM)
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function load() {
      const { data: { user } } = await sb!.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await sb!.from('profiles').select('display_name, role').eq('id', user.id).maybeSingle()
      if (!profile || !['coordinator','admin'].includes(profile.role ?? '')) { router.replace('/dashboard'); return }
      setUserId(user.id); setCoordName(profile.display_name ?? '')
      const [{ data: ann }, { data: sc }] = await Promise.all([
        sb!.from('announcements').select('*').order('created_at', { ascending: false }),
        sb!.from('schools').select('id, name').order('name'),
      ])
      setAnnouncements(ann ?? [])
      setSchools(sc ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim() || !supabaseRef.current) return
    const sb = supabaseRef.current
    setSaving(true)
    const payload = {
      title: form.title.trim(), content: form.content.trim(),
      category: form.category, target: form.target,
      expires_at: form.expires_at || null, created_by: userId,
    }
    if (editing) {
      const { data } = await sb.from('announcements').update(payload).eq('id', editing).select().maybeSingle()
      if (data) setAnnouncements(prev => prev.map(a => a.id === editing ? data : a))
      setEditing(null)
    } else {
      const { data } = await sb.from('announcements').insert(payload).select().maybeSingle()
      if (data) setAnnouncements(prev => [data, ...prev])
    }
    setForm(EMPTY_FORM); setShowForm(false); setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!supabaseRef.current) return
    setDeleting(id)
    await supabaseRef.current.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  function startEdit(ann: Announcement) {
    setForm({ title: ann.title, content: ann.content, category: ann.category, target: ann.target, expires_at: ann.expires_at ? ann.expires_at.slice(0, 10) : '' })
    setEditing(ann.id); setShowForm(true)
  }

  async function handleLogout() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  function isExpired(ann: Announcement) {
    return ann.expires_at ? new Date(ann.expires_at) < new Date() : false
  }

  return (
    <div style={{ flex:1, minWidth:0, overflowY:"auto" }}>
      <style>{`
        
        *{box-sizing:border-box;margin:0;padding:0;}
        .nav{position:sticky;top:0;z-index:30;background:var(--bg);border-bottom:1px solid var(--line);height:62px;display:flex;align-items:center;padding:0 40px;gap:16px;}
        .btn-sm{padding:7px 14px;border:1px solid var(--line);border-radius:999px;font-size:12.5px;font-weight:500;color:var(--ink);cursor:pointer;background:none;transition:all .2s;}
        .btn-sm:hover{border-color:var(--ink);}
        .btn-primary{padding:10px 20px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s;}
        .btn-primary:hover{background:#a93226;}
        .main{max-width:1000px;margin:0 auto;padding:40px 40px 80px;}
        .card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:20px 22px;box-shadow:0 2px 12px -6px rgba(13,13,13,.07);}
        .field{display:flex;flex-direction:column;gap:5px;}
        .field label{font-size:11.5px;font-weight:600;color:var(--mute);letter-spacing:.06em;text-transform:uppercase;}
        .field input,.field textarea,.field select{padding:9px 12px;border:1px solid var(--line);border-radius:9px;font-size:13.5px;font-family:inherit;outline:none;background:var(--bg-2);color:var(--ink);transition:border-color .2s;}
        .field input:focus,.field textarea:focus,.field select:focus{border-color:#C0392B;}
        .ann-item{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:16px 0;border-bottom:1px solid var(--line-soft);}
        .ann-item:last-child{border-bottom:none;}
        .ann-item.expired{opacity:.5;}
      `}</style>

      <m.div className="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 28 }}>
        <h1 style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 24 }}>Anuncios</h1>

        <AnimatePresence>
          {showForm && (
            <m.div key="form" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={springNatural} style={{ overflow: 'hidden', marginBottom: 20 }}>
              <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Título *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título del anuncio" />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Contenido *</label>
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} style={{ resize: 'vertical', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-2)', color: 'var(--ink)' }} placeholder="Escribe el contenido del anuncio..." />
                </div>
                <div className="field">
                  <label>Categoría</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Destinatario</label>
                  <select value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                    <option value="all">Todos los colegios</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Expira el (opcional)</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                  <button className="btn-primary" onClick={handleSave} disabled={!form.title.trim() || !form.content.trim() || saving}>
                    {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar anuncio'}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM) }} style={{ padding: '10px 18px', border: '1px solid var(--line)', borderRadius: 10, background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--mute)' }}>Cancelar</button>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <div className="card">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1,2,3].map(i => <Sk key={i} h={70} r={8} />)}
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--mute)', fontSize: 13 }}>Sin anuncios todavía.</div>
          ) : announcements.map(ann => {
            const catStyle = CATEGORY_STYLES[ann.category] ?? { bg: 'var(--line)', color: 'var(--mute)' }
            const expired = isExpired(ann)
            const targetName = ann.target === 'all' ? 'Todos' : schools.find(s => s.id === ann.target)?.name ?? ann.target
            return (
              <div key={ann.id} className={`ann-item ${expired ? 'expired' : ''}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: catStyle.bg, color: catStyle.color }}>{ann.category}</span>
                    <span style={{ fontSize: 11, color: 'var(--mute)' }}>→ {targetName}</span>
                    {expired && <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 600 }}>Expirado</span>}
                  </div>
                  <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>{ann.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{ann.content}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 4 }}>{new Date(ann.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => startEdit(ann)} style={{ padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink)' }}>Editar</button>
                  <button onClick={() => handleDelete(ann.id)} disabled={deleting === ann.id} style={{ padding: '6px 12px', border: '1px solid #FCA5A5', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 12, color: '#991B1B', opacity: deleting === ann.id ? 0.5 : 1 }}>
                    {deleting === ann.id ? '…' : 'Eliminar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </m.div>
    </div>
  )
}
