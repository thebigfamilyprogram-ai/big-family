'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { m, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PortfolioData {
  userId:           string
  displayName:      string
  schoolName:       string
  level:            string | null
  username:         string
  arquetipo:        string | null
  big_five:         { O: number; C: number; E: number; A: number; N: number; ES: number } | null
  resultado:        'certificado' | 'mencion_honor' | null
  certDate:         string | null
  projectTitle:     string | null
  projectDesc:      string | null
  modulesCompleted: number
  totalXP:          number
  badgesCount:      number
  createdAt:        string
  metaNucleo:       string | null
  gvCreencias:      string | null
  gvParadigma:      string | null
  gvEquipo:         string[]
  gvPlanes:         string[]
  showCapstone:     boolean
  showGV:           boolean
  showXP:           boolean
}

// ── Mock ──────────────────────────────────────────────────────────────────────
const MOCK_DATA: PortfolioData = {
  userId:           'mock-user-1',
  displayName:      'Valentina Torres Ospino',
  schoolName:       'IE Técnica María Inmaculada',
  level:            'senior',
  username:         'valentina-torres-ospino',
  arquetipo:        'Líder Visionaria',
  big_five:         { O: 85, C: 42, E: 78, A: 38, N: 35, ES: 65 },
  resultado:        'certificado',
  certDate:         '2026-05-16T10:00:00',
  projectTitle:     'Red de Mentoría Estudiantil La Guajira',
  projectDesc:      'Diseñé e implementé una red de mentoría entre estudiantes de los 8 colegios participantes en el programa Big Family, conectando líderes estudiantiles con mentores de diferentes instituciones educativas de La Guajira. El programa logró impactar a más de 200 estudiantes en su primera fase piloto, generando comunidades de aprendizaje sostenibles que continuaron funcionando de manera autónoma tras la intervención inicial.',
  modulesCompleted: 7,
  totalXP:          1840,
  badgesCount:      5,
  createdAt:        '2026-01-15T08:00:00',
  metaNucleo:       'Crear un programa de mentoría entre estudiantes en los 8 colegios de La Guajira',
  gvCreencias:      'Creo que el liderazgo nace en la comunidad, no en los libros. Cada joven tiene algo valioso que enseñar.',
  gvParadigma:      'Veo en cada obstáculo una oportunidad de aprender. Mi comunidad tiene más fortalezas que problemas.',
  gvEquipo:         ['Luis B. — Mentor', 'Samuel — Feedback', 'María — Ejecución'],
  gvPlanes:         ['Hablar con el rector esta semana', 'Formar el primer grupo piloto en marzo', 'Presentar en el Día de Liderazgo'],
  showCapstone:     true,
  showGV:           true,
  showXP:           true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}
function makeCertId(userId: string, date: string) {
  return `BF${new Date(date).getFullYear()}${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}
function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}
function pillarScores(bf: NonNullable<PortfolioData['big_five']>) {
  return { Norte: bf.O, Acción: bf.E, Legado: bf.ES, Vínculo: bf.A, Yo: bf.C }
}
function getFortalezas(bf: NonNullable<PortfolioData['big_five']>): string[] {
  return Object.entries(pillarScores(bf)).filter(([, v]) => v >= 65).sort((a, b) => b[1] - a[1]).map(([k]) => k)
}
function getAreas(bf: NonNullable<PortfolioData['big_five']>): string[] {
  return Object.entries(pillarScores(bf)).filter(([, v]) => v < 45).sort((a, b) => a[1] - b[1]).map(([k]) => k)
}

// ── Pentagon ──────────────────────────────────────────────────────────────────
const PVERTS = [
  { key: 'Yo', angle: -90 }, { key: 'Norte', angle: -18 },
  { key: 'Acción', angle: 54 }, { key: 'Legado', angle: 126 }, { key: 'Vínculo', angle: 198 },
]
const PDIMS: Record<string, keyof NonNullable<PortfolioData['big_five']>> = {
  Yo: 'C', Norte: 'O', Acción: 'E', Legado: 'ES', Vínculo: 'A',
}

function ProfilePentagon({ bf, size = 120 }: { bf: NonNullable<PortfolioData['big_five']>; size?: number }) {
  const CX = 80, CY = 80, R = 52
  const rad = (d: number) => d * Math.PI / 180
  const pt  = (a: number, r: number) => `${CX + r * Math.cos(rad(a))},${CY + r * Math.sin(rad(a))}`
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
      {PVERTS.map(v => { const [x2, y2] = [CX + R * Math.cos(rad(v.angle)), CY + R * Math.sin(rad(v.angle))]; return <line key={v.key} x1={CX} y1={CY} x2={x2} y2={y2} stroke="var(--line,rgba(13,13,13,.1))" strokeWidth={0.8} /> })}
      <polygon points={PVERTS.map(v => pt(v.angle, R)).join(' ')} fill="none" stroke="var(--bg-2,#EFECE6)" strokeWidth={1.5} />
      <polygon points={PVERTS.map(v => pt(v.angle, (bf[PDIMS[v.key]] ?? 50) / 100 * R)).join(' ')} fill="rgba(192,57,43,0.12)" stroke="#C0392B" strokeWidth={1.5} />
      {PVERTS.map(v => { const [cx, cy] = [CX + (bf[PDIMS[v.key]] ?? 50) / 100 * R * Math.cos(rad(v.angle)), CY + (bf[PDIMS[v.key]] ?? 50) / 100 * R * Math.sin(rad(v.angle))]; return <circle key={v.key} cx={cx} cy={cy} r={3.5} fill="#C0392B" /> })}
    </svg>
  )
}

// ── Counter with animation ─────────────────────────────────────────────────────
function Counter({ value, locale = 'es-CO' }: { value: number; locale?: string }) {
  const pref = useReducedMotion()
  const [display, setDisplay] = useState(pref ? value : 0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (pref) { setDisplay(value); return }
    const start = performance.now(), dur = 900
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * e))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value, pref])
  return <>{display.toLocaleString(locale)}</>
}

// ── UniLogo ────────────────────────────────────────────────────────────────────
function UniLogo({ src, alt, initial }: { src: string; alt: string; initial: string }) {
  const [failed, setFailed] = React.useState(false)
  if (failed) return <div className="pfu-initial">{initial}</div>
  return <img src={src} alt={alt} className="pfu-logo" onError={() => setFailed(true)} />
}

// ── Universities ──────────────────────────────────────────────────────────────
const UNIVERSITIES = [
  { name: 'Common App',               url: 'https://www.commonapp.org',              desc: 'Más de 1,000 universidades en EE.UU.',              initial: 'CA', logo: '/commonapp.png' },
  { name: 'UCAS',                     url: 'https://www.ucas.com',                   desc: 'Universidades del Reino Unido',                     initial: 'UC', logo: '/ucas.png'       },
  { name: 'ESADE Business School',    url: 'https://www.esade.edu/admissions',       desc: 'Barcelona, España',                                 initial: 'ES', logo: '/esade.png'      },
  { name: 'Concordia University',     url: 'https://www.concordia.ca/admissions',    desc: 'Montreal, Canadá',                                  initial: 'CO', logo: '/concordia.png'  },
  { name: 'Universidad del Norte',    url: 'https://uninorte.edu.co/admissions',     desc: 'Barranquilla, Colombia',                            initial: 'UN', logo: '/uninorte.png'   },
  { name: 'Univ. de los Andes',       url: 'https://uniandes.edu.co',               desc: 'Bogotá, Colombia — top 1',                          initial: 'UA', logo: '/uniandes.png'   },
  { name: 'Univ. Javeriana',          url: 'https://www.javeriana.edu.co',           desc: 'Bogotá, Colombia',                                  initial: 'UJ', logo: '/javeriana.png'  },
  { name: 'EAFIT',                    url: 'https://www.eafit.edu.co/admisiones',    desc: 'Medellín, Colombia',                                initial: 'EF', logo: '/eafit.png'      },
  { name: 'UPB',                      url: 'https://www.upb.edu.co/admisiones',      desc: 'Medellín, Colombia',                                initial: 'UP', logo: '/upb.png'        },
  { name: 'CESA',                     url: 'https://www.cesa.edu.co/admisiones',     desc: 'Bogotá, Colombia',                                  initial: 'CE', logo: '/cesa.png'       },
  { name: 'Univ. Nacional',           url: 'https://www.unal.edu.co/admisiones',     desc: 'Colombia — universidad pública',                    initial: 'UN', logo: '/unal.png'       },
  { name: 'Univ. de Antioquia',       url: 'https://www.udea.edu.co/admisiones',     desc: 'Medellín, Colombia',                                initial: 'UD', logo: '/udea.png'       },
]

const sp = (delay = 0) => ({ type: 'spring' as const, stiffness: 120, damping: 22, delay })

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const params   = useParams()
  const rawUn    = params?.username
  const username = typeof rawUn === 'string' ? rawUn : Array.isArray(rawUn) ? (rawUn[0] ?? '') : ''
  const sbRef    = useRef<ReturnType<typeof createClient> | null>(null)
  const pref     = useReducedMotion()

  const [loading,  setLoading]  = useState(true)
  const [data,     setData]     = useState<PortfolioData | null>(null)
  const [private_, setPrivate_] = useState(false)
  const [qrUrl,    setQrUrl]    = useState<string | null>(null)
  const [copied,   setCopied]   = useState(false)
  const [isOwner,  setIsOwner]  = useState(false)

  // ── Boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (MOCK_MODE) {
        setData(MOCK_DATA); setIsOwner(true); setLoading(false)
        const cId = makeCertId('mock-user-1', '2026-05-16T10:00:00')
        import('qrcode').then(QR => QR.default.toDataURL(`https://big-family-nu.vercel.app/verify/${cId}`, { width: 96, margin: 1, color: { dark: '#0D0D0D', light: '#FFFFFF' } }).then(setQrUrl).catch(console.error))
        return
      }

      if (!sbRef.current) sbRef.current = createClient()
      const sb = sbRef.current
      if (!sb) return

      const { data: prof } = await sb
        .from('profiles')
        .select('id, display_name, school_id, role, school_level, leadership_profile, username, portfolio_public, portfolio_show_capstone, portfolio_show_great_venture, portfolio_show_xp, created_at')
        .eq('username', username)
        .maybeSingle()

      if (!prof) { setLoading(false); return }
      if (!prof.portfolio_public) { setPrivate_(true); setLoading(false); return }

      const userId = prof.id as string

      // Check if viewer owns this portfolio
      const { data: { user: viewer } } = await sb.auth.getUser()
      if (viewer?.id === userId) setIsOwner(true)

      const [
        { data: school }, { data: xpRows }, { data: progRows },
        { data: badgeRows }, { data: evalData },
      ] = await Promise.all([
        sb.from('schools').select('name').eq('id', prof.school_id).maybeSingle(),
        sb.from('xp_log').select('amount').eq('user_id', userId),
        sb.from('progress').select('id').eq('user_id', userId).eq('completed', true),
        sb.from('user_badges').select('id').eq('user_id', userId),
        prof.portfolio_show_capstone
          ? sb.from('projects').select('id, title, description').eq('user_id', userId).eq('status', 'approved').order('created_at', { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      let resultado: 'certificado' | 'mencion_honor' | null = null
      let certDate: string | null = null
      if (evalData?.data) {
        const pid = (evalData.data as { id: string }).id
        const { data: ev } = await sb.from('capstone_evaluations').select('resultado, created_at').eq('project_id', pid).in('resultado', ['certificado', 'mencion_honor']).maybeSingle()
        if (ev) { resultado = ev.resultado as 'certificado' | 'mencion_honor'; certDate = ev.created_at }
      }

      let metaNucleo: string | null = null
      let gvCreencias: string | null = null
      let gvParadigma: string | null = null
      let gvEquipo: string[] = []
      let gvPlanes: string[] = []
      if (prof.portfolio_show_great_venture) {
        const { data: gv } = await sb.from('great_ventures').select('meta_nucleo, creencias, paradigma, equipo, planes').eq('user_id', userId).maybeSingle()
        if (gv) {
          metaNucleo  = gv.meta_nucleo
          gvCreencias = gv.creencias
          gvParadigma = gv.paradigma
          gvEquipo    = ((gv.equipo as { nombre: string; rol: string }[]) ?? []).map(m => `${m.nombre} — ${m.rol}`)
          gvPlanes    = ((gv.planes as { texto: string }[]) ?? []).map(p => p.texto)
        }
      }

      const lp = prof.leadership_profile as { arquetipo?: string; big_five?: { O: number; C: number; E: number; A: number; N: number; ES: number } } | null
      setData({
        userId,
        displayName:      (prof.display_name as string) ?? username,
        schoolName:       (school?.name as string) ?? '',
        level:            prof.school_level as string | null,
        username:         prof.username as string,
        arquetipo:        lp?.arquetipo ?? null,
        big_five:         lp?.big_five ?? null,
        resultado, certDate,
        projectTitle:     (evalData?.data as { title?: string } | null)?.title ?? null,
        projectDesc:      (evalData?.data as { description?: string } | null)?.description ?? null,
        modulesCompleted: progRows?.length ?? 0,
        totalXP:          (xpRows ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0),
        badgesCount:      badgeRows?.length ?? 0,
        createdAt:        prof.created_at as string,
        metaNucleo, gvCreencias, gvParadigma, gvEquipo, gvPlanes,
        showCapstone:     prof.portfolio_show_capstone as boolean,
        showGV:           prof.portfolio_show_great_venture as boolean,
        showXP:           prof.portfolio_show_xp as boolean,
      })

      if (resultado && certDate) {
        const cId = makeCertId(userId, certDate)
        import('qrcode').then(QR => QR.default.toDataURL(`https://big-family-nu.vercel.app/verify/${cId}`, { width: 96, margin: 1, color: { dark: '#0D0D0D', light: '#FFFFFF' } }).then(setQrUrl).catch(console.error))
      }
      setLoading(false)
    }
    load()
  }, [username])

  // ── PDF export ───────────────────────────────────────────────────────────────
  async function exportPDF() {
    if (!data) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const L = 20, W = 170; let y = 20
    const line = (text: string, size = 10, bold = false, indent = 0) => {
      doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal')
      const lines = doc.splitTextToSize(text, W - indent)
      doc.text(lines, L + indent, y); y += lines.length * size * 0.4 + 2
    }
    const rule = () => { doc.setDrawColor(192, 57, 43); doc.line(L, y, L + W, y); y += 6 }
    const gap  = (n = 4) => { y += n }
    line('THE BIG FAMILY PROGRAM — LEADERSHIP PORTFOLIO', 14, true); rule()
    line(`${data.displayName} | ${data.arquetipo ?? 'Leadership Profile'} | ${data.level === 'senior' ? 'Senior Leader' : 'Junior Leader'}`, 11, true)
    line(`${data.schoolName} | La Guajira, Colombia`, 10); gap()
    if (data.resultado && data.certDate) {
      line('CERTIFICATION', 12, true); rule()
      const certId = makeCertId(data.userId, data.certDate)
      line(`The Big Leader — ${data.resultado === 'mencion_honor' ? 'Mención de Honor' : 'Certificado'} — ${fmtDate(data.certDate)}`, 10)
      line(`Certificate ID: ${certId}`, 10)
      line(`Verify at: big-family-nu.vercel.app/verify/${certId}`, 10)
      line('Recognized by: Cognia, International Baccalaureate, Tri-Association', 10); gap()
    }
    if (data.showCapstone && data.projectTitle) {
      line('LEADERSHIP PROJECT (CAPSTONE)', 12, true); rule()
      line(data.projectTitle, 11, true)
      if (data.projectDesc) line(data.projectDesc.slice(0, 1200), 10)
      line('Methodology: IDEMR (Identify, Design, Execute, Measure, Reflect)', 10); gap()
    }
    line('COMPETENCIES DEVELOPED (Big Leader Model)', 12, true); rule()
    const bf = data.big_five
    ;[['Pilar I — Yo', bf ? `${bf.C}%` : '—'], ['Pilar II — Norte', bf ? `${bf.O}%` : '—'], ['Pilar III — Vínculo', bf ? `${bf.A}%` : '—'], ['Pilar IV — Acción', bf ? `${bf.E}%` : '—'], ['Pilar V — Legado', bf ? `${bf.ES}%` : '—']].forEach(([l, v]) => line(`${l}: ${v}`, 10, false, 4))
    gap()
    if (data.showXP) {
      line('IMPACT METRICS', 12, true); rule()
      line(`${data.totalXP.toLocaleString()} Impact Points`, 10, false, 4)
      line(`${data.modulesCompleted} / 7 Modules Completed`, 10, false, 4)
      line(`${data.badgesCount} Badges Earned`, 10, false, 4); gap()
    }
    line('PROGRAM VALIDATION', 12, true); rule()
    line('Cognia (formerly AdvancED) — Institutional Accreditation', 10, false, 4)
    line('International Baccalaureate — IB Americas Conference, Orlando', 10, false, 4)
    line('Tri-Association — TRIHEROES 2025', 10, false, 4); gap()
    line('Contact: luis.barrios@colegioalbania.edu.co', 9)
    line('Website: big-family-nu.vercel.app', 9)
    doc.save(`portfolio-${data.username}.pdf`)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`https://big-family-nu.vercel.app/p/${data?.username ?? username}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ── States ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg,#F5F3EF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes pf-s{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: '#C0392B', animation: 'pf-s .8s linear infinite' }} />
    </div>
  )

  if (!data && !private_) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg,#F5F3EF)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 10, color: 'var(--mute,#6B6B6B)', letterSpacing: '.24em', textTransform: 'uppercase', marginBottom: 16 }}>THE BIG FAMILY PROGRAM</p>
      <h1 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: '2rem', color: 'var(--ink,#0D0D0D)', marginBottom: 12 }}>Portafolio no encontrado</h1>
      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 15, color: 'var(--mute,#6B6B6B)' }}>El usuario <strong>@{username}</strong> no existe o no tiene un portafolio activo.</p>
      <a href="/" style={{ marginTop: 28, fontFamily: '"Satoshi",sans-serif', fontSize: 13, fontWeight: 700, color: '#C0392B', textDecoration: 'none' }}>← Volver al sitio principal</a>
    </div>
  )

  if (private_) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg,#F5F3EF)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 10, color: 'var(--mute,#6B6B6B)', letterSpacing: '.24em', textTransform: 'uppercase', marginBottom: 16 }}>THE BIG FAMILY PROGRAM</p>
      <h1 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: '1.8rem', color: 'var(--ink,#0D0D0D)', marginBottom: 12 }}>Este portafolio es privado</h1>
      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 15, color: 'var(--mute,#6B6B6B)' }}>El estudiante ha configurado su portafolio como privado.</p>
    </div>
  )

  const d = data!
  const certId    = d.resultado && d.certDate ? makeCertId(d.userId, d.certDate) : null
  const initials  = d.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const trackLbl  = d.level === 'junior' ? 'Junior Leader' : 'Senior Leader'
  const heroSub   = d.arquetipo
    ? `Estudiante del programa The Big Family, certificada como ${d.arquetipo} con impacto demostrado en ${d.schoolName || 'La Guajira'}, La Guajira, Colombia.`
    : `Estudiante del programa The Big Family con impacto demostrado en ${d.schoolName || 'La Guajira'}, La Guajira, Colombia.`
  const forts     = d.big_five ? getFortalezas(d.big_five) : []
  const areasArr  = d.big_five ? getAreas(d.big_five) : []

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{font-family:"Satoshi",sans-serif;-webkit-font-smoothing:antialiased;}
        /* ── Layout ── */
        .pfl-wrap{display:grid;grid-template-columns:320px 1fr;min-height:100dvh;background:var(--bg,#F5F3EF);}
        /* ── Sidebar ── */
        .pfl-sb{position:sticky;top:0;height:100dvh;overflow-y:auto;background:var(--card-bg,#fff);border-right:1px solid var(--card-border,rgba(13,13,13,.07));padding:40px 32px;display:flex;flex-direction:column;gap:28px;}
        .pfl-sb-lbl{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--mute,#6B6B6B);margin-bottom:10px;}
        .pfl-sb-sep{height:1px;background:var(--line,rgba(13,13,13,.08));}
        /* Identity */
        .pfl-avatar{width:72px;height:72px;border-radius:50%;background:#C0392B;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:22px;color:#fff;flex-shrink:0;margin-bottom:12px;}
        .pfl-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:1.3rem;color:var(--ink,#0D0D0D);line-height:1.2;margin-bottom:4px;}
        .pfl-arch{font-family:"Instrument Serif",serif;font-style:italic;font-size:1rem;color:#C0392B;margin-bottom:8px;}
        .pfl-track{display:inline-block;padding:2px 9px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;background:rgba(192,57,43,.08);color:#C0392B;margin-bottom:4px;}
        .pfl-school{font-family:"Satoshi",sans-serif;font-size:12px;color:var(--mute,#6B6B6B);line-height:1.5;}
        /* Pentagon pills */
        .pfl-pent-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;}
        .pfl-pill-str{padding:2px 9px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;background:rgba(15,123,108,.1);color:var(--accent-teal,#0F7B6C);border:1px solid rgba(15,123,108,.2);}
        .pfl-pill-area{padding:2px 9px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;background:rgba(192,57,43,.08);color:#C0392B;border:1px solid rgba(192,57,43,.2);}
        /* Stats */
        .pfl-stat{display:flex;flex-direction:column;gap:2px;padding:11px 0;border-bottom:1px solid var(--line,rgba(13,13,13,.08));}
        .pfl-stat:last-child{border-bottom:none;}
        .pfl-stat__num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:1.5rem;color:#C0392B;font-variant-numeric:tabular-nums;line-height:1;}
        .pfl-stat__lbl{font-family:"Satoshi",sans-serif;font-size:11px;color:var(--mute,#6B6B6B);}
        /* Cert */
        .pfl-cert-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;margin-bottom:8px;}
        .pfl-cert-badge.cert{background:#D1FAE5;color:#065F46;}
        .pfl-cert-badge.honor{background:rgba(212,130,26,.12);color:#92400E;}
        .pfl-qr-row{display:flex;align-items:center;gap:10px;margin-top:8px;}
        .pfl-verify{font-family:"Satoshi",sans-serif;font-size:11px;font-weight:600;color:#C0392B;text-decoration:none;}
        .pfl-verify:hover{text-decoration:underline;}
        /* Accred logos */
        .pfl-accred{display:flex;flex-wrap:wrap;gap:12px;align-items:center;}
        .pfl-alogo{height:32px;object-fit:contain;}
        /* Actions */
        .pfl-actions{margin-top:auto;display:flex;flex-direction:column;gap:8px;}
        .pfl-btn-outline{width:100%;padding:10px 16px;background:none;border:1px solid var(--ink,#0D0D0D);border-radius:999px;font-family:"Satoshi",sans-serif;font-size:13px;font-weight:600;color:var(--ink,#0D0D0D);cursor:pointer;transition:background .2s,color .2s;text-align:center;}
        .pfl-btn-outline:hover{background:var(--ink,#0D0D0D);color:var(--bg,#F5F3EF);}
        .pfl-btn-ghost{width:100%;padding:10px 16px;background:none;border:1px solid var(--line,rgba(13,13,13,.1));border-radius:999px;font-family:"Satoshi",sans-serif;font-size:13px;font-weight:500;color:var(--mute,#6B6B6B);cursor:pointer;transition:border-color .2s,color .2s;text-align:center;}
        .pfl-btn-ghost:hover{border-color:var(--ink);color:var(--ink);}
        .pfl-edit-link{font-family:"Satoshi",sans-serif;font-size:12px;color:#C0392B;text-decoration:none;text-align:center;padding:4px 0;}
        .pfl-edit-link:hover{text-decoration:underline;}
        /* ── Content ── */
        .pfl-content{padding:48px;display:flex;flex-direction:column;gap:32px;}
        .pfl-content-inner{max-width:860px;display:flex;flex-direction:column;gap:32px;}
        /* Hero */
        .pfl-hero-eyebrow{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#C0392B;margin-bottom:12px;}
        .pfl-hero-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(2rem,4vw,3rem);color:var(--ink,#0D0D0D);letter-spacing:-0.02em;line-height:1.1;margin-bottom:14px;}
        .pfl-hero-sub{font-family:"Satoshi",sans-serif;font-size:16px;color:var(--mute,#6B6B6B);line-height:1.7;margin-bottom:20px;max-width:56ch;}
        .pfl-hero-rule{width:48px;height:2px;background:#C0392B;}
        /* Section cards */
        .pfl-card{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.07));border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(13,13,13,.04);}
        .pfl-card--accent{border-left:3px solid #C0392B;}
        .pfl-card--muted{background:var(--bg-2,#EFECE6);border-color:transparent;}
        .pfl-card--dark{background:var(--ink,#0D0D0D);border-color:transparent;}
        .pfl-eyebrow{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#C0392B;margin-bottom:14px;}
        .pfl-eyebrow--white{color:rgba(255,255,255,.5);}
        /* IDEMR */
        .pfl-idemr{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;}
        .pfl-idemr-pill{padding:4px 12px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;background:rgba(192,57,43,.08);color:#C0392B;border:1px solid rgba(192,57,43,.15);}
        /* GV grid */
        .pfl-gv-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;}
        .pfl-gv-cell-lbl{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mute,#6B6B6B);margin-bottom:6px;}
        .pfl-gv-cell-text{font-family:"Satoshi",sans-serif;font-size:13px;color:var(--ink-2,#2D2D2D);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        /* Universities */
        .pfl-uni-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:1.3rem;color:var(--ink,#0D0D0D);margin-bottom:8px;}
        .pfl-uni-sub{font-family:"Satoshi",sans-serif;font-size:15px;color:var(--mute,#6B6B6B);line-height:1.65;margin-bottom:22px;}
        .pfl-uni-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
        .pfl-uni-card{background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,.07));border-radius:14px;padding:18px;display:flex;flex-direction:column;align-items:center;gap:8px;min-height:152px;text-align:center;transition:border-color .2s;}
        .pfl-uni-card:hover{border-color:rgba(192,57,43,.3);}
        .pfu-initial{width:48px;height:48px;border-radius:10px;background:rgba(192,57,43,.08);display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-size:13px;font-weight:700;color:#C0392B;}
        .pfu-logo{height:48px;width:100%;max-width:110px;object-fit:contain;transition:transform 200ms;}
        .pfl-uni-card:hover .pfu-logo{transform:scale(1.05);}
        .pfl-uni-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:12px;color:var(--ink,#0D0D0D);line-height:1.3;}
        .pfl-uni-desc{font-family:"Satoshi",sans-serif;font-size:11px;color:var(--mute,#6B6B6B);line-height:1.4;flex:1;}
        .pfl-uni-btn{display:inline-flex;align-items:center;padding:5px 12px;border-radius:999px;border:1px solid var(--line);font-family:"Satoshi",sans-serif;font-size:11px;font-weight:600;color:var(--ink,#0D0D0D);text-decoration:none;transition:border-color .15s;margin-top:auto;}
        .pfl-uni-btn:hover{border-color:var(--ink);}
        /* Export */
        .pfl-exp-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:1.4rem;color:#fff;margin-bottom:10px;}
        .pfl-exp-sub{font-family:"Satoshi",sans-serif;font-size:14px;color:rgba(255,255,255,.55);line-height:1.65;margin-bottom:22px;}
        .pfl-exp-btn{padding:11px 26px;background:#C0392B;border:none;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:#fff;cursor:pointer;transition:background .2s;}
        .pfl-exp-btn:hover{background:#a93226;}
        /* Footer */
        .pfl-footer{text-align:center;font-family:"Satoshi",sans-serif;font-size:12px;color:var(--mute,#6B6B6B);line-height:1.6;}
        .pfl-footer a{color:#C0392B;text-decoration:none;}
        .pfl-footer a:hover{text-decoration:underline;}
        /* Responsive */
        @media(max-width:1024px){
          .pfl-wrap{grid-template-columns:1fr;}
          .pfl-sb{position:static;height:auto;overflow-y:visible;border-right:none;border-bottom:1px solid var(--card-border,rgba(13,13,13,.07));}
          .pfl-actions{flex-direction:row;flex-wrap:wrap;}
          .pfl-btn-outline,.pfl-btn-ghost{width:auto;flex:1;}
          .pfl-content{padding:28px 20px;}
        }
        @media(max-width:768px){.pfl-uni-grid{grid-template-columns:repeat(2,1fr);}.pfl-gv-grid{grid-template-columns:1fr;}}
        @media(max-width:480px){.pfl-uni-grid{grid-template-columns:1fr;}}
        @media print{.pfl-sb,.pfl-uni-grid,.pfl-card--dark{display:none!important;}}
      `}</style>

      <div className="pfl-wrap">

        {/* ═══════════ SIDEBAR ═══════════ */}
        <m.aside
          className="pfl-sb"
          initial={pref ? false : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          {/* Bloque 1 — Identidad */}
          <div>
            <div className="pfl-avatar">{initials}</div>
            <div className="pfl-name">{d.displayName}</div>
            {d.arquetipo && <div className="pfl-arch">{d.arquetipo}</div>}
            <span className="pfl-track">{trackLbl}</span>
            {d.schoolName && <p className="pfl-school" style={{ marginTop: 6 }}>{d.schoolName}<br />La Guajira, Colombia</p>}
          </div>

          <div className="pfl-sb-sep" />

          {/* Bloque 2 — Pentágono */}
          {d.big_five && (
            <div>
              <div className="pfl-sb-lbl">PERFIL DE LÍDER</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <ProfilePentagon bf={d.big_five} size={160} />
              </div>
              {(forts.length > 0 || areasArr.length > 0) && (
                <div className="pfl-pent-pills">
                  {forts.map(f => <span key={f} className="pfl-pill-str">{f} ↑</span>)}
                  {areasArr.map(a => <span key={a} className="pfl-pill-area">{a} ↓</span>)}
                </div>
              )}
            </div>
          )}

          {d.showXP && (
            <>
              <div className="pfl-sb-sep" />
              {/* Bloque 3 — Stats */}
              <div>
                <div className="pfl-sb-lbl">IMPACTO</div>
                {[
                  { val: d.totalXP,          lbl: 'Puntos de Impacto'   },
                  { val: d.modulesCompleted,  lbl: 'Módulos Completados' },
                  { val: d.badgesCount,       lbl: 'Badges Obtenidos'    },
                  { val: daysSince(d.createdAt), lbl: 'Días en el Programa' },
                ].map(({ val, lbl }) => (
                  <div key={lbl} className="pfl-stat">
                    <div className="pfl-stat__num"><Counter value={val} /></div>
                    <div className="pfl-stat__lbl">{lbl}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {d.resultado && d.certDate && (
            <>
              <div className="pfl-sb-sep" />
              {/* Bloque 4 — Certificación */}
              <div>
                <span className={`pfl-cert-badge ${d.resultado === 'mencion_honor' ? 'honor' : 'cert'}`}>
                  {d.resultado === 'mencion_honor' ? '✦ Mención de Honor' : '✓ Certificado'}
                </span>
                <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 12, color: 'var(--mute,#6B6B6B)', marginBottom: 4 }}>{fmtDate(d.certDate)}</p>
                {certId && (
                  <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 10, color: 'var(--mute,rgba(13,13,13,.35))', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>{certId}</p>
                )}
                {(qrUrl || certId) && (
                  <div className="pfl-qr-row">
                    {qrUrl && <img src={qrUrl} alt="QR" width={48} height={48} style={{ borderRadius: 4 }} />}
                    {certId && <a href={`/verify/${certId}`} className="pfl-verify" target="_blank" rel="noreferrer">Verificar autenticidad →</a>}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="pfl-sb-sep" />

          {/* Bloque 5 — Acreditaciones */}
          <div>
            <div className="pfl-sb-lbl">RECONOCIDO POR</div>
            <div className="pfl-accred">
              <img src="/cognia.png"                               alt="Cognia"                   className="pfl-alogo" />
              <img src="/International_Baccalaureate_Logo.svg.png" alt="International Baccalaureate" className="pfl-alogo" />
              <img src="/tri.png"                                  alt="Tri-Association"          className="pfl-alogo" />
            </div>
          </div>

          {/* Bloque 6 — Acciones */}
          <div className="pfl-actions">
            <button className="pfl-btn-outline" onClick={exportPDF}>Exportar PDF</button>
            <button className="pfl-btn-ghost" onClick={copyLink}>
              {copied ? '✓ Copiado' : 'Compartir portafolio'}
            </button>
            {isOwner && (
              <a href="/dashboard/settings" className="pfl-edit-link">Editar privacidad →</a>
            )}
          </div>
        </m.aside>

        {/* ═══════════ CONTENT ═══════════ */}
        <main className="pfl-content">
          <div className="pfl-content-inner">

            {/* Sección 1 — Hero */}
            <m.div
              initial={pref ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={sp(0.05)}
            >
              <div className="pfl-hero-eyebrow">PORTAFOLIO DE LIDERAZGO</div>
              <h1 className="pfl-hero-name">{d.displayName}</h1>
              <p className="pfl-hero-sub">{heroSub}</p>
              <div className="pfl-hero-rule" />
            </m.div>

            {/* Sección 2 — Capstone */}
            {d.showCapstone && d.projectTitle && (
              <m.div
                className="pfl-card pfl-card--accent"
                initial={pref ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={sp(0.08)}
              >
                <div className="pfl-eyebrow">PROYECTO DE LIDERAZGO COMUNITARIO</div>
                <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: '1.4rem', color: 'var(--ink,#0D0D0D)', marginBottom: 14, lineHeight: 1.3 }}>
                  {d.projectTitle}
                </h2>
                {d.projectDesc && (
                  <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 15, color: 'var(--ink-2,#2D2D2D)', lineHeight: 1.75 }}>
                    {d.projectDesc}
                  </p>
                )}
                <div className="pfl-idemr">
                  {['I · Identificar', 'D · Diseñar', 'E · Ejecutar', 'M · Medir', 'R · Reflexionar'].map(s => (
                    <span key={s} className="pfl-idemr-pill">{s}</span>
                  ))}
                </div>
              </m.div>
            )}

            {/* Sección 3 — Great Venture */}
            {d.showGV && d.metaNucleo && (
              <m.div
                className="pfl-card pfl-card--muted"
                initial={pref ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={sp(0.1)}
              >
                <div className="pfl-eyebrow">THE GREAT VENTURE</div>
                <p style={{ fontFamily: '"Instrument Serif",serif', fontStyle: 'italic', fontSize: '1.3rem', color: 'var(--ink,#0D0D0D)', lineHeight: 1.5 }}>
                  {d.metaNucleo}
                </p>
                <div className="pfl-gv-grid">
                  {d.gvCreencias && (
                    <div>
                      <div className="pfl-gv-cell-lbl">CREENCIAS</div>
                      <p className="pfl-gv-cell-text">{d.gvCreencias}</p>
                    </div>
                  )}
                  {d.gvParadigma && (
                    <div>
                      <div className="pfl-gv-cell-lbl">PARADIGMA</div>
                      <p className="pfl-gv-cell-text">{d.gvParadigma}</p>
                    </div>
                  )}
                  {d.gvEquipo.length > 0 && (
                    <div>
                      <div className="pfl-gv-cell-lbl">EQUIPO</div>
                      <p className="pfl-gv-cell-text">{d.gvEquipo.slice(0, 3).join(' · ')}</p>
                    </div>
                  )}
                  {d.gvPlanes.length > 0 && (
                    <div>
                      <div className="pfl-gv-cell-lbl">PLANES</div>
                      <p className="pfl-gv-cell-text">{d.gvPlanes.slice(0, 2).join(' · ')}</p>
                    </div>
                  )}
                </div>
                {isOwner && (
                  <a href="/dashboard/great-venture/mapa" style={{ display: 'inline-flex', marginTop: 16, fontFamily: '"Satoshi",sans-serif', fontSize: 13, fontWeight: 700, color: '#C0392B', textDecoration: 'none' }}>
                    Ver mapa completo →
                  </a>
                )}
              </m.div>
            )}

            {/* Sección 4 — Universidades */}
            <m.div
              initial={pref ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={sp(0.1)}
            >
              <h2 className="pfl-uni-title">¿Listo para el siguiente paso?</h2>
              <p className="pfl-uni-sub">Este portafolio y certificado son reconocidos internacionalmente. Úsalos en tu aplicación universitaria.</p>
              <div className="pfl-uni-grid">
                {UNIVERSITIES.map(u => (
                  <m.div
                    key={u.name}
                    className="pfl-uni-card"
                    whileHover={pref ? undefined : { y: -2 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  >
                    <UniLogo src={u.logo} alt={u.name} initial={u.initial} />
                    <div className="pfl-uni-name">{u.name}</div>
                    <div className="pfl-uni-desc">{u.desc}</div>
                    <a href={u.url} target="_blank" rel="noreferrer" className="pfl-uni-btn">Aplicar →</a>
                  </m.div>
                ))}
              </div>
            </m.div>

            {/* Sección 5 — Export */}
            <m.div
              className="pfl-card pfl-card--dark"
              initial={pref ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={sp(0.1)}
            >
              <div className="pfl-eyebrow pfl-eyebrow--white">EXPORTAR</div>
              <h2 className="pfl-exp-title">Listo para Common App.</h2>
              <p className="pfl-exp-sub">
                Descarga tu portafolio formateado para la sección &ldquo;Additional Information&rdquo;
                de Common App, UCAS, o cualquier plataforma de admisiones.
              </p>
              <m.button
                className="pfl-exp-btn"
                onClick={exportPDF}
                whileHover={pref ? undefined : { scale: 1.02 }}
                whileTap={pref ? undefined : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              >
                Descargar PDF
              </m.button>
            </m.div>

            {/* Footer */}
            <m.div className="pfl-footer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={sp(0.3)}>
              Portafolio verificado por <a href="/">The Big Family Program</a>
              {' · '}
              <a href="/#como-funciona">¿Eres educador? Conoce el programa</a>
            </m.div>

          </div>
        </main>

      </div>
    </>
  )
}
