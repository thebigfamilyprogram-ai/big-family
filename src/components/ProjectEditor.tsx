'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/components/Toast'

// ── Types ────────────────────────────────────────────────────────────────────
export interface ProjectEditorData {
  title:                       string
  subtitle:                    string
  category:                    string
  track:                       string
  idemr_identificar:           string
  idemr_diseniar:              string
  idemr_ejecutar:              string
  idemr_medir:                 string
  idemr_reflexionar:           string
  plan_continuidad:            string
  big_leader_model_reflection: string
  evidence_urls:               string[]
  pdf_url:                     string | null
  video_url:                   string | null
  status:                      string
  completion_percentage:       number
}

interface Props {
  projectId:    string
  userId:       string
  userFullName: string
  schoolName:   string
  initialData:  ProjectEditorData
  onSave?:      () => void
  onSubmit?:    () => void
}

// ── Sub-field types ───────────────────────────────────────────────────────────
interface IdentificarFields { problema: string; afecta: string; porque: string }
interface DiseniarFields    { meta: string; equipo: string; recursos: string; tiempo: string }
interface EjecutarFields    { acciones: string; liderazgo: string; dificultades: string }
interface MedirFields       { personas: string; cambio: string; evidencia: string }
interface ReflexionarFields { aprendizaje: string; diferente: string; dificil: string }

const DEFAULT_IDENTIFICAR: IdentificarFields = { problema: '', afecta: '', porque: '' }
const DEFAULT_DISENIAR: DiseniarFields       = { meta: '', equipo: '', recursos: '', tiempo: '' }
const DEFAULT_EJECUTAR: EjecutarFields       = { acciones: '', liderazgo: '', dificultades: '' }
const DEFAULT_MEDIR: MedirFields             = { personas: '', cambio: '', evidencia: '' }
const DEFAULT_REFLEXIONAR: ReflexionarFields = { aprendizaje: '', diferente: '', dificil: '' }

// Parse JSON from DB, fall back gracefully from old plain-text format
function parseFields<T extends object>(raw: string, defaults: T): T {
  if (!raw?.trim()) return defaults
  if (raw.trim().startsWith('{')) {
    try { return { ...defaults, ...JSON.parse(raw) } } catch { /* fall through */ }
  }
  // Old plain text: put in first field so no data is lost
  const firstKey = Object.keys(defaults)[0]
  return firstKey ? { ...defaults, [firstKey]: raw } as T : defaults
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'liderazgo-comunitario', label: 'Liderazgo comunitario' },
  { value: 'innovacion-social',     label: 'Innovación social' },
  { value: 'medio-ambiente',        label: 'Medio ambiente' },
  { value: 'educacion',             label: 'Educación' },
  { value: 'salud-bienestar',       label: 'Salud y bienestar' },
  { value: 'emprendimiento',        label: 'Emprendimiento' },
]

const TRACKS = [
  { value: 'junior', label: 'Junior', sub: 'Primaria – 7° Bach.' },
  { value: 'senior', label: 'Senior', sub: '8° – 11° Bach.' },
]

// TEMP: sections 7 (plan_continuidad) and 8 (big_leader_model) hidden for launch
// Pilar references removed — students don't know the Big Leader Model yet
const SIDEBAR_SECTIONS = [
  { num: 2, label: 'Identificar'  },
  { num: 3, label: 'Diseñar'      },
  { num: 4, label: 'Ejecutar'     },
  { num: 5, label: 'Medir'        },
  { num: 6, label: 'Reflexionar'  },
  { num: 9, label: 'Evidencias'   },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function wc(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function allComplete(fields: object, minWords = 10): boolean {
  return Object.values(fields).every(v => typeof v === 'string' && wc(v) >= minWords)
}

type ValuesSnapshot = {
  title: string; subtitle: string; category: string; track: string
  identificar:  IdentificarFields
  diseniar:     DiseniarFields
  ejecutar:     EjecutarFields
  medir:        MedirFields
  reflexionar:  ReflexionarFields
  // TEMP: kept in snapshot so existing data isn't overwritten on save
  planContinuidad: string; bigLeaderModelReflection: string
  evidenceUrls: string[]; pdfUrl: string | null
}

// 5 IDEMR sections × 20% = 100%
function computeCompletion(v: ValuesSnapshot): number {
  let p = 0
  if (allComplete(v.identificar))  p += 20
  if (allComplete(v.diseniar))     p += 20
  if (allComplete(v.ejecutar))     p += 20
  if (allComplete(v.medir))        p += 20
  if (allComplete(v.reflexionar))  p += 20
  return Math.round(p)
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CircleProgress({ pct }: { pct: number }) {
  const r = 44, sw = 7
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <div style={{ position: 'relative', width: r * 2 + sw * 2, height: r * 2 + sw * 2, display: 'inline-block' }}>
      <svg width={r * 2 + sw * 2} height={r * 2 + sw * 2} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={r + sw} cy={r + sw} r={r} fill="none" stroke="rgba(13,13,13,.08)" strokeWidth={sw} />
        <circle cx={r + sw} cy={r + sw} r={r} fill="none" stroke="#C0392B" strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .4s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 900, fontSize: 22, color: '#C0392B' }}>{pct}%</span>
      </div>
    </div>
  )
}

function Section({ num, label, open, done, onToggle, children }: {
  num: number; label: string; open: boolean; done: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div id={`section-${num}`} style={{ borderBottom: '1px solid rgba(13,13,13,0.08)', scrollMarginTop: 80 }}>
      <div className="pe-sec-header" onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13, color: '#C0392B', minWidth: 24, flexShrink: 0 }}>
            {String(num).padStart(2, '0')}
          </span>
          <span style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
            {label}
          </span>
          {done && (
            <span style={{ padding: '2px 8px', background: '#D1FAE5', color: '#065F46', borderRadius: 999, fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
              ✓ Completo
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} style={{ flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="var(--mute)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 28 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ paddingBottom: 24 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SubField({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: '"Inter",sans-serif', fontWeight: 500, fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, lineHeight: 1.5 }}>
        {label}
      </div>
      <textarea
        className="pe-input pe-textarea"
        style={{ minHeight: 100, resize: 'vertical' as const, lineHeight: 1.7, fontSize: 15 }}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
      />
      <p className="pe-wc">{wc(value)} palabras</p>
    </div>
  )
}

function SaveIndicator({ saveStatus, savedAt }: { saveStatus: 'idle'|'saving'|'saved'|'error'; savedAt: Date | null }) {
  if (saveStatus === 'idle') return null
  const text =
    saveStatus === 'saving' ? 'Guardando…' :
    saveStatus === 'error'  ? '⚠ Error al guardar — reintentando' :
    `Guardado ✓  ${savedAt ? savedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}`
  const color = saveStatus === 'error' ? '#C0392B' : '#6B6B6B'
  return (
    <div style={{ position: 'fixed', top: 16, right: 24, zIndex: 50, fontSize: 12, color, fontFamily: 'Inter,sans-serif', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '4px 10px', boxShadow: '0 2px 8px -2px rgba(0,0,0,.1)' }}>
      {text}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProjectEditor({
  projectId, userId, userFullName, schoolName, initialData, onSave, onSubmit,
}: Props) {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  // ── State — initialized directly from initialData ─────────────────────────
  const [title,    setTitle]    = useState(initialData.title ?? '')
  const [subtitle, setSubtitle] = useState(initialData.subtitle ?? '')
  const [category, setCategory] = useState(initialData.category ?? '')
  const [track,    setTrack]    = useState(initialData.track ?? '')

  // Sub-field objects (parsed from existing JSON or migrated from plain text)
  const [identificar,  setIdentificar]  = useState<IdentificarFields>(() => parseFields(initialData.idemr_identificar, DEFAULT_IDENTIFICAR))
  const [diseniar,     setDiseniar]     = useState<DiseniarFields>(() =>    parseFields(initialData.idemr_diseniar, DEFAULT_DISENIAR))
  const [ejecutar,     setEjecutar]     = useState<EjecutarFields>(() =>    parseFields(initialData.idemr_ejecutar, DEFAULT_EJECUTAR))
  const [medir,        setMedir]        = useState<MedirFields>(() =>       parseFields(initialData.idemr_medir, DEFAULT_MEDIR))
  const [reflexionar,  setReflexionar]  = useState<ReflexionarFields>(() => parseFields(initialData.idemr_reflexionar, DEFAULT_REFLEXIONAR))

  // TEMP: plan_continuidad and big_leader_model_reflection kept in state so existing data
  // is preserved on save even though the UI sections are hidden
  const [planContinuidad,          setPlanContinuidad]          = useState(initialData.plan_continuidad ?? '')
  const [bigLeaderModelReflection, setBigLeaderModelReflection] = useState(initialData.big_leader_model_reflection ?? '')

  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(initialData.evidence_urls ?? [])
  const [pdfUrl,       setPdfUrl]       = useState<string | null>(initialData.pdf_url ?? null)
  const [status,       setStatus]       = useState(initialData.status ?? 'draft')

  // UI state
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([2]))
  const [saveStatus,   setSaveStatus]   = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [savedAt,      setSavedAt]      = useState<Date | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [imgDrag,      setImgDrag]      = useState(false)
  const [pdfDrag,      setPdfDrag]      = useState(false)
  const [submitModal,  setSubmitModal]  = useState(false)
  const [submitting,   setSubmitting]   = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef   = useRef(false)
  const imgInputRef  = useRef<HTMLInputElement>(null)
  const pdfInputRef  = useRef<HTMLInputElement>(null)

  const valuesRef = useRef<ValuesSnapshot>({
    title, subtitle, category, track,
    identificar, diseniar, ejecutar, medir, reflexionar,
    planContinuidad, bigLeaderModelReflection, evidenceUrls, pdfUrl,
  })
  valuesRef.current = {
    title, subtitle, category, track,
    identificar, diseniar, ejecutar, medir, reflexionar,
    planContinuidad, bigLeaderModelReflection, evidenceUrls, pdfUrl,
  }

  // ── Completion ─────────────────────────────────────────────────────────────
  const completion = computeCompletion(valuesRef.current)

  const sectionDone: Record<number, boolean> = {
    1: title.trim().length > 3 && category.length > 0,
    2: allComplete(identificar),
    3: allComplete(diseniar),
    4: allComplete(ejecutar),
    5: allComplete(medir),
    6: allComplete(reflexionar),
    9: evidenceUrls.length > 0,
  }

  const doneSectionCount = [sectionDone[1], sectionDone[2], sectionDone[3], sectionDone[4], sectionDone[5], sectionDone[6], sectionDone[9]].filter(Boolean).length

  // ── Autosave ───────────────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    if (!projectId) return
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const v = valuesRef.current
    const comp = computeCompletion(v)
    setSaveStatus('saving')
    const { data: updated, error } = await supabase
      .from('projects')
      .update({
        title:                       v.title,
        subtitle:                    v.subtitle,
        category:                    v.category,
        track:                       v.track,
        idemr_identificar:           JSON.stringify(v.identificar),
        idemr_diseniar:              JSON.stringify(v.diseniar),
        idemr_ejecutar:              JSON.stringify(v.ejecutar),
        idemr_medir:                 JSON.stringify(v.medir),
        idemr_reflexionar:           JSON.stringify(v.reflexionar),
        plan_continuidad:            v.planContinuidad,
        big_leader_model_reflection: v.bigLeaderModelReflection,
        pdf_url:                     v.pdfUrl,
        completion_percentage:       comp,
      })
      .eq('id', projectId)
      .select('id')
    if (error) { console.error('Save error:', error); setSaveStatus('error') }
    else if (!updated?.length) { console.error('Save matched 0 rows'); setSaveStatus('error') }
    else { setSaveStatus('saved'); setSavedAt(new Date()); onSave?.() }
  }, [projectId, onSave]) // eslint-disable-line react-hooks/exhaustive-deps

  const triggerAutosave = useCallback(() => {
    if (status === 'pending') return
    setSaveStatus('idle')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(doSave, 1500)
  }, [doSave, status])

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    triggerAutosave()
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [title, subtitle, category, track, identificar, diseniar, ejecutar, medir, reflexionar]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    setSubmitting(true)
    await doSave()
    const { error } = await supabase.from('projects').update({
      status: 'pending',
      submitted_at: new Date().toISOString(),
    }).eq('id', projectId)
    setSubmitting(false)
    if (error) { showToast('error', 'Error al enviar el proyecto'); return }
    setStatus('pending')
    setSubmitModal(false)
    showToast('success', 'Proyecto enviado al coordinador ✓')
    onSubmit?.()
    setTimeout(() => router.push('/dashboard/projects'), 1200)
  }

  // ── Photo upload ───────────────────────────────────────────────────────────
  async function uploadPhoto(file: File) {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    setUploadingImg(true)
    const path = `${userId}/${projectId}/${Date.now()}-${file.name}`
    const { data: up, error } = await supabase.storage
      .from('project-images').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error || !up) { showToast('error', 'Error al subir la foto'); setUploadingImg(false); return }
    const url = supabase.storage.from('project-images').getPublicUrl(up.path).data.publicUrl
    await supabase.from('project_images').insert({ project_id: projectId, url })
    setEvidenceUrls(prev => [...prev, url])
    setUploadingImg(false)
  }

  async function removePhoto(url: string) {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const marker = '/project-images/'
    const idx = url.indexOf(marker)
    if (idx >= 0) await supabase.storage.from('project-images').remove([url.slice(idx + marker.length)])
    await supabase.from('project_images').delete().eq('project_id', projectId).eq('url', url)
    setEvidenceUrls(prev => prev.filter(u => u !== url))
  }

  function addPhotos(files: FileList | null) {
    if (!files) return
    Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 10 - evidenceUrls.length)
      .forEach(f => uploadPhoto(f))
  }

  // ── PDF upload ─────────────────────────────────────────────────────────────
  async function uploadPdf(file: File) {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    setUploadingPdf(true)
    const path = `${userId}/${projectId}/${Date.now()}-${file.name}`
    const { data: up, error } = await supabase.storage
      .from('project-pdfs').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error || !up) { showToast('error', 'Error al subir el PDF'); setUploadingPdf(false); return }
    const url = supabase.storage.from('project-pdfs').getPublicUrl(up.path).data.publicUrl
    setPdfUrl(url)
    setUploadingPdf(false)
    showToast('success', 'PDF subido ✓')
  }

  async function removePdf() {
    if (!pdfUrl) return
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const marker = '/project-pdfs/'
    const idx = pdfUrl.indexOf(marker)
    if (idx >= 0) await supabase.storage.from('project-pdfs').remove([pdfUrl.slice(idx + marker.length)])
    setPdfUrl(null)
  }

  // ── Section helpers ────────────────────────────────────────────────────────
  function toggleSection(num: number) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num); else next.add(num)
      return next
    })
  }

  function jumpTo(num: number) {
    setOpenSections(prev => new Set([...prev, num]))
    setTimeout(() => document.getElementById(`section-${num}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const isLocked = status === 'pending'
  const today    = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const trackLabel = TRACKS.find(t => t.value === track)?.label ?? ''

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .pe-wrap{display:flex;gap:28px;align-items:flex-start;padding:36px 40px 80px;max-width:1200px;margin:0 auto;}
        .pe-editor{flex:1 1 0;min-width:0;}
        .pe-sidebar{flex:0 0 300px;position:sticky;top:24px;}
        .pe-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--mute);background:none;border:none;cursor:pointer;padding:0;margin-bottom:20px;font-family:inherit;transition:color .15s;}
        .pe-back:hover{color:var(--ink);}
        .pe-doc{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:40px;box-shadow:0 2px 16px -6px rgba(13,13,13,.07);}
        .pe-cover{background:linear-gradient(135deg,#0D0D0D 0%,#1a1a1a 100%);border-radius:12px;padding:48px;margin-bottom:32px;}
        .pe-cover-logo{display:flex;align-items:center;gap:8px;margin-bottom:36px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:rgba(255,255,255,.5);}
        .pe-cover-title{width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.2);color:#fff;font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(26px,4vw,44px);line-height:1.1;padding:8px 0;outline:none;transition:border-color .2s;letter-spacing:-.02em;}
        .pe-cover-title::placeholder{color:rgba(255,255,255,.25);}
        .pe-cover-title:focus{border-bottom-color:#C0392B;}
        .pe-cover-subtitle{width:100%;background:transparent;border:none;color:rgba(255,255,255,.6);font-family:"Inter",sans-serif;font-size:16px;padding:10px 0;outline:none;border-bottom:1px solid rgba(255,255,255,.1);margin-top:12px;transition:border-color .2s;}
        .pe-cover-subtitle::placeholder{color:rgba(255,255,255,.2);}
        .pe-cover-subtitle:focus{border-bottom-color:rgba(255,255,255,.4);}
        .pe-cover-footer{display:flex;flex-wrap:wrap;gap:12px 24px;margin-top:28px;font-size:13px;color:rgba(255,255,255,.4);font-family:"Inter",sans-serif;}
        .pe-cover-footer span::before{content:"· ";margin-right:4px;}
        .pe-cover-footer span:first-child::before{content:"";}
        .pe-cat-row{margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid rgba(13,13,13,.08);}
        .pe-label{font-family:"Satoshi",sans-serif;font-weight:500;font-size:14px;color:var(--ink);display:block;margin-bottom:8px;}
        .pe-input{width:100%;padding:12px 16px;border:1px solid rgba(13,13,13,.12);border-radius:10px;font-size:14px;font-family:inherit;outline:none;background:var(--bg);color:var(--ink);transition:border-color .18s;}
        .pe-input:focus{border-color:#C0392B;}
        .pe-input:disabled{opacity:.5;cursor:default;}
        .pe-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6B6B' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px;}
        .pe-textarea{min-height:100px;resize:vertical;line-height:1.7;font-size:15px;}
        .pe-wc{font-size:11px;color:var(--mute);margin-top:4px;text-align:right;}
        .pe-track-btns{display:flex;gap:10px;margin-top:4px;}
        .pe-track-btn{flex:1;padding:12px 16px;border-radius:10px;border:1.5px solid var(--line);background:none;cursor:pointer;transition:all .18s;text-align:left;font-family:inherit;}
        .pe-track-btn:disabled{opacity:.5;cursor:default;}
        .pe-track-btn.selected{border-color:#C0392B;background:rgba(192,57,43,.06);}
        .pe-track-btn-label{font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);}
        .pe-track-btn.selected .pe-track-btn-label{color:#C0392B;}
        .pe-track-btn-sub{font-size:11.5px;color:var(--mute);margin-top:2px;}
        .pe-drop{border:2px dashed rgba(13,13,13,.15);border-radius:14px;padding:36px 24px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;}
        .pe-drop.active{border-color:#C0392B;background:rgba(192,57,43,.04);}
        .pe-drop:hover{border-color:rgba(13,13,13,.3);}
        .pe-drop-text{font-size:14px;color:var(--mute);margin-top:10px;}
        .pe-drop-sub{font-size:12px;color:#bbb;margin-top:4px;}
        .pe-photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px;}
        .pe-photo-thumb{position:relative;padding-top:75%;border-radius:10px;overflow:hidden;background:rgba(13,13,13,.05);}
        .pe-photo-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
        .pe-photo-rm{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:rgba(13,13,13,.65);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;transition:background .15s;}
        .pe-photo-rm:hover{background:rgba(192,57,43,.85);}
        .pe-pdf-row{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid rgba(13,13,13,.12);border-radius:10px;background:var(--bg-2);}
        .pe-btn-rm{background:none;border:none;cursor:pointer;color:var(--mute);padding:4px;transition:color .15s;display:flex;align-items:center;flex-shrink:0;}
        .pe-btn-rm:hover{color:#C0392B;}
        .pe-sidebar-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;box-shadow:0 2px 12px -4px rgba(13,13,13,.07);}
        .pe-checklist{margin:20px 0;}
        .pe-check-item{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;cursor:pointer;transition:background .15s;font-size:13px;color:var(--ink-2);}
        .pe-check-item:hover{background:rgba(13,13,13,.04);}
        .pe-check-dot{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;font-size:10px;}
        .pe-check-dot.done{background:#D1FAE5;border-color:#6EE7B7;color:#065F46;}
        .btn-submit-proj{width:100%;padding:13px;border-radius:999px;background:#C0392B;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:background .2s,opacity .2s;margin-top:4px;}
        .btn-submit-proj:hover:not(:disabled){background:#a93226;}
        .btn-submit-proj:disabled{opacity:.4;cursor:not-allowed;}
        .btn-save-draft{width:100%;padding:12px;border-radius:999px;background:#0D0D0D;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:600;font-size:13.5px;cursor:pointer;transition:background .2s;margin-top:8px;}
        .btn-save-draft:hover{background:#333;}
        .pe-locked-banner{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#FFFBEB;border:1px solid #FCD34D;border-radius:12px;margin-bottom:24px;font-size:13.5px;color:#92400E;}
        @media(max-width:900px){
          .pe-wrap{flex-direction:column;padding:24px 16px 80px;}
          .pe-sidebar{position:static;flex:none;width:100%;}
          .pe-cover{padding:32px 24px;}
          .pe-doc{padding:24px;}
        }
        @media(max-width:600px){
          .pe-photo-grid{grid-template-columns:repeat(2,1fr);}
        }
      `}</style>

      <SaveIndicator saveStatus={saveStatus} savedAt={savedAt} />

      <div className="pe-wrap">
        {/* ── LEFT: Editor ── */}
        <div className="pe-editor">
          <button className="pe-back" onClick={() => router.push('/dashboard/projects')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 12L4 7l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Mis Proyectos
          </button>

          {isLocked && (
            <div className="pe-locked-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Este proyecto está en revisión. No puedes editarlo hasta recibir respuesta del coordinador.
            </div>
          )}

          <div className="pe-doc">
            {/* ── SECCIÓN 1 — PORTADA ── */}
            <div className="pe-cover">
              <div className="pe-cover-logo">
                <svg width="18" height="18" viewBox="0 0 52 52" fill="none">
                  <circle cx="26" cy="10" r="6" fill="rgba(255,255,255,.6)"/>
                  <path d="M26 16 L44 48 H8 Z" fill="rgba(255,255,255,.6)"/>
                </svg>
                Big Family
              </div>
              <input className="pe-cover-title" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Nombre del proyecto" disabled={isLocked} maxLength={120} />
              <input className="pe-cover-subtitle" value={subtitle} onChange={e => setSubtitle(e.target.value)}
                placeholder="Una línea que describa tu proyecto" disabled={isLocked} maxLength={200} />
              <div className="pe-cover-footer">
                <span>{schoolName || 'Mi colegio'}</span>
                <span>{userFullName}</span>
                {trackLabel && <span>{trackLabel} Leader</span>}
                <span>{today}</span>
              </div>
            </div>

            {/* Categoría + Track */}
            <div className="pe-cat-row">
              <div style={{ marginBottom: 20 }}>
                <label className="pe-label">Categoría del proyecto</label>
                <select className="pe-input pe-select" value={category} onChange={e => setCategory(e.target.value)} disabled={isLocked}>
                  <option value="">Selecciona una categoría</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <label className="pe-label">Track</label>
              <div className="pe-track-btns">
                {TRACKS.map(t => (
                  <button key={t.value} className={`pe-track-btn${track === t.value ? ' selected' : ''}`}
                    onClick={() => setTrack(t.value)} disabled={isLocked} type="button">
                    <div className="pe-track-btn-label">{t.label} Leader</div>
                    <div className="pe-track-btn-sub">{t.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── SECCIÓN 2 — IDENTIFICAR ── */}
            <Section num={2} label="Identificar"
              open={openSections.has(2)} done={sectionDone[2]} onToggle={() => toggleSection(2)}>
              <SubField label="¿Qué problema identificaste en tu comunidad?"
                value={identificar.problema} disabled={isLocked}
                onChange={v => setIdentificar(p => ({ ...p, problema: v }))} />
              <SubField label="¿A quiénes afecta este problema?"
                value={identificar.afecta} disabled={isLocked}
                onChange={v => setIdentificar(p => ({ ...p, afecta: v }))} />
              <SubField label="¿Por qué decidiste trabajar en esto?"
                value={identificar.porque} disabled={isLocked}
                onChange={v => setIdentificar(p => ({ ...p, porque: v }))} />
            </Section>

            {/* ── SECCIÓN 3 — DISEÑAR ── */}
            <Section num={3} label="Diseñar"
              open={openSections.has(3)} done={sectionDone[3]} onToggle={() => toggleSection(3)}>
              <SubField label="¿Cuál fue tu meta principal?"
                value={diseniar.meta} disabled={isLocked}
                onChange={v => setDiseniar(p => ({ ...p, meta: v }))} />
              <SubField label="¿Quiénes formaron tu equipo?"
                value={diseniar.equipo} disabled={isLocked}
                onChange={v => setDiseniar(p => ({ ...p, equipo: v }))} />
              <SubField label="¿Qué recursos utilizaste?"
                value={diseniar.recursos} disabled={isLocked}
                onChange={v => setDiseniar(p => ({ ...p, recursos: v }))} />
              <SubField label="¿En cuánto tiempo lo ejecutaste?"
                value={diseniar.tiempo} disabled={isLocked}
                onChange={v => setDiseniar(p => ({ ...p, tiempo: v }))} />
            </Section>

            {/* ── SECCIÓN 4 — EJECUTAR ── */}
            <Section num={4} label="Ejecutar"
              open={openSections.has(4)} done={sectionDone[4]} onToggle={() => toggleSection(4)}>
              <SubField label="¿Qué acciones concretas realizaste?"
                value={ejecutar.acciones} disabled={isLocked}
                onChange={v => setEjecutar(p => ({ ...p, acciones: v }))} />
              <SubField label="¿Cómo lideraste al equipo?"
                value={ejecutar.liderazgo} disabled={isLocked}
                onChange={v => setEjecutar(p => ({ ...p, liderazgo: v }))} />
              <SubField label="¿Qué dificultades encontraste y cómo las superaste?"
                value={ejecutar.dificultades} disabled={isLocked}
                onChange={v => setEjecutar(p => ({ ...p, dificultades: v }))} />
            </Section>

            {/* ── SECCIÓN 5 — MEDIR ── */}
            <Section num={5} label="Medir"
              open={openSections.has(5)} done={sectionDone[5]} onToggle={() => toggleSection(5)}>
              <SubField label="¿Cuántas personas impactaste?"
                value={medir.personas} disabled={isLocked}
                onChange={v => setMedir(p => ({ ...p, personas: v }))} />
              <SubField label="¿Qué cambió concretamente?"
                value={medir.cambio} disabled={isLocked}
                onChange={v => setMedir(p => ({ ...p, cambio: v }))} />
              <SubField label="¿Qué evidencia tienes? (fotos, testimonios, números)"
                value={medir.evidencia} disabled={isLocked}
                onChange={v => setMedir(p => ({ ...p, evidencia: v }))} />
            </Section>

            {/* ── SECCIÓN 6 — REFLEXIONAR ── */}
            <Section num={6} label="Reflexionar"
              open={openSections.has(6)} done={sectionDone[6]} onToggle={() => toggleSection(6)}>
              <SubField label="¿Qué aprendiste de esta experiencia?"
                value={reflexionar.aprendizaje} disabled={isLocked}
                onChange={v => setReflexionar(p => ({ ...p, aprendizaje: v }))} />
              <SubField label="¿Qué harías diferente?"
                value={reflexionar.diferente} disabled={isLocked}
                onChange={v => setReflexionar(p => ({ ...p, diferente: v }))} />
              <SubField label="¿Qué fue lo más difícil?"
                value={reflexionar.dificil} disabled={isLocked}
                onChange={v => setReflexionar(p => ({ ...p, dificil: v }))} />
            </Section>

            {/* TEMP: Plan de Continuidad hidden for launch — students don't need this yet */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <Section num={7} label="Plan de Continuidad"
                open={false} done={false} onToggle={() => {}}>
                <textarea className="pe-input pe-textarea"
                  value={planContinuidad} onChange={e => setPlanContinuidad(e.target.value)} disabled />
              </Section>
            </div>

            {/* TEMP: Big Leader Model reflection hidden for launch */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <Section num={8} label="Mi Mapa al Big Leader Model"
                open={false} done={false} onToggle={() => {}}>
                <textarea className="pe-input pe-textarea"
                  value={bigLeaderModelReflection} onChange={e => setBigLeaderModelReflection(e.target.value)} disabled />
              </Section>
            </div>

            {/* ── SECCIÓN 9 — EVIDENCIA FOTOGRÁFICA ── */}
            <Section num={9} label="Evidencia fotográfica"
              open={openSections.has(9)} done={sectionDone[9]} onToggle={() => toggleSection(9)}>
              {!isLocked && evidenceUrls.length < 10 && (
                <div
                  className={`pe-drop${imgDrag ? ' active' : ''}`}
                  onDragOver={e => { e.preventDefault(); setImgDrag(true) }}
                  onDragLeave={() => setImgDrag(false)}
                  onDrop={e => { e.preventDefault(); setImgDrag(false); addPhotos(e.dataTransfer.files) }}
                  onClick={() => imgInputRef.current?.click()}
                >
                  {uploadingImg ? (
                    <div style={{ fontSize: 14, color: '#C0392B' }}>Subiendo foto…</div>
                  ) : (
                    <>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                        <rect x="3" y="3" width="18" height="18" rx="4" stroke="#9a9690" strokeWidth="1.5"/>
                        <circle cx="8.5" cy="8.5" r="1.5" stroke="#9a9690" strokeWidth="1.3"/>
                        <path d="M3 15l5-4 4 4 3-2.5 6 5.5" stroke="#9a9690" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="pe-drop-text">Arrastra fotos aquí o haz clic para seleccionar</p>
                      <p className="pe-drop-sub">{evidenceUrls.length}/10 fotos · JPG, PNG, WEBP</p>
                    </>
                  )}
                </div>
              )}
              <input ref={imgInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => addPhotos(e.target.files)} />
              {evidenceUrls.length > 0 && (
                <div className="pe-photo-grid">
                  {evidenceUrls.map((url, i) => (
                    <div key={i} className="pe-photo-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" />
                      {!isLocked && <button className="pe-photo-rm" onClick={() => removePhoto(url)}>✕</button>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <label className="pe-label" style={{ marginBottom: 8, fontSize: 13 }}>PDF opcional</label>
                {pdfUrl ? (
                  <div className="pe-pdf-row">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="2" width="14" height="20" rx="2" stroke="#C0392B" strokeWidth="1.5"/>
                      <path d="M8 7h8M8 11h6M8 15h4" stroke="#C0392B" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pdfUrl.split('/').pop()}
                    </span>
                    {!isLocked && (
                      <button className="pe-btn-rm" onClick={removePdf}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ) : !isLocked ? (
                  <div
                    className={`pe-drop${pdfDrag ? ' active' : ''}`}
                    style={{ padding: '20px 24px' }}
                    onDragOver={e => { e.preventDefault(); setPdfDrag(true) }}
                    onDragLeave={() => setPdfDrag(false)}
                    onDrop={e => { e.preventDefault(); setPdfDrag(false); const f = e.dataTransfer.files?.[0]; if (f?.type === 'application/pdf') uploadPdf(f) }}
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    {uploadingPdf
                      ? <div style={{ fontSize: 13, color: '#C0392B' }}>Subiendo PDF…</div>
                      : <p className="pe-drop-text" style={{ marginTop: 0 }}>Arrastra un PDF aquí o haz clic</p>
                    }
                  </div>
                ) : null}
                <input ref={pdfInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadPdf(f) }} />
              </div>
            </Section>
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="pe-sidebar">
          <div className="pe-sidebar-card">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <CircleProgress pct={completion} />
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--mute)' }}>
                {doneSectionCount} de 7 secciones completadas
              </p>
            </div>

            <div className="pe-checklist">
              <div className="pe-check-item" onClick={() => document.querySelector('.pe-cover')?.scrollIntoView({ behavior: 'smooth' })}>
                <div className={`pe-check-dot${sectionDone[1] ? ' done' : ''}`}>{sectionDone[1] ? '✓' : ''}</div>
                <span>Portada</span>
              </div>
              {SIDEBAR_SECTIONS.map(s => (
                <div key={s.num} className="pe-check-item" onClick={() => jumpTo(s.num)}>
                  <div className={`pe-check-dot${sectionDone[s.num] ? ' done' : ''}`}>{sectionDone[s.num] ? '✓' : ''}</div>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              {status === 'draft'    && <span style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--line)',  color: 'var(--mute)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Borrador</span>}
              {status === 'pending'  && <span style={{ display: 'inline-block', padding: '4px 12px', background: '#FFFBEB',      color: '#92400E',     borderRadius: 999, fontSize: 12, fontWeight: 600 }}>En revisión</span>}
              {status === 'approved' && <span style={{ display: 'inline-block', padding: '4px 12px', background: '#D1FAE5',      color: '#065F46',     borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Aprobado ✓</span>}
              {status === 'rejected' && <span style={{ display: 'inline-block', padding: '4px 12px', background: '#FEE2E2',      color: '#991B1B',     borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Rechazado</span>}
            </div>

            {!isLocked && (
              <>
                {completion < 70 && (
                  <p style={{ fontSize: 11.5, color: '#9a9690', marginBottom: 8, lineHeight: 1.4 }}>
                    Completa al menos el 70% para enviar al coordinador
                  </p>
                )}
                <button className="btn-submit-proj" onClick={() => setSubmitModal(true)} disabled={completion < 70}>
                  Enviar al coordinador →
                </button>
                <button className="btn-save-draft" onClick={doSave}>Guardar borrador</button>
              </>
            )}
          </div>
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
              <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 10 }}>
                ¿Enviar al coordinador?
              </div>
              <p style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.6, marginBottom: 24 }}>
                Una vez enviado, no podrás editar el proyecto hasta recibir respuesta de tu coordinador.
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
