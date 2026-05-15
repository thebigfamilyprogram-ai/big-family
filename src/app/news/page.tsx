'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface NewsItem {
  id:           string
  title:        string
  slug:         string
  content:      string
  cover_url:    string | null
  published_at: string | null
  author_name:  string
  featured:     boolean
}

function excerpt(html: string, max = 120): string {
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

function PlaceholderImg({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity: .2 }}>
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M3 15l5-4 4 4 3-2.5 6 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function NewsListPage() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [articles, setArticles] = useState<NewsItem[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    async function load() {
      const { data: rows } = await supabase
        .from('news')
        .select('id, title, slug, content, cover_url, published_at, author_id, featured')
        .eq('published', true)
        .order('published_at', { ascending: false })

      if (!rows || rows.length === 0) { setLoading(false); return }

      const authorIds = [...new Set(rows.map((r: { author_id: string }) => r.author_id))]
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', authorIds)
      const pMap: Record<string, string> = {}
      profiles?.forEach((p: { id: string; full_name: string | null }) => { pMap[p.id] = p.full_name ?? '—' })

      setArticles(rows.map((r: { id: string; title: string; slug: string; content: string; cover_url: string | null; published_at: string | null; author_id: string; featured: boolean | null }) => ({ ...r, author_name: pMap[r.author_id] ?? '—', featured: r.featured ?? false })))
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const featured  = articles.find(a => a.featured) ?? null
  const rest      = articles.filter(a => !a.featured)

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;color:#0D0D0D;}

        /* ── Nav ── */
        .nl-nav{position:sticky;top:0;z-index:30;background:rgba(245,243,239,.88);backdrop-filter:saturate(150%) blur(16px);border-bottom:1px solid rgba(13,13,13,.08);height:60px;display:flex;align-items:center;padding:0 40px;gap:24px;}
        .nl-brand{display:flex;align-items:center;gap:8px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;color:#0D0D0D;}
        .nl-nav-links{display:flex;gap:28px;flex:1;justify-content:center;}
        .nl-nav-links a{font-size:13.5px;color:#6B6B6B;text-decoration:none;transition:color .15s;}
        .nl-nav-links a:hover{color:#0D0D0D;}
        .nl-nav-links a.active{color:#C0392B;font-weight:600;}

        /* ── Main ── */
        .nl-main{max-width:1100px;margin:0 auto;padding:60px 40px 100px;}

        /* ── Hero ── */
        .nl-hero{text-align:center;margin-bottom:60px;}
        .nl-hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:#C0392B;margin-bottom:12px;}
        .nl-hero-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(36px,6vw,64px);letter-spacing:-.03em;color:#0D0D0D;margin-bottom:14px;line-height:1.05;}
        .nl-hero-sub{font-size:17px;color:#6B6B6B;line-height:1.6;max-width:540px;margin:0 auto;}

        /* ── Featured card ── */
        .nl-featured{display:grid;grid-template-columns:1fr 420px;border-radius:24px;overflow:hidden;background:#fff;border:1px solid rgba(13,13,13,.07);box-shadow:0 4px 32px -8px rgba(13,13,13,.12);margin-bottom:56px;text-decoration:none;color:inherit;transition:box-shadow .2s;}
        .nl-featured:hover{box-shadow:0 12px 48px -12px rgba(13,13,13,.18);}
        .nl-featured-body{padding:44px 44px 48px;}
        .nl-featured-eyebrow{font-size:10.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#C0392B;margin-bottom:14px;display:flex;align-items:center;gap:6px;}
        .nl-featured-eyebrow span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#C0392B;}
        .nl-featured-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(24px,3vw,36px);letter-spacing:-.025em;line-height:1.15;color:#0D0D0D;margin-bottom:16px;}
        .nl-featured-excerpt{font-size:16px;color:#6B6B6B;line-height:1.65;margin-bottom:20px;}
        .nl-featured-meta{font-size:12.5px;color:#9a9690;}
        .nl-featured-cta{display:inline-flex;align-items:center;gap:6px;margin-top:24px;padding:10px 20px;background:#C0392B;color:#fff;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;text-decoration:none;transition:background .2s;}
        .nl-featured-cta:hover{background:#a93226;}
        .nl-featured-img{overflow:hidden;background:linear-gradient(135deg,#ece9e4,#e2ddd8);}
        .nl-featured-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease;}
        .nl-featured:hover .nl-featured-img img{transform:scale(1.04);}
        .nl-featured-img-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;min-height:340px;}

        /* ── Section divider ── */
        .nl-section-label{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#9a9690;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid rgba(13,13,13,.08);}

        /* ── Card grid ── */
        .nl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;}
        .nl-card{border-radius:20px;overflow:hidden;background:#fff;border:1px solid rgba(13,13,13,.07);box-shadow:0 2px 16px -6px rgba(13,13,13,.09);transition:box-shadow .2s,transform .2s;text-decoration:none;display:block;color:inherit;}
        .nl-card:hover{box-shadow:0 8px 32px -8px rgba(13,13,13,.16);transform:translateY(-2px);}
        .nl-card-cover{aspect-ratio:16/9;overflow:hidden;background:linear-gradient(135deg,#ece9e4,#e8e4df);}
        .nl-card-cover img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s ease;}
        .nl-card:hover .nl-card-cover img{transform:scale(1.04);}
        .nl-card-cover-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
        .nl-card-body{padding:22px 22px 24px;}
        .nl-card-date{font-size:11.5px;color:#9a9690;letter-spacing:.06em;margin-bottom:8px;}
        .nl-card-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:17px;color:#0D0D0D;margin-bottom:10px;line-height:1.35;}
        .nl-card-excerpt{font-size:13.5px;color:#6B6B6B;line-height:1.6;}
        .nl-card-meta{margin-top:14px;font-size:12px;color:#9a9690;}

        /* ── Empty ── */
        .nl-empty{text-align:center;padding:80px 20px;color:#9a9690;}

        @media(max-width:960px){
          .nl-featured{grid-template-columns:1fr;}
          .nl-featured-img{min-height:280px;order:-1;}
          .nl-featured-body{padding:32px 28px 36px;}
          .nl-grid{grid-template-columns:repeat(2,1fr);}
          .nl-main{padding:48px 24px 80px;}
        }
        @media(max-width:640px){
          .nl-grid{grid-template-columns:1fr;}
          .nl-nav-links{display:none;}
          .nl-nav{padding:0 20px;}
        }
      `}</style>

      {/* Nav */}
      <nav className="nl-nav">
        <a href="/" className="nl-brand">
          <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          Big Family
        </a>
        <div className="nl-nav-links">
          <a href="/#mision">Cómo funciona</a>
          <a href="/#about">Países</a>
          <a href="/#equipo">Equipo</a>
          <a href="/news" className="active">Noticias</a>
        </div>
        <a href="/login" style={{ padding:'8px 18px', borderRadius:999, background:'#0D0D0D', color:'#fff', fontSize:13, fontFamily:'Satoshi,sans-serif', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
          Ingresar
        </a>
      </nav>

      <main className="nl-main">
        {/* Hero */}
        <div className="nl-hero">
          <div className="nl-hero-eyebrow">Blog</div>
          <h1 className="nl-hero-title">Noticias</h1>
          <p className="nl-hero-sub">Lo que está pasando en Big Family</p>
        </div>

        {loading ? (
          <>
            {/* Featured skeleton */}
            <div style={{ borderRadius:24, overflow:'hidden', background:'#fff', border:'1px solid rgba(13,13,13,.07)', marginBottom:56, display:'grid', gridTemplateColumns:'1fr 420px' }}>
              <div style={{ padding:44, display:'flex', flexDirection:'column', gap:14 }}>
                <Sk w="20%" h={11} r={5} />
                <Sk w="80%" h={36} r={8} />
                <Sk w="70%" h={36} r={8} />
                <Sk h={16} />
                <Sk w="65%" h={16} />
                <Sk w={120} h={40} r={999} />
              </div>
              <div style={{ background:'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite', minHeight:300 }} />
            </div>
            {/* Grid skeleton */}
            <div className="nl-grid">
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ borderRadius:20, overflow:'hidden', background:'#fff', border:'1px solid rgba(13,13,13,.07)' }}>
                  <Sk h={200} r={0} />
                  <div style={{ padding:22, display:'flex', flexDirection:'column', gap:10 }}>
                    <Sk w="40%" h={11} />
                    <Sk w="85%" h={18} />
                    <Sk h={12} />
                    <Sk w="70%" h={12} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : articles.length === 0 ? (
          <div className="nl-empty">
            <p style={{ fontFamily:'Satoshi,sans-serif', fontWeight:700, fontSize:18, marginBottom:8 }}>Próximamente</p>
            <p style={{ fontSize:14 }}>No hay noticias publicadas aún.</p>
          </div>
        ) : (
          <>
            {/* Featured hero card */}
            {featured && (
              <a href={`/news/${featured.slug}`} className="nl-featured">
                <div className="nl-featured-body">
                  <div className="nl-featured-eyebrow">
                    <span />
                    Destacado
                  </div>
                  <div className="nl-featured-title">{featured.title}</div>
                  <div className="nl-featured-excerpt">{excerpt(featured.content, 180)}</div>
                  <div className="nl-featured-meta">
                    {featured.published_at && (
                      <>{new Date(featured.published_at).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })} · </>
                    )}
                    Por {featured.author_name}
                  </div>
                  <span className="nl-featured-cta">Leer artículo →</span>
                </div>
                <div className="nl-featured-img">
                  {featured.cover_url
                    ? <img src={featured.cover_url} alt={featured.title} /> // eslint-disable-line @next/next/no-img-element
                    : <div className="nl-featured-img-placeholder"><PlaceholderImg size={56} /></div>
                  }
                </div>
              </a>
            )}

            {/* Rest of articles */}
            {rest.length > 0 && (
              <>
                {featured && <div className="nl-section-label">Más noticias</div>}
                <div className="nl-grid">
                  {rest.map(art => (
                    <a key={art.id} href={`/news/${art.slug}`} className="nl-card">
                      <div className="nl-card-cover">
                        {art.cover_url
                          ? <img src={art.cover_url} alt={art.title} /> // eslint-disable-line @next/next/no-img-element
                          : <div className="nl-card-cover-placeholder"><PlaceholderImg /></div>
                        }
                      </div>
                      <div className="nl-card-body">
                        {art.published_at && (
                          <div className="nl-card-date">
                            {new Date(art.published_at).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}
                          </div>
                        )}
                        <div className="nl-card-title">{art.title}</div>
                        <div className="nl-card-excerpt">{excerpt(art.content)}</div>
                        <div className="nl-card-meta">Por {art.author_name}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  )
}
