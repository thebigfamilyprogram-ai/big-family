'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppSidebar from '@/components/AppSidebar'

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [userName,   setUserName]   = useState('…')
  const [userInit,   setUserInit]   = useState('C')
  const [schoolName, setSchoolName] = useState<string | undefined>(undefined)
  const [unread,     setUnread]     = useState(0)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    async function load() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await sb
        .from('profiles')
        .select('display_name, role, school_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || (profile.role !== 'coordinator' && profile.role !== 'admin')) {
        router.replace('/dashboard')
        return
      }

      const displayName = (profile as { display_name?: string | null }).display_name ?? '…'
      setUserName(displayName)
      setUserInit(displayName[0]?.toUpperCase() ?? 'C')

      const schoolId = (profile as { school_id?: string | null }).school_id
      if (schoolId) {
        const { data: school } = await sb
          .from('schools')
          .select('name')
          .eq('id', schoolId)
          .maybeSingle()
        setSchoolName((school as { name?: string } | null)?.name)
      }

      const { data: reads } = await sb
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)
      const readIds = new Set(
        (reads ?? []).map((r: { announcement_id: string }) => r.announcement_id)
      )
      const now = new Date().toISOString()
      const { data: anns } = await sb
        .from('announcements')
        .select('id')
        .lte('published_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
      setUnread(
        (anns ?? []).filter((a: { id: string }) => !readIds.has(a.id)).length
      )
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', width: '100%' }}>
      <AppSidebar
        role="coordinator"
        userName={userName}
        userInitial={userInit}
        schoolName={schoolName}
        unreadAnnouncements={unread}
      />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
