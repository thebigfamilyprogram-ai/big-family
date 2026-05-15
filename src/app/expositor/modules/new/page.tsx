'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NewModulePage() {
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (!profile || profile.role !== 'expositor') { router.replace('/login'); return }

      // Count existing modules to set order_index
      const { count } = await supabase
        .from('modules').select('id', { count: 'exact', head: true }).eq('created_by', user.id)
      if (cancelled) return

      const { data: created, error } = await supabase
        .from('modules')
        .insert({
          created_by:       user.id,
          title:            'Nuevo módulo',
          status:           'draft',
          level:            'junior',
          duration_minutes: 0,
          xp_reward:        100,
          order_index:      count ?? 0,
        })
        .select('id')
        .maybeSingle()

      if (cancelled) return
      if (error) { console.error('Failed to create module:', error); router.replace('/expositor'); return }
      if (!created) { router.replace('/expositor'); return }

      router.replace(`/expositor/modules/${created.id}/edit`)
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: 'Inter, sans-serif', color: 'var(--mute)', flexDirection: 'column', gap: 14 }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="rgba(13,13,13,.12)" strokeWidth="3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#C0392B" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ fontSize: 14 }}>Creando módulo…</span>
    </div>
  )
}
