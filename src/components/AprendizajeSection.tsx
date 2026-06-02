'use client'

import React, { memo, useState } from 'react'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'

// ── Data ──────────────────────────────────────────────────────────────────────
const STEPS = [
  { num: '01', title: 'Completas el diagnóstico',         desc: '20 preguntas para Junior, 44 para Senior'                    },
  { num: '02', title: 'Descubres tu arquetipo de líder',  desc: 'Uno de 5 perfiles basados en ciencia'                        },
  { num: '03', title: 'Tu ruta se adapta',                desc: 'Módulos, reflexiones y entregables personalizados para ti'   },
] as const

const ARQUETIPOS = [
  {
    id:         'visionario',
    name:       'Líder Visionario/a',
    tagline:    'Piensas en grande y ejecutas con energía',
    fortalezas: ['Norte', 'Acción'],
    crec:       ['Yo', 'Vínculo'],
    scores:     { Yo: 42, Norte: 85, Acción: 78, Legado: 65, Vínculo: 38 },
    desc:       'Piensas en grande y ejecutas con energía. Tu capacidad de ver hacia dónde ir y mover a otros en esa dirección es tu mayor activo. Tu reto es conocerte a ti mismo antes de liderar a otros — el Pilar I del Big Leader Model.',
    modules:    ['Módulo 02 · Propósito y Visión', 'Módulo 04 · Comunicación y Oratoria'],
    ejemplo:    'Tu módulo de Vínculo incluye reflexiones sobre cómo construir confianza sin perder tu visión de largo plazo.',
  },
  {
    id:         'constructor',
    name:       'Líder Constructor/a',
    tagline:    'Construyes relaciones sólidas con disciplina',
    fortalezas: ['Yo', 'Vínculo'],
    crec:       ['Acción', 'Legado'],
    scores:     { Yo: 82, Norte: 45, Acción: 48, Legado: 70, Vínculo: 85 },
    desc:       'Construyes relaciones sólidas con disciplina y empatía. Tu combinación de autoconocimiento y habilidad para conectar con otros genera confianza natural. Tu reto es ejecutar más rápido bajo incertidumbre — el Pilar IV del Big Leader Model.',
    modules:    ['Módulo 01 · Inteligencia Emocional', 'Módulo 03 · Relaciones y Conflictos'],
    ejemplo:    'Tu módulo de Acción incluye ejercicios para tomar decisiones más rápido sin perder la calidad de tus relaciones.',
  },
  {
    id:         'resiliente',
    name:       'Líder Resiliente',
    tagline:    'Te conoces a ti mismo y sostienes bajo presión',
    fortalezas: ['Yo', 'Legado'],
    crec:       ['Norte', 'Vínculo'],
    scores:     { Yo: 80, Norte: 40, Acción: 45, Legado: 88, Vínculo: 55 },
    desc:       'Te conoces a ti mismo y sostienes bajo presión. Tu capacidad de mantener el rumbo cuando todo se complica y de pensar en el impacto a largo plazo te hace invaluable. Tu reto es definir una visión más ambiciosa — el Pilar II del Big Leader Model.',
    modules:    ['Módulo 01 · Inteligencia Emocional', 'Módulo 07 · Legado y Escalabilidad'],
    ejemplo:    'Tu módulo de Norte incluye ejercicios para conectar tu disciplina interna con una visión más ambiciosa.',
  },
  {
    id:         'conector',
    name:       'Líder Conector/a',
    tagline:    'Movilizas personas con energía y empatía',
    fortalezas: ['Vínculo', 'Acción'],
    crec:       ['Yo', 'Legado'],
    scores:     { Yo: 45, Norte: 60, Acción: 82, Legado: 50, Vínculo: 88 },
    desc:       'Movilizas personas con energía y empatía. Tu capacidad de crear equipos y ejecutar en comunidad genera impacto visible. Tu reto es hacer que ese impacto perdure más allá de tu presencia — el Pilar V del Big Leader Model.',
    modules:    ['Módulos 03–04 · Vínculo', 'Módulo 06 · Adaptabilidad'],
    ejemplo:    'Tu módulo de Legado incluye reflexiones sobre cómo hacer que tu impacto persista más allá de tu energía personal.',
  },
  {
    id:         'estratega',
    name:       'Líder Estratega',
    tagline:    'Combinas visión de largo plazo con estabilidad',
    fortalezas: ['Norte', 'Legado'],
    crec:       ['Vínculo', 'Acción'],
    scores:     { Yo: 65, Norte: 82, Acción: 40, Legado: 85, Vínculo: 48 },
    desc:       'Combinas visión de largo plazo con estabilidad. Tu capacidad de pensar sistémicamente y de construir cosas que duran es tu mayor fortaleza. Tu reto es conectar con las personas que van a ejecutar tu visión — el Pilar III del Big Leader Model.',
    modules:    ['Módulo 02 · Propósito y Visión', 'Módulo 07 · Legado'],
    ejemplo:    'Tu módulo de Acción incluye ejercicios para ejecutar tus estrategias sin quedarte en la planificación.',
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
  scores, fortalezas, crec, size = 120,
}: {
  scores: Record<string, number>
  fortalezas: readonly string[]
  crec: readonly string[]
  size?: number
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
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
      {VERTS.map(v => {
        const [x2, y2] = pt(v.angle, R)
        return <line key={v.key} x1={CX} y1={CY} x2={x2} y2={y2} stroke="var(--line)" strokeWidth={0.8} />
      })}
      <polygon points={refPts} fill="none" stroke="var(--bg-2)" strokeWidth={1.5} />
      <polygon points={profPts} fill="rgba(192,57,43,0.12)" stroke="#C0392B" strokeWidth={1.5} />
      {VERTS.map(v => {
        const [cx, cy] = pt(v.angle, ((scores[v.key] ?? 50) / 100) * R)
        return (
          <circle key={v.key} cx={cx} cy={cy} r={3.5}
            fill={
              fortalezas.includes(v.key) ? 'var(--accent-teal,#0F7B6C)' :
              crec.includes(v.key)       ? '#C0392B' : 'var(--bg-2)'
            }
          />
        )
      })}
    </svg>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
function AprendizajeSection() {
  const pref = useReducedMotion()
  const [sel, setSel] = useState<string | null>(null)
  const toggle = (id: string) => setSel(p => (p === id ? null : id))
  const selected = ARQUETIPOS.find(a => a.id === sel) ?? null

  return (
    <section id="aprendizaje" className="sp-wrap">
      <style>{`
        .sp-wrap{background:var(--bg);padding:128px 40px;border-top:1px solid var(--line);}
        .sp-inner{max-width:1200px;margin:0 auto;}

        /* ── Header ── */
        .sp-eyebrow{display:inline-flex;align-items:center;border:1px solid rgba(192,57,43,.3);background:rgba(192,57,43,.06);color:#C0392B;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;border-radius:999px;padding:5px 14px;margin-bottom:28px;}
        .sp-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(2.2rem,5vw,3.5rem);color:var(--ink);letter-spacing:-0.03em;line-height:1.12;text-wrap:balance;margin-bottom:20px;}
        .sp-sub{font-family:"Satoshi",sans-serif;font-size:18px;color:var(--mute);line-height:1.75;max-width:56ch;}

        /* ── Steps ── */
        .sp-steps{display:flex;border-top:1px solid var(--line);margin-top:52px;}
        .sp-step{flex:1;display:flex;align-items:flex-start;gap:14px;padding:28px 28px 0 0;border-right:1px solid var(--line);}
        .sp-step:last-child{border-right:none;padding-right:0;}
        .sp-step:not(:first-child){padding-left:28px;}
        .sp-step__num{width:28px;height:28px;border-radius:50%;background:#C0392B;color:#fff;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .sp-step__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);line-height:1.3;margin-bottom:4px;}
        .sp-step__desc{font-family:"Satoshi",sans-serif;font-size:13px;color:var(--mute);line-height:1.5;}

        /* ── Arch label ── */
        .sp-arch-label{font-family:"Instrument Serif",serif;font-style:italic;font-size:24px;color:var(--ink-2,#2D2D2D);text-align:center;margin-top:80px;margin-bottom:40px;}

        /* ── Grid 3+2 centered — cards FIXED size ── */
        .sp-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:20px;}
        .sp-card{grid-column:span 2;background:var(--card-bg);border:1px solid var(--card-border);border-radius:20px;padding:28px;cursor:pointer;}
        .sp-card:nth-child(4){grid-column:2 / span 2;}
        .sp-card:nth-child(5){grid-column:4 / span 2;}
        .sp-card--active{border-color:rgba(192,57,43,.35)!important;background:rgba(192,57,43,.02)!important;}
        .sp-card__pent{display:flex;justify-content:center;margin-bottom:18px;}
        .sp-card__name{font-family:"Instrument Serif",serif;font-style:italic;font-size:22px;color:var(--ink);line-height:1.2;margin-bottom:6px;}
        .sp-card__tagline{font-family:"Satoshi",sans-serif;font-size:14px;color:var(--mute);line-height:1.5;margin-bottom:14px;}
        .sp-card__pills{display:flex;gap:6px;flex-wrap:wrap;}
        .sp-card__pill{padding:3px 10px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;background:rgba(15,123,108,.1);color:var(--accent-teal,#0F7B6C);border:1px solid rgba(15,123,108,.2);}

        /* ── Panel below grid ── */
        .sp-panel-wrap{overflow:hidden;margin-top:20px;}
        .sp-panel{background:var(--card-bg);border:1px solid var(--card-border);border-radius:20px;padding:40px;position:relative;}
        .sp-panel__inner{display:grid;grid-template-columns:40% 60%;gap:48px;align-items:start;}
        .sp-panel__close{position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;color:var(--mute);font-size:20px;line-height:1;padding:6px;display:flex;align-items:center;justify-content:center;transition:color .15s;}
        .sp-panel__close:hover{color:var(--ink);}
        /* Left column */
        .sp-panel__left{display:flex;flex-direction:column;gap:16px;}
        .sp-panel__name{font-family:"Instrument Serif",serif;font-style:italic;font-size:2rem;color:var(--ink);line-height:1.15;margin-bottom:2px;}
        .sp-panel__tagline{font-family:"Satoshi",sans-serif;font-size:14px;color:var(--mute);margin-bottom:4px;}
        .sp-panel__pills-row{display:flex;gap:20px;flex-wrap:wrap;}
        .sp-panel__pill-group{display:flex;flex-direction:column;gap:7px;}
        .sp-panel__pill-lbl{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mute);}
        .sp-panel__pills{display:flex;gap:6px;flex-wrap:wrap;}
        .sp-panel__pill-str{padding:3px 10px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;background:rgba(15,123,108,.1);color:var(--accent-teal,#0F7B6C);border:1px solid rgba(15,123,108,.2);}
        .sp-panel__pill-crec{padding:3px 10px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;background:rgba(192,57,43,.08);color:#C0392B;border:1px solid rgba(192,57,43,.2);}
        /* Right column */
        .sp-panel__right{display:flex;flex-direction:column;gap:20px;}
        .sp-panel__desc{font-family:"Satoshi",sans-serif;font-size:16px;color:var(--ink-2,#2D2D2D);line-height:1.75;}
        .sp-panel__route-lbl{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);margin-bottom:10px;}
        .sp-panel__mods{display:flex;flex-direction:column;gap:8px;}
        .sp-panel__mod{display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-size:14px;color:var(--ink-2,#2D2D2D);}
        .sp-panel__mod::before{content:"";width:6px;height:6px;border-radius:50%;background:#C0392B;flex-shrink:0;}
        .sp-panel__ej{background:var(--bg-2);border-radius:12px;padding:16px 18px;font-family:"Satoshi",sans-serif;font-size:13.5px;color:var(--mute);line-height:1.65;}
        .sp-panel__ej strong{color:var(--ink);font-weight:700;}
        .sp-panel__cta{font-family:"Satoshi",sans-serif;font-size:13px;font-weight:700;color:#C0392B;text-decoration:none;display:inline-flex;align-items:center;gap:4px;}
        .sp-panel__cta:hover{text-decoration:underline;}

        /* ── Responsive ── */
        @media(max-width:960px){
          .sp-wrap{padding:80px 24px;}
          .sp-steps{flex-direction:column;}
          .sp-step{border-right:none;border-bottom:1px solid var(--line);padding:20px 0;}
          .sp-step:last-child{border-bottom:none;}
          .sp-step:not(:first-child){padding-left:0;}
          .sp-grid{grid-template-columns:repeat(2,1fr);gap:14px;}
          .sp-card{grid-column:auto!important;}
          .sp-panel__inner{grid-template-columns:1fr;gap:28px;}
        }
        @media(max-width:480px){
          .sp-grid{grid-template-columns:1fr;}
        }
        @media(max-width:640px){
          .sp-sub{font-size:16px;}
          .sp-panel{padding:24px 20px;}
        }
      `}</style>

      <div className="sp-inner">

        {/* ── Header ── */}
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

        {/* ── Archetype cards — FIXED SIZE ── */}
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
                className={`sp-card${isActive ? ' sp-card--active' : ''}`}
                variants={pref ? undefined : {
                  hidden:  { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 160, damping: 22 } },
                }}
                animate={{
                  opacity: isDimmed ? 0.6 : 1,
                  scale:   isActive ? 1.02 : isDimmed ? 0.98 : 1,
                }}
                whileHover={isActive || isDimmed ? {} : { y: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                onClick={() => toggle(a.id)}
              >
                <div className="sp-card__pent">
                  <ArchPentagon
                    scores={a.scores as Record<string, number>}
                    fortalezas={a.fortalezas}
                    crec={a.crec}
                    size={120}
                  />
                </div>
                <div className="sp-card__name">{a.name}</div>
                <div className="sp-card__tagline">{a.tagline}</div>
                <div className="sp-card__pills">
                  {a.fortalezas.map(f => (
                    <span key={f} className="sp-card__pill">{f}</span>
                  ))}
                </div>
              </m.div>
            )
          })}
        </m.div>

        {/* ── Panel below grid ── */}
        <AnimatePresence mode="wait">
          {selected && (
            <m.div
              key={selected.id}
              className="sp-panel-wrap"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              <div className="sp-panel">
                {/* Close button */}
                <m.button
                  className="sp-panel__close"
                  onClick={() => setSel(null)}
                  whileHover={pref ? undefined : { rotate: 90, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  aria-label="Cerrar"
                >
                  ×
                </m.button>

                <div className="sp-panel__inner">
                  {/* ── Left 40% ── */}
                  <div className="sp-panel__left">
                    <ArchPentagon
                      scores={selected.scores as Record<string, number>}
                      fortalezas={selected.fortalezas}
                      crec={selected.crec}
                      size={200}
                    />
                    <div className="sp-panel__name">{selected.name}</div>
                    <div className="sp-panel__tagline">{selected.tagline}</div>
                    <div className="sp-panel__pills-row">
                      <div className="sp-panel__pill-group">
                        <div className="sp-panel__pill-lbl">FORTALEZAS</div>
                        <div className="sp-panel__pills">
                          {selected.fortalezas.map(f => (
                            <span key={f} className="sp-panel__pill-str">{f}</span>
                          ))}
                        </div>
                      </div>
                      <div className="sp-panel__pill-group">
                        <div className="sp-panel__pill-lbl">A DESARROLLAR</div>
                        <div className="sp-panel__pills">
                          {selected.crec.map(c => (
                            <span key={c} className="sp-panel__pill-crec">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Right 60% ── */}
                  <div className="sp-panel__right">
                    <p className="sp-panel__desc">{selected.desc}</p>

                    <div>
                      <p className="sp-panel__route-lbl">TU RUTA EN EL PROGRAMA</p>
                      <div className="sp-panel__mods">
                        {selected.modules.map(mod => (
                          <div key={mod} className="sp-panel__mod">{mod}</div>
                        ))}
                      </div>
                    </div>

                    <div className="sp-panel__ej">
                      <strong>Ejemplo: </strong>{selected.ejemplo}
                    </div>

                    <a href="/register" className="sp-panel__cta">
                      Descubre si eres este líder →
                    </a>
                  </div>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  )
}

export default memo(AprendizajeSection)
