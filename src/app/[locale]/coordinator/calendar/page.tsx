'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase'
import { m, AnimatePresence } from 'framer-motion'
import { springNatural } from '@/lib/animations'

interface CalEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  meeting_link: string | null
  event_date: string
  event_time: string | null
  end_date: string | null
  end_time: string | null
}

const EMPTY_FORM = { title: '', description: '', location: '', meeting_link: '', event_date: '', event_time: '', end_date: '', end_time: '' }

export default function CoordinatorCalendarPage() {
  const router      = useRouter()
  const t           = useTranslations('coordinator.calendar')
  const tCommon     = useTranslations('common')
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const DAYS   = t.raw('days') as string[]
  const MONTHS = t.raw('months') as string[]

  const today = new Date()
  const [year,       setYear]       = useState(today.getFullYear())
  const [month,      setMonth]      = useState(today.getMonth())
  const [events,     setEvents]     = useState<CalEvent[]>([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState<CalEvent | null>(null)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [editing,    setEditing]    = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [userId,     setUserId]     = useState('')
  const [coordName,  setCoordName]  = useState('')

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
      const { data } = await sb!.from('calendar_events').select('*').order('event_date')
      setEvents(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const eventsByDate: Record<string, CalEvent[]> = {}
  events.forEach(e => {
    const d = e.event_date.slice(0, 10)
    if (!eventsByDate[d]) eventsByDate[d] = []
    eventsByDate[d].push(e)
  })

  function prevMonth() { setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11 } return m - 1 }) }
  function nextMonth() { setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0 } return m + 1 }) }

  async function handleSave() {
    if (!form.title.trim() || !form.event_date || !supabaseRef.current) return
    const sb = supabaseRef.current
    setSaving(true)
    const payload = {
      title: form.title.trim(), description: form.description.trim() || null,
      location: form.location.trim() || null, meeting_link: form.meeting_link.trim() || null,
      event_date: form.event_date, event_time: form.event_time || null,
      end_date: form.end_date || null, end_time: form.end_time || null,
      created_by: userId,
    }
    if (editing) {
      const { data } = await sb.from('calendar_events').update(payload).eq('id', editing).select().maybeSingle()
      if (data) setEvents(prev => prev.map(e => e.id === editing ? data : e))
      setEditing(null)
    } else {
      const { data } = await sb.from('calendar_events').insert(payload).select().maybeSingle()
      if (data) setEvents(prev => [...prev, data].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    }
    setForm(EMPTY_FORM); setShowForm(false); setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!supabaseRef.current) return
    setDeleting(id)
    await supabaseRef.current.from('calendar_events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    if (selected?.id === id) setSelected(null)
    setDeleting(null)
  }

  function startEdit(ev: CalEvent) {
    setForm({ title: ev.title, description: ev.description ?? '', location: ev.location ?? '', meeting_link: ev.meeting_link ?? '', event_date: ev.event_date, event_time: ev.event_time ?? '', end_date: ev.end_date ?? '', end_time: ev.end_time ?? '' })
    setEditing(ev.id); setShowForm(true); setSelected(null)
  }

  async function handleLogout() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    await supabaseRef.current.auth.signOut()
    router.push('/login')
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
        .main{max-width:1200px;margin:0 auto;padding:40px 40px 80px;}
        .cal-layout{display:grid;grid-template-columns:1fr 300px;gap:20px;}
        .card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;}
        .cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
        .cal-nav{padding:7px 12px;border:1px solid var(--line);border-radius:8px;background:none;font-size:14px;cursor:pointer;color:var(--ink);transition:all .15s;}
        .cal-nav:hover{background:var(--line);}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
        .cal-day-label{text-align:center;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);padding:6px 0;}
        .cal-cell{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:4px 2px;border-radius:8px;cursor:default;position:relative;}
        .cal-cell.has-events{cursor:pointer;}
        .cal-cell.has-events:hover{background:rgba(192,57,43,.06);}
        .cal-cell.today .cal-num{background:#C0392B;color:#fff;border-radius:999px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;}
        .cal-num{font-size:12.5px;font-weight:500;color:var(--ink);line-height:1.6;}
        .cal-dots{display:flex;gap:2px;flex-wrap:wrap;justify-content:center;margin-top:2px;}
        .cal-dot{width:5px;height:5px;border-radius:50%;background:#C0392B;flex-shrink:0;}
        .field{display:flex;flex-direction:column;gap:5px;}
        .field label{font-size:11.5px;font-weight:600;color:var(--mute);letter-spacing:.06em;text-transform:uppercase;}
        .field input,.field textarea{padding:9px 12px;border:1px solid var(--line);border-radius:9px;font-size:13.5px;font-family:inherit;outline:none;background:var(--bg-2);color:var(--ink);transition:border-color .2s;}
        .field input:focus,.field textarea:focus{border-color:#C0392B;}
        @media(max-width:960px){.cal-layout{grid-template-columns:1fr;}}
        @media(max-width:768px){.cal-cell{aspect-ratio:auto;min-height:36px;}.cal-num{font-size:11px;}}
      `}</style>

      <m.div className="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 28 }}>
        <h1 style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 24 }}>{t('title')}</h1>

        {/* Create/edit form */}
        <AnimatePresence>
          {showForm && (
            <m.div
              key="form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={springNatural}
              style={{ overflow: 'hidden', marginBottom: 20 }}
            >
              <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>{t('formTitleLabel')}</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('eventNamePlaceholder')} />
                </div>
                <div className="field">
                  <label>{t('startDateLabel')}</label>
                  <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                </div>
                <div className="field">
                  <label>{t('startTimeLabel')}</label>
                  <input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} />
                </div>
                <div className="field">
                  <label>{t('endDateLabel')}</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
                <div className="field">
                  <label>{t('endTimeLabel')}</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
                <div className="field">
                  <label>{t('locationLabel')}</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder={t('locationPlaceholder')} />
                </div>
                <div className="field">
                  <label>{t('meetingLinkLabel')}</label>
                  <input value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} placeholder="https://meet.google.com/..." />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>{t('descriptionLabel')}</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ resize: 'vertical', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-2)', color: 'var(--ink)' }} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                  <button className="btn-primary" onClick={handleSave} disabled={!form.title.trim() || !form.event_date || saving}>
                    {saving ? tCommon('saving') : editing ? t('saveChangesBtn') : t('createEventBtn')}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM) }} style={{ padding: '10px 18px', border: '1px solid var(--line)', borderRadius: 10, background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--mute)' }}>{tCommon('cancel')}</button>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <div className="cal-layout">
          <div className="card">
            <div className="cal-header">
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{MONTHS[month]} {year}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="cal-nav" onClick={prevMonth}>←</button>
                <button className="cal-nav" onClick={nextMonth}>→</button>
              </div>
            </div>
            <div className="cal-grid">
              {DAYS.map(d => <div key={d} className="cal-day-label">{d}</div>)}
              {(() => {
                const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
                const todayCol = isCurrentMonth ? today.getDay() : -1
                return cells.map((day, i) => {
                  if (!day) return <div key={i} style={i % 7 === todayCol ? { background: 'rgba(192,57,43,.04)', borderRadius: 8 } : undefined} />
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dayEvents = eventsByDate[dateStr] ?? []
                  const isToday = isCurrentMonth && today.getDate() === day
                  const isTodayCol = i % 7 === todayCol
                  return (
                    <div key={i} className={`cal-cell ${dayEvents.length > 0 ? 'has-events' : ''} ${isToday ? 'today' : ''}`} style={isTodayCol && !isToday ? { background: 'rgba(192,57,43,.04)' } : undefined} onClick={() => dayEvents.length > 0 && setSelected(dayEvents[0])}>
                      <span className="cal-num">{day}</span>
                      {dayEvents.length > 0 && (
                        <div className="cal-dots">{dayEvents.slice(0, 3).map((_, j) => <span key={j} className="cal-dot" />)}</div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* Event detail / upcoming count */}
          <div className="card">
            <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              {selected ? selected.title : t('upcomingEvents')}
              {!selected && events.filter(e => new Date(e.event_date) >= new Date(today.toDateString())).length > 0 && (
                <span style={{ padding: '2px 8px', background: 'rgba(192,57,43,.1)', color: '#C0392B', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                  {events.filter(e => new Date(e.event_date) >= new Date(today.toDateString())).length}
                </span>
              )}
            </div>
            {!selected ? (
              <p style={{ fontSize: 13, color: 'var(--mute)' }}>{t('clickDateHint')}</p>
            ) : (
              <AnimatePresence mode="wait">
                <m.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springNatural}>
                  <div style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 2, marginBottom: 10 }}>
                    <div>📅 {new Date(selected.event_date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    {selected.event_time && <div>🕐 {selected.event_time.slice(0,5)}</div>}
                    {selected.location && <div>📍 {selected.location}</div>}
                  </div>
                  {selected.description && <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 12 }}>{selected.description}</p>}
                  {selected.meeting_link && (
                    <a href={selected.meeting_link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '7px 14px', background: '#C0392B', color: '#fff', borderRadius: 8, fontSize: 12.5, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, textDecoration: 'none', marginBottom: 12 }}>{t('joinLink')}</a>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => startEdit(selected)} style={{ padding: '7px 14px', border: '1px solid var(--line)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--ink)' }}>{tCommon('edit')}</button>
                    <button onClick={() => handleDelete(selected.id)} disabled={deleting === selected.id} style={{ padding: '7px 14px', border: '1px solid #FCA5A5', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 12.5, color: '#991B1B', opacity: deleting === selected.id ? 0.5 : 1 }}>
                      {deleting === selected.id ? '…' : tCommon('delete')}
                    </button>
                  </div>
                </m.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </m.div>
    </div>
  )
}
