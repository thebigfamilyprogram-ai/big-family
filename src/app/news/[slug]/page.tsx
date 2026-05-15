'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface LayoutOptions {
  coverStyle:   'full' | 'lateral'
  galleryStyle: 'grid' | 'carousel'
}
interface HighlightStat {
  number:      string
  label:       string
  description: string
}
interface Article {
  id:             string
  title:          string
  content:        string
  cover_url:      string | null
  gallery_urls:   string[]
  published_at:   string | null
  author_name:    string
  layout_options: LayoutOptions | null
  featured_quote: string | null
  accent_color:   string | null
  highlight_stat: HighlightStat | null
}

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

export default function ArticlePage() {
  const { slug }  = useParams<{ slug: string }>()
  const supabase  = createClient()
  const [article,  setArticle]  = useState<Article | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('news')
        .select('id, title, content, cover_url, gallery_urls, published_at, author_id, layout_options, featured_quote, accent_color, highlight_stat')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle()

      if (!data) { setNotFound(true); setLoading(false); return }

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.author_id).maybeSingle()
      setArticle({
        ...data,
        gallery_urls:   data.gallery_urls ?? [],
        author_name:    profile?.full_name ?? '—',
        layout_options: data.layout_options ?? null,
        featured_quote: data.featured_quote ?? null,
        accent_color:   data.accent_color ?? null,
        highlight_stat: data.highlight_stat ?? null,
      })
      setLoading(false)
    }
    load()
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;color:#0D0D0D;}

        /* ── Nav ── */
        .art-nav{position:sticky;top:0;z-index:30;background:rgba(245,243,239,.88);backdrop-filter:saturate(150%) blur(16px);border-bottom:1px solid rgba(13,13,13,.08);height:60px;display:flex;align-items:center;padding:0 40px;gap:24px;}
        .art-brand{display:flex;align-items:center;gap:8px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;color:#0D0D0D;}
        .art-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#6B6B6B;text-decoration:none;margin-left:auto;transition:color .15s;}
        .art-back:hover{color:#0D0D0D;}

        /* ── Cover — full style ── */
        .art-cover-full{width:100%;max-height:500px;overflow:hidden;background:linear-gradient(135deg,#ece9e4,#e2ddd8);}
        .art-cover-full img{width:100%;height:100%;object-fit:cover;display:block;max-height:500px;}

        /* ── Standard article (full cover) ── */
        .art-main{max-width:720px;margin:0 auto;padding:52px 24px 100px;}
        .art-meta{display:flex;align-items:center;gap:14px;font-size:13px;color:#9a9690;margin-bottom:16px;flex-wrap:wrap;}
        .art-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(28px,4.5vw,48px);letter-spacing:-.025em;line-height:1.1;color:#0D0D0D;margin-bottom:32px;}

        /* ── Lateral layout ── */
        .art-lateral-wrap{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 400px;min-height:520px;}
        .art-lateral-text{padding:52px 48px 80px 40px;}
        .art-lateral-img{overflow:hidden;background:linear-gradient(135deg,#e8e4df,#ddd9d3);position:relative;}
        .art-lateral-img img{width:100%;height:100%;object-fit:cover;display:block;position:sticky;top:60px;max-height:calc(100vh - 60px);}
        .art-lateral-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#9a9690;font-size:13px;min-height:400px;}

        /* ── Rich content ── */
        .art-content{font-size:17px;line-height:1.8;color:#2D2D2D;--art-accent:#C0392B;}
        .art-content h2{font-family:"Satoshi",sans-serif;font-weight:700;font-size:26px;margin:32px 0 10px;color:var(--art-accent);letter-spacing:-.015em;}
        .art-content h3{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;margin:24px 0 8px;color:var(--art-accent);}
        .art-content p{margin-bottom:18px;}
        .art-content ul,.art-content ol{padding-left:24px;margin-bottom:18px;}
        .art-content li{margin-bottom:6px;}
        .art-content strong{font-weight:700;color:#0D0D0D;}
        .art-content em{font-style:italic;}

        /* ── Extra blocks ── */
        .art-highlight-stat{text-align:center;padding:48px 24px;margin:40px 0;border-radius:16px;}
        .art-highlight-stat-num{font-family:"Satoshi",sans-serif;font-weight:900;line-height:1;letter-spacing:-.04em;font-size:clamp(56px,10vw,88px);}
        .art-highlight-stat-label{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;margin-top:10px;color:#0D0D0D;}
        .art-highlight-stat-desc{font-size:16px;color:#6B6B6B;margin-top:6px;line-height:1.5;}
        .art-featured-quote{padding:20px 24px;margin:32px 0;border-radius:0 12px 12px 0;font-size:20px;font-style:italic;line-height:1.6;color:#2D2D2D;}

        /* ── Gallery ── */
        .art-gallery{max-width:1100px;margin:0 auto;padding:0 24px 80px;}
        .art-gallery-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:#0D0D0D;margin-bottom:20px;}
        .art-gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
        .art-gallery-img{aspect-ratio:4/3;border-radius:12px;overflow:hidden;background:rgba(13,13,13,.05);}
        .art-gallery-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s ease;}
        .art-gallery-img:hover img{transform:scale(1.04);}
        .art-gallery-carousel{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:16px;scrollbar-width:thin;scrollbar-color:rgba(13,13,13,.2) transparent;}
        .art-gallery-carousel::-webkit-scrollbar{height:4px;}
        .art-gallery-carousel::-webkit-scrollbar-track{background:transparent;}
        .art-gallery-carousel::-webkit-scrollbar-thumb{background:rgba(13,13,13,.2);border-radius:999px;}
        .art-gallery-carousel-item{flex-shrink:0;width:380px;scroll-snap-align:start;}
        .art-gallery-carousel-item img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;display:block;}
        .art-divider{max-width:1100px;margin:0 auto;height:1px;background:rgba(13,13,13,.08);}

        /* ── Not found ── */
        .art-not-found{text-align:center;padding:120px 24px;font-family:"Satoshi",sans-serif;}

        @media(max-width:960px){
          .art-lateral-wrap{grid-template-columns:1fr;}
          .art-lateral-img{min-height:300px;max-height:380px;order:-1;}
          .art-lateral-img img{position:static;max-height:380px;}
          .art-lateral-text{padding:36px 24px 60px;}
          .art-gallery-carousel-item{width:280px;}
        }
        @media(max-width:640px){
          .art-gallery-grid{grid-template-columns:repeat(2,1fr);}
          .art-nav{padding:0 20px;}
          .art-main{padding:36px 20px 80px;}
          .art-lateral-text{padding:28px 20px 60px;}
          .art-gallery{padding:0 16px 60px;}
        }
      `}</style>

      <nav className="art-nav">
        <a href="/" className="art-brand">
          <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          Big Family
        </a>
        <a href="/news" className="art-back">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 12L4 7l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Noticias
        </a>
      </nav>

      {loading ? (
        <>
          <style>{`@keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
          <div style={{ width:'100%', height:420, background:'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
          <div style={{ maxWidth:720, margin:'0 auto', padding:'52px 24px' }}>
            <div style={{ height:12, borderRadius:6, background:'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite', width:'35%', marginBottom:18 }} />
            <div style={{ height:52, borderRadius:8, background:'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite', marginBottom:32 }} />
            {[100,90,95,80,100,70].map((w, i) => (
              <Sk key={i} h={17} r={5} w={`${w}%`} />
            ))}
          </div>
        </>
      ) : notFound ? (
        <div className="art-not-found">
          <div style={{ fontSize:22, fontWeight:700, marginBottom:10 }}>Artículo no encontrado</div>
          <a href="/news" style={{ color:'#C0392B', fontSize:14 }}>← Volver a Noticias</a>
        </div>
      ) : article ? (() => {
        const accent       = article.accent_color ?? '#C0392B'
        const layout       = article.layout_options ?? { coverStyle: 'full', galleryStyle: 'grid' }
        const isLateral    = layout.coverStyle === 'lateral'
        const isCarousel   = layout.galleryStyle === 'carousel'
        const hasGallery   = article.gallery_urls.length > 0
        const hasStat      = !!article.highlight_stat?.number
        const hasQuote     = !!article.featured_quote?.trim()
        const pubDate      = article.published_at
          ? new Date(article.published_at).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })
          : null

        // Shared inner content blocks (used in both layouts)
        const StatCard = hasStat ? (
          <div
            className="art-highlight-stat"
            style={{ background: accent + '0D', border: `1px solid ${accent}30` }}
          >
            <div className="art-highlight-stat-num" style={{ color: accent }}>
              {article.highlight_stat!.number}
            </div>
            {article.highlight_stat!.label && (
              <div className="art-highlight-stat-label">{article.highlight_stat!.label}</div>
            )}
            {article.highlight_stat!.description && (
              <div className="art-highlight-stat-desc">{article.highlight_stat!.description}</div>
            )}
          </div>
        ) : null

        const QuoteBlock = hasQuote ? (
          <blockquote
            className="art-featured-quote"
            style={{
              borderLeft: `5px solid ${accent}`,
              background:  accent + '0A',
            }}
          >
            {article.featured_quote}
          </blockquote>
        ) : null

        const ContentBlock = (
          <div
            className="art-content"
            style={{ '--art-accent': accent } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        )

        const GalleryBlock = hasGallery ? (
          <>
            <div className="art-divider" />
            <div className="art-gallery" style={{ paddingTop:48 }}>
              <div className="art-gallery-title">Galería de fotos</div>
              {isCarousel ? (
                <div className="art-gallery-carousel">
                  {article.gallery_urls.map((url, i) => (
                    <div key={i} className="art-gallery-carousel-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="art-gallery-grid">
                  {article.gallery_urls.map((url, i) => (
                    <div key={i} className="art-gallery-img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null

        return (
          <>
            {/* ── Full cover (only when coverStyle = 'full') ── */}
            {!isLateral && article.cover_url && (
              <div className="art-cover-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={article.cover_url} alt={article.title} />
              </div>
            )}

            {/* ── Lateral layout ── */}
            {isLateral ? (
              <>
                <div className="art-lateral-wrap">
                  <div className="art-lateral-text">
                    <div className="art-meta">
                      {pubDate && <span>{pubDate}</span>}
                      {pubDate && <span>·</span>}
                      <span>Por {article.author_name}</span>
                    </div>
                    <h1 className="art-title">{article.title}</h1>
                    {StatCard}
                    {QuoteBlock}
                    {ContentBlock}
                  </div>
                  <div className="art-lateral-img">
                    {article.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={article.cover_url} alt={article.title} />
                    ) : (
                      <div className="art-lateral-placeholder">Sin imagen</div>
                    )}
                  </div>
                </div>
                {GalleryBlock}
              </>
            ) : (
              /* ── Standard (full cover) layout ── */
              <>
                <article className="art-main">
                  <div className="art-meta">
                    {pubDate && <span>{pubDate}</span>}
                    {pubDate && <span>·</span>}
                    <span>Por {article.author_name}</span>
                  </div>
                  <h1 className="art-title">{article.title}</h1>
                  {StatCard}
                  {QuoteBlock}
                  {ContentBlock}
                </article>
                {GalleryBlock}
              </>
            )}
          </>
        )
      })() : null}
    </>
  )
}
