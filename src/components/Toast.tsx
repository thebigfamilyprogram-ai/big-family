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

const COLORS: Record<ToastType, { bg: string; border: string; color: string }> = {
  success: { bg: '#D1FAE5', border: '#6EE7B7', color: '#065F46' },
  error:   { bg: '#FEE2E2', border: '#FCA5A5', color: '#991B1B' },
  info:    { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF' },
  warning: { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E' },
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
                color: c.color,
                borderRadius: 12,
                padding: '12px 18px',
                fontSize: 13.5,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                boxShadow: '0 4px 18px -4px rgba(0,0,0,.14)',
                maxWidth: 320,
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
