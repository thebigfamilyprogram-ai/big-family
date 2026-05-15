'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NewNewsPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) { router.replace('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role, school_id').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (!profile || profile.role !== 'coordinator') { router.replace('/login'); return }

      // Check for existing draft
      const { data: existing } = await supabase
        .from('news')
        .select('id')
        .eq('author_id', user.id)
        .eq('published', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return

      if (existing) {
        router.replace(`/coordinator/news/${existing.id}/edit`)
        return
      }

      // Create new draft
      const { data: created, error } = await supabase
        .from('news')
        .insert({
          author_id:    user.id,
          school_id:    profile.school_id ?? null,
          title:        '',
          slug:         '',
          content:      '',
          cover_url:    null,
          gallery_urls: [],
          published:    false,
        })
        .select('id')
        .maybeSingle()
      if (cancelled) return
      if (error) { console.error('Failed to create news:', error); router.replace('/coordinator/news'); return }
      if (!created) { router.replace('/coordinator/news'); return }

      router.replace(`/coordinator/news/${created.id}/edit`)
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: 'Inter,sans-serif', color: 'var(--mute)', flexDirection: 'column', gap: 14 }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="rgba(13,13,13,.12)" strokeWidth="3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#C0392B" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ fontSize: 14 }}>Preparando editor…</span>
    </div>
  )
}
