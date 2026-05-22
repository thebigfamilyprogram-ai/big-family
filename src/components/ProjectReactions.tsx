'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
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
    }
  }

  if (!userId) return null

  return (
    <div style={{ display: 'flex', gap: compact ? 6 : 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {reactions.map(r => (
        <div key={r.emoji} style={{ position: 'relative' }}
          onMouseEnter={() => r.count > 0 && setTooltip(r.emoji)}
          onMouseLeave={() => setTooltip(null)}
        >
          <motion.button
            onClick={() => handleToggle(r.emoji)}
            style={{
              display: 'flex', alignItems: 'center', gap: compact ? 3 : 5,
              padding: compact ? '4px 8px' : '6px 10px',
              borderRadius: 999,
              border: `1.5px solid ${r.byMe ? '#C0392B' : 'var(--line,rgba(13,13,13,.1))'}`,
              background: r.byMe ? 'rgba(192,57,43,.08)' : 'transparent',
              cursor: 'pointer',
              transition: 'border-color .15s, background .15s',
            }}
            animate={!pref && popping === r.emoji ? { scale: [1, 1.3, 1] } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            whileTap={pref ? undefined : { scale: 0.92 }}
          >
            <span style={{ fontSize: compact ? 13 : 15, lineHeight: 1 }}>{r.emoji}</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={r.count}
                initial={pref ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ fontSize: compact ? 11 : 12, fontWeight: 600, color: r.byMe ? '#C0392B' : 'var(--mute,#6B6B6B)', minWidth: 10, textAlign: 'center' }}
              >
                {r.count}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          {/* Tooltip */}
          <AnimatePresence>
            {tooltip === r.emoji && r.users.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--ink,#0D0D0D)', color: '#fff', borderRadius: 8,
                  padding: '7px 10px', fontSize: 12, whiteSpace: 'nowrap', zIndex: 10,
                  boxShadow: '0 4px 16px -4px rgba(0,0,0,.3)', pointerEvents: 'none',
                  maxWidth: 180, textOverflow: 'ellipsis', overflow: 'hidden',
                }}
              >
                {r.users.slice(0, 5).join(', ')}{r.users.length > 5 ? ` +${r.users.length - 5}` : ''}
                <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: 'var(--ink,#0D0D0D)', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
