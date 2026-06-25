'use client'

export const dynamic = 'force-dynamic'

import { useTranslations } from 'next-intl'
import { m } from 'framer-motion'

import FounderSection from '@/components/FounderSection'
import { FOUNDERS_STATIC } from '@/lib/landingData'

export default function EquipoPage() {
  const t = useTranslations()

  const founders = FOUNDERS_STATIC.map(f => ({
    initials: f.initials,
    name:     f.name,
    role:     t(f.roleKey),
    bio:      t(f.bioKey),
    tags:     f.tagKeys.map(k => t(k)),
  }))

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — EL FUNDADOR
      ══════════════════════════════════════════════════════════════════ */}
      <FounderSection />

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — EQUIPO
      ══════════════════════════════════════════════════════════════════ */}
      <section id="equipo" className="equipo">
        <div className="equipo__inner">

          {/* Header */}
          <m.div
            className="equipo__header"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          >
            <div>
              <p className="equipo__eyebrow">{t('landing.equipo.eyebrow')}</p>
              <h2 className="equipo__title">{t('landing.equipo.title')}</h2>
            </div>
            <p className="equipo__desc">{t('landing.equipo.body')}</p>
          </m.div>

          {/* Grid de cards — 3 columnas iguales */}
          <div className="equipo__grid">
            {founders.map((f, i) => (
              <m.div
                key={f.name}
                className="equipo__card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ type: 'spring', stiffness: 180, damping: 22, delay: i * 0.12 }}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              >
                <div className="equipo__avatar" style={{ background: 'linear-gradient(135deg,#C0392B,#922b21)' }}>{f.initials}</div>
                <div className="equipo__card-name">{f.name}</div>
                <div className="equipo__card-role">{f.role}</div>
                <div className="equipo__card-divider" />
                <div className="equipo__card-bio">{f.bio}</div>
                <div className="equipo__tags">
                  {f.tags.map(tag => <span key={tag} className="equipo__tag">{tag}</span>)}
                </div>
              </m.div>
            ))}
          </div>

        </div>
      </section>
    </>
  )
}
