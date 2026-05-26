'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DashboardSidebar from '@/components/DashboardSidebar'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { springNatural } from '@/lib/animations'

interface CalendarEvent {
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

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function CalendarPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()

  const today = new Date()
  const [year,     setYear]     = useState(today.getFullYear())
  const [month,    setMonth]    = useState(today.getMonth())
  const [events,   setEvents]   = useState<CalendarEvent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [userName, setUserName] = useState('…')
  const [userInit, setUserInit] = useState('L')

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function load() {
      const { data: { user } } = await sb!.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await sb!.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      setUserName(profile?.full_name ?? 'Líder')
      setUserInit((profile?.full_name ?? 'L')[0].toUpperCase())

      const { data } = await sb!.from('calendar_events').select('*').order('event_date')
      setEvents(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const eventsByDate: Record<string, CalendarEvent[]> = {}
  events.forEach(e => {
    const d = e.event_date.slice(0, 10)
    if (!eventsByDate[d]) eventsByDate[d] = []
    eventsByDate[d].push(e)
  })

  const upcoming = [...events]
    .filter(e => new Date(e.event_date) >= new Date(today.toDateString()))
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 5)

  function prevMonth() { setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11 } return m - 1 }) }
  function nextMonth() { setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0 } return m + 1 }) }

  return (
    <>
      <style>{`
        
        .layout{display:grid;grid-template-columns:260px 1fr;min-height:100vh;max-width:1280px;margin:0 auto;}
        .content{padding:32px 28px;display:flex;flex-direction:column;gap:20px;min-width:0;}
        .page-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:26px;letter-spacing:-0.02em;color:var(--ink);}
        .card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;box-shadow:0 2px 16px -6px rgba(13,13,13,.08);}
        .cal-layout{display:grid;grid-template-columns:1fr 280px;gap:20px;}
        .cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
        .cal-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);}
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
        .upcoming-item{padding:12px 0;border-bottom:1px solid var(--line-soft);}
        .upcoming-item:last-child{border-bottom:none;}
        .ev-date{font-size:10.5px;font-weight:700;color:#C0392B;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px;}
        .ev-title{font-family:"Satoshi",sans-serif;font-weight:600;font-size:13.5px;color:var(--ink);}
        .ev-loc{font-size:12px;color:var(--mute);margin-top:2px;}
        @media(max-width:960px){.cal-layout{grid-template-columns:1fr;}.layout{grid-template-columns:1fr;}}
        @media(max-width:768px){.cal-cell{aspect-ratio:auto;min-height:36px;}.cal-num{font-size:11px;}}
      `}</style>

      <div className="layout">
        <DashboardSidebar activePage="calendar" userName={userName} userInitial={userInit} />

        <m.main
          className="content"
          initial={pref ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="page-title">Calendario</div>

          <div className="cal-layout">
            {/* Monthly calendar */}
            <div className="card">
              <div className="cal-header">
                <div className="cal-title">{MONTHS[month]} {year}</div>
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
                      <div
                        key={i}
                        className={`cal-cell ${dayEvents.length > 0 ? 'has-events' : ''} ${isToday ? 'today' : ''}`}
                        style={isTodayCol && !isToday ? { background: 'rgba(192,57,43,.04)' } : undefined}
                        onClick={() => dayEvents.length > 0 && setSelected(dayEvents[0])}
                      >
                        <span className="cal-num">{day}</span>
                        {dayEvents.length > 0 && (
                          <div className="cal-dots">
                            {dayEvents.slice(0, 3).map((_, j) => <span key={j} className="cal-dot" />)}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {/* Upcoming events */}
            <div className="card">
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                Próximos eventos
                {upcoming.length > 0 && (
                  <span style={{ padding: '2px 8px', background: 'rgba(192,57,43,.1)', color: '#C0392B', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{upcoming.length}</span>
                )}
              </div>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: 48, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite', borderRadius: 8 }} />)}
                </div>
              ) : upcoming.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--mute)' }}>No hay eventos próximos.</p>
              ) : upcoming.map(ev => (
                <div key={ev.id} className="upcoming-item" style={{ cursor: 'pointer' }} onClick={() => setSelected(ev)}>
                  <div className="ev-date">{new Date(ev.event_date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  <div className="ev-title">{ev.title}</div>
                  {ev.location && <div className="ev-loc">📍 {ev.location}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Event detail slide-in */}
          <AnimatePresence>
            {selected && (
              <m.div
                key={selected.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={springNatural}
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: 24, boxShadow: '0 2px 16px -6px rgba(13,13,13,.08)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--ink)' }}>{selected.title}</div>
                  <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--mute)', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 13, color: 'var(--mute)' }}>
                  <span>📅 {new Date(selected.event_date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  {selected.event_time && <span>🕐 {selected.event_time.slice(0, 5)}</span>}
                  {selected.location && <span>📍 {selected.location}</span>}
                </div>
                {selected.description && <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 12 }}>{selected.description}</p>}
                {selected.meeting_link && (
                  <a href={selected.meeting_link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#C0392B', color: '#fff', borderRadius: 10, fontSize: 13, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, textDecoration: 'none' }}>
                    🔗 Unirse a la reunión
                  </a>
                )}
              </m.div>
            )}
          </AnimatePresence>

        </m.main>
      </div>
    </>
  )
}
