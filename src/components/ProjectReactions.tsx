'use client'

import { useEffect, useRef, useState } from 'react'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'

const EMOJIS = ['🔥', '💡', '❤️', '👏', '⭐'] as const
type Emoji = typeof EMOJIS[number]

interface ReactionCount {
  emoji: Emoji
  count: number
  byMe: boolean
  users: string[]
}

interface Props {
  projectId: string
  compact?: boolean
}

export default function ProjectReactions({ projectId, compact = false }: Props) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()

  const [userId,    setUserId]    = useState<string | null>(null)
  const [reactions, setReactions] = useState<ReactionCount[]>(
    EMOJIS.map(e => ({ emoji: e, count: 0, byMe: false, users: [] }))
  )
  const [tooltip,   setTooltip]   = useState<Emoji | null>(null)
  const [popping,   setPopping]   = useState<Emoji | null>(null)
  const [expanded,  setExpanded]  = useState(false)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function load() {
      const { data: { user } } = await sb!.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: rows } = await sb!
        .from('project_reactions')
        .select('emoji, user_id, profiles(full_name)')
        .eq('project_id', projectId)

      const map: Record<string, { count: number; byMe: boolean; users: string[] }> = {}
      EMOJIS.forEach(e => { map[e] = { count: 0, byMe: false, users: [] } })

      rows?.forEach((r: { emoji: string; user_id: string; profiles: { full_name: string | null } | null }) => {
        if (map[r.emoji]) {
          map[r.emoji].count++
          if (r.user_id === user.id) map[r.emoji].byMe = true
          map[r.emoji].users.push(r.profiles?.full_name ?? 'Usuario')
        }
      })

      setReactions(EMOJIS.map(e => ({ emoji: e, ...map[e] })))
    }
    load()
  }, [projectId])

  async function handleToggle(emoji: Emoji) {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb || !userId) return

    const current = reactions.find(r => r.emoji === emoji)
    if (!current) return

    if (current.byMe) {
      await sb.from('project_reactions').delete()
        .eq('project_id', projectId).eq('user_id', userId).eq('emoji', emoji)
      setReactions(prev => prev.map(r =>
        r.emoji === emoji
          ? { ...r, byMe: false, count: r.count - 1, users: r.users.filter(u => u !== 'Tú') }
          : r
      ))
    } else {
      await sb.from('project_reactions').insert({ project_id: projectId, user_id: userId, emoji })
      setPopping(emoji)
      setTimeout(() => setPopping(null), 400)
      setReactions(prev => prev.map(r =>
        r.emoji === emoji
          ? { ...r, byMe: true, count: r.count + 1, users: [...r.users, 'Tú'] }
          : r
      ))
      setExpanded(false)
    }
  }

  if (!userId) return null

  // Reactions with at least one vote (always visible)
  const active = reactions.filter(r => r.count > 0)
  const pad = compact ? '4px 8px' : '6px 10px'
  const fontSize = compact ? 13 : 15
  const countSize = compact ? 11 : 12

  return (
    <div style={{ display: 'flex', gap: compact ? 4 : 6, flexWrap: 'wrap', alignItems: 'center' }}>

      {/* Active reactions (count > 0) — always shown */}
      {active.map(r => (
        <div key={r.emoji} style={{ position: 'relative' }}
          onMouseEnter={() => setTooltip(r.emoji)}
          onMouseLeave={() => setTooltip(null)}
        >
          <m.button
            type="button"
            onClick={() => handleToggle(r.emoji)}
            style={{
              display: 'flex', alignItems: 'center', gap: compact ? 3 : 5,
              padding: pad, borderRadius: 999,
              border: `1.5px solid ${r.byMe ? '#C0392B' : 'var(--line,rgba(13,13,13,.1))'}`,
              background: r.byMe ? 'rgba(192,57,43,.08)' : 'transparent',
              cursor: 'pointer', transition: 'border-color .15s, background .15s',
            }}
            animate={!pref && popping === r.emoji ? { scale: [1, 1.3, 1] } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            whileTap={pref ? undefined : { scale: 0.92 }}
          >
            <span style={{ fontSize, lineHeight: 1 }}>{r.emoji}</span>
            <AnimatePresence mode="wait">
              <m.span
                key={r.count}
                initial={pref ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ fontSize: countSize, fontWeight: 600, color: r.byMe ? '#C0392B' : 'var(--mute,#6B6B6B)', minWidth: 10, textAlign: 'center' }}
              >
                {r.count}
              </m.span>
            </AnimatePresence>
          </m.button>

          {/* Tooltip */}
          <AnimatePresence>
            {tooltip === r.emoji && r.users.length > 0 && (
              <m.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--ink,#0D0D0D)', color: '#fff', borderRadius: 8,
                  padding: '7px 10px', fontSize: 12, whiteSpace: 'nowrap', zIndex: 10,
                  boxShadow: '0 4px 16px -4px rgba(0,0,0,.3)', pointerEvents: 'none',
                  maxWidth: 200,
                }}
              >
                {r.users.slice(0, 5).join(', ')}{r.users.length > 5 ? ` +${r.users.length - 5}` : ''}
                <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: 'var(--ink,#0D0D0D)', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
              </m.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Picker: expand button → emoji palette */}
      <AnimatePresence>
        {expanded && (
          <m.div
            key="picker"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            style={{ display: 'flex', gap: compact ? 3 : 4, background: 'var(--card-bg,#fff)', border: '1px solid var(--line)', borderRadius: 999, padding: compact ? '3px 6px' : '5px 8px', boxShadow: '0 4px 16px -4px rgba(0,0,0,.12)' }}
          >
            {reactions.filter(r => !r.byMe).map(r => (
              <m.button
                key={r.emoji}
                type="button"
                onClick={() => handleToggle(r.emoji)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: compact ? 14 : 16, padding: '2px 3px', borderRadius: 6, transition: 'background .1s' }}
                whileHover={pref ? undefined : { scale: 1.2 }}
                whileTap={pref ? undefined : { scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                title={r.emoji}
              >
                {r.emoji}
              </m.button>
            ))}
          </m.div>
        )}
      </AnimatePresence>

      {/* + Reaccionar trigger */}
      <m.button
        type="button"
        onClick={() => setExpanded(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 3,
          padding: compact ? '4px 8px' : '6px 10px',
          borderRadius: 999,
          border: `1.5px solid ${expanded ? 'var(--ink)' : 'var(--line,rgba(13,13,13,.1))'}`,
          background: expanded ? 'var(--line)' : 'transparent',
          cursor: 'pointer', color: 'var(--mute,#6B6B6B)',
          fontSize: compact ? 11 : 12, fontWeight: 600, fontFamily: 'inherit',
          transition: 'border-color .15s, background .15s, color .15s',
        }}
        whileTap={pref ? undefined : { scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <span style={{ fontSize: compact ? 12 : 14 }}>+</span>
        {!compact && <span>Reaccionar</span>}
      </m.button>

    </div>
  )
}
