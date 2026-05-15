'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import QuizQuestion, { type Question } from '@/components/QuizQuestion'
import { ToastContainer, showToast } from '@/components/Toast'

interface ModMeta {
  title: string
  xp_reward: number
}

type Phase = 'loading' | 'blocked' | 'questions' | 'results'

interface Result {
  score: number
  passed: boolean
  tabSwitches: number
  attemptsUsed: number
}

const CONFETTI_COLORS = ['#C0392B', '#F39C12', '#27AE60', '#2980B9', '#8E44AD', '#F39C12', '#C0392B']

export default function QuizPage() {
  const { id: moduleId } = useParams<{ id: string }>()
  const router   = useRouter()
  const supabase = createClient()

  const [phase,        setPhase]       = useState<Phase>('loading')
  const [blockMsg,     setBlockMsg]    = useState('')
  const [mod,          setMod]         = useState<ModMeta>({ title: '', xp_reward: 0 })
  const [questions,    setQuestions]   = useState<Question[]>([])
  const [currentIdx,   setCurrentIdx]  = useState(0)
  const [answers,      setAnswers]     = useState<Record<string, string>>({})
  const [curAnswer,    setCurAnswer]   = useState<string | null>(null)
  const [result,       setResult]      = useState<Result | null>(null)
  const [submitting,   setSubmitting]  = useState(false)
  const [elapsed,      setElapsed]     = useState(0)
  const [xpDisplay,    setXpDisplay]   = useState(0)
  const [existingAtt,  setExistingAtt] = useState(0)

  const startTime   = useRef(Date.now())
  const tabSwitches = useRef(0)
  const userIdRef   = useRef<string | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load and check prerequisites
  useEffect(() => {
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      userIdRef.current = user.id

      const [{ data: modRow }, { data: vp }, { data: att }, { data: qs }] = await Promise.all([
        supabase.from('modules').select('title, xp_reward').eq('id', moduleId).maybeSingle(),
        supabase.from('video_progress').select('watched_percentage').eq('user_id', user.id).eq('module_id', moduleId).maybeSingle(),
        supabase.from('quiz_attempts').select('score').eq('user_id', user.id).eq('module_id', moduleId),
        supabase.from('questions').select('*').eq('module_id', moduleId).order('order_index'),
      ])

      setMod({ title: modRow?.title ?? '', xp_reward: modRow?.xp_reward ?? 100 })

      const watchedPct = vp?.watched_percentage ?? 0
      const attCount   = att?.length ?? 0
      setExistingAtt(attCount)

      if (watchedPct < 80) {
        setBlockMsg('Debes completar el video antes del cuestionario (mínimo 80%).')
        setPhase('blocked')
        return
      }
      if (attCount >= 2) {
        setBlockMsg('Has agotado tus intentos para este módulo.')
        setPhase('blocked')
        return
      }
      if (!qs || qs.length === 0) {
        setBlockMsg('Este módulo aún no tiene preguntas disponibles.')
        setPhase('blocked')
        return
      }

      setQuestions(qs as Question[])
      setPhase('questions')

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.current) / 1000))
      }, 1000)
    }
    boot()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [moduleId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Anti-cheat: tab visibility
  useEffect(() => {
    if (phase !== 'questions') return
    function onVisibility() {
      if (document.hidden) {
        tabSwitches.current += 1
        showToast('warning', `⚠ï¸ Saliste durante el cuestionario — esto queda registrado`)
      }
    }
    function onContextMenu(e: MouseEvent) { e.preventDefault() }
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('contextmenu', onContextMenu)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('contextmenu', onContextMenu)
    }
  }, [phase])

  // Count-up XP animation on results
  useEffect(() => {
    if (!result?.passed) return
    const target = mod.xp_reward
    let start = 0
    const step = Math.ceil(target / 40)
    const id = setInterval(() => {
      start = Math.min(start + step, target)
      setXpDisplay(start)
      if (start >= target) clearInterval(id)
    }, 30)
    return () => clearInterval(id)
  }, [result, mod.xp_reward])

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  function handleAnswer(answer: string | null) {
    setCurAnswer(answer)
  }

  async function handleNext() {
    if (!curAnswer) return
    const q = questions[currentIdx]
    const newAnswers = { ...answers, [q.id]: curAnswer }
    setAnswers(newAnswers)
    setCurAnswer(null)

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1)
    } else {
      await submitQuiz(newAnswers)
    }
  }

  async function submitQuiz(finalAnswers: Record<string, string>) {
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)

    const uid = userIdRef.current!
    const timeSpent = Math.floor((Date.now() - startTime.current) / 1000)

    // Score calculation
    let correct = 0
    questions.forEach(q => {
      const ans = finalAnswers[q.id] ?? ''
      if (q.type === 'reflection') {
        correct += ans.trim().split(/\s+/).filter(Boolean).length >= 50 ? 1 : 0
      } else {
        correct += ans === q.correct_answer ? 1 : 0
      }
    })
    const score  = Math.round((correct / questions.length) * 100)
    const passed = score >= 70
    const attNum = existingAtt + 1

    // Save attempt
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: uid, module_id: moduleId,
        attempt_number: attNum, score, passed,
        time_spent_seconds: timeSpent,
        tab_switches: tabSwitches.current,
      })
      .select('id')
      .maybeSingle()

    // Save answers
    if (attempt?.id) {
      await supabase.from('quiz_answers').insert(
        questions.map(q => ({
          attempt_id:  attempt.id,
          user_id:     uid,
          module_id:   moduleId,
          question_id: q.id,
          answer:      finalAnswers[q.id] ?? '',
        }))
      )
    }

    // Award XP and mark complete only on first pass
    if (passed) {
      const { data: prev } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('user_id', uid)
        .eq('module_id', moduleId)
        .eq('passed', true)
        .lt('attempt_number', attNum)
        .limit(1)

      if (!prev || prev.length === 0) {
        await supabase.from('progress').upsert(
          { user_id: uid, module_id: moduleId, completed: true, completed_at: new Date().toISOString() },
          { onConflict: 'user_id,module_id' }
        )
        await supabase.from('xp_log').insert({
          user_id: uid,
          amount: mod.xp_reward,
          reason: `Módulo completado: ${mod.title}`,
        })
      }
    }

    setResult({ score, passed, tabSwitches: tabSwitches.current, attemptsUsed: attNum })
    setPhase('results')
    setSubmitting(false)
  }

  const q = questions[currentIdx]
  const attemptsLeft = Math.max(0, 2 - (existingAtt + (phase === 'results' ? 1 : 0)))

  // ── Blocked ──────────────────────────────────────────────────────────────
  if (phase === 'blocked') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 20, padding: '40px 36px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 8px 32px -8px rgba(13,13,13,.12)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(192,57,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="1.8"/>
              <path d="M12 7v5M12 16h.01" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 10 }}>Acceso restringido</div>
          <p style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.6, marginBottom: 28 }}>{blockMsg}</p>
          <button
            onClick={() => router.push(`/dashboard/modules/${moduleId}`)}
            style={{ padding: '12px 28px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Volver al módulo
          </button>
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--line)', borderTopColor: '#C0392B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 14, color: 'var(--mute)' }}>Cargando cuestionario…</span>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (phase === 'results' && result) {
    return (
      <>
        <style>{`
          @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900&display=swap');
          *{box-sizing:border-box;margin:0;padding:0;}
          html,body{background:var(--bg);font-family:"Inter",system-ui,sans-serif;color:var(--ink);}
          @keyframes confetti-fall{
            0%{transform:translate(0,0) rotate(0deg) scale(1);opacity:1;}
            100%{transform:translate(var(--tx),var(--ty)) rotate(var(--rot)) scale(0);opacity:0;}
          }
          @keyframes check-pop{
            0%{transform:scale(0);opacity:0;}
            60%{transform:scale(1.2);}
            100%{transform:scale(1);opacity:1;}
          }
          .confetti-dot{position:absolute;width:10px;height:10px;border-radius:50%;
            animation:confetti-fall 0.8s ease-out forwards;pointer-events:none;}
        `}</style>

        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 24, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 16px 48px -12px rgba(13,13,13,.15)' }}>
            {/* Confetti (success only) */}
            {result.passed && CONFETTI_COLORS.map((color, i) => {
              const angle = (i / CONFETTI_COLORS.length) * 360
              const dist  = 80 + Math.random() * 60
              const tx    = `${Math.round(Math.cos(angle * Math.PI / 180) * dist)}px`
              const ty    = `${Math.round(Math.sin(angle * Math.PI / 180) * dist)}px`
              return (
                <div
                  key={i}
                  className="confetti-dot"
                  style={{
                    background: color,
                    top: '50%', left: '50%',
                    '--tx': tx, '--ty': ty,
                    '--rot': `${Math.round(Math.random() * 720)}deg`,
                    animationDelay: `${i * 0.06}s`,
                  } as React.CSSProperties}
                />
              )
            })}

            {/* Result icon */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: result.passed ? 'rgba(192,57,43,0.1)' : '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              animation: 'check-pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both',
            }}>
              {result.passed ? (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M7 18l7 7 15-14" stroke="#C0392B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M8 8l16 16M24 8L8 24" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>

            {/* Title */}
            <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: result.passed ? 32 : 28, color: 'var(--ink)', marginBottom: 8 }}>
              {result.passed ? '¡Módulo completado!' : 'Casi lo logras'}
            </div>

            {/* Score */}
            <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 52, color: '#C0392B', lineHeight: 1, marginBottom: 8 }}>
              {result.score}%
            </div>
            <p style={{ fontSize: 14, color: 'var(--mute)', marginBottom: result.passed ? 20 : 16 }}>
              {result.passed
                ? 'Superaste el 70% necesario para aprobar'
                : `Obtuviste ${result.score}% — necesitas 70% para aprobar`
              }
            </p>

            {/* XP badge (success) */}
            {result.passed && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: 'rgba(192,57,43,0.08)', borderRadius: 999, marginBottom: 20 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="#C0392B">
                  <path d="M7 0L9 5H14L10 8.5L12 14L7 10.5L2 14L4 8.5L0 5H5L7 0Z"/>
                </svg>
                <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 22, color: '#C0392B' }}>+{xpDisplay}</span>
                <span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}>XP ganados</span>
              </div>
            )}

            {/* Tab switch warning */}
            {result.tabSwitches > 0 && (
              <div style={{ padding: '10px 16px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, marginBottom: 20, fontSize: 13, color: '#92400E', textAlign: 'left' }}>
                ⚠ï¸ Nota: saliste {result.tabSwitches} {result.tabSwitches === 1 ? 'vez' : 'veces'} durante el módulo. Tu coordinador puede ver este registro.
              </div>
            )}

            {/* Retry info (fail) */}
            {!result.passed && attemptsLeft > 0 && (
              <p style={{ fontSize: 13.5, color: 'var(--mute)', lineHeight: 1.6, marginBottom: 24 }}>
                Te queda {attemptsLeft} intento{attemptsLeft !== 1 ? 's' : ''} más. Te recomendamos revisar el video antes de intentarlo de nuevo.
              </p>
            )}
            {!result.passed && attemptsLeft === 0 && (
              <p style={{ fontSize: 13.5, color: 'var(--mute)', lineHeight: 1.6, marginBottom: 24 }}>
                Has usado todos tus intentos para este módulo. Contacta a tu coordinador para más información.
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.passed && (
                <button
                  onClick={() => router.push('/dashboard/leadership-path')}
                  style={{ padding: '13px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
                >
                  Ver siguiente módulo →
                </button>
              )}
              {!result.passed && attemptsLeft > 0 && (
                <button
                  onClick={() => router.push(`/dashboard/modules/${moduleId}`)}
                  style={{ padding: '13px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
                >
                  Revisar el video
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                style={{ padding: '12px', background: 'transparent', color: 'var(--mute)', border: '1px solid var(--line)', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
              >
                Volver al dashboard
              </button>
            </div>
          </div>
        </div>
        <ToastContainer />
      </>
    )
  }

  // ── Questions ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,600,500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Inter",system-ui,sans-serif;color:var(--ink);}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--line)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{mod.title}</div>
            <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>Cuestionario</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--mute)' }}>⏱ {formatTime(elapsed)}</span>
            {attemptsLeft <= 1 && (
              <span style={{ padding: '3px 10px', borderRadius: 999, background: '#FFFBEB', color: '#92400E', fontSize: 12, fontWeight: 600 }}>
                {attemptsLeft === 1 ? '1 intento restante' : 'Ãšltimo intento'}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--line)', position: 'relative' }}>
          <div style={{ height: '100%', width: `${((currentIdx + 1) / questions.length) * 100}%`, background: '#C0392B', transition: 'width .4s ease' }} />
        </div>
        <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 12, color: 'var(--mute)', background: 'var(--card-bg)', borderBottom: '1px solid var(--line-soft)' }}>
          Pregunta {currentIdx + 1} de {questions.length}
        </div>

        {/* Question area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px 80px' }}>
          <div style={{ width: '100%', maxWidth: 620 }}>
            <AnimatePresence mode="wait">
              {q && (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                >
                  <QuizQuestion
                    key={q.id}
                    question={q}
                    onChange={handleAnswer}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button (not shown for reflection — it has its own) */}
            {q && q.type !== 'reflection' && (
              <button
                onClick={handleNext}
                disabled={!curAnswer || submitting}
                style={{
                  marginTop: 28,
                  width: '100%', padding: '14px',
                  background: curAnswer && !submitting ? '#C0392B' : '#e8e4df',
                  color: curAnswer && !submitting ? '#fff' : '#b0ada8',
                  border: 'none', borderRadius: 999,
                  fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15,
                  cursor: curAnswer && !submitting ? 'pointer' : 'not-allowed',
                  transition: 'all .2s',
                }}
              >
                {submitting ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    Enviando…
                  </span>
                ) : currentIdx < questions.length - 1 ? 'Siguiente →' : 'Enviar respuestas →'}
              </button>
            )}

            {/* Submit button for reflection after onChange fires */}
            {q && q.type === 'reflection' && (
              <button
                onClick={handleNext}
                disabled={!curAnswer || submitting}
                style={{
                  marginTop: 16,
                  width: '100%', padding: '14px',
                  background: curAnswer && !submitting ? '#C0392B' : '#e8e4df',
                  color: curAnswer && !submitting ? '#fff' : '#b0ada8',
                  border: 'none', borderRadius: 999,
                  fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15,
                  cursor: curAnswer && !submitting ? 'pointer' : 'not-allowed',
                  transition: 'all .2s',
                }}
              >
                {submitting ? 'Enviando…' : currentIdx < questions.length - 1 ? 'Siguiente →' : 'Enviar respuestas →'}
              </button>
            )}
          </div>
        </div>
      </div>

      <ToastContainer />
    </>
  )
}
