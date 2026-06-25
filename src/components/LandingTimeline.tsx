'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { TIMELINE_EVENTS } from '@/lib/landingData'

function Chevron({ active }: { active: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 18 18" fill="none"
      style={{
        marginTop: 12,
        transform: active ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}
      aria-hidden="true"
    >
      <path d="M4 6.5L9 11.5L14 6.5" stroke="var(--mute)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function LandingTimeline() {
  const [activeId, setActiveId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setActiveId(prev => prev === id ? null : id)
  }

  return (
    <section style={{
      padding: '80px 24px',
      maxWidth: '860px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '64px' }}>
        <p style={{
          fontSize: '11px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#C0392B',
          marginBottom: '12px',
          fontWeight: '600',
        }}>
          2015 — 2026
        </p>
        <h2 style={{
          fontSize: '40px',
          fontWeight: '700',
          color: 'var(--ink)',
          lineHeight: '1.1',
        }}>
          Una década construyendo líderes
        </h2>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>

        {/* Línea central */}
        <div className="landing-timeline-line" style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '1px',
          background: 'var(--line)',
        }} />

        {TIMELINE_EVENTS.map((event, i) => {
          const isPar     = i % 2 === 0
          const isActive  = activeId === event.id
          const cardCol   = isPar ? 1 : 3
          const yearCol   = isPar ? 3 : 1
          const cardSide  = isPar ? 'left' : 'right'

          return (
            <m.div
              key={event.id}
              className="landing-timeline-row"
              initial={{ opacity: 0, x: isPar ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.08 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 48px 1fr',
                alignItems: 'start',
                marginBottom: 0,
                padding: '32px 0',
              }}
            >
              {/* Año — lado opuesto a la tarjeta */}
              <div
                className="landing-timeline-year"
                style={{
                  gridColumn: yearCol,
                  fontSize: '13px',
                  fontWeight: '700',
                  color: isActive ? '#C0392B' : 'var(--mute)',
                  letterSpacing: '0.04em',
                  paddingTop: '20px',
                  textAlign: yearCol === 1 ? 'right' : 'left',
                  transition: 'color 0.2s',
                }}
              >
                {event.year}
              </div>

              {/* Dot central */}
              <div
                className="landing-timeline-dot"
                style={{
                  gridColumn: 2,
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: isActive ? '#C0392B' : 'var(--card-bg)',
                  border: isActive ? '2px solid #C0392B' : '2px solid var(--line-strong)',
                  margin: '0 auto',
                  marginTop: '18px',
                  transition: 'all 0.25s',
                  zIndex: 1,
                  position: 'relative',
                }}
              />

              {/* Tarjeta */}
              <m.button
                type="button"
                onClick={() => toggle(event.id)}
                whileHover={{ y: -2, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
                className={`landing-timeline-card${isActive ? ' landing-timeline-card--active' : ''}`}
                style={{
                  gridColumn: cardCol,
                  background: 'var(--card-bg)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderLeftWidth: isActive && cardSide === 'left'  ? '3px' : '1px',
                  borderRightWidth: isActive && cardSide === 'right' ? '3px' : '1px',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  width: '100%',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Año — versión mobile, dentro de la tarjeta */}
                <span className="landing-timeline-year-mobile" style={{
                  display: 'none',
                  fontSize: '11px',
                  color: 'var(--mute)',
                  marginBottom: '4px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}>
                  {event.year}
                </span>

                {/* Fila superior — icono + tag + mes */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{ fontSize: '20px', lineHeight: 1 }}>
                    {event.icon}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    background: isActive ? 'rgba(192,57,43,0.1)' : 'var(--bg-2)',
                    color: isActive ? '#C0392B' : 'var(--mute)',
                    fontWeight: '500',
                    letterSpacing: '0.03em',
                    transition: 'all 0.2s',
                  }}>
                    {event.tag}
                  </span>
                  {event.month && (
                    <span style={{
                      fontSize: '10px',
                      color: 'var(--mute)',
                      letterSpacing: '0.03em',
                    }}>
                      {event.month}
                    </span>
                  )}
                </div>

                {/* Título */}
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--ink)',
                  lineHeight: '1.3',
                  marginTop: '8px',
                }}>
                  {event.title}
                </h3>

                {/* Summary */}
                <p style={{
                  fontSize: '13px',
                  color: 'var(--mute)',
                  lineHeight: '1.6',
                  marginTop: '4px',
                }}>
                  {event.summary}
                </p>

                <Chevron active={isActive} />

                {/* Panel expandible */}
                <AnimatePresence>
                  {isActive && (
                    <m.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ height: '1px', background: 'var(--line)', margin: '16px 0' }} />
                      <p style={{
                        fontSize: '14px',
                        lineHeight: '1.75',
                        color: event.detail.startsWith('PENDIENTE') ? 'var(--mute)' : 'var(--ink-2)',
                        fontStyle: event.detail.startsWith('PENDIENTE') ? 'italic' : 'normal',
                        opacity: event.detail.startsWith('PENDIENTE') ? 0.6 : 1,
                      }}>
                        {event.detail}
                      </p>
                    </m.div>
                  )}
                </AnimatePresence>
              </m.button>
            </m.div>
          )
        })}
      </div>
    </section>
  )
}
