'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DashboardSidebar from '@/components/DashboardSidebar'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { springNatural } from '@/lib/animations'

interface FeedItem {
  id: string
  user_id: string
  type: string
  metadata: Record<string, string> | null
  created_at: string
  full_name: string | null
  school_name: string | null
  initials: string
}

type FeedFilter = 'all' | 'module_completed' | 'project_submitted' | 'badge_earned' | 'certified' | 'goal_completed'

const PAGE_SIZE = 20

const TYPE_META: Record<string, { icon: string; label: string; color: string; border: string }> = {
  module_completed:  { icon: '📚', label: 'completó un módulo',  color: '#3B82F6', border: '#3B82F6' },
  project_submitted: { icon: '📤', label: 'envió un proyecto',   color: '#C0392B', border: '#C0392B' },
  badge_earned:      { icon: '🏅', label: 'ganó un badge',       color: '#F59E0B', border: '#F59E0B' },
  certified:         { icon: '🎓', label: 'fue certificado/a',   color: '#10B981', border: '#10B981' },
  goal_completed:    { icon: '🎯', label: 'completó una meta',   color: '#8B5CF6', border: '#8B5CF6' },
}

const FILTER_LABELS: Record<FeedFilter, string> = {
  all:               'Todos',
  module_completed:  'Módulos',
  project_submitted: 'Proyectos',
  badge_earned:      'Badges',
  certified:         'Certificaciones',
  goal_completed:    'Metas',
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `hace ${d}d`
  return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

export default function FeedPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()

  const [loading,    setLoading]    = useState(true)
  const [loadMore,   setLoadMore]   = useState(false)
  const [items,      setItems]      = useState<FeedItem[]>([])
  const [filter,     setFilter]     = useState<FeedFilter>('all')
  const [offset,     setOffset]     = useState(0)
  const [hasMore,    setHasMore]    = useState(true)
  const [userName,   setUserName]   = useState('…')
  const [userInit,   setUserInit]   = useState('L')
  const [showTop,    setShowTop]    = useState(false)
  const loadRef     = useRef<HTMLDivElement>(null)

  // Scroll-to-top: show button after 400px scroll
  useEffect(() => {
    function onScroll() { setShowTop(window.scrollY > 400) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function fetchItems(off: number, f: FeedFilter, reset: boolean) {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return

    let q = sb.from('activity_feed').select('id, user_id, type, metadata, created_at').order('created_at', { ascending: false }).range(off, off + PAGE_SIZE - 1)
    if (f !== 'all') q = q.eq('type', f)
    const { data: feedRows } = await q

    if (!feedRows || feedRows.length === 0) { setHasMore(false); if (reset) setItems([]); return }
    if (feedRows.length < PAGE_SIZE) setHasMore(false)

    const userIds = [...new Set(feedRows.map((r: { user_id: string }) => r.user_id))] as string[]
    const [{ data: profiles }, { data: schools }] = await Promise.all([
      sb.from('profiles').select('id, full_name, school_id').in('id', userIds),
      sb.from('schools').select('id, name'),
    ])

    const profileMap: Record<string, { name: string | null; school_id: string | null }> = {}
    profiles?.forEach((p: { id: string; full_name: string | null; school_id: string | null }) => { profileMap[p.id] = { name: p.full_name, school_id: p.school_id } })
    const schoolMap: Record<string, string> = {}
    schools?.forEach((s: { id: string; name: string }) => { schoolMap[s.id] = s.name })

    const mapped: FeedItem[] = feedRows.map((r: { id: string; user_id: string; type: string; metadata: Record<string, string> | null; created_at: string }) => {
      const prof = profileMap[r.user_id]
      const name = prof?.name ?? 'Usuario'
      const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'U'
      return { ...r, full_name: name, school_name: prof?.school_id ? (schoolMap[prof.school_id] ?? null) : null, initials }
    })

    if (reset) setItems(mapped)
    else setItems(prev => [...prev, ...mapped])
  }

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function boot() {
      const { data: { user } } = await sb!.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await sb!.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      setUserName(profile?.full_name ?? 'Líder')
      setUserInit((profile?.full_name ?? 'L')[0].toUpperCase())
      await fetchItems(0, 'all', true)
      setLoading(false)
    }
    boot()
  }, [])

  async function handleFilterChange(f: FeedFilter) {
    setFilter(f); setOffset(0); setHasMore(true); setLoading(true)
    await fetchItems(0, f, true)
    setLoading(false)
  }

  async function handleLoadMore() {
    setLoadMore(true)
    const newOff = offset + PAGE_SIZE
    await fetchItems(newOff, filter, false)
    setOffset(newOff)
    setLoadMore(false)
  }

  // Intersection observer for auto-load
  useEffect(() => {
    const el = loadRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadMore && !loading) handleLoadMore()
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadMore, loading, offset, filter])

  function getDescription(item: FeedItem): string {
    const meta = item.metadata ?? {}
    if (item.type === 'module_completed'  && meta.module_title)  return `"${meta.module_title}"`
    if (item.type === 'project_submitted' && meta.project_title) return `"${meta.project_title}"`
    if (item.type === 'badge_earned'      && meta.badge_name)    return `${meta.badge_icon ?? '🏅'} ${meta.badge_name}`
    if (item.type === 'certified'         && meta.project_title) return `"${meta.project_title}"`
    if (item.type === 'goal_completed'    && meta.goal_title)    return `"${meta.goal_title}"`
    return ''
  }

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        .layout{display:grid;grid-template-columns:260px 1fr;min-height:100vh;max-width:1280px;margin:0 auto;}
        .content{padding:32px 28px;display:flex;flex-direction:column;gap:20px;min-width:0;}
        .page-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:26px;letter-spacing:-0.02em;color:var(--ink);}
        .filter-row{display:flex;gap:8px;flex-wrap:wrap;}
        .filter-btn{padding:6px 14px;border-radius:999px;border:1.5px solid var(--line);font-size:12.5px;font-weight:600;cursor:pointer;background:none;color:var(--mute);transition:all .15s;}
        .filter-btn:hover{border-color:var(--ink);color:var(--ink);}
        .filter-btn.active{background:var(--ink);border-color:var(--ink);color:#fff;}
        .feed-item{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid var(--line-soft);}
        .feed-item:last-child{border-bottom:none;}
        .feed-avatar{width:38px;height:38px;border-radius:50%;color:#fff;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .feed-body{flex:1;min-width:0;}
        .feed-name{font-family:"Satoshi",sans-serif;font-weight:600;font-size:13.5px;color:var(--ink);}
        .feed-action{font-size:13px;color:var(--ink-2);margin-top:2px;line-height:1.45;}
        .feed-meta{font-size:11.5px;color:var(--mute);margin-top:4px;}
        .scroll-top{position:fixed;bottom:32px;right:32px;width:44px;height:44px;border-radius:50%;background:var(--ink);color:var(--bg);border:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px -4px rgba(0,0,0,.3);z-index:50;transition:background .2s;}
        .scroll-top:hover{background:#C0392B;}
        @media(max-width:860px){.layout{grid-template-columns:1fr;}}
      `}</style>

      <div className="layout">
        <DashboardSidebar activePage="feed" userName={userName} userInitial={userInit} />

        <motion.main
          className="content"
          initial={pref ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="page-title">Feed de Actividad</div>

          <div className="filter-row">
            {(Object.keys(FILTER_LABELS) as FeedFilter[]).map(f => (
              <button type="button" key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => handleFilterChange(f)}>
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: '4px 24px', boxShadow: '0 2px 16px -6px rgba(13,13,13,.08)' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <Sk w={38} h={38} r={999} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Sk w="40%" h={13} r={5} />
                      <Sk w="70%" h={12} r={5} />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--mute)', fontSize: 13 }}>No hay actividad todavía.</div>
            ) : (
              <motion.div
                initial={pref ? false : 'hidden'}
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.025 } } }}
              >
                {items.map((item, idx) => {
                  const meta = TYPE_META[item.type] ?? { icon: '⚡', label: item.type, color: '#C0392B', border: '#C0392B' }
                  const desc = getDescription(item)
                  // Cap stagger at 8 items: beyond index 7, appear instantly
                  const itemVariants = idx < 8
                    ? { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: springNatural } }
                    : { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
                  return (
                    <motion.div
                      key={item.id}
                      className="feed-item"
                      variants={itemVariants}
                      style={{ boxShadow: `inset 3px 0 0 ${meta.border}`, paddingLeft: 12, marginLeft: -12 }}
                    >
                      <div
                        className="feed-avatar"
                        style={{ background: `linear-gradient(135deg, ${meta.color}, color-mix(in srgb, ${meta.color} 60%, #0D0D0D))` }}
                      >
                        {item.initials}
                      </div>
                      <div className="feed-body">
                        <div className="feed-name">{item.full_name}</div>
                        <div className="feed-action">
                          <span style={{ marginRight: 5 }}>{meta.icon}</span>
                          <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                          {desc && <span style={{ color: 'var(--mute)' }}> — {desc}</span>}
                        </div>
                        <div className="feed-meta">
                          {item.school_name && <span style={{ marginRight: 8 }}>🏫 {item.school_name}</span>}
                          <span>{timeAgo(item.created_at)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={loadRef} style={{ height: 1 }} />
            {loadMore && (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--mute)' }}>Cargando más…</div>
            )}
            {!hasMore && items.length > 0 && (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--mute)', borderTop: '1px solid var(--line-soft)', marginTop: 4 }}>
                — Fin del feed —
              </div>
            )}
          </div>
        </motion.main>
      </div>

      {/* Scroll-to-top button */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            className="scroll-top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            initial={pref ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            aria-label="Volver arriba"
          >
            ↑
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}
