'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { m } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'

// ── Types ─────────────────────────────────────────────────────────────────────
interface VerifiedData {
  studentName:      string
  schoolName:       string
  resultado:        'certificado' | 'mencion_honor'
  certDate:         string
  totalXP:          number
  modulesCompleted: number
  arquetipo:        string | null
  certId:           string
}

// ── Mock ──────────────────────────────────────────────────────────────────────
const MOCK_VERIFIED: VerifiedData = {
  studentName:      'Valentina Torres Ospino',
  schoolName:       'IE Técnica María Inmaculada',
  resultado:        'certificado',
  certDate:         '2026-05-16T00:00:00',
  totalXP:          1840,
  modulesCompleted: 7,
  arquetipo:        'Líder Visionaria',
  certId:           'BF2026MOCKDATA',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function extractUuid8(certId: string): string | null {
  // Expected format: BF{year}{uuid8} e.g. "BF20261A2B3C4D"
  if (!certId.startsWith('BF') || certId.length < 14) return null
  return certId.slice(6).toLowerCase()
}

const sp = (delay: number) => ({
  type: 'spring' as const, stiffness: 120, damping: 20, delay,
})

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ w = '100%', h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,var(--bg-2,#EFECE6) 25%,var(--card-bg,#fff) 50%,var(--bg-2,#EFECE6) 75%)',
      backgroundSize: '400% 100%', animation: 'vfy-shimmer 1.4s ease infinite',
    }} />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VerifyPage() {
  const params  = useParams()
  const rawId   = params?.certId
  const certId  = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? (rawId[0] ?? '') : ''
  const sbRef   = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,  setLoading]  = useState(true)
  const [verified, setVerified] = useState<VerifiedData | null>(null)
  const [invalid,  setInvalid]  = useState(false)
  const [verifiedAt] = useState(() => new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }))

  useEffect(() => {
    async function verify() {
      // MOCK_MODE — show Valentina data for any certId
      if (MOCK_MODE) {
        await new Promise(r => setTimeout(r, 600))
        setVerified(MOCK_VERIFIED)
        setLoading(false)
        return
      }

      if (!sbRef.current) sbRef.current = createClient()
      const sb = sbRef.current
      if (!sb) return

      // Try lookup table first (fast path — diploma has been opened)
      const { data: issuedRow } = await sb
        .from('issued_certificates')
        .select('user_id')
        .eq('cert_id', certId)
        .maybeSingle()

      let userId: string | null = issuedRow?.user_id ?? null

      // Fallback: derive userId from certId format BF{year}{uuid8}
      if (!userId) {
        const uuid8 = extractUuid8(certId)
        if (!uuid8) { setInvalid(true); setLoading(false); return }

        const { data: profiles } = await sb
          .from('profiles')
          .select('id')
          .ilike('id', `${uuid8}%`)
          .limit(1)

        userId = (profiles as { id: string }[] | null)?.[0]?.id ?? null
      }

      if (!userId) { setInvalid(true); setLoading(false); return }

      // Parallel: verify capstone + fetch student data
      const [
        { data: projectsRes },
        { data: prof },
        { data: xpRows },
        { data: progRows },
      ] = await Promise.all([
        sb.from('projects').select('id').eq('user_id', userId),
        sb.from('profiles').select('display_name, school_id, leadership_profile').eq('id', userId).maybeSingle(),
        sb.from('xp_log').select('amount').eq('user_id', userId),
        sb.from('progress').select('id').eq('user_id', userId).eq('completed', true),
      ])

      const projectIds = (projectsRes ?? []).map((p: { id: string }) => p.id)
      let eval_: { resultado: string; created_at: string } | null = null

      if (projectIds.length > 0) {
        const { data } = await sb
          .from('capstone_evaluations')
          .select('resultado, created_at')
          .in('resultado', ['certificado', 'mencion_honor'])
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        eval_ = data
      }

      if (!eval_) { setInvalid(true); setLoading(false); return }

      // Fetch school name
      const profileTyped = prof as { display_name?: string | null; school_id?: string | null; leadership_profile?: unknown } | null
      let schoolName = ''
      if (profileTyped?.school_id) {
        const { data: school } = await sb.from('schools').select('name').eq('id', profileTyped.school_id).maybeSingle()
        schoolName = (school as { name: string } | null)?.name ?? ''
      }

      const lp = profileTyped?.leadership_profile as { arquetipo?: string } | null

      // Log this verification (analytics)
      try {
        await sb.from('certificate_verifications').insert({
          cert_id: certId, user_id: userId,
        })
      } catch { /* non-fatal */ }

      setVerified({
        studentName:      profileTyped?.display_name ?? 'Estudiante',
        schoolName,
        resultado:        eval_.resultado as 'certificado' | 'mencion_honor',
        certDate:         eval_.created_at,
        totalXP:          (xpRows ?? []).reduce((s: number, r: { amount: number | null }) => s + (r.amount ?? 0), 0),
        modulesCompleted: progRows?.length ?? 0,
        arquetipo:        lp?.arquetipo ?? null,
        certId,
      })
      setLoading(false)
    }
    verify()
  }, [certId])

  return (
    <>
      <style>{`
        @keyframes vfy-shimmer{0%{background-position:100% 50%}100%{background-position:0% 50%}}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{font-family:"Satoshi",sans-serif;-webkit-font-smoothing:antialiased;background:var(--bg,#FAF8F4);}
        .vfy-page{min-height:100dvh;background:var(--bg,#FAF8F4);display:flex;flex-direction:column;align-items:center;padding:60px 24px 80px;}
        .vfy-inner{width:100%;max-width:680px;}
        .vfy-header{text-align:center;margin-bottom:40px;}
        .vfy-brand{font-family:"Satoshi",sans-serif;font-weight:700;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--ink,#0D0D0D);margin-bottom:16px;}
        .vfy-divider{height:1px;background:#C0392B;opacity:.35;margin-bottom:40px;}
        .vfy-card{background:var(--card-bg,#FFFFFF);border:1px solid var(--card-border,rgba(13,13,13,.08));border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(13,13,13,.06);}
        .vfy-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:20px;}
        .vfy-pill.ok{background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;}
        .vfy-pill.fail{background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;}
        .vfy-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(1.4rem,4vw,2rem);color:var(--ink,#0D0D0D);margin-bottom:10px;letter-spacing:-0.02em;}
        .vfy-sub{font-family:"Satoshi",sans-serif;font-size:15px;color:var(--mute,#6B6B6B);line-height:1.65;margin-bottom:28px;}
        .vfy-sep{height:1px;background:var(--line);margin:28px 0;}
        .vfy-name{font-family:"Instrument Serif",serif;font-style:italic;font-size:clamp(1.6rem,5vw,2.2rem);color:var(--ink,#0D0D0D);text-align:center;margin-bottom:6px;line-height:1.2;}
        .vfy-arquetipo{font-family:"Instrument Serif",serif;font-style:italic;font-size:1rem;color:#C0392B;text-align:center;margin-bottom:16px;}
        .vfy-meta{text-align:center;font-family:"Satoshi",sans-serif;font-size:13.5px;color:var(--mute,#6B6B6B);margin-bottom:8px;}
        .vfy-badge{display:inline-block;padding:4px 12px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;letter-spacing:.06em;}
        .vfy-badge.cert{background:#D1FAE5;color:#065F46;}
        .vfy-badge.honor{background:rgba(212,130,26,.12);color:#92400E;}
        .vfy-stats{display:flex;justify-content:center;gap:0;margin-top:16px;border-top:1px solid var(--line,rgba(13,13,13,.08));padding-top:16px;}
        .vfy-stat{flex:1;text-align:center;padding:0 16px;}
        .vfy-stat:not(:last-child){border-right:1px solid var(--line,rgba(13,13,13,.08));}
        .vfy-stat__num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:24px;color:#C0392B;font-variant-numeric:tabular-nums;}
        .vfy-stat__lbl{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute,#6B6B6B);margin-top:3px;}
        .vfy-logos{display:flex;align-items:center;justify-content:center;gap:20px;margin:24px 0 0;}
        .vfy-logo{height:36px;object-fit:contain;filter:grayscale(1);opacity:.55;}
        .vfy-footer{margin-top:32px;text-align:center;}
        .vfy-footer-date{font-family:"Satoshi",sans-serif;font-size:12px;color:var(--mute,#6B6B6B);margin-bottom:6px;}
        .vfy-footer-certid{font-family:"Satoshi",sans-serif;font-size:10px;letter-spacing:.2em;color:var(--mute,rgba(13,13,13,.35));text-transform:uppercase;margin-bottom:16px;}
        .vfy-cta{display:inline-flex;align-items:center;gap:4px;font-family:"Satoshi",sans-serif;font-size:13px;font-weight:600;color:#C0392B;text-decoration:none;margin-bottom:20px;}
        .vfy-cta:hover{text-decoration:underline;}
        .vfy-legal{font-family:"Satoshi",sans-serif;font-size:11px;color:var(--mute,rgba(13,13,13,.3));line-height:1.6;max-width:480px;margin:0 auto;}
        @media(max-width:480px){.vfy-card{padding:28px 20px;}.vfy-stats{flex-direction:column;gap:12px;}.vfy-stat:not(:last-child){border-right:none;border-bottom:1px solid var(--line,rgba(13,13,13,.08));padding-bottom:12px;}}
      `}</style>

      <div className="vfy-page">
        <div className="vfy-inner">

          {/* ── Institutional header ── */}
          <m.div
            className="vfy-header"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={sp(0)}
          >
            <p className="vfy-brand">The Big Family Program</p>
          </m.div>
          <div className="vfy-divider" />

          {/* ── Main verification card ── */}
          <m.div
            className="vfy-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={sp(0.1)}
          >
            {loading ? (
              /* Loading skeleton */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <Sk w={180} h={28} r={999} />
                <Sk w="60%" h={32} r={6} />
                <Sk w="80%" h={16} r={5} />
                <div style={{ height: 1, background: 'var(--line,rgba(13,13,13,.08))', width: '100%', margin: '8px 0' }} />
                <Sk w={160} h={36} r={6} />
                <Sk w={120} h={18} r={5} />
                <Sk w="40%" h={13} r={5} />
                <div style={{ display: 'flex', gap: 16 }}>
                  <Sk w={80} h={40} r={6} />
                  <Sk w={80} h={40} r={6} />
                </div>
              </div>
            ) : invalid ? (
              /* Invalid certificate */
              <>
                <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={sp(0.2)}>
                  <span className="vfy-pill fail">✗ CERTIFICADO NO VÁLIDO</span>
                </m.div>
                <h1 className="vfy-title">No pudimos verificar este certificado.</h1>
                <p className="vfy-sub">
                  El código puede ser incorrecto o el certificado puede haber sido revocado.
                  Si crees que es un error, contacta al programa directamente.
                </p>
                <a href="/" className="vfy-cta">Ir al sitio oficial →</a>
              </>
            ) : verified ? (
              /* Valid certificate */
              <>
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={sp(0.2)}
                >
                  <span className="vfy-pill ok">✓ CERTIFICADO VERIFICADO</span>
                </m.div>

                <h1 className="vfy-title">Este certificado es auténtico.</h1>
                <p className="vfy-sub">
                  The Big Family Program confirma que el siguiente estudiante completó
                  exitosamente la certificación The Big Leader.
                </p>

                <div className="vfy-sep" />

                {/* Student identity */}
                <m.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={sp(0.3)}
                >
                  <p className="vfy-name">{verified.studentName}</p>
                  {verified.arquetipo && (
                    <p className="vfy-arquetipo">{verified.arquetipo}</p>
                  )}
                  <p className="vfy-meta">{verified.schoolName}</p>
                  <p className="vfy-meta" style={{ marginBottom: 12 }}>
                    <span className={`vfy-badge ${verified.resultado === 'mencion_honor' ? 'honor' : 'cert'}`}>
                      {verified.resultado === 'mencion_honor' ? 'Mención de Honor' : 'Certificado'}
                    </span>
                    {' '}· {formatDate(verified.certDate)}
                  </p>

                  {/* Stats */}
                  <div className="vfy-stats">
                    <div className="vfy-stat">
                      <div className="vfy-stat__num">{verified.totalXP.toLocaleString('es-CO')}</div>
                      <div className="vfy-stat__lbl">Puntos de impacto</div>
                    </div>
                    <div className="vfy-stat">
                      <div className="vfy-stat__num">{verified.modulesCompleted}</div>
                      <div className="vfy-stat__lbl">Módulos completados</div>
                    </div>
                  </div>
                </m.div>

                <div className="vfy-sep" />

                {/* Validation logos */}
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={sp(0.4)}
                >
                  <p style={{ textAlign: 'center', fontFamily: '"Satoshi",sans-serif', fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: 'var(--mute,#6B6B6B)', marginBottom: 12 }}>
                    PROGRAMA RECONOCIDO POR
                  </p>
                  <div className="vfy-logos">
                    <img src="/cognia.png"                               alt="Cognia"                   className="vfy-logo" />
                    <img src="/International_Baccalaureate_Logo.svg.png" alt="International Baccalaureate" className="vfy-logo" />
                    <img src="/tri.png"                                  alt="Tri-Association"          className="vfy-logo" />
                  </div>
                </m.div>
              </>
            ) : null}
          </m.div>

          {/* ── Footer ── */}
          {verified && !loading && (
            <m.div
              className="vfy-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={sp(0.5)}
            >
              <p className="vfy-footer-date">Verificado el {verifiedAt}</p>
              <p className="vfy-footer-certid">{verified.certId}</p>
              <a href="/" className="vfy-cta">Ver programa completo →</a>
              <p className="vfy-legal">
                Este documento fue generado automáticamente por The Big Family Platform.
                Para consultas: <a href="mailto:luis.barrios@colegioalbania.edu.co" style={{ color: 'inherit' }}>luis.barrios@colegioalbania.edu.co</a>
              </p>
            </m.div>
          )}

        </div>
      </div>
    </>
  )
}
