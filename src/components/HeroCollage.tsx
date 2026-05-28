'use client'

import { memo, useRef } from 'react'
import {
  m,
  MotionValue,
  useMotionValue,
  useTransform,
  useSpring,
  useReducedMotion,
} from 'framer-motion'

// ── Data ──────────────────────────────────────────────────────────────────────

const CARDS = [
  { id: 1, flag: '🇨🇴', country: 'Colombia',       role: 'Sede principal',       depth: 1.0 },
  { id: 2, flag: '🇺🇸', country: 'Estados Unidos', role: 'Aliado estratégico',   depth: 0.6 },
  { id: 3, flag: '🇪🇸', country: 'España',          role: 'Aliado académico',     depth: 0.9 },
  { id: 4, flag: '🇲🇽', country: 'México',          role: 'Red latinoamericana',  depth: 0.5 },
  { id: 5, flag: '🇦🇷', country: 'Argentina',       role: 'Red latinoamericana',  depth: 0.8 },
  { id: 6, flag: '🇩🇪', country: 'Alemania',        role: 'Aliado académico',     depth: 0.4 },
  { id: 7, flag: '🇧🇷', country: 'Brasil',          role: 'Red latinoamericana',  depth: 0.7 },
  { id: 8, flag: '🇸🇦', country: 'Arabia Saudita',  role: 'Aliado global',        depth: 0.3 },
] as const

const POSITIONS = [
  { x: '5%',  y: '8%',  w: 160, rotate: -6 },
  { x: '48%', y: '3%',  w: 140, rotate:  4 },
  { x: '62%', y: '28%', w: 130, rotate: -3 },
  { x: '15%', y: '38%', w: 150, rotate:  5 },
  { x: '52%', y: '52%', w: 135, rotate: -4 },
  { x: '5%',  y: '65%', w: 145, rotate:  3 },
  { x: '35%', y: '72%', w: 125, rotate: -5 },
  { x: '65%', y: '68%', w: 130, rotate:  6 },
] as const

// Center points in 0-100 viewBox space for decorative SVG lines
// Approximated for a ~600×700 container: cx = x% + (w/600*100)/2, cy = y% + (h/700*100)/2
const SVG_CENTERS: readonly [number, number][] = [
  [18, 21], // Colombia
  [60, 14], // Estados Unidos
  [73, 39], // España
  [28, 50], // México
  [63, 63], // Argentina
  [17, 77], // Alemania
  [45, 82], // Brasil
  [76, 79], // Arabia Saudita
]

const BG_DOTS = [
  { cx: 82, cy: 14, delay: 0.2 },
  { cx: 40, cy: 30, delay: 1.1 },
  { cx:  8, cy: 50, delay: 0.7 },
  { cx: 70, cy: 48, delay: 1.8 },
  { cx: 88, cy: 58, delay: 0.4 },
  { cx: 25, cy: 90, delay: 1.4 },
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Photo {
  cardId: number
  url: string
  name: string
}

export interface HeroCollageProps {
  photos?: Photo[]
}

interface CardProps {
  card: typeof CARDS[number]
  pos: typeof POSITIONS[number]
  index: number
  mouseX: MotionValue<number>
  mouseY: MotionValue<number>
  reduced: boolean
  photo?: Photo
}

// ── SVG background: dashed connection lines + floating accent dots ─────────────

function ConnectionLines({ reduced }: { reduced: boolean }) {
  const col = SVG_CENTERS[0]
  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {SVG_CENTERS.slice(1).map(([cx, cy], i) => (
        <path
          key={i}
          d={`M ${col[0]} ${col[1]} L ${cx} ${cy}`}
          stroke="var(--accent, #C0392B)"
          strokeOpacity={0.06}
          strokeWidth={0.5}
          strokeDasharray="3 6"
          fill="none"
        />
      ))}

      {BG_DOTS.map((dot, i) => (
        <m.circle
          key={i}
          cx={dot.cx}
          cy={dot.cy}
          r={0.8}
          fill="var(--accent, #C0392B)"
          fillOpacity={0.08}
          animate={reduced ? {} : { y: [0, -2, 0, 1.5, 0] }}
          transition={{
            duration: 6 + i * 0.8,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: dot.delay,
          }}
        />
      ))}
    </svg>
  )
}

// ── Individual card — separate component so each has its own parallax hooks ───

const CollageCard = memo(function CollageCard({
  card, pos, index, mouseX, mouseY, reduced, photo,
}: CardProps) {
  const MAX_MOVE = 28
  const isOrigin = card.id === 1

  // Parallax: each depth layer moves proportionally to mouse position
  const rawX = useTransform(mouseX, [-0.5, 0.5], [-MAX_MOVE * card.depth,       MAX_MOVE * card.depth])
  const rawY = useTransform(mouseY, [-0.5, 0.5], [-MAX_MOVE * card.depth * 0.6, MAX_MOVE * card.depth * 0.6])
  const sX   = useSpring(rawX, { stiffness: 80, damping: 20 })
  const sY   = useSpring(rawY, { stiffness: 80, damping: 20 })

  const floatDur   = 5 + card.id * 0.6
  const floatDelay = card.id * 0.3

  return (
    // Level 1 — entrance animation
    <m.div
      className={`hc-card-${card.id}`}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: pos.w,
        zIndex: Math.round(card.depth * 10),
      }}
      initial={reduced ? false : { opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: index * 0.12 }}
    >
      {/* Level 2 — infinite float loop */}
      <m.div
        initial={{ rotate: pos.rotate }}
        animate={reduced ? { rotate: pos.rotate } : {
          y:      [0, -8, 0, 6, 0],
          rotate: [pos.rotate, pos.rotate - 1.5, pos.rotate, pos.rotate + 1, pos.rotate],
        }}
        transition={{
          duration:   floatDur,
          repeat:     reduced ? 0 : Infinity,
          repeatType: 'loop',
          ease:       'easeInOut',
          delay:      reduced ? 0 : floatDelay,
        }}
      >
        {/* Level 3 — mouse parallax */}
        <m.div style={reduced ? undefined : { x: sX, y: sY }}>

          <div style={{
            background: isOrigin
              ? 'linear-gradient(135deg, var(--surface-1, #EFECE6) 0%, rgba(192,57,43,0.04) 100%)'
              : 'var(--surface-1, #EFECE6)',
            border: isOrigin
              ? '1.5px solid rgba(192,57,43,0.3)'
              : '1px solid var(--line, rgba(13,13,13,0.1))',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 4px 16px rgba(13,13,13,0.08), 0 1px 3px rgba(13,13,13,0.04)',
            overflow: 'hidden',
            position: 'relative',
            userSelect: 'none',
          }}>

            {/* HQ badge — Colombia only */}
            {isOrigin && (
              <div style={{
                position: 'absolute',
                top: 10,
                right: 10,
                fontSize: 8,
                fontFamily: '"Satoshi", sans-serif',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'rgba(192,57,43,0.1)',
                color: 'var(--accent, #C0392B)',
                borderRadius: 999,
                padding: '2px 8px',
              }}>
                HQ
              </div>
            )}

            {/* Photo / flag area */}
            <div style={{
              width: '100%',
              height: 100,
              background: 'var(--bg-2, #E8E4DC)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {photo ? (
                <>
                  <img
                    src={photo.url}
                    alt={photo.name}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 10,
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 4,
                    background: 'rgba(0,0,0,0.55)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 10,
                    color: '#fff',
                    fontFamily: '"Satoshi", sans-serif',
                    lineHeight: 1.3,
                  }}>
                    {photo.name}
                  </div>
                  <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 16 }}>
                    {card.flag}
                  </div>
                </>
              ) : (
                <span
                  style={{ fontSize: 36, lineHeight: 1 }}
                  role="img"
                  aria-label={card.country}
                >
                  {card.flag}
                </span>
              )}
            </div>

            {/* Country + role */}
            <div style={{
              fontFamily: '"Satoshi", sans-serif',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--ink, #0D0D0D)',
              marginBottom: 3,
              lineHeight: 1.25,
            }}>
              {card.country}
            </div>
            <div style={{
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 11,
              color: 'var(--mute, #6B6B6B)',
              letterSpacing: '0.03em',
            }}>
              {card.role}
            </div>

          </div>
        </m.div>
      </m.div>
    </m.div>
  )
})

// ── Main component ────────────────────────────────────────────────────────────

export default memo(function HeroCollage({ photos = [] }: HeroCollageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX       = useMotionValue(0)
  const mouseY       = useMotionValue(0)
  const reduced      = useReducedMotion() ?? false

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width  - 0.5)
    mouseY.set((e.clientY - rect.top)  / rect.height - 0.5)
  }

  function handleMouseLeave() {
    // Spring in each card handles the smooth return to center
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <ConnectionLines reduced={reduced} />

      {CARDS.map((card, i) => (
        <CollageCard
          key={card.id}
          card={card}
          pos={POSITIONS[i]}
          index={i}
          mouseX={mouseX}
          mouseY={mouseY}
          reduced={reduced}
          photo={photos.find(p => p.cardId === card.id)}
        />
      ))}

      {/* Mobile: hide cards beyond index 3 via inline style injected once */}
      <style>{`
        @media(max-width:760px){
          .hc-card-5,.hc-card-6,.hc-card-7,.hc-card-8{display:none!important;}
        }
      `}</style>
    </div>
  )
})
