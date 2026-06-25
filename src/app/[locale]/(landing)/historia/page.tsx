'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion'

import LandingTimeline from '@/components/LandingTimeline'

export default function HistoriaPage() {
  const t              = useTranslations()
  const prefersReduced = useReducedMotion()
  const { scrollY }    = useScroll()
  const historiaTextY  = useTransform(scrollY, [600, 2000], [-20, 20])

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <>
    <section id="historia" className="sec-historia">
      <div className="sec-historia__inner">
        {/* Columna izquierda — imagen */}
        <m.div
          className="sec-historia__img-wrap"
          initial={prefersReduced ? false : { opacity: 0, x: -32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        >
          <div className="sec-historia__watermark-yr" aria-hidden="true">{t('landing.historia.watermark')}</div>
          <div className="sec-historia__img">
            <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, opacity:.3 }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <rect x="4" y="8" width="32" height="24" rx="3" stroke="var(--ink)" strokeWidth="1.5"/>
                <circle cx="14" cy="18" r="4" stroke="var(--ink)" strokeWidth="1.5"/>
                <path d="M4 28L13 20l6 5 5-4 12 7" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontFamily:'"Satoshi",sans-serif', fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--mute)' }}>{t('common.photoComingSoon')}</span>
            </div>
          </div>
          <div className="sec-historia__badge">
            <div className="sec-historia__badge-est">{t('landing.historia.since')}</div>
            <div className="sec-historia__badge-label">{t('landing.historia.stat1Value')}</div>
          </div>
        </m.div>

        {/* Columna derecha — texto con parallax */}
        <m.div
          className="sec-historia__text"
          style={mounted && !prefersReduced ? { y: historiaTextY } : {}}
          initial={prefersReduced ? false : { opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.1 }}
        >
          <p className="sec-historia__eyebrow">{t('landing.historia.eyebrow')}</p>
          <h2 className="sec-historia__title">{t('landing.historia.secTitle')}</h2>
          <p className="sec-historia__subtitle">{t('landing.historia.secSubtitle')}</p>
          <p className="sec-historia__para">{t('landing.historia.secBody')}</p>
          <div className="sec-historia__recono">
            <span className="sec-historia__recono-label">{t('landing.historia.reconoLabel')}</span>
            <div className="sec-historia__pills">
              <span className="sec-historia__pill">MIT Leadership</span>
              <span className="sec-historia__pill">Universidad Javeriana</span>
              <span className="sec-historia__pill">Uninorte</span>
            </div>
          </div>
        </m.div>
      </div>
    </section>

    <LandingTimeline />
    </>
  )
}
