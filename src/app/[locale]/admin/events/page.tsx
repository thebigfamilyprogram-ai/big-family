'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { m, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'
import AppSidebar from '@/components/AppSidebar'

const SCHOOL_NAMES_FALLBACK = [
  'IE Técnica María Inmaculada', 'Instituto Pedagógico', 'IE Comfamiliar',
  'Centro Etnoeducativo Ware Waren', 'IE Paulo VI', 'IE Camino al Futuro',
  'IE Colombia Mía', 'IE El Carmelo',
]

interface SchoolOption { id: string; name: string }

interface AdminEvent {
  id:                string
  title:             string
  description:       string | null
  location:          string | null
  meeting_link:      string | null
  event_date:        string
  event_time:        string | null
  is_recurring:       boolean
  audience_schools:   string[]
}

interface RsvpCounts { confirmed: number; declined: number; pending: number }

interface AttendanceRow {
  user_id:      string
  display_name: string | null
  school_name:  string | null
  status:       'confirmed' | 'declined' | 'pending'
}

const EMPTY_FORM = {
  title: '', description: '', event_date: '', event_time: '',
  location: '', meeting_link: '',
}

export default function AdminEventsPage() {
  const router       = useRouter()
  const t            = useTranslations('events')
  const tCommon      = useTranslations('common')
  const supabaseRef  = useRef<ReturnType<typeof createClient> | null>(null)

  const [userName,    setUserName]    = useState('Admin')
  const [userInitial, setUserInitial] = useState('A')
  const [userId,      setUserId]      = useState('')
  const [loading,     setLoading]     = useState(true)

  const [schools, setSchools] = useState<SchoolOption[]>([])

  const [form, setForm]                         = useState(EMPTY_FORM)
  const [isRecurring, setIsRecurring]            = useState(false)
  const [intervalDays, setIntervalDays]          = useState(14)
  const [sessionCount, setSessionCount]          = useState(6)
  const [selectedSchools, setSelectedSchools]    = useState<string[]>([])
  const [audience, setAudience]                  = useState<'all' | 'students' | 'coordinators'>('all')
  const [submitting, setSubmitting]              = useState(false)
  const [toast, setToast]                        = useState<string | null>(null)

  const [events, setEvents]               = useState<AdminEvent[]>([])
  const [rsvpCounts, setRsvpCounts]       = useState<Record<string, RsvpCounts>>({})
  const [expanded, setExpanded]           = useState<string | null>(null)
  const [attendance, setAttendance]       = useState<AttendanceRow[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [deletingId, setDeletingId]       = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (MOCK_MODE) {
        setUserName('Luis Barrios')
        setUserInitial('L')
        setSchools(SCHOOL_NAMES_FALLBACK.map((name, i) => ({ id: `mock-school-${i}`, name })))
        const today = new Date()
        const mk = (offsetDays: number, idx: number): AdminEvent => {
          const d = new Date(today); d.setDate(d.getDate() + offsetDays)
          return {
            id: `mock-event-${idx}`,
            title: ['Taller de Liderazgo Regional', 'Reunión de Coordinadores', 'Ceremonia de Certificación'][idx],
            description: 'Evento de ejemplo en modo demo.',
            location: idx === 0 ? 'Colegio Albania — Sala de reuniones' : null,
            meeting_link: idx === 1 ? 'https://meet.google.com/abc-defg-hij' : null,
            event_date: d.toISOString().slice(0, 10),
            event_time: '15:00',
            is_recurring: idx === 1,
            audience_schools: [],
          }
        }
        const mockEvents = [mk(3, 0), mk(7, 1), mk(14, 2)]
        setEvents(mockEvents)
        setRsvpCounts({
          'mock-event-0': { confirmed: 12, declined: 3, pending: 8 },
          'mock-event-1': { confirmed: 5,  declined: 0, pending: 2 },
          'mock-event-2': { confirmed: 20, declined: 1, pending: 4 },
        })
        setLoading(false)
        return
      }

      if (!supabaseRef.current) supabaseRef.current = createClient()
      const sb = supabaseRef.current
      if (!sb) return

      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await sb.from('profiles').select('display_name, role').eq('id', user.id).maybeSingle()
      if (!profile || profile.role !== 'admin') { router.replace('/dashboard'); return }

      setUserId(user.id)
      setUserName(profile.display_name ?? user.email ?? 'Admin')
      setUserInitial((profile.display_name ?? user.email ?? 'A')[0]?.toUpperCase() ?? 'A')

      const { data: schoolRows } = await sb.from('schools').select('id, name').order('name')
      setSchools(schoolRows ?? [])

      await loadEvents(sb, user.id)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadEvents(sb: ReturnType<typeof createClient>, adminId: string) {
    if (!sb) return
    const today = new Date().toISOString().slice(0, 10)
    const { data: evs } = await sb
      .from('calendar_events')
      .select('id, title, description, location, meeting_link, event_date, event_time, is_recurring, audience_schools')
      .eq('created_by', adminId)
      .gte('event_date', today)
      .order('event_date')

    setEvents(evs ?? [])
    if (!evs?.length) return

    const { data: rsvps } = await sb
      .from('event_rsvps')
      .select('event_id, status')
      .in('event_id', evs.map((e: { id: string }) => e.id))

    const counts: Record<string, RsvpCounts> = {}
    evs.forEach((e: { id: string }) => { counts[e.id] = { confirmed: 0, declined: 0, pending: 0 } })
    rsvps?.forEach((r: { event_id: string; status: string }) => {
      const c = counts[r.event_id]
      if (c && r.status in c) c[r.status as keyof RsvpCounts]++
    })
    setRsvpCounts(counts)
  }

  function toggleSchool(id: string) {
    setSelectedSchools(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function selectAllSchools() {
    setSelectedSchools(schools.map(s => s.id))
  }

  function selectAlbaniaOnly() {
    const albania = schools.filter(s => s.name.toLowerCase().includes('albania'))
    setSelectedSchools(albania.length ? albania.map(s => s.id) : selectedSchools)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.event_date || !form.event_time || selectedSchools.length === 0) return
    setSubmitting(true)
    setToast(null)

    const audienceRoles = audience === 'students' ? ['student']
      : audience === 'coordinators' ? ['coordinator']
      : ['student', 'coordinator']

    try {
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          event_date: form.event_date,
          event_time: form.event_time,
          location: form.location.trim() || undefined,
          meeting_link: form.meeting_link.trim() || undefined,
          audience_schools: selectedSchools,
          audience_roles: audienceRoles,
          is_recurring: isRecurring,
          recurrence_interval_days: isRecurring ? intervalDays : undefined,
          recurrence_count: isRecurring ? sessionCount : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'error')

      setToast(t('successToast', { count: json.notified_count }))
      setForm(EMPTY_FORM)
      setSelectedSchools([])
      setIsRecurring(false)
      setAudience('all')

      if (!MOCK_MODE && supabaseRef.current) await loadEvents(supabaseRef.current, userId)
    } catch (err) {
      console.error('[admin/events] create error:', err)
      setToast(null)
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    if (!MOCK_MODE && supabaseRef.current) {
      await supabaseRef.current.from('calendar_events').delete().eq('id', id)
    }
    setEvents(prev => prev.filter(e => e.id !== id))
    setDeletingId(null)
  }

  async function toggleAttendance(eventId: string) {
    if (expanded === eventId) { setExpanded(null); return }
    setExpanded(eventId)
    if (MOCK_MODE) {
      setAttendance([
        { user_id: '1', display_name: 'Valentina Torres', school_name: 'IE Técnica María Inmaculada', status: 'confirmed' },
        { user_id: '2', display_name: 'Carlos Pérez',      school_name: 'IE Comfamiliar',              status: 'declined' },
        { user_id: '3', display_name: 'María González',    school_name: 'IE Paulo VI',                 status: 'pending'  },
      ])
      return
    }
    if (!supabaseRef.current) return
    setAttendanceLoading(true)
    const { data: rsvps } = await supabaseRef.current
      .from('event_rsvps').select('user_id, status').eq('event_id', eventId)
    if (rsvps?.length) {
      const userIds = rsvps.map((r: { user_id: string }) => r.user_id)
      const { data: profiles } = await supabaseRef.current
        .from('profiles').select('id, display_name, school_id').in('id', userIds)
      const { data: schoolRows } = await supabaseRef.current.from('schools').select('id, name')
      const schoolMap = new Map((schoolRows ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))
      const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))
      setAttendance(rsvps.map((r: { user_id: string; status: string }) => {
        const p = profileMap.get(r.user_id) as { display_name: string | null; school_id: string | null } | undefined
        return {
          user_id: r.user_id,
          display_name: p?.display_name ?? null,
          school_name: p?.school_id ? (schoolMap.get(p.school_id) ?? null) : null,
          status: r.status as AttendanceRow['status'],
        }
      }))
    } else {
      setAttendance([])
    }
    setAttendanceLoading(false)
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', width: '100%', background: 'var(--bg,#F5F3EF)' }}>
      <style>{`
        .ev-input{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-family:"Satoshi",sans-serif;font-size:14px;color:var(--ink);background:var(--card-bg);}
        .ev-label{display:block;font-family:"Satoshi",sans-serif;font-size:12px;font-weight:600;color:var(--mute);margin-bottom:6px;}
        .ev-field{margin-bottom:16px;}
        .ev-school-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);font-family:"Satoshi",sans-serif;font-size:12.5px;cursor:pointer;background:var(--card-bg);color:var(--ink-2);}
        .ev-school-chip--active{border-color:#C0392B;background:rgba(192,57,43,0.08);color:#C0392B;}
        .ev-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:18px;margin-bottom:14px;}
      `}</style>

      <AppSidebar role="admin" userName={userName} userInitial={userInitial} />

      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: 32 }}>
        <h1 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--ink)', marginBottom: 24 }}>
          {t('adminTitle')}
        </h1>

        {loading ? (
          <div style={{ color: 'var(--mute)', fontFamily: '"Satoshi",sans-serif' }}>{tCommon('loading')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,420px) 1fr', gap: 24, alignItems: 'start' }}>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="ev-card">
              <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 16 }}>
                {t('createTitle')}
              </h2>

              <div className="ev-field">
                <label className="ev-label">{t('fieldTitle')}</label>
                <input className="ev-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div className="ev-field">
                <label className="ev-label">{t('fieldDescription')}</label>
                <textarea className="ev-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="ev-field">
                  <label className="ev-label">{t('fieldDate')}</label>
                  <input className="ev-input" type="date" required value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                </div>
                <div className="ev-field">
                  <label className="ev-label">{t('fieldTime')}</label>
                  <input className="ev-input" type="time" required value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} />
                </div>
              </div>

              <div className="ev-field">
                <label className="ev-label">{t('fieldLocation')}</label>
                <input className="ev-input" placeholder="Colegio Albania — Sala de reuniones" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>

              <div className="ev-field">
                <label className="ev-label">{t('fieldMeetLink')}</label>
                <input className="ev-input" type="url" placeholder="https://meet.google.com/..." value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} />
              </div>

              <div className="ev-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                <label htmlFor="recurring" style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 13, color: 'var(--ink-2)' }}>{t('recurringToggle')}</label>
              </div>

              <AnimatePresence>
                {isRecurring && (
                  <m.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="ev-field">
                        <label className="ev-label">{t('repeatEvery')} ({t('daysSuffix')})</label>
                        <input className="ev-input" type="number" min={1} value={intervalDays} onChange={e => setIntervalDays(Number(e.target.value))} />
                      </div>
                      <div className="ev-field">
                        <label className="ev-label">{t('createSessions')}</label>
                        <select className="ev-input" value={sessionCount} onChange={e => setSessionCount(Number(e.target.value))}>
                          {[4, 6, 8, 12].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>

              <div className="ev-field">
                <label className="ev-label">{t('schoolsLabel')}</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button type="button" onClick={selectAllSchools} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 999, border: '1px solid var(--line)', background: 'none', cursor: 'pointer', color: 'var(--mute)' }}>{t('selectAll')}</button>
                  <button type="button" onClick={selectAlbaniaOnly} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 999, border: '1px solid var(--line)', background: 'none', cursor: 'pointer', color: 'var(--mute)' }}>{t('onlyAlbania')}</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {schools.map(s => (
                    <div
                      key={s.id}
                      className={`ev-school-chip${selectedSchools.includes(s.id) ? ' ev-school-chip--active' : ''}`}
                      onClick={() => toggleSchool(s.id)}
                    >
                      {s.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="ev-field">
                <label className="ev-label">{t('audienceLabel')}</label>
                <div style={{ display: 'flex', gap: 14 }}>
                  {([['all', t('audienceAll')], ['students', t('audienceStudents')], ['coordinators', t('audienceCoordinators')]] as const).map(([val, label]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: '"Satoshi",sans-serif', fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
                      <input type="radio" name="audience" checked={audience === val} onChange={() => setAudience(val)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', marginTop: 8, padding: '12px 20px', borderRadius: 999, border: 'none',
                  background: '#C0392B', color: '#fff', fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14,
                  cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
                }}
              >
                {t('submitButton')}
              </button>

              <AnimatePresence>
                {toast && (
                  <m.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(15,123,108,0.1)', color: 'var(--accent-teal,#0F7B6C)', fontFamily: '"Satoshi",sans-serif', fontSize: 13, fontWeight: 600 }}
                  >
                    {toast}
                  </m.div>
                )}
              </AnimatePresence>
            </form>

            {/* ── Events list ── */}
            <div>
              <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 16 }}>
                {t('upcomingSection')}
              </h2>

              {events.length === 0 ? (
                <div style={{ color: 'var(--mute)', fontFamily: '"Satoshi",sans-serif', fontSize: 14 }}>{t('noUpcoming')}</div>
              ) : events.map(ev => {
                const counts = rsvpCounts[ev.id] ?? { confirmed: 0, declined: 0, pending: 0 }
                return (
                  <div key={ev.id} className="ev-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{ev.title}</span>
                          {ev.is_recurring && (
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--accent-amber,#D4821A)', background: 'rgba(212,130,26,0.1)', borderRadius: 999, padding: '2px 8px' }}>
                              {t('recurrentBadge')}
                            </span>
                          )}
                        </div>
                        <div style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 13, color: 'var(--mute)', marginTop: 4 }}>
                          {ev.event_date} · {ev.event_time}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        disabled={deletingId === ev.id}
                        style={{ fontSize: 12, color: '#991B1B', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      >
                        {t('delete')}
                      </button>
                    </div>

                    <div style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 12.5, color: 'var(--ink-2)', marginTop: 10 }}>
                      {t('confirmedCount', { count: counts.confirmed })} · {t('declinedCount', { count: counts.declined })} · {t('pendingCount', { count: counts.pending })}
                    </div>

                    <button
                      onClick={() => toggleAttendance(ev.id)}
                      style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {t('viewAttendance')} {expanded === ev.id ? '▲' : '▼'}
                    </button>

                    <AnimatePresence>
                      {expanded === ev.id && (
                        <m.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {attendanceLoading ? (
                              <span style={{ fontSize: 12, color: 'var(--mute)' }}>{tCommon('loading')}</span>
                            ) : attendance.map(a => (
                              <div key={a.user_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontFamily: '"Satoshi",sans-serif' }}>
                                <span style={{ color: 'var(--ink-2)' }}>{a.display_name ?? '—'} <span style={{ color: 'var(--mute)' }}>· {a.school_name ?? '—'}</span></span>
                                <span style={{
                                  color: a.status === 'confirmed' ? '#065F46' : a.status === 'declined' ? '#991B1B' : 'var(--mute)',
                                  fontWeight: 600,
                                }}>
                                  {a.status === 'confirmed' ? '✓' : a.status === 'declined' ? '✗' : '·'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
