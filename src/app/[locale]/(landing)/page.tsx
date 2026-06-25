'use client'

export const dynamic = 'force-dynamic'

import { memo, useEffect, useRef, useState } from 'react'
import { Link } from 'next-view-transitions'
import { useTranslations } from 'next-intl'
import { m, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'

import { VALIDACIONES, misionStats, IMPACTO_STATS } from '@/lib/landingData'

type VisionWord = { word: string; italic: boolean }
const visionWordV = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 20 } },
}
const visionStaggerV = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04 } },
}

function CountNumber({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref    = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const dur = 1400
    function tick(t: number) {
      const p = Math.min((t - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(to * e))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [inView, to])
  return <span ref={ref}>{val}{suffix}</span>
}

// ── ImpactoNum — per-stat custom duration counter ─────────────────────────────
function ImpactoNum({ to, duration, delayMs = 0, comma = false, suffix = '' }: {
  to: number; duration: number; delayMs?: number; comma?: boolean; suffix?: string
}) {
  const ref    = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const tmrRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    tmrRef.current = setTimeout(() => {
      const t0 = performance.now()
      function tick(t: number) {
        const p = Math.min((t - t0) / duration, 1)
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))))
        if (p < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }, delayMs)
    return () => {
      if (tmrRef.current) clearTimeout(tmrRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [inView, to, duration, delayMs]) // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>{comma ? val.toLocaleString('en-US') : val}{suffix}</span>
}

const FAQSection = memo(function FAQSection({ reduced }: { reduced: boolean }) {
  const t = useTranslations()
  const [open, setOpen] = useState<number | null>(null)
  const faqItems = [
    { q: t('landing.faq.q1'), a: t('landing.faq.a1') },
    { q: t('landing.faq.q2'), a: t('landing.faq.a2') },
    { q: t('landing.faq.q3'), a: t('landing.faq.a3') },
    { q: t('landing.faq.q4'), a: t('landing.faq.a4') },
    { q: t('landing.faq.q5'), a: t('landing.faq.a5') },
  ]
  return (
    <section className="sec-faq">
      <div className="sec-faq__inner">
        <m.div
          className="sec-faq__header"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <p className="sec-faq__eyebrow">{t('landing.faq.eyebrow')}</p>
          <h2 className="sec-faq__title">{t('landing.faq.title')}</h2>
        </m.div>
        <div>
          {faqItems.map((faq, i) => (
            <m.div
              key={i}
              className="sec-faq__item"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.06 }}
            >
              <button
                className="sec-faq__q"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                {faq.q}
                <svg
                  className={`sec-faq__chevron${open === i ? ' sec-faq__chevron--open' : ''}`}
                  width="18" height="18" viewBox="0 0 18 18" fill="none"
                  aria-hidden="true"
                >
                  <path d="M4 6.5L9 11.5L14 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="sec-faq__a">{faq.a}</p>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
})

export default function ProgramaPage() {
  const t              = useTranslations()
  const prefersReduced  = useReducedMotion()

  const impactoLabels = [
    t('landing.impacto.stat1Label'),
    t('landing.impacto.stat2Label'),
    t('landing.impacto.stat3Label'),
    t('landing.impacto.stat4Label'),
  ]

  const impactoSubs = [
    t('landing.impacto.stat1Sub'),
    t('landing.impacto.stat2Sub'),
    t('landing.impacto.stat3Sub'),
    t('landing.impacto.stat4Sub'),
  ]

  const misionStatLabels = [
    t('landing.mision.stat1Label'),
    t('landing.mision.stat2Label'),
    t('landing.mision.stat3Label'),
    t('landing.mision.stat4Label'),
  ]

  const visionWords: VisionWord[] = t('landing.vision.animatedWords')
    .split(' ')
    .map(w => ({ word: w.replace(/\*/g, ''), italic: w.startsWith('*') && w.endsWith('*') }))

  const validacionesDescs = [
    t('landing.acreditaciones.cognia.description'),
    t('landing.acreditaciones.ib.description'),
    t('landing.acreditaciones.triAssociation.description'),
  ]
  const validacionesTags = [
    t('landing.acreditaciones.institutionalTag'),
    VALIDACIONES[1].tag,
    VALIDACIONES[2].tag,
  ]

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — IMPACTO EN NÚMEROS (solo en / — no es parte del shell)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="impacto" className="sec-impacto">
        <div className="sec-impacto__inner">
          <m.p
            className="sec-impacto__eyebrow"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 130, damping: 20 }}
          >{t('landing.impacto.eyebrow')}</m.p>
          <m.h2
            className="sec-impacto__title"
            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.06 }}
          >
            {t('landing.impacto.titlePre')} <em>{t('landing.impacto.titleEm')}</em>.
          </m.h2>
          <div className="sec-impacto__grid">
            {IMPACTO_STATS.flatMap((stat, i) => [
              i > 0 ? (
                <m.div
                  key={`sep-${i}`}
                  className="sec-impacto__sep"
                  initial={prefersReduced ? false : { scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.1 }}
                  style={{ transformOrigin: 'top' }}
                />
              ) : null,
              <m.div
                key={i}
                className="sec-impacto__stat"
                initial={prefersReduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 130, damping: 20, delay: i * 0.08 }}
              >
                <div className="sec-impacto__num">
                  <ImpactoNum to={stat.to} duration={stat.duration} delayMs={stat.delayMs} comma={stat.comma} suffix={stat.suffix} />
                </div>
                <div className="sec-impacto__label">{impactoLabels[i]}</div>
                <div className="sec-impacto__sub">{impactoSubs[i]}</div>
              </m.div>,
            ])}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 1 — MISIÓN
      ══════════════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="mision">
        <div className="mision__inner">

          {/* Eyebrow pill */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            <span className="mision__eyebrow-pill">{t('landing.mision.eyebrow')}</span>
          </m.div>

          {/* Título en 3 líneas — stagger con blur */}
          <m.h2
            className="mision__title"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
          >
            {[
              { text: t('landing.mision.titleLine1'), accent: false },
              { text: t('landing.mision.titleLine2'), accent: true  },
            ].map((line, i) => (
              <m.span
                key={i}
                className={`mision__title-line${line.accent ? ' mision__title-line--accent' : ''}`}
                variants={{
                  hidden:   { opacity: 0, y: 50, filter: 'blur(8px)' },
                  visible:  { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { type: 'spring', stiffness: 100, damping: 20 } },
                }}
              >{line.text}</m.span>
            ))}
          </m.h2>

          {/* Subtítulo */}
          <m.p
            className="mision__sub"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.5 }}
          >
            {t('landing.mision.body')}
          </m.p>

        </div>

        {/* Stats — 4 columnas */}
        <m.div
          className="mision__stats"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {misionStats.map((s, i) => (
            <m.div
              key={i}
              className="mision__stat"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 140, damping: 20 } } }}
            >
              <div className="mision__stat-num">
                <CountNumber to={s.to} />{s.suffix && <em>{s.suffix}</em>}
              </div>
              <div className="mision__stat-label">{misionStatLabels[i]}</div>
            </m.div>
          ))}
        </m.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 2 — VISIÓN
      ══════════════════════════════════════════════════════════════════ */}
      <section className="vision">

        {/* "2036" watermark — fades in very last */}
        <m.div
          className="vision__watermark"
          aria-hidden="true"
          initial={prefersReduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 3, ease: 'easeOut', delay: 1 }}
        >
          {t('landing.vision.meta')}
        </m.div>

        <div className="vision__inner">

          {/* Row 1 — Eyebrow + animated red line */}
          <div className="vision__row1">
            <m.p
              className="vision__eyebrow"
              initial={prefersReduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {t('landing.vision.eyebrow')} {t('landing.vision.meta')}
            </m.p>
            <m.div
              className="vision__eyebrow-line"
              initial={prefersReduced ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.15 }}
            />
          </div>

          {/* Row 2 — Title with word-level stagger */}
          <h2 className="vision__title">
            <m.span
              style={{ display: 'block' }}
              initial={prefersReduced ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={visionStaggerV}
            >
              {visionWords.map((word, i) => (
                <m.span
                  key={i}
                  variants={visionWordV}
                  style={{ display: 'inline-block', marginRight: '0.28em' }}
                >
                  {word.italic ? <em>{word.word}</em> : word.word}
                </m.span>
              ))}
            </m.span>
          </h2>

          {/* Row 3 — Two text columns, appear after title stagger completes */}
          <m.div
            className="vision__cols"
            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.6 }}
          >
            <p className="vision__para">{t('landing.vision.para1')}</p>
            <p className="vision__para">{t('landing.vision.para2')}</p>
          </m.div>

          {/* Row 4 — CTA */}
          <m.div
            style={{ display: 'flex', justifyContent: 'center' }}
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.9 }}
          >
            <m.div
              style={{ display: 'inline-block' }}
              whileHover={prefersReduced ? {} : { scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
            >
              <Link
                href="/register"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 32px',
                  background: 'var(--accent,#C0392B)', color: '#fff',
                  borderRadius: 999,
                  fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15,
                  textDecoration: 'none',
                }}
              >
                {t('landing.vision.cta')} <span aria-hidden="true">→</span>
              </Link>
            </m.div>
          </m.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — VALIDACIONES INTERNACIONALES (oscuro)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="sec-valid">
        <div className="sec-valid__inner">

          {/* Header */}
          <m.div
            className="sec-valid__head"
            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <p className="sec-valid__eyebrow">{t('landing.acreditaciones.eyebrow')}</p>
            <h2 className="sec-valid__title">{t('landing.acreditaciones.title')}</h2>
            <p className="sec-valid__sub">{t('landing.acreditaciones.sub')}</p>
          </m.div>

          {/* Cards */}
          <div className="sec-valid__grid">
            {VALIDACIONES.map((v, i) => (
              <m.div
                key={v.name}
                className="sec-valid__card"
                initial={prefersReduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * 0.15 }}
              >
                <div style={{ width:'100%', display:'flex', justifyContent:'center', marginBottom:16 }}>
                  <div style={{
                    display:'inline-flex', alignItems:'center', background:'#fff', borderRadius:12,
                    padding: v.alt === 'Cognia' ? '16px 20px' : '10px 16px',
                  }}>
                    <img
                      src={v.logo}
                      alt={v.alt}
                      className="sec-valid__logo"
                      style={{ height: v.alt === 'Cognia' ? 64 : 56 }}
                    />
                  </div>
                </div>
                <span className="sec-valid__tag">{validacionesTags[i]}</span>
                <p className="sec-valid__name">{v.name}</p>
                <p className="sec-valid__desc">{validacionesDescs[i]}</p>
              </m.div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — FAQ
      ══════════════════════════════════════════════════════════════════ */}
      <FAQSection reduced={!!prefersReduced} />
    </>
  )
}
