'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, useReducedMotion } from 'framer-motion'
import { springNatural } from '@/lib/animations'

interface Story {
  id: string
  title: string
  story: string
  cover_url: string | null
  published_at: string | null
  student_name: string | null
  school_name: string | null
}

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

export default function SuccessStoriesPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()

  const [loading, setLoading] = useState(true)
  const [stories, setStories] = useState<Story[]>([])

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function load() {
      const { data: rows } = await sb!.from('success_stories').select('id, title, story, cover_url, published_at, student_id, school_id').eq('published', true).order('published_at', { ascending: false })
      if (!rows || rows.length === 0) { setLoading(false); return }

      const userIds   = [...new Set(rows.map((r: { student_id: string }) => r.student_id))] as string[]
      const schoolIds = [...new Set(rows.map((r: { school_id: string | null }) => r.school_id).filter(Boolean))] as string[]
      const [{ data: profiles }, { data: schools }] = await Promise.all([
        sb!.from('profiles').select('id, full_name').in('id', userIds),
        schoolIds.length ? sb!.from('schools').select('id, name').in('id', schoolIds) : Promise.resolve({ data: [] }),
      ])

      const profMap: Record<string, string> = {}
      profiles?.forEach((p: { id: string; full_name: string | null }) => { profMap[p.id] = p.full_name ?? 'Estudiante' })
      const schoolMap: Record<string, string> = {}
      schools?.forEach((s: { id: string; name: string }) => { schoolMap[s.id] = s.name })

      setStories(rows.map((r: { id: string; title: string; story: string; cover_url: string | null; published_at: string | null; student_id: string; school_id: string | null }) => ({
        id: r.id, title: r.title, story: r.story, cover_url: r.cover_url, published_at: r.published_at,
        student_name: profMap[r.student_id] ?? null, school_name: r.school_id ? (schoolMap[r.school_id] ?? null) : null,
      })))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);color:var(--ink);}
        .nav{height:62px;border-bottom:1px solid var(--card-border);display:flex;align-items:center;padding:0 40px;background:var(--card-bg);position:sticky;top:0;z-index:20;}
        .nav__brand{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);text-decoration:none;display:flex;align-items:center;gap:8px;}
        .nav__right{margin-left:auto;display:flex;gap:12px;}
        .btn-sm{padding:7px 14px;border:1px solid var(--line);border-radius:999px;font-size:12.5px;cursor:pointer;background:none;color:var(--ink);transition:all .2s;}
        .btn-sm:hover{border-color:var(--ink);}
        .page{max-width:1100px;margin:0 auto;padding:60px 40px 80px;}
        .hero{text-align:center;margin-bottom:48px;}
        .hero__eyebrow{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#C0392B;margin-bottom:12px;}
        .hero__h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:44px;letter-spacing:-0.03em;color:var(--ink);margin-bottom:16px;}
        .hero__sub{font-size:16px;color:var(--mute);max-width:520px;margin:0 auto;line-height:1.6;}
        .masonry{columns:3 280px;gap:20px;}
        .story-card{break-inside:avoid;margin-bottom:20px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;overflow:hidden;box-shadow:0 2px 12px -4px rgba(13,13,13,.07);display:block;text-decoration:none;transition:transform .2s,box-shadow .2s;}
        .story-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px -8px rgba(13,13,13,.14);}
        .story-cover{width:100%;height:180px;object-fit:cover;display:block;}
        .story-cover-placeholder{width:100%;height:120px;background:linear-gradient(135deg,#C0392B,#8B1A1A);display:flex;align-items:center;justify-content:center;}
        .story-body{padding:16px 18px 18px;}
        .story-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);margin-bottom:6px;line-height:1.3;}
        .story-excerpt{font-size:13.5px;color:var(--ink-2);line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:10px;}
        .story-meta{font-size:12px;color:var(--mute);}
        @media(max-width:600px){.hero__h1{font-size:32px;}.masonry{columns:1;}.page{padding:40px 20px 60px;}}
      `}</style>

      <nav className="nav">
        <a className="nav__brand" href="/">
          <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="5" r="2.4" fill="#C0392B"/><path d="M12 7.5 L20 22 H4 Z" fill="var(--ink)"/></svg>
          Big Family
        </a>
        <div className="nav__right">
          <button className="btn-sm" onClick={() => router.push('/dashboard')}>Mi Dashboard</button>
        </div>
      </nav>

      <div className="page">
        <div className="hero">
          <div className="hero__eyebrow">Comunidad Big Family</div>
          <h1 className="hero__h1">Historias de Éxito</h1>
          <p className="hero__sub">Estudiantes que transformaron su comunidad. Historias reales de liderazgo y cambio.</p>
        </div>

        {loading ? (
          <div style={{ columns: '3 280px', gap: 20 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: 20, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                <Sk w="100%" h={160} r={0} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Sk w="80%" h={16} r={6} />
                  <Sk w="100%" h={12} r={5} />
                  <Sk w="100%" h={12} r={5} />
                  <Sk w="50%" h={10} r={5} />
                </div>
              </div>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mute)', fontSize: 14 }}>
            No hay historias publicadas todavía. ¡Vuelve pronto!
          </div>
        ) : (
          <motion.div
            className="masonry"
            initial={pref ? false : 'hidden'}
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          >
            {stories.map(s => (
              <motion.a
                key={s.id}
                href={`/success-stories/${s.id}`}
                className="story-card"
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: springNatural } }}
                whileHover={pref ? undefined : { y: -4 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              >
                {s.cover_url
                  ? <img src={s.cover_url} alt={s.title} className="story-cover" />
                  : (
                    <div className="story-cover-placeholder">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2l1.8 4.9H18l-4.1 3 1.5 4.9L12 12.2l-3.4 2.6L10 9.9 5.9 6.9H11L12 2Z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )
                }
                <div className="story-body">
                  <div className="story-title">{s.title}</div>
                  <div className="story-excerpt">{s.story}</div>
                  <div className="story-meta">
                    {s.student_name && <span style={{ fontWeight: 600 }}>{s.student_name}</span>}
                    {s.school_name && <span style={{ marginLeft: 6 }}>· {s.school_name}</span>}
                  </div>
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </div>
    </>
  )
}
