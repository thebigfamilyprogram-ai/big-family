'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

// SQL to run in Supabase:
// ALTER TABLE news ADD COLUMN IF NOT EXISTS layout_options jsonb DEFAULT '{"coverStyle":"full","galleryStyle":"grid"}';
// ALTER TABLE news ADD COLUMN IF NOT EXISTS featured_quote text;
// ALTER TABLE news ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#C0392B';
// ALTER TABLE news ADD COLUMN IF NOT EXISTS highlight_stat jsonb;
// ALTER TABLE news ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;

export interface LayoutOptions {
  coverStyle:   'full' | 'lateral'
  galleryStyle: 'grid' | 'carousel'
}
export interface HighlightStat {
  number:      string
  label:       string
  description: string
}
export interface NewsData {
  id:             string
  title:          string
  slug:           string
  content:        string
  cover_url:      string | null
  gallery_urls:   string[]
  published:      boolean
  published_at:   string | null
  school_id:      string | null
  layout_options: LayoutOptions | null
  featured_quote: string | null
  accent_color:   string | null
  highlight_stat: HighlightStat | null
}

interface Props {
  newsId:      string
  initialData: NewsData
  userId:      string
}

function toSlug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

const DEFAULT_LAYOUT: LayoutOptions = { coverStyle: 'full', galleryStyle: 'grid' }
const ACCENT_PRESETS = ['#C0392B', '#0D0D0D', '#065F46', '#92400E', '#5B21B6']
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function DiagramFullCover() {
  return (
    <svg width="60" height="38" viewBox="0 0 60 38" fill="none">
      <rect width="60" height="38" rx="3" fill="#F5F3EF"/>
      <rect width="60" height="18" fill="#C0392B" opacity=".25"/>
      <rect x="4" y="22" width="36" height="3" rx="1" fill="#0D0D0D" opacity=".4"/>
      <rect x="4" y="28" width="52" height="2" rx="1" fill="#0D0D0D" opacity=".2"/>
      <rect x="4" y="33" width="44" height="2" rx="1" fill="#0D0D0D" opacity=".2"/>
    </svg>
  )
}
function DiagramLateralCover() {
  return (
    <svg width="60" height="38" viewBox="0 0 60 38" fill="none">
      <rect width="60" height="38" rx="3" fill="#F5F3EF"/>
      <rect x="36" width="24" height="38" fill="#C0392B" opacity=".25"/>
      <rect x="4" y="6" width="26" height="3" rx="1" fill="#0D0D0D" opacity=".4"/>
      <rect x="4" y="13" width="26" height="2" rx="1" fill="#0D0D0D" opacity=".2"/>
      <rect x="4" y="18" width="22" height="2" rx="1" fill="#0D0D0D" opacity=".2"/>
      <rect x="4" y="23" width="26" height="2" rx="1" fill="#0D0D0D" opacity=".2"/>
    </svg>
  )
}
function DiagramGrid() {
  return (
    <svg width="60" height="38" viewBox="0 0 60 38" fill="none">
      <rect width="60" height="38" rx="3" fill="#F5F3EF"/>
      {[0,1,2].map(i => <rect key={i} x={4+i*18} y="4" width="15" height="13" rx="2" fill="#C0392B" opacity=".25"/>)}
      {[0,1,2].map(i => <rect key={i} x={4+i*18} y="20" width="15" height="14" rx="2" fill="#C0392B" opacity=".25"/>)}
    </svg>
  )
}
function DiagramCarousel() {
  return (
    <svg width="60" height="38" viewBox="0 0 60 38" fill="none">
      <rect width="60" height="38" rx="3" fill="#F5F3EF"/>
      <rect x="4" y="6" width="26" height="26" rx="3" fill="#C0392B" opacity=".3"/>
      <rect x="34" y="6" width="16" height="26" rx="3" fill="#C0392B" opacity=".15"/>
      <rect x="54" y="6" width="4" height="26" rx="3" fill="#C0392B" opacity=".08"/>
      <path d="M55 18l2 2-2 2" stroke="#C0392B" strokeWidth="1.2" strokeLinecap="round" opacity=".5"/>
    </svg>
  )
}

export default function NewsEditor({ newsId, initialData, userId }: Props) {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [title,          setTitle]         = useState(initialData.title ?? '')
  const [slug,           setSlug]          = useState(initialData.slug ?? '')
  const [coverUrl,       setCoverUrl]      = useState<string | null>(initialData.cover_url ?? null)
  const [galleryUrls,    setGalleryUrls]   = useState<string[]>(initialData.gallery_urls ?? [])
  const [published,      setPublished]     = useState(initialData.published ?? false)
  const [saveStatus,     setSaveStatus]    = useState<SaveStatus>('idle')
  const [savedAt,        setSavedAt]       = useState<Date | null>(null)
  const [uploading,      setUploading]     = useState(false)
  const [galleryUpl,     setGalleryUpl]    = useState(false)
  const [publishing,     setPublishing]    = useState(false)
  const [coverDrag,      setCoverDrag]     = useState(false)
  const [layoutOptions,  setLayoutOptions] = useState<LayoutOptions>(initialData.layout_options ?? DEFAULT_LAYOUT)
  const [featuredQuote,  setFeaturedQuote] = useState(initialData.featured_quote ?? '')
  const [accentColor,    setAccentColor]   = useState(initialData.accent_color ?? '#C0392B')
  const [highlightStat,  setHighlightStat] = useState<HighlightStat>(initialData.highlight_stat ?? { number: '', label: '', description: '' })
  const [previewOpen,    setPreviewOpen]   = useState(true)
  const [previewContent, setPreviewContent] = useState(initialData.content ?? '')

  const editorRef       = useRef<HTMLDivElement>(null)
  const saveTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef      = useRef(false)
  const coverInputRef   = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const valuesRef = useRef({ title, slug, coverUrl, galleryUrls, layoutOptions, featuredQuote, accentColor, highlightStat })
  valuesRef.current = { title, slug, coverUrl, galleryUrls, layoutOptions, featuredQuote, accentColor, highlightStat }

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialData.content ?? ''
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const doSave = useCallback(async () => {
    if (!newsId) return
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const v = valuesRef.current
    const content = editorRef.current?.innerHTML ?? ''
    setSaveStatus('saving')
    const { error } = await supabase.from('news').update({
      title:          v.title,
      slug:           v.slug,
      content,
      cover_url:      v.coverUrl,
      gallery_urls:   v.galleryUrls,
      layout_options: v.layoutOptions,
      featured_quote: v.featuredQuote.trim() || null,
      accent_color:   v.accentColor,
      highlight_stat: v.highlightStat.number ? v.highlightStat : null,
    }).eq('id', newsId)
    if (error) { console.error('News save error:', error); setSaveStatus('error') }
    else { setSaveStatus('saved'); setSavedAt(new Date()) }
  }, [newsId]) // eslint-disable-line react-hooks/exhaustive-deps

  function triggerAutosave() {
    setSaveStatus('idle')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(doSave, 1500)
  }

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    triggerAutosave()
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [title, slug, coverUrl, galleryUrls, layoutOptions, featuredQuote, accentColor, highlightStat]) // eslint-disable-line react-hooks/exhaustive-deps

  function onEditorInput() {
    triggerAutosave()
    setPreviewContent(editorRef.current?.innerHTML ?? '')
  }

  function execCmd(cmd: string, val?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }

  async function uploadCover(file: File) {
    if (!file.type.startsWith('image/')) return
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    setUploading(true)
    const path = `${userId}/${newsId}/cover-${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('news-images').upload(path, file, { upsert: true })
    if (error || !data) { setUploading(false); return }
    setCoverUrl(supabase.storage.from('news-images').getPublicUrl(data.path).data.publicUrl)
    setUploading(false)
  }

  async function removeCover() {
    if (!coverUrl) return
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const marker = '/news-images/'
    const idx = coverUrl.indexOf(marker)
    if (idx >= 0) await supabase.storage.from('news-images').remove([coverUrl.slice(idx + marker.length)])
    setCoverUrl(null)
  }

  async function uploadGalleryFile(file: File) {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const path = `${userId}/${newsId}/gallery-${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from('news-images').upload(path, file, { upsert: false })
    if (error || !data) return null
    return supabase.storage.from('news-images').getPublicUrl(data.path).data.publicUrl
  }

  async function addGalleryFiles(files: FileList | null) {
    if (!files) return
    setGalleryUpl(true)
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 20 - galleryUrls.length)
    const urls = (await Promise.all(imgs.map(uploadGalleryFile))).filter(Boolean) as string[]
    setGalleryUrls(prev => [...prev, ...urls])
    setGalleryUpl(false)
  }

  async function removeGalleryImage(url: string) {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const marker = '/news-images/'
    const idx = url.indexOf(marker)
    if (idx >= 0) await supabase.storage.from('news-images').remove([url.slice(idx + marker.length)])
    setGalleryUrls(prev => prev.filter(u => u !== url))
  }

  async function handlePublish() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    setPublishing(true)
    await doSave()
    const { error } = await supabase.from('news').update({ published: true, published_at: new Date().toISOString() }).eq('id', newsId)
    setPublishing(false)
    if (!error) setPublished(true)
  }

  async function handleUnpublish() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    setPublishing(true)
    const { error } = await supabase.from('news').update({ published: false }).eq('id', newsId)
    setPublishing(false)
    if (!error) setPublished(false)
  }

  const canPublish = title.trim().length > 0

  const previewDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .ne-wrap{display:flex;gap:28px;align-items:flex-start;padding:36px 40px 80px;max-width:1480px;margin:0 auto;}
        .ne-left{flex:11;min-width:0;}
        .ne-right{flex:9;min-width:280px;position:sticky;top:24px;display:flex;flex-direction:column;gap:14px;max-height:calc(100vh - 48px);}
        .ne-left-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;}
        .ne-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--mute);background:none;border:none;cursor:pointer;padding:0;font-family:inherit;transition:color .15s;}
        .ne-back:hover{color:var(--ink);}
        .ne-preview-toggle{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.12));border-radius:999px;font-size:12.5px;font-weight:600;color:var(--mute,#6B6B6B);cursor:pointer;transition:all .18s;font-family:inherit;}
        .ne-preview-toggle:hover{border-color:var(--ink,#0D0D0D);color:var(--ink,#0D0D0D);}
        .ne-preview-toggle.active{background:#0D0D0D;color:#fff;border-color:#0D0D0D;}
        .ne-card{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.1));border-radius:16px;padding:28px;box-shadow:0 2px 16px -6px rgba(13,13,13,.07);margin-bottom:20px;}
        .ne-label{font-family:"Satoshi",sans-serif;font-weight:600;font-size:12px;color:var(--mute,#6B6B6B);letter-spacing:.1em;text-transform:uppercase;display:block;margin-bottom:10px;}
        .ne-title{width:100%;background:transparent;border:none;font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(22px,3vw,36px);color:var(--ink,#0D0D0D);outline:none;line-height:1.15;letter-spacing:-.02em;padding:0;margin-bottom:10px;}
        .ne-title::placeholder{color:var(--mute,#6B6B6B);opacity:.5;}
        .ne-slug-row{display:flex;align-items:center;gap:8px;}
        .ne-slug-prefix{font-size:12.5px;color:var(--mute,#6B6B6B);}
        .ne-slug{flex:1;background:transparent;border:none;border-bottom:1px dashed rgba(13,13,13,.2);font-size:12.5px;color:#C0392B;outline:none;padding:2px 0;font-family:"Inter",monospace;}
        .ne-slug:focus{border-bottom-color:#C0392B;}
        .ne-toolbar{display:flex;gap:4px;padding:10px 12px;background:var(--line,rgba(13,13,13,.08));border-radius:10px;margin-bottom:12px;flex-wrap:wrap;}
        .ne-tb-btn{padding:5px 10px;border-radius:6px;border:none;background:none;cursor:pointer;font-size:13px;color:var(--ink,#0D0D0D);transition:background .15s;font-family:inherit;font-weight:500;}
        .ne-tb-btn:hover{background:var(--card-bg,#fff);}
        .ne-tb-btn b{font-weight:800;}
        .ne-tb-sep{width:1px;background:var(--card-border,rgba(13,13,13,.1));margin:0 4px;align-self:stretch;}
        .ne-editor{min-height:280px;font-size:16px;line-height:1.75;color:var(--ink,#0D0D0D);outline:none;font-family:"Inter",sans-serif;}
        .ne-editor:empty::before{content:attr(data-placeholder);color:var(--mute,#6B6B6B);opacity:.45;pointer-events:none;}
        .ne-editor h2{font-family:"Satoshi",sans-serif;font-size:22px;font-weight:700;margin:20px 0 8px;}
        .ne-editor h3{font-family:"Satoshi",sans-serif;font-size:18px;font-weight:700;margin:16px 0 6px;}
        .ne-editor ul{padding-left:20px;margin:8px 0;}
        .ne-editor li{margin:4px 0;}
        .ne-editor strong{font-weight:700;}
        .ne-editor em{font-style:italic;}
        .ne-drop{border:2px dashed rgba(13,13,13,.15);border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;}
        .ne-drop.drag{border-color:#C0392B;background:rgba(192,57,43,.04);}
        .ne-drop:hover{border-color:rgba(13,13,13,.3);}
        .ne-cover-img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;display:block;margin-bottom:10px;}
        .ne-gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;}
        .ne-gallery-thumb{position:relative;aspect-ratio:4/3;border-radius:8px;overflow:hidden;background:rgba(13,13,13,.05);}
        .ne-gallery-thumb img{width:100%;height:100%;object-fit:cover;}
        .ne-gallery-rm{position:absolute;top:5px;right:5px;width:22px;height:22px;border-radius:50%;background:rgba(13,13,13,.7);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:background .15s;}
        .ne-gallery-rm:hover{background:rgba(192,57,43,.9);}
        .ne-btn-rm{background:none;border:none;cursor:pointer;color:var(--mute,#6B6B6B);font-size:12px;padding:4px 8px;border-radius:6px;transition:color .15s;}
        .ne-btn-rm:hover{color:#C0392B;}

        /* Layout options */
        .ne-layout-pills{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;}
        .ne-layout-pill{display:flex;flex-direction:column;align-items:center;gap:7px;padding:12px 16px;border-radius:12px;border:1.5px solid var(--card-border,rgba(13,13,13,.1));background:var(--card-bg,#fff);cursor:pointer;transition:border-color .18s,background .18s;font-family:inherit;}
        .ne-layout-pill:hover{border-color:rgba(13,13,13,.3);}
        .ne-layout-pill.active{border-color:#C0392B;background:rgba(192,57,43,.04);}
        .ne-layout-pill-label{font-size:11.5px;font-weight:600;color:var(--ink,#0D0D0D);white-space:nowrap;}
        .ne-section-divider{height:1px;background:var(--line,rgba(13,13,13,.08));margin:20px 0;}
        .ne-extra-section{margin-top:16px;}
        .ne-extra-label{font-size:12.5px;font-weight:600;color:var(--ink,#0D0D0D);margin-bottom:8px;}
        .ne-extra-textarea{width:100%;border:1px solid var(--card-border,rgba(13,13,13,.1));border-radius:10px;padding:10px 12px;font-family:"Inter",sans-serif;font-size:14px;color:var(--ink,#0D0D0D);background:var(--bg-2,#F9F7F4);outline:none;resize:vertical;line-height:1.6;min-height:80px;transition:border-color .15s;}
        .ne-extra-textarea:focus{border-color:#C0392B;}
        .ne-extra-textarea::placeholder{color:var(--mute,#6B6B6B);opacity:.6;}
        .ne-color-swatch{width:28px;height:28px;border-radius:50%;cursor:pointer;border:3px solid transparent;outline:2px solid transparent;outline-offset:2px;transition:transform .15s,outline-color .15s;}
        .ne-color-swatch:hover{transform:scale(1.12);}
        .ne-color-swatch.active{outline-color:rgba(13,13,13,.4);}
        .ne-stat-inputs{display:grid;grid-template-columns:80px 1fr 2fr;gap:8px;}
        .ne-stat-input{padding:8px 10px;border:1px solid var(--card-border,rgba(13,13,13,.1));border-radius:8px;font-family:inherit;font-size:13px;color:var(--ink,#0D0D0D);background:var(--bg-2,#F9F7F4);outline:none;transition:border-color .15s;width:100%;}
        .ne-stat-input:focus{border-color:#C0392B;}
        .ne-stat-input::placeholder{color:var(--mute,#6B6B6B);opacity:.6;}

        /* Sidebar */
        .ne-sb-card{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.1));border-radius:16px;padding:18px 20px;box-shadow:0 2px 12px -4px rgba(13,13,13,.07);flex-shrink:0;}
        .ne-save-ind{font-size:11px;color:var(--mute,#6B6B6B);}
        .btn-publish{width:100%;padding:11px;border-radius:999px;background:#C0392B;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13.5px;cursor:pointer;transition:background .2s,opacity .2s;margin-top:12px;}
        .btn-publish:hover:not(:disabled){background:#a93226;}
        .btn-publish:disabled{opacity:.4;cursor:not-allowed;}
        .btn-unpublish{width:100%;padding:10px;border-radius:999px;background:transparent;color:var(--mute,#6B6B6B);border:1px solid var(--line,rgba(13,13,13,.1));font-family:"Satoshi",sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s;margin-top:8px;}
        .btn-unpublish:hover{border-color:#C0392B;color:#C0392B;}
        .btn-save-news{width:100%;padding:10px;border-radius:999px;background:#0D0D0D;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:background .2s;margin-top:8px;}
        .btn-save-news:hover{background:#333;}

        /* Preview frame */
        .ne-pv-label{font-size:10.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mute,#6B6B6B);margin-bottom:8px;}
        .ne-pv-frame{border-radius:12px;overflow:hidden;border:1px solid var(--card-border,rgba(13,13,13,.1));box-shadow:0 4px 24px -8px rgba(13,13,13,.12);}
        .ne-chrome{background:#EDEBE8;padding:8px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(13,13,13,.08);flex-shrink:0;}
        .ne-chrome-dots{display:flex;gap:5px;flex-shrink:0;}
        .ne-chrome-dot{width:10px;height:10px;border-radius:50%;}
        .ne-chrome-url{flex:1;background:rgba(255,255,255,.8);border-radius:5px;font-size:10.5px;color:#9a9690;padding:3px 9px;font-family:"Inter",monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ne-pv-scroll{overflow-y:auto;background:#F5F3EF;max-height:calc(100vh - 320px);}
        .ne-pv-empty{text-align:center;color:#9a9690;font-size:13px;padding:40px 20px;font-style:italic;}
        .ne-pv-cover-full{width:100%;aspect-ratio:16/9;overflow:hidden;background:linear-gradient(135deg,#e8e4df,#ddd9d3);}
        .ne-pv-cover-full img{width:100%;height:100%;object-fit:cover;display:block;}
        .ne-pv-body-pad{padding:18px 18px 20px;}
        .ne-pv-lateral{display:grid;grid-template-columns:1fr 42%;min-height:200px;}
        .ne-pv-lateral-text{padding:18px 14px 18px 18px;overflow:hidden;}
        .ne-pv-lateral-img{overflow:hidden;background:linear-gradient(135deg,#e8e4df,#ddd9d3);}
        .ne-pv-lateral-img img{width:100%;height:100%;object-fit:cover;display:block;}
        .ne-pv-meta{font-size:10.5px;color:#9a9690;margin-bottom:7px;}
        .ne-pv-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:17px;color:#0D0D0D;line-height:1.2;letter-spacing:-.02em;margin-bottom:10px;}
        .ne-pv-content{font-size:13px;line-height:1.7;color:#2D2D2D;}
        .ne-pv-content h2{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;margin:12px 0 5px;}
        .ne-pv-content h3{font-family:"Satoshi",sans-serif;font-weight:700;font-size:13.5px;margin:10px 0 4px;}
        .ne-pv-content p{margin-bottom:9px;}
        .ne-pv-content ul{padding-left:15px;margin-bottom:9px;}
        .ne-pv-content strong{font-weight:700;}
        .ne-pv-quote{padding:10px 13px;margin:10px 0;border-radius:0 6px 6px 0;border-left:3px solid #C0392B;background:rgba(192,57,43,.04);font-size:13px;font-style:italic;color:#2D2D2D;line-height:1.6;}
        .ne-pv-stat-card{text-align:center;padding:14px;background:rgba(192,57,43,.06);border-radius:10px;margin:10px 0;border:1px solid rgba(192,57,43,.15);}
        .ne-pv-stat-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:30px;letter-spacing:-.03em;line-height:1;color:#C0392B;}
        .ne-pv-stat-label{font-family:"Satoshi",sans-serif;font-weight:700;font-size:12px;margin-top:3px;color:#0D0D0D;}
        .ne-pv-stat-desc{font-size:11px;color:#6B6B6B;margin-top:2px;}
        .ne-pv-gallery-wrap{padding:10px 10px 14px;}
        .ne-pv-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
        .ne-pv-gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;border-radius:3px;}
        .ne-pv-carousel{display:flex;gap:7px;overflow-x:auto;padding:10px;scroll-snap-type:x mandatory;scrollbar-width:none;}
        .ne-pv-carousel::-webkit-scrollbar{display:none;}
        .ne-pv-carousel img{width:140px;flex-shrink:0;aspect-ratio:4/3;object-fit:cover;border-radius:5px;scroll-snap-align:start;}

        @media(max-width:1100px){.ne-wrap{flex-direction:column;padding:24px 20px 80px;}.ne-right{position:static;max-height:none;flex:none;width:100%;order:-1;}.ne-pv-scroll{max-height:400px;}}
        @media(max-width:600px){.ne-gallery-grid{grid-template-columns:repeat(2,1fr);}.ne-stat-inputs{grid-template-columns:1fr;}}
      `}</style>

      {/* Save indicator */}
      {saveStatus !== 'idle' && (
        <div style={{ position:'fixed', top:16, right:24, zIndex:50, fontSize:12, color: saveStatus==='error'?'#C0392B':'#6B6B6B', fontFamily:'Inter,sans-serif', background:'var(--card-bg,#fff)', border:'1px solid var(--line,rgba(13,13,13,.1))', borderRadius:8, padding:'4px 10px', boxShadow:'0 2px 8px -2px rgba(0,0,0,.1)' }}>
          {saveStatus==='saving' ? 'Guardando…' : saveStatus==='error' ? '⚠ Error al guardar' : `Guardado ✓  ${savedAt ? savedAt.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}) : ''}`}
        </div>
      )}

      <div className="ne-wrap">

        {/* ── LEFT: editor ── */}
        <div className="ne-left">
          <div className="ne-left-header">
            <button className="ne-back" onClick={() => router.push('/coordinator/news')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 12L4 7l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Mis noticias
            </button>
            <button
              className={`ne-preview-toggle${previewOpen ? ' active' : ''}`}
              onClick={() => setPreviewOpen(o => !o)}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 3v8" stroke="currentColor" strokeWidth="1.3"/></svg>
              {previewOpen ? 'Solo editor' : 'Vista previa'}
            </button>
          </div>

          {/* Title + slug */}
          <div className="ne-card">
            <input
              className="ne-title"
              value={title}
              onChange={e => { setTitle(e.target.value); setSlug(toSlug(e.target.value)) }}
              placeholder="Título de la noticia"
              maxLength={160}
            />
            <div className="ne-slug-row">
              <span className="ne-slug-prefix">/news/</span>
              <input className="ne-slug" value={slug} onChange={e => setSlug(toSlug(e.target.value))} placeholder="url-del-articulo" />
            </div>

            <div className="ne-toolbar" style={{ marginTop: 20 }}>
              <button className="ne-tb-btn" onMouseDown={e => { e.preventDefault(); execCmd('bold') }}><b>N</b></button>
              <button className="ne-tb-btn" onMouseDown={e => { e.preventDefault(); execCmd('italic') }}><em style={{ fontFamily:'Georgia,serif' }}>I</em></button>
              <div className="ne-tb-sep" />
              <button className="ne-tb-btn" onMouseDown={e => { e.preventDefault(); execCmd('formatBlock','h2') }} style={{ fontFamily:'Satoshi,sans-serif', fontWeight:700, fontSize:13 }}>H2</button>
              <button className="ne-tb-btn" onMouseDown={e => { e.preventDefault(); execCmd('formatBlock','h3') }} style={{ fontFamily:'Satoshi,sans-serif', fontWeight:700, fontSize:12 }}>H3</button>
              <div className="ne-tb-sep" />
              <button className="ne-tb-btn" onMouseDown={e => { e.preventDefault(); execCmd('insertUnorderedList') }}>• Lista</button>
              <button className="ne-tb-btn" onMouseDown={e => { e.preventDefault(); execCmd('formatBlock','p') }} style={{ fontSize:11 }}>¶ Normal</button>
            </div>

            <div
              ref={editorRef}
              className="ne-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Escribe el contenido de la noticia…"
              onInput={onEditorInput}
              style={{ paddingTop: 4 }}
            />
          </div>

          {/* Cover */}
          <div className="ne-card">
            <span className="ne-label">Imagen de portada</span>
            {coverUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="" className="ne-cover-img" />
                <button className="ne-btn-rm" onClick={removeCover}>✕ Eliminar portada</button>
              </>
            ) : (
              <div
                className={`ne-drop${coverDrag ? ' drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setCoverDrag(true) }}
                onDragLeave={() => setCoverDrag(false)}
                onDrop={e => { e.preventDefault(); setCoverDrag(false); const f = e.dataTransfer.files?.[0]; if (f) uploadCover(f) }}
                onClick={() => coverInputRef.current?.click()}
              >
                {uploading ? <div style={{ fontSize:13, color:'#C0392B' }}>Subiendo imagen…</div> : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display:'block', margin:'0 auto 8px', opacity:.4 }}>
                      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M3 15l5-4 4 4 3-2.5 6 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div style={{ fontSize:13.5, color:'var(--mute,#6B6B6B)' }}>Arrastra una imagen o haz clic</div>
                    <div style={{ fontSize:12, color:'#bbb', marginTop:4 }}>JPG, PNG, WEBP · 16:9 recomendada</div>
                  </>
                )}
              </div>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f) }} />
          </div>

          {/* Gallery */}
          <div className="ne-card">
            <span className="ne-label">Galería de fotos ({galleryUrls.length}/20)</span>
            {galleryUrls.length < 20 && (
              <div className="ne-drop" onClick={() => galleryInputRef.current?.click()} style={{ marginBottom: galleryUrls.length > 0 ? 12 : 0 }}>
                {galleryUpl ? <div style={{ fontSize:13, color:'#C0392B' }}>Subiendo fotos…</div> : <div style={{ fontSize:13.5, color:'var(--mute,#6B6B6B)' }}>+ Agregar fotos a la galería</div>}
              </div>
            )}
            <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e => addGalleryFiles(e.target.files)} />
            {galleryUrls.length > 0 && (
              <div className="ne-gallery-grid">
                {galleryUrls.map((url, i) => (
                  <div key={i} className="ne-gallery-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" />
                    <button className="ne-gallery-rm" onClick={() => removeGalleryImage(url)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Layout options */}
          <div className="ne-card">
            <span className="ne-label">Diseño</span>

            <div style={{ fontSize:12, fontWeight:600, color:'var(--ink,#0D0D0D)', marginBottom:6 }}>Estilo de portada</div>
            <div className="ne-layout-pills">
              {([
                { value: 'full',    label: 'Portada completa', Diagram: DiagramFullCover    },
                { value: 'lateral', label: 'Portada lateral',  Diagram: DiagramLateralCover },
              ] as { value: 'full'|'lateral'; label: string; Diagram: () => JSX.Element }[]).map(({ value, label, Diagram }) => (
                <button
                  key={value}
                  className={`ne-layout-pill${layoutOptions.coverStyle === value ? ' active' : ''}`}
                  onClick={() => setLayoutOptions(o => ({ ...o, coverStyle: value }))}
                >
                  <Diagram />
                  <span className="ne-layout-pill-label">{label}</span>
                </button>
              ))}
            </div>

            <div className="ne-section-divider" />

            <div style={{ fontSize:12, fontWeight:600, color:'var(--ink,#0D0D0D)', marginBottom:6 }}>Estilo de galería</div>
            <div className="ne-layout-pills">
              {([
                { value: 'grid',     label: 'Grid',     Diagram: DiagramGrid     },
                { value: 'carousel', label: 'Carrusel', Diagram: DiagramCarousel },
              ] as { value: 'grid'|'carousel'; label: string; Diagram: () => JSX.Element }[]).map(({ value, label, Diagram }) => (
                <button
                  key={value}
                  className={`ne-layout-pill${layoutOptions.galleryStyle === value ? ' active' : ''}`}
                  onClick={() => setLayoutOptions(o => ({ ...o, galleryStyle: value }))}
                >
                  <Diagram />
                  <span className="ne-layout-pill-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Extra blocks */}
          <div className="ne-card">
            <span className="ne-label">Elementos extra</span>

            <div className="ne-extra-section">
              <div className="ne-extra-label">Cita destacada</div>
              <textarea
                className="ne-extra-textarea"
                value={featuredQuote}
                onChange={e => setFeaturedQuote(e.target.value)}
                placeholder="Escribe una cita o frase destacada que aparecerá resaltada en el artículo…"
                rows={3}
              />
            </div>

            <div className="ne-section-divider" />

            <div className="ne-extra-section">
              <div className="ne-extra-label">Color de acento</div>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
                {ACCENT_PRESETS.map(color => (
                  <button
                    key={color}
                    className={`ne-color-swatch${accentColor === color ? ' active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setAccentColor(color)}
                    title={color}
                  />
                ))}
                <span style={{ fontSize:11.5, color:'var(--mute,#6B6B6B)', marginLeft:4, fontFamily:'Inter,monospace' }}>{accentColor}</span>
              </div>
            </div>

            <div className="ne-section-divider" />

            <div className="ne-extra-section">
              <div className="ne-extra-label">Estadística destacada</div>
              <div style={{ fontSize:12, color:'var(--mute,#6B6B6B)', marginBottom:8 }}>Número · Etiqueta · Descripción</div>
              <div className="ne-stat-inputs">
                <input className="ne-stat-input" value={highlightStat.number} onChange={e => setHighlightStat(s => ({ ...s, number: e.target.value }))} placeholder="150" />
                <input className="ne-stat-input" value={highlightStat.label} onChange={e => setHighlightStat(s => ({ ...s, label: e.target.value }))} placeholder="estudiantes" />
                <input className="ne-stat-input" value={highlightStat.description} onChange={e => setHighlightStat(s => ({ ...s, description: e.target.value }))} placeholder="participaron en el proyecto" />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: sidebar + preview ── */}
        <AnimatePresence>
          {previewOpen && (
            <motion.div
              key="ne-right"
              className="ne-right"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            >
              {/* Status sidebar */}
              <div className="ne-sb-card">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ display:'inline-block', padding:'3px 11px', borderRadius:999, fontSize:11.5, fontWeight:700, background: published ? '#D1FAE5' : 'var(--line,rgba(13,13,13,.08))', color: published ? '#065F46' : 'var(--mute,#6B6B6B)' }}>
                    {published ? 'Publicado ✓' : 'Borrador'}
                  </span>
                  <div className="ne-save-ind" style={{ marginLeft:'auto' }}>
                    {saveStatus === 'saving' && <span style={{ color:'var(--mute,#6B6B6B)' }}>Guardando…</span>}
                    {saveStatus === 'saved' && <span style={{ color:'#065F46' }}>Guardado ✓</span>}
                    {saveStatus === 'error' && <span style={{ color:'#C0392B' }}>⚠ Error</span>}
                  </div>
                </div>
                {!published ? (
                  <button className="btn-publish" disabled={publishing || !canPublish} onClick={handlePublish}>
                    {publishing ? 'Publicando…' : 'Publicar noticia →'}
                  </button>
                ) : (
                  <button className="btn-unpublish" disabled={publishing} onClick={handleUnpublish}>
                    {publishing ? '…' : 'Despublicar'}
                  </button>
                )}
                <button className="btn-save-news" onClick={doSave}>Guardar borrador</button>
              </div>

              {/* Preview frame */}
              <div>
                <div className="ne-pv-label">Vista previa</div>
                <div className="ne-pv-frame">
                  {/* Browser chrome */}
                  <div className="ne-chrome">
                    <div className="ne-chrome-dots">
                      <span className="ne-chrome-dot" style={{ background:'#FF5F57' }}/>
                      <span className="ne-chrome-dot" style={{ background:'#FEBC2E' }}/>
                      <span className="ne-chrome-dot" style={{ background:'#28C840' }}/>
                    </div>
                    <div className="ne-chrome-url">bigfamily.co/news/{slug || 'url-del-articulo'}</div>
                  </div>

                  <div className="ne-pv-scroll">
                    {!title && !previewContent ? (
                      <div className="ne-pv-empty">Empieza a escribir para ver la vista previa</div>
                    ) : (
                      <>
                        {/* Cover — full */}
                        {coverUrl && layoutOptions.coverStyle === 'full' && (
                          <div className="ne-pv-cover-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={coverUrl} alt="" />
                          </div>
                        )}

                        {/* Lateral layout */}
                        {layoutOptions.coverStyle === 'lateral' ? (
                          <div className="ne-pv-lateral">
                            <div className="ne-pv-lateral-text">
                              <div className="ne-pv-meta">{previewDate}</div>
                              <div className="ne-pv-title">{title || 'Título del artículo'}</div>
                              {featuredQuote && (
                                <blockquote className="ne-pv-quote" style={{ borderColor: accentColor }}>
                                  {featuredQuote}
                                </blockquote>
                              )}
                              {highlightStat.number && (
                                <div className="ne-pv-stat-card" style={{ borderColor: accentColor + '33', background: accentColor + '0D' }}>
                                  <div className="ne-pv-stat-num" style={{ color: accentColor }}>{highlightStat.number}</div>
                                  {highlightStat.label && <div className="ne-pv-stat-label">{highlightStat.label}</div>}
                                  {highlightStat.description && <div className="ne-pv-stat-desc">{highlightStat.description}</div>}
                                </div>
                              )}
                              <div className="ne-pv-content" dangerouslySetInnerHTML={{ __html: previewContent }} />
                            </div>
                            {coverUrl ? (
                              <div className="ne-pv-lateral-img">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={coverUrl} alt="" />
                              </div>
                            ) : (
                              <div className="ne-pv-lateral-img" style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'var(--line,rgba(13,13,13,.08))' }}>
                                <span style={{ fontSize:11, color:'var(--mute,#6B6B6B)' }}>Sin portada</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="ne-pv-body-pad">
                            <div className="ne-pv-meta">{previewDate}</div>
                            <div className="ne-pv-title">{title || 'Título del artículo'}</div>
                            {highlightStat.number && (
                              <div className="ne-pv-stat-card" style={{ borderColor: accentColor + '33', background: accentColor + '0D' }}>
                                <div className="ne-pv-stat-num" style={{ color: accentColor }}>{highlightStat.number}</div>
                                {highlightStat.label && <div className="ne-pv-stat-label">{highlightStat.label}</div>}
                                {highlightStat.description && <div className="ne-pv-stat-desc">{highlightStat.description}</div>}
                              </div>
                            )}
                            {featuredQuote && (
                              <blockquote className="ne-pv-quote" style={{ borderColor: accentColor }}>
                                {featuredQuote}
                              </blockquote>
                            )}
                            <div className="ne-pv-content" dangerouslySetInnerHTML={{ __html: previewContent }} />
                          </div>
                        )}

                        {/* Gallery */}
                        {galleryUrls.length > 0 && (
                          <div className="ne-pv-gallery-wrap">
                            {layoutOptions.galleryStyle === 'carousel' ? (
                              <div className="ne-pv-carousel">
                                {galleryUrls.map((url, i) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img key={i} src={url} alt="" />
                                ))}
                              </div>
                            ) : (
                              <div className="ne-pv-gallery">
                                {galleryUrls.map((url, i) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img key={i} src={url} alt="" />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  )
}
