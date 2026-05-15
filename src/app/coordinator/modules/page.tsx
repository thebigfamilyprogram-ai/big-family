'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { showToast, ToastContainer } from '@/components/Toast'

// ── Types ────────────────────────────────────────────────────────────────────
interface ModuleRow {
  id:               string
  title:            string
  description:      string | null
  video_url:        string | null
  level:            string
  duration_minutes: number | null
  status:           string
  created_by:       string
  rejection_reason: string | null
  submitted_at:     string | null
  approved_at:      string | null
  pilar:            string | null
  question_count:   number
  expositor_name:   string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string | null): string | null {
  if (!url) return null
  const patterns = [/[?&]v=([^&#]+)/, /youtu\.be\/([^?#]+)/, /embed\/([^?#]+)/]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}

const PILAR_LABELS: Record<string, string> = {
  'I':   'I · Yo',
  'II':  'II · Norte',
  'III': 'III · Vínculo',
  'IV':  'IV · Acción',
  'V':   'V · Legado',
}

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

// ── Approval / rejection modals ───────────────────────────────────────────────
function ApproveModal({ mod, onConfirm, onClose, loading }: { mod: ModuleRow; onConfirm: () => void; onClose: () => void; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={() => { if (!loading) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }} transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, padding: '36px 32px', maxWidth: 440, width: '100%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.25)' }}
      >
        <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 20, color: '#0D0D0D', marginBottom: 10 }}>¿Publicar este módulo?</div>
        <p style={{ fontSize: 14, color: '#6B6B6B', lineHeight: 1.6, marginBottom: 6 }}>El módulo quedará visible para todos los estudiantes de la plataforma.</p>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0D0D0D', marginBottom: 24 }}>"{mod.title}"</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '10px 20px', borderRadius: 999, background: 'transparent', color: '#6B6B6B', border: '1px solid rgba(13,13,13,.15)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '10px 22px', borderRadius: 999, background: '#065F46', color: '#fff', border: 'none', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Publicando…' : 'Sí, publicar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function RejectModal({ mod, onConfirm, onClose, loading }: { mod: ModuleRow; onConfirm: (reason: string) => void; onClose: () => void; loading: boolean }) {
  const [reason, setReason] = useState('')
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={() => { if (!loading) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }} transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, padding: '36px 32px', maxWidth: 460, width: '100%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.25)' }}
      >
        <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 20, color: '#0D0D0D', marginBottom: 10 }}>Rechazar módulo</div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0D0D0D', marginBottom: 16 }}>"{mod.title}"</p>
        <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 8 }}>Motivo del rechazo (requerido)</div>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Explica al expositor por qué no se aprueba y qué debe mejorar…"
          style={{ width: '100%', minHeight: 100, padding: '10px 14px', border: '1px solid rgba(13,13,13,.15)', borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '10px 20px', borderRadius: 999, background: 'transparent', color: '#6B6B6B', border: '1px solid rgba(13,13,13,.15)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={loading || !reason.trim()} style={{ padding: '10px 22px', borderRadius: 999, background: '#991B1B', color: '#fff', border: 'none', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14, cursor: (loading || !reason.trim()) ? 'not-allowed' : 'pointer', opacity: (loading || !reason.trim()) ? 0.5 : 1 }}>
            {loading ? 'Rechazando…' : 'Confirmar rechazo'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Module card ───────────────────────────────────────────────────────────────
function ModuleCard({
  mod, onApprove, onReject, onUnpublish, showActions,
}: {
  mod: ModuleRow
  onApprove?: (mod: ModuleRow) => void
  onReject?: (mod: ModuleRow) => void
  onUnpublish?: (id: string) => void
  showActions: 'pending' | 'published'
}) {
  const thumbId = extractYouTubeId(mod.video_url)
  const thumbUrl = thumbId ? `https://img.youtube.com/vi/${thumbId}/hqdefault.jpg` : null

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(13,13,13,.07)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px -4px rgba(13,13,13,.07)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: thumbUrl ? '200px 1fr' : '1fr', gap: 0 }}>
        {/* Thumbnail */}
        {thumbUrl && (
          <div style={{ aspectRatio: '16/9', maxHeight: 140, overflow: 'hidden', background: '#0D0D0D' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '20px 22px' }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
            {mod.pilar && PILAR_LABELS[mod.pilar] && (
              <span style={{ padding: '3px 10px', borderRadius: 999, background: '#EDE9FE', color: '#4C1D95', fontSize: 11.5, fontWeight: 700, fontFamily: 'Satoshi,sans-serif' }}>
                {PILAR_LABELS[mod.pilar]}
              </span>
            )}
            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, fontFamily: 'Satoshi,sans-serif', background: mod.level === 'senior' ? 'rgba(192,57,43,.1)' : '#FEF3C7', color: mod.level === 'senior' ? '#C0392B' : '#92400E' }}>
              {mod.level === 'senior' ? 'Senior' : 'Junior'}
            </span>
          </div>

          <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 17, color: '#0D0D0D', marginBottom: 6, lineHeight: 1.3 }}>{mod.title}</div>
          {mod.description && (
            <p style={{ fontSize: 13.5, color: '#6B6B6B', lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {mod.description}
            </p>
          )}

          {/* Meta row */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5, color: '#9a9690', marginBottom: 14 }}>
            <span>Por <strong style={{ color: '#0D0D0D' }}>{mod.expositor_name}</strong></span>
            {mod.submitted_at && (
              <span>Enviado el {new Date(mod.submitted_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            )}
            {mod.approved_at && showActions === 'published' && (
              <span>Publicado el {new Date(mod.approved_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            )}
            {mod.duration_minutes && mod.duration_minutes > 0 && (
              <span>{mod.duration_minutes} min</span>
            )}
            <span>{mod.question_count} pregunta{mod.question_count !== 1 ? 's' : ''}</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {showActions === 'pending' && onApprove && onReject && (
              <>
                <button
                  onClick={() => onApprove(mod)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 999, background: '#065F46', color: '#fff', border: 'none', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', transition: 'background .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#064E3B')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#065F46')}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Aprobar
                </button>
                <button
                  onClick={() => onReject(mod)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 999, background: '#fff', color: '#991B1B', border: '1px solid #991B1B', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', transition: 'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Rechazar
                </button>
              </>
            )}
            {showActions === 'published' && onUnpublish && (
              <button
                onClick={() => onUnpublish(mod.id)}
                style={{ padding: '9px 18px', borderRadius: 999, background: 'transparent', color: '#6B6B6B', border: '1px solid rgba(13,13,13,.14)', fontFamily: 'Satoshi,sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#991B1B'; e.currentTarget.style.color = '#991B1B' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,13,13,.14)'; e.currentTarget.style.color = '#6B6B6B' }}
              >
                Despublicar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CoordinatorModulesPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,   setLoading]   = useState(true)
  const [coordName, setCoordName] = useState('…')
  const [schoolName,setSchoolName]= useState('…')
  const [pending,   setPending]   = useState<ModuleRow[]>([])
  const [published, setPublished] = useState<ModuleRow[]>([])
  const [tab,       setTab]       = useState<'pending' | 'published'>('pending')

  const [approving, setApproving] = useState<ModuleRow | null>(null)
  const [rejecting, setRejecting] = useState<ModuleRow | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('full_name, role, school_id').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (!profile || profile.role !== 'coordinator') { router.replace('/dashboard'); return }

      const { data: schoolRow } = profile.school_id
        ? await supabase.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
        : { data: null }
      if (cancelled) return

      setCoordName(profile.full_name ?? '—')
      setSchoolName((schoolRow as any)?.name ?? 'Mi colegio')

      // Fetch pending + published modules
      const { data: mods } = await supabase
        .from('modules')
        .select('id, title, description, video_url, level, duration_minutes, status, created_by, rejection_reason, submitted_at, approved_at, pilar')
        .in('status', ['pending', 'published'])
        .order('submitted_at', { ascending: false })
      if (cancelled || !mods || mods.length === 0) { setLoading(false); return }

      // Fetch question counts
      const modIds = mods.map(m => m.id)
      const creatorIds = [...new Set(mods.map(m => m.created_by))]

      const [{ data: qs }, { data: expositors }] = await Promise.all([
        supabase.from('questions').select('module_id').in('module_id', modIds),
        supabase.from('profiles').select('id, full_name').in('id', creatorIds),
      ])
      if (cancelled) return

      const qMap: Record<string, number> = {}
      qs?.forEach(q => { qMap[q.module_id] = (qMap[q.module_id] ?? 0) + 1 })

      const expMap: Record<string, string> = {}
      expositors?.forEach(e => { expMap[e.id] = e.full_name ?? '—' })

      const enriched: ModuleRow[] = mods.map(m => ({
        ...m,
        question_count: qMap[m.id] ?? 0,
        expositor_name: expMap[m.created_by] ?? '—',
      }))

      setPending(enriched.filter(m => m.status === 'pending'))
      setPublished(enriched.filter(m => m.status === 'published'))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApprove() {
    if (!approving) return
    setActionLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('modules').update({
      status:      'published',
      approved_at: new Date().toISOString(),
      approved_by: user?.id ?? null,
    }).eq('id', approving.id)
    setActionLoading(false)
    if (error) { showToast('error', 'Error al aprobar el módulo'); return }
    const updated = { ...approving, status: 'published', approved_at: new Date().toISOString() }
    setPending(prev => prev.filter(m => m.id !== approving.id))
    setPublished(prev => [updated, ...prev])
    setApproving(null)
    showToast('success', `"${approving.title}" publicado ✓`)
  }

  async function handleReject(reason: string) {
    if (!rejecting) return
    setActionLoading(true)
    const { error } = await supabase.from('modules').update({
      status:           'rejected',
      rejection_reason: reason,
    }).eq('id', rejecting.id)
    setActionLoading(false)
    if (error) { showToast('error', 'Error al rechazar el módulo'); return }
    setPending(prev => prev.filter(m => m.id !== rejecting.id))
    setRejecting(null)
    showToast('error', `"${rejecting.title}" rechazado`)
  }

  async function handleUnpublish(id: string) {
    const mod = published.find(m => m.id === id)
    if (!mod) return
    const { error } = await supabase.from('modules').update({ status: 'draft', approved_at: null, approved_by: null }).eq('id', id)
    if (error) { showToast('error', 'Error al despublicar'); return }
    setPublished(prev => prev.filter(m => m.id !== id))
    showToast('info', `"${mod.title}" movido a borrador`)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const currentList = tab === 'pending' ? pending : published

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;min-height:100vh;color:#0D0D0D;}
        .cm-nav{position:sticky;top:0;z-index:30;background:rgba(245,243,239,.88);backdrop-filter:saturate(150%) blur(16px);border-bottom:1px solid rgba(13,13,13,.08);height:62px;display:flex;align-items:center;padding:0 40px;gap:24px;}
        .cm-brand{display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;color:#0D0D0D;flex-shrink:0;}
        .cm-school{flex:1;text-align:center;font-size:13.5px;font-weight:600;color:#2D2D2D;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .cm-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
        .cm-badge{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;background:#FFF4E6;color:#7A4A00;border:1px solid #FFD699;border-radius:999px;padding:3px 10px;font-weight:700;}
        .cm-btn{background:transparent;border:1px solid rgba(13,13,13,.12);border-radius:999px;padding:8px 16px;font-size:13px;color:#0D0D0D;cursor:pointer;transition:border-color .2s,background .2s;white-space:nowrap;font-family:inherit;}
        .cm-btn:hover{border-color:#0D0D0D;background:rgba(13,13,13,.04);}
        .cm-btn--active{background:#0D0D0D;color:#fff;border-color:#0D0D0D;}
        .cm-btn--ghost{background:none;border:1px solid rgba(13,13,13,.14);border-radius:999px;padding:7px 14px;font-size:12px;color:#6B6B6B;cursor:pointer;transition:all .2s;white-space:nowrap;}
        .cm-btn--ghost:hover{border-color:#0D0D0D;color:#0D0D0D;}
        .cm-main{max-width:860px;margin:0 auto;padding:44px 40px 80px;}
        .cm-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;gap:16px;}
        .cm-header h1{font-family:"Satoshi",sans-serif;font-weight:900;font-size:28px;letter-spacing:-.022em;color:#0D0D0D;}
        .cm-header p{margin-top:5px;font-size:13.5px;color:#6B6B6B;}
        .cm-tabs{display:flex;gap:8px;margin-bottom:24px;}
        .cm-tab{padding:8px 20px;border-radius:999px;border:none;font-family:"Satoshi",sans-serif;font-weight:600;font-size:13.5px;cursor:pointer;transition:all .18s;background:rgba(13,13,13,.06);color:#6B6B6B;}
        .cm-tab:hover{background:rgba(13,13,13,.1);color:#0D0D0D;}
        .cm-tab.active{background:#0D0D0D;color:#fff;}
        .cm-feed{display:flex;flex-direction:column;gap:18px;}
        .cm-empty{background:#fff;border:1px dashed rgba(13,13,13,.15);border-radius:20px;padding:56px 40px;text-align:center;color:#9a9690;}
        @media(max-width:860px){.cm-main{padding:28px 20px 60px;}.cm-nav{padding:0 20px;}.cm-school{display:none;}}
      `}</style>

      {/* Nav */}
      <nav className="cm-nav">
        <a className="cm-brand" href="/">
          <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          Big Family
        </a>
        <div className="cm-school">{loading ? <Sk w={160} h={13} r={6} /> : schoolName}</div>
        <div className="cm-right">
          <span className="cm-badge">Coordinador</span>
          <button className="cm-btn" onClick={() => router.push('/coordinator')}>Panel principal</button>
          <button className="cm-btn" onClick={() => router.push('/coordinator/projects')}>Proyectos</button>
          <button className="cm-btn cm-btn--active">Módulos</button>
          <button className="cm-btn" onClick={() => router.push('/coordinator/news')}>Noticias</button>
          <button className="cm-btn" onClick={() => router.push('/dashboard')}>Dashboard</button>
          <button className="cm-btn--ghost" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </nav>

      <main className="cm-main">
        {/* Header */}
        <div className="cm-header">
          <div>
            <h1>Revisión de Módulos</h1>
            <p>
              {loading ? 'Cargando…' : `${pending.length} módulo${pending.length !== 1 ? 's' : ''} pendiente${pending.length !== 1 ? 's' : ''} de revisión · ${schoolName}`}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="cm-tabs">
          <button
            className={`cm-tab${tab === 'pending' ? ' active' : ''}`}
            onClick={() => setTab('pending')}
          >
            Pendientes
            {!loading && pending.length > 0 && (
              <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 999, background: tab === 'pending' ? 'rgba(255,255,255,.2)' : 'rgba(13,13,13,.08)', fontSize: 11 }}>{pending.length}</span>
            )}
          </button>
          <button
            className={`cm-tab${tab === 'published' ? ' active' : ''}`}
            onClick={() => setTab('published')}
          >
            Publicados
            {!loading && published.length > 0 && (
              <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 999, background: tab === 'published' ? 'rgba(255,255,255,.2)' : 'rgba(13,13,13,.08)', fontSize: 11 }}>{published.length}</span>
            )}
          </button>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="cm-feed">
            {[0, 1, 2].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 8px -4px rgba(13,13,13,.07)' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <Sk w={200} h={112} r={10} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Sk w="40%" h={12} />
                    <Sk w="65%" h={20} />
                    <Sk h={13} />
                    <Sk w="45%" h={13} />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Sk w={100} h={36} r={999} />
                      <Sk w={100} h={36} r={999} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="cm-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 14px', opacity: .3 }}>
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12h8M8 8h5M8 16h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              {tab === 'pending' ? 'No hay módulos pendientes de revisión' : 'No hay módulos publicados aún'}
            </div>
            <div style={{ fontSize: 13.5 }}>
              {tab === 'pending' ? 'Cuando un expositor envíe un módulo aparecerá aquí.' : 'Aprueba módulos desde la pestaña Pendientes.'}
            </div>
          </div>
        ) : (
          <div className="cm-feed">
            {currentList.map((mod, i) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.05 }}
              >
                <ModuleCard
                  mod={mod}
                  showActions={tab}
                  onApprove={tab === 'pending' ? setApproving : undefined}
                  onReject={tab === 'pending' ? setRejecting : undefined}
                  onUnpublish={tab === 'published' ? handleUnpublish : undefined}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {approving && (
          <ApproveModal mod={approving} onConfirm={handleApprove} onClose={() => setApproving(null)} loading={actionLoading} />
        )}
        {rejecting && (
          <RejectModal mod={rejecting} onConfirm={handleReject} onClose={() => setRejecting(null)} loading={actionLoading} />
        )}
      </AnimatePresence>

      <ToastContainer />
    </>
  )
}
