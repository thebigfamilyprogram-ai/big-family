'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion as m } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'
import { BFI44, DIMENSION_LABELS, getQuestions, type BFIQuestion } from '@/lib/bigFiveQuestions'

// ── Spring presets ────────────────────────────────────────────────────────────
const springSnappy = { type: 'spring' as const, stiffness: 200, damping: 22 }
const springNatural = { type: 'spring' as const, stiffness: 140, damping: 20 }

// ── Mock result ───────────────────────────────────────────────────────────────
const MOCK_RESULT = {
  arquetipo:           'Líder Visionaria',
  descripcion:         'Tienes una capacidad natural para ver lo que otros no ven. Tu energía y apertura generan movimiento a tu alrededor, y tu capacidad de inspirar es genuina. Eres el tipo de líder que define hacia dónde va el grupo, no quien solo lo sigue.',
  mensaje_bienvenida:  'Valentina, tu manera de conectar ideas con acción es lo que el programa necesita. Tu ruta comienza ahora.',
  fortaleza_principal: 'Tu mayor fortaleza es la capacidad de transformar visiones abstractas en entusiasmo concreto.',
  reto_principal:      'Tu reto es aprender a construir estructuras que sostengan tus ideas cuando la energía inicial se agota.',
  fortalezas:          ['Norte', 'Acción'],
  areas_crecimiento:   ['Yo', 'Vínculo'],
  big_five:            { O: 85, C: 42, E: 78, A: 38, N: 35, ES: 65 },
}

// ── Options ───────────────────────────────────────────────────────────────────
const SENIOR_OPTIONS = [
  { value: 1, label: 'Muy en desacuerdo' },
  { value: 2, label: 'En desacuerdo' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'De acuerdo' },
  { value: 5, label: 'Muy de acuerdo' },
]

// SVG face expressions for junior (simple circles with expression)
const JUNIOR_FACES = [
  { value: 1, label: 'Para nada',     d: 'M9,14 Q12,11 15,14', fill: '#FEE2E2' },  // sad
  { value: 2, label: 'Poco',          d: 'M9,13.5 Q12,12 15,13.5', fill: '#FEF3C7' }, // slight frown
  { value: 3, label: 'Más o menos',   d: 'M9,13 L15,13', fill: '#F1F5F9' },            // neutral
  { value: 4, label: 'Bastante',      d: 'M9,13 Q12,15.5 15,13', fill: '#D1FAE5' },    // slight smile
  { value: 5, label: 'Totalmente',    d: 'M8,12.5 Q12,16.5 16,12.5', fill: '#DCFCE7' }, // big smile
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function OnboardingTestPage() {
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [track, setTrack] = useState<'senior' | 'junior'>('senior')
  const [questions, setQuestions] = useState<BFIQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [direction, setDirection] = useState<1 | -1>(1)
  const [phase, setPhase] = useState<'loading' | 'test' | 'analyzing'>('loading')
  const [userName, setUserName] = useState('Estudiante')
  const [advancing, setAdvancing] = useState(false)

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      if (MOCK_MODE) {
        const qs = getQuestions('senior')
        setTrack('senior')
        setQuestions(qs)
        setUserName('Valentina')
        setPhase('test')
        return
      }

      if (!supabaseRef.current) supabaseRef.current = createClient()
      const supabase = supabaseRef.current
      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, level, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.onboarding_completed) {
        router.replace('/dashboard')
        return
      }

      const isJunior = profile?.level?.toLowerCase().includes('junior') ?? false
      const resolvedTrack = isJunior ? 'junior' : 'senior'
      const qs = getQuestions(resolvedTrack)

      setTrack(resolvedTrack)
      setQuestions(qs)
      setUserName(profile?.display_name ?? 'Estudiante')
      setPhase('test')
    }
    boot()
  }, [router])

  // ── Select answer ─────────────────────────────────────────────────────────
  const selectAnswer = useCallback(async (value: number) => {
    if (advancing) return
    const q = questions[currentIndex]
    if (!q) return

    const newAnswers = { ...answers, [q.id]: value }
    setAnswers(newAnswers)

    const isLast = currentIndex === questions.length - 1

    if (isLast) {
      setPhase('analyzing')

      if (MOCK_MODE) {
        await new Promise(r => setTimeout(r, 2000))
        sessionStorage.setItem('bf_result', JSON.stringify(MOCK_RESULT))
        router.push('/onboarding/resultado')
        return
      }

      // Build answers map with numeric keys (API needs Record<number, number>)
      const answersForApi: Record<number, number> = {}
      for (const [k, v] of Object.entries(newAnswers)) {
        answersForApi[Number(k)] = v
      }

      try {
        const res = await fetch('/api/leadership/assess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: answersForApi, track, name: userName }),
        })
        if (!res.ok) throw new Error('API error')
        const result = await res.json()
        sessionStorage.setItem('bf_result', JSON.stringify(result))
        router.push('/onboarding/resultado')
      } catch {
        // Fallback: still navigate, resultado page will retry from Supabase
        router.push('/onboarding/resultado')
      }
      return
    }

    // Auto-advance
    setAdvancing(true)
    setTimeout(() => {
      setDirection(1)
      setCurrentIndex(i => i + 1)
      setAdvancing(false)
    }, 300)
  }, [advancing, answers, currentIndex, questions, router, track, userName])

  // ── Keyboard (1-5) ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'test') return
    const handler = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= 5) selectAnswer(n)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, selectAnswer])

  const progress = questions.length > 0 ? (currentIndex / questions.length) : 0
  const q = questions[currentIndex]

  // ── Analyzing screen ──────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
      }}>
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springNatural}
          style={{ textAlign: 'center' }}
        >
          <p style={{
            fontFamily: 'Satoshi, sans-serif',
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(245,243,239,0.45)',
            marginBottom: 20,
          }}>
            Procesando tu perfil
          </p>
          <p style={{
            fontFamily: '"Instrument Serif", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.4rem, 4vw, 2rem)',
            color: 'var(--bg)',
            marginBottom: 40,
            lineHeight: 1.3,
          }}>
            Construyendo tu perfil de líder
          </p>
          <DotsLoader />
        </m.div>
      </div>
    )
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (phase === 'loading' || !q) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--mute)', opacity: 0.4 }} />
      </div>
    )
  }

  // ── Test UI ───────────────────────────────────────────────────────────────
  const answered = answers[q.id]
  const displayText = track === 'junior' && q.textJunior ? q.textJunior : q.text

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        background: 'var(--bg)',
      }}>
        <span style={{
          fontFamily: 'Satoshi, sans-serif',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink)',
          whiteSpace: 'nowrap',
        }}>
          THE BIG FAMILY
        </span>

        {/* Progress bar */}
        <div style={{
          flex: 1,
          height: 2,
          background: 'var(--line)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <m.div
            style={{ height: '100%', background: '#C0392B', borderRadius: 2, originX: 0 }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={springNatural}
          />
        </div>

        <span style={{
          fontFamily: 'Satoshi, sans-serif',
          fontSize: 12,
          color: 'var(--mute)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}>
          {currentIndex + 1} / {questions.length}
        </span>
      </header>

      {/* Question area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 24px 60px',
        maxWidth: 720,
        margin: '0 auto',
        width: '100%',
      }}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <m.div
            key={currentIndex}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d * 40, opacity: 0 }),
              center:              ({ x: 0, opacity: 1 }),
              exit:  (d: number) => ({ x: d * -40, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springSnappy}
            style={{ width: '100%', textAlign: 'center' }}
          >
            {/* Eyebrow — senior only */}
            {track === 'senior' && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: 100,
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                marginBottom: 28,
              }}>
                <span style={{
                  fontFamily: 'Satoshi, sans-serif',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--mute)',
                }}>
                  {DIMENSION_LABELS[q.dimension]}
                </span>
              </div>
            )}

            {/* Question text */}
            <p style={{
              fontFamily: 'Satoshi, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
              lineHeight: 1.35,
              color: 'var(--ink)',
              marginBottom: 52,
              textWrap: 'balance',
            }}>
              {displayText}
            </p>

            {/* Response options */}
            {track === 'senior' ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                justifyContent: 'center',
              }}>
                {SENIOR_OPTIONS.map(opt => (
                  <m.button
                    key={opt.value}
                    onClick={() => selectAnswer(opt.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springSnappy}
                    style={{
                      padding: '12px 20px',
                      borderRadius: 100,
                      border: answered === opt.value
                        ? '1.5px solid #C0392B'
                        : '1.5px solid var(--line)',
                      background: answered === opt.value ? '#C0392B' : 'var(--card-bg)',
                      color: answered === opt.value ? '#fff' : 'var(--ink)',
                      fontFamily: 'Satoshi, sans-serif',
                      fontSize: 14,
                      fontWeight: answered === opt.value ? 700 : 400,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {opt.label}
                  </m.button>
                ))}
              </div>
            ) : (
              /* Junior — large visual circles */
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                justifyContent: 'center',
              }}>
                {JUNIOR_FACES.map(face => (
                  <m.button
                    key={face.value}
                    onClick={() => selectAnswer(face.value)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    transition={springSnappy}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: answered === face.value ? '#C0392B' : face.fill,
                      border: answered === face.value ? '2.5px solid #C0392B' : '2px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}>
                      <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                        {/* Eyes */}
                        <circle cx={9} cy={10} r={1.5} fill={answered === face.value ? '#fff' : 'var(--ink)'} />
                        <circle cx={15} cy={10} r={1.5} fill={answered === face.value ? '#fff' : 'var(--ink)'} />
                        {/* Mouth */}
                        <path
                          d={face.d}
                          stroke={answered === face.value ? '#fff' : 'var(--ink)'}
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    </div>
                    <span style={{
                      fontFamily: 'Satoshi, sans-serif',
                      fontSize: 11,
                      color: answered === face.value ? '#C0392B' : 'var(--mute)',
                      letterSpacing: '0.02em',
                      fontWeight: answered === face.value ? 700 : 400,
                    }}>
                      {face.label}
                    </span>
                  </m.button>
                ))}
              </div>
            )}
          </m.div>
        </AnimatePresence>

        {/* Navigation dots */}
        <div style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}>
          {questions.slice(
            Math.max(0, currentIndex - 2),
            Math.min(questions.length, currentIndex + 3)
          ).map((_, rel) => {
            const absIdx = Math.max(0, currentIndex - 2) + rel
            const isCurrent = absIdx === currentIndex
            const isDone = answers[questions[absIdx]?.id] != null
            return (
              <div
                key={absIdx}
                style={{
                  width: isCurrent ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: isCurrent
                    ? '#C0392B'
                    : isDone
                      ? 'rgba(192,57,43,0.35)'
                      : 'var(--line)',
                  transition: 'width 0.25s, background 0.25s',
                }}
              />
            )
          })}
        </div>
      </main>
    </div>
  )
}

// ── Animated dots loader ───────────────────────────────────────────────────────
function DotsLoader() {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <m.div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#C0392B',
          }}
          animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.18,
            type: 'spring',
            stiffness: 120,
            damping: 8,
          }}
        />
      ))}
    </div>
  )
}
