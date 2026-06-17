'use client'

import { useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'
import { showToast } from '@/components/Toast'
import { createNotificationBatch } from '@/lib/createNotification'

type Category = 'bug' | 'idea' | 'queja' | 'otro'

const CAT_COLORS: Record<Category, string> = {
  bug:   '#C0392B',
  idea:  'var(--accent-teal,#0F7B6C)',
  queja: 'var(--accent-amber,#D4821A)',
  otro:  'var(--mute,#6B6B6B)',
}

export default function SuggestionButton() {
  const t        = useTranslations('suggestions')
  const pathname = usePathname()
  const pref     = useReducedMotion()

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [open,     setOpen]     = useState(false)
  const [cat,      setCat]      = useState<Category>('idea')
  const [message,  setMessage]  = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit() {
    if (!message.trim()) return
    setLoading(true)
    try {
      if (MOCK_MODE) {
        await new Promise(r => setTimeout(r, 600))
        showToast('success', t('success'))
        setMessage('')
        setOpen(false)
        return
      }

      if (!supabaseRef.current) supabaseRef.current = createClient()
      const sb = supabaseRef.current
      if (!sb) return

      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      await sb.from('suggestions').insert({
        user_id:  user.id,
        category: cat,
        message:  message.trim(),
        page_url: pathname,
      })

      const { data: staff } = await sb
        .from('profiles')
        .select('id')
        .in('role', ['coordinator', 'admin'])

      if (staff && staff.length > 0) {
        await createNotificationBatch(sb, staff.map((s: { id: string }) => s.id), {
          type:  'suggestion',
          title: t('notifTitle'),
          link:  '/coordinator/suggestions',
        })
      }

      showToast('success', t('success'))
      setMessage('')
      setOpen(false)
    } catch {
      showToast('error', 'Error al enviar la sugerencia')
    } finally {
      setLoading(false)
    }
  }

  const CATEGORIES: Category[] = ['bug', 'idea', 'queja', 'otro']

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t('button')}
        style={{
          position:       'fixed',
          bottom:         24,
          right:          24,
          zIndex:         900,
          width:          48,
          height:         48,
          borderRadius:   '50%',
          background:     'var(--surface,#fff)',
          border:         '1.5px solid var(--border,#E5E5E5)',
          boxShadow:      '0 4px 16px rgba(0,0,0,0.10)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          cursor:         'pointer',
          color:          'var(--text,#1A1A1A)',
          transition:     'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 22px rgba(0,0,0,0.14)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)' }}
      >
        {/* Lightbulb icon */}
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5a4 4 0 0 1 2.5 7.1V11a.5.5 0 0 1-.5.5h-4A.5.5 0 0 1 5.5 11V8.6A4 4 0 0 1 8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          <path d="M6 13h4M6.5 15h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <m.div
              key="sb-overlay"
              onClick={() => setOpen(false)}
              initial={pref ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              style={{
                position:   'fixed',
                inset:      0,
                zIndex:     901,
                background: 'rgba(0,0,0,0.25)',
              }}
            />

            {/* Drawer */}
            <m.aside
              key="sb-drawer"
              initial={pref ? false : { x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              style={{
                position:        'fixed',
                top:             0,
                right:           0,
                bottom:          0,
                zIndex:          902,
                width:           'min(400px, 100vw)',
                background:      'var(--surface,#fff)',
                borderLeft:      '1.5px solid var(--border,#E5E5E5)',
                display:         'flex',
                flexDirection:   'column',
                boxShadow:       '-4px 0 24px rgba(0,0,0,0.08)',
              }}
            >
              {/* Header */}
              <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                padding:        '20px 24px 16px',
                borderBottom:   '1px solid var(--border,#E5E5E5)',
                flexShrink:     0,
              }}>
                <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Satoshi,sans-serif', color: 'var(--text,#1A1A1A)' }}>
                  {t('title')}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute,#6B6B6B)', padding: 4, display: 'flex' }}
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Category pills */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--mute,#6B6B6B)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Satoshi,sans-serif' }}>
                    Categoría
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        onClick={() => setCat(c)}
                        style={{
                          padding:      '6px 14px',
                          borderRadius: 999,
                          fontSize:     13,
                          fontWeight:   600,
                          fontFamily:   'Satoshi,sans-serif',
                          cursor:       'pointer',
                          transition:   'all 0.15s ease',
                          background:   cat === c ? `${CAT_COLORS[c]}18` : 'var(--surface-2,#F7F7F7)',
                          color:        cat === c ? CAT_COLORS[c] : 'var(--mute,#6B6B6B)',
                          border:       cat === c ? `1.5px solid ${CAT_COLORS[c]}60` : '1.5px solid var(--border,#E5E5E5)',
                        }}
                      >
                        {t(`categories.${c}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--mute,#6B6B6B)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Satoshi,sans-serif' }}>
                    Mensaje
                  </p>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={t('placeholder')}
                    maxLength={1000}
                    rows={6}
                    style={{
                      width:        '100%',
                      padding:      '12px 14px',
                      borderRadius: 10,
                      border:       '1.5px solid var(--border,#E5E5E5)',
                      background:   'var(--surface-2,#F7F7F7)',
                      color:        'var(--text,#1A1A1A)',
                      fontFamily:   'Satoshi,sans-serif',
                      fontSize:     14,
                      resize:       'vertical',
                      outline:      'none',
                      boxSizing:    'border-box',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent,#C0392B)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border,#E5E5E5)' }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--mute,#6B6B6B)', marginTop: 4, textAlign: 'right' }}>
                    {message.length}/1000
                  </p>
                </div>

                {/* Page URL info */}
                <p style={{ fontSize: 11, color: 'var(--mute,#6B6B6B)', fontFamily: 'Satoshi,sans-serif' }}>
                  📍 Página capturada: <code style={{ fontSize: 11 }}>{pathname}</code>
                </p>
              </div>

              {/* Footer / Submit */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border,#E5E5E5)', flexShrink: 0 }}>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !message.trim()}
                  style={{
                    width:        '100%',
                    padding:      '12px',
                    borderRadius: 10,
                    background:   loading || !message.trim() ? 'var(--border,#E5E5E5)' : '#C0392B',
                    color:        loading || !message.trim() ? 'var(--mute,#6B6B6B)' : '#fff',
                    border:       'none',
                    fontFamily:   'Satoshi,sans-serif',
                    fontWeight:   700,
                    fontSize:     14,
                    cursor:       loading || !message.trim() ? 'not-allowed' : 'pointer',
                    transition:   'background 0.15s ease',
                  }}
                >
                  {loading ? '…' : t('submit')}
                </button>
              </div>
            </m.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
