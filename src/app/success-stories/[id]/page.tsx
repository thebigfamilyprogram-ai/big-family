'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'

interface StoryDetail {
  id: string
  title: string
  story: string
  cover_url: string | null
  published_at: string | null
  student_name: string | null
  school_name: string | null
  project_title: string | null
}

export default function StoryDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [story,   setStory]   = useState<StoryDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb || !id) return
    async function load() {
      const { data: row } = await sb!.from('success_stories').select('id, title, story, cover_url, published_at, student_id, school_id, project_id').eq('id', id).eq('published', true).maybeSingle()
      if (!row) { setLoading(false); return }

      const [{ data: prof }, { data: school }, { data: project }] = await Promise.all([
        sb!.from('profiles').select('full_name').eq('id', row.student_id).maybeSingle(),
        row.school_id ? sb!.from('schools').select('name').eq('id', row.school_id).maybeSingle() : Promise.resolve({ data: null }),
        row.project_id ? sb!.from('projects').select('title').eq('id', row.project_id).maybeSingle() : Promise.resolve({ data: null }),
      ])

      setStory({
        id: row.id, title: row.title, story: row.story, cover_url: row.cover_url, published_at: row.published_at,
        student_name: prof?.full_name ?? null, school_name: school?.name ?? null,
        project_title: project?.title ?? null,
      })
      setLoading(false)
    }
    load()
  }, [id])

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);color:var(--ink);}
        .nav{height:62px;border-bottom:1px solid var(--card-border);display:flex;align-items:center;padding:0 40px;background:var(--card-bg);position:sticky;top:0;z-index:20;}
        .nav__back{font-family:"Satoshi",sans-serif;font-weight:600;font-size:14px;color:var(--ink);text-decoration:none;display:flex;align-items:center;gap:6px;transition:color .15s;}
        .nav__back:hover{color:#C0392B;}
        .page{max-width:720px;margin:0 auto;padding:48px 24px 80px;}
        .cover{width:100%;height:360px;object-fit:cover;border-radius:16px;display:block;margin-bottom:32px;}
        .eyebrow{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#C0392B;margin-bottom:14px;}
        .title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:36px;letter-spacing:-0.025em;color:var(--ink);margin-bottom:18px;line-height:1.15;}
        .meta{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid var(--line);}
        .meta-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);}
        .meta-school{font-size:13px;color:var(--mute);}
        .body{font-size:16px;color:var(--ink-2);line-height:1.8;white-space:pre-wrap;}
        @media(max-width:600px){.title{font-size:28px;}.page{padding:32px 16px 60px;}.cover{height:220px;}}
      `}</style>

      <nav className="nav">
        <a className="nav__back" href="/success-stories">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Historias de Éxito
        </a>
      </nav>

      <div className="page">
        {loading ? (
          <div style={{ fontSize: 14, color: 'var(--mute)', textAlign: 'center', paddingTop: 60 }}>Cargando…</div>
        ) : !story ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <p style={{ fontSize: 14, color: 'var(--mute)', marginBottom: 20 }}>Historia no encontrada.</p>
            <a href="/success-stories" style={{ color: '#C0392B', fontSize: 13 }}>← Volver a historias</a>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            {story.cover_url && <img src={story.cover_url} alt={story.title} className="cover" />}
            <div className="eyebrow">Historia de Éxito</div>
            <h1 className="title">{story.title}</h1>
            <div className="meta">
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#C0392B,#8B1A1A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {(story.student_name ?? 'E')[0].toUpperCase()}
              </div>
              <div>
                <div className="meta-name">{story.student_name ?? 'Estudiante'}</div>
                {story.school_name && <div className="meta-school">{story.school_name}</div>}
              </div>
              {story.project_title && (
                <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--mute)', fontStyle: 'italic' }}>
                  Proyecto: {story.project_title}
                </div>
              )}
            </div>
            <div className="body">{story.story}</div>
          </motion.div>
        )}
      </div>
    </>
  )
}
