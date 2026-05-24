'use client'

import { useEffect, useRef, useState, useCallback, memo } from 'react'

const countries = [
  { name: 'Canadá',          code: 'ca', students: 8  },
  { name: 'Estados Unidos',  code: 'us', students: 18 },
  { name: 'México',          code: 'mx', students: 6  },
  { name: 'Guatemala',       code: 'gt', students: 6  },
  { name: 'Nicaragua',       code: 'ni', students: 4  },
  { name: 'Costa Rica',      code: 'cr', students: 5  },
  { name: 'Colombia',        code: 'co', students: 24 },
  { name: 'Paraguay',        code: 'py', students: 9  },
  { name: 'Francia',         code: 'fr', students: 7  },
  { name: 'Alemania',        code: 'de', students: 6  },
  { name: 'España',          code: 'es', students: 10 },
  { name: 'Emiratos Árabes', code: 'ae', students: 5  },
]

interface FlagState {
  index: number
  ndcX: number
  ndcY: number
  visible: boolean
  facing: number
  lift: number
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  country: string
  students: number
}

interface Props {
  onReady?: () => void
  onCoordChange?: (label: string) => void
}

function GlobeCanvas({ onReady, onCoordChange }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const wrapRef      = useRef<HTMLDivElement>(null)
  const workerRef    = useRef<Worker | null>(null)
  const transferredRef = useRef(false)
  const isDownRef    = useRef(false)
  const lastPosRef   = useRef({ x: 0, y: 0 })

  const [flags, setFlags] = useState<FlagState[]>([])
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, country: '', students: 0 })

  const handleFlagEnter = useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const wr = wrap.getBoundingClientRect()
    const fr = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({
      visible: true,
      x: fr.left + fr.width / 2 - wr.left,
      y: fr.top - wr.top,
      country: countries[index].name,
      students: countries[index].students,
    })
  }, [])

  const handleFlagLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return

    // Guard: OffscreenCanvas control can only be transferred once.
    // React StrictMode mounts twice in dev — without this the second
    // mount throws "Cannot transfer control from a canvas for more than one time".
    if (transferredRef.current) return
    transferredRef.current = true

    // Bail on browsers without OffscreenCanvas (Safari < 16.4)
    if (!('transferControlToOffscreen' in HTMLCanvasElement.prototype)) {
      import('./GlobeFallback').then(m => {
        m.initGlobeFallback(canvas, wrap, {
          onReady: () => { wrap.classList.add('in'); onReady?.() },
          onCoordChange,
        })
      })
      return
    }

    const offscreen = canvas.transferControlToOffscreen()
    const worker = new Worker(new URL('./GlobeWorker.ts', import.meta.url))
    workerRef.current = worker

    const { width, height } = wrap.getBoundingClientRect()
    const isMobile = window.innerWidth < 768
    const dpr = window.devicePixelRatio ?? 1

    worker.postMessage({ type: 'init', canvas: offscreen, width, height, isMobile, dpr }, [offscreen])

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data
      if (msg.type === 'ready') {
        wrap.classList.add('in')
        onReady?.()
      } else if (msg.type === 'flags') {
        setFlags(msg.data)
      } else if (msg.type === 'coord') {
        onCoordChange?.(msg.label)
      } else if (msg.type === 'error') {
        console.error('[GlobeCanvas] Worker error:', msg.message)
      }
    }

    // Resize
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      worker.postMessage({ type: 'resize', width: w, height: h })
    })
    ro.observe(wrap)

    // Visibility
    const onVis = () => worker.postMessage({ type: 'visibility', visible: !document.hidden })
    document.addEventListener('visibilitychange', onVis)

    // IntersectionObserver to pause when off-screen
    const io = new IntersectionObserver(([entry]) => {
      worker.postMessage({ type: 'visibility', visible: entry.isIntersecting })
    })
    io.observe(wrap)

    // Drag — main thread captures pointer events, forwards deltas to worker
    const onPointerDown = (e: PointerEvent) => {
      isDownRef.current = true
      lastPosRef.current = { x: e.clientX, y: e.clientY }
      worker.postMessage({ type: 'dragStart' })
      wrap.classList.add('globe-dragging')
    }
    const onPointerUp = () => {
      isDownRef.current = false
      worker.postMessage({ type: 'dragEnd' })
      wrap.classList.remove('globe-dragging')
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!isDownRef.current) return
      const dx = e.clientX - lastPosRef.current.x
      const dy = e.clientY - lastPosRef.current.y
      lastPosRef.current = { x: e.clientX, y: e.clientY }
      worker.postMessage({ type: 'drag', dx, dy })
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup',   onPointerUp)
    window.addEventListener('pointermove', onPointerMove)

    return () => {
      worker.postMessage({ type: 'destroy' })
      worker.terminate()
      workerRef.current = null
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup',   onPointerUp)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={wrapRef}
      className="globe-wrap"
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) scale(.92)', width: '120%', height: '120%', maxWidth: 900, maxHeight: 900 }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab', background: 'transparent' }}
      />

      {/* Flag overlays — positioned from worker NDC coords */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15, overflow: 'visible' }}>
        {flags.map(f => {
          const c = countries[f.index]
          if (!c) return null
          const x = (f.ndcX  * 0.5 + 0.5) * 100
          const y = (-f.ndcY * 0.5 + 0.5) * 100
          return (
            <div
              key={f.index}
              className="flag-pin"
              style={{
                position: 'absolute',
                left: `${x}%`,
                top:  `calc(${y}% - ${28 + f.lift}px)`,
                transform: 'translateX(-50%)',
                opacity: f.visible ? Math.min(1, (f.facing - 0.15) * 4) : 0,
                pointerEvents: f.visible ? 'auto' : 'none',
                transition: 'opacity .35s ease',
              }}
              onMouseEnter={e => handleFlagEnter(f.index, e)}
              onMouseLeave={handleFlagLeave}
            >
              <img
                className="flag-pin__img"
                alt={c.name}
                src={`https://flagcdn.com/w80/${c.code}.png`}
                style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', background: '#fff', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )
        })}
      </div>

      {/* Tooltip */}
      <div
        className="tip"
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 20,
          left: tooltip.x,
          top: tooltip.y,
          opacity: tooltip.visible ? 1 : 0,
          transform: `translate(-50%, -110%) translateY(${tooltip.visible ? 0 : 6}px)`,
          transition: 'opacity .18s ease, transform .18s ease',
        }}
      >
        <div className="tip__country"><span>{tooltip.country || '—'}</span></div>
        <div className="tip__meta">
          <span className="tip__dot"></span>
          <span>{tooltip.students ? `${tooltip.students} estudiantes` : '—'}</span>
          <span className="sep"></span>
          <span>Cohorte activa</span>
        </div>
      </div>
    </div>
  )
}

export default memo(GlobeCanvas)
