'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'

interface NewsRow {
  id:           string
  title:        string
  published:    boolean
  published_at: string | null
  created_at:   string
  updated_at:   string
  featured:     boolean
}

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
      <path d="M8 1.5l1.8 3.8 4.2.6-3 3 .7 4.2L8 11l-3.7 2.1.7-4.2-3-3 4.2-.6L8 1.5Z" strokeLinejoin="round"/>
    </svg>
  )
}

export default function CoordinatorNewsPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,      setLoading]      = useState(true)
  const [userId,       setUserId]       = useState('')
  const [coordName,    setCoordName]    = useState('…')
  const [schoolName,   setSchoolName]   = useState('…')
  const [news,         setNews]         = useState<NewsRow[]>([])
  const [featuringId,  setFeaturingId]  = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('full_name, role, school_id').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (!profile || profile.role !== 'coordinator') { router.replace('/dashboard'); return }

      const { data: school } = profile.school_id
        ? await supabase.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
        : { data: null }
      if (cancelled) return

      setUserId(user.id)
      setCoordName(profile.full_name ?? '—')
      setSchoolName((school as any)?.name ?? 'Mi colegio')

      const { data: rows } = await supabase
        .from('news')
        .select('id, title, published, published_at, created_at, updated_at, featured')
        .eq('author_id', user.id)
        .order('updated_at', { ascending: false })
      if (cancelled) return

      setNews((rows ?? []).map(r => ({ ...r, featured: r.featured ?? false })))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    if (supabaseRef.current) await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  async function handleToggleFeatured(item: NewsRow) {
    if (featuringId || !supabaseRef.current) return
    const supabase = supabaseRef.current
    setFeaturingId(item.id)

    if (item.featured) {
      // Unfeatured
      await supabase.from('news').update({ featured: false }).eq('id', item.id)
      setNews(prev => prev.map(n => n.id === item.id ? { ...n, featured: false } : n))
    } else {
      // Clear existing featured for this author, then set new one
      await supabase.from('news').update({ featured: false }).eq('author_id', userId)
      await supabase.from('news').update({ featured: true }).eq('id', item.id)
      setNews(prev => prev.map(n => ({ ...n, featured: n.id === item.id })))
    }

    setFeaturingId(null)
  }

  const published = news.filter(n => n.published).length
  const drafts    = news.filter(n => !n.published).length

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;color:#0D0D0D;}
        .cn-nav{position:sticky;top:0;z-index:30;background:rgba(245,243,239,.88);backdrop-filter:saturate(150%) blur(16px);border-bottom:1px solid rgba(13,13,13,.08);height:62px;display:flex;align-items:center;padding:0 40px;gap:24px;}
        .cn-brand{display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;color:#0D0D0D;flex-shrink:0;}
        .cn-school{flex:1;text-align:center;font-size:13.5px;font-weight:600;color:#2D2D2D;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .cn-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
        .cn-badge{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;background:#FFF4E6;color:#7A4A00;border:1px solid #FFD699;border-radius:999px;padding:3px 10px;font-weight:700;}
        .cn-btn{background:transparent;border:1px solid rgba(13,13,13,.12);border-radius:999px;padding:8px 16px;font-size:13px;color:#0D0D0D;cursor:pointer;transition:border-color .2s,background .2s;white-space:nowrap;font-family:inherit;}
        .cn-btn:hover{border-color:#0D0D0D;background:rgba(13,13,13,.04);}
        .cn-btn--active{background:#0D0D0D !important;color:#fff !important;border-color:#0D0D0D !important;}
        .cn-btn--ghost{background:none;border:1px solid rgba(13,13,13,.14);border-radius:999px;padding:7px 14px;font-size:12px;color:#6B6B6B;cursor:pointer;transition:all .2s;white-space:nowrap;}
        .cn-btn--ghost:hover{border-color:#0D0D0D;color:#0D0D0D;}
        .cn-main{max-width:860px;margin:0 auto;padding:44px 40px 80px;}
        .cn-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;gap:16px;flex-wrap:wrap;}
        .cn-header h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:28px;letter-spacing:-.022em;color:#0D0D0D;}
        .cn-header p{margin-top:5px;font-size:13.5px;color:#6B6B6B;}
        .btn-new-news{padding:11px 22px;border-radius:999px;background:#C0392B;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:background .2s;white-space:nowrap;flex-shrink:0;}
        .btn-new-news:hover{background:#a93226;}
        .cn-stats{display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap;}
        .cn-stat{background:#fff;border:1px solid rgba(13,13,13,.07);border-radius:12px;padding:14px 20px;min-width:100px;}
        .cn-stat__num{font-family:"Satoshi",sans-serif;font-weight:800;font-size:26px;color:#0D0D0D;line-height:1;}
        .cn-stat__label{font-size:11.5px;color:#9a9690;margin-top:4px;}
        .cn-feed{display:flex;flex-direction:column;gap:14px;}
        .cn-item{background:#fff;border:1px solid rgba(13,13,13,.07);border-radius:16px;padding:18px 20px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 6px -2px rgba(13,13,13,.06);}
        .cn-item-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:#0D0D0D;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .cn-item-meta{font-size:12px;color:#9a9690;white-space:nowrap;}
        .cn-star{background:none;border:1px solid rgba(13,13,13,.12);border-radius:8px;padding:6px 8px;cursor:pointer;color:#9a9690;display:flex;align-items:center;justify-content:center;transition:all .18s;flex-shrink:0;}
        .cn-star:hover{border-color:#E8A417;color:#E8A417;background:#FFFBEB;}
        .cn-star.featured{border-color:#E8A417;color:#E8A417;background:#FFFBEB;}
        .cn-star:disabled{opacity:.4;cursor:not-allowed;}
        .cn-empty{background:#fff;border:1px dashed rgba(13,13,13,.15);border-radius:20px;padding:56px;text-align:center;color:#9a9690;}
        .cn-featured-hint{font-size:11.5px;color:#9a9690;margin-bottom:20px;padding:10px 14px;background:rgba(232,164,23,.08);border:1px solid rgba(232,164,23,.2);border-radius:8px;display:flex;align-items:center;gap:6px;}
        @media(max-width:860px){.cn-main{padding:28px 20px 60px;}.cn-nav{padding:0 20px;}.cn-school{display:none;}}
      `}</style>

      <nav className="cn-nav">
        <a className="cn-brand" href="/">
          <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          Big Family
        </a>
        <div className="cn-school">{loading ? <Sk w={160} h={13} r={6} /> : schoolName}</div>
        <div className="cn-right">
          <span className="cn-badge">Coordinador</span>
          <button className="cn-btn" onClick={() => router.push('/coordinator')}>Panel principal</button>
          <button className="cn-btn" onClick={() => router.push('/coordinator/projects')}>Proyectos</button>
          <button className="cn-btn" onClick={() => router.push('/coordinator/modules')}>Módulos</button>
          <button className="cn-btn cn-btn--active">Noticias</button>
          <button className="cn-btn" onClick={() => router.push('/dashboard')}>Dashboard</button>
          <button className="cn-btn--ghost" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </nav>

      <main className="cn-main">
        <div className="cn-header">
          <div>
            <h1>Mis Noticias</h1>
            <p>{loading ? 'Cargando…' : `${news.length} artículo${news.length !== 1 ? 's' : ''} · ${schoolName}`}</p>
          </div>
          <button className="btn-new-news" onClick={() => router.push('/coordinator/news/new')}>
            + Nueva noticia
          </button>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="cn-stats">
            <div className="cn-stat">
              <div className="cn-stat__num">{news.length}</div>
              <div className="cn-stat__label">Total</div>
            </div>
            <div className="cn-stat">
              <div className="cn-stat__num" style={{ color:'#065F46' }}>{published}</div>
              <div className="cn-stat__label">Publicados</div>
            </div>
            <div className="cn-stat">
              <div className="cn-stat__num" style={{ color:'#444441' }}>{drafts}</div>
              <div className="cn-stat__label">Borradores</div>
            </div>
          </div>
        )}

        {/* Featured hint */}
        {!loading && news.length > 0 && (
          <div className="cn-featured-hint">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="#E8A417" stroke="none">
              <path d="M8 1.5l1.8 3.8 4.2.6-3 3 .7 4.2L8 11l-3.7 2.1.7-4.2-3-3 4.2-.6L8 1.5Z"/>
            </svg>
            Marca una noticia como destacada para mostrarla en la portada del blog
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="cn-feed">
            {[0,1,2].map(i => (
              <div key={i} style={{ background:'#fff', borderRadius:16, padding:'18px 20px', display:'flex', gap:14, alignItems:'center' }}>
                <Sk w="60%" h={18} />
                <Sk w={80} h={22} r={999} />
                <Sk w={80} h={22} r={999} />
                <Sk w={32} h={32} r={8} />
                <Sk w={70} h={36} r={999} />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="cn-empty">
            <div style={{ fontFamily:'Satoshi,sans-serif', fontWeight:700, fontSize:16, marginBottom:6 }}>Sin noticias todavía</div>
            <div style={{ fontSize:13.5, marginBottom:20 }}>Crea tu primera noticia para el blog de Big Family.</div>
            <button className="btn-new-news" onClick={() => router.push('/coordinator/news/new')}>+ Crear noticia</button>
          </div>
        ) : (
          <div className="cn-feed">
            {news.map((item, i) => (
              <motion.div
                key={item.id}
                className="cn-item"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type:'spring', stiffness:140, damping:20, delay: i * 0.04 }}
              >
                <div className="cn-item-title">{item.title || <span style={{ color:'#9a9690', fontStyle:'italic' }}>Sin título</span>}</div>
                <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11.5, fontWeight:700, background: item.published ? '#D1FAE5' : '#F1EFE8', color: item.published ? '#065F46' : '#444441', flexShrink:0 }}>
                  {item.published ? 'Publicado' : 'Borrador'}
                </span>
                <div className="cn-item-meta">
                  {item.published && item.published_at
                    ? new Date(item.published_at).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
                    : 'Borrador'}
                </div>
                {/* Star / featured toggle */}
                <button
                  className={`cn-star${item.featured ? ' featured' : ''}`}
                  title={item.featured ? 'Quitar de destacados' : 'Marcar como destacada'}
                  disabled={featuringId !== null}
                  onClick={() => handleToggleFeatured(item)}
                >
                  <StarIcon filled={item.featured} />
                </button>
                <button
                  onClick={() => router.push(`/coordinator/news/${item.id}/edit`)}
                  style={{ padding:'8px 18px', borderRadius:999, border:'1.5px solid rgba(13,13,13,.14)', background:'none', fontFamily:'Satoshi,sans-serif', fontWeight:700, fontSize:13, color:'#0D0D0D', cursor:'pointer', transition:'all .18s', flexShrink:0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#C0392B'; e.currentTarget.style.color='#C0392B' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(13,13,13,.14)'; e.currentTarget.style.color='#0D0D0D' }}
                >
                  Editar →
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
