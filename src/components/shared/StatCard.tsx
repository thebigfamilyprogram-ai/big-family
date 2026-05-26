'use client'

import { m, useReducedMotion } from 'framer-motion'

interface StatCardProps {
  num: number
  label: string
  accent?: boolean
  accentColor?: string
  delta?: number
  deltaLabel?: string
  suffix?: string
}

export default function StatCard({
  num,
  label,
  accent = false,
  accentColor,
  delta,
  deltaLabel,
  suffix,
}: StatCardProps) {
  const pref = useReducedMotion()
  const borderColor = accentColor ?? (accent ? 'var(--accent,#C0392B)' : 'var(--line-strong,rgba(13,13,13,.14))')
  const numColor = accentColor ? accentColor : (accent ? 'var(--accent,#C0392B)' : 'var(--ink,#0D0D0D)')
  const isUp   = delta !== undefined && delta > 0
  const isDown = delta !== undefined && delta < 0

  return (
    <m.div
      style={{
        background: 'var(--card-bg,#fff)',
        border: '1px solid var(--card-border,rgba(13,13,13,.08))',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: 'var(--shadow-card)',
        cursor: 'default',
      }}
      whileHover={pref ? undefined : { y: -1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    >
      <div style={{
        fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        fontSize: 34,
        letterSpacing: '-.02em',
        lineHeight: 1,
        color: numColor,
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
      }}>
        {num.toLocaleString('es-CO')}
        {suffix && (
          <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.55, fontFamily: '"Satoshi",sans-serif', letterSpacing: 0 }}>
            {suffix}
          </span>
        )}
      </div>

      <div style={{
        fontSize: 10.5,
        color: 'var(--mute,#6B6B6B)',
        marginTop: 9,
        textTransform: 'uppercase',
        letterSpacing: '.1em',
        fontWeight: 600,
        fontFamily: '"Satoshi",sans-serif',
      }}>
        {label}
      </div>

      {delta !== undefined && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          marginTop: 7,
          fontSize: 11.5,
          fontWeight: 700,
          fontFamily: '"Satoshi",sans-serif',
          color: isUp ? 'var(--accent-teal,#0F7B6C)' : isDown ? 'var(--accent,#C0392B)' : 'var(--mute,#6B6B6B)',
        }}>
          <span>{isUp ? '↑' : isDown ? '↓' : '–'}</span>
          <span>{Math.abs(delta)}</span>
          {deltaLabel && (
            <span style={{ fontWeight: 400, opacity: 0.65, fontSize: 11 }}>{deltaLabel}</span>
          )}
        </div>
      )}
    </m.div>
  )
}
