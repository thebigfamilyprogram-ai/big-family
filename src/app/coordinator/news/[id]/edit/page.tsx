'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import NewsEditor, { type NewsData } from '@/components/NewsEditor'

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

export default function EditNewsPage() {
  const router = useRouter()
  const params = useParams()
  const newsId = params.id as string
  const supabase = createClient()

  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [userId,   setUserId]   = useState('')
  const [newsData, setNewsData] = useState<NewsData | null>(null)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) { router.replace('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (!profile || profile.role !== 'coordinator') { router.replace('/login'); return }

      setUserId(user.id)

      const { data: row } = await supabase
        .from('news')
        .select('*')
        .eq('id', newsId)
        .maybeSingle()
      if (cancelled) return
      if (!row) { setNotFound(true); setLoading(false); return }

      setNewsData({
        id:             row.id,
        title:          row.title ?? '',
        slug:           row.slug ?? '',
        content:        row.content ?? '',
        cover_url:      row.cover_url ?? null,
        gallery_urls:   row.gallery_urls ?? [],
        published:      row.published ?? false,
        published_at:   row.published_at ?? null,
        school_id:      row.school_id ?? null,
        layout_options: row.layout_options ?? null,
        featured_quote: row.featured_quote ?? null,
        accent_color:   row.accent_color ?? null,
        highlight_stat: row.highlight_stat ?? null,
      })
      setLoading(false)
    }
    boot()
    return () => { cancelled = true }
  }, [newsId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px' }}>
          <Sk w={120} h={13} r={6} />
          <div style={{ display: 'flex', gap: 24, marginTop: 24, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 28 }}>
                <Sk w="80%" h={42} r={8} />
                <div style={{ marginTop: 16 }}><Sk w="50%" h={14} /></div>
                <div style={{ marginTop: 24 }}><Sk h={320} r={8} /></div>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: 28 }}><Sk h={200} r={10} /></div>
            </div>
            <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 20 }}>
                <Sk w="60%" h={16} r={6} />
                <div style={{ marginTop: 16 }}><Sk h={44} r={999} /></div>
                <div style={{ marginTop: 10 }}><Sk h={44} r={999} /></div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (notFound) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--ink)' }}>Noticia no encontrada</div>
        <button onClick={() => router.push('/coordinator/news')} style={{ padding: '10px 22px', borderRadius: 999, background: '#C0392B', color: '#fff', border: 'none', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Ver mis noticias
        </button>
      </div>
    )
  }

  return newsData ? (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <NewsEditor newsId={newsId} initialData={newsData} userId={userId} />
    </div>
  ) : null
}
