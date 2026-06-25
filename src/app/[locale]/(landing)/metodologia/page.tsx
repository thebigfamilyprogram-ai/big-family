'use client'

export const dynamic = 'force-dynamic'

import { useTranslations } from 'next-intl'
import { m, useReducedMotion } from 'framer-motion'

import AprendizajeSection from '@/components/AprendizajeSection'
import { PROGRAM_COMPONENTS, VALORES, valorKeyMap } from '@/lib/landingData'

export default function MetodologiaPage() {
  const t              = useTranslations()
  const prefersReduced = useReducedMotion()

  const programTexts = [
    { tag: t('landing.metodologia.bigLeader.subtitle'),    desc: t('landing.metodologia.bigLeader.body')    },
    { tag: t('landing.metodologia.leadersGame.subtitle'),  desc: t('landing.metodologia.leadersGame.body')  },
    { tag: t('landing.metodologia.greatVenture.subtitle'), desc: t('landing.metodologia.greatVenture.body') },
    { tag: t('landing.metodologia.kashi.subtitle'),        desc: t('landing.metodologia.kashi.body')        },
  ]

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — COMPONENTES DEL PROGRAMA (bg-2)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="metodologia" className="sec-prog">
        <div className="sec-prog__inner">

          {/* Header */}
          <m.div
            className="sec-prog__head"
            initial={prefersReduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <p className="sec-prog__eyebrow">{t('landing.metodologia.eyebrow')}</p>
            <h2 className="sec-prog__title">{t('landing.metodologia.programTitle')}</h2>
          </m.div>

          {/* Rows */}
          <div className="sec-prog__list">
            {PROGRAM_COMPONENTS.map((c, i) => (
              <m.div
                key={c.num}
                className="sec-prog__item"
                initial={prefersReduced ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 100, damping: 22, delay: i * 0.07 }}
              >
                {/* Número ancla */}
                <div className="sec-prog__num" aria-hidden="true">{c.num}</div>

                {/* Contenido */}
                <div className="sec-prog__body">
                  <span className="sec-prog__tag">{programTexts[i].tag}</span>
                  <h3 className="sec-prog__name">{c.name}</h3>
                  <p className="sec-prog__desc">{programTexts[i].desc}</p>
                  {c.name === 'Kashi' && (
                    <a
                      href="https://luishernandobarrios.com/kashi/splash"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '9px 20px',
                        borderRadius: 999,
                        border: '1.5px solid #C0392B',
                        fontFamily: '"Satoshi",sans-serif',
                        fontWeight: 700,
                        fontSize: 13,
                        color: '#C0392B',
                        textDecoration: 'none',
                        width: 'fit-content',
                        transition: 'background .2s, color .2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#C0392B'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = '#C0392B' }}
                    >
                      {t('landing.metodologia.kashi.exploreBtn')}
                    </a>
                  )}
                </div>

                {/* Placeholder de imagen */}
                <div className="sec-prog__img" aria-hidden="true">
                  <div className="sec-prog__img-ph">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <rect x="3" y="5" width="26" height="22" rx="3" stroke="currentColor" strokeWidth="1.6"/>
                      <circle cx="11" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M3 22l7-6 6 5 5-4 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="sec-prog__img-ph-label">{t('common.photoComingSoon')}</span>
                  </div>
                </div>
              </m.div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — APRENDIZAJE PERSONALIZADO
      ══════════════════════════════════════════════════════════════════ */}
      <AprendizajeSection />

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — CERTIFICACIÓN MARKETING (light)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="sec-cert">
        <div className="sec-cert__inner">

          {/* Izquierda — Copy */}
          <m.div
            initial={prefersReduced ? false : { opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 22 }}
          >
            <span className="sec-cert__eyebrow">{t('landing.cert.eyebrow')}</span>
            <h2 className="sec-cert__title">{t('landing.cert.title')}</h2>
            <p className="sec-cert__para">{t('landing.cert.para')}</p>
            <button className="sec-cert__cta" onClick={() => window.dispatchEvent(new CustomEvent('open-diploma-modal'))}>
              {t('landing.cert.cta')} <span aria-hidden="true">→</span>
            </button>
            <div className="sec-cert__bullets">
              {([t('landing.cert.bullet1'), t('landing.cert.bullet2'), t('landing.cert.bullet3')]).map(text => (
                <div key={text} className="sec-cert__bullet">
                  <div className="sec-cert__check">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </m.div>

          {/* Derecha — Mockup del diploma (estático, rotate 2deg) */}
          <m.div
            className="sec-cert__mockup-wrap"
            initial={prefersReduced ? false : { opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 22, delay: 0.1 }}
          >
            <m.div
              className="sc-dp"
              initial={{ rotate: 2 }}
              animate={{ rotate: 2 }}
              whileHover={prefersReduced ? {} : { y: -4, rotate: 2, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
            >
              {/* Membrete */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:12 }}>
                <img src="/Logo_ColegioAlbania.png" alt="" aria-hidden="true" style={{ height:20, objectFit:'contain' }} />
                <div style={{ width:1, height:14, background:'rgba(13,13,13,.15)', flexShrink:0 }} />
                <span style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:700, fontSize:7.5, letterSpacing:'0.3em', textTransform:'uppercase', color:'#0D0D0D' }}>The Big Family Program</span>
              </div>

              <div className="sc-sep" />

              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:7.5, color:'#6B6B6B', fontStyle:'italic', marginBottom:6 }}>
                Este certificado se otorga a
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Instrument Serif",serif', fontStyle:'italic', fontWeight:400, fontSize:22, color:'#0D0D0D', letterSpacing:'-0.01em', lineHeight:1.1, marginBottom:8 }}>
                Valentina Torres Ospino
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:7.5, color:'#6B6B6B', marginBottom:4 }}>
                por haber completado exitosamente el programa de liderazgo
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontWeight:700, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'#C0392B', marginBottom:8 }}>
                The Big Leader
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:7.5, color:'#6B6B6B', marginBottom:2 }}>IE Técnica María Inmaculada</p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:7.5, color:'#6B6B6B', marginBottom:12 }}>15 de mayo de 2026</p>

              <div className="sc-sep" />

              {/* Stats + Logos */}
              <div style={{ display:'flex', justifyContent:'center', alignItems:'center', margin:'10px 0' }}>
                <div style={{ textAlign:'center', padding:'0 10px' }}>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:900, fontSize:14, color:'#C0392B' }}>1.840</div>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontSize:6, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6B6B6B', marginTop:2 }}>Puntos de Impacto</div>
                </div>
                <div style={{ width:1, height:22, background:'rgba(13,13,13,.12)', flexShrink:0 }} />
                <div style={{ textAlign:'center', padding:'0 10px' }}>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:900, fontSize:14, color:'#C0392B' }}>6</div>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontSize:6, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6B6B6B', marginTop:2 }}>Módulos</div>
                </div>
                <div style={{ width:1, height:22, background:'rgba(13,13,13,.12)', flexShrink:0 }} />
                <div style={{ textAlign:'center', padding:'0 10px' }}>
                  <p style={{ fontFamily:'"Satoshi",sans-serif', fontSize:6, letterSpacing:'0.18em', textTransform:'uppercase', color:'#6B6B6B', marginBottom:5 }}>RECONOCIDO POR</p>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    <img src="/cognia.png"                               alt="Cognia" style={{ height:14, objectFit:'contain' }} />
                    <img src="/International_Baccalaureate_Logo.svg.png" alt="IB"     style={{ height:14, objectFit:'contain' }} />
                    <img src="/tri.png"                                  alt="Tri"    style={{ height:14, objectFit:'contain' }} />
                  </div>
                </div>
              </div>

              <div className="sc-sep" />

              {/* Firma + cert + sello */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:10 }}>
                <div>
                  <div style={{ height:1, background:'rgba(13,13,13,.14)', marginBottom:4, width:80 }} />
                  <p style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:700, fontSize:7.5, color:'#0D0D0D' }}>Luis Hernando Barrios</p>
                  <p style={{ fontFamily:'"Satoshi",sans-serif', fontSize:6.5, color:'#6B6B6B', marginTop:1 }}>Fundador, The Big Family Program</p>
                </div>
                <p style={{ fontFamily:'"Satoshi",sans-serif', fontSize:6.5, letterSpacing:'0.18em', color:'#6B6B6B', alignSelf:'flex-end', paddingBottom:1 }}>CERT-2026-1001</p>
                {/* Sello mini */}
                <svg viewBox="0 0 100 100" width="38" height="38" aria-hidden="true">
                  <defs><path id="mc-arc" d="M 8 50 A 42 42 0 0 0 92 50"/></defs>
                  <circle cx="50" cy="50" r="47" fill="none" stroke="#C0392B" strokeWidth="1.5"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#C0392B" strokeWidth="0.6"/>
                  <text fill="#C0392B" fontSize="6.8" fontFamily="Satoshi,sans-serif" fontWeight="700" letterSpacing="1.5">
                    <textPath href="#mc-arc" startOffset="50%" textAnchor="middle">BIG FAMILY · CERTIFIED</textPath>
                  </text>
                  <path d="M50 36 L53.5 45.1 L63.3 45.7 L55.7 51.8 L58.2 61.3 L50 56 L41.8 61.3 L44.3 51.8 L36.7 45.7 L46.5 45.1Z" fill="#C0392B"/>
                </svg>
              </div>
            </m.div>
          </m.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — VALORES
      ══════════════════════════════════════════════════════════════════ */}
      <section id="valores" className="sec-valores">
        <div className="sec-valores__inner">
          <m.div
            className="sec-valores__header"
            initial={prefersReduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <p className="sec-valores__eyebrow">{t('landing.valores.title')}</p>
            <h2 className="sec-valores__title">{t('landing.valores.eyebrow')}</h2>
          </m.div>

          <div className="sec-valores__grid">
            {VALORES.map((v, i) => (
              <m.div
                key={v.name}
                className={`sec-valores__tile${i === 0 ? ' sec-valores__tile--featured' : ''}`}
                initial={prefersReduced ? false : { opacity: 0, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * 0.07 }}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              >
                <div className="sec-valores__num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div
                  className="sec-valores__img-ph"
                  data-value={v.slug}
                  aria-hidden="true"
                />
                <div className="sec-valores__name">{t('landing.valores.' + valorKeyMap[v.slug] + '.title')}</div>
                <div className="sec-valores__desc">{t('landing.valores.' + valorKeyMap[v.slug] + '.body')}</div>
              </m.div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
