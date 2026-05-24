'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  loading?: boolean
  suffix?: string
  formatK?: boolean
  skeletonWidth?: number
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export default function AnimatedNumber({ value, loading = false, suffix = '', formatK = false, skeletonWidth = 48 }: Props) {
  const [displayed, setDisplayed] = useState(0)
  const prevRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (loading || value === 0) return
    const from = prevRef.current
    const to = value
    prevRef.current = to

    const start = performance.now()
    const dur = 800

    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1)
      setDisplayed(Math.round(from + (to - from) * easeOutCubic(p)))
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, loading])

  if (loading) {
    return (
      <span
        style={{
          display: 'inline-block',
          width: skeletonWidth,
          height: '1em',
          borderRadius: 4,
          background: 'var(--bg-2, rgba(128,128,128,0.15))',
          verticalAlign: 'middle',
          animation: 'skeletonPulse 1.4s ease-in-out infinite',
        }}
      />
    )
  }

  const label = formatK && displayed >= 1000 ? `${(displayed / 1000).toFixed(1)}k` : String(displayed)
  return <span style={{ fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)' }}>{label}{suffix}</span>
}
