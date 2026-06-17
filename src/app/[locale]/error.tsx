'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t      = useTranslations('errors')
  const router = useRouter()

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      '60vh',
      gap:            16,
      fontFamily:     '"Satoshi", sans-serif',
      padding:        '40px 24px',
      textAlign:      'center',
    }}>
      <div style={{
        width:          48,
        height:         48,
        borderRadius:   '50%',
        background:     'rgba(192,57,43,0.08)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        marginBottom:   4,
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="9" stroke="var(--accent,#C0392B)" strokeWidth="1.6"/>
          <path d="M11 7v5M11 14.5v.5" stroke="var(--accent,#C0392B)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>

      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink,#0D0D0D)', margin: 0 }}>
        {t('500.title')}
      </p>

      <p style={{ fontSize: 14, color: 'var(--mute,#6B6B6B)', maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
        {t('500.body')}
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={reset}
          style={{
            background:  'var(--accent,#C0392B)',
            color:       '#fff',
            border:      'none',
            borderRadius: 999,
            padding:     '11px 24px',
            cursor:      'pointer',
            fontFamily:  '"Satoshi",sans-serif',
            fontWeight:  700,
            fontSize:    14,
          }}
        >
          {t('500.btn')}
        </button>

        <button
          onClick={() => router.push('/')}
          style={{
            background:   'transparent',
            color:        'var(--mute,#6B6B6B)',
            border:       '1.5px solid var(--border,#E5E5E5)',
            borderRadius: 999,
            padding:      '11px 24px',
            cursor:       'pointer',
            fontFamily:   '"Satoshi",sans-serif',
            fontWeight:   700,
            fontSize:     14,
          }}
        >
          {t('404.btn')}
        </button>
      </div>
    </div>
  )
}
