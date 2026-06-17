'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import AppSidebar from '@/components/AppSidebar'
import SuggestionsPanel from '@/components/suggestions/SuggestionsPanel'

export default function AdminSuggestionsPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [userName,          setUserName]          = useState('Admin')
  const [userInitial,       setUserInitial]       = useState('A')
  const [pendingSuggestions,setPendingSuggestions] = useState(0)

  useEffect(() => {
    async function load() {
      if (MOCK_MODE) {
        setUserName(MOCK.currentCoordinator.name)
        setUserInitial(MOCK.currentCoordinator.name[0]?.toUpperCase() ?? 'A')
        const pending = (MOCK.suggestions as { status: string }[]).filter(s => s.status === 'pending').length
        setPendingSuggestions(pending)
        return
      }

      if (!supabaseRef.current) supabaseRef.current = createClient()
      const sb = supabaseRef.current
      if (!sb) return

      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await sb
        .from('profiles')
        .select('display_name, role')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || profile.role !== 'admin') {
        router.replace('/dashboard')
        return
      }

      const rawName = profile.display_name
      setUserName(rawName ?? user.email ?? 'Admin')
      setUserInitial(rawName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'A')

      const { count } = await sb
        .from('suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      setPendingSuggestions(count ?? 0)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', width: '100%', background: 'var(--bg,#F5F3EF)' }}>
      <AppSidebar
        role="admin"
        userName={userName}
        userInitial={userInitial}
        pendingSuggestions={pendingSuggestions}
      />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <SuggestionsPanel role="admin" />
      </div>
    </div>
  )
}
