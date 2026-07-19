'use client'

import { useEffect, useRef, useState } from 'react'
import { Link } from 'next-view-transitions'
import { m, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'

const PHOTO_URL =
  'https://hkqzofpaozecjvfsmdum.supabase.co/storage/v1/object/public/campus-photos/colegio-albania-entrada.jpg'

export default function HeroArc() {
  const t = useTranslations('landing.heroArc')
  const prefersReduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const [imgError, setImgError] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  // Mounted guard: only apply MotionValue style after hydration to avoid mismatch
  const rightY = useTransform(scrollYProgress, [0, 1], [0, -48])

  return (
    <section className="ha" ref={heroRef} id="hero">

      {/* ── Left: editorial typography ─────────────────────────────────── */}
      <div className="ha-left">
        <m.div
          className="ha-eyebrow"
          initial={prefersReduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.05 }}
        >
          {t('eyebrow')}
        </m.div>

        <m.h1
          className="ha-h1"
          initial={prefersReduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.12 }}
        >
          {t('title')}<em>{t('titleAccent')}</em>
        </m.h1>

        <m.p
          className="ha-sub"
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.22 }}
        >
          {t('subtitle')}
        </m.p>

        <m.div
          className="ha-cta-row"
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.32 }}
        >
          <Link href="/submit" className="ha-btn">
            {t('cta')}
            <span className="ha-btn-arrow" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>

          <div className="ha-microstat" aria-label={`${t('studentCount')} ${t('studentCountLabel')}`}>
            <span className="ha-microstat-num" aria-hidden="true">{t('studentCount')}</span>
            <span className="ha-microstat-label" aria-hidden="true">{t('studentCountLabel')}</span>
          </div>
        </m.div>
      </div>

      {/* ── Right: arc SVG + photo ──────────────────────────────────────── */}
      <m.div
        className="ha-right"
        style={mounted ? { y: rightY } : undefined}
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.18 }}
      >
        <div className="ha-arc-wrap">
          <svg
            viewBox="0 0 400 400"
            className="ha-arc-svg"
            aria-hidden="true"
            focusable="false"
          >
            {/*
              Two independent arc strokes.
              <g transform="rotate(deg cx cy)"> positions each arc's start point
              around the circle. pathLength 0→N is the FM draw-in animation.
              strokeLinecap="butt" for the editorial / geometric feel (not rounded).
            */}

            {/* Arc 1 — accent colour, ~62% of circumference, upper-left origin */}
            <g transform="rotate(-115 200 200)">
              <m.circle
                cx={200} cy={200} r={178}
                fill="none"
                stroke="var(--accent,#C0392B)"
                strokeWidth="13"
                strokeLinecap="butt"
                initial={prefersReduced ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 0.62 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 48, damping: 18, delay: 0.08 }}
              />
            </g>

            {/* Arc 2 — ink colour, low opacity, ~40%, partially overlaps arc 1 */}
            <g transform="rotate(55 200 200)">
              <m.circle
                cx={200} cy={200} r={178}
                fill="none"
                stroke="var(--ink,#0D0D0D)"
                strokeWidth="9"
                strokeOpacity="0.16"
                strokeLinecap="butt"
                initial={prefersReduced ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 0.40 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 42, damping: 18, delay: 0.26 }}
              />
            </g>
          </svg>

          {/* Circular photo — sits inside the arc frame */}
          <div className="ha-photo-wrap">
            {!imgError ? (
              <img
                src={PHOTO_URL}
                alt="Entrada del Colegio Albania, La Guajira"
                className="ha-photo"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="ha-photo-ph" />
            )}
          </div>

          {/* Badge outside photo-wrap to avoid circular clip */}
          <div className="ha-badge" aria-hidden="true">{t('photoBadge')}</div>
        </div>
      </m.div>

      <style>{`
        .ha{
          position:relative;
          min-height:100dvh;
          display:grid;
          grid-template-columns:1fr 1.1fr;
          gap:56px;
          align-items:center;
          padding:120px 40px 80px;
          overflow:hidden;
        }
        .ha-left{
          position:relative;
          z-index:2;
          display:flex;
          flex-direction:column;
        }
        /* ── Eyebrow pill — same pattern as other section pills in the project ── */
        .ha-eyebrow{
          display:inline-flex;
          align-items:center;
          border:1px solid rgba(192,57,43,0.25);
          background:rgba(192,57,43,0.07);
          color:var(--accent,#C0392B);
          font-family:"Satoshi",sans-serif;
          font-size:10px;
          font-weight:700;
          letter-spacing:0.2em;
          text-transform:uppercase;
          border-radius:999px;
          padding:5px 14px;
          margin-bottom:28px;
          width:fit-content;
        }
        .ha-h1{
          font-family:"Satoshi",sans-serif;
          font-weight:900;
          font-size:clamp(36px,4.2vw,62px);
          line-height:1.04;
          letter-spacing:-0.04em;
          color:var(--ink,#0D0D0D);
          max-width:560px;
          margin-bottom:20px;
          font-synthesis:none;
        }
        /* Italic accent line — same pattern as h1.headline em elsewhere */
        .ha-h1 em{
          font-family:"Instrument Serif",serif;
          font-style:italic;
          font-weight:400;
          color:var(--accent,#C0392B);
          display:block;
        }
        .ha-sub{
          font-family:"Satoshi",sans-serif;
          font-size:15px;
          line-height:1.72;
          color:var(--mute,#6B6B6B);
          max-width:38ch;
          margin-bottom:36px;
        }
        .ha-cta-row{
          display:flex;
          align-items:center;
          gap:22px;
          flex-wrap:wrap;
        }
        /* Button-in-button pill: text + flush inner arrow circle */
        .ha-btn{
          display:inline-flex;
          align-items:center;
          padding:5px 5px 5px 22px;
          background:var(--accent,#C0392B);
          color:#fff;
          border-radius:999px;
          font-family:"Satoshi",sans-serif;
          font-weight:700;
          font-size:14px;
          text-decoration:none;
          gap:14px;
          transition:background 0.2s cubic-bezier(0.22,1,0.36,1);
        }
        .ha-btn:hover{background:#a93226;}
        .ha-btn:active{transform:scale(0.97);}
        .ha-btn-arrow{
          width:32px;
          height:32px;
          border-radius:50%;
          background:rgba(255,255,255,0.2);
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          transition:background 0.2s;
        }
        .ha-btn:hover .ha-btn-arrow{background:rgba(255,255,255,0.32);}
        /* Micro-stat: Instrument Serif italic number, Satoshi muted label */
        .ha-microstat{
          display:flex;
          align-items:baseline;
          gap:8px;
        }
        .ha-microstat-num{
          font-family:"Instrument Serif",serif;
          font-style:italic;
          font-weight:400;
          font-size:42px;
          color:var(--ink,#0D0D0D);
          line-height:1;
          letter-spacing:-0.02em;
        }
        .ha-microstat-label{
          font-family:"Satoshi",sans-serif;
          font-size:11px;
          color:var(--mute,#6B6B6B);
          line-height:1.45;
        }
        /* ── Right / Arc ── */
        .ha-right{
          position:relative;
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:1;
        }
        .ha-arc-wrap{
          position:relative;
          width:min(90%,520px);
          aspect-ratio:1;
        }
        .ha-arc-svg{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          overflow:visible;
        }
        /* Photo fills the interior of the arc, circular crop */
        .ha-photo-wrap{
          position:absolute;
          inset:14%;
          border-radius:50%;
          overflow:hidden;
          border:3px solid var(--bg,#F5F3EF);
        }
        .ha-photo{
          width:100%;
          height:100%;
          object-fit:cover;
          object-position:center 40%;
          filter:saturate(0.85) contrast(1.05);
          display:block;
        }
        .ha-photo-ph{
          width:100%;
          height:100%;
          background:var(--bg-2,#EFECE6);
        }
        /* Badge — lower-right of arc-wrap (outside circular clip) */
        .ha-badge{
          position:absolute;
          bottom:14%;
          right:4%;
          background:var(--ink,#0D0D0D);
          color:var(--bg,#F5F3EF);
          font-family:"Satoshi",sans-serif;
          font-size:9px;
          font-weight:700;
          letter-spacing:0.08em;
          border-radius:999px;
          padding:5px 11px;
          white-space:nowrap;
          pointer-events:none;
          z-index:4;
        }
        /* ── Mobile ── */
        @media(max-width:768px){
          .ha{
            grid-template-columns:1fr;
            padding:88px 20px 60px;
            gap:24px;
          }
          .ha-right{order:-1;}
          .ha-arc-wrap{width:min(85vw,340px);}
          .ha-h1{font-size:clamp(30px,7.5vw,46px);}
          .ha-microstat-num{font-size:34px;}
        }
        @media(max-width:440px){
          .ha-arc-wrap{width:min(88vw,280px);}
        }
        @media(prefers-reduced-motion:reduce){
          .ha-btn:active{transform:none;}
        }
      `}</style>
    </section>
  )
}
