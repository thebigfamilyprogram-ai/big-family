'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { TIMELINE_EVENTS } from '@/lib/landingData'

export default function LandingTimeline() {
  const [activeId, setActiveId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setActiveId(prev => prev === id ? null : id)
  }

  return (
    <section style={{
      padding: '80px 24px',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <style>{`
        .lt-line{left:79px;}
        .lt-row{grid-template-columns:80px 1fr;gap:24px;}
        .lt-detail{margin-left:104px;}
        @media(max-width:480px){
          .lt-line{left:55px;}
          .lt-row{grid-template-columns:56px 1fr;gap:16px;}
          .lt-detail{margin-left:72px;}
        }
      `}</style>

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

        {/* Línea vertical */}
        <div className="lt-line" style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '1px',
          background: 'var(--line)',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {TIMELINE_EVENTS.map((event) => (
            <div key={event.id}>

              {/* Fila del evento */}
              <button
                onClick={() => toggle(event.id)}
                className="lt-row"
                style={{
                  display: 'grid',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '20px 0',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  alignItems: 'start',
                }}
              >
                {/* Año */}
                <div style={{ position: 'relative', paddingRight: '16px' }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: activeId === event.id ? '#C0392B' : 'var(--mute)',
                    transition: 'color 0.2s',
                    display: 'block',
                    textAlign: 'right',
                    lineHeight: '1',
                    paddingTop: '3px',
                  }}>
                    {event.year}
                  </span>
                  {/* Dot */}
                  <div style={{
                    position: 'absolute',
                    right: '-5px',
                    top: '4px',
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: activeId === event.id ? '#C0392B' : 'var(--bg-2)',
                    border: activeId === event.id
                      ? '2px solid #C0392B'
                      : '2px solid var(--line-strong)',
                    transition: 'all 0.2s',
                    zIndex: 1,
                  }} />
                </div>

                {/* Contenido */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}>
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>
                      {event.icon}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      background: activeId === event.id
                        ? 'rgba(192,57,43,0.1)'
                        : 'var(--bg-2)',
                      color: activeId === event.id ? '#C0392B' : 'var(--mute)',
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
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--ink)',
                    lineHeight: '1.3',
                    marginBottom: '4px',
                  }}>
                    {event.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--mute)',
                    lineHeight: '1.6',
                    margin: 0,
                  }}>
                    {event.summary}
                  </p>
                </div>
              </button>

              {/* Panel expandible */}
              <AnimatePresence>
                {activeId === event.id && (
                  <m.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="lt-detail" style={{
                      marginBottom: '20px',
                      padding: '20px 24px',
                      background: 'var(--bg-2)',
                      borderRadius: '10px',
                      borderLeft: '3px solid #C0392B',
                    }}>
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--ink-2)',
                        lineHeight: '1.7',
                        margin: 0,
                        fontStyle: event.detail.startsWith('PENDIENTE') ? 'italic' : 'normal',
                        opacity: event.detail.startsWith('PENDIENTE') ? 0.5 : 1,
                      }}>
                        {event.detail}
                      </p>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>

            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
