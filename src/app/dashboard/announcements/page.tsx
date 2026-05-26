'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { m, useReducedMotion } from 'framer-motion'
import { springNatural } from '@/lib/animations'

interface Announcement {
  id: string
  title: string
  content: string
  category: string
  created_at: string
  expires_at: string | null
}

interface AnnRead {
  announcement_id: string
}

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  'Operativo':    { bg: 'rgba(59,130,246,.15)',  color: '#3B82F6' },
  'Motivacional': { bg: 'rgba(34,197,94,.15)',   color: '#16a34a' },
  'Evento':       { bg: 'rgba(192,57,43,.15)',   color: '#C0392B' },
  'Logro':        { bg: 'rgba(245,158,11,.15)',  color: '#d97706' },
}

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

export default function AnnouncementsPage() {
  const router       = useRouter()
  const supabaseRef  = useRef<ReturnType<typeof createClient> | null>(null)
  const pref         = useReducedMotion()

  const [loading,      setLoading]      = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [readIds,      setReadIds]      = useState<Set<string>>(new Set())
  const [userId,       setUserId]       = useState('')
  const [userName,     setUserName]     = useState('…')
  const [userInit,     setUserInit]     = useState('L')

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function load() {
      const { data: { user } } = await sb!.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const { data: profile } = await sb!.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      setUserName(profile?.full_name ?? 'Líder')
      setUserInit((profile?.full_name ?? 'L')[0].toUpperCase())

      const [{ data: ann }, { data: reads }] = await Promise.all([
        sb!.from('announcements').select('id, title, content, category, created_at, expires_at').order('created_at', { ascending: false }),
        sb!.from('announcement_reads').select('announcement_id').eq('user_id', user.id),
      ])

      setAnnouncements(ann ?? [])
      setReadIds(new Set(reads?.map((r: AnnRead) => r.announcement_id) ?? []))
      setLoading(false)
    }
    load()
  }, [])

  async function markRead(id: string) {
    if (readIds.has(id) || !supabaseRef.current) return
    const sb = supabaseRef.current
    await sb.from('announcement_reads').insert({ user_id: userId, announcement_id: id }).select()
    setReadIds(prev => new Set([...prev, id]))
  }

  const unread = announcements.filter(a => !readIds.has(a.id)).length

  return (
    <>
      <style>{`
        
        .content{flex:1;min-width:0;overflow-y:auto;padding:32px 28px;display:flex;flex-direction:column;gap:20px;}
        .page-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:26px;letter-spacing:-0.02em;color:var(--ink);}
        .ann-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:20px 22px;box-shadow:0 2px 12px -6px rgba(13,13,13,.07);cursor:pointer;transition:box-shadow .2s;}
        .ann-card:hover{box-shadow:0 6px 24px -8px rgba(13,13,13,.12);}
        .ann-card.unread{box-shadow:inset 3px 0 0 #C0392B,0 2px 12px -6px rgba(13,13,13,.07);}
        .ann-card.read{opacity:.72;}
        .ann-header{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;}
        .ann-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:var(--ink);}
        .ann-content{font-size:13.5px;color:var(--ink-2);line-height:1.6;}
        .ann-meta{font-size:11.5px;color:var(--mute);margin-top:8px;}
      `}</style>

      <m.main
          className="content"
          initial={pref ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="page-title">Anuncios</div>
            {unread > 0 && (
              <span style={{ padding: '4px 12px', background: 'rgba(192,57,43,.1)', color: '#C0392B', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                {unread} sin leer
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1,2,3].map(i => <Sk key={i} h={96} r={14} />)}
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--mute)', fontSize: 13 }}>
              No hay anuncios todavía.
            </div>
          ) : (
            <m.div
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              initial={pref ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            >
              {announcements.map(ann => {
                const isRead = readIds.has(ann.id)
                const catStyle = CATEGORY_STYLES[ann.category] ?? { bg: 'var(--line)', color: 'var(--mute)' }
                return (
                  <m.div
                    key={ann.id}
                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: springNatural } }}
                    className={`ann-card ${isRead ? 'read' : 'unread'}`}
                    onClick={() => markRead(ann.id)}
                  >
                    <div className="ann-header">
                      <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: catStyle.bg, color: catStyle.color, whiteSpace: 'nowrap' }}>{ann.category}</span>
                      {!isRead && <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(192,57,43,.1)', color: '#C0392B' }}>Nuevo</span>}
                    </div>
                    <div className="ann-title">{ann.title}</div>
                    <div className="ann-content">{ann.content}</div>
                    <div className="ann-meta">{new Date(ann.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                  </m.div>
                )
              })}
            </m.div>
          )}
      </m.main>
    </>
  )
}
