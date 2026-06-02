'use client'

import { memo } from 'react'
import { m, useReducedMotion } from 'framer-motion'

// ── Data ──────────────────────────────────────────────────────────────────────
// TODO: Reemplazar placeholders con datos reales de Luis Barrios:
//   - Foto real del alumni (subir a /public/images/alumni/)
//   - Nombre completo real
//   - Quote real con su autorización

const ALUMNI = [
  {
    initials:    'NR',
    name:        'Nombre Apellido',
    badge:       'ESADE Business School · Barcelona',
    badgeBg:     'rgba(15,123,108,0.10)',
    badgeColor:  'var(--accent-teal,#0F7B6C)',
    role:        "Bachelor's en Transformational Leadership & Social Impact",
    quote:       'Big Family me enseñó que el liderazgo no es un título, es una decisión que tomas todos los días.',
    year:        'Promoción 2023',
  },
  {
    initials:    'NR',
    name:        'Nombre Apellido',
    badge:       'Concordia University · Montreal, Canadá',
    badgeBg:     'rgba(212,130,26,0.10)',
    badgeColor:  'var(--accent-amber,#D4821A)',
    role:        'Vicepresidente de Latin Students Association',
    quote:       'Aprendí en La Guajira lo que ninguna universidad me pudo enseñar: cómo movilizar personas hacia un propósito real.',
    year:        'Promoción 2022',
  },
  {
    initials:    'NR',
    name:        'Nombre Apellido',
    badge:       'Model United Nations · Presidencia',
    badgeBg:     'rgba(192,57,43,0.08)',
    badgeColor:  '#C0392B',
    role:        'Presidente Nacional MUN Colombia',
    quote:       'El programa me dio las herramientas para liderar bajo presión. El MUN fue solo la primera prueba.',
    year:        'Promoción 2024',
  },
] as const

// ── Component ─────────────────────────────────────────────────────────────────
function AlumniSection() {
  const pref = useReducedMotion()

  return (
    <section className="sec-alumni">
      <style>{`
        .sec-alumni{background:var(--bg);padding:120px 40px;border-top:1px solid var(--line);}
        .sec-alumni__inner{max-width:1200px;margin:0 auto;}
        .sec-alumni__header{max-width:700px;margin:0 auto 64px;text-align:center;}
        .sec-alumni__eyebrow{display:inline-flex;align-items:center;border:1px solid rgba(192,57,43,.3);background:rgba(192,57,43,.06);color:#C0392B;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;border-radius:999px;padding:5px 14px;margin-bottom:24px;}
        .sec-alumni__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(2.5rem,5vw,3.5rem);color:var(--ink);letter-spacing:-0.04em;line-height:1.08;text-wrap:balance;margin-bottom:18px;}
        .sec-alumni__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;}
        .sec-alumni__sub{font-family:"Satoshi",sans-serif;font-size:18px;color:var(--mute);line-height:1.7;max-width:56ch;margin:0 auto;}
        .sec-alumni__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
        .sec-alumni__card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:20px;padding:32px;display:flex;flex-direction:column;gap:16px;position:relative;overflow:hidden;}
        /* Decorative opening quote */
        .sec-alumni__card::before{content:'“';position:absolute;top:-14px;left:20px;font-family:"Instrument Serif",serif;font-size:100px;color:#C0392B;opacity:.12;line-height:1;pointer-events:none;user-select:none;}
        .sec-alumni__avatar{width:80px;height:80px;border-radius:50%;background:var(--bg-2);display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:var(--mute);letter-spacing:.05em;flex-shrink:0;}
        .sec-alumni__name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);line-height:1.2;}
        .sec-alumni__badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;width:fit-content;}
        .sec-alumni__role{font-family:"Satoshi",sans-serif;font-size:13px;color:var(--mute);line-height:1.5;}
        .sec-alumni__quote{font-family:"Instrument Serif",serif;font-style:italic;font-size:15px;color:var(--ink-2,#2D2D2D);line-height:1.7;flex:1;position:relative;z-index:1;}
        .sec-alumni__year{font-family:"Satoshi",sans-serif;font-size:11px;color:var(--mute);letter-spacing:.08em;margin-top:auto;}
        @media(max-width:960px){.sec-alumni{padding:80px 24px;}.sec-alumni__grid{grid-template-columns:repeat(2,1fr);gap:16px;}}
        @media(max-width:600px){.sec-alumni__grid{grid-template-columns:1fr;}}
        @media(max-width:640px){.sec-alumni__sub{font-size:16px;}}
      `}</style>

      <div className="sec-alumni__inner">
        {/* Header */}
        <m.div
          className="sec-alumni__header"
          initial={pref ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <span className="sec-alumni__eyebrow">ALUMNI</span>
          <h2 className="sec-alumni__title">
            Líderes que dejaron <em>huella</em>.
          </h2>
          <p className="sec-alumni__sub">
            Estos son algunos de los estudiantes que pasaron por Big Family
            y hoy impactan el mundo desde sus propios escenarios.
          </p>
        </m.div>

        {/* Cards */}
        <m.div
          className="sec-alumni__grid"
          initial={pref ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
        >
          {ALUMNI.map(a => (
            <m.div
              key={a.badge}
              className="sec-alumni__card"
              variants={pref ? undefined : {
                hidden:  { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 140, damping: 22 } },
              }}
            >
              {/* Avatar */}
              <div className="sec-alumni__avatar">{a.initials}</div>

              {/* Identity */}
              <div>
                <div className="sec-alumni__name">{a.name}</div>
                <span
                  className="sec-alumni__badge"
                  style={{ background: a.badgeBg, color: a.badgeColor }}
                >
                  {a.badge}
                </span>
              </div>

              <div className="sec-alumni__role">{a.role}</div>

              {/* Quote */}
              <p className="sec-alumni__quote">
                &ldquo;{a.quote}&rdquo;
              </p>

              <div className="sec-alumni__year">{a.year}</div>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  )
}

export default memo(AlumniSection)
