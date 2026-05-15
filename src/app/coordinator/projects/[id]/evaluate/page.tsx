'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────
interface ProjectData {
  id:                          string
  title:                       string
  subtitle:                    string
  category:                    string
  track:                       string
  idemr_identificar:           string | null
  idemr_diseniar:              string | null
  idemr_ejecutar:              string | null
  idemr_medir:                 string | null
  idemr_reflexionar:           string | null
  plan_continuidad:            string | null
  big_leader_model_reflection: string | null
  user_id:                     string
  submitted_at:                string | null
}

interface StudentInfo {
  full_name:    string
  school_name:  string
}

// ── Rubric definition ────────────────────────────────────────────────────────
const CRITERIA = [
  {
    id: 'identidad',
    label: 'Claridad de identidad y propósito',
    levels: {
      1: 'No es claro quién es el estudiante como líder ni qué lo motiva',
      2: 'Hay identidad y propósito, pero genéricos o sin conexión con el proyecto',
      3: 'Identidad y propósito articulados y conectados al proyecto',
      4: 'Identidad y propósito propios, originales, integrados en cada decisión',
    },
  },
  {
    id: 'calidad',
    label: 'Calidad del proyecto',
    levels: {
      1: 'Problema mal definido, plan vago, ejecución no documentada',
      2: 'Problema y plan razonables, ejecución parcial o poco documentada',
      3: 'Problema bien definido, plan ejecutado, evidencia clara de impacto',
      4: 'El proyecto sobresale por originalidad, ejecución impecable y profundidad',
    },
  },
  {
    id: 'liderazgo',
    label: 'Liderazgo en equipo',
    levels: {
      1: 'Trabajó solo o no logró movilizar a nadie',
      2: 'Involucró a otros pero sin rol claro de liderazgo',
      3: 'Lideró un equipo, comunicó la visión, manejó al menos un conflicto',
      4: 'Construyó cultura, formó a otros líderes, demostró liderazgo bajo presión',
    },
  },
  {
    id: 'evidencia',
    label: 'Evidencia de impacto',
    levels: {
      1: 'Sin evidencia o solo afirmaciones cualitativas vagas',
      2: 'Alguna evidencia (fotos, testimonios) pero sin datos',
      3: 'Evidencia visual y datos concretos del impacto generado',
      4: 'Datos rigurosos, antes/después, testimonios múltiples, impacto verificable',
    },
  },
  {
    id: 'reflexion',
    label: 'Reflexión y aprendizaje',
    levels: {
      1: 'Reflexión superficial o ausente',
      2: 'Reflexión presente pero genérica',
      3: 'Reflexión específica, identifica fallos propios y aprendizajes concretos',
      4: 'Reflexión profunda, autocrítica honesta, aprendizajes que cambian la forma de actuar',
    },
  },
  {
    id: 'continuidad',
    label: 'Plan de continuidad',
    levels: {
      1: 'Sin plan, el proyecto se acaba con la entrega',
      2: 'Plan vago, "a ver si alguien sigue"',
      3: 'Plan claro: persona identificada, herramientas documentadas, indicadores',
      4: 'Plan robusto con sistema de medición a un año, mentoría activa, evidencia de transición',
    },
  },
  {
    id: 'big_leader',
    label: 'Aplicación del Big Leader Model',
    levels: {
      1: 'El modelo no aparece o se cita superficialmente',
      2: 'Aparecen 1-2 pilares aplicados',
      3: 'Los 5 pilares aparecen aplicados al proyecto, identificados explícitamente',
      4: 'Los 5 pilares integrados de forma orgánica, el estudiante los explica con voz propia',
    },
  },
] as const

type CriterionId = typeof CRITERIA[number]['id']

// ── Resultado calculation ────────────────────────────────────────────────────
function calcResultado(scores: Record<CriterionId, number>): string | null {
  const vals = Object.values(scores)
  if (vals.some(v => v === 0)) return null // not all filled
  if (vals.some(v => v === 1)) return 'no_certificado'
  if (vals.some(v => v === 2)) return 'retroalimentacion'
  if (vals.every(v => v >= 3) && vals.some(v => v === 4)) return 'mencion_honor'
  return 'certificado'
}

const RESULTADO_META: Record<string, { label: string; emoji: string; bg: string; color: string }> = {
  mencion_honor:      { label: 'Mención de Honor',                           emoji: '🏆', bg: '#FEF9C3', color: '#713F12' },
  certificado:        { label: 'Certificación otorgada',                     emoji: '✓',  bg: '#D1FAE5', color: '#065F46' },
  retroalimentacion:  { label: 'Retroalimentación — puede reentregar en 30 días', emoji: '↩',  bg: '#FEF3C7', color: '#92400E' },
  no_certificado:     { label: 'No certificado — invitar a repetir el ciclo',emoji: '✗',  bg: '#FEE2E2', color: '#991B1B' },
}

const IDEMR_FIELDS: { key: keyof ProjectData; label: string; pilar: string }[] = [
  { key: 'idemr_identificar',           label: 'Identificar',                 pilar: 'Pilar II — Propósito y Visión' },
  { key: 'idemr_diseniar',              label: 'Diseñar',                     pilar: 'Pilares II, III, V' },
  { key: 'idemr_ejecutar',              label: 'Ejecutar',                    pilar: 'Pilares III, IV' },
  { key: 'idemr_medir',                 label: 'Medir',                       pilar: 'Pilar IV' },
  { key: 'idemr_reflexionar',           label: 'Reflexionar',                 pilar: 'Pilares I, VI' },
  { key: 'plan_continuidad',            label: 'Plan de Continuidad',         pilar: 'Pilar V' },
  { key: 'big_leader_model_reflection', label: 'Mi Mapa al Big Leader Model', pilar: 'Los 5 pilares' },
]

function Sk({ w = '100%', h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function EvaluatePage() {
  const params    = useParams()
  const projectId = params.id as string
  const router    = useRouter()
  const supabase  = createClient()

  const [loading,   setLoading]   = useState(true)
  const [project,   setProject]   = useState<ProjectData | null>(null)
  const [student,   setStudent]   = useState<StudentInfo | null>(null)
  const [images,    setImages]    = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)

  const emptyScores = () => Object.fromEntries(CRITERIA.map(c => [c.id, 0])) as Record<CriterionId, number>
  const [scores,   setScores]   = useState<Record<CriterionId, number>>(emptyScores())
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (!profile || profile.role !== 'coordinator') { router.replace('/dashboard'); return }

      const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle()
      if (cancelled) return
      if (!proj) { router.replace('/coordinator/projects'); return }

      const [{ data: studentProfile }, { data: schoolRow }, { data: imgs }] = await Promise.all([
        supabase.from('profiles').select('full_name, school_id').eq('id', proj.user_id).maybeSingle(),
        proj.school_id ? supabase.from('schools').select('name').eq('id', proj.school_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('project_images').select('url').eq('project_id', projectId),
      ])

      if (cancelled) return

      setProject(proj as ProjectData)
      setStudent({ full_name: studentProfile?.full_name ?? '—', school_name: (schoolRow as any)?.name ?? '—' })
      setImages(imgs?.map(i => i.url) ?? [])
      setLoading(false)
    }
    boot()
    return () => { cancelled = true }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const resultado = calcResultado(scores)
  const allFilled = Object.values(scores).every(v => v > 0)
  const canSubmit = allFilled && feedback.trim().length > 0

  async function handleSubmit() {
    if (!canSubmit || !resultado) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const projectStatus = resultado === 'retroalimentacion' || resultado === 'no_certificado' ? 'rejected' : 'approved'

    await supabase.from('capstone_evaluations').insert({
      project_id:      projectId,
      coordinator_id:  user.id,
      scores,
      resultado,
      feedback:        feedback.trim(),
      evaluated_at:    new Date().toISOString(),
    })

    await supabase.from('projects').update({
      status:           projectStatus,
      approved_at:      projectStatus === 'approved' ? new Date().toISOString() : null,
      approved_by:      projectStatus === 'approved' ? user.id : null,
      rejection_reason: projectStatus === 'rejected' ? `${RESULTADO_META[resultado].label}: ${feedback.trim()}` : null,
    }).eq('id', projectId)

    setSubmitting(false)
    setSubmitted(true)
    setTimeout(() => router.replace('/coordinator/projects'), 2000)
  }

  const setScore = (id: CriterionId, val: number) => setScores(prev => ({ ...prev, [id]: val }))

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;color:#0D0D0D;}
        .ev-nav{position:sticky;top:0;z-index:30;background:rgba(245,243,239,.9);backdrop-filter:blur(16px);border-bottom:1px solid rgba(13,13,13,.08);height:58px;display:flex;align-items:center;padding:0 32px;gap:16px;}
        .ev-nav-back{display:flex;align-items:center;gap:6px;font-size:13px;color:#6B6B6B;background:none;border:none;cursor:pointer;transition:color .15s;padding:0;}
        .ev-nav-back:hover{color:#0D0D0D;}
        .ev-nav-title{flex:1;text-align:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:#0D0D0D;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ev-layout{display:grid;grid-template-columns:1fr 420px;gap:24px;max-width:1320px;margin:0 auto;padding:32px 32px 80px;align-items:start;}
        .ev-left{min-width:0;}
        .ev-right{position:sticky;top:74px;max-height:calc(100vh - 100px);overflow-y:auto;}
        .ev-card{background:#fff;border:1px solid rgba(13,13,13,.07);border-radius:20px;padding:28px;box-shadow:0 2px 12px -4px rgba(13,13,13,.07);margin-bottom:16px;}
        .ev-student-row{display:flex;flex-direction:column;gap:4px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid rgba(13,13,13,.07);}
        .ev-student-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:#0D0D0D;}
        .ev-student-meta{display:flex;gap:12px;font-size:12.5px;color:#6B6B6B;flex-wrap:wrap;}
        .ev-project-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:26px;letter-spacing:-.02em;color:#0D0D0D;margin-bottom:6px;}
        .ev-section{margin-bottom:24px;}
        .ev-section-eyebrow{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#C0392B;margin-bottom:4px;}
        .ev-section-pilar{font-size:11px;color:#9a9690;margin-bottom:8px;}
        .ev-section-body{font-size:14.5px;color:#2D2D2D;line-height:1.75;white-space:pre-wrap;}
        .ev-section-empty{font-size:13px;color:#bbb;font-style:italic;}
        .ev-photos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;}
        .ev-photo{aspect-ratio:4/3;border-radius:10px;overflow:hidden;background:rgba(13,13,13,.05);}
        .ev-photo img{width:100%;height:100%;object-fit:cover;}
        .rub-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:18px;color:#0D0D0D;margin-bottom:4px;}
        .rub-subtitle{font-size:12.5px;color:#9a9690;margin-bottom:20px;}
        .rub-criterion{margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid rgba(13,13,13,.06);}
        .rub-criterion:last-of-type{border-bottom:none;}
        .rub-crit-label{font-family:"Satoshi",sans-serif;font-weight:700;font-size:13.5px;color:#0D0D0D;margin-bottom:10px;}
        .rub-scores{display:flex;flex-direction:column;gap:6px;}
        .rub-score-row{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .13s;border:1.5px solid transparent;}
        .rub-score-row:hover{background:rgba(13,13,13,.03);}
        .rub-score-row.selected{background:rgba(192,57,43,.05);border-color:rgba(192,57,43,.2);}
        .rub-score-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:11px;flex-shrink:0;margin-top:1px;border:1.5px solid rgba(13,13,13,.15);color:#6B6B6B;}
        .rub-score-row.selected .rub-score-num{background:#C0392B;border-color:#C0392B;color:#fff;}
        .rub-score-text{font-size:12.5px;color:#6B6B6B;line-height:1.45;}
        .rub-score-row.selected .rub-score-text{color:#0D0D0D;}
        .resultado-box{border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px;margin-bottom:20px;}
        .rub-feedback-label{font-family:"Satoshi",sans-serif;font-weight:600;font-size:13px;color:#0D0D0D;margin-bottom:8px;}
        .rub-feedback{width:100%;padding:12px 14px;border:1px solid rgba(13,13,13,.14);border-radius:10px;font-size:13.5px;font-family:inherit;outline:none;resize:vertical;min-height:100px;color:#0D0D0D;transition:border-color .18s;}
        .rub-feedback:focus{border-color:#C0392B;}
        .btn-submit{width:100%;padding:13px;border-radius:999px;background:#C0392B;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:background .2s,opacity .2s;margin-top:16px;}
        .btn-submit:hover:not(:disabled){background:#a93226;}
        .btn-submit:disabled{opacity:.4;cursor:not-allowed;}
        .ev-submitted{text-align:center;padding:32px 0;font-family:"Satoshi",sans-serif;}
        @media(max-width:1100px){.ev-layout{grid-template-columns:1fr;}.ev-right{position:static;max-height:none;}}
        @media(max-width:600px){.ev-photos{grid-template-columns:repeat(2,1fr);}.ev-layout{padding:20px 16px 80px;}}
      `}</style>

      {/* Nav */}
      <nav className="ev-nav">
        <button className="ev-nav-back" onClick={() => router.push('/coordinator/projects')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 12L4 7l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Proyectos
        </button>
        <div className="ev-nav-title">
          {loading ? 'Cargando evaluación…' : `Evaluar: ${project?.title ?? ''}`}
        </div>
      </nav>

      <div className="ev-layout">
        {/* ── LEFT: Project viewer ── */}
        <div className="ev-left">
          <div className="ev-card">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Sk w="60%" h={28} />
                <Sk w="80%" h={18} />
                <Sk h={14} />
                <Sk w="40%" h={14} />
              </div>
            ) : project && student ? (
              <>
                <div className="ev-student-row">
                  <div className="ev-student-name">{student.full_name}</div>
                  <div className="ev-student-meta">
                    <span>{student.school_name}</span>
                    <span>·</span>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: project.track === 'senior' ? 'rgba(192,57,43,.1)' : '#FEF3C7', color: project.track === 'senior' ? '#C0392B' : '#92400E' }}>
                      {project.track === 'senior' ? 'Senior' : 'Junior'} Leader
                    </span>
                    {project.submitted_at && (
                      <span>Enviado el {new Date(project.submitted_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>

                <h1 className="ev-project-title">{project.title}</h1>
                {project.subtitle && (
                  <p style={{ fontSize: 15, color: '#6B6B6B', marginBottom: 24, lineHeight: 1.6 }}>{project.subtitle}</p>
                )}

                {/* IDEMR sections */}
                {IDEMR_FIELDS.map(field => (
                  <div key={field.key} className="ev-section">
                    <div className="ev-section-eyebrow">{field.label}</div>
                    {field.pilar && <div className="ev-section-pilar">{field.pilar}</div>}
                    {project[field.key]
                      ? <p className="ev-section-body">{project[field.key] as string}</p>
                      : <p className="ev-section-empty">Sin contenido</p>
                    }
                  </div>
                ))}

                {/* Photo gallery */}
                {images.length > 0 && (
                  <div className="ev-section">
                    <div className="ev-section-eyebrow">Evidencia fotográfica</div>
                    <div className="ev-photos">
                      {images.map((url, i) => (
                        <div key={i} className="ev-photo">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* ── RIGHT: Rubric evaluation form ── */}
        <div className="ev-right">
          <div className="ev-card">
            {submitted ? (
              <div className="ev-submitted">
                <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Evaluación enviada</div>
                <div style={{ fontSize: 13, color: '#9a9690' }}>Redirigiendo a proyectos…</div>
              </div>
            ) : (
              <>
                <div className="rub-title">Rúbrica de Certificación</div>
                <div className="rub-subtitle">Big Leader Model · 7 criterios · Escala 1–4</div>

                {/* Live resultado */}
                {resultado && (
                  <div className="resultado-box" style={{ background: RESULTADO_META[resultado].bg }}>
                    <span style={{ fontSize: 20 }}>{RESULTADO_META[resultado].emoji}</span>
                    <div>
                      <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13.5, color: RESULTADO_META[resultado].color }}>
                        {RESULTADO_META[resultado].label}
                      </div>
                      <div style={{ fontSize: 11.5, color: RESULTADO_META[resultado].color, opacity: .75, marginTop: 1 }}>
                        Resultado provisional — se confirma al enviar
                      </div>
                    </div>
                  </div>
                )}

                {!allFilled && !resultado && (
                  <div style={{ fontSize: 12.5, color: '#9a9690', marginBottom: 16, padding: '10px 12px', background: 'rgba(13,13,13,.04)', borderRadius: 8 }}>
                    Califica los {CRITERIA.length} criterios para ver el resultado
                  </div>
                )}

                {/* Criteria */}
                {CRITERIA.map(criterion => (
                  <div key={criterion.id} className="rub-criterion">
                    <div className="rub-crit-label">{criterion.label}</div>
                    <div className="rub-scores">
                      {([4, 3, 2, 1] as const).map(score => (
                        <div
                          key={score}
                          className={`rub-score-row${scores[criterion.id] === score ? ' selected' : ''}`}
                          onClick={() => setScore(criterion.id, score)}
                        >
                          <div className="rub-score-num">{score}</div>
                          <div className="rub-score-text">{criterion.levels[score]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Feedback */}
                <div style={{ marginTop: 4 }}>
                  <div className="rub-feedback-label">Retroalimentación para el estudiante *</div>
                  <textarea
                    className="rub-feedback"
                    placeholder="Escribe una retroalimentación específica y constructiva para el estudiante…"
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                  />
                </div>

                {/* Score summary */}
                {allFilled && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                    {CRITERIA.map(c => (
                      <div key={c.id} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: scores[c.id] >= 3 ? '#D1FAE5' : scores[c.id] === 2 ? '#FEF3C7' : '#FEE2E2', color: scores[c.id] >= 3 ? '#065F46' : scores[c.id] === 2 ? '#92400E' : '#991B1B' }}>
                        {scores[c.id]}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="btn-submit"
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Enviando evaluación…' : 'Enviar evaluación →'}
                </button>

                {!canSubmit && (
                  <p style={{ fontSize: 11.5, color: '#9a9690', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
                    {!allFilled ? 'Califica todos los criterios.' : 'Escribe la retroalimentación.'}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
