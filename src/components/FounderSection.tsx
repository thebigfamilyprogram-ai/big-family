'use client'

import { memo } from 'react'
import { m, useReducedMotion } from 'framer-motion'

const CREDENTIALS = [
  'M.S. Multidisciplinary Studies — University at Buffalo',
  'Estudios en Liderazgo, Creatividad e Innovación',
  'MIT · Javeriana · Uninorte · Unisabana',
]

const SCHOOL_BADGES = ['University at Buffalo', 'MIT', 'Javeriana University', 'Uninorte', 'Unisabana']

function FounderSection() {
  const pref = useReducedMotion()

  return (
    <section className="sf-wrap">
      <style>{`
        .sf-wrap{background:var(--bg);padding:128px 40px;border-top:1px solid var(--line);}
        .sf-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:55fr 45fr;gap:80px;align-items:center;}
        /* Left */
        .sf-left{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:24px;}
        .sf-avatar{width:200px;height:200px;border-radius:50%;background:#C0392B;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:3rem;color:#fff;flex-shrink:0;}
        .sf-badges{display:flex;flex-wrap:wrap;gap:8px;}
        .sf-badge{padding:4px 12px;border-radius:999px;background:var(--bg-2,#EFECE6);border:1px solid var(--line);font-family:"Satoshi",sans-serif;font-size:11px;font-weight:600;color:var(--ink-2,#2D2D2D);}
        .sf-stat__num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:2rem;color:#C0392B;line-height:1;}
        .sf-stat__lbl{font-family:"Satoshi",sans-serif;font-size:14px;color:var(--mute,#6B6B6B);margin-top:4px;}
        /* Right */
        .sf-right{display:flex;flex-direction:column;gap:0;}
        .sf-eyebrow{display:inline-flex;align-items:center;border:1px solid rgba(192,57,43,.3);background:rgba(192,57,43,.06);color:#C0392B;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;border-radius:999px;padding:5px 14px;margin-bottom:20px;width:fit-content;}
        .sf-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(1.8rem,3vw,2.5rem);color:var(--ink,#0D0D0D);letter-spacing:-0.02em;line-height:1.1;margin-bottom:6px;}
        .sf-role{font-family:"Instrument Serif",serif;font-style:italic;font-size:1.1rem;color:#C0392B;margin-bottom:0;}
        .sf-sep{height:1px;background:var(--line);margin:20px 0;}
        .sf-creds{display:flex;flex-direction:column;gap:8px;margin-bottom:28px;}
        .sf-cred{display:flex;align-items:flex-start;gap:10px;font-family:"Satoshi",sans-serif;font-size:14px;color:var(--ink-2,#2D2D2D);line-height:1.5;}
        .sf-cred::before{content:"";width:6px;height:6px;border-radius:50%;background:#C0392B;flex-shrink:0;margin-top:6px;}
        /* Quote */
        .sf-quote-wrap{position:relative;padding:24px 28px;border-radius:16px;background:rgba(192,57,43,.04);border:1px solid rgba(192,57,43,.08);margin-bottom:24px;}
        .sf-quote-mark{position:absolute;top:-6px;left:16px;font-family:"Instrument Serif",serif;font-size:80px;color:#C0392B;opacity:.15;line-height:1;pointer-events:none;user-select:none;}
        .sf-quote{font-family:"Instrument Serif",serif;font-style:italic;font-size:clamp(1.1rem,2vw,1.4rem);color:var(--ink,#0D0D0D);line-height:1.6;position:relative;z-index:1;}
        .sf-quote-attr{font-family:"Satoshi",sans-serif;font-size:13px;color:var(--mute,#6B6B6B);margin-top:12px;}
        /* Contact */
        .sf-contact{display:flex;flex-direction:column;gap:4px;}
        .sf-contact a{font-family:"Satoshi",sans-serif;font-size:13px;color:#C0392B;text-decoration:none;}
        .sf-contact a:hover{text-decoration:underline;}
        .sf-contact-phone{font-family:"Satoshi",sans-serif;font-size:13px;color:var(--mute,#6B6B6B);}
        /* Responsive */
        @media(max-width:900px){
          .sf-wrap{padding:80px 24px;}
          .sf-inner{grid-template-columns:1fr;gap:48px;}
          .sf-left{align-items:center;text-align:center;}
          .sf-badges{justify-content:center;}
          .sf-stat{text-align:center;}
        }
      `}</style>

      <div className="sf-inner">

        {/* ── IZQUIERDA — Avatar + credenciales ── */}
        <m.div
          className="sf-left"
          initial={pref ? false : { opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          {/* TODO: Reemplazar con foto real de Luis Barrios
              <img src="/images/luis-barrios.jpg" alt="Luis Barrios"
                style={{ width: 200, height: 200, borderRadius: '50%', objectFit: 'cover' }} />
          */}
          <div className="sf-avatar">LB</div>

          <div className="sf-badges">
            {SCHOOL_BADGES.map(b => (
              <span key={b} className="sf-badge">{b}</span>
            ))}
          </div>

          <div className="sf-stat">
            <div className="sf-stat__num">10+ años</div>
            <div className="sf-stat__lbl">formando líderes en La Guajira</div>
          </div>
        </m.div>

        {/* ── DERECHA — Copy ── */}
        <m.div
          className="sf-right"
          initial={pref ? false : { opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.15 }}
        >
          <span className="sf-eyebrow">EL FUNDADOR</span>
          <h2 className="sf-name">Luis Hernando Barrios</h2>
          <p className="sf-role">Fundador &amp; Coordinador de Acción Social</p>

          <div className="sf-sep" />

          <div className="sf-creds">
            {CREDENTIALS.map(c => (
              <div key={c} className="sf-cred">{c}</div>
            ))}
          </div>

          {/* Quote */}
          <div className="sf-quote-wrap">
            <span className="sf-quote-mark" aria-hidden="true">&ldquo;</span>
            <p className="sf-quote">
              Empezamos con 15 estudiantes en 2015.
              Hoy somos una familia de líderes en 10 países.
              La misión siempre fue la misma: que cada joven
              descubra que puede cambiar su mundo desde donde está.
            </p>
            <p className="sf-quote-attr">— Luis Barrios, Fundador de The Big Family Program</p>
          </div>

          {/* Contacto */}
          <div className="sf-contact">
            <a href="mailto:luis.barrios@colegioalbania.edu.co">
              luis.barrios@colegioalbania.edu.co
            </a>
            <span className="sf-contact-phone">(+57) 310 848 6706</span>
          </div>
        </m.div>

      </div>
    </section>
  )
}

export default memo(FounderSection)
