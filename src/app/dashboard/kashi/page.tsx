'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { m, useReducedMotion } from 'framer-motion'

const KASHI_URL = 'https://luishernandobarrios.com/kashi/splash'

export default function KashiPage() {
  const pref = useReducedMotion()
  const [loaded, setLoaded] = useState(false)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* ── Header ── */}
      <m.div
        initial={pref ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        style={{
          padding: '16px 28px 14px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--card-bg)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: identity */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: '"Satoshi",sans-serif',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#C0392B',
            marginBottom: 2,
          }}>
            KASHI · RED EDUCATIVA
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{
              fontFamily: '"Instrument Serif",serif',
              fontStyle: 'italic',
              fontSize: '1.25rem',
              color: 'var(--ink)',
              lineHeight: 1.2,
            }}>
              Kashi
            </h1>
            <span style={{
              fontFamily: '"Satoshi",sans-serif',
              fontSize: 13,
              color: 'var(--mute)',
            }}>
              luna en wayuu
            </span>
          </div>
          <p style={{
            fontFamily: '"Satoshi",sans-serif',
            fontSize: 13,
            color: 'var(--mute)',
            marginTop: 2,
            lineHeight: 1.5,
          }}>
            Comparte tus fortalezas y aprende de otros estudiantes del programa.
          </p>
        </div>

        {/* Right: badges + external link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{
            padding: '3px 10px',
            borderRadius: 999,
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            fontFamily: '"Satoshi",sans-serif',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--mute)',
            whiteSpace: 'nowrap',
          }}>
            Desarrollado por Luis Barrios
          </span>
          <a
            href={KASHI_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: '"Satoshi",sans-serif',
              fontSize: 12,
              fontWeight: 600,
              color: '#C0392B',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Abrir completo ↗
          </a>
        </div>
      </m.div>

      {/* ── Iframe area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: '16px 16px 8px' }}>
        {/* Loading skeleton */}
        {!loaded && (
          <div style={{
            position: 'absolute',
            inset: '16px 16px 8px',
            background: 'var(--card-bg)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            zIndex: 1,
          }}>
            <style>{`@keyframes ks-spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{
              width: 28, height: 28,
              borderRadius: '50%',
              border: '2px solid var(--line)',
              borderTopColor: '#C0392B',
              animation: 'ks-spin .8s linear infinite',
            }} />
            <span style={{
              fontFamily: '"Satoshi",sans-serif',
              fontSize: 13,
              color: 'var(--mute)',
              letterSpacing: '0.04em',
            }}>
              Cargando Kashi…
            </span>
          </div>
        )}

        <iframe
          src={KASHI_URL}
          title="Kashi — Red Educativa"
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 12,
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
          allow="camera; microphone; fullscreen"
        />
      </div>

      {/* ── Footer note ── */}
      <div style={{
        padding: '6px 28px 10px',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: '"Satoshi",sans-serif',
          fontSize: 11,
          color: 'var(--mute)',
        }}>
          Kashi abre en esta ventana. Si prefieres verlo completo{' '}
          <a
            href={KASHI_URL}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#C0392B', textDecoration: 'none', fontWeight: 600 }}
          >
            →
          </a>
        </span>
      </div>
    </div>
  )
}
