'use client'

import { useState, useEffect, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'

export type QuestionType = 'multiple_choice' | 'true_false' | 'reflection'

export interface Question {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  correct_answer?: string
}

interface Props {
  question: Question
  onChange: (answer: string | null) => void
  onTabSwitch?: (totalSwitches: number) => void
}

export default function QuizQuestion({ question, onChange, onTabSwitch }: Props) {
  const [selected, setSelected]     = useState<string | null>(null)
  const [text, setText]             = useState('')
  const [pasteWarn, setPasteWarn]   = useState(false)
  const [tabWarn, setTabWarn]       = useState(false)
  const shuffledRef                  = useRef<string[]>([])
  const tabSwitchesRef               = useRef(0)
  const tabWarnTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detect tab switches: increment counter, notify parent, show ephemeral warning
  useEffect(() => {
    function onVisibility() {
      if (!document.hidden) return
      tabSwitchesRef.current += 1
      onTabSwitch?.(tabSwitchesRef.current)
      setTabWarn(true)
      if (tabWarnTimerRef.current) clearTimeout(tabWarnTimerRef.current)
      tabWarnTimerRef.current = setTimeout(() => setTabWarn(false), 3000)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (tabWarnTimerRef.current) clearTimeout(tabWarnTimerRef.current)
    }
  }, [onTabSwitch])

  // Shuffle options once per question instance (key-based reset handles re-mount)
  if (shuffledRef.current.length === 0 && question.type === 'multiple_choice' && question.options) {
    shuffledRef.current = [...question.options].sort(() => Math.random() - 0.5)
  }

  const wordCount = text.trim().split(/\s+/).filter(w => w).length

  function handleSelect(val: string) {
    setSelected(val)
    onChange(val)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setText(val)
    const wc = val.trim().split(/\s+/).filter(w => w).length
    onChange(wc >= 50 ? val : null)
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    setPasteWarn(true)
    setTimeout(() => setPasteWarn(false), 3000)
  }

  return (
    <div>
      {/* Tab-switch warning banner */}
      <AnimatePresence>
        {tabWarn && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              marginBottom: 16,
              padding: '10px 16px',
              borderRadius: 10,
              background: 'rgba(192,57,43,0.08)',
              border: '1px solid rgba(192,57,43,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: '"Satoshi",sans-serif',
              fontSize: 13,
              color: 'var(--accent,#C0392B)',
              fontWeight: 500,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Cambio de pestaña detectado — mantén el foco en el quiz
          </m.div>
        )}
      </AnimatePresence>

      {/* Question text */}
      <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 20, color: 'var(--ink)', marginBottom: 28, lineHeight: 1.45 }}>
        {question.question}
      </div>

      {/* Multiple choice */}
      {question.type === 'multiple_choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shuffledRef.current.map(opt => {
            const isSel = selected === opt
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 20px',
                  border: `1.5px solid ${isSel ? '#C0392B' : 'rgba(13,13,13,0.08)'}`,
                  borderRadius: 12,
                  background: isSel ? 'rgba(192,57,43,0.06)' : 'var(--card-bg)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isSel ? '#C0392B' : '#ccc'}`,
                  background: isSel ? '#C0392B' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}>
                  {isSel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <span style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.4 }}>{opt}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* True / False */}
      {question.type === 'true_false' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { val: 'true',  label: '✓ Verdadero', selBg: 'rgba(39,174,96,0.08)', selBorder: '#27AE60', selColor: '#16a34a' },
            { val: 'false', label: '✗ Falso',      selBg: 'rgba(192,57,43,0.08)', selBorder: '#C0392B', selColor: '#C0392B' },
          ].map(opt => {
            const isSel = selected === opt.val
            return (
              <button
                key={opt.val}
                onClick={() => handleSelect(opt.val)}
                style={{
                  padding: '28px 16px',
                  border: `2px solid ${isSel ? opt.selBorder : 'rgba(13,13,13,0.08)'}`,
                  borderRadius: 14,
                  background: isSel ? opt.selBg : 'var(--card-bg)',
                  cursor: 'pointer',
                  fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 17,
                  color: isSel ? opt.selColor : 'var(--ink)',
                  transition: 'all .15s',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Reflection */}
      {question.type === 'reflection' && (
        <div>
          <textarea
            value={text}
            onChange={handleTextChange}
            onCopy={e => e.preventDefault()}
            onPaste={handlePaste}
            placeholder="Escribe tu reflexión aquí..."
            style={{
              width: '100%', minHeight: 160,
              padding: '14px 16px',
              border: '1.5px solid rgba(13,13,13,0.12)',
              borderRadius: 12,
              fontSize: 15, fontFamily: 'Satoshi,sans-serif',
              resize: 'vertical', outline: 'none', lineHeight: 1.65,
              color: 'var(--ink)', background: 'var(--bg-2)',
              transition: 'border-color .2s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--ink)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(13,13,13,0.12)')}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: wordCount >= 50 ? '#16a34a' : '#9a9690' }}>
              {wordCount} palabras (mínimo 50)
            </span>
            {pasteWarn && (
              <span style={{ fontSize: 12, color: '#C0392B', fontWeight: 500 }}>
                Las respuestas deben ser originales
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
