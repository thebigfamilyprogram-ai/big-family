'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useScroll, useSpring } from 'framer-motion'
import { createClient } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TimelineEvent {
  id:          string
  title:       string
  description: string | null
  event_date:  string
  image_url:   string | null
  created_at:  string
}

// ── Year count-up ─────────────────────────────────────────────────────────────
function CountYear({ year }: { year: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [val, setVal] = useState(year - 4)
  useEffect(() => {
    if (!inView) return
    const from = year - 4
    const dur = 700
    const start = performance.now()
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1)
      setVal(Math.round(from + (year - from) * (1 - Math.pow(1 - p, 3))))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, year])
  return <span ref={ref}>{val}</span>
}

// ── Pulsing dot ───────────────────────────────────────────────────────────────
function Dot({ isDark }: { isDark: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <motion.div
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
      style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        background: hov ? '#C0392B' : (isDark ? 'rgba(255,255,255,.15)' : 'rgba(13,13,13,.15)'),
        border: '2.5px solid #C0392B',
        boxShadow: hov ? '0 0 0 5px rgba(192,57,43,.2)' : '0 0 0 0px rgba(192,57,43,0)',
        transition: 'background .2s, box-shadow .2s',
      }}
    />
  )
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ ev, index, isDark }: { ev: TimelineEvent; index: number; isDark: boolean }) {
  const year  = new Date(ev.event_date + 'T12:00:00').getFullYear()
  const month = new Date(ev.event_date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const isLeft = index % 2 === 0

  const bg          = isDark ? 'rgba(255,255,255,0.04)' : '#fff'
  const border      = isDark ? 'rgba(255,255,255,.09)' : 'rgba(13,13,13,.08)'
  const ink         = isDark ? '#fff' : '#0D0D0D'
  const mute        = isDark ? 'rgba(255,255,255,.5)' : '#6B6B6B'
  const shadow      = isDark ? '0 8px 32px rgba(0,0,0,.35)' : '0 2px 16px -4px rgba(13,13,13,.1)'

  return (
    <motion.div
      className="tl-card"
      initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 110, damping: 22, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: '22px 24px', boxShadow: shadow, width: '100%', maxWidth: 400 }}
    >
      {/* Year count-up */}
      <div style={{ fontFamily: '"Courier New",monospace', fontSize: 12, letterSpacing: '.15em', color: '#C0392B', marginBottom: 8 }}>
        <CountYear year={year} />
      </div>

      {/* Title — clip-path reveal left to right */}
      <div style={{ overflow: 'hidden' }}>
        <motion.h3
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 16, delay: index * 0.1 + 0.15 }}
          style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 17, color: ink, lineHeight: 1.3, marginBottom: ev.description || ev.image_url ? 12 : 0 }}
        >
          {ev.title}
        </motion.h3>
      </div>

      {/* Image with hover scale */}
      {ev.image_url && (
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 12, aspectRatio: '16/9' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ev.image_url} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </motion.div>
      )}

      {ev.description && (
        <p style={{ fontFamily: 'Inter,sans-serif', fontSize: 13.5, color: mute, lineHeight: 1.65, marginBottom: 10 }}>
          {ev.description}
        </p>
      )}

      <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: mute, opacity: .6, textTransform: 'capitalize' }}>
        {month}
      </div>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function TimelineSection({
  theme = 'light',
  initialEvents,
}: {
  theme?: 'light' | 'dark'
  initialEvents?: TimelineEvent[]
}) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents ?? [])
  const [loading, setLoading] = useState(!initialEvents)
  const containerRef = useRef<HTMLDivElement>(null)

  const isDark = theme === 'dark'

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start 85%', 'end 15%'] })
  const scaleY = useSpring(scrollYProgress, { stiffness: 80, damping: 30 })

  useEffect(() => {
    if (initialEvents) return
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) { setLoading(false); return }
    supabase
      .from('timeline_events')
      .select('id, title, description, event_date, image_url, created_at')
      .order('event_date', { ascending: true })
      .then(({ data }: { data: TimelineEvent[] | null }) => { setEvents(data ?? []); setLoading(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 96, borderRadius: 14, animation: 'shimmer 1.4s ease infinite', backgroundImage: isDark ? 'linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%)' : 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%' }} />
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: isDark ? 'rgba(255,255,255,.35)' : '#9a9690', fontFamily: 'Inter,sans-serif', fontSize: 14 }}>
        No hay hitos en la historia aún
      </div>
    )
  }

  const lineBase = isDark ? 'rgba(255,255,255,.1)' : 'rgba(13,13,13,.1)'

  return (
    <div ref={containerRef} className="tl-root" style={{ position: 'relative', paddingBottom: 60 }}>
      <style>{`
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        .tl-root .tl-row{display:grid;grid-template-columns:1fr 48px 1fr;align-items:center;gap:0 16px;margin-bottom:56px;}
        .tl-root .tl-row:last-child{margin-bottom:0;}
        .tl-root .tl-col-l{display:flex;justify-content:flex-end;}
        .tl-root .tl-col-c{display:flex;justify-content:center;}
        .tl-root .tl-col-r{display:flex;justify-content:flex-start;}
        @media(max-width:680px){
          .tl-root .tl-row{grid-template-columns:28px 1fr;gap:0 12px;}
          .tl-root .tl-col-l{display:none;}
          .tl-root .tl-col-c{grid-column:1;grid-row:1;}
          .tl-root .tl-col-r{grid-column:2;grid-row:1;display:flex !important;justify-content:flex-start !important;}
          .tl-root .tl-card{max-width:100% !important;}
        }
      `}</style>

      {/* Vertical growing thread */}
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, transform: 'translateX(-50%)', background: lineBase }}>
        <motion.div style={{ position: 'absolute', inset: 0, background: '#C0392B', transformOrigin: 'top', scaleY }} />
      </div>
      {/* Mobile: thread on left edge */}
      <div className="tl-mobile-line" style={{ display: 'none', position: 'absolute', left: 12, top: 0, bottom: 0, width: 2, background: lineBase }}>
        <motion.div style={{ position: 'absolute', inset: 0, background: '#C0392B', transformOrigin: 'top', scaleY }} />
      </div>

      {/* Rows */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {events.map((ev, i) => {
          const isLeft = i % 2 === 0
          return (
            <div key={ev.id} className="tl-row">
              <div className="tl-col-l">
                {isLeft && <EventCard ev={ev} index={i} isDark={isDark} />}
              </div>
              <div className="tl-col-c">
                <Dot isDark={isDark} />
              </div>
              <div className="tl-col-r" style={{ display: isLeft ? 'none' : 'flex' }}>
                {!isLeft && <EventCard ev={ev} index={i} isDark={isDark} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
