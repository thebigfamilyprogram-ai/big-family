'use client'

import React, { memo, useState } from 'react'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'

// ── Data ──────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    title: 'Completas el diagnóstico',
    desc: '20 preguntas para Junior, 44 para Senior',
  },
  {
    num: '02',
    title: 'Descubres tu arquetipo de líder',
    desc: 'Uno de 5 perfiles basados en ciencia',
  },
  {
    num: '03',
    title: 'Tu ruta se adapta',
    desc: 'Módulos, reflexiones y entregables personalizados para ti',
  },
] as const

const ARQUETIPOS = [
  {
    id: 'visionario',
    name: 'Líder Visionario/a',
    tagline: 'Piensas en grande y ejecutas con energía',
    fortalezas: ['Norte', 'Acción'],
    crec: ['Yo', 'Vínculo'],
    scores: { Yo: 42, Norte: 85, Acción: 78, Legado: 65, Vínculo: 38 },
    desc: 'Tienes una capacidad natural para ver lo que otros no ven. Tu energía e ideas mueven grupos enteros. El reto está en construir las estructuras que sostengan tu visión a largo plazo.',
    ejemplo: 'Tu módulo de Vínculo incluye reflexiones sobre cómo construir confianza sin perder tu visión de largo plazo.',
  },
  {
    id: 'constructor',
    name: 'Líder Constructor/a',
    tagline: 'Construyes relaciones sólidas con disciplina',
    fortalezas: ['Yo', 'Vínculo'],
    crec: ['Acción', 'Legado'],
    scores: { Yo: 82, Norte: 45, Acción: 48, Legado: 70, Vínculo: 85 },
    desc: 'Tu combinación de responsabilidad y empatía genera confianza en todos los que te rodean. Tu reto es dar el primer paso cuando no todo está completamente listo.',
    ejemplo: 'Tu módulo de Acción incluye ejercicios para tomar decisiones más rápido sin perder la calidad de tus relaciones.',
  },
  {
    id: 'resiliente',
    name: 'Líder Resiliente',
    tagline: 'Te conoces a ti mismo y sostienes bajo presión',
    fortalezas: ['Yo', 'Legado'],
    crec: ['Norte', 'Vínculo'],
    scores: { Yo: 80, Norte: 40, Acción: 45, Legado: 88, Vínculo: 55 },
    desc: 'Tu autoconocimiento y estabilidad emocional te permiten funcionar cuando otros se paralizan. El reto es conectar esa fortaleza interna con una visión más ambiciosa.',
    ejemplo: 'Tu módulo de Norte incluye ejercicios para conectar tu disciplina interna con una visión más ambiciosa.',
  },
  {
    id: 'conector',
    name: 'Líder Conector/a',
    tagline: 'Movilizas personas con energía y empatía',
    fortalezas: ['Vínculo', 'Acción'],
    crec: ['Yo', 'Legado'],
    scores: { Yo: 45, Norte: 60, Acción: 82, Legado: 50, Vínculo: 88 },
    desc: 'Generas movimiento donde apareces. Tu habilidad para conectar y activar grupos es genuina. El reto está en construir un impacto que dure más allá de tu energía personal.',
    ejemplo: 'Tu módulo de Legado incluye reflexiones sobre cómo hacer que tu impacto persista más allá de tu energía personal.',
  },
  {
    id: 'estratega',
    name: 'Líder Estratega',
    tagline: 'Combinas visión de largo plazo con estabilidad',
    fortalezas: ['Norte', 'Legado'],
    crec: ['Vínculo', 'Acción'],
    scores: { Yo: 65, Norte: 82, Acción: 40, Legado: 85, Vínculo: 48 },
    desc: 'Tu pensamiento de largo plazo y estabilidad emocional te permiten ver lo que otros ignoran. El reto es bajar las ideas al terreno y ejecutarlas con las personas.',
    ejemplo: 'Tu módulo de Acción incluye ejercicios para ejecutar tus estrategias sin quedarte en la planificación.',
  },
] as const

type Arquetipo = (typeof ARQUETIPOS)[number]

// ── Pentagon SVG ──────────────────────────────────────────────────────────────
const VERTS = [
  { key: 'Yo',      angle: -90  },
  { key: 'Norte',   angle: -18  },
  { key: 'Acción',  angle:  54  },
  { key: 'Legado',  angle:  126 },
  { key: 'Vínculo', angle:  198 },
]

function ArchPentagon({
  scores,
  fortalezas,
  crec,
}: {
  scores: Record<string, number>
  fortalezas: readonly string[]
  crec: readonly string[]
}) {
  const CX = 80, CY = 80, R = 52
  const rad = (d: number) => (d * Math.PI) / 180
  const pt  = (angle: number, r: number) =>
    [CX + r * Math.cos(rad(angle)), CY + r * Math.sin(rad(angle))] as const

  const refPts  = VERTS.map(v => pt(v.angle, R).join(',')).join(' ')
  const profPts = VERTS.map(v => {
    const [x, y] = pt(v.angle, ((scores[v.key] ?? 50) / 100) * R)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 160 160" width={120} height={120} aria-hidden="true">
      {/* Grid lines center→vertex */}
      {VERTS.map(v => {
        const [x2, y2] = pt(v.angle, R)
        return <line key={v.key} x1={CX} y1={CY} x2={x2} y2={y2} stroke="var(--line)" strokeWidth={0.8} />
      })}
      {/* Reference polygon */}
      <polygon points={refPts} fill="none" stroke="var(--bg-2)" strokeWidth={1.5} />
      {/* Profile polygon */}
      <polygon points={profPts} fill="rgba(192,57,43,0.12)" stroke="#C0392B" strokeWidth={1.5} />
      {/* Vertex dots */}
      {VERTS.map(v => {
        const [cx, cy] = pt(v.angle, ((scores[v.key] ?? 50) / 100) * R)
        return (
          <circle
            key={v.key} cx={cx} cy={cy} r={3.5}
            fill={
              fortalezas.includes(v.key) ? 'var(--accent-teal,#0F7B6C)' :
              crec.includes(v.key)       ? '#C0392B' :
                                           'var(--bg-2)'
            }
          />
        )
      })}
    </svg>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
function AprendizajeSection() {
  const pref     = useReducedMotion()
  const [sel, setSel] = useState<string | null>(null)
  const toggle   = (id: string) => setSel(p => (p === id ? null : id))

  return (
    <section id="aprendizaje" className="sp-wrap">
      <style>{`
        /* ── Wrap ─────────────────────────────────────────────────────────── */
        .sp-wrap{background:var(--bg);padding:128px 40px;border-top:1px solid var(--line);}
        .sp-inner{max-width:1200px;margin:0 auto;}

        /* ── Part 1 header ────────────────────────────────────────────────── */
        .sp-eyebrow{display:inline-flex;align-items:center;border:1px solid rgba(192,57,43,.3);background:rgba(192,57,43,.06);color:#C0392B;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;border-radius:999px;padding:5px 14px;margin-bottom:28px;}
        .sp-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(2.2rem,5vw,3.5rem);color:var(--ink);letter-spacing:-0.03em;line-height:1.12;text-wrap:balance;margin-bottom:20px;}
        .sp-sub{font-family:"Satoshi",sans-serif;font-size:18px;color:var(--mute);line-height:1.75;max-width:56ch;}

        /* ── Steps ────────────────────────────────────────────────────────── */
        .sp-steps{display:flex;border-top:1px solid var(--line);margin-top:52px;}
        .sp-step{flex:1;display:flex;align-items:flex-start;gap:14px;padding:28px 28px 0 0;border-right:1px solid var(--line);}
        .sp-step:last-child{border-right:none;padding-right:0;}
        .sp-step:not(:first-child){padding-left:28px;}
        .sp-step__num{width:28px;height:28px;border-radius:50%;background:#C0392B;color:#fff;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;letter-spacing:.02em;}
        .sp-step__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);line-height:1.3;margin-bottom:4px;}
        .sp-step__desc{font-family:"Satoshi",sans-serif;font-size:13px;color:var(--mute);line-height:1.5;}

        /* ── Archetypes label ─────────────────────────────────────────────── */
        .sp-arch-label{font-family:"Instrument Serif",serif;font-style:italic;font-size:24px;color:var(--ink-2,#2D2D2D);text-align:center;margin-top:80px;margin-bottom:40px;}

        /* ── Grid 3+2 centered ────────────────────────────────────────────── */
        .sp-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:20px;}
        .sp-card{grid-column:span 2;background:var(--card-bg);border:1px solid var(--card-border);border-radius:20px;padding:28px;cursor:pointer;transition:border-color .2s cubic-bezier(0.22,1,0.36,1);}
        .sp-card:nth-child(4){grid-column:2 / span 2;}
        .sp-card:nth-child(5){grid-column:4 / span 2;}
        .sp-card--active{border-color:rgba(192,57,43,.35)!important;}
        .sp-card--dimmed{opacity:.5;transform:scale(.98);transition:opacity .3s cubic-bezier(0.22,1,0.36,1),transform .3s cubic-bezier(0.22,1,0.36,1);}

        /* ── Card internals ───────────────────────────────────────────────── */
        .sp-card__pent{display:flex;justify-content:center;margin-bottom:18px;}
        .sp-card__name{font-family:"Instrument Serif",serif;font-style:italic;font-size:22px;color:var(--ink);line-height:1.2;margin-bottom:6px;}
        .sp-card__tagline{font-family:"Satoshi",sans-serif;font-size:14px;color:var(--mute);line-height:1.5;margin-bottom:14px;}
        .sp-card__pills{display:flex;gap:6px;flex-wrap:wrap;}
        .sp-card__pill-str{padding:3px 10px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;background:rgba(15,123,108,.1);color:var(--accent-teal,#0F7B6C);border:1px solid rgba(15,123,108,.2);}

        /* ── Expanded content ─────────────────────────────────────────────── */
        .sp-exp{padding-top:20px;margin-top:18px;border-top:1px solid var(--line);}
        .sp-exp__row{margin-bottom:14px;}
        .sp-exp__lbl{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);margin-bottom:7px;}
        .sp-exp__pills{display:flex;gap:6px;flex-wrap:wrap;}
        .sp-exp__str{padding:3px 10px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;background:rgba(15,123,108,.1);color:var(--accent-teal,#0F7B6C);border:1px solid rgba(15,123,108,.2);}
        .sp-exp__crec{padding:3px 10px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;background:rgba(192,57,43,.08);color:#C0392B;border:1px solid rgba(192,57,43,.2);}
        .sp-exp__desc{font-family:"Satoshi",sans-serif;font-size:14px;color:var(--ink-2,#2D2D2D);line-height:1.65;margin-bottom:12px;}
        .sp-exp__ej{font-family:"Satoshi",sans-serif;font-size:13px;color:var(--mute);line-height:1.6;padding:12px 14px;background:var(--bg-2);border-radius:10px;margin-bottom:16px;}
        .sp-exp__cta{font-family:"Satoshi",sans-serif;font-size:13px;font-weight:700;color:#C0392B;text-decoration:none;display:inline-flex;align-items:center;gap:4px;letter-spacing:.01em;}
        .sp-exp__cta:hover{text-decoration:underline;}

        /* ── Responsive ───────────────────────────────────────────────────── */
        @media(max-width:960px){
          .sp-wrap{padding:80px 24px;}
          .sp-steps{flex-direction:column;}
          .sp-step{border-right:none;border-bottom:1px solid var(--line);padding:20px 0;}
          .sp-step:last-child{border-bottom:none;}
          .sp-step:not(:first-child){padding-left:0;}
          .sp-grid{grid-template-columns:1fr;gap:14px;}
          .sp-card{grid-column:auto!important;}
        }
        @media(max-width:640px){
          .sp-sub{font-size:16px;}
        }
      `}</style>

      <div className="sp-inner">

        {/* ── PART 1 — Header ── */}
        <m.div
          initial={pref ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <span className="sp-eyebrow">APRENDIZAJE PERSONALIZADO</span>
          <h2 className="sp-title">Tu ruta, diseñada para ti.</h2>
          <p className="sp-sub">
            Antes de empezar, descubres tu perfil de líder con un diagnóstico
            basado en el Big Five — el modelo de personalidad más respaldado por
            la ciencia. Tu ruta se adapta desde el primer día.
          </p>
        </m.div>

        {/* ── Steps ── */}
        <div className="sp-steps">
          {STEPS.map((step, i) => (
            <m.div
              key={step.num}
              className="sp-step"
              initial={pref ? false : { opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: i * 0.1 }}
            >
              <div className="sp-step__num">{step.num}</div>
              <div>
                <div className="sp-step__title">{step.title}</div>
                <div className="sp-step__desc">{step.desc}</div>
              </div>
            </m.div>
          ))}
        </div>

        {/* ── PART 2 — Archetype cards ── */}
        <p className="sp-arch-label">¿Cuál tipo de líder eres tú?</p>

        <m.div
          className="sp-grid"
          initial={pref ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {ARQUETIPOS.map((a: Arquetipo) => {
            const isActive = sel === a.id
            const isDimmed = !!sel && sel !== a.id

            return (
              <m.div
                key={a.id}
                layout
                className={`sp-card${isActive ? ' sp-card--active' : ''}${isDimmed ? ' sp-card--dimmed' : ''}`}
                variants={pref ? undefined : {
                  hidden:  { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 160, damping: 22 } },
                }}
                whileHover={isDimmed ? {} : { y: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                onClick={() => toggle(a.id)}
              >
                {/* Pentagon */}
                <div className="sp-card__pent">
                  <ArchPentagon
                    scores={a.scores as Record<string, number>}
                    fortalezas={a.fortalezas}
                    crec={a.crec}
                  />
                </div>

                {/* Name + tagline */}
                <div className="sp-card__name">{a.name}</div>
                <div className="sp-card__tagline">{a.tagline}</div>

                {/* Default strength pills */}
                <div className="sp-card__pills">
                  {a.fortalezas.map(f => (
                    <span key={f} className="sp-card__pill-str">{f}</span>
                  ))}
                </div>

                {/* Expanded content — Spring height animation */}
                <AnimatePresence initial={false}>
                  {isActive && (
                    <m.div
                      key="exp"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="sp-exp">
                        {/* Fortalezas */}
                        <div className="sp-exp__row">
                          <div className="sp-exp__lbl">FORTALEZAS</div>
                          <div className="sp-exp__pills">
                            {a.fortalezas.map(f => (
                              <span key={f} className="sp-exp__str">{f}</span>
                            ))}
                          </div>
                        </div>

                        {/* A desarrollar */}
                        <div className="sp-exp__row">
                          <div className="sp-exp__lbl">A DESARROLLAR</div>
                          <div className="sp-exp__pills">
                            {a.crec.map(c => (
                              <span key={c} className="sp-exp__crec">{c}</span>
                            ))}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="sp-exp__desc">{a.desc}</p>

                        {/* Adaptation example */}
                        <p className="sp-exp__ej">
                          <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>Ejemplo: </strong>
                          {a.ejemplo}
                        </p>

                        {/* CTA — no button, solo texto */}
                        <a href="/register" className="sp-exp__cta">
                          Descubre si eres este líder →
                        </a>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </m.div>
            )
          })}
        </m.div>

      </div>
    </section>
  )
}

export default memo(AprendizajeSection)
