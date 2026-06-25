'use client'

import { useState } from 'react'
import { m } from 'framer-motion'
import { useTranslations } from 'next-intl'

export interface EventCardEvent {
  id:           string
  title:        string
  description:  string | null
  location:     string | null
  meeting_link: string | null
  event_date:   string
  event_time:   string | null
}

export type RsvpStatus = 'confirmed' | 'declined' | 'pending' | null

interface EventCardProps {
  event:     EventCardEvent
  userRsvp:  RsvpStatus
  onRsvp?:   (eventId: string, status: 'confirmed' | 'declined') => void
}

const STATUS_COLOR: Record<'confirmed' | 'declined' | 'pending', string> = {
  confirmed: '#065F46',
  declined:  '#991B1B',
  pending:   'var(--mute)',
}

export default function EventCard({ event, userRsvp, onRsvp }: EventCardProps) {
  const t = useTranslations('events')
  const [localRsvp, setLocalRsvp] = useState<RsvpStatus>(userRsvp)
  const [submitting, setSubmitting] = useState(false)

  const d = new Date(`${event.event_date}T00:00:00`)
  const day   = d.toLocaleDateString('es-CO', { day: '2-digit' })
  const month = d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '').toUpperCase()

  const stripeColor = STATUS_COLOR[localRsvp ?? 'pending']

  async function handleRsvp(status: 'confirmed' | 'declined') {
    if (submitting || localRsvp === status) return
    setSubmitting(true)
    setLocalRsvp(status) // optimistic
    try {
      const res = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, status }),
      })
      if (!res.ok) throw new Error('rsvp failed')
      onRsvp?.(event.id, status)
    } catch {
      setLocalRsvp(userRsvp) // revert on failure
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <m.div
      className="event-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      style={{
        display: 'flex', background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ width: 4, flexShrink: 0, background: stripeColor }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 8px 18px 16px', flexShrink: 0 }}>
        <div style={{ textAlign: 'center', minWidth: 48 }}>
          <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 24, color: 'var(--ink)', lineHeight: 1 }}>{day}</div>
          <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: 'var(--mute)', marginTop: 2 }}>{month}</div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, padding: '18px 18px 18px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--ink)', lineHeight: 1.3 }}>
          {event.title}
        </div>
        <div style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 13, color: 'var(--mute)' }}>
          {[event.event_time, event.location || event.meeting_link].filter(Boolean).join(' · ')}
        </div>
        {event.description && (
          <div style={{
            fontFamily: '"Satoshi",sans-serif', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {event.description}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button
            onClick={() => handleRsvp('confirmed')}
            disabled={submitting}
            style={{
              padding: '6px 14px', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontSize: 12, fontWeight: 600,
              cursor: submitting ? 'default' : 'pointer',
              border: localRsvp === 'confirmed' ? 'none' : '1px solid var(--line)',
              background: localRsvp === 'confirmed' ? '#065F46' : 'none',
              color: localRsvp === 'confirmed' ? '#fff' : 'var(--ink-2)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            ✓ {t('confirm')}
          </button>
          <button
            onClick={() => handleRsvp('declined')}
            disabled={submitting}
            style={{
              padding: '6px 14px', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontSize: 12, fontWeight: 600,
              cursor: submitting ? 'default' : 'pointer',
              border: localRsvp === 'declined' ? 'none' : '1px solid var(--line)',
              background: localRsvp === 'declined' ? '#991B1B' : 'none',
              color: localRsvp === 'declined' ? '#fff' : 'var(--ink-2)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            ✗ {t('decline')}
          </button>
        </div>
      </div>
    </m.div>
  )
}
