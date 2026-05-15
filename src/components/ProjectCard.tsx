'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

// ─── Shared types (exported for page use) ─────────────────────────────────────

export interface Project {
  id: string
  title: string
  description: string
  category: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  created_at: string
  user_id?: string
  school_id?: string | null
  video_url?: string | null
  pdf_url?: string | null
  rejection_reason?: string | null
  approved_at?: string | null
  completion_percentage?: number
  likes_count: number
  comments_count: number
  images: string[]
  // coordinator-only
  full_name?: string
  school_name?: string
}

export interface ProjectComment {
  id: string
  body: string
  created_at: string
}

interface Props {
  project: Project
  mode: 'student' | 'coordinator'
  coordinatorId?: string
  initialComments?: ProjectComment[]
  onApprove?: (id: string) => void
  onReject?: (id: string, reason: string) => void
  onEvaluate?: (id: string) => void
  resultado?: string | null
}

const RESULTADO_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  mencion_honor:     { label: '🏆 Mención de Honor',                           bg: '#FEF9C3', color: '#713F12' },
  certificado:       { label: '✓ Certificado',                                  bg: '#D1FAE5', color: '#065F46' },
  retroalimentacion: { label: '↩ Retroalimentación — puede reentregar',         bg: '#FEF3C7', color: '#92400E' },
  no_certificado:    { label: '✗ No certificado',                               bg: '#FEE2E2', color: '#991B1B' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  'liderazgo-comunitario': 'Liderazgo comunitario',
  'innovacion-social':     'Innovación social',
  'medio-ambiente':        'Medio ambiente',
  'educacion':             'Educación',
  'salud-bienestar':       'Salud y bienestar',
  'emprendimiento':        'Emprendimiento',
}

function StatusBadge({ status }: { status: Project['status'] }) {
  const map = {
    draft:    { label: 'Borrador',    bg: '#F1EFE8', color: '#444441' },
    pending:  { label: 'En revisión', bg: '#FEF3C7', color: '#92400E' },
    approved: { label: 'Aprobado',    bg: '#D1FAE5', color: '#065F46' },
    rejected: { label: 'Rechazado',   bg: '#FEE2E2', color: '#991B1B' },
  }
  const { label, bg, color } = map[status] || map['draft']
  return (
    <span style={{ padding: '4px 10px', borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 600, fontFamily: '"Satoshi",sans-serif', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {status === 'pending' && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      )}
      {status === 'approved' && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {status === 'rejected' && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      )}
      {label}
    </span>
  )
}

function CategoryPill({ category }: { category: string }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(192,57,43,.1)', color: '#C0392B', fontSize: 11, fontWeight: 600, fontFamily: '"Satoshi",sans-serif' }}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  )
}

function videoEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`
  return null
}

function Gallery({ images }: { images: string[] }) {
  if (!images.length) return null
  if (images.length === 1) {
    return (
      <div style={{ height: 320, borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
        <img src={images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  const shown = images.slice(0, 4)
  const extra = images.length - 4
  const cols  = images.length === 2 ? 2 : images.length === 3 ? 3 : 2
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
      {shown.map((src, i) => (
        <div key={i} style={{ position: 'relative', paddingTop: '66%' }}>
          <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          {i === 3 && extra > 0 && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,13,13,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 22 }}>+{extra}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const HeartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 13.5S2 9.8 2 5.8C2 3.7 3.8 2 6 2c1 0 1.8.4 2.4 1C9 2.4 9.8 2 11 2c2.2 0 4 1.7 4 3.8 0 4-6 7.7-7 7.7" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const CommentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 3.5C2 2.7 2.7 2 3.5 2h9C13.3 2 14 2.7 14 3.5v6c0 .8-.7 1.5-1.5 1.5H9l-3 3V11H3.5C2.7 11 2 10.3 2 9.5v-6Z" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectCard({
  project,
  mode,
  coordinatorId,
  initialComments = [],
  onApprove,
  onReject,
  onEvaluate,
  resultado,
}: Props) {
  const supabase = createClient()

  const [localStatus, setLocalStatus]               = useState(project.status)
  const [localRejection, setLocalRejection]         = useState(project.rejection_reason ?? '')
  const [showRejectInput, setShowRejectInput]       = useState(false)
  const [rejectReason, setRejectReason]             = useState('')
  const [comments, setComments]                     = useState<ProjectComment[]>(initialComments)
  const [commentText, setCommentText]               = useState('')
  const [submittingComment, setSubmittingComment]   = useState(false)

  useEffect(() => {
    setLocalStatus(project.status)
    setLocalRejection(project.rejection_reason ?? '')
  }, [project.status, project.rejection_reason])

  async function submitComment() {
    if (!commentText.trim() || !coordinatorId) return
    setSubmittingComment(true)
    const { data } = await supabase
      .from('project_comments')
      .insert({ project_id: project.id, user_id: coordinatorId, body: commentText.trim() })
      .select()
      .maybeSingle()
    if (data) {
      setComments(c => [...c, { id: data.id, body: data.body, created_at: data.created_at }])
      setCommentText('')
    }
    setSubmittingComment(false)
  }

  function handleApprove() {
    setLocalStatus('approved')
    onApprove?.(project.id)
  }

  function handleRejectConfirm() {
    setLocalStatus('rejected')
    setLocalRejection(rejectReason)
    onReject?.(project.id, rejectReason)
    setShowRejectInput(false)
  }

  const embedUrl = project.video_url ? videoEmbedUrl(project.video_url) : null

  // ── Student card ─────────────────────────────────────────────────────────────
  if (mode === 'student') {
    const cover = project.images?.[0]
    return (
      <motion.div
        style={{
          background: '#fff',
          border: '1px solid rgba(13,13,13,.07)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 2px 12px -4px rgba(13,13,13,.07)',
        }}
        whileHover={{ y: -4, boxShadow: '0 12px 32px -8px rgba(13,13,13,.14)' }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        {/* Cover */}
        <div style={{ position: 'relative', height: 180, background: cover ? undefined : 'linear-gradient(135deg,#C0392B 0%,#8B1A1A 100%)' }}>
          {cover
            ? <img src={cover} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M2 8.5C2 7.4 2.9 6.5 4 6.5H8L10 4H14L16 6.5H20C21.1 6.5 22 7.4 22 8.5V17.5C22 18.6 21.1 19.5 20 19.5H4C2.9 19.5 2 18.6 2 17.5V8.5Z" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="3" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
                </svg>
              </div>
          }
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <AnimatePresence mode="wait">
              <motion.div key={localStatus} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }} transition={{ duration: 0.18 }}>
                <StatusBadge status={localStatus} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{ marginBottom: 10 }}>
            <CategoryPill category={project.category} />
          </div>
          <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 16, color: '#0D0D0D', marginBottom: 8, lineHeight: 1.3 }}>
            {project.title || 'Sin título'}
          </div>
          <div style={{ fontSize: 14, color: '#6B6B6B', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 12 } as React.CSSProperties}>
            {project.description || ''}
          </div>
          <div style={{ fontSize: 12, color: '#bbb', marginBottom: 14 }}>
            {new Date(project.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div style={{ display: 'flex', gap: 16, borderTop: '1px solid rgba(13,13,13,.06)', paddingTop: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B6B6B' }}>
              <HeartIcon />{project.likes_count}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B6B6B' }}>
              <CommentIcon />{project.comments_count}
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  // ── Coordinator card ──────────────────────────────────────────────────────────
  const initials = (project.full_name ?? '?').charAt(0).toUpperCase()

  return (
    <motion.div
      style={{
        background: '#fff',
        border: '1px solid rgba(13,13,13,.07)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 2px 16px -6px rgba(13,13,13,.08)',
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
    >
      {/* Header */}
      <div style={{ padding: '22px 26px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#C0392B,#8B1A1A)', color: '#fff', fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 15, color: '#0D0D0D' }}>{project.full_name ?? '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 13, color: '#6B6B6B' }}>{project.school_name ?? '—'}</span>
              <span style={{ color: '#ddd' }}>·</span>
              <span style={{ fontSize: 12, color: '#bbb' }}>
                {new Date(project.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <CategoryPill category={project.category} />
          <AnimatePresence mode="wait">
            <motion.div key={localStatus} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }} transition={{ duration: 0.18 }}>
              <StatusBadge status={localStatus} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '18px 26px' }}>
        <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 20, color: '#0D0D0D', marginBottom: 10, lineHeight: 1.25 }}>
          {project.title || 'Sin título'}
        </div>
        <div style={{ fontSize: 15, color: '#4a4a4a', lineHeight: 1.72, marginBottom: 4 }}>
          {project.description || ''}
        </div>

        <Gallery images={project.images} />

        {embedUrl && (
          <div style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden' }}>
            <iframe
              src={embedUrl}
              style={{ width: '100%', height: 320, border: 'none', display: 'block' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {project.pdf_url && (
          <a
            href={project.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '9px 18px', borderRadius: 999, border: '1px solid rgba(13,13,13,.14)', color: '#0D0D0D', fontSize: 13, textDecoration: 'none', fontFamily: '"Satoshi",sans-serif', fontWeight: 500 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="1" width="10" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M5 5h6M5 8h4M5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Ver presentación PDF
          </a>
        )}

        <div style={{ display: 'flex', gap: 18, marginTop: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B6B6B' }}>
            <HeartIcon />{project.likes_count}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B6B6B' }}>
            <CommentIcon />{project.comments_count}
          </span>
        </div>
      </div>

      {/* Decision zone */}
      <div style={{ borderTop: '1px solid rgba(13,13,13,.07)', padding: '18px 26px' }}>
        {localStatus === 'draft' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 5, background: 'rgba(13,13,13,.08)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: '#C0392B', width: `${project.completion_percentage ?? 0}%`, transition: 'width .4s ease' }} />
            </div>
            <span style={{ fontSize: 12, color: '#9a9690', whiteSpace: 'nowrap', fontFamily: 'Inter,sans-serif' }}>
              {project.completion_percentage ?? 0}% completado · Editando
            </span>
          </div>
        )}

        {localStatus === 'pending' && !showRejectInput && (
          onEvaluate ? (
            <button
              onClick={() => onEvaluate(project.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 999, background: '#C0392B', color: '#fff', border: 'none', fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 8h6M5 5.5h6M5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              Evaluar con rúbrica →
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleApprove}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 999, background: '#065F46', color: '#fff', border: 'none', fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Aprobar para certificación
              </button>
              <button
                onClick={() => setShowRejectInput(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 999, background: '#fff', color: '#991B1B', border: '1px solid #991B1B', fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                Rechazar
              </button>
            </div>
          )
        )}

        {localStatus === 'pending' && showRejectInput && (
          <div>
            <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 8 }}>Motivo del rechazo (opcional)</div>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Escribe el motivo para el estudiante..."
              style={{ width: '100%', minHeight: 80, padding: '10px 14px', border: '1px solid rgba(13,13,13,.15)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={handleRejectConfirm} style={{ padding: '10px 20px', borderRadius: 999, background: '#991B1B', color: '#fff', border: 'none', fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Confirmar rechazo
              </button>
              <button onClick={() => { setShowRejectInput(false); setRejectReason('') }} style={{ padding: '10px 20px', borderRadius: 999, background: 'transparent', color: '#6B6B6B', border: '1px solid rgba(13,13,13,.15)', fontFamily: '"Satoshi",sans-serif', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {localStatus === 'approved' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            {resultado && RESULTADO_BADGE[resultado] ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999, background: RESULTADO_BADGE[resultado].bg, color: RESULTADO_BADGE[resultado].color, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13 }}>
                {RESULTADO_BADGE[resultado].label}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#065F46', fontFamily: '"Satoshi",sans-serif', fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#065F46" strokeWidth="1.4"/><path d="M5 8l2.5 2.5 4-4" stroke="#065F46" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Aprobado para certificación
              </span>
            )}
            <button onClick={() => { setLocalStatus('pending'); onApprove?.('revoke-' + project.id) }} style={{ padding: '7px 16px', borderRadius: 999, background: 'transparent', color: '#6B6B6B', border: '1px solid rgba(13,13,13,.12)', fontSize: 12, fontFamily: '"Satoshi",sans-serif', cursor: 'pointer' }}>
              Revocar aprobación
            </button>
          </div>
        )}

        {localStatus === 'rejected' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#991B1B', fontFamily: '"Satoshi",sans-serif', fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#991B1B" strokeWidth="1.4"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#991B1B" strokeWidth="1.6" strokeLinecap="round"/></svg>
                Rechazado
              </div>
              {localRejection && <div style={{ fontSize: 13, color: '#6B6B6B', marginTop: 5 }}>{localRejection}</div>}
            </div>
            <button onClick={() => setLocalStatus('pending')} style={{ padding: '7px 16px', borderRadius: 999, background: 'transparent', color: '#6B6B6B', border: '1px solid rgba(13,13,13,.12)', fontSize: 12, fontFamily: '"Satoshi",sans-serif', cursor: 'pointer' }}>
              Reconsiderar
            </button>
          </div>
        )}
      </div>

      {/* Comments */}
      <div style={{ borderTop: '1px solid rgba(13,13,13,.06)', padding: '16px 26px 20px' }}>
        <div style={{ fontSize: 10.5, color: '#9a9690', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 14 }}>
          Comentarios del coordinador
        </div>

        {comments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#C0392B,#8B1A1A)', color: '#fff', fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>C</div>
            <div>
              <div style={{ fontSize: 13, color: '#2D2D2D', lineHeight: 1.5 }}>{c.body}</div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 3 }}>
                {new Date(c.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: comments.length ? 8 : 0 }}>
          <input
            type="text"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitComment() }}
            placeholder="Escribe feedback para el estudiante..."
            style={{ flex: 1, padding: '9px 14px', border: '1px solid rgba(13,13,13,.12)', borderRadius: 999, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#faf9f7' }}
          />
          <button
            onClick={submitComment}
            disabled={submittingComment || !commentText.trim()}
            style={{ padding: '9px 18px', borderRadius: 999, background: (!submittingComment && commentText.trim()) ? '#0D0D0D' : 'rgba(13,13,13,.08)', color: '#fff', border: 'none', fontSize: 13, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, cursor: (!submittingComment && commentText.trim()) ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
          >
            Comentar
          </button>
        </div>
      </div>
    </motion.div>
  )
}
