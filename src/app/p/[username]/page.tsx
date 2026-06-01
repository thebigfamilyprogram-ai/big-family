'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { m } from 'framer-motion'
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
  projectDesc:      'Diseñé e implementé una red de mentoría entre estudiantes de los 8 colegios participantes en el programa Big Family, conectando líderes estudiantiles con mentores de diferentes instituciones educativas de La Guajira. El programa logró impactar a más de 200 estudiantes en su primera fase de piloto, generando comunidades de aprendizaje sostenibles que continuaron funcionando de manera autónoma tras la intervención inicial.',
  modulesCompleted: 7,
  totalXP:          1840,
  badgesCount:      5,
  createdAt:        '2026-01-15T08:00:00',
  metaNucleo:       'Crear un programa de mentoría entre estudiantes en los 8 colegios de La Guajira',
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

function makeCertId(userId: string, date: string): string {
  const year = new Date(date).getFullYear()
  const part = userId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `BF${year}${part}`
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

// ── Pentagon SVG ──────────────────────────────────────────────────────────────
const PVERTS = [
  { key: 'Yo', angle: -90 }, { key: 'Norte', angle: -18 },
  { key: 'Acción', angle: 54 }, { key: 'Legado', angle: 126 }, { key: 'Vínculo', angle: 198 },
]
const PDIMS: Record<string, keyof NonNullable<PortfolioData['big_five']>> = {
  Yo: 'C', Norte: 'O', Acción: 'E', Legado: 'ES', Vínculo: 'A',
}

function ProfilePentagon({ bf, size = 120 }: {
  bf: NonNullable<PortfolioData['big_five']>; size?: number
}) {
  const CX = 80, CY = 80, R = 52
  const rad = (d: number) => d * Math.PI / 180
  const pt = (a: number, r: number) => `${CX + r * Math.cos(rad(a))},${CY + r * Math.sin(rad(a))}`
  const refPts  = PVERTS.map(v => pt(v.angle, R)).join(' ')
  const profPts = PVERTS.map(v => pt(v.angle, (bf[PDIMS[v.key]] ?? 50) / 100 * R)).join(' ')
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
      {PVERTS.map(v => { const [x2, y2] = [CX + R * Math.cos(rad(v.angle)), CY + R * Math.sin(rad(v.angle))]; return <line key={v.key} x1={CX} y1={CY} x2={x2} y2={y2} stroke="var(--line)" strokeWidth={0.8} /> })}
      <polygon points={refPts} fill="none" stroke="var(--bg-2,#EFECE6)" strokeWidth={1.5} />
      <polygon points={profPts} fill="rgba(192,57,43,0.12)" stroke="#C0392B" strokeWidth={1.5} />
      {PVERTS.map(v => { const [cx, cy] = [CX + (bf[PDIMS[v.key]] ?? 50) / 100 * R * Math.cos(rad(v.angle)), CY + (bf[PDIMS[v.key]] ?? 50) / 100 * R * Math.sin(rad(v.angle))]; return <circle key={v.key} cx={cx} cy={cy} r={3.5} fill="#C0392B" /> })}
    </svg>
  )
}

// ── Universities ──────────────────────────────────────────────────────────────
const UNIVERSITIES = [
  { name: 'Common App',               url: 'https://www.commonapp.org',              desc: 'Más de 1,000 universidades en Estados Unidos',              initial: 'CA', logo: '/commonapp.png' },
  { name: 'UCAS',                     url: 'https://www.ucas.com',                   desc: 'Universidades del Reino Unido',                             initial: 'UC', logo: '/ucas.png'       },
  { name: 'ESADE Business School',    url: 'https://www.esade.edu/admissions',       desc: 'Barcelona, España — donde estudian nuestros alumni',        initial: 'ES', logo: '/esade.png'      },
  { name: 'Concordia University',     url: 'https://www.concordia.ca/admissions',    desc: 'Montreal, Canadá — sede de nuestros alumni líderes',        initial: 'CO', logo: '/concordia.png'  },
  { name: 'Universidad del Norte',    url: 'https://uninorte.edu.co/admissions',     desc: 'Barranquilla, Colombia — excelencia regional',              initial: 'UN', logo: '/uninorte.png'   },
  { name: 'Universidad de los Andes', url: 'https://uniandes.edu.co',               desc: 'Bogotá, Colombia — top 1 Colombia',                         initial: 'UA', logo: '/uniandes.png'   },
  { name: 'Universidad Javeriana',    url: 'https://www.javeriana.edu.co',           desc: 'Bogotá, Colombia — donde estudió Luis Barrios',             initial: 'UJ', logo: '/javeriana.png'  },
  { name: 'Universidad EAFIT',        url: 'https://www.eafit.edu.co/admisiones',    desc: 'Medellín, Colombia — innovación y emprendimiento',          initial: 'EF', logo: '/eafit.png'      },
  { name: 'Universidad UPB',          url: 'https://www.upb.edu.co/admisiones',      desc: 'Medellín, Colombia — liderazgo y valores',                  initial: 'UP', logo: '/upb.png'        },
  { name: 'Universidad CESA',         url: 'https://www.cesa.edu.co/admisiones',     desc: 'Bogotá, Colombia — negocios y liderazgo',                   initial: 'CE', logo: '/cesa.png'       },
  { name: 'Universidad Nacional',     url: 'https://www.unal.edu.co/admisiones',     desc: 'Colombia — la universidad pública más importante del país', initial: 'UN', logo: '/unal.png'       },
  { name: 'Universidad de Antioquia', url: 'https://www.udea.edu.co/admisiones',     desc: 'Medellín, Colombia — tradición e impacto social',           initial: 'UD', logo: '/udea.png'       },
]

// Logo with initial-div fallback on load error
function UniLogo({ src, alt, initial }: { src: string; alt: string; initial: string }) {
  const [failed, setFailed] = React.useState(false)
  if (failed) {
    return <div className="pf-uni-initial">{initial}</div>
  }
  return (
    <img
      src={src}
      alt={alt}
      className="pf-uni-logo"
      onError={() => setFailed(true)}
    />
  )
}

const sp = (delay = 0) => ({ type: 'spring' as const, stiffness: 120, damping: 22, delay })

// ── Component ─────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const params   = useParams()
  const rawUn    = params?.username
  const username = typeof rawUn === 'string' ? rawUn : Array.isArray(rawUn) ? (rawUn[0] ?? '') : ''
  const sbRef    = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,  setLoading]  = useState(true)
  const [data,     setData]     = useState<PortfolioData | null>(null)
  const [private_, setPrivate_] = useState(false)
  const [qrUrl,    setQrUrl]    = useState<string | null>(null)
  const [copied,   setCopied]   = useState(false)

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (MOCK_MODE) {
        setData(MOCK_DATA)
        setLoading(false)
        // QR
        const cId = makeCertId('mock-user-1', '2026-05-16T10:00:00')
        import('qrcode').then(QR => QR.default.toDataURL(`https://big-family-nu.vercel.app/verify/${cId}`, { width: 80, margin: 1, color: { dark: '#0D0D0D', light: '#FFFFFF' } }).then(setQrUrl).catch(console.error))
        return
      }

      if (!sbRef.current) sbRef.current = createClient()
      const sb = sbRef.current
      if (!sb) return

      // Find user by username
      const { data: prof } = await sb
        .from('profiles')
        .select('id, display_name, school_id, role, school_level, leadership_profile, username, portfolio_public, portfolio_show_capstone, portfolio_show_great_venture, portfolio_show_xp, created_at')
        .eq('username', username)
        .maybeSingle()

      if (!prof) { setLoading(false); return }
      if (!prof.portfolio_public) { setPrivate_(true); setLoading(false); return }

      const userId = prof.id as string

      // Parallel fetch
      const [
        { data: school },
        { data: xpRows },
        { data: progRows },
        { data: badgeRows },
        { data: evalData },
      ] = await Promise.all([
        sb.from('schools').select('name').eq('id', prof.school_id).maybeSingle(),
        sb.from('xp_log').select('amount').eq('user_id', userId),
        sb.from('progress').select('id').eq('user_id', userId).eq('completed', true),
        sb.from('user_badges').select('id').eq('user_id', userId),
        (prof.portfolio_show_capstone
          ? sb.from('projects').select('id, title, description, status').eq('user_id', userId).eq('status', 'approved').order('created_at', { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null })
        ),
      ])

      let resultado: 'certificado' | 'mencion_honor' | null = null
      let certDate: string | null = null
      if (evalData?.data) {
        const pid = (evalData.data as { id: string }).id
        const { data: ev } = await sb.from('capstone_evaluations').select('resultado, created_at').eq('project_id', pid).in('resultado', ['certificado', 'mencion_honor']).maybeSingle()
        if (ev) { resultado = ev.resultado as 'certificado' | 'mencion_honor'; certDate = ev.created_at }
      }

      let metaNucleo: string | null = null
      let gvEquipo: string[] = []
      let gvPlanes: string[] = []
      if (prof.portfolio_show_great_venture) {
        const { data: gv } = await sb.from('great_ventures').select('meta_nucleo, equipo, planes').eq('user_id', userId).maybeSingle()
        if (gv) {
          metaNucleo = gv.meta_nucleo
          gvEquipo = ((gv.equipo as { nombre: string; rol: string }[]) ?? []).map((m: { nombre: string; rol: string }) => `${m.nombre} — ${m.rol}`)
          gvPlanes = ((gv.planes as { texto: string }[]) ?? []).map((p: { texto: string }) => p.texto)
        }
      }

      const lp = prof.leadership_profile as { arquetipo?: string; big_five?: { O: number; C: number; E: number; A: number; N: number; ES: number } } | null
      const resolved: PortfolioData = {
        userId,
        displayName:      (prof.display_name as string) ?? username,
        schoolName:       (school?.name as string) ?? '',
        level:            prof.school_level as string | null,
        username:         prof.username as string,
        arquetipo:        lp?.arquetipo ?? null,
        big_five:         lp?.big_five ?? null,
        resultado,
        certDate,
        projectTitle:     (evalData?.data as { title?: string } | null)?.title ?? null,
        projectDesc:      (evalData?.data as { description?: string } | null)?.description ?? null,
        modulesCompleted: progRows?.length ?? 0,
        totalXP:          (xpRows ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0),
        badgesCount:      badgeRows?.length ?? 0,
        createdAt:        prof.created_at as string,
        metaNucleo,
        gvEquipo,
        gvPlanes,
        showCapstone:     prof.portfolio_show_capstone as boolean,
        showGV:           prof.portfolio_show_great_venture as boolean,
        showXP:           prof.portfolio_show_xp as boolean,
      }
      setData(resolved)

      if (resultado && certDate) {
        const cId = makeCertId(userId, certDate)
        import('qrcode').then(QR => QR.default.toDataURL(`https://big-family-nu.vercel.app/verify/${cId}`, { width: 80, margin: 1, color: { dark: '#0D0D0D', light: '#FFFFFF' } }).then(setQrUrl).catch(console.error))
      }
      setLoading(false)
    }
    load()
  }, [username])

  // ── PDF export ──────────────────────────────────────────────────────────────
  async function exportPDF() {
    if (!data) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const L = 20, W = 170
    let y = 20

    const line = (text: string, size = 10, bold = false, indent = 0) => {
      doc.setFontSize(size)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      const lines = doc.splitTextToSize(text, W - indent)
      doc.text(lines, L + indent, y)
      y += lines.length * size * 0.4 + 2
    }
    const rule = () => { doc.setDrawColor(192, 57, 43); doc.line(L, y, L + W, y); y += 6 }
    const gap  = (n = 4) => { y += n }

    line('THE BIG FAMILY PROGRAM — LEADERSHIP PORTFOLIO', 14, true)
    rule()
    line(`${data.displayName} | ${data.arquetipo ?? 'Leadership Profile'} | ${data.level === 'senior' ? 'Senior Leader' : 'Junior Leader'}`, 11, true)
    line(`${data.schoolName} | La Guajira, Colombia`, 10)
    gap()

    if (data.resultado && data.certDate) {
      line('CERTIFICATION', 12, true)
      rule()
      const certId = makeCertId(data.userId, data.certDate)
      line(`The Big Leader — ${data.resultado === 'mencion_honor' ? 'Mención de Honor' : 'Certificado'} — ${fmtDate(data.certDate)}`, 10)
      line(`Certificate ID: ${certId}`, 10)
      line(`Verify at: big-family-nu.vercel.app/verify/${certId}`, 10)
      line('Recognized by: Cognia, International Baccalaureate, Tri-Association', 10)
      gap()
    }

    if (data.showCapstone && data.projectTitle) {
      line('LEADERSHIP PROJECT (CAPSTONE)', 12, true)
      rule()
      line(data.projectTitle, 11, true)
      if (data.projectDesc) line(data.projectDesc.slice(0, 1200), 10)
      line('Methodology: IDEMR (Identify, Design, Execute, Measure, Reflect)', 10)
      gap()
    }

    line('COMPETENCIES DEVELOPED (Big Leader Model)', 12, true)
    rule()
    const pillars = [
      ['Pilar I — Yo', data.big_five ? `${data.big_five.C}% Conscientiousness` : 'En desarrollo'],
      ['Pilar II — Norte', data.big_five ? `${data.big_five.O}% Openness` : 'En desarrollo'],
      ['Pilar III — Vínculo', data.big_five ? `${data.big_five.A}% Agreeableness` : 'En desarrollo'],
      ['Pilar IV — Acción', data.big_five ? `${data.big_five.E}% Extraversion` : 'En desarrollo'],
      ['Pilar V — Legado', data.big_five ? `${data.big_five.ES}% Emotional Stability` : 'En desarrollo'],
    ]
    pillars.forEach(([label, value]) => line(`${label}: ${value}`, 10, false, 4))
    gap()

    if (data.showXP) {
      line('IMPACT METRICS', 12, true)
      rule()
      line(`${data.totalXP.toLocaleString()} Impact Points`, 10, false, 4)
      line(`${data.modulesCompleted} / 7 Modules Completed`, 10, false, 4)
      line(`${data.badgesCount} Badges Earned`, 10, false, 4)
      line(`${daysSince(data.createdAt)} Days in program`, 10, false, 4)
      gap()
    }

    line('PROGRAM VALIDATION', 12, true)
    rule()
    line('The Big Family Program has been recognized by:', 10)
    line('Cognia (formerly AdvancED) — Institutional Accreditation', 10, false, 4)
    line('International Baccalaureate — IB Americas Conference, Orlando', 10, false, 4)
    line('Tri-Association — TRIHEROES 2025', 10, false, 4)
    gap()
    line('Contact: luis.barrios@colegioalbania.edu.co', 9)
    line('Website: big-family-nu.vercel.app', 9)

    doc.save(`portfolio-${data.username}.pdf`)
  }

  // ── Copy link ────────────────────────────────────────────────────────────────
  async function copyLink() {
    const url = `https://big-family-nu.vercel.app/p/${data?.username ?? username}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Renders ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#FAF8F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes pf-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(13,13,13,.1)', borderTopColor: '#C0392B', animation: 'pf-spin .8s linear infinite' }} />
    </div>
  )

  if (!data && !private_) return (
    <div style={{ minHeight: '100dvh', background: '#FAF8F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 14, color: 'rgba(13,13,13,.4)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 16 }}>THE BIG FAMILY PROGRAM</p>
      <h1 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: '2rem', color: '#0D0D0D', marginBottom: 12 }}>Portafolio no encontrado</h1>
      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 15, color: '#6B6B6B' }}>El usuario <strong>@{username}</strong> no existe o no tiene un portafolio activo.</p>
      <a href="/" style={{ marginTop: 28, fontFamily: '"Satoshi",sans-serif', fontSize: 13, fontWeight: 700, color: '#C0392B', textDecoration: 'none' }}>← Volver al sitio principal</a>
    </div>
  )

  if (private_) return (
    <div style={{ minHeight: '100dvh', background: '#FAF8F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 14, color: 'rgba(13,13,13,.4)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 16 }}>THE BIG FAMILY PROGRAM</p>
      <h1 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: '1.8rem', color: '#0D0D0D', marginBottom: 12 }}>Este portafolio es privado</h1>
      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 15, color: '#6B6B6B' }}>El estudiante ha configurado su portafolio como privado.</p>
    </div>
  )

  const d = data!
  const certId = d.resultado && d.certDate ? makeCertId(d.userId, d.certDate) : null
  const initials = d.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const trackLabel = d.level === 'junior' ? 'Junior Leader' : 'Senior Leader'

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{font-family:"Satoshi",sans-serif;-webkit-font-smoothing:antialiased;background:#FAF8F4;}
        .pf-page{min-height:100dvh;background:#FAF8F4;padding:0 0 80px;}
        .pf-inner{max-width:780px;margin:0 auto;padding:0 clamp(24px,5vw,64px);}
        /* Top brand strip */
        .pf-brand{text-align:center;padding:20px 0 16px;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--mute,#6B6B6B);}
        .pf-divider{height:1px;background:rgba(13,13,13,.08);margin-bottom:40px;}
        /* Cards */
        .pf-card{background:#fff;border:1px solid rgba(13,13,13,.07);border-radius:16px;padding:32px;margin-bottom:20px;box-shadow:0 2px 12px rgba(13,13,13,.04);}
        .pf-eyebrow{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#C0392B;margin-bottom:14px;}
        /* Identity */
        .pf-id{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;}
        .pf-avatar{width:80px;height:80px;border-radius:50%;background:#C0392B;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:24px;color:#fff;flex-shrink:0;margin-bottom:16px;}
        .pf-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(1.8rem,4vw,2.5rem);color:#0D0D0D;letter-spacing:-0.02em;line-height:1.1;margin-bottom:6px;}
        .pf-arch{font-family:"Instrument Serif",serif;font-style:italic;font-size:1.1rem;color:#C0392B;margin-bottom:10px;}
        .pf-badges-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;}
        .pf-track{padding:3px 10px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;background:rgba(192,57,43,.08);color:#C0392B;}
        .pf-school{font-family:"Satoshi",sans-serif;font-size:14px;color:#6B6B6B;}
        /* Cert */
        .pf-cert-badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;margin-bottom:12px;}
        .pf-cert-badge.cert{background:#D1FAE5;color:#065F46;}
        .pf-cert-badge.honor{background:rgba(212,130,26,.12);color:#92400E;}
        .pf-cert-row{display:flex;align-items:flex-start;gap:16px;}
        .pf-cert-qr{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;}
        .pf-cert-qr img{border-radius:4px;}
        .pf-cert-verify{font-family:"Satoshi",sans-serif;font-size:12px;font-weight:600;color:#C0392B;text-decoration:none;}
        .pf-cert-verify:hover{text-decoration:underline;}
        .pf-logos{display:flex;align-items:center;gap:16px;margin-top:16px;}
        .pf-logo{height:28px;object-fit:contain;filter:grayscale(1);opacity:.5;}
        /* Stats grid */
        .pf-stats{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .pf-stat{text-align:center;padding:20px;background:var(--bg-2,#EFECE6);border-radius:12px;}
        .pf-stat__num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:2rem;color:#C0392B;font-variant-numeric:tabular-nums;}
        .pf-stat__lbl{font-family:"Satoshi",sans-serif;font-size:11px;color:#6B6B6B;letter-spacing:.1em;text-transform:uppercase;margin-top:4px;}
        /* IDEMR pills */
        .pf-idemr{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;}
        .pf-idemr-pill{padding:4px 12px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;background:rgba(192,57,43,.08);color:#C0392B;border:1px solid rgba(192,57,43,.15);}
        /* Great Venture */
        .pf-gv-meta{font-family:"Instrument Serif",serif;font-style:italic;font-size:1.3rem;color:#0D0D0D;line-height:1.5;margin-bottom:16px;}
        .pf-gv-list{display:flex;flex-direction:column;gap:6px;}
        .pf-gv-item{font-family:"Satoshi",sans-serif;font-size:13px;color:#6B6B6B;display:flex;align-items:flex-start;gap:8px;}
        .pf-gv-dot{width:6px;height:6px;border-radius:50%;background:#C0392B;flex-shrink:0;margin-top:4px;}
        /* Universities */
        .pf-uni-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
        .pf-uni-card{background:#FAF8F4;border:1px solid rgba(13,13,13,.07);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:8px;}
        .pf-uni-initial{width:40px;height:40px;border-radius:8px;background:rgba(192,57,43,.08);display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-size:12px;font-weight:700;color:#C0392B;}
        .pf-uni-logo{height:40px;width:auto;max-width:120px;object-fit:contain;filter:grayscale(20%);transition:filter 200ms ease;}
        .pf-uni-card:hover .pf-uni-logo{filter:grayscale(0%);}
        .pf-uni-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#0D0D0D;line-height:1.3;}
        .pf-uni-desc{font-family:"Satoshi",sans-serif;font-size:12px;color:#6B6B6B;line-height:1.5;flex:1;}
        .pf-uni-btn{display:inline-flex;align-items:center;padding:6px 14px;border-radius:999px;border:1px solid rgba(13,13,13,.2);font-family:"Satoshi",sans-serif;font-size:12px;font-weight:600;color:#0D0D0D;text-decoration:none;width:fit-content;transition:border-color .2s,color .2s;}
        .pf-uni-btn:hover{border-color:#0D0D0D;}
        /* Export card */
        .pf-export{background:#0D0D0D;border-radius:16px;padding:36px;margin-bottom:20px;}
        .pf-export-eyebrow{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:14px;}
        .pf-export-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:1.5rem;color:#fff;margin-bottom:10px;}
        .pf-export-sub{font-family:"Satoshi",sans-serif;font-size:14px;color:rgba(255,255,255,.55);line-height:1.65;margin-bottom:24px;}
        .pf-export-btn{padding:12px 28px;background:#C0392B;border:none;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:#fff;cursor:pointer;transition:background .2s;}
        .pf-export-btn:hover{background:#a93226;}
        /* Footer */
        .pf-footer{text-align:center;padding:32px 0 0;border-top:1px solid rgba(13,13,13,.06);}
        .pf-footer-text{font-family:"Satoshi",sans-serif;font-size:12px;color:rgba(13,13,13,.35);margin-bottom:8px;}
        .pf-footer-link{font-family:"Satoshi",sans-serif;font-size:12px;color:#C0392B;text-decoration:none;}
        .pf-footer-link:hover{text-decoration:underline;}
        @media(max-width:600px){
          .pf-id{grid-template-columns:1fr;}
          .pf-stats{grid-template-columns:1fr 1fr;}
          .pf-cert-row{flex-direction:column;}
        }
        @media print{
          .pf-export,.pf-uni-grid{display:none!important;}
        }
      `}</style>

      <div className="pf-page">
        {/* Brand strip */}
        <m.div className="pf-inner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div className="pf-brand">The Big Family Program</div>
          <div className="pf-divider" />
        </m.div>

        <div className="pf-inner">

          {/* ── SECCIÓN 1 — Identidad ── */}
          <m.div className="pf-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={sp(0.1)}>
            <div className="pf-id">
              <div>
                <div className="pf-avatar">{initials}</div>
                <h1 className="pf-name">{d.displayName}</h1>
                {d.arquetipo && <p className="pf-arch">{d.arquetipo}</p>}
                <div className="pf-badges-row">
                  <span className="pf-track">{trackLabel}</span>
                </div>
                {d.schoolName && <p className="pf-school">{d.schoolName} · La Guajira, Colombia</p>}
              </div>
              {d.big_five && (
                <ProfilePentagon bf={d.big_five} size={120} />
              )}
            </div>
          </m.div>

          {/* ── SECCIÓN 2 — Certificación ── */}
          {d.resultado && d.certDate && (
            <m.div className="pf-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={sp(0.2)}>
              <div className="pf-eyebrow">CERTIFICACIÓN OFICIAL</div>
              <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: '1.3rem', color: '#0D0D0D', marginBottom: 10 }}>
                The Big Leader
              </h2>
              <span className={`pf-cert-badge ${d.resultado === 'mencion_honor' ? 'honor' : 'cert'}`}>
                {d.resultado === 'mencion_honor' ? '✦ Mención de Honor' : '✓ Certificado'}
              </span>
              <div className="pf-cert-row">
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 13, color: '#6B6B6B', marginBottom: 8 }}>
                    {fmtDate(d.certDate)}
                  </p>
                  {certId && (
                    <>
                      <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 11, color: 'rgba(13,13,13,.4)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                        {certId}
                      </p>
                      <a href={`/verify/${certId}`} className="pf-cert-verify" target="_blank" rel="noreferrer">
                        Verificar autenticidad →
                      </a>
                    </>
                  )}
                </div>
                {qrUrl && (
                  <div className="pf-cert-qr">
                    <img src={qrUrl} alt="QR verificar" width={56} height={56} />
                    <span style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 8, color: '#6B6B6B', letterSpacing: '.06em' }}>VERIFICAR</span>
                  </div>
                )}
              </div>
              <div className="pf-logos">
                <img src="/cognia.png" alt="Cognia" className="pf-logo" />
                <img src="/International_Baccalaureate_Logo.svg.png" alt="IB" className="pf-logo" />
                <img src="/tri.png" alt="Tri-Association" className="pf-logo" />
              </div>
            </m.div>
          )}

          {/* ── SECCIÓN 3 — Proyecto Capstone ── */}
          {d.showCapstone && d.projectTitle && (
            <m.div className="pf-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={sp(0.3)}>
              <div className="pf-eyebrow">PROYECTO DE LIDERAZGO</div>
              <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: '1.3rem', color: '#0D0D0D', marginBottom: 12 }}>
                {d.projectTitle}
              </h2>
              {d.projectDesc && (
                <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 15, color: '#2D2D2D', lineHeight: 1.7, marginBottom: 16 }}>
                  {d.projectDesc.split(' ').slice(0, 150).join(' ')}{d.projectDesc.split(' ').length > 150 ? '…' : ''}
                </p>
              )}
              <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6B6B6B', marginBottom: 8 }}>
                METODOLOGÍA
              </p>
              <div className="pf-idemr">
                {['Identificar', 'Diseñar', 'Ejecutar', 'Medir', 'Reflexionar'].map(s => (
                  <span key={s} className="pf-idemr-pill">{s.charAt(0)} · {s}</span>
                ))}
              </div>
            </m.div>
          )}

          {/* ── SECCIÓN 4 — Estadísticas ── */}
          {d.showXP && (
            <m.div className="pf-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={sp(0.4)}>
              <div className="pf-eyebrow">ESTADÍSTICAS DE IMPACTO</div>
              <div className="pf-stats">
                {[
                  { num: d.totalXP.toLocaleString('es-CO'), lbl: 'Puntos de Impacto' },
                  { num: `${d.modulesCompleted} / 7`, lbl: 'Módulos Completados' },
                  { num: `${d.badgesCount}`, lbl: 'Badges Obtenidos' },
                  { num: `${daysSince(d.createdAt)}`, lbl: 'Días en el Programa' },
                ].map(({ num, lbl }) => (
                  <div key={lbl} className="pf-stat">
                    <div className="pf-stat__num">{num}</div>
                    <div className="pf-stat__lbl">{lbl}</div>
                  </div>
                ))}
              </div>
            </m.div>
          )}

          {/* ── SECCIÓN 5 — Great Venture ── */}
          {d.showGV && d.metaNucleo && (
            <m.div className="pf-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={sp(0.5)}>
              <div className="pf-eyebrow">THE GREAT VENTURE</div>
              <p className="pf-gv-meta">{d.metaNucleo}</p>
              {d.gvEquipo.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B6B6B', marginBottom: 8 }}>EQUIPO DE PODER</p>
                  <div className="pf-gv-list">
                    {d.gvEquipo.map((m, i) => <div key={i} className="pf-gv-item"><div className="pf-gv-dot"/>{m}</div>)}
                  </div>
                </div>
              )}
              {d.gvPlanes.length > 0 && (
                <div>
                  <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B6B6B', marginBottom: 8 }}>PLANES DE ACCIÓN</p>
                  <div className="pf-gv-list">
                    {d.gvPlanes.map((p, i) => <div key={i} className="pf-gv-item"><div className="pf-gv-dot"/>{p}</div>)}
                  </div>
                </div>
              )}
            </m.div>
          )}

          {/* ── SECCIÓN 6 — Universidades ── */}
          <m.div className="pf-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={sp(0.55)}>
            <div className="pf-eyebrow">SIGUIENTE PASO</div>
            <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: '1.5rem', color: '#0D0D0D', marginBottom: 8 }}>
              ¿Listo para el siguiente paso?
            </h2>
            <p style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 15, color: '#6B6B6B', lineHeight: 1.65, marginBottom: 24 }}>
              Este portafolio y certificado son reconocidos internacionalmente. Úsalos en tu aplicación universitaria.
            </p>
            <div className="pf-uni-grid">
              {UNIVERSITIES.map(u => (
                <m.div
                  key={u.name}
                  className="pf-uni-card"
                  whileHover={{ y: -2, scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                >
                  <UniLogo src={u.logo} alt={u.name} initial={u.initial} />
                  <div className="pf-uni-name">{u.name}</div>
                  <div className="pf-uni-desc">{u.desc}</div>
                  <a href={u.url} target="_blank" rel="noreferrer" className="pf-uni-btn">
                    Aplicar →
                  </a>
                </m.div>
              ))}
            </div>
          </m.div>

          {/* ── SECCIÓN 7 — Export PDF ── */}
          <m.div className="pf-export" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={sp(0.6)}>
            <div className="pf-export-eyebrow">EXPORTAR PORTAFOLIO</div>
            <h2 className="pf-export-title">Listo para Common App y más.</h2>
            <p className="pf-export-sub">
              Descarga tu portafolio formateado para pegarlo directamente en la sección
              &ldquo;Additional Information&rdquo; de Common App, UCAS, o cualquier plataforma de admisiones.
            </p>
            <m.button
              className="pf-export-btn"
              onClick={exportPDF}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              Descargar PDF
            </m.button>
          </m.div>

          {/* ── Footer ── */}
          <m.div className="pf-footer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={sp(0.7)}>
            <p className="pf-footer-text">Portafolio generado por The Big Family Platform</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8 }}>
              <a href="/" className="pf-footer-link">← Ver el programa</a>
              <a href="/#como-funciona" className="pf-footer-link">¿Eres educador? Conoce el programa →</a>
            </div>
          </m.div>

        </div>
      </div>

      {/* Copy notification — invisible element for state only */}
      {copied && <div style={{ display: 'none' }} />}
    </>
  )
}
