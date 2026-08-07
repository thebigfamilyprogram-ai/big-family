'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { m } from 'framer-motion'
import { Link } from 'next-view-transitions'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import type { LeaderProfile, DiplomaData } from '@/lib/diploma'
import { certNumber, makeCertId } from '@/lib/diploma'
import DiplomaCard from '@/components/DiplomaCard'

// ── Confetti ─────────────────────────────────────────────────────────────────

const C_COLORS = ['#C0392B', '#D4821A', '#F5F3EF', '#E8C44A', '#A93226']

// Deterministic particles — golden-angle spread, no Math.random
const PARTICLES = Array.from({ length: 72 }, (_, i) => ({
  id:       i,
  color:    C_COLORS[i % C_COLORS.length],
  left:     ((i * 137.508) % 100).toFixed(2),
  delay:    ((i % 24) * 0.025).toFixed(3),
  duration: (1.6 + (i % 7) * 0.25).toFixed(2),
  tx:       ((i % 21) - 10) * 16,         // –160 to 160px
  rot:      (i * 67) % 720,
  size:     4 + (i % 4) * 2,
  circle:   i % 3 === 0,
}))

// Remove confetti from DOM after last particle fades out
const CONFETTI_TTL =
  Math.max(...PARTICLES.map(p => parseFloat(p.duration) + parseFloat(p.delay))) * 1000 + 300

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CertificacionPage() {
  const params      = useParams()
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const rawId     = params?.id
  const studentId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? (rawId[0] ?? '') : ''

  const [loading,        setLoading]        = useState(true)
  const [data,           setData]           = useState<DiplomaData | null>(null)
  const [confettiActive, setConfettiActive] = useState(false)
  const [authed,         setAuthed]         = useState(false)
  const [qrDataUrl,      setQrDataUrl]      = useState<string | null>(null)

  // Remove confetti particles after animations complete
  useEffect(() => {
    if (!confettiActive) return
    const t = setTimeout(() => setConfettiActive(false), CONFETTI_TTL)
    return () => clearTimeout(t)
  }, [confettiActive])

  // Data fetch
  useEffect(() => {
    if (!studentId) { router.replace('/dashboard'); return }

    // MOCK_MODE: skip Supabase entirely
    if (MOCK_MODE) {
      const d = {
        ...MOCK.mockDiploma,
        leaderProfile: {
          arquetipo: 'Líder Visionaria',
          big_five:  { O: 85, C: 42, E: 78, A: 38, N: 35, ES: 65 },
        },
      }
      setData(d)
      setAuthed(true)
      const mockCertId = 'BF2026MOCKDATA'
      const url = `https://big-family-nu.vercel.app/verify/${mockCertId}`
      import('qrcode').then(QR => QR.default.toDataURL(url, { width: 128, margin: 1, color: { dark: '#0D0D0D', light: '#FFFFFF' } }).then(setQrDataUrl).catch(console.error))
      setLoading(false)
      return
    }

    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return

    async function load() {
      // 1. Student's projects → find certified capstone
      const { data: projects } = await sb!
        .from('projects')
        .select('id')
        .eq('user_id', studentId)

      const projectIds = (projects ?? []).map((p: { id: string }) => p.id)

      let eval_: { resultado: string; created_at: string } | null = null
      if (projectIds.length > 0) {
        const { data } = await sb!
          .from('capstone_evaluations')
          .select('resultado, created_at')
          .in('resultado', ['certificado', 'mencion_honor'])
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        eval_ = data
      }

      if (!eval_) {
        router.replace('/dashboard')
        return
      }

      // 2. Parallel fetch — profile, XP, modules, viewer auth
      const [
        { data: profile },
        { data: xpRows },
        { data: progRows },
        { data: { user: viewer } },
      ] = await Promise.all([
        sb!.from('profiles').select('display_name, school_id, leadership_profile').eq('id', studentId).maybeSingle(),
        sb!.from('xp_log').select('amount').eq('user_id', studentId),
        sb!.from('progress').select('id').eq('user_id', studentId).eq('completed', true),
        sb!.auth.getUser(),
      ])
      if (viewer) setAuthed(true)

      // 3. School name
      const schoolId = (profile as { school_id?: string | null } | null)?.school_id
      let schoolName = ''
      if (schoolId) {
        const { data: school } = await sb!
          .from('schools').select('name').eq('id', schoolId).maybeSingle()
        schoolName = (school as { name: string } | null)?.name ?? ''
      }

      const rawProfile = profile as { display_name?: string | null; school_id?: string | null; leadership_profile?: unknown } | null
      const lp = rawProfile?.leadership_profile as LeaderProfile | null ?? null
      const resolvedData: DiplomaData = {
        studentName:      rawProfile?.display_name ?? 'Estudiante',
        schoolName,
        resultado:        eval_.resultado as 'certificado' | 'mencion_honor',
        certDate:         eval_.created_at,
        totalXP:          (xpRows ?? []).reduce((s: number, r: { amount: number | null }) => s + (r.amount ?? 0), 0),
        modulesCompleted: progRows?.length ?? 0,
        leaderProfile:    lp,
      }
      setData(resolvedData)

      // Register cert for QR verification + generate QR
      const cId = makeCertId(studentId, eval_.created_at)
      // Fire-and-forget cert registration
      sb!.from('issued_certificates')
        .upsert({ cert_id: cId, user_id: studentId }, { onConflict: 'cert_id' })
        .select()
        .then(() => {})
      const verifyUrl = `https://big-family-nu.vercel.app/verify/${cId}`
      import('qrcode').then(QR => QR.default.toDataURL(verifyUrl, { width: 128, margin: 1, color: { dark: '#0D0D0D', light: '#FFFFFF' } }).then(setQrDataUrl).catch(console.error))

      setLoading(false)
    }

    load()
  }, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="dp-page" style={{ justifyContent: 'center' }}>
        <style>{`@keyframes shimmer{0%{background-position:100% 50%}100%{background-position:0% 50%}}
        html.dark .dp-page{--bg:#FAF8F4;--bg-2:#EFECE6;--card-bg:#FFFFFF;--card-border:rgba(13,13,13,0.08);--ink:#0D0D0D;--ink-2:#2D2D2D;--mute:#6B6B6B;--line:rgba(13,13,13,0.10);}`}</style>
        <div style={{
          width: '100%', maxWidth: 720, margin: '0 24px',
          background: 'var(--card-bg,#fff)', borderRadius: 4,
          outline: '2px solid #C0392B',
          padding: '56px 64px',
          display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center',
        }}>
          {[140, 36, 260, 72, 180, 48, 120, 36].map((w, i) => (
            <div key={i} style={{
              width: w, height: 14, borderRadius: 6,
              background: 'linear-gradient(90deg,var(--bg-2,#EFECE6) 25%,var(--card-bg,#fff) 50%,var(--bg-2,#EFECE6) 75%)',
              backgroundSize: '400% 100%',
              animation: 'shimmer 1.4s ease infinite',
            }} />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  // ── Spring transition delays for staggered entrance (buttons row only —
  // the diploma content's own stagger lives inside DiplomaCard) ────────────────
  const sp = (delay: number) => ({
    type: 'spring' as const, stiffness: 120, damping: 20, delay,
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{font-family:"Satoshi",sans-serif;-webkit-font-smoothing:antialiased;}
        @keyframes cfall{
          0%  {opacity:1;transform:translateY(-20px) translateX(0) rotate(0deg);}
          85% {opacity:.8;}
          100%{opacity:0;transform:translateY(110vh) translateX(var(--tx)) rotate(var(--rot));}
        }
        .dp-page{
          min-height:100dvh;background:var(--bg,#FAF8F4);
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:40px 24px 60px;
        }
        @media print{
          .no-print,.dp-confetti{display:none!important;}
          html,body{background:#FAF8F4!important;}
          .dp-page{background:#FAF8F4!important;padding:0!important;min-height:auto!important;}
        }
        /* Diploma is always light — override dark-mode tokens within this page */
        html.dark .dp-page{
          --bg:#FAF8F4;--bg-2:#EFECE6;--card-bg:#FFFFFF;--card-border:rgba(13,13,13,0.08);
          --ink:#0D0D0D;--ink-2:#2D2D2D;--mute:#6B6B6B;
          --line:rgba(13,13,13,0.10);--line-soft:rgba(13,13,13,0.06);
        }
      `}</style>

      {/* Confetti — fixed overlay, removed from DOM after TTL */}
      {confettiActive && PARTICLES.map(p => (
        <div
          key={p.id}
          className="dp-confetti"
          style={{
            position: 'fixed', top: 0, left: `${p.left}%`,
            width: p.size, height: p.circle ? p.size : Math.round(p.size * 1.6),
            borderRadius: p.circle ? '50%' : 2,
            background: p.color,
            pointerEvents: 'none', zIndex: 9999,
            animation: `cfall ${p.duration}s ${p.delay}s ease-in both`,
            '--tx': `${p.tx}px`,
            '--rot': `${p.rot}deg`,
          } as React.CSSProperties}
        />
      ))}

      {/* Page wrapper — fades in first */}
      <m.div
        className="dp-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Diploma card — spring entry, fires confetti on complete */}
        <m.div
          style={{ width: '100%', maxWidth: 900 }}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.3 }}
          onAnimationComplete={() => setConfettiActive(true)}
        >
          <DiplomaCard
            data={data}
            certNumberText={certNumber(studentId, data.certDate)}
            qrDataUrl={qrDataUrl}
            animated
          />
        </m.div>

        {/* Botones — solo para usuarios autenticados, ocultos en print */}
        {authed && <m.div
          className="no-print"
          style={{
            display: 'flex', gap: 12, marginTop: 28,
            flexWrap: 'wrap', justifyContent: 'center',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={sp(2.0)}
        >
          <button
            onClick={() => window.print()}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink,#0D0D0D)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,13,13,.25)' }}
            style={{
              padding: '11px 24px',
              border: '1.5px solid rgba(13,13,13,.25)', borderRadius: 999,
              background: 'transparent',
              fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14,
              color: 'var(--ink,#0D0D0D)', cursor: 'pointer', transition: 'border-color .2s',
            }}
          >
            Imprimir certificado
          </button>

          <Link
            href="/dashboard"
            style={{
              padding: '11px 24px',
              border: '1.5px solid transparent', borderRadius: 999,
              fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14,
              color: 'var(--mute,#6B6B6B)', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center',
              transition: 'color .2s',
            }}
          >
            Volver al dashboard
          </Link>
        </m.div>}
      </m.div>
    </>
  )
}
