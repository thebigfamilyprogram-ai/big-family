'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

let nextId = 0
const listeners: ((toast: ToastItem) => void)[] = []

export function showToast(type: ToastType, message: string) {
  const toast: ToastItem = { id: ++nextId, type, message }
  listeners.forEach(l => l(toast))
}

const COLORS: Record<ToastType, { bg: string; border: string; color: string; accent: string }> = {
  success: { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  color: 'var(--ink)', accent: '#10B981' },
  error:   { bg: 'rgba(192,57,43,0.12)',   border: 'rgba(192,57,43,0.3)',   color: 'var(--ink)', accent: '#C0392B' },
  info:    { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  color: 'var(--ink)', accent: '#3B82F6' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: 'var(--ink)', accent: '#F59E0B' },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function handler(toast: ToastItem) {
      setToasts(prev => [...prev, toast])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 3000)
    }
    listeners.push(handler)
    return () => {
      const idx = listeners.indexOf(handler)
      if (idx !== -1) listeners.splice(idx, 1)
    }
  }, [])

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AnimatePresence>
        {toasts.map(t => {
          const c = COLORS[t.type]
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                boxShadow: `inset 3px 0 0 ${c.accent}, 0 4px 18px -4px rgba(0,0,0,.14)`,
                color: c.color,
                borderRadius: 12,
                padding: '12px 18px',
                fontSize: 13.5,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                maxWidth: 320,
                backdropFilter: 'blur(8px)',
              }}
            >
              {t.message}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
