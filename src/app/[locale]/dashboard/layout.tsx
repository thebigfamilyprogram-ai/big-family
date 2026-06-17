'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DashboardSidebar from '@/components/DashboardSidebar'
import SuggestionButton from '@/components/SuggestionButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [userName,   setUserName]   = useState('')
  const [userInit,   setUserInit]   = useState('')
  const [userRole,   setUserRole]   = useState<string | undefined>(undefined)
  const [unread,     setUnread]     = useState(0)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    async function load() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await sb
        .from('profiles')
        .select('display_name, role')
        .eq('id', user.id)
        .maybeSingle()

      const rawName  = profile?.display_name
      const initials = rawName
        ? rawName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : user.email?.split('@')[0].slice(0, 2).toUpperCase() ?? 'LI'
      setUserName(rawName ?? user.email ?? '—')
      setUserInit(initials)
      setUserRole(profile?.role ?? undefined)

      const { data: reads } = await sb
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)
      const readIds = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id))
      const now = new Date().toISOString()
      const { data: anns } = await sb
        .from('announcements')
        .select('id')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
      setUnread((anns ?? []).filter((a: { id: string }) => !readIds.has(a.id)).length)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', width: '100%' }}>
      <DashboardSidebar
        userName={userName}
        userInitial={userInit}
        userRole={userRole}
        unreadAnnouncements={unread}
      />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <SuggestionButton />
    </div>
  )
}
