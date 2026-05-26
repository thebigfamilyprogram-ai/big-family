'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DashboardSidebar from '@/components/DashboardSidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [userName,   setUserName]   = useState('…')
  const [userInit,   setUserInit]   = useState('L')
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
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle()

      setUserName(profile?.full_name ?? 'Líder')
      setUserInit((profile?.full_name ?? 'L')[0].toUpperCase())
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
        .lte('published_at', now)
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
    </div>
  )
}
