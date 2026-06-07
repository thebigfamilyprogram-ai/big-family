'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { m, useInView, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'
import { useTranslations } from 'next-intl'

// ── School data ────────────────────────────────────────────────────────────────
const SCHOOLS = [
  { name: 'IE Técnica María Inmaculada',    municipality: 'Riohacha',           initials: 'TM' },
  { name: 'Instituto Pedagógico',            municipality: 'Riohacha',           initials: 'IP' },
  { name: 'IE Comfamiliar',                  municipality: 'Riohacha',           initials: 'CF' },
  { name: 'C.E. Ware Waren',                 municipality: 'Manaure',            initials: 'WW' },
  { name: 'IE Paulo VI',                     municipality: 'Riohacha',           initials: 'PV' },
  { name: 'IE Camino al Futuro',             municipality: 'Albania',            initials: 'CA' },
  { name: 'IE Colombia Mía',                 municipality: 'Maicao',             initials: 'CM' },
  { name: 'IE El Carmelo',                   municipality: 'San Juan del Cesar', initials: 'EC' },
] as const

const TRIPLED = [...SCHOOLS, ...SCHOOLS, ...SCHOOLS]

const STATS = [
  { value: 8,    label: 'Colegios'           },
  { value: 5,    label: 'Municipios'         },
  { value: 2026, label: 'Primera generación' },
]

const TITLE_WORDS = ['8', 'colegios.', 'Una', 'sola', 'familia.']

// ── Count-up stat number ───────────────────────────────────────────────────────
function StatNum({ to }: { to: number }) {
  const ref  = useRef<HTMLSpanElement>(null)
  const raf  = useRef<number>(0)
  const inV  = useInView(ref, { once: true, margin: '-60px' })
  const [v, setV] = useState(0)

  useEffect(() => {
    if (!inV) return
    const t0 = performance.now()
    const dur = 1200
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1)
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [inV, to])

  return <span ref={ref}>{v}</span>
}

// ── Individual school card — memoized to avoid ticker re-renders ───────────────
const SchoolCard = memo(function SchoolCard({
  name, municipality, initials, logoUrl,
}: { name: string; municipality: string; initials: string; logoUrl?: string }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <div className="stk-card">
      <div className="stk-card-top">
        <div className="stk-avatar" aria-hidden="true">
          {logoUrl && !imgErr ? (
            <img
              src={logoUrl}
              alt=""
              width={28}
              height={28}
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              onError={() => setImgErr(true)}
            />
          ) : initials}
        </div>
        <span className="stk-name">{name}</span>
      </div>
      <div className="stk-sep" aria-hidden="true" />
      <div className="stk-mun">
        <span className="stk-mun-label">{municipality}</span>
        <span className="stk-arrow" aria-hidden="true">→</span>
      </div>
    </div>
  )
})

// ── Main component ────────────────────────────────────────────────────────────
export default memo(function SchoolTicker() {
  const t              = useTranslations()
  const sectionRef     = useRef<HTMLElement>(null)
  const supabaseRef    = useRef<ReturnType<typeof createClient> | null>(null)
  const inView         = useInView(sectionRef, { once: true, margin: '-20% 0px' })
  const prefersReduced = useReducedMotion()
  const tickerWords    = t('landing.colegios.tickerTitle').split(' ')
  const statLabels     = [t('landing.colegios.statColegios'), t('landing.colegios.statMunicipios'), t('landing.colegios.statPrimeraGen')]

  // logoMap: school name → resolved public URL
  const [logoMap, setLogoMap] = useState<Record<string, string>>({})

  // Fetch logos from Supabase — skipped in MOCK_MODE
  useEffect(() => {
    if (MOCK_MODE) return
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function fetchLogos() {
      const { data } = await sb!.from('schools').select('name, logo_url')
      if (!data) return
      const map: Record<string, string> = {}
      for (const row of data as { name: string; logo_url: string | null }[]) {
        if (!row.logo_url) continue
        // Resolve bare filename vs full URL — per CLAUDE.md convention
        const url = row.logo_url.startsWith('http')
          ? row.logo_url
          : sb!.storage.from('school-logos').getPublicUrl(row.logo_url).data.publicUrl
        map[row.name] = url
      }
      setLogoMap(map)
    }
    fetchLogos()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const shouldAnim = !prefersReduced && inView

  return (
    <section ref={sectionRef} id="nuestra-red" className="stk-section">
      <style>{`
        :root { --surface-1: var(--bg-2, #EFECE6); }
        [data-theme="dark"] { --surface-1: #1C1B19; }

        .stk-section {
          background: var(--bg, #F5F3EF);
          padding: 96px 0;
          border-top: 1px solid var(--line-strong, rgba(13,13,13,.14));
          overflow: hidden;
        }
        .stk-header {
          text-align: center;
          padding: 0 40px;
          margin-bottom: 40px;
        }
        .stk-eyebrow {
          font-family: "Satoshi", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--accent, #C0392B);
          margin-bottom: 14px;
        }
        .stk-title {
          font-family: "Satoshi", sans-serif;
          font-weight: 600;
          font-size: 36px;
          letter-spacing: -.5px;
          color: var(--ink, #0D0D0D);
          line-height: 1.2;
          margin-bottom: 12px;
        }
        .stk-sub {
          font-family: "Instrument Serif", serif;
          font-style: italic;
          font-size: 18px;
          color: var(--mute, #6B6B6B);
          line-height: 1.5;
        }

        /* ── Ticker rows ── */
        .stk-ticker-wrap {
          mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        /* BUG 1 FIX — only pause on devices that truly support hover (not touch) */
        @media (hover: hover) {
          .stk-ticker-wrap:hover .stk-row-inner {
            animation-play-state: paused;
          }
        }
        .stk-row { overflow: hidden; }
        .stk-row-inner {
          display: flex;
          width: max-content;
          padding: 4px 0;
        }
        .stk-row-1 .stk-row-inner {
          animation: stk-left 35s linear infinite;
        }
        .stk-row-2 .stk-row-inner {
          animation: stk-right 45s linear infinite;
        }
        @keyframes stk-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes stk-right {
          from { transform: translateX(-33.333%); }
          to   { transform: translateX(0); }
        }

        /* ── Card ── */
        .stk-card {
          width: 220px;
          margin-right: 12px;
          flex-shrink: 0;
          background: var(--surface-1, var(--bg-2, #EFECE6));
          border: 1px solid var(--line, rgba(13,13,13,.10));
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: var(--shadow-card, 0 1px 3px rgba(13,13,13,.06), 0 1px 2px rgba(13,13,13,.04));
          cursor: default;
          transition: border-color 200ms cubic-bezier(.22,1,.36,1),
                      box-shadow 200ms cubic-bezier(.22,1,.36,1);
          user-select: none;
        }
        .stk-card:hover {
          border-color: rgba(192,57,43,.3);
          box-shadow: var(--shadow-raised, 0 4px 16px rgba(13,13,13,.08), 0 2px 4px rgba(13,13,13,.04));
        }
        .stk-card-top {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .stk-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(192,57,43,.10);
          color: var(--accent, #C0392B);
          font-family: "Satoshi", sans-serif;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .stk-name {
          font-family: "Satoshi", sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--ink, #0D0D0D);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .stk-sep {
          height: 1px;
          background: var(--line, rgba(13,13,13,.10));
          margin: 8px 0;
        }
        .stk-mun {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .stk-mun-label {
          font-family: "Satoshi", sans-serif;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: var(--mute, #6B6B6B);
        }
        .stk-arrow {
          color: var(--mute, #6B6B6B);
          font-size: 12px;
        }

        /* ── Stats ── */
        .stk-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 32px;
          padding: 0 40px;
        }
        .stk-stat {
          flex: 1;
          text-align: center;
          padding: 0 32px;
          max-width: 240px;
        }
        .stk-stat-num {
          font-family: var(--font-mono, 'Geist Mono', 'JetBrains Mono', monospace);
          font-size: 28px;
          font-weight: 600;
          color: var(--ink, #0D0D0D);
          line-height: 1;
          margin-bottom: 6px;
        }
        .stk-stat-label {
          font-family: "Satoshi", sans-serif;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .14em;
          color: var(--mute, #6B6B6B);
        }
        .stk-stat-sep {
          width: 1px;
          height: 40px;
          background: var(--line, rgba(13,13,13,.10));
          flex-shrink: 0;
        }

        /* ── Reduced motion: static 4-col grid ── */
        @media (prefers-reduced-motion: reduce) {
          .stk-row-inner { animation-play-state: paused !important; }
          .stk-reduced-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            padding: 0 40px;
          }
        }

        /* ── Responsive ── */
        @media (max-width: 960px) {
          .stk-section  { padding: 80px 0; }
          .stk-header   { padding: 0 24px; }
          .stk-stats    { padding: 0 24px; }
          .stk-stat     { padding: 0 16px; }
          .stk-reduced-grid { grid-template-columns: repeat(2, 1fr); padding: 0 24px; }
        }
      `}</style>

      {/* ── Header text ── */}
      <div className="stk-header">
        <m.p
          className="stk-eyebrow"
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={shouldAnim ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >{t('landing.colegios.tickerEyebrow')}</m.p>

        <h2 className="stk-title" aria-label={t('landing.colegios.tickerTitle')}>
          {tickerWords.map((word, i) => (
            <m.span
              key={i}
              style={{ display: 'inline-block', marginRight: '0.28em' }}
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              animate={shouldAnim ? { opacity: 1, y: 0 } : {}}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.08 + i * 0.08 }}
            >{word}</m.span>
          ))}
        </h2>

        <m.p
          className="stk-sub"
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={shouldAnim ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.48 }}
        >
          {t('landing.colegios.tickerSub')}
        </m.p>
      </div>

      {/* ── Ticker rows (or static grid for reduced-motion) ── */}
      {prefersReduced ? (
        <div className="stk-reduced-grid">
          {SCHOOLS.map(s => (
            <SchoolCard key={s.name} {...s} logoUrl={logoMap[s.name]} />
          ))}
        </div>
      ) : (
        <m.div
          className="stk-ticker-wrap"
          initial={{ opacity: 0 }}
          animate={shouldAnim ? { opacity: 1 } : {}}
          transition={{ type: 'spring', stiffness: 180, damping: 26, delay: 0.2 }}
          aria-label="Colegios aliados"
        >
          {/* Row 1: left-moving */}
          <div className="stk-row stk-row-1" aria-hidden="true">
            <div className="stk-row-inner">
              {TRIPLED.map((s, i) => (
                <SchoolCard key={`r1-${i}`} {...s} logoUrl={logoMap[s.name]} />
              ))}
            </div>
          </div>

          {/* Row 2: right-moving */}
          <div className="stk-row stk-row-2" aria-hidden="true">
            <div className="stk-row-inner">
              {TRIPLED.map((s, i) => (
                <SchoolCard key={`r2-${i}`} {...s} logoUrl={logoMap[s.name]} />
              ))}
            </div>
          </div>
        </m.div>
      )}

      {/* ── Stats row ── */}
      <div className="stk-stats">
        {STATS.flatMap((s, i) => [
          i > 0 ? <div key={`sep-${i}`} className="stk-stat-sep" aria-hidden="true" /> : null,
          <m.div
            key={i}
            className="stk-stat"
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={shouldAnim ? { opacity: 1, y: 0 } : {}}
            transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.4 + i * 0.10 }}
          >
            <div className="stk-stat-num"><StatNum to={s.value} /></div>
            <div className="stk-stat-label">{statLabels[i]}</div>
          </m.div>,
        ])}
      </div>
    </section>
  )
})
