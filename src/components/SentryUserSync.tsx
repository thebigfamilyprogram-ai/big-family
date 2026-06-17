'use client'

import { useEffect, useRef } from 'react'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase'

export default function SentryUserSync() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return

    async function syncUser() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        Sentry.setUser(null)
        return
      }

      const { data: profile } = await sb
        .from('profiles')
        .select('role, school_id')
        .eq('id', user.id)
        .maybeSingle()

      Sentry.setUser({
        id:     user.id,
        role:   (profile as { role?: string } | null)?.role   ?? 'unknown',
        school: (profile as { school_id?: string } | null)?.school_id ?? 'unknown',
      })
    }
    syncUser()
  }, [])

  return null
}
