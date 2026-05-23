'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { showToast, ToastContainer } from '@/components/Toast'

// ── Types ─────────────────────────────────────────────────────────────────────
interface TLEvent {
  id:          string
  title:       string
  description: string | null
  event_date:  string
  image_url:   string | null
  created_by:  string | null
  created_at:  string
}

interface FormState {
  title:       string
  description: string
  event_date:  string
  image_url:   string
}

const EMPTY: FormState = { title: '', description: '', event_date: '', image_url: '' }

// ── Confetti burst ────────────────────────────────────────────────────────────
function fireConfetti() {
  if (typeof window === 'undefined') return
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;'
  document.body.appendChild(wrap)
  const colors = ['#C0392B', '#0D0D0D', '#F5F3EF', '#FCD34D', '#60A5FA', '#34D399']
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div')
    const size = 6 + Math.random() * 8
    const xStart = 30 + Math.random() * 40
    const xDrift = (Math.random() - 0.5) * 260
    const yUp = -(80 + Math.random() * 180)
    const delay = Math.random() * 0.4
    p.style.cssText = `
      position:absolute;width:${size}px;height:${size}px;
      left:${xStart}%;top:50%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      animation:cf-fly ${1.2 + Math.random() * 1.4}s ease-in ${delay}s forwards;
      --dx:${xDrift}px;--dy:${yUp}px;
    `
    wrap.appendChild(p)
  }
  if (!document.getElementById('cf-style')) {
    const s = document.createElement('style')
    s.id = 'cf-style'
    s.textContent = '@keyframes cf-fly{0%{transform:translate(0,0) rotate(0deg);opacity:1}100%{transform:translate(var(--dx),calc(var(--dy) + 500px)) rotate(540deg);opacity:0}}'
    document.head.appendChild(s)
  }
  setTimeout(() => wrap.remove(), 2800)
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CoordinatorTimelinePage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,     setLoading]     = useState(true)
  const [events,      setEvents]      = useState<TLEvent[]>([])
  const [coordId,     setCoordId]     = useState<string | null>(null)
  const [showForm,    setShowForm]    = useState(false)
  const [editId,      setEditId]      = useState<string | null>(null)
  const [form,        setForm]        = useState<FormState>(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [flashId,     setFlashId]     = useState<string | null>(null)

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role !== 'coordinator') { router.replace('/dashboard'); return }
      setCoordId(user.id)
      await loadEvents(supabase)
      setLoading(false)
    }
    boot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadEvents(sb: ReturnType<typeof createClient>) {
    const { data } = await sb
      .from('timeline_events')
      .select('id, title, description, event_date, image_url, created_by, created_at')
      .order('event_date', { ascending: true })
    setEvents(data ?? [])
  }

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openAdd() {
    setEditId(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(ev: TLEvent) {
    setEditId(ev.id)
    setForm({
      title:       ev.title,
      description: ev.description ?? '',
      event_date:  ev.event_date,
      image_url:   ev.image_url ?? '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.title.trim() || !form.event_date) {
      showToast('error', 'Título y fecha son obligatorios')
      return
    }
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    setSaving(true)

    const payload = {
      title:       form.title.trim(),
      description: form.description.trim() || null,
      event_date:  form.event_date,
      image_url:   form.image_url.trim() || null,
    }

    if (editId) {
      const { error } = await supabase.from('timeline_events').update(payload).eq('id', editId)
      setSaving(false)
      if (error) { showToast('error', 'Error al guardar'); return }
      setEvents(prev => prev.map(e => e.id === editId ? { ...e, ...payload } : e))
      showToast('success', 'Hito actualizado ✓')
      setFlashId(editId)
    } else {
      const { data, error } = await supabase
        .from('timeline_events')
        .insert({ ...payload, created_by: coordId })
        .select('id, title, description, event_date, image_url, created_by, created_at')
        .maybeSingle()
      setSaving(false)
      if (error || !data) { showToast('error', 'Error al guardar'); return }
      setEvents(prev => [...prev, data].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      showToast('success', '¡Hito agregado!')
      setFlashId(data.id)
      fireConfetti()
    }

    setTimeout(() => setFlashId(null), 1200)
    closeForm()
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    setDeletingId(id)
    const { error } = await supabase.from('timeline_events').delete().eq('id', id)
    setDeletingId(null)
    if (error) { showToast('error', 'Error al eliminar'); return }
    setEvents(prev => prev.filter(e => e.id !== id))
    showToast('info', 'Hito eliminado')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg,#F5F3EF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', color: '#6B6B6B', fontSize: 14 }}>
        Verificando acceso…
      </div>
    )
  }

  return (
    <>
      <style>{`
                *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Inter",system-ui,sans-serif;min-height:100vh;color:var(--ink);}
        .ct-nav{position:sticky;top:0;z-index:30;background:rgba(245,243,239,.88);backdrop-filter:saturate(150%) blur(16px);border-bottom:1px solid rgba(13,13,13,.08);height:62px;display:flex;align-items:center;padding:0 40px;gap:16px;}
        .ct-brand{display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;color:var(--ink,#0D0D0D);}
        .ct-spacer{flex:1;}
        .ct-badge{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;background:#FFF4E6;color:#7A4A00;border:1px solid #FFD699;border-radius:999px;padding:3px 10px;font-weight:700;font-family:"Satoshi",sans-serif;}
        .ct-btn{padding:9px 20px;border-radius:999px;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13.5px;cursor:pointer;transition:all .18s;}
        .ct-btn--primary{background:#0D0D0D;color:#fff;}
        .ct-btn--primary:hover{background:#333;}
        .ct-btn--ghost{background:transparent;border:1px solid rgba(13,13,13,.15);color:#6B6B6B;}
        .ct-btn--ghost:hover{border-color:#0D0D0D;color:#0D0D0D;}
        .ct-btn--danger{background:transparent;border:1px solid rgba(192,57,43,.3);color:#C0392B;font-size:12px;padding:6px 14px;}
        .ct-btn--danger:hover{background:rgba(192,57,43,.06);}
        .ct-btn--edit{background:transparent;border:1px solid rgba(13,13,13,.15);color:#6B6B6B;font-size:12px;padding:6px 14px;}
        .ct-btn--edit:hover{border-color:#0D0D0D;color:#0D0D0D;}
        .ct-main{max-width:800px;margin:0 auto;padding:44px 40px 100px;}
        .ct-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:32px;}
        .ct-header h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:26px;letter-spacing:-.022em;}
        .ct-header p{margin-top:4px;font-size:13px;color:#6B6B6B;}
        .ct-form{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.07));border-radius:16px;padding:28px 32px;margin-bottom:32px;box-shadow:0 2px 16px -6px rgba(13,13,13,.1);}
        .ct-form h2{font-family:"Satoshi",sans-serif;font-weight:700;font-size:17px;margin-bottom:20px;}
        .ct-field{margin-bottom:18px;}
        .ct-label{display:block;font-size:12.5px;font-weight:600;color:#2D2D2D;margin-bottom:6px;}
        .ct-input{width:100%;padding:12px 14px;border:1.5px solid rgba(13,13,13,.12);border-radius:10px;font-size:14px;font-family:inherit;outline:none;background:var(--bg,#F5F3EF);color:var(--ink,#0D0D0D);transition:border-color .18s;}
        .ct-input:focus{border-color:#C0392B;}
        .ct-textarea{min-height:90px;resize:vertical;line-height:1.65;}
        .ct-form-row{display:flex;gap:10px;justify-content:flex-end;margin-top:24px;}
        .ct-list{display:flex;flex-direction:column;gap:14px;}
        .ct-event-card{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.07));border-radius:14px;padding:20px 24px;box-shadow:0 2px 8px -4px rgba(13,13,13,.07);display:flex;align-items:center;gap:20px;transition:box-shadow .2s;}
        .ct-event-card:hover{box-shadow:0 4px 20px -6px rgba(13,13,13,.12);}
        .ct-event-year{font-family:"Courier New",monospace;font-size:11px;letter-spacing:.14em;color:#C0392B;margin-bottom:4px;flex-shrink:0;}
        .ct-event-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:var(--ink,#0D0D0D);}
        .ct-event-desc{font-size:12.5px;color:#6B6B6B;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px;}
        .ct-event-img{width:56px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;}
        .ct-actions{margin-left:auto;display:flex;gap:8px;flex-shrink:0;}
        .ct-empty{text-align:center;padding:60px 0;color:#9a9690;font-size:13.5px;}
        @media(max-width:600px){.ct-nav{padding:0 20px;}.ct-main{padding:28px 20px 80px;}.ct-event-desc{display:none;}}
      `}</style>

      {/* Nav */}
      <nav className="ct-nav">
        <a className="ct-brand" href="/">
          <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          Big Family
        </a>
        <div className="ct-spacer" />
        <span className="ct-badge">Coordinador</span>
        <button className="ct-btn ct-btn--ghost" onClick={() => router.push('/coordinator')}>Panel</button>
      </nav>

      <main className="ct-main">
        {/* Header */}
        <div className="ct-header">
          <div>
            <h1>Historia del Programa</h1>
            <p>Gestiona los hitos de la línea de tiempo global · <a href="/timeline" target="_blank" rel="noopener noreferrer" style={{ color: '#C0392B', textDecoration: 'none' }}>Ver pública →</a></p>
          </div>
          <button className="ct-btn ct-btn--primary" onClick={openAdd}>+ Agregar hito</button>
        </div>

        {/* Add/Edit form — AnimatePresence slide down */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 28 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="ct-form">
                <h2>{editId ? 'Editar hito' : 'Nuevo hito'}</h2>

                <div className="ct-field">
                  <label className="ct-label">Título *</label>
                  <input className="ct-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nombre del hito" autoFocus />
                </div>

                <div className="ct-field">
                  <label className="ct-label">Descripción</label>
                  <textarea className="ct-input ct-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve…" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="ct-field">
                    <label className="ct-label">Fecha *</label>
                    <input className="ct-input" type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                  </div>
                  <div className="ct-field">
                    <label className="ct-label">URL de imagen (opcional)</label>
                    <input className="ct-input" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://…" />
                  </div>
                </div>

                <div className="ct-form-row">
                  <button className="ct-btn ct-btn--ghost" onClick={closeForm} disabled={saving}>Cancelar</button>
                  <button
                    className="ct-btn ct-btn--primary"
                    onClick={handleSave}
                    disabled={saving || !form.title.trim() || !form.event_date}
                    style={{ minWidth: 120, opacity: saving ? .6 : 1 }}
                  >
                    {saving ? 'Guardando…' : (editId ? 'Guardar cambios' : 'Guardar hito')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Events list */}
        {events.length === 0 ? (
          <div className="ct-empty">
            No hay hitos aún. ¡Agrega el primero!
          </div>
        ) : (
          <div className="ct-list">
            <AnimatePresence mode="popLayout">
              {events.map(ev => {
                const year  = new Date(ev.event_date + 'T12:00:00').getFullYear()
                const label = new Date(ev.event_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                const isFlashing = flashId === ev.id

                return (
                  <motion.div
                    key={ev.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                    className="ct-event-card"
                    style={{
                      outline: isFlashing ? '2px solid #C0392B' : '2px solid transparent',
                      background: isFlashing ? 'rgba(192,57,43,.05)' : undefined,
                      transition: 'outline .3s, background .3s',
                    }}
                  >
                    {ev.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.image_url} alt="" className="ct-event-img" />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="ct-event-year">{year} · {label}</div>
                      <div className="ct-event-title">{ev.title}</div>
                      {ev.description && <div className="ct-event-desc">{ev.description}</div>}
                    </div>
                    <div className="ct-actions">
                      <button className="ct-btn ct-btn--edit" onClick={() => openEdit(ev)}>Editar</button>
                      <button
                        className="ct-btn ct-btn--danger"
                        onClick={() => handleDelete(ev.id)}
                        disabled={deletingId === ev.id}
                      >
                        {deletingId === ev.id ? '…' : 'Eliminar'}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <ToastContainer />
    </>
  )
}
