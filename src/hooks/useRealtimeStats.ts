'use client'

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

export interface RealtimeStats {
  students: number
  schools: number
  badges: number
  xpTotal: number
}

export function useRealtimeStats() {
  const sbRef         = useRef<ReturnType<typeof createClient> | null>(null)
  const channelRef    = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)
  const [stats, setStats] = useState<RealtimeStats>({ students: 0, schools: 0, badges: 0, xpTotal: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Guard: prevents double-subscribe in React StrictMode (refs persist across
    // the mount→cleanup→mount cycle without full component destruction)
    if (subscribedRef.current) return
    subscribedRef.current = true

    if (!sbRef.current) sbRef.current = createClient()
    const sb = sbRef.current
    if (!sb) { setLoading(false); return }

    let cancelled = false

    async function fetchInitial() {
      const [
        { count: studentCount },
        { count: schoolCount },
        { count: badgeCount },
        { data: xpRows },
      ] = await Promise.all([
        sb!.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        sb!.from('schools').select('*', { count: 'exact', head: true }),
        sb!.from('user_badges').select('*', { count: 'exact', head: true }),
        sb!.from('xp_log').select('amount'),
      ])

      if (cancelled) return

      const xpTotal = (xpRows ?? []).reduce((s: number, r: { amount: number | null }) => s + (r.amount ?? 0), 0)
      setStats({
        students: studentCount ?? 0,
        schools:  schoolCount  ?? 0,
        badges:   badgeCount   ?? 0,
        xpTotal,
      })
      setLoading(false)
    }

    fetchInitial()

    // All .on() listeners MUST be chained before .subscribe()
    channelRef.current = sb
      .channel('global-stats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        setStats(prev => ({ ...prev, students: prev.students + 1 }))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_badges' }, () => {
        setStats(prev => ({ ...prev, badges: prev.badges + 1 }))
      })
      .subscribe()

    return () => {
      cancelled = true
      if (channelRef.current && sbRef.current) {
        sbRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  return { stats, loading }
}
