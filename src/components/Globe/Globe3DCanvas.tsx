'use client'

import { useEffect, useRef, memo } from 'react'

function Globe3DCanvas() {
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const containerRef   = useRef<HTMLDivElement>(null)
  const transferredRef = useRef(false)

  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || transferredRef.current) return

    const supportsOffscreen = 'transferControlToOffscreen' in HTMLCanvasElement.prototype
    if (!supportsOffscreen) {
      container.style.opacity = '1'
      return
    }

    transferredRef.current = true
    const offscreen = canvas.transferControlToOffscreen()

    let worker: Worker
    try {
      worker = new Worker(
        new URL('./Globe3DWorker.ts', import.meta.url),
        { type: 'module' },
      )
    } catch (err) {
      console.error('[Globe3D] Worker creation failed:', err)
      container.style.opacity = '1'
      return
    }

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') container.style.opacity = '1'
      if (e.data.type === 'error') {
        console.error('[Globe3D] Worker error:', e.data.message)
        container.style.opacity = '1'
      }
    }
    worker.onerror = (e) => {
      console.error('[Globe3D] Worker onerror:', e.message, e.filename, e.lineno)
      container.style.opacity = '1'
    }

    // rAF delay: ensures one browser paint so CSS layout (aspect-ratio / padding trick) is settled
    const rafId = requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect()
      // Fallback dimensions if layout hasn't computed yet (shouldn't happen with padding-bottom trick)
      const w = rect.width  > 0 ? rect.width  : (container.offsetWidth  || 400)
      const h = rect.height > 0 ? rect.height : (container.offsetHeight || 400)

      worker.postMessage(
        {
          type:     'init',
          canvas:   offscreen,
          width:    w,
          height:   h,
          dpr:      Math.min(window.devicePixelRatio ?? 1, 2),
          isMobile: window.innerWidth < 960,
          isDark:   document.documentElement.dataset.theme === 'dark',
        },
        [offscreen],
      )
    })

    const mo = new MutationObserver(() => {
      worker.postMessage({
        type:   'theme',
        isDark: document.documentElement.dataset.theme === 'dark',
      })
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      if (w > 0 && h > 0) worker.postMessage({ type: 'resize', width: w, height: h })
    })
    ro.observe(container)

    const io = new IntersectionObserver(
      ([entry]) => worker.postMessage({ type: entry.isIntersecting ? 'resume' : 'pause' }),
      { threshold: 0 },
    )
    io.observe(container)

    const onVisChange = () => worker.postMessage({ type: document.hidden ? 'pause' : 'resume' })
    document.addEventListener('visibilitychange', onVisChange)

    return () => {
      cancelAnimationFrame(rafId)
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
