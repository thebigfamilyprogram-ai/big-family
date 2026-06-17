'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: 16,
      fontFamily: '"Satoshi", sans-serif',
      padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(192,57,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="9" stroke="var(--accent,#C0392B)" strokeWidth="1.6"/>
          <path d="M11 7v5M11 14.5v.5" stroke="var(--accent,#C0392B)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink,#0D0D0D)' }}>
        Algo salió mal al cargar esta página.
      </p>
      <p style={{ fontSize: 14, color: 'var(--mute,#6B6B6B)', maxWidth: 320, lineHeight: 1.6 }}>
        Puede ser un problema de conexión temporal. Intenta de nuevo.
      </p>
      <button
        onClick={reset}
        style={{
          background: 'var(--accent,#C0392B)', color: '#fff',
          border: 'none', borderRadius: 999,
          padding: '11px 24px', cursor: 'pointer',
          fontFamily: '"Satoshi",sans-serif',
          fontWeight: 700, fontSize: 14,
        }}
      >
        Reintentar
      </button>
    </div>
  )
}
