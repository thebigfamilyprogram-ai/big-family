'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────
export interface ModuleData {
  id:               string
  title:            string
  description:      string | null
  video_url:        string | null
  level:            string
  duration_minutes: number
  xp_reward:        number
  status:           string
  rejection_reason: string | null
  thumbnail_url:    string | null
}

export interface QuestionData {
  id:             string
  module_id:      string
  type:           'multiple_choice' | 'true_false' | 'reflection'
  question:       string
  options:        string[] | null
  correct_answer: string | null
  order_index:    number
}

interface Props {
  moduleId:         string
  initialModule:    ModuleData
  initialQuestions: QuestionData[]
  onSubmit?:        () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  const patterns = [/[?&]v=([^&#]+)/, /youtu\.be\/([^?#]+)/, /embed\/([^?#]+)/]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

const LEVEL_OPTIONS = [
  { value: 'junior', label: 'Junior', color: '#92400E' },
  { value: 'senior', label: 'Senior', color: '#C0392B' },
]

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type ModuleSnapshot = {
  title: string; description: string; videoUrl: string
  level: string; durationMinutes: number; xpReward: number
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SaveIndicator({ saveStatus, savedAt }: { saveStatus: SaveStatus; savedAt: Date | null }) {
  if (saveStatus === 'idle') return null
  const text =
    saveStatus === 'saving' ? 'Guardando…' :
    saveStatus === 'error'  ? '⚠ Error al guardar' :
    `Guardado ✓  ${savedAt ? savedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}`
  const color = saveStatus === 'error' ? '#C0392B' : '#6B6B6B'
  return (
    <div style={{ position: 'fixed', top: 16, right: 24, zIndex: 50, fontSize: 12, color, fontFamily: 'Inter,sans-serif', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '4px 10px', boxShadow: '0 2px 8px -2px rgba(0,0,0,.1)' }}>
      {text}
    </div>
  )
}

function QuestionCard({
  q, index, total, onUpdate, onDelete, onDragStart, onDragOver, onDrop, isDragOver,
}: {
  q: QuestionData; index: number; total: number
  onUpdate: (id: string, changes: Partial<QuestionData>) => void
  onDelete: (id: string) => void
  onDragStart: (i: number) => void
  onDragOver: (e: React.DragEvent, i: number) => void
  onDrop: (i: number) => void
  isDragOver: boolean
}) {
  const supabase = createClient()

  async function save(changes: Partial<QuestionData>) {
    onUpdate(q.id, changes)
    await supabase.from('questions').update(changes).eq('id', q.id)
  }

  const typeLabel = q.type === 'multiple_choice' ? 'Opción múltiple' : q.type === 'true_false' ? 'Verdadero / Falso' : 'Reflexión'

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      style={{
        border: `1.5px solid ${isDragOver ? '#C0392B' : 'var(--card-border)'}`,
        borderRadius: 12, padding: '20px 20px 20px 14px', background: 'var(--card-bg)',
        marginBottom: 12, display: 'flex', gap: 14, transition: 'border-color .15s, box-shadow .15s',
        boxShadow: isDragOver ? '0 0 0 3px rgba(192,57,43,.12)' : 'none',
        cursor: 'default',
      }}
    >
      {/* drag handle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, paddingTop: 4, cursor: 'grab', color: 'var(--mute)', flexShrink: 0, userSelect: 'none' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 3 }}>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor' }} />
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor' }} />
          </div>
        ))}
        <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: '#C0392B', fontFamily: 'Satoshi,sans-serif' }}>{index + 1}</div>
      </div>

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* type selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['multiple_choice', 'true_false', 'reflection'] as const).map(t => (
            <button
              key={t}
              onClick={() => save({
                type: t,
                options: t === 'multiple_choice' ? ['', '', '', ''] : t === 'true_false' ? ['Verdadero', 'Falso'] : null,
                correct_answer: t === 'multiple_choice' ? '0' : t === 'true_false' ? 'true' : null,
              })}
              style={{
                padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: q.type === t ? '#0D0D0D' : 'var(--line)',
                color: q.type === t ? '#fff' : 'var(--mute)',
                transition: 'all .15s',
              }}
            >
              {t === 'multiple_choice' ? 'Opción múltiple' : t === 'true_false' ? 'V / F' : 'Reflexión'}
            </button>
          ))}
          <button onClick={() => onDelete(q.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 8px', borderRadius: 6, transition: 'color .15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#C0392B')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--mute)')}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            Eliminar
          </button>
        </div>

        {/* question text */}
        <input
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--ink)', marginBottom: 14 }}
          placeholder="Escribe la pregunta…"
          defaultValue={q.question}
          onBlur={e => save({ question: e.target.value })}
          onFocus={e => (e.target.style.borderColor = '#C0392B')}
        />

        {/* answers */}
        {q.type === 'multiple_choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(q.options ?? ['', '', '', '']).map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correct_answer === String(i)}
                  onChange={() => save({ correct_answer: String(i) })}
                  style={{ accentColor: '#C0392B', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
                  title="Marcar como respuesta correcta"
                />
                <input
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 7, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--ink)' }}
                  placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                  defaultValue={opt}
                  onBlur={e => {
                    const newOpts = [...(q.options ?? ['', '', '', ''])]
                    newOpts[i] = e.target.value
                    save({ options: newOpts })
                  }}
                  onFocus={e => (e.target.style.borderColor = '#C0392B')}
                />
              </div>
            ))}
            <p style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>Selecciona el radio de la respuesta correcta</p>
          </div>
        )}

        {q.type === 'true_false' && (
          <div style={{ display: 'flex', gap: 20 }}>
            {[{ val: 'true', label: 'Verdadero' }, { val: 'false', label: 'Falso' }].map(({ val, label }) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
                <input
                  type="radio"
                  name={`tf-${q.id}`}
                  checked={q.correct_answer === val}
                  onChange={() => save({ correct_answer: val })}
                  style={{ accentColor: '#C0392B', width: 15, height: 15, cursor: 'pointer' }}
                />
                {label}
              </label>
            ))}
          </div>
        )}

        {q.type === 'reflection' && (
          <p style={{ fontSize: 12.5, color: 'var(--mute)', fontStyle: 'italic' }}>Pregunta abierta — no tiene respuesta correcta.</p>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ModuleEditor({ moduleId, initialModule, initialQuestions, onSubmit }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  // Module field state — all initialized directly from prop (avoids autosave bug)
  const [title,           setTitle]           = useState(initialModule.title ?? '')
  const [description,     setDescription]     = useState(initialModule.description ?? '')
  const [level,           setLevel]           = useState(initialModule.level ?? '')
  const [videoUrl,        setVideoUrl]        = useState(initialModule.video_url ?? '')
  const [durationMinutes, setDurationMinutes] = useState(initialModule.duration_minutes ?? 0)
  const [xpReward,        setXpReward]        = useState(initialModule.xp_reward ?? 100)
  const [status,          setStatus]          = useState(initialModule.status ?? 'draft')

  // Questions
  const [questions,    setQuestions]    = useState<QuestionData[]>(
    [...initialQuestions].sort((a, b) => a.order_index - b.order_index)
  )
  const [addingQ,      setAddingQ]      = useState(false)

  // Drag state
  const [dragIndex,     setDragIndex]     = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt,    setSavedAt]    = useState<Date | null>(null)
  const [submitModal,  setSubmitModal]  = useState(false)
  const [submitting,   setSubmitting]   = useState(false)

  // Refs
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef   = useRef(false)

  // Stable snapshot for doSave closure
  const valuesRef = useRef<ModuleSnapshot>({ title, description, videoUrl, level, durationMinutes, xpReward })
  valuesRef.current = { title, description, videoUrl, level, durationMinutes, xpReward }

  // Derived
  const videoId      = extractYouTubeId(videoUrl)
  const thumbUrl     = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
  const isLocked     = status === 'pending'
  const canSubmit    = title.trim().length > 0 && (description ?? '').trim().length > 0 && videoUrl.trim().length > 0 && level.length > 0 && questions.length > 0

  // ── Autosave ───────────────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    if (!moduleId) return
    const v = valuesRef.current
    setSaveStatus('saving')
    const { data: updated, error } = await supabase
      .from('modules')
      .update({
        title:            v.title,
        description:      v.description,
        video_url:        v.videoUrl,
        level:            v.level,
        duration_minutes: v.durationMinutes,
        xp_reward:        v.xpReward,
      })
      .eq('id', moduleId)
      .select('id')
    if (error) { console.error('Module save error:', error); setSaveStatus('error') }
    else if (!updated?.length) { console.error('Module save matched 0 rows'); setSaveStatus('error') }
    else { setSaveStatus('saved'); setSavedAt(new Date()) }
  }, [moduleId]) // eslint-disable-line react-hooks/exhaustive-deps

  const triggerAutosave = useCallback(() => {
    if (isLocked) return
    setSaveStatus('idle')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(doSave, 1500)
  }, [doSave, isLocked])

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    triggerAutosave()
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [title, description, level, videoUrl, durationMinutes, xpReward]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Questions ──────────────────────────────────────────────────────────────
  async function addQuestion() {
    if (addingQ) return
    setAddingQ(true)
    const newQ: Omit<QuestionData, 'id'> = {
      module_id:      moduleId,
      type:           'multiple_choice',
      question:       '',
      options:        ['', '', '', ''],
      correct_answer: '0',
      order_index:    questions.length,
    }
    const { data, error } = await supabase.from('questions').insert(newQ).select().maybeSingle()
    if (!error && data) setQuestions(prev => [...prev, data])
    setAddingQ(false)
  }

  function updateQuestionLocal(id: string, changes: Partial<QuestionData>) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...changes } : q))
  }

  async function deleteQuestion(id: string) {
    await supabase.from('questions').delete().eq('id', id)
    setQuestions(prev => {
      const next = prev.filter(q => q.id !== id)
      return next.map((q, i) => ({ ...q, order_index: i }))
    })
  }

  async function handleDrop(toIndex: number) {
    if (dragIndex === null || dragIndex === toIndex) { setDragIndex(null); setDragOverIndex(null); return }
    const reordered = [...questions]
    const [moved]   = reordered.splice(dragIndex, 1)
    reordered.splice(toIndex, 0, moved)
    const withIdx   = reordered.map((q, i) => ({ ...q, order_index: i }))
    setQuestions(withIdx)
    setDragIndex(null)
    setDragOverIndex(null)
    await Promise.all(withIdx.map(q => supabase.from('questions').update({ order_index: q.order_index }).eq('id', q.id)))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true)
    await doSave()
    const { error } = await supabase.from('modules').update({ status: 'pending' }).eq('id', moduleId)
    setSubmitting(false)
    if (error) return
    setStatus('pending')
    setSubmitModal(false)
    onSubmit?.()
    setTimeout(() => router.push('/expositor'), 1200)
  }

  const checklistItems = [
    { label: 'Título',        done: title.trim().length > 0 },
    { label: 'Descripción',   done: (description ?? '').trim().length > 0 },
    { label: 'Video URL',     done: videoUrl.trim().length > 0 },
    { label: 'Nivel',         done: level.length > 0 },
    { label: 'Al menos 1 pregunta', done: questions.length > 0 },
  ]

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .me-wrap{display:flex;gap:28px;align-items:flex-start;padding:36px 40px 80px;max-width:1200px;margin:0 auto;}
        .me-main{flex:1 1 0;min-width:0;}
        .me-sidebar{flex:0 0 280px;position:sticky;top:24px;}
        .me-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--mute);background:none;border:none;cursor:pointer;padding:0;margin-bottom:20px;font-family:inherit;transition:color .15s;}
        .me-back:hover{color:var(--ink);}
        .me-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:32px;box-shadow:0 2px 16px -6px rgba(13,13,13,.07);margin-bottom:24px;}
        .me-section-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:18px;color:var(--ink);margin-bottom:20px;}
        .me-label{font-family:"Satoshi",sans-serif;font-weight:500;font-size:13.5px;color:var(--ink);display:block;margin-bottom:7px;}
        .me-input{width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;font-size:14px;font-family:inherit;outline:none;background:var(--bg);color:var(--ink);transition:border-color .18s;}
        .me-input:focus{border-color:#C0392B;}
        .me-input:disabled{opacity:.5;cursor:default;}
        .me-textarea{min-height:120px;resize:vertical;line-height:1.7;}
        .me-field{margin-bottom:20px;}
        .me-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
        .me-level-btn{padding:8px 20px;border-radius:999px;border:1.5px solid var(--line);background:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .18s;}
        .me-thumb{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;margin-top:10px;border:1px solid var(--line);}
        .me-thumb-ph{width:100%;aspect-ratio:16/9;background:var(--line);border-radius:10px;margin-top:10px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:var(--mute);}
        .me-sb-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:22px;box-shadow:0 2px 12px -4px rgba(13,13,13,.07);margin-bottom:16px;}
        .me-check-item{display:flex;align-items:center;gap:9px;padding:6px 4px;font-size:13px;color:var(--ink-2);}
        .me-check-dot{width:17px;height:17px;border-radius:50%;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px;}
        .me-check-dot.done{background:#D1FAE5;border-color:#6EE7B7;color:#065F46;}
        .btn-submit{width:100%;padding:13px;border-radius:999px;background:#C0392B;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:background .2s,opacity .2s;margin-top:4px;}
        .btn-submit:hover:not(:disabled){background:#a93226;}
        .btn-submit:disabled{opacity:.4;cursor:not-allowed;}
        .btn-save{width:100%;padding:11px;border-radius:999px;background:#0D0D0D;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:background .2s;margin-top:8px;}
        .btn-save:hover{background:#333;}
        .me-locked{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#FFFBEB;border:1px solid #FCD34D;border-radius:12px;margin-bottom:24px;font-size:13.5px;color:#92400E;}
        @media(max-width:900px){
          .me-wrap{flex-direction:column;padding:24px 16px 80px;}
          .me-sidebar{position:static;flex:none;width:100%;}
          .me-row{grid-template-columns:1fr;}
        }
      `}</style>

      <SaveIndicator saveStatus={saveStatus} savedAt={savedAt} />

      <div className="me-wrap">
        {/* ── Editor ──────────────────────────────────────────────────────── */}
        <div className="me-main">
          <button className="me-back" onClick={() => router.push('/expositor')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 12L4 7l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Mis módulos
          </button>

          {isLocked && (
            <div className="me-locked">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Este módulo está en revisión. No puedes editarlo hasta recibir respuesta.
            </div>
          )}

          {/* Module info */}
          <div className="me-card">
            <div className="me-section-title">Información del módulo</div>

            <div className="me-field">
              <label className="me-label">Título</label>
              <input className="me-input" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Nombre del módulo" disabled={isLocked} maxLength={120} />
            </div>

            <div className="me-field">
              <label className="me-label">Descripción</label>
              <textarea className="me-input me-textarea" value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="¿De qué trata este módulo?" disabled={isLocked} />
            </div>

            <div className="me-field">
              <label className="me-label">Nivel</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {LEVEL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className="me-level-btn"
                    disabled={isLocked}
                    onClick={() => setLevel(opt.value)}
                    style={{
                      borderColor: level === opt.value ? opt.color : 'var(--line)',
                      background:  level === opt.value ? opt.color : 'none',
                      color:       level === opt.value ? '#fff' : 'var(--mute)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="me-field">
              <label className="me-label">URL del video (YouTube)</label>
              <input className="me-input" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…" disabled={isLocked} />
              {thumbUrl
                ? <img className="me-thumb" src={thumbUrl} alt="Vista previa del video" />
                : videoUrl.trim().length > 0
                  ? <div className="me-thumb-ph">URL de YouTube no válida</div>
                  : null
              }
            </div>

            <div className="me-row">
              <div>
                <label className="me-label">Duración (minutos)</label>
                <input className="me-input" type="number" min={1} value={durationMinutes || ''}
                  onChange={e => setDurationMinutes(Number(e.target.value) || 0)}
                  placeholder="30" disabled={isLocked} />
              </div>
              <div>
                <label className="me-label">Recompensa XP</label>
                <input className="me-input" type="number" min={0} value={xpReward || ''}
                  onChange={e => setXpReward(Number(e.target.value) || 0)}
                  placeholder="100" disabled={isLocked} />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="me-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="me-section-title" style={{ margin: 0 }}>
                Preguntas
                <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: 'var(--mute)' }}>
                  ({questions.length})
                </span>
              </div>
              {!isLocked && (
                <button
                  onClick={addQuestion}
                  disabled={addingQ}
                  style={{ padding: '8px 18px', borderRadius: 999, background: '#0D0D0D', color: '#fff', border: 'none', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13, cursor: addingQ ? 'not-allowed' : 'pointer', opacity: addingQ ? 0.5 : 1, transition: 'background .2s' }}
                >
                  {addingQ ? 'Agregando…' : '+ Agregar pregunta'}
                </button>
              )}
            </div>

            {questions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mute)', fontSize: 14 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 12px', opacity: .4 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                No hay preguntas todavía. Agrega al menos una para poder enviar el módulo.
              </div>
            ) : (
              <div onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}>
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id} q={q} index={i} total={questions.length}
                    onUpdate={updateQuestionLocal}
                    onDelete={deleteQuestion}
                    onDragStart={setDragIndex}
                    onDragOver={(e, idx) => { e.preventDefault(); setDragOverIndex(idx) }}
                    onDrop={handleDrop}
                    isDragOver={dragOverIndex === i}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="me-sidebar">
          <div className="me-sb-card">
            <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 14 }}>
              Lista de verificación
            </div>
            {checklistItems.map(item => (
              <div key={item.label} className="me-check-item">
                <div className={`me-check-dot${item.done ? ' done' : ''}`}>{item.done ? '✓' : ''}</div>
                <span>{item.label}</span>
              </div>
            ))}

            <div style={{ marginTop: 18, marginBottom: 12 }}>
              {status === 'draft'     && <span style={{ display:'inline-block', padding:'4px 12px', background:'var(--line)', color:'var(--mute)', borderRadius:999, fontSize:12, fontWeight:600 }}>Borrador</span>}
              {status === 'pending'   && <span style={{ display:'inline-block', padding:'4px 12px', background:'#FEF3C7', color:'#92400E', borderRadius:999, fontSize:12, fontWeight:600 }}>En revisión</span>}
              {status === 'published' && <span style={{ display:'inline-block', padding:'4px 12px', background:'#D1FAE5', color:'#065F46', borderRadius:999, fontSize:12, fontWeight:600 }}>Publicado ✓</span>}
              {status === 'rejected'  && <span style={{ display:'inline-block', padding:'4px 12px', background:'#FEE2E2', color:'#991B1B', borderRadius:999, fontSize:12, fontWeight:600 }}>Rechazado</span>}
            </div>

            {!isLocked && (
              <>
                {!canSubmit && (
                  <p style={{ fontSize: 11.5, color: '#9a9690', marginBottom: 8, lineHeight: 1.4 }}>
                    Completa todos los campos para enviar a revisión.
                  </p>
                )}
                <button className="btn-submit" onClick={() => setSubmitModal(true)} disabled={!canSubmit}>
                  Enviar a revisión →
                </button>
                <button className="btn-save" onClick={doSave}>Guardar borrador</button>
              </>
            )}
          </div>

          {initialModule.rejection_reason && (
            <div className="me-sb-card" style={{ borderColor: '#FCA5A5', background: '#FFF5F5' }}>
              <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13, color: '#991B1B', marginBottom: 6 }}>Motivo de rechazo</div>
              <p style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.55 }}>{initialModule.rejection_reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Submit modal */}
      <AnimatePresence>
        {submitModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => { if (!submitting) setSubmitModal(false) }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--card-bg)', borderRadius: 20, padding: '36px 32px', maxWidth: 440, width: '100%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.25)' }}
            >
              <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginBottom: 12 }}>
                ¿Enviar a revisión?
              </div>
              <p style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.65, marginBottom: 28 }}>
                El módulo quedará en revisión y no podrás editarlo hasta recibir respuesta del administrador.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setSubmitModal(false)} disabled={submitting}
                  style={{ padding: '10px 20px', borderRadius: 999, background: 'transparent', color: 'var(--mute)', border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSubmit} disabled={submitting}
                  style={{ padding: '10px 22px', borderRadius: 999, background: '#C0392B', color: '#fff', border: 'none', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Enviando…' : 'Confirmar envío'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
