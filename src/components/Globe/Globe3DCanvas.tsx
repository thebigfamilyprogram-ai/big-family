'use client'

import { useEffect, useRef, memo } from 'react'

function Globe3DCanvas() {
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const containerRef   = useRef<HTMLDivElement>(null)
  const transferredRef = useRef(false) // guard: OffscreenCanvas can only be transferred once

  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    if (transferredRef.current) return  // React StrictMode double-mount guard
    if (!('transferControlToOffscreen' in HTMLCanvasElement.prototype)) return

    transferredRef.current = true

    const offscreen         = canvas.transferControlToOffscreen()
    const worker            = new Worker(
      new URL('./Globe3DWorker.ts', import.meta.url),
      { type: 'module' },
    )
    const { width, height } = container.getBoundingClientRect()
    const isDark            = document.documentElement.dataset.theme === 'dark'

    worker.postMessage(
      {
        type:     'init',
        canvas:   offscreen,
        width,
        height,
        dpr:      Math.min(window.devicePixelRatio ?? 1, 2),
        isMobile: window.innerWidth < 960,
        isDark,
      },
      [offscreen],
    )

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') container.style.opacity = '1'
    }

    // Watch data-theme attribute changes for live dark/light toggle
    const mo = new MutationObserver(() => {
      worker.postMessage({
        type:   'theme',
        isDark: document.documentElement.dataset.theme === 'dark',
      })
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // Resize container → update renderer + camera
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      worker.postMessage({ type: 'resize', width: w, height: h })
    })
    ro.observe(container)

    // Pause when scrolled off-screen, resume when visible
    const io = new IntersectionObserver(
      ([entry]) => worker.postMessage({ type: entry.isIntersecting ? 'resume' : 'pause' }),
      { threshold: 0 },
    )
    io.observe(container)

    // Pause when tab is hidden
    const onVisChange = () => worker.postMessage({ type: document.hidden ? 'pause' : 'resume' })
    document.addEventListener('visibilitychange', onVisChange)

    return () => {
      worker.postMessage({ type: 'destroy' })
      worker.terminate()
      mo.disconnect()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisChange)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width:      '100%',
        height:     '100%',
        opacity:    0,
        transition: 'opacity 0.6s ease',
        overflow:   'visible',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display:    'block',
          width:      '100%',
          height:     '100%',
          background: 'transparent',
        }}
      />
    </div>
  )
}

export default memo(Globe3DCanvas)
