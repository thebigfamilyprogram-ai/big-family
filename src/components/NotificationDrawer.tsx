'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Notification {
  id:         string
  user_id:    string
  type:       string
  title:      string
  body:       string | null
  link:       string | null
  read:       boolean
  created_at: string
}

export interface NotificationDrawerProps {
  isOpen:  boolean
  onClose: () => void
  userId:  string
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_NOTIFS: Notification[] = [
  { id: 'n1', user_id: 'mock', type: 'announcement',            title: '¡Convocatoria Capstone abierta!',    body: 'Ya pueden enviar sus proyectos finales. Fecha límite: 20 de junio.',         link: '/dashboard/announcements',   read: false, created_at: new Date(Date.now() - 5  * 60000).toISOString() },
  { id: 'n2', user_id: 'mock', type: 'project_evaluated',       title: 'Tu proyecto fue evaluado',           body: 'Resultado: Certificado. ¡Felicidades!',                                      link: '/dashboard/projects',        read: false, created_at: new Date(Date.now() - 2  * 3600000).toISOString() },
  { id: 'n3', user_id: 'mock', type: 'module_published',        title: 'Nuevo módulo disponible',            body: 'Módulo 06 — Impacto Comunitario ya está disponible para ti.',                link: '/dashboard/leadership-path', read: true,  created_at: new Date(Date.now() - 1  * 86400000).toISOString() },
  { id: 'n4', user_id: 'mock', type: 'quiz_retry_approved',     title: 'Reintento de quiz aprobado',         body: 'Tu coordinador aprobó un reintento para el quiz del Módulo 3.',              link: '/dashboard/leadership-path', read: true,  created_at: new Date(Date.now() - 2  * 86400000).toISOString() },
  { id: 'n5', user_id: 'mock', type: 'great_venture_reminder',  title: 'Completa tu Great Venture',          body: 'Recuerda llenar tu mapa de liderazgo — es parte de tu certificación.',       link: '/dashboard/great-venture',   read: false, created_at: new Date(Date.now() - 5  * 86400000).toISOString() },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  <  1)  return 'ahora'
  if (mins  < 60)  return `hace ${mins} min`
  if (hours < 24)  return `hace ${hours}h`
  if (days  === 1) return 'ayer'
  return `hace ${days} días`
}

function groupByDate(items: Notification[]): { label: string; items: Notification[] }[] {
  const now  = new Date()
  const tod  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yest = tod - 86400000
  const week = tod - 7 * 86400000
  const groups = [
    { label: 'Hoy',         items: [] as Notification[] },
    { label: 'Ayer',        items: [] as Notification[] },
    { label: 'Esta semana', items: [] as Notification[] },
    { label: 'Antes',       items: [] as Notification[] },
  ]
  for (const n of items) {
    const t = new Date(n.created_at).getTime()
    if      (t >= tod)  groups[0].items.push(n)
    else if (t >= yest) groups[1].items.push(n)
    else if (t >= week) groups[2].items.push(n)
    else                groups[3].items.push(n)
  }
  return groups.filter(g => g.items.length > 0)
}

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { color: string; icon: React.ReactNode }> = {
  announcement: {
    color: '#C0392B',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14 5v6L8 14.5 2 11V5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  },
  project_evaluated: {
    color: 'var(--accent-teal,#0F7B6C)',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  module_published: {
    color: 'var(--accent-amber,#D4821A)',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  quiz_retry_approved: {
    color: 'var(--accent-teal,#0F7B6C)',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 1 1 1.5 4M2 12V8h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  kashi_session: {
    color: 'var(--accent-teal,#0F7B6C)',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13 9A6 6 0 0 1 3 9a6 6 0 0 1 10 0z" stroke="currentColor" strokeWidth="1.4"/><path d="M8 3v1M8 9v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  great_venture_reminder: {
    color: 'var(--accent-amber,#D4821A)',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
}

const fallbackCfg = {
  color: 'var(--mute)',
  icon:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/></svg>,
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationDrawer({ isOpen, onClose, userId }: NotificationDrawerProps) {
  const router   = useRouter()
  const pref     = useReducedMotion()
  const sbRef    = useRef<ReturnType<typeof createClient> | null>(null)
  const chanRef  = useRef<ReturnType<typeof createClient> | null>(null)

  const [notifs,   setNotifs]   = useState<Notification[]>([])
  const [loading,  setLoading]  = useState(false)

  const unread = notifs.filter(n => !n.read).length

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    if (!userId) return
    if (MOCK_MODE) { setNotifs(MOCK_NOTIFS); return }
    if (!sbRef.current) sbRef.current = createClient()
    const sb = sbRef.current
    if (!sb) return
    setLoading(true)
    const { data } = await sb
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs((data ?? []) as Notification[])
    setLoading(false)
  }, [userId])

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !userId || MOCK_MODE) return
    fetchNotifs()

    if (!sbRef.current) sbRef.current = createClient()
    const sb = sbRef.current
    if (!sb) return

    const channel = sb
      .channel(`notif-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload: { new: unknown }) => {
        setNotifs(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [isOpen, userId, fetchNotifs])

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleClick(n: Notification) {
    if (!n.read) {
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      if (!MOCK_MODE && sbRef.current) {
        await sbRef.current.from('notifications').update({ read: true }).eq('id', n.id)
      }
    }
    if (n.link) { onClose(); router.push(n.link) }
  }

  async function markAllRead() {
    setNotifs(prev => prev.map(x => ({ ...x, read: true })))
    if (!MOCK_MODE && sbRef.current && userId) {
      await sbRef.current
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
    }
  }

  const groups = groupByDate(notifs)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <m.div
            key="nd-overlay"
            style={{
              position: 'fixed', inset: 0, zIndex: 49,
              background: 'rgba(13,13,13,0.3)',
              backdropFilter: 'blur(2px)',
            }}
            initial={pref ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <m.aside
            key="nd-drawer"
            style={{
              position: 'fixed', top: 0, right: 0, height: '100dvh',
              width: 'min(380px, 100vw)',
              background: 'var(--card-bg)',
              borderLeft: '1px solid var(--card-border)',
              zIndex: 50,
              display: 'flex', flexDirection: 'column',
              boxShadow: 'var(--shadow-raised,0 8px 32px rgba(13,13,13,.12))',
            }}
            initial={pref ? false : { x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 20px 16px',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mute)' }}>
                  NOTIFICACIONES
                </span>
                {unread > 0 && (
                  <span style={{
                    padding: '1px 7px', borderRadius: 999,
                    background: '#C0392B', color: '#fff',
                    fontFamily: '"Satoshi",sans-serif', fontSize: 11, fontWeight: 700,
                  }}>
                    {unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"Satoshi",sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--mute)', padding: '4px 8px', borderRadius: 6, transition: 'color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--mute)')}
                >
                  Marcar todas como leídas
                </button>
              )}
              <m.button
                onClick={onClose}
                whileHover={pref ? undefined : { rotate: 90, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', fontSize: 20, lineHeight: 1, padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Cerrar"
              >
                ×
              </m.button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                /* Skeleton */
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-2)', display: 'flex', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'nd-shimmer 1.4s ease infinite', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ height: 12, width: '70%', borderRadius: 4, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'nd-shimmer 1.4s ease infinite' }} />
                        <div style={{ height: 10, width: '50%', borderRadius: 4, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'nd-shimmer 1.4s ease infinite' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifs.length === 0 ? (
                /* Empty state */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '48px 24px', gap: 12, textAlign: 'center' }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ color: 'var(--mute)', opacity: 0.4 }}>
                    <path d="M20 4a12 12 0 0 0-12 12v6l-3 5h30l-3-5v-6A12 12 0 0 0 20 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                    <path d="M16 33a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Todo al día</p>
                  <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 13, color: 'var(--mute)' }}>No tienes notificaciones nuevas.</p>
                </div>
              ) : (
                /* Notification groups */
                <div>
                  <style>{`@keyframes nd-shimmer{0%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
                  {groups.map(group => (
                    <div key={group.label}>
                      {/* Group label */}
                      <div style={{ padding: '12px 20px 4px', fontFamily: '"Satoshi",sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mute)' }}>
                        {group.label}
                      </div>
                      {/* Items */}
                      {group.items.map(n => {
                        const cfg = TYPE_CFG[n.type] ?? fallbackCfg
                        return (
                          <m.div
                            key={n.id}
                            onClick={() => handleClick(n)}
                            whileHover={pref ? undefined : { x: 2, backgroundColor: 'var(--bg-2)' }}
                            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                            style={{
                              padding: '12px 20px',
                              borderLeft: `3px solid ${cfg.color}`,
                              background: n.read ? 'var(--card-bg)' : 'var(--bg)',
                              cursor: n.link ? 'pointer' : 'default',
                              display: 'flex', gap: 12, alignItems: 'flex-start',
                            }}
                          >
                            {/* Icon */}
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                              background: n.read ? 'var(--bg-2)' : `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: cfg.color,
                            }}>
                              {cfg.icon}
                            </div>
                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: n.read ? 500 : 700, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.3 }}>
                                  {n.title}
                                </p>
                                <span style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 10.5, color: 'var(--mute)', whiteSpace: 'nowrap', marginTop: 1, flexShrink: 0 }}>
                                  {timeAgo(n.created_at)}
                                </span>
                              </div>
                              {n.body && (
                                <p style={{
                                  fontFamily: '"Satoshi",sans-serif', fontSize: 12.5, color: 'var(--mute)',
                                  lineHeight: 1.5, marginTop: 3,
                                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>
                                  {n.body}
                                </p>
                              )}
                            </div>
                            {/* Unread dot */}
                            {!n.read && (
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C0392B', flexShrink: 0, marginTop: 5 }} />
                            )}
                          </m.div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </m.aside>
        </>
      )}
    </AnimatePresence>
  )
}
