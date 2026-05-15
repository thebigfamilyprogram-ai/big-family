'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NewProjectPage() {
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) { if (!user) router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, school_id')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return
      if (!profile || profile.role !== 'student') { router.replace('/dashboard'); return }

      // Resume existing draft — never create a second one
      const { data: existing } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (existing) {
        router.replace(`/dashboard/projects/${existing.id}/edit`)
        return
      }

      // No draft exists — create exactly one
      const { data: created, error } = await supabase
        .from('projects')
        .insert({
          user_id:   user.id,
          school_id: profile.school_id ?? null,
          status:    'draft',
          title:     'Sin título',
        })
        .select('id')
        .maybeSingle()

      if (cancelled) return

      if (error) { console.error('Failed to create project:', error); router.replace('/dashboard/projects'); return }
      if (!created) { router.replace('/dashboard/projects'); return }

      router.replace(`/dashboard/projects/${created.id}/edit`)
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: 'Inter, sans-serif', color: 'var(--mute)',
      flexDirection: 'column', gap: 14,
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="rgba(13,13,13,.12)" strokeWidth="3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#C0392B" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ fontSize: 14 }}>Buscando borrador…</span>
    </div>
  )
}
