'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { Link } from 'next-view-transitions'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { m, AnimatePresence, useInView, useTransform, useReducedMotion, useScroll } from 'framer-motion'

import AprendizajeSection from '@/components/AprendizajeSection'
import AlumniSection from '@/components/AlumniSection'
import FounderSection from '@/components/FounderSection'
import SchoolTicker from '@/components/SchoolTicker'
import WorldMapPublic from '@/components/WorldMapPublic'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'
import AnimatedNumber from '@/components/AnimatedNumber'
import { useRealtimeStats } from '@/hooks/useRealtimeStats'

const Globe3DHero = dynamic(() => import('@/components/Globe3DHero'), { ssr: false })

// ── Country scramble — cycles through connected countries with text scramble ──
const SCRAMBLE_WORDS = [
  'COLOMBIA','ESTADOS UNIDOS','MÉXICO','GUATEMALA','NICARAGUA',
  'COSTA RICA','PARAGUAY','FRANCIA','ALEMANIA','ESPAÑA','EMIRATOS','CANADÁ',
]
function CountryScramble() {
  const t = useTranslations()
  const [text, setText] = useState(SCRAMBLE_WORDS[0])
  const idxRef = useRef(0)

  useEffect(() => {
    let resolveTimer: ReturnType<typeof setTimeout>
    let scrambleTimer: ReturnType<typeof setInterval>

    function scramble(target: string, progress: number): string {
      return target.split('').map((ch, i) => {
        if (ch === ' ') return ' '
        if (i < progress) return ch
        return String.fromCharCode(65 + Math.floor(Math.random() * 26))
      }).join('')
    }

    function scrambleTo(target: string) {
      let progress = 0
      setText(scramble(target, 0))
      scrambleTimer = setInterval(() => {
        progress++
        setText(scramble(target, progress))
        if (progress >= target.length) {
          clearInterval(scrambleTimer)
          resolveTimer = setTimeout(nextWord, 1500)
        }
      }, 40)
    }

    function nextWord() {
      idxRef.current = (idxRef.current + 1) % SCRAMBLE_WORDS.length
      scrambleTo(SCRAMBLE_WORDS[idxRef.current])
    }

    resolveTimer = setTimeout(nextWord, 1500)
    return () => { clearTimeout(resolveTimer); clearInterval(scrambleTimer) }
  }, [])

  return (
    <div style={{
      fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
      fontSize: 12,
      letterSpacing: '0.15em',
      color: 'var(--mute,#6B6B6B)',
      textTransform: 'uppercase',
      marginTop: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span style={{ opacity: 0.5 }}>→ {t('landing.hero.connectingWith')}</span>
      <span style={{ color: 'var(--accent,#C0392B)', minWidth: '12ch', display: 'inline-block' }}>{text}</span>
    </div>
  )
}

// ── CountNumber helper ────────────────────────────────────────────────────────
function CountNumber({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref    = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const dur = 1400
    function tick(t: number) {
      const p = Math.min((t - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(to * e))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [inView, to])
  return <span ref={ref}>{val}{suffix}</span>
}

// ── ImpactoNum — per-stat custom duration counter ─────────────────────────────
function ImpactoNum({ to, duration, delayMs = 0, comma = false, suffix = '' }: {
  to: number; duration: number; delayMs?: number; comma?: boolean; suffix?: string
}) {
  const ref    = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const tmrRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    tmrRef.current = setTimeout(() => {
      const t0 = performance.now()
      function tick(t: number) {
        const p = Math.min((t - t0) / duration, 1)
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))))
        if (p < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }, delayMs)
    return () => {
      if (tmrRef.current) clearTimeout(tmrRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [inView, to, duration, delayMs]) // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>{comma ? val.toLocaleString('en-US') : val}{suffix}</span>
}

// ── Static section data ───────────────────────────────────────────────────────

const IMPACTO_STATS = [
  { to: 876,  duration: 1800, delayMs: 0,   comma: false, suffix: '',  label: 'Estudiantes impactados', sub: 'desde 2015'                    },
  { to: 22,   duration: 1200, delayMs: 200, comma: false, suffix: '',  label: 'Colegios en Colombia',   sub: 'aliados del programa'           },
  { to: 10,   duration: 1000, delayMs: 400, comma: false, suffix: '',  label: 'Países conectados',      sub: 'red internacional'              },
  { to: 3300, duration: 2400, delayMs: 100, comma: true,  suffix: '+', label: 'Meta 2030',              sub: '20% líderes transformacionales' },
] as const

const VALORES = [
  { name: 'Ética',             slug: 'etica',            desc: 'Actuamos con integridad en cada decisión.'          },
  { name: 'Compromiso',        slug: 'compromiso',        desc: 'Nos entregamos completamente a nuestro propósito.'  },
  { name: 'Trascendencia',     slug: 'trascendencia',     desc: 'Dejamos una huella positiva que perdura.'           },
  { name: 'Conciencia Social', slug: 'conciencia-social', desc: 'Entendemos nuestro impacto en la comunidad.'        },
  { name: 'Innovación',        slug: 'innovacion',        desc: 'Buscamos nuevas formas de resolver problemas.'      },
  { name: 'Creatividad',       slug: 'creatividad',       desc: 'Encontramos soluciones originales y únicas.'        },
] as const

const VALIDACIONES = [
  {
    logo: '/cognia.png',
    alt:  'Cognia',
    name: 'Cognia (formerly AdvancED)',
    desc: 'Reconoció el programa durante su visita institucional como innovador y socialmente relevante.',
    tag:  'Acreditación Institucional',
  },
  {
    logo: '/ibimage-transparent_orig.png',
    alt:  'International Baccalaureate',
    name: 'International Baccalaureate',
    desc: 'El programa fue presentado en la IB Americas Conference en Orlando como iniciativa destacada de liderazgo escolar.',
    tag:  'IB Americas Conference',
  },
  {
    logo: '/tri.png',
    alt:  'Tri-Association',
    name: 'Tri-Association',
    desc: 'Destacó la importancia del programa en 2024 y lo seleccionó para participar en el evento TRIHEROES en mayo 2025.',
    tag:  'TRIHEROES 2025',
  },
] as const

const misionStats = [
  { to: 5000, suffix: '+', label: 'Líderes a formar'      },
  { to: 50,   suffix: '+', label: 'Países para 2036'      },
  { to: 90,   suffix: '',  label: 'Instituciones aliadas' },
  { to: 2036, suffix: '',  label: 'Meta global'           },
]


/* EDITAR AQUÍ — fundadores */
const FOUNDERS_STATIC = [
  { initials: 'SG', name: 'Samuel Gomez',       roleKey: 'landing.equipo.founder1Role' as const, bioKey: 'landing.equipo.founder1Bio' as const, tagKeys: ['landing.equipo.tagTecnologia', 'landing.equipo.tagPlataforma', 'landing.equipo.tagDesarrollo'] as const },
  { initials: 'JV', name: 'Juan Felipe Visbal', roleKey: 'landing.equipo.founder2Role' as const, bioKey: 'landing.equipo.founder2Bio' as const, tagKeys: ['landing.equipo.tagContenido',   'landing.equipo.tagComunicacion', 'landing.equipo.tagLiderazgo']  as const },
  { initials: 'AG', name: 'Alejandro Garcia',   roleKey: 'landing.equipo.founder3Role' as const, bioKey: 'landing.equipo.founder3Bio' as const, tagKeys: ['landing.equipo.tagOperaciones', 'landing.equipo.tagEstrategia',  'landing.equipo.tagEstructura']  as const },
]


type TabId = 'programa' | 'historia' | 'metodologia' | 'red' | 'equipo' | 'noticias'

const NAV_LINKS = [
  { href: '#historia',    label: 'Historia'    },
  { href: '#impacto',     label: 'Impacto'     },
  { href: '#nuestra-red', label: 'Nuestra Red' },
  { href: '#equipo',      label: 'Equipo'      },
  { href: '/news',        label: 'Noticias'    },
]

// Nav links that switch tabs instead of scrolling to an anchor — #impacto is the
// exception: that section stays always-rendered outside the tab system.
const NAV_TAB_MAP: Partial<Record<string, TabId>> = {
  '#historia':    'historia',
  '#nuestra-red': 'red',
  '#equipo':      'equipo',
  '/news':        'noticias',
}

const LOCALES = [
  { code: 'es', label: 'Español',   short: 'ES', dir: 'ltr'  as const },
  { code: 'en', label: 'English',   short: 'EN', dir: 'ltr'  as const },
  { code: 'fr', label: 'Français',  short: 'FR', dir: 'ltr'  as const },
  { code: 'pt', label: 'Português', short: 'PT', dir: 'ltr'  as const },
  { code: 'ar', label: 'العربية',   short: 'AR', dir: 'rtl'  as const },
]

const LanguageSelector = memo(function LanguageSelector() {
  const pathname      = usePathname()
  const currentLocale = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function changeLocale(newLocale: string) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`

    const locales = ['en', 'fr', 'pt', 'ar'] // 'es' no tiene prefijo
    let cleanPath = pathname
    for (const locale of locales) {
      if (pathname.startsWith(`/${locale}`)) {
        cleanPath = pathname.slice(`/${locale}`.length) || '/'
        break
      }
    }
    const newPath = newLocale === 'es' ? cleanPath : `/${newLocale}${cleanPath}`
    window.location.href = newPath
    setOpen(false)
  }

  return (
    <div className="lang-sel" ref={ref}>
      <button
        className="lang-sel__btn"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {currentLocale.toUpperCase()}
        <svg
          width="10" height="7" viewBox="0 0 10 7" aria-hidden="true"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <path d="M1 1L5 5.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            className="lang-sel__drop"
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            {LOCALES.map(lang => (
              <button
                key={lang.code}
                className={`lang-sel__opt${lang.code === currentLocale ? ' lang-sel__opt--active' : ''}`}
                onClick={() => changeLocale(lang.code)}
                role="option"
                aria-selected={lang.code === currentLocale}
                dir={lang.dir}
              >
                {lang.label}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ── Visión section ───────────────────────────────────────────────────────────
type VisionWord = { word: string; italic: boolean }
const visionWordV = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 20 } },
}
const visionStaggerV = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const FAQ_ITEMS = [
  { q: '¿El programa es gratuito?', a: 'Sí, Big Family es completamente gratuito para los estudiantes. El programa es financiado por alianzas institucionales y el compromiso de sus fundadores con la educación equitativa en La Guajira.' },
  { q: '¿Solo puedo participar si soy de La Guajira, Colombia?', a: 'Actualmente el programa opera en 8 colegios de La Guajira. Si tu institución está interesada en sumarse a la red, puedes contactarnos a través del formulario de coordinadores en /register.' },
  { q: '¿Qué es la certificación "The Big Leader"?', a: 'The Big Leader es la certificación oficial del programa. Se obtiene al completar los módulos de liderazgo, desarrollar un proyecto comunitario (Capstone IDEMR) y demostrar impacto medible en tu entorno.' },
  { q: '¿Cuánto tiempo dura el programa?', a: 'El programa tiene una duración de un año académico, con 7 módulos progresivos, mentoría continua y el proyecto Capstone al final del ciclo. Los módulos están diseñados para completarse a tu propio ritmo.' },
  { q: '¿Cómo se registra un coordinador de colegio?', a: 'Los coordinadores reciben un código de acceso institucional de parte del equipo de Big Family. Con ese código pueden registrarse en /register y acceder al panel de gestión de su colegio.' },
]

const FAQSection = memo(function FAQSection({ reduced }: { reduced: boolean }) {
  const t = useTranslations()
  const [open, setOpen] = useState<number | null>(null)
  const faqItems = [
    { q: t('landing.faq.q1'), a: t('landing.faq.a1') },
    { q: t('landing.faq.q2'), a: t('landing.faq.a2') },
    { q: t('landing.faq.q3'), a: t('landing.faq.a3') },
    { q: t('landing.faq.q4'), a: t('landing.faq.a4') },
    { q: t('landing.faq.q5'), a: t('landing.faq.a5') },
  ]
  return (
    <section className="sec-faq">
      <div className="sec-faq__inner">
        <m.div
          className="sec-faq__header"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <p className="sec-faq__eyebrow">{t('landing.faq.eyebrow')}</p>
          <h2 className="sec-faq__title">{t('landing.faq.title')}</h2>
        </m.div>
        <div>
          {faqItems.map((faq, i) => (
            <m.div
              key={i}
              className="sec-faq__item"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.06 }}
            >
              <button
                className="sec-faq__q"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                {faq.q}
                <svg
                  className={`sec-faq__chevron${open === i ? ' sec-faq__chevron--open' : ''}`}
                  width="18" height="18" viewBox="0 0 18 18" fill="none"
                  aria-hidden="true"
                >
                  <path d="M4 6.5L9 11.5L14 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="sec-faq__a">{faq.a}</p>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
})

const TabNav = memo(function TabNav({
  active, onChange,
}: { active: TabId; onChange: (id: TabId) => void }) {
  const t = useTranslations()
  const tabs: { id: TabId; label: string }[] = [
    { id: 'programa',    label: t('tabs.programa')    },
    { id: 'historia',    label: t('tabs.historia')    },
    { id: 'metodologia', label: t('tabs.metodologia') },
    { id: 'red',         label: t('tabs.red')         },
    { id: 'equipo',      label: t('tabs.equipo')      },
    { id: 'noticias',    label: t('tabs.noticias')    },
  ]
  return (
    <div style={{
      position: 'sticky', top: '72px', zIndex: 40,
      background: 'var(--bg)', borderBottom: '1px solid var(--line)',
      display: 'flex', justifyContent: 'center', padding: '0 24px',
    }}>
      <div style={{
        display: 'flex', maxWidth: '900px', width: '100%',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '16px 20px', fontSize: '14px', fontFamily: 'inherit',
            color: active === tab.id ? 'var(--ink)' : 'var(--mute)',
            fontWeight: active === tab.id ? 600 : 400,
            borderBottom: active === tab.id ? '2px solid #C0392B' : '2px solid transparent',
            transition: 'color 0.2s, border-color 0.2s', whiteSpace: 'nowrap',
          }}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
})

const TESTIMONIOS = [
  { quote: 'Big Family cambió mi manera de ver el mundo. Aprendí a liderar con propósito y a trabajar por mi comunidad con impacto real.', name: 'María González', role: 'Estudiante · Cohorte 2026', school: 'IE Técnica María Inmaculada', init: 'MG' },
  { quote: 'La certificación The Big Leader me abrió puertas que nunca imaginé. Pude presentar mi proyecto ante líderes internacionales.', name: 'Carlos Pérez', role: 'Estudiante · Cohorte 2026', school: 'IE Comfamiliar', init: 'CP' },
  { quote: 'Lo más valioso no fue el certificado, sino la familia que construí. Hoy somos una red de líderes que se apoyan mutuamente.', name: 'Valeria Rodríguez', role: 'Estudiante · Cohorte 2026', school: 'IE Paulo VI', init: 'VR' },
]

const PROGRAM_COMPONENTS = [
  {
    num: '01',
    tag: 'Coaching Individual',
    name: 'The Big Leader',
    desc: 'Entrenamiento personalizado enfocado en habilidades intrapersonales e interpersonales. Incluye sesiones de coaching y planes de acción anuales. Forman Mini y Junior CEOs.',
  },
  {
    num: '02',
    tag: 'Metodología Lúdica',
    name: "The Leader's Game",
    desc: 'Juego de retos por estaciones donde los equipos acumulan puntos. Identifica fortalezas y áreas de crecimiento de cada participante, especialmente para estudiantes neurodiversos.',
  },
  {
    num: '03',
    tag: 'Emprendimiento Global',
    name: 'The Great Venture',
    desc: 'Aplicación con algoritmo que ayuda a los estudiantes a definir su dirección como emprendedores globales. Usa la matriz Hoshin Kanri para garantizar el éxito.',
  },
  {
    num: '04',
    tag: 'Red Social Educativa',
    name: 'Kashi',
    desc: 'Red social educativa. Kashi es palabra wayuu que significa "luna". Los estudiantes comparten sus fortalezas con pares de otras instituciones a nivel mundial.',
  },
] as const

export default function GlobeHero() {
  const t = useTranslations()

  // Nav label lookup — avoids calling t() inside module-level const
  const navLabels: Record<string, string> = {
    '#historia':    t('nav.historia'),
    '#impacto':     t('nav.impacto'),
    '#nuestra-red': t('nav.nuestraRed'),
    '#equipo':      t('nav.equipo'),
    '/news':        t('nav.noticias'),
  }

  // Slug → translation key for VALORES (slug uses kebab-case, keys use camelCase)
  const valorKeyMap: Record<string, string> = {
    'etica':             'etica',
    'compromiso':        'compromiso',
    'trascendencia':     'trascendencia',
    'conciencia-social': 'concienciaSocial',
    'innovacion':        'innovacion',
    'creatividad':       'creatividad',
  }

  // Impacto stats labels — module-level array has animation data, text comes from i18n
  const impactoLabels = [
    t('landing.impacto.stat1Label'),
    t('landing.impacto.stat2Label'),
    t('landing.impacto.stat3Label'),
    t('landing.impacto.stat4Label'),
  ]

  const impactoSubs = [
    t('landing.impacto.stat1Sub'),
    t('landing.impacto.stat2Sub'),
    t('landing.impacto.stat3Sub'),
    t('landing.impacto.stat4Sub'),
  ]

  const visionWords: VisionWord[] = t('landing.vision.animatedWords')
    .split(' ')
    .map(w => ({ word: w.replace(/\*/g, ''), italic: w.startsWith('*') && w.endsWith('*') }))

  const founders = FOUNDERS_STATIC.map(f => ({
    initials: f.initials,
    name:     f.name,
    role:     t(f.roleKey),
    bio:      t(f.bioKey),
    tags:     f.tagKeys.map(k => t(k)),
  }))

  const misionStatLabels = [
    t('landing.mision.stat1Label'),
    t('landing.mision.stat2Label'),
    t('landing.mision.stat3Label'),
    t('landing.mision.stat4Label'),
  ]

  // Program components text — names stay untranslated (program names)
  const programTexts = [
    { tag: t('landing.metodologia.bigLeader.subtitle'),    desc: t('landing.metodologia.bigLeader.body')    },
    { tag: t('landing.metodologia.leadersGame.subtitle'),  desc: t('landing.metodologia.leadersGame.body')  },
    { tag: t('landing.metodologia.greatVenture.subtitle'), desc: t('landing.metodologia.greatVenture.body') },
    { tag: t('landing.metodologia.kashi.subtitle'),        desc: t('landing.metodologia.kashi.body')        },
  ]

  // Validaciones descriptions — 3 items matching cognia, ib, triAssociation order
  const validacionesDescs = [
    t('landing.acreditaciones.cognia.description'),
    t('landing.acreditaciones.ib.description'),
    t('landing.acreditaciones.triAssociation.description'),
  ]

  // Validaciones tags — first is a translatable Spanish phrase, others are proper nouns/event names
  const validacionesTags = [
    t('landing.acreditaciones.institutionalTag'),
    VALIDACIONES[1].tag,
    VALIDACIONES[2].tag,
  ]

  const prefersReduced      = useReducedMotion()
  const locale              = useLocale()
  const [scrollHintVisible, setScrollHintVisible] = useState(true)
  const [navScrolled,       setNavScrolled]       = useState(false)
  const [navMounted,        setNavMounted]        = useState(false)
  const [activeSection,     setActiveSection]     = useState('')
  const [mobileNavOpen,     setMobileNavOpen]     = useState(false)
  const [showDiplomaModal,  setShowDiplomaModal]  = useState(false)
  const [activeTab,         setActiveTab]         = useState<TabId>('programa')
  const [latestNews,        setLatestNews]        = useState<{
    id: string; title: string; excerpt: string; cover_url: string | null
    published_at: string; slug: string
  }[]>([])

  // Close diploma modal on ESC
  useEffect(() => {
    if (!showDiplomaModal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDiplomaModal(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showDiplomaModal])

  const { stats: liveStats, loading: statsLoading } = useRealtimeStats()

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [featuredStories, setFeaturedStories] = useState<{ id: string; title: string; story: string; cover_url: string | null; student_name: string | null; school_name: string | null }[]>([])

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function loadStories() {
      const { data: rows } = await sb!.from('success_stories').select('id, title, story, cover_url, published_at, student_id, school_id').eq('published', true).order('published_at', { ascending: false }).limit(3)
      if (!rows || rows.length === 0) return
      const userIds   = rows.map((r: { student_id: string }) => r.student_id)
      const schoolIds = rows.map((r: { school_id: string | null }) => r.school_id).filter(Boolean) as string[]
      const [{ data: profiles }, { data: schools }] = await Promise.all([
        sb!.from('profiles').select('id, display_name').in('id', userIds),
        schoolIds.length ? sb!.from('schools').select('id, name').in('id', schoolIds) : Promise.resolve({ data: [] }),
      ])
      const pMap: Record<string, string> = {}
      profiles?.forEach((p: { id: string; display_name: string | null }) => { pMap[p.id] = p.display_name ?? '' })
      const sMap: Record<string, string> = {}
      schools?.forEach((s: { id: string; name: string }) => { sMap[s.id] = s.name })
      setFeaturedStories(rows.map((r: { id: string; title: string; story: string; cover_url: string | null; student_id: string; school_id: string | null }) => ({ id: r.id, title: r.title, story: r.story, cover_url: r.cover_url, student_name: pMap[r.student_id] ?? null, school_name: r.school_id ? (sMap[r.school_id] ?? null) : null })))
    }
    loadStories()
  }, [])

  // Latest news — MOCK_MODE guard first, per project convention
  useEffect(() => {
    if (MOCK_MODE) {
      setLatestNews([
        { id: '1', slug: 'ib-americas-2026', title: 'Big Family en el IB Americas Conference 2026',
          excerpt: 'Presentado ante más de 400 instituciones educativas internacionales.',
          cover_url: null, published_at: '2026-05-15T00:00:00Z' },
        { id: '2', slug: 'dia-liderazgo-2026', title: 'Día de Liderazgo: estudiantes como maestros',
          excerpt: 'Los líderes tomaron el rol de docentes durante una jornada completa.',
          cover_url: null, published_at: '2026-04-20T00:00:00Z' },
        { id: '3', slug: 'triheroes-2025', title: 'Seleccionados para TRIHEROES 2025',
          excerpt: 'La Tri-Association reconoció Big Family como iniciativa destacada.',
          cover_url: null, published_at: '2026-03-10T00:00:00Z' },
      ])
      return
    }
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    sb.from('news')
      .select('id, title, content, cover_url, published_at, slug')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(3)
      .then(({ data }: { data: { id: string; title: string; content: string; cover_url: string | null; published_at: string; slug: string }[] | null }) => {
        if (!data) return
        setLatestNews(data.map(r => ({
          id: r.id, title: r.title, cover_url: r.cover_url, published_at: r.published_at, slug: r.slug,
          excerpt: r.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 140),
        })))
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { scrollY } = useScroll()
  const historiaTextY = useTransform(scrollY, [600, 2000], [-20, 20])

  useEffect(() => {
    const onScrollHint = () => setScrollHintVisible(window.scrollY < 100)
    window.addEventListener('scroll', onScrollHint, { passive: true })
    return () => window.removeEventListener('scroll', onScrollHint)
  }, [])

  const navigateToTab = (tabId: TabId) => {
    setActiveTab(tabId)
    setMobileNavOpen(false)
    setTimeout(() => {
      document.getElementById('tab-nav-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  function handleNavLink(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    const tabId = NAV_TAB_MAP[href]
    if (tabId) { e.preventDefault(); navigateToTab(tabId); return }
    if (!href.startsWith('#')) return
    e.preventDefault()
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileNavOpen(false)
  }

  useEffect(() => { setNavMounted(true) }, [])

  useEffect(() => {
    const unsub = scrollY.on('change', v => setNavScrolled(v > 80))
    return unsub
  }, [scrollY])

  // Only 'impacto' is always in the DOM — historia/nuestra-red/equipo now live
  // inside tab panes and are highlighted via activeTab instead (see NAV_TAB_MAP).
  useEffect(() => {
    const el = document.getElementById('impacto')
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActiveSection('impacto') },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])


  return (
    <>
      <style>{`
        :root{--bg:#F5F3EF;--bg-2:#EFECE6;--ink:#0D0D0D;--ink-2:#2D2D2D;--mute:#6B6B6B;--line:rgba(13,13,13,.10);--line-soft:rgba(13,13,13,.06);--accent:#C0392B;--shadow-lg:0 30px 80px -20px rgba(13,13,13,.18),0 10px 30px -10px rgba(13,13,13,.10);}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);color:var(--ink);font-family:"Satoshi",sans-serif;-webkit-font-smoothing:antialiased;}
        body{min-height:100dvh;overflow-x:hidden;}
        body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:1;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");opacity:.55;mix-blend-mode:multiply;}
        .pill-nav-wrap{position:fixed;top:0;left:0;right:0;z-index:100;pointer-events:none;display:flex;justify-content:center;padding:16px 20px;}
        .pill-nav{pointer-events:all;display:flex;align-items:center;background:rgba(245,243,239,0.85);backdrop-filter:blur(12px) saturate(180%);border:1px solid var(--line);border-radius:999px;padding:6px 6px 6px 16px;transition:background 0.3s cubic-bezier(0.22,1,0.36,1),box-shadow 0.3s cubic-bezier(0.22,1,0.36,1);box-shadow:var(--shadow-raised);}
        .pill-nav--scrolled{background:var(--bg-2,rgba(239,236,230,0.96));box-shadow:0 8px 32px rgba(13,13,13,.12),0 2px 8px rgba(13,13,13,.06);}
        .pill-nav__brand{display:flex;align-items:center;gap:8px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);text-decoration:none;margin-right:20px;flex-shrink:0;}
        .pill-nav__links{display:flex;gap:2px;align-items:center;}
        .pill-nav__link{font-family:"Satoshi",sans-serif;font-size:13.5px;color:var(--ink-2);text-decoration:none;padding:7px 12px;border-radius:999px;transition:color 0.2s cubic-bezier(0.22,1,0.36,1),background 0.2s cubic-bezier(0.22,1,0.36,1);}
        .pill-nav__link:hover{color:var(--ink);background:rgba(13,13,13,0.06);}
        .pill-nav__link--active{color:var(--ink);background:rgba(13,13,13,0.07);}
        .pill-nav__cta{margin-left:8px;padding:8px 16px;background:var(--ink);color:var(--bg,#F5F3EF);font-family:"Satoshi",sans-serif;font-size:13px;font-weight:600;border-radius:999px;text-decoration:none;border:none;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;transition:background 0.2s cubic-bezier(0.22,1,0.36,1);}
        .pill-nav__cta:hover{background:var(--accent,#C0392B);}
        .pill-nav__cta:active{transform:scale(0.97);}
        .pill-nav__cta-arrow{display:inline-block;transition:transform 0.2s cubic-bezier(0.22,1,0.36,1);}
        .pill-nav__cta:hover .pill-nav__cta-arrow{transform:translateX(3px);}
        .pill-nav__hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:var(--ink);margin-left:6px;border-radius:999px;transition:background 0.15s;}
        .pill-nav__hamburger:hover{background:rgba(13,13,13,0.06);}
        @media(max-width:760px){.pill-nav__links{display:none;}.pill-nav__hamburger{display:flex;align-items:center;justify-content:center;}}
        .pill-nav-overlay{position:fixed;inset:0;background:rgba(13,13,13,0.5);z-index:99;}
        .pill-nav-drawer{position:fixed;top:0;left:0;right:0;z-index:100;background:var(--bg,#F5F3EF);border-bottom:1px solid var(--line);padding:72px 24px 28px;display:flex;flex-direction:column;gap:4px;}
        .pill-nav-drawer__link{font-family:"Satoshi",sans-serif;font-size:18px;font-weight:500;color:var(--ink);text-decoration:none;padding:12px 0;border-bottom:1px solid rgba(13,13,13,0.06);}
        .pill-nav-drawer__cta{margin-top:16px;padding:14px 24px;background:var(--ink);color:var(--bg,#F5F3EF);font-family:"Satoshi",sans-serif;font-size:15px;font-weight:600;border-radius:999px;text-decoration:none;text-align:center;}
        .lang-sel{position:relative;margin:0 4px;}
        .lang-sel__btn{font-family:"Satoshi",sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;color:var(--ink-2);background:none;border:1px solid var(--line);border-radius:999px;padding:5px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:color 0.2s cubic-bezier(0.22,1,0.36,1),background 0.2s cubic-bezier(0.22,1,0.36,1);}
        .lang-sel__btn:hover{color:var(--ink);background:rgba(13,13,13,0.06);}
        .lang-sel__drop{position:absolute;top:calc(100% + 8px);right:0;min-width:130px;background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,0.08));border-radius:12px;box-shadow:var(--shadow-raised,0 4px 16px rgba(13,13,13,0.08));overflow:hidden;z-index:200;display:flex;flex-direction:column;}
        .lang-sel__opt{width:100%;background:none;border:none;padding:9px 16px;font-family:"Satoshi",sans-serif;font-size:13.5px;color:var(--ink);text-align:left;cursor:pointer;transition:background 0.15s cubic-bezier(0.22,1,0.36,1);}
        .lang-sel__opt:hover{background:rgba(13,13,13,0.05);}
        .lang-sel__opt--active{color:var(--accent,#C0392B);font-weight:600;}
        .lang-sel__opt[dir="rtl"]{text-align:right;}
        @media(max-width:760px){.lang-sel{display:none;}}
        .btn{font-family:"Satoshi",sans-serif;font-size:13px;font-weight:500;padding:10px 16px;border-radius:999px;border:1px solid transparent;cursor:pointer;transition:all .25s ease;}
        .btn--ghost{background:transparent;color:var(--ink);border-color:var(--line);}
        .btn--ghost:hover{border-color:var(--ink-2);background:rgba(13,13,13,.04);}
        .btn--solid{background:var(--ink);color:#fff;border-color:var(--ink);}
        .btn--solid:hover{background:var(--accent);border-color:var(--accent);transform:translateY(-1px);box-shadow:0 10px 24px -8px rgba(192,57,43,.45);}
        .btn:active{transform:scale(0.98) !important;transition-duration:.08s !important;}
        .btn:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:999px;}
        .hero{position:relative;min-height:100dvh;padding:120px 0 140px;display:grid;grid-template-columns:57fr 43fr;width:100%;overflow:visible;}
        .hero::before{content:"";position:absolute;left:40px;right:40px;top:90px;height:1px;background:var(--line-soft);}
        .meta{position:absolute;left:40px;right:40px;top:100px;display:flex;justify-content:space-between;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);z-index:2;}
        .meta .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);margin-right:8px;vertical-align:middle;position:relative;box-shadow:0 0 8px rgba(192,57,43,.6);animation:blink 1.6s ease-in-out infinite;}
        .meta .dot::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:1.5px solid var(--accent);opacity:.6;animation:pp 2s ease-out infinite;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.55}}
        @keyframes pp{0%{transform:scale(.6);opacity:.8}100%{transform:scale(2.2);opacity:0}}
        .left{position:relative;z-index:3;padding:20px 24px 0 40px;align-self:center;}
        .brand{display:flex;flex-direction:column;align-items:flex-start;gap:14px;margin-bottom:44px;}
        .brand__logo{width:88px;height:88px;display:flex;align-items:center;justify-content:center;}
        .brand__word{font-size:10.5px;letter-spacing:.56em;text-transform:uppercase;color:var(--mute);border-top:1px solid var(--line);padding-top:12px;width:240px;display:flex;justify-content:space-between;align-items:center;}
        .brand__word .word{font-weight:400;letter-spacing:.48em;color:var(--ink-2);}
        h1.headline{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(40px,4.6vw,68px);line-height:1.02;letter-spacing:-0.045em;color:var(--ink);max-width:620px;font-synthesis:none;}
        h1.headline em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:var(--accent);}
        h1.headline .dot-end{color:var(--accent);}
        .lede{margin-top:26px;max-width:52ch;color:var(--ink-2);font-size:16px;line-height:1.65;}
        .cta-row{display:flex;gap:12px;margin-top:34px;align-items:center;}
        .stats{display:grid;grid-template-columns:1fr 1fr 1fr;margin-top:52px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);max-width:560px;}
        .stat{padding:20px 22px;border-right:1px solid var(--line);}
        .stat:last-child{border-right:0;}
        .stat__num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:40px;letter-spacing:-0.03em;color:var(--ink);line-height:1;display:flex;align-items:baseline;gap:2px;}
        .stat__num .plus{font-family:"Instrument Serif",serif;font-weight:400;font-style:italic;color:var(--accent);font-size:28px;}
        .stat__label{margin-top:10px;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--mute);}
        .right{position:relative;width:100%;z-index:2;overflow:visible;}
        .scroll-ind{position:absolute;left:50%;bottom:-130px;transform:translateX(-50%);z-index:4;display:flex;flex-direction:column;align-items:center;gap:10px;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--mute);}
        .scroll-ind .bar{width:1px;height:40px;background:linear-gradient(var(--line),transparent);position:relative;overflow:hidden;}
        .scroll-ind .bar::after{content:"";position:absolute;top:0;left:0;right:0;height:10px;background:var(--ink);animation:drop 2.2s ease-in-out infinite;}
        @keyframes drop{0%{transform:translateY(-10px);opacity:0}40%{opacity:1}100%{transform:translateY(40px);opacity:0}}
        .hero-bottom-spacer{height:0;}
        @media(prefers-reduced-motion:reduce){
          .meta .dot,.meta .dot::after,.scroll-ind .bar::after{animation:none !important;}
        }
        @media(max-width:960px){.hero{grid-template-columns:1fr;padding:80px 24px 100px;}.right{order:-1;height:280px;}.left{order:1;}.meta{left:20px;right:20px;}}
        /* ── MISIÓN ──────────────────────────────────────────────────────────── */
        .mision{background:#080808;padding:136px 40px;}
        .mision__inner{max-width:900px;margin:0 auto;text-align:center;}
        .mision__eyebrow-pill{display:inline-flex;align-items:center;border:1px solid rgba(192,57,43,0.3);background:rgba(192,57,43,0.08);color:#C0392B;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;border-radius:999px;padding:6px 16px;margin-bottom:40px;}
        .mision__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(52px,7vw,96px);line-height:1.0;letter-spacing:-0.04em;margin-top:0;}
        .mision__title-line{display:block;color:rgba(255,255,255,0.92);}
        .mision__title-line--accent{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .mision__sub{font-family:"Satoshi",sans-serif;font-size:18px;color:rgba(255,255,255,0.5);line-height:1.7;max-width:600px;margin:28px auto 0;text-align:center;}
        .mision__stats{max-width:1200px;margin:100px auto 0;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,0.06);}
        .mision__stat{padding:48px 32px;border-right:1px solid rgba(255,255,255,0.06);text-align:center;}
        .mision__stat:last-child{border-right:none;}
        .mision__stat-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:72px;color:#fff;line-height:1;display:flex;align-items:baseline;justify-content:center;gap:4px;letter-spacing:-0.04em;}
        .mision__stat-num em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;font-size:48px;}
        .mision__stat-label{font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-top:8px;}
        /* ── VISIÓN ──────────────────────────────────────────────────────────── */
        .vision{background:#0D0D0D;border-top:1px solid rgba(255,255,255,.06);padding:96px 40px;position:relative;overflow:hidden;}
        .vision__watermark{position:absolute;bottom:-20px;right:-10px;font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(120px,15vw,220px);color:rgba(255,255,255,.05);line-height:1;letter-spacing:-.06em;pointer-events:none;user-select:none;z-index:0;}
        .vision__inner{max-width:1200px;margin:0 auto;position:relative;z-index:1;display:flex;flex-direction:column;gap:52px;}
        .vision__row1{display:flex;flex-direction:column;gap:14px;}
        .vision__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#C0392B;}
        .vision__eyebrow-line{height:2px;background:#C0392B;border-radius:999px;transform-origin:left;width:60px;}
        .vision__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(40px,6vw,80px);letter-spacing:-.035em;line-height:1.08;color:#fff;}
        .vision__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .vision__cols{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;}
        .vision__para{font-family:"Satoshi",sans-serif;font-size:16px;color:rgba(255,255,255,.72);line-height:1.8;border-left:2px solid var(--accent,#C0392B);padding:4px 0 4px 16px;}
        /* ── SEC-CERT (Certificación marketing — light) ──────────────────────── */
        .sec-cert{background:var(--bg);padding:120px 40px;border-top:1px solid var(--line);}
        .sec-cert__inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:45fr 55fr;gap:80px;align-items:center;}
        .sec-cert__eyebrow{display:inline-flex;align-items:center;border:1px solid rgba(192,57,43,.3);background:rgba(192,57,43,.08);color:#C0392B;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;border-radius:999px;padding:5px 14px;margin-bottom:24px;}
        .sec-cert__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(32px,4vw,52px);color:var(--ink);letter-spacing:-0.04em;line-height:1.08;margin-bottom:20px;}
        .sec-cert__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:var(--accent);}
        .sec-cert__para{font-family:"Satoshi",sans-serif;font-size:16px;color:var(--mute);line-height:1.75;max-width:44ch;margin-bottom:32px;}
        .sec-cert__cta{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;background:var(--accent,#C0392B);color:#fff;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;text-decoration:none;transition:background .2s;border:none;cursor:pointer;appearance:none;}
        .sec-cert__cta:hover{background:#a93226;}
        /* ── Diploma modal ─────────────────────────────────────────────────── */
        .dm-overlay{position:fixed;inset:0;background:rgba(13,13,13,.75);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);}
        .dm-panel{position:relative;width:100%;max-width:660px;max-height:90dvh;overflow-y:auto;background:var(--card-bg,#fff);border-radius:4px;padding:36px 44px;}
        .dm-panel::before{content:"";position:absolute;inset:0;border-radius:4px;border:2px solid #C0392B;pointer-events:none;}
        .dm-panel::after{content:"";position:absolute;inset:8px;border-radius:2px;border:1px solid rgba(192,57,43,.25);pointer-events:none;}
        .dm-close{position:absolute;top:14px;right:14px;background:rgba(13,13,13,.07);border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;transition:background .15s;}
        .dm-close:hover{background:rgba(13,13,13,.14);}
        .dm-sep{height:1px;background:rgba(192,57,43,.22);margin:14px 0;}
        .sec-cert__bullets{margin-top:24px;display:flex;flex-direction:column;gap:10px;}
        .sec-cert__bullet{display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-size:13px;color:var(--mute);}
        .sec-cert__check{width:18px;height:18px;border-radius:50%;background:rgba(192,57,43,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .sec-cert__mockup-wrap{display:flex;align-items:center;justify-content:center;}
        .sc-dp{background:var(--card-bg,#fff);border-radius:4px;padding:28px 32px;position:relative;width:100%;box-shadow:var(--shadow-lg,0 30px 80px -20px rgba(13,13,13,.18),0 10px 30px -10px rgba(13,13,13,.10));}
        .sc-dp::before{content:"";position:absolute;inset:0;border-radius:4px;border:2px solid #C0392B;pointer-events:none;}
        .sc-dp::after{content:"";position:absolute;inset:6px;border-radius:2px;border:1px solid rgba(192,57,43,.25);pointer-events:none;}
        .sc-sep{height:1px;background:rgba(192,57,43,.22);margin:10px 0;}
        @media(max-width:960px){
          .sec-cert{padding:80px 24px;}
          .sec-cert__inner{grid-template-columns:1fr;gap:48px;}
          .sc-dp{}
        }
        /* ── NUESTRA HISTORIA ───────────────────────────────────────────────── */
        .historia{position:relative;background:#070707;padding:112px 40px;overflow:hidden;}
        .historia__grain{position:absolute;inset:0;pointer-events:none;z-index:0;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");opacity:0.35;mix-blend-mode:overlay;}
        .historia__radial{position:absolute;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse 90% 60% at 50% -10%,rgba(192,57,43,0.14),transparent 70%);}
        .historia__particle{position:absolute;border-radius:50%;background:rgba(192,57,43,0.4);pointer-events:none;z-index:0;animation:particleFloat linear infinite;}
        @keyframes particleFloat{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-20px);opacity:0.8}}
        .historia__inner{position:relative;z-index:1;max-width:1200px;margin:0 auto;}
        .historia__header{display:grid;grid-template-columns:55% 45%;gap:60px;align-items:center;margin-bottom:80px;}
        .historia__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:20px;}
        .historia__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(44px,6vw,80px);color:#fff;letter-spacing:-0.04em;line-height:1.0;}
        .historia__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .historia__sub{font-family:"Satoshi",sans-serif;font-size:16px;color:rgba(255,255,255,0.5);line-height:1.65;max-width:420px;}
        .bento{display:grid;grid-template-columns:1.4fr 1fr 1fr;grid-template-rows:auto auto;gap:16px;}
        .bento__cell{position:relative;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 24px 48px rgba(0,0,0,0.4);border-radius:20px;padding:32px;overflow:hidden;will-change:transform;transition:border-color 0.3s cubic-bezier(0.22,1,0.36,1),box-shadow 0.3s cubic-bezier(0.22,1,0.36,1),transform 0.3s cubic-bezier(0.22,1,0.36,1);}
        .bento__cell:hover{transform:translateY(-2px);}
        .bento__cell:hover{border-color:rgba(255,255,255,0.14);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 32px 64px rgba(0,0,0,0.5);}
        .bento__cell::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(192,57,43,0.6),transparent);opacity:0;transition:opacity 0.4s ease;}
        .bento__cell:hover::before{opacity:1;}
        .bento__cell--tall{grid-row:1/span 2;grid-column:1;}
        .bento__cell--wide{grid-row:2;grid-column:2/span 2;}
        .bento__year{font-family:var(--font-mono),monospace;font-size:13px;letter-spacing:0.15em;color:#C0392B;margin-bottom:16px;}
        .bento__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:rgba(255,255,255,0.92);margin-bottom:12px;line-height:1.25;}
        .bento__desc{font-family:"Satoshi",sans-serif;font-size:14px;color:rgba(255,255,255,0.45);line-height:1.65;}
        .bento__tag{display:inline-block;margin-top:20px;border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:0.15em;border-radius:999px;padding:4px 12px;}
        /* ── ABOUT DARK ─────────────────────────────────────────────────────── */
        .about-dark{background:#080808;padding:80px 40px;border-top:1px solid rgba(255,255,255,0.06);}
        .about-dark__inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:100px;align-items:center;}
        .about-dark__photo-wrap{position:relative;}
        .about-dark__photo-perspective{perspective:1200px;}
        .about-dark__photo{aspect-ratio:3/4;border-radius:20px;background:linear-gradient(145deg,#1a1a1a 0%,#0d0d0d 100%);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;will-change:transform;}
        .about-dark__photo-dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px);background-size:24px 24px;}
        .about-dark__photo-label{color:rgba(255,255,255,0.15);font-size:12px;font-family:"Satoshi",sans-serif;letter-spacing:0.2em;text-transform:uppercase;position:relative;z-index:1;}
        .about-dark__badge{position:absolute;top:-16px;right:-16px;background:rgba(192,57,43,0.9);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:12px 16px;z-index:10;}
        .about-dark__badge-num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:#fff;}
        .about-dark__badge-label{font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;}
        .about-dark__text{display:flex;flex-direction:column;}
        .about-dark__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:20px;}
        .about-dark__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(32px,4vw,52px);color:#fff;letter-spacing:-0.03em;line-height:1.1;margin-bottom:24px;}
        .about-dark__para{font-family:"Satoshi",sans-serif;font-size:16px;color:rgba(255,255,255,0.55);line-height:1.75;max-width:480px;}
        .about-dark__para+.about-dark__para{margin-top:20px;}
        .about-dark__divider{height:1px;background:rgba(255,255,255,0.08);margin:32px 0;}
        .about-dark__stats{display:flex;align-items:center;}
        .about-dark__stat{flex:1;text-align:center;padding:0 16px;}
        .about-dark__stat:first-child{padding-left:0;}
        .about-dark__stat:last-child{padding-right:0;}
        .about-dark__stat-num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:28px;color:#fff;}
        .about-dark__stat-label{font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;letter-spacing:0.05em;}
        .about-dark__stat-sep{width:1px;height:40px;background:rgba(255,255,255,0.08);flex-shrink:0;}
        .about-dark__cta{margin-top:32px;padding:12px 24px;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:999px;font-size:14px;font-family:"Satoshi",sans-serif;font-weight:500;cursor:pointer;transition:all 0.3s cubic-bezier(0.22,1,0.36,1);width:fit-content;}
        .about-dark__cta:hover{background:#C0392B;border-color:#C0392B;}
        .about-dark__cta:active{transform:scale(0.98);}
        /* ── EQUIPO ──────────────────────────────────────────────────────────── */
        .equipo{background:var(--bg,#F5F3EF);border-top:1px solid var(--line);padding:88px 40px;}
        .equipo__inner{max-width:1200px;margin:0 auto;}
        .equipo__header{display:grid;grid-template-columns:60% 40%;gap:40px;align-items:end;margin-bottom:80px;}
        .equipo__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--mute,#6B6B6B);margin-bottom:20px;}
        .equipo__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(36px,4vw,56px);color:var(--ink,#0D0D0D);letter-spacing:-0.03em;line-height:1.1;}
        .equipo__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .equipo__desc{font-family:"Satoshi",sans-serif;font-size:16px;color:var(--mute,#6B6B6B);line-height:1.65;}
        .equipo__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--line);border:1px solid var(--line);border-radius:20px;overflow:hidden;}
        .equipo__card{background:var(--card-bg,#F5F3EF);padding:40px 36px;display:flex;flex-direction:column;border:1px solid transparent;transition:box-shadow .3s cubic-bezier(0.22,1,0.36,1),transform .3s cubic-bezier(0.22,1,0.36,1),border-color .3s cubic-bezier(0.22,1,0.36,1);}
        .equipo__card:hover{box-shadow:0 16px 40px -8px rgba(13,13,13,.18),inset 0 2px 0 #C0392B;border-color:rgba(192,57,43,.3);}
        .equipo__card:active{transform:scale(0.99) translateY(-2px);}
        .equipo__card-content{display:flex;flex-direction:column;flex:1;}
        .equipo__avatar{width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:32px;color:#fff;margin-bottom:28px;flex-shrink:0;}
        .equipo__avatar--lg{width:144px;height:144px;font-size:44px;margin-bottom:36px;}
        .equipo__card-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:var(--ink,#0D0D0D);letter-spacing:-0.01em;margin-bottom:6px;}
        .equipo__card-role{font-family:"Satoshi",sans-serif;font-size:14px;color:#C0392B;margin-bottom:0;}
        .equipo__card-bio{font-family:"Satoshi",sans-serif;font-size:14px;color:#6B6B6B;line-height:1.6;flex:1;}
        .equipo__card-divider{border-top:1px solid var(--line);margin:12px 0;}
        .equipo__tags{display:flex;flex-wrap:wrap;gap:8px;}
        .equipo__tag{font-family:"Satoshi",sans-serif;font-size:11px;color:#C0392B;background:rgba(192,57,43,.08);border-radius:999px;padding:4px 12px;}
        @media(max-width:960px){.mision{padding:80px 24px;}.mision__stats{grid-template-columns:1fr 1fr;}.mision__stat{border-right:none;border-bottom:1px solid rgba(255,255,255,0.06);}.vision{padding:80px 24px;}.vision__cols{grid-template-columns:1fr;gap:36px;}.vision__watermark{font-size:80px;}.big-leader__inner{grid-template-columns:1fr;}.historia{padding:80px 24px;}.historia__header{grid-template-columns:1fr;gap:24px;}.bento{grid-template-columns:1fr;}.bento__cell--tall,.bento__cell--wide{grid-row:auto;grid-column:auto;}.about-dark{padding:80px 24px;}.about-dark__inner{grid-template-columns:1fr;gap:48px;}.equipo{padding:80px 24px;}.equipo__header{grid-template-columns:1fr;}.equipo__grid{grid-template-columns:1fr;grid-template-rows:auto;}.equipo__card{padding:24px 20px;}.equipo__card--featured,.equipo__card--wide{grid-row:auto;grid-column:auto;flex-direction:column;}.equipo__card--wide .equipo__avatar{margin-bottom:28px;flex-shrink:0;}}
        /* Tablets — bento 2 cols, equipo header */
        @media(min-width:769px) and (max-width:960px){.bento{grid-template-columns:1fr 1fr;}.bento__cell--tall,.bento__cell--wide{grid-row:auto;grid-column:auto;}}
        /* Small mobile — mision stats 1 col */
        @media(max-width:480px){.mision__stats{grid-template-columns:1fr;}.mision__stat{border-right:none;border-bottom:1px solid rgba(255,255,255,0.06);}}
        /* ── SEC-HISTORIA (Origen — luz) ─────────────────────────────────── */
        .sec-historia{background:var(--bg);padding:120px 40px;border-top:1px solid var(--line);}
        .sec-historia__inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:45fr 55fr;gap:80px;align-items:center;}
        .sec-historia__img-wrap{position:relative;}
        .sec-historia__watermark-yr{position:absolute;bottom:-10px;left:-10px;font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(80px,12vw,160px);color:rgba(13,13,13,.06);line-height:1;letter-spacing:-0.06em;pointer-events:none;user-select:none;z-index:0;}
        .sec-historia__img{aspect-ratio:4/5;border-radius:20px;background:var(--bg-2);border:1px solid var(--line);position:relative;z-index:1;overflow:hidden;}
        .sec-historia__badge{position:absolute;top:24px;right:-20px;z-index:10;background:var(--ink);color:var(--bg);border-radius:14px;padding:12px 20px;text-align:center;}
        .sec-historia__badge-est{font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;opacity:.45;}
        .sec-historia__badge-label{font-family:"Satoshi",sans-serif;font-weight:900;font-size:28px;letter-spacing:-0.04em;line-height:1.1;}
        .sec-historia__text{display:flex;flex-direction:column;gap:20px;}
        .sec-historia__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--mute);}
        .sec-historia__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(38px,5vw,64px);color:var(--ink);letter-spacing:-0.04em;line-height:1.05;}
        .sec-historia__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:var(--accent);}
        .sec-historia__subtitle{font-size:16px;color:var(--mute);line-height:1.6;margin-top:-4px;}
        .sec-historia__para{font-size:16px;color:var(--ink-2);line-height:1.75;border-left:2px solid rgba(192,57,43,.3);padding:2px 0 2px 20px;}
        .sec-historia__recono{margin-top:8px;}
        .sec-historia__recono-label{font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:var(--mute);display:block;margin-bottom:10px;}
        .sec-historia__pills{display:flex;flex-wrap:wrap;gap:8px;}
        .sec-historia__pill{font-family:"Satoshi",sans-serif;font-size:12px;padding:5px 14px;border-radius:999px;border:1px solid var(--line);color:var(--ink-2);}
        @media(max-width:960px){.sec-historia{padding:80px 24px;}.sec-historia__inner{grid-template-columns:1fr;gap:48px;}.sec-historia__badge{top:16px;right:16px;}.sec-historia__watermark-yr{font-size:80px;}}
        /* ── SEC-IMPACTO (Números — oscuro) ──────────────────────────────── */
        .sec-impacto{background:var(--ink);padding:120px 40px;}
        .sec-impacto__inner{max-width:1100px;margin:0 auto;text-align:center;}
        .sec-impacto__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:16px;}
        .sec-impacto__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(34px,5vw,60px);color:#fff;letter-spacing:-0.04em;line-height:1.08;margin-bottom:80px;}
        .sec-impacto__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .sec-impacto__grid{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;align-items:center;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);}
        .sec-impacto__sep{width:1px;height:80px;background:rgba(255,255,255,.10);}
        .sec-impacto__stat{padding:48px 24px;text-align:center;}
        .sec-impacto__num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(48px,6vw,80px);color:#fff;letter-spacing:-0.04em;line-height:1;}
        .sec-impacto__label{font-size:13px;color:rgba(255,255,255,.6);margin-top:10px;line-height:1.4;}
        .sec-impacto__sub{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-top:6px;}
        @media(max-width:960px){.sec-impacto{padding:80px 24px;}.sec-impacto__grid{grid-template-columns:1fr 1fr;}.sec-impacto__sep{display:none;}}
        /* ── SEC-VALID (Validaciones internacionales — oscuro) ──────────────── */
        .sec-valid{background:var(--ink);padding:120px 40px;}
        .sec-valid__inner{max-width:1200px;margin:0 auto;}
        .sec-valid__head{max-width:640px;margin:0 auto 64px;text-align:center;}
        .sec-valid__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:16px;}
        .sec-valid__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:clamp(28px,4vw,44px);color:#fff;letter-spacing:-0.03em;line-height:1.1;margin-bottom:16px;}
        .sec-valid__sub{font-family:"Satoshi",sans-serif;font-size:16px;color:rgba(255,255,255,.55);line-height:1.7;}
        .sec-valid__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .sec-valid__card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px;display:flex;flex-direction:column;gap:16px;transition:border-color .3s cubic-bezier(0.22,1,0.36,1),background .3s cubic-bezier(0.22,1,0.36,1);}
        .sec-valid__card:hover{border-color:rgba(255,255,255,.15);background:rgba(255,255,255,.06);}
        .sec-valid__logo{object-fit:contain;}
        .sec-valid__tag{display:inline-flex;align-items:center;background:rgba(192,57,43,.15);border:1px solid rgba(192,57,43,.3);border-radius:999px;padding:4px 12px;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#C0392B;width:fit-content;}
        .sec-valid__name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:#fff;line-height:1.3;}
        .sec-valid__desc{font-family:"Satoshi",sans-serif;font-size:14px;color:rgba(255,255,255,.6);line-height:1.65;flex:1;}
        @media(max-width:960px){.sec-valid{padding:80px 24px;}.sec-valid__grid{grid-template-columns:1fr;gap:14px;}}
        /* ── SEC-PROG (Componentes del programa — bg-2) ────────────────── */
        .sec-prog{background:var(--bg-2);padding:120px 40px;border-top:1px solid var(--line);}
        .sec-prog__inner{max-width:1200px;margin:0 auto;}
        .sec-prog__head{margin-bottom:88px;}
        .sec-prog__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--mute);margin-bottom:16px;}
        .sec-prog__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(38px,5vw,60px);color:var(--ink);letter-spacing:-0.04em;line-height:1.08;}
        .sec-prog__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:var(--accent);}
        .sec-prog__list{display:flex;flex-direction:column;}
        .sec-prog__item{display:grid;grid-template-columns:128px 1fr minmax(0,360px);gap:0 64px;padding:72px 0;border-bottom:1px solid var(--line);align-items:center;}
        .sec-prog__item:first-child{border-top:1px solid var(--line);}
        .sec-prog__num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(80px,10vw,116px);color:var(--ink);letter-spacing:-0.05em;line-height:1;opacity:.08;user-select:none;align-self:flex-start;padding-top:2px;}
        .sec-prog__body{display:flex;flex-direction:column;gap:14px;}
        .sec-prog__tag{font-family:"Satoshi",sans-serif;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--accent);font-weight:700;}
        .sec-prog__name{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(26px,3vw,40px);color:var(--ink);letter-spacing:-0.03em;line-height:1.08;}
        .sec-prog__desc{font-family:"Satoshi",sans-serif;font-size:15px;color:var(--mute);line-height:1.78;max-width:44ch;}
        .sec-prog__img{aspect-ratio:4/3;background:var(--bg);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;align-items:center;justify-content:center;}
        .sec-prog__img-ph{display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--ink);opacity:.2;}
        .sec-prog__img-ph-label{font-family:"Satoshi",sans-serif;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;}
        @media(max-width:960px){
          .sec-prog{padding:80px 24px;}
          .sec-prog__item{grid-template-columns:1fr;gap:28px;padding:52px 0;}
          .sec-prog__num{font-size:72px;order:-1;}
          .sec-prog__body{order:0;}
          .sec-prog__img{order:1;}
        }
        /* ── SEC-VALORES (Valores — bg-2 + cards bg) ────────────────────────── */
        .sec-valores{background:var(--bg-2);padding:120px 40px;border-top:1px solid var(--line);}
        .sec-valores__inner{max-width:1200px;margin:0 auto;}
        .sec-valores__header{text-align:center;margin-bottom:64px;}
        .sec-valores__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--mute);margin-bottom:16px;}
        .sec-valores__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(38px,5vw,60px);color:var(--ink);letter-spacing:-0.04em;line-height:1.08;}
        .sec-valores__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:var(--accent);}
        .sec-valores__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
        .sec-valores__tile{background:var(--card-bg,#fff);border:1px solid var(--line);border-radius:20px;padding:32px 28px;display:flex;flex-direction:column;gap:12px;box-shadow:0 2px 12px rgba(13,13,13,.05),0 1px 3px rgba(13,13,13,.03);transition:box-shadow .3s cubic-bezier(0.22,1,0.36,1),transform .3s cubic-bezier(0.22,1,0.36,1),border-color .3s cubic-bezier(0.22,1,0.36,1);}
        .sec-valores__tile--featured{grid-column:span 2;}
        .sec-valores__tile:hover{box-shadow:0 12px 32px -6px rgba(13,13,13,.12);border-color:rgba(192,57,43,.2);}
        .sec-valores__num{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.18em;color:var(--accent);opacity:.6;font-weight:700;}
        .sec-valores__img-ph{width:64px;height:64px;background:var(--bg-2);border-radius:12px;flex-shrink:0;}
        .sec-valores__name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:17px;color:var(--ink);transition:color .2s;}
        .sec-valores__tile:hover .sec-valores__name{color:var(--accent);}
        .sec-valores__desc{font-size:14px;color:var(--mute);line-height:1.6;}
        @media(max-width:960px){
          .sec-valores{padding:80px 24px;}
          .sec-valores__grid{grid-template-columns:1fr 1fr;}
          .sec-valores__tile--featured{grid-column:span 2;}
        }
        @media(max-width:600px){
          .sec-valores__grid{grid-template-columns:1fr;}
          .sec-valores__tile--featured{grid-column:span 1;}
        }
        @media(prefers-reduced-motion:reduce){.sec-valores__tile,.sec-valores__tile:hover{transform:none;}}
        /* ── TESTIMONIOS ── */
        .sec-test{background:#080808;padding:112px 40px;border-top:1px solid rgba(255,255,255,.06);}
        .sec-test__inner{max-width:1200px;margin:0 auto;}
        .sec-test__header{text-align:center;margin-bottom:64px;}
        .sec-test__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:16px;}
        .sec-test__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(34px,5vw,56px);color:#fff;letter-spacing:-0.04em;line-height:1.08;}
        .sec-test__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .sec-test__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
        .sec-test__card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:36px 32px;display:flex;flex-direction:column;gap:20px;position:relative;overflow:hidden;}
        .sec-test__card::before{content:"“";position:absolute;top:-10px;left:20px;font-family:"Instrument Serif",serif;font-size:120px;color:rgba(192,57,43,.15);line-height:1;pointer-events:none;}
        .sec-test__quote{font-family:"Instrument Serif",serif;font-style:italic;font-size:17px;color:rgba(255,255,255,.82);line-height:1.7;position:relative;z-index:1;}
        .sec-test__author{display:flex;align-items:center;gap:14px;margin-top:auto;}
        .sec-test__avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#C0392B,#922b21);color:#fff;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .sec-test__name{font-family:"Satoshi",sans-serif;font-weight:600;font-size:14px;color:#fff;}
        .sec-test__role{font-family:"Satoshi",sans-serif;font-size:12px;color:rgba(255,255,255,.4);margin-top:2px;}
        @media(max-width:960px){.sec-test{padding:80px 24px;}.sec-test__grid{grid-template-columns:1fr;}}
        /* ── FAQ ── */
        .sec-faq{background:var(--bg);padding:112px 40px;border-top:1px solid var(--line);}
        .sec-faq__inner{max-width:800px;margin:0 auto;}
        .sec-faq__header{text-align:center;margin-bottom:64px;}
        .sec-faq__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--mute);margin-bottom:16px;}
        .sec-faq__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(34px,5vw,52px);color:var(--ink);letter-spacing:-0.04em;line-height:1.08;}
        .sec-faq__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:var(--accent);}
        .sec-faq__item{border-bottom:1px solid var(--line);overflow:hidden;}
        .sec-faq__q{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 0;background:none;border:none;cursor:pointer;text-align:left;font-family:"Satoshi",sans-serif;font-weight:600;font-size:16px;color:var(--ink);transition:color .2s;}
        .sec-faq__q:hover{color:var(--accent);}
        .sec-faq__q:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px;}
        .sec-faq__chevron{flex-shrink:0;transition:transform .3s cubic-bezier(0.22,1,0.36,1);}
        .sec-faq__chevron--open{transform:rotate(180deg);}
        .sec-faq__a{font-size:15px;color:var(--mute);line-height:1.7;padding:0 0 22px;}
        @media(max-width:960px){.sec-faq{padding:80px 24px;}}
        /* ── CTA FINAL ── */
        .sec-cta{background:#080808;padding:120px 40px;text-align:center;border-top:1px solid rgba(255,255,255,.06);position:relative;overflow:hidden;}
        .sec-cta::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 110%,rgba(192,57,43,.18),transparent 70%);pointer-events:none;}
        .sec-cta__inner{max-width:800px;margin:0 auto;position:relative;z-index:1;}
        .sec-cta__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:20px;}
        .sec-cta__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(36px,5vw,64px);color:#fff;letter-spacing:-0.04em;line-height:1.05;margin-bottom:20px;}
        .sec-cta__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .sec-cta__sub{font-family:"Satoshi",sans-serif;font-size:17px;color:rgba(255,255,255,.5);line-height:1.65;max-width:520px;margin:0 auto 48px;}
        .sec-cta__btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;}
        .sec-cta__btn-p{padding:16px 32px;background:#C0392B;color:#fff;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;text-decoration:none;transition:background .2s;display:inline-flex;align-items:center;gap:8px;}
        .sec-cta__btn-p:hover{background:#a93226;}
        .sec-cta__btn-p:active{transform:scale(0.97);}
        .sec-cta__btn-g{padding:15px 32px;background:transparent;color:rgba(255,255,255,.7);border:1.5px solid rgba(255,255,255,.2);border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:600;font-size:15px;text-decoration:none;transition:all .2s;display:inline-flex;align-items:center;gap:8px;}
        .sec-cta__btn-g:hover{border-color:rgba(255,255,255,.5);color:#fff;}
        @media(max-width:600px){.sec-cta{padding:80px 24px;}.sec-cta__btns{flex-direction:column;align-items:center;}}
        /* ── FOOTER ── */
        .bf-footer{background:#060606;padding:60px 40px 40px;border-top:1px solid rgba(255,255,255,.05);}
        .bf-footer__inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr;gap:60px;margin-bottom:48px;}
        .bf-footer__brand-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:#fff;margin:14px 0 10px;}
        .bf-footer__brand-desc{font-family:"Satoshi",sans-serif;font-size:13px;color:rgba(255,255,255,.38);line-height:1.6;max-width:280px;}
        .bf-footer__col-title{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:18px;}
        .bf-footer__links{display:flex;flex-direction:column;gap:12px;}
        .bf-footer__link{font-family:"Satoshi",sans-serif;font-size:13.5px;color:rgba(255,255,255,.5);text-decoration:none;transition:color .15s;}
        .bf-footer__link:hover{color:#fff;}
        .bf-footer__link--btn{background:none;border:none;padding:0;font:inherit;cursor:pointer;text-align:left;}
        .bf-footer__bottom{max-width:1200px;margin:0 auto;border-top:1px solid rgba(255,255,255,.05);padding-top:28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;}
        .bf-footer__copy{font-family:"Satoshi",sans-serif;font-size:12px;color:rgba(255,255,255,.2);}
        .bf-footer__legal{display:flex;gap:20px;}
        .bf-footer__legal a{font-family:"Satoshi",sans-serif;font-size:12px;color:rgba(255,255,255,.25);text-decoration:none;transition:color .15s;}
        .bf-footer__legal a:hover{color:rgba(255,255,255,.55);}
        @media(max-width:960px){.bf-footer__inner{grid-template-columns:1fr 1fr;}.bf-footer{padding:60px 24px 32px;}}
        @media(max-width:600px){.bf-footer__inner{grid-template-columns:1fr;gap:40px;}}
      `}</style>

      {/* ── Floating Pill Nav ── */}
      <AnimatePresence>
        {navMounted && (
          <m.div
            className="pill-nav-wrap"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.3 }}
          >
            <nav dir="ltr" className={`pill-nav${navScrolled ? ' pill-nav--scrolled' : ''}`}>
              <Link href="/" className="pill-nav__brand">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <circle cx="12" cy="5" r="2.4" fill="currentColor"/>
                  <path d="M12 7.5 L20 22 H4 Z" fill="currentColor"/>
                </svg>
                Big Family
              </Link>
              <div className="pill-nav__links">
                {NAV_LINKS.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`pill-nav__link${(NAV_TAB_MAP[link.href] ? activeTab === NAV_TAB_MAP[link.href] : link.href === `#${activeSection}`) ? ' pill-nav__link--active' : ''}`}
                    onClick={e => handleNavLink(e, link.href)}
                  >
                    {navLabels[link.href] ?? link.label}
                  </a>
                ))}
              </div>
              <LanguageSelector />
              <Link href="/login" className="pill-nav__cta">
                {t('nav.ingresar')} <span className="pill-nav__cta-arrow" aria-hidden="true">→</span>
              </Link>
              <button
                className="pill-nav__hamburger"
                aria-label={mobileNavOpen ? t('nav.menuClose') : t('nav.menuOpen')}
                onClick={() => setMobileNavOpen(o => !o)}
              >
                <AnimatePresence mode="wait">
                  {mobileNavOpen ? (
                    <m.svg
                      key="x"
                      width="20" height="20" viewBox="0 0 20 20" fill="none"
                      initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </m.svg>
                  ) : (
                    <m.svg
                      key="menu"
                      width="20" height="20" viewBox="0 0 20 20" fill="none"
                      initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </m.svg>
                  )}
                </AnimatePresence>
              </button>
            </nav>
          </m.div>
        )}
      </AnimatePresence>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <m.div
              className="pill-nav-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <m.div
              className="pill-nav-drawer"
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {NAV_LINKS.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="pill-nav-drawer__link"
                  onClick={e => handleNavLink(e, link.href)}
                >
                  {navLabels[link.href] ?? link.label}
                </a>
              ))}
              <Link href="/login" className="pill-nav-drawer__cta">{t('nav.ingresar')} →</Link>
            </m.div>
          </>
        )}
      </AnimatePresence>

      <section className="hero" id="hero">
        <div className="meta">
          <span><span className="dot"></span>{t('landing.hero.metaActive')}</span>
          <span>N 04°42′ · W 74°04′ · Bogotá</span>
        </div>

        <div className="left">
          <m.div
            className="brand"
            initial={prefersReduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0 }}
          >
            <div className="brand__logo">
              <svg viewBox="0 0 24 24" width="88" height="88" aria-label="Big Family" role="img">
                <circle cx="12" cy="5" r="2.4" fill="#0D0D0D"/>
                <path d="M12 7.5 L20 22 H4 Z" fill="#0D0D0D"/>
              </svg>
            </div>
            <div className="brand__word">
              <span>Est.</span>
              <span className="word">THE BIG FAMILY</span>
              <span>MMXX</span>
            </div>
          </m.div>
          <m.h1
            className="headline"
            initial={prefersReduced ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
          >
            {t('landing.hero.title')}<br/><em>{t('landing.hero.titleAccent')}</em><span className="dot-end">.</span>
          </m.h1>
          <m.p
            className="lede"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
          >
            {t('landing.hero.subtitle')}
          </m.p>
          <CountryScramble />

          <m.div
            className="cta-row"
            initial={prefersReduced ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
          >
            <Link href="/submit" className="btn btn--solid">{t('landing.hero.cta')} <span aria-hidden="true">→</span></Link>
            <button className="btn btn--ghost" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>{t('landing.hero.ctaSecondary')}</button>
          </m.div>
          <m.p
            style={{ marginTop: 14, fontSize: 13, color: 'var(--mute)', fontFamily: '"Satoshi",sans-serif' }}
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.42 }}
          >
            {t('landing.hero.coordinatorPrompt')}{' '}
            <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              {t('landing.hero.registerLink')}
            </Link>
          </m.p>
          <m.div
            className="stats"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.36 }}
          >
            <div className="stat">
              <div className="stat__num">
                <AnimatedNumber value={liveStats.totalStudents} loading={statsLoading} suffix="+" skeletonWidth={48} />
              </div>
              <div className="stat__label">{t('landing.hero.statStudents')}</div>
            </div>
            <div className="stat">
              <div className="stat__num">
                <AnimatedNumber value={liveStats.totalSchools} loading={statsLoading} skeletonWidth={40} />
              </div>
              <div className="stat__label">{t('landing.hero.statSchools')}</div>
            </div>
            <div className="stat">
              <div className="stat__num">
                <AnimatedNumber value={liveStats.totalBadges} loading={statsLoading} skeletonWidth={40} />
              </div>
              <div className="stat__label">{t('landing.hero.statBadges')}</div>
            </div>
          </m.div>
        </div>

        <m.div
          className="right"
          initial={prefersReduced ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.4 }}
        >
          <Globe3DHero />
        </m.div>

        <div
          className="scroll-ind"
          style={{ opacity: scrollHintVisible ? 1 : 0, transition: 'opacity 300ms ease' }}
        >
          <span>Scroll</span>
          <div className="bar"></div>
        </div>
      </section>

      <div className="hero-bottom-spacer"></div>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — IMPACTO EN NÚMEROS (siempre visible, fuera del sistema de tabs)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="impacto" className="sec-impacto">
        <div className="sec-impacto__inner">
          <m.p
            className="sec-impacto__eyebrow"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 130, damping: 20 }}
          >{t('landing.impacto.eyebrow')}</m.p>
          <m.h2
            className="sec-impacto__title"
            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.06 }}
          >
            {t('landing.impacto.titlePre')} <em>{t('landing.impacto.titleEm')}</em>.
          </m.h2>
          <div className="sec-impacto__grid">
            {IMPACTO_STATS.flatMap((stat, i) => [
              i > 0 ? (
                <m.div
                  key={`sep-${i}`}
                  className="sec-impacto__sep"
                  initial={prefersReduced ? false : { scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.1 }}
                  style={{ transformOrigin: 'top' }}
                />
              ) : null,
              <m.div
                key={i}
                className="sec-impacto__stat"
                initial={prefersReduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 130, damping: 20, delay: i * 0.08 }}
              >
                <div className="sec-impacto__num">
                  <ImpactoNum to={stat.to} duration={stat.duration} delayMs={stat.delayMs} comma={stat.comma} suffix={stat.suffix} />
                </div>
                <div className="sec-impacto__label">{impactoLabels[i]}</div>
                <div className="sec-impacto__sub">{impactoSubs[i]}</div>
              </m.div>,
            ])}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TAB NAV
      ══════════════════════════════════════════════════════════════════ */}
      <div id="tab-nav-anchor">
        <TabNav active={activeTab} onChange={navigateToTab} />
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >

        {activeTab === 'programa' && (<>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 1 — MISIÓN
      ══════════════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="mision">
        <div className="mision__inner">

          {/* Eyebrow pill */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            <span className="mision__eyebrow-pill">{t('landing.mision.eyebrow')}</span>
          </m.div>

          {/* Título en 3 líneas — stagger con blur */}
          <m.h2
            className="mision__title"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
          >
            {[
              { text: t('landing.mision.titleLine1'), accent: false },
              { text: t('landing.mision.titleLine2'), accent: true  },
            ].map((line, i) => (
              <m.span
                key={i}
                className={`mision__title-line${line.accent ? ' mision__title-line--accent' : ''}`}
                variants={{
                  hidden:   { opacity: 0, y: 50, filter: 'blur(8px)' },
                  visible:  { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { type: 'spring', stiffness: 100, damping: 20 } },
                }}
              >{line.text}</m.span>
            ))}
          </m.h2>

          {/* Subtítulo */}
          <m.p
            className="mision__sub"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.5 }}
          >
            {t('landing.mision.body')}
          </m.p>

        </div>

        {/* Stats — 4 columnas */}
        <m.div
          className="mision__stats"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {misionStats.map((s, i) => (
            <m.div
              key={i}
              className="mision__stat"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 140, damping: 20 } } }}
            >
              <div className="mision__stat-num">
                <CountNumber to={s.to} />{s.suffix && <em>{s.suffix}</em>}
              </div>
              <div className="mision__stat-label">{misionStatLabels[i]}</div>
            </m.div>
          ))}
        </m.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 2 — VISIÓN
      ══════════════════════════════════════════════════════════════════ */}
      <section className="vision">

        {/* "2036" watermark — fades in very last */}
        <m.div
          className="vision__watermark"
          aria-hidden="true"
          initial={prefersReduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 3, ease: 'easeOut', delay: 1 }}
        >
          {t('landing.vision.meta')}
        </m.div>

        <div className="vision__inner">

          {/* Row 1 — Eyebrow + animated red line */}
          <div className="vision__row1">
            <m.p
              className="vision__eyebrow"
              initial={prefersReduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {t('landing.vision.eyebrow')} {t('landing.vision.meta')}
            </m.p>
            <m.div
              className="vision__eyebrow-line"
              initial={prefersReduced ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.15 }}
            />
          </div>

          {/* Row 2 — Title with word-level stagger */}
          <h2 className="vision__title">
            <m.span
              style={{ display: 'block' }}
              initial={prefersReduced ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={visionStaggerV}
            >
              {visionWords.map((word, i) => (
                <m.span
                  key={i}
                  variants={visionWordV}
                  style={{ display: 'inline-block', marginRight: '0.28em' }}
                >
                  {word.italic ? <em>{word.word}</em> : word.word}
                </m.span>
              ))}
            </m.span>
          </h2>

          {/* Row 3 — Two text columns, appear after title stagger completes */}
          <m.div
            className="vision__cols"
            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.6 }}
          >
            <p className="vision__para">{t('landing.vision.para1')}</p>
            <p className="vision__para">{t('landing.vision.para2')}</p>
          </m.div>

          {/* Row 4 — CTA */}
          <m.div
            style={{ display: 'flex', justifyContent: 'center' }}
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.9 }}
          >
            <m.div
              style={{ display: 'inline-block' }}
              whileHover={prefersReduced ? {} : { scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
            >
              <Link
                href="/register"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 32px',
                  background: 'var(--accent,#C0392B)', color: '#fff',
                  borderRadius: 999,
                  fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15,
                  textDecoration: 'none',
                }}
              >
                {t('landing.vision.cta')} <span aria-hidden="true">→</span>
              </Link>
            </m.div>
          </m.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — VALIDACIONES INTERNACIONALES (oscuro)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="sec-valid">
        <div className="sec-valid__inner">

          {/* Header */}
          <m.div
            className="sec-valid__head"
            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <p className="sec-valid__eyebrow">{t('landing.acreditaciones.eyebrow')}</p>
            <h2 className="sec-valid__title">{t('landing.acreditaciones.title')}</h2>
            <p className="sec-valid__sub">{t('landing.acreditaciones.sub')}</p>
          </m.div>

          {/* Cards */}
          <div className="sec-valid__grid">
            {VALIDACIONES.map((v, i) => (
              <m.div
                key={v.name}
                className="sec-valid__card"
                initial={prefersReduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * 0.15 }}
              >
                <div style={{ width:'100%', display:'flex', justifyContent:'center', marginBottom:16 }}>
                  <div style={{
                    display:'inline-flex', alignItems:'center', background:'#fff', borderRadius:12,
                    padding: v.alt === 'Cognia' ? '16px 20px' : '10px 16px',
                  }}>
                    <img
                      src={v.logo}
                      alt={v.alt}
                      className="sec-valid__logo"
                      style={{ height: v.alt === 'Cognia' ? 64 : 56 }}
                    />
                  </div>
                </div>
                <span className="sec-valid__tag">{validacionesTags[i]}</span>
                <p className="sec-valid__name">{v.name}</p>
                <p className="sec-valid__desc">{validacionesDescs[i]}</p>
              </m.div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — FAQ
      ══════════════════════════════════════════════════════════════════ */}
      <FAQSection reduced={!!prefersReduced} />

      </>)}

      {activeTab === 'historia' && (<>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — HISTORIA (Origen — luz)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="historia" className="sec-historia">
        <div className="sec-historia__inner">
          {/* Columna izquierda — imagen */}
          <m.div
            className="sec-historia__img-wrap"
            initial={prefersReduced ? false : { opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          >
            <div className="sec-historia__watermark-yr" aria-hidden="true">{t('landing.historia.watermark')}</div>
            <div className="sec-historia__img">
              <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, opacity:.3 }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                  <rect x="4" y="8" width="32" height="24" rx="3" stroke="var(--ink)" strokeWidth="1.5"/>
                  <circle cx="14" cy="18" r="4" stroke="var(--ink)" strokeWidth="1.5"/>
                  <path d="M4 28L13 20l6 5 5-4 12 7" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontFamily:'"Satoshi",sans-serif', fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--mute)' }}>{t('common.photoComingSoon')}</span>
              </div>
            </div>
            <div className="sec-historia__badge">
              <div className="sec-historia__badge-est">{t('landing.historia.since')}</div>
              <div className="sec-historia__badge-label">{t('landing.historia.stat1Value')}</div>
            </div>
          </m.div>

          {/* Columna derecha — texto con parallax */}
          <m.div
            className="sec-historia__text"
            style={navMounted && !prefersReduced ? { y: historiaTextY } : {}}
            initial={prefersReduced ? false : { opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.1 }}
          >
            <p className="sec-historia__eyebrow">{t('landing.historia.eyebrow')}</p>
            <h2 className="sec-historia__title">{t('landing.historia.secTitle')}</h2>
            <p className="sec-historia__subtitle">{t('landing.historia.secSubtitle')}</p>
            <p className="sec-historia__para">{t('landing.historia.secBody')}</p>
            <div className="sec-historia__recono">
              <span className="sec-historia__recono-label">{t('landing.historia.reconoLabel')}</span>
              <div className="sec-historia__pills">
                <span className="sec-historia__pill">MIT Leadership</span>
                <span className="sec-historia__pill">Universidad Javeriana</span>
                <span className="sec-historia__pill">Uninorte</span>
              </div>
            </div>
          </m.div>
        </div>
      </section>

      </>)}

      {activeTab === 'metodologia' && (<>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — COMPONENTES DEL PROGRAMA (bg-2)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="metodologia" className="sec-prog">
        <div className="sec-prog__inner">

          {/* Header */}
          <m.div
            className="sec-prog__head"
            initial={prefersReduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <p className="sec-prog__eyebrow">{t('landing.metodologia.eyebrow')}</p>
            <h2 className="sec-prog__title">{t('landing.metodologia.programTitle')}</h2>
          </m.div>

          {/* Rows */}
          <div className="sec-prog__list">
            {PROGRAM_COMPONENTS.map((c, i) => (
              <m.div
                key={c.num}
                className="sec-prog__item"
                initial={prefersReduced ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 100, damping: 22, delay: i * 0.07 }}
              >
                {/* Número ancla */}
                <div className="sec-prog__num" aria-hidden="true">{c.num}</div>

                {/* Contenido */}
                <div className="sec-prog__body">
                  <span className="sec-prog__tag">{programTexts[i].tag}</span>
                  <h3 className="sec-prog__name">{c.name}</h3>
                  <p className="sec-prog__desc">{programTexts[i].desc}</p>
                  {c.name === 'Kashi' && (
                    <a
                      href="https://luishernandobarrios.com/kashi/splash"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '9px 20px',
                        borderRadius: 999,
                        border: '1.5px solid #C0392B',
                        fontFamily: '"Satoshi",sans-serif',
                        fontWeight: 700,
                        fontSize: 13,
                        color: '#C0392B',
                        textDecoration: 'none',
                        width: 'fit-content',
                        transition: 'background .2s, color .2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#C0392B'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = '#C0392B' }}
                    >
                      {t('landing.metodologia.kashi.exploreBtn')}
                    </a>
                  )}
                </div>

                {/* Placeholder de imagen */}
                <div className="sec-prog__img" aria-hidden="true">
                  <div className="sec-prog__img-ph">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <rect x="3" y="5" width="26" height="22" rx="3" stroke="currentColor" strokeWidth="1.6"/>
                      <circle cx="11" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M3 22l7-6 6 5 5-4 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="sec-prog__img-ph-label">{t('common.photoComingSoon')}</span>
                  </div>
                </div>
              </m.div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — APRENDIZAJE PERSONALIZADO
      ══════════════════════════════════════════════════════════════════ */}
      <AprendizajeSection />

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — CERTIFICACIÓN MARKETING (light)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="sec-cert">
        <div className="sec-cert__inner">

          {/* Izquierda — Copy */}
          <m.div
            initial={prefersReduced ? false : { opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 22 }}
          >
            <span className="sec-cert__eyebrow">{t('landing.cert.eyebrow')}</span>
            <h2 className="sec-cert__title">{t('landing.cert.title')}</h2>
            <p className="sec-cert__para">{t('landing.cert.para')}</p>
            <button className="sec-cert__cta" onClick={() => setShowDiplomaModal(true)}>
              {t('landing.cert.cta')} <span aria-hidden="true">→</span>
            </button>
            <div className="sec-cert__bullets">
              {([t('landing.cert.bullet1'), t('landing.cert.bullet2'), t('landing.cert.bullet3')]).map(text => (
                <div key={text} className="sec-cert__bullet">
                  <div className="sec-cert__check">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </m.div>

          {/* Derecha — Mockup del diploma (estático, rotate 2deg) */}
          <m.div
            className="sec-cert__mockup-wrap"
            initial={prefersReduced ? false : { opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 22, delay: 0.1 }}
          >
            <m.div
              className="sc-dp"
              initial={{ rotate: 2 }}
              animate={{ rotate: 2 }}
              whileHover={prefersReduced ? {} : { y: -4, rotate: 2, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
            >
              {/* Membrete */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:12 }}>
                <img src="/Logo_ColegioAlbania.png" alt="" aria-hidden="true" style={{ height:20, objectFit:'contain' }} />
                <div style={{ width:1, height:14, background:'rgba(13,13,13,.15)', flexShrink:0 }} />
                <span style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:700, fontSize:7.5, letterSpacing:'0.3em', textTransform:'uppercase', color:'#0D0D0D' }}>The Big Family Program</span>
              </div>

              <div className="sc-sep" />

              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:7.5, color:'#6B6B6B', fontStyle:'italic', marginBottom:6 }}>
                Este certificado se otorga a
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Instrument Serif",serif', fontStyle:'italic', fontWeight:400, fontSize:22, color:'#0D0D0D', letterSpacing:'-0.01em', lineHeight:1.1, marginBottom:8 }}>
                Valentina Torres Ospino
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:7.5, color:'#6B6B6B', marginBottom:4 }}>
                por haber completado exitosamente el programa de liderazgo
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontWeight:700, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'#C0392B', marginBottom:8 }}>
                The Big Leader
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:7.5, color:'#6B6B6B', marginBottom:2 }}>IE Técnica María Inmaculada</p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:7.5, color:'#6B6B6B', marginBottom:12 }}>15 de mayo de 2026</p>

              <div className="sc-sep" />

              {/* Stats + Logos */}
              <div style={{ display:'flex', justifyContent:'center', alignItems:'center', margin:'10px 0' }}>
                <div style={{ textAlign:'center', padding:'0 10px' }}>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:900, fontSize:14, color:'#C0392B' }}>1.840</div>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontSize:6, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6B6B6B', marginTop:2 }}>Puntos de Impacto</div>
                </div>
                <div style={{ width:1, height:22, background:'rgba(13,13,13,.12)', flexShrink:0 }} />
                <div style={{ textAlign:'center', padding:'0 10px' }}>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:900, fontSize:14, color:'#C0392B' }}>6</div>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontSize:6, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6B6B6B', marginTop:2 }}>Módulos</div>
                </div>
                <div style={{ width:1, height:22, background:'rgba(13,13,13,.12)', flexShrink:0 }} />
                <div style={{ textAlign:'center', padding:'0 10px' }}>
                  <p style={{ fontFamily:'"Satoshi",sans-serif', fontSize:6, letterSpacing:'0.18em', textTransform:'uppercase', color:'#6B6B6B', marginBottom:5 }}>RECONOCIDO POR</p>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    <img src="/cognia.png"                               alt="Cognia" style={{ height:14, objectFit:'contain' }} />
                    <img src="/International_Baccalaureate_Logo.svg.png" alt="IB"     style={{ height:14, objectFit:'contain' }} />
                    <img src="/tri.png"                                  alt="Tri"    style={{ height:14, objectFit:'contain' }} />
                  </div>
                </div>
              </div>

              <div className="sc-sep" />

              {/* Firma + cert + sello */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:10 }}>
                <div>
                  <div style={{ height:1, background:'rgba(13,13,13,.14)', marginBottom:4, width:80 }} />
                  <p style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:700, fontSize:7.5, color:'#0D0D0D' }}>Luis Hernando Barrios</p>
                  <p style={{ fontFamily:'"Satoshi",sans-serif', fontSize:6.5, color:'#6B6B6B', marginTop:1 }}>Fundador, The Big Family Program</p>
                </div>
                <p style={{ fontFamily:'"Satoshi",sans-serif', fontSize:6.5, letterSpacing:'0.18em', color:'#6B6B6B', alignSelf:'flex-end', paddingBottom:1 }}>CERT-2026-1001</p>
                {/* Sello mini */}
                <svg viewBox="0 0 100 100" width="38" height="38" aria-hidden="true">
                  <defs><path id="mc-arc" d="M 8 50 A 42 42 0 0 0 92 50"/></defs>
                  <circle cx="50" cy="50" r="47" fill="none" stroke="#C0392B" strokeWidth="1.5"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#C0392B" strokeWidth="0.6"/>
                  <text fill="#C0392B" fontSize="6.8" fontFamily="Satoshi,sans-serif" fontWeight="700" letterSpacing="1.5">
                    <textPath href="#mc-arc" startOffset="50%" textAnchor="middle">BIG FAMILY · CERTIFIED</textPath>
                  </text>
                  <path d="M50 36 L53.5 45.1 L63.3 45.7 L55.7 51.8 L58.2 61.3 L50 56 L41.8 61.3 L44.3 51.8 L36.7 45.7 L46.5 45.1Z" fill="#C0392B"/>
                </svg>
              </div>
            </m.div>
          </m.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — VALORES
      ══════════════════════════════════════════════════════════════════ */}
      <section id="valores" className="sec-valores">
        <div className="sec-valores__inner">
          <m.div
            className="sec-valores__header"
            initial={prefersReduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <p className="sec-valores__eyebrow">{t('landing.valores.title')}</p>
            <h2 className="sec-valores__title">{t('landing.valores.eyebrow')}</h2>
          </m.div>

          <div className="sec-valores__grid">
            {VALORES.map((v, i) => (
              <m.div
                key={v.name}
                className={`sec-valores__tile${i === 0 ? ' sec-valores__tile--featured' : ''}`}
                initial={prefersReduced ? false : { opacity: 0, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * 0.07 }}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              >
                <div className="sec-valores__num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div
                  className="sec-valores__img-ph"
                  data-value={v.slug}
                  aria-hidden="true"
                />
                <div className="sec-valores__name">{t('landing.valores.' + valorKeyMap[v.slug] + '.title')}</div>
                <div className="sec-valores__desc">{t('landing.valores.' + valorKeyMap[v.slug] + '.body')}</div>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      </>)}

      {activeTab === 'red' && (<>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — NUESTRA RED
      ══════════════════════════════════════════════════════════════════ */}
      <SchoolTicker />

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — ALIANZAS GLOBALES
      ══════════════════════════════════════════════════════════════════ */}
      <WorldMapPublic />

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — ALUMNI
      ══════════════════════════════════════════════════════════════════ */}
      <AlumniSection />

      {/* ══════════════════════════════════════════════════════════════════
          HISTORIAS DE ÉXITO
      ══════════════════════════════════════════════════════════════════ */}
      {featuredStories.length > 0 && (
        <section style={{ padding: '100px 40px', background: 'var(--bg,#F5F3EF)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 140, damping: 20 }}
              style={{ textAlign: 'center', marginBottom: 48 }}
            >
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C0392B', marginBottom: 14 }}>{t('landing.successStoriesSection.eyebrow')}</div>
              <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-.025em', color: 'var(--ink,#0D0D0D)', marginBottom: 12 }}>{t('successStories.title')}</h2>
              <p style={{ fontSize: 15, color: 'var(--mute,#6B6B6B)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>{t('landing.successStoriesSection.subtitle')}</p>
            </m.div>

            <m.div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            >
              {featuredStories.map((s, i) => (
                <m.a
                  key={s.id}
                  href={`/success-stories/${s.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  style={{ display: 'block', textDecoration: 'none', background: '#fff', border: '1px solid rgba(13,13,13,.07)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px -4px rgba(13,13,13,.08)' }}
                >
                  {s.cover_url
                    ? <img src={s.cover_url} alt={s.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', height: 110, background: 'linear-gradient(135deg,#C0392B,#8B1A1A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.8 4.9H18l-4.1 3 1.5 4.9L12 12.2l-3.4 2.6L10 9.9 5.9 6.9H11L12 2Z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                      </div>
                  }
                  <div style={{ padding: '16px 18px 18px' }}>
                    <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15.5, color: '#0D0D0D', marginBottom: 6, lineHeight: 1.3 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: '#4a4a4a', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 10 } as React.CSSProperties}>{s.story}</div>
                    <div style={{ fontSize: 12, color: '#9a9690' }}>
                      {s.student_name && <span style={{ fontWeight: 600 }}>{s.student_name}</span>}
                      {s.school_name && <span style={{ marginLeft: 6 }}>· {s.school_name}</span>}
                    </div>
                  </div>
                </m.a>
              ))}
            </m.div>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <a href="/success-stories" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 24px', border: '1.5px solid rgba(13,13,13,.14)', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--ink,#0D0D0D)', textDecoration: 'none', transition: 'all .2s' }}>
                {t('landing.successStoriesSection.viewAllBtn')}
              </a>
            </div>
          </div>
        </section>
      )}

      </>)}

      {activeTab === 'equipo' && (<>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — EL FUNDADOR
      ══════════════════════════════════════════════════════════════════ */}
      <FounderSection />

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — EQUIPO
      ══════════════════════════════════════════════════════════════════ */}
      <section id="equipo" className="equipo">
        <div className="equipo__inner">

          {/* Header */}
          <m.div
            className="equipo__header"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          >
            <div>
              <p className="equipo__eyebrow">{t('landing.equipo.eyebrow')}</p>
              <h2 className="equipo__title">{t('landing.equipo.title')}</h2>
            </div>
            <p className="equipo__desc">{t('landing.equipo.body')}</p>
          </m.div>

          {/* Grid de cards — 3 columnas iguales */}
          <div className="equipo__grid">
            {founders.map((f, i) => (
              <m.div
                key={f.name}
                className="equipo__card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ type: 'spring', stiffness: 180, damping: 22, delay: i * 0.12 }}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              >
                <div className="equipo__avatar" style={{ background: 'linear-gradient(135deg,#C0392B,#922b21)' }}>{f.initials}</div>
                <div className="equipo__card-name">{f.name}</div>
                <div className="equipo__card-role">{f.role}</div>
                <div className="equipo__card-divider" />
                <div className="equipo__card-bio">{f.bio}</div>
                <div className="equipo__tags">
                  {f.tags.map(tag => <span key={tag} className="equipo__tag">{tag}</span>)}
                </div>
              </m.div>
            ))}
          </div>

        </div>
      </section>

      </>)}

      {activeTab === 'noticias' && (
        <section style={{ padding: '80px 24px', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '48px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.15, marginBottom: '12px' }}>
              {t('tabs.noticias')}
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '48px' }}>
            {latestNews.map((article, i) => (
              <m.a
                key={article.id}
                href={`/news/${article.slug}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22, delay: i * 0.08 }}
                whileHover={{ y: -3 }}
                style={{ display: 'block', textDecoration: 'none', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden' }}
              >
                <div style={{ height: '160px', background: article.cover_url ? `url(${article.cover_url}) center/cover` : 'var(--bg-2)' }} />
                <div style={{ padding: '20px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--mute)', marginBottom: '8px' }}>
                    {new Date(article.published_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, marginBottom: '10px' }}>{article.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--mute)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.excerpt}</p>
                </div>
              </m.a>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link href="/news" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', background: '#C0392B', color: '#fff', borderRadius: '100px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
              {t('landing.successStoriesSection.viewAllBtn')} →
            </Link>
          </div>
        </section>
      )}

        </m.div>
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — CTA FINAL (siempre visible, fuera del sistema de tabs)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="sec-cta">
        <div className="sec-cta__inner">
          <m.p
            className="sec-cta__eyebrow"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 140, damping: 20 }}
          >{t('landing.cta.eyebrow')}</m.p>
          <m.h2
            className="sec-cta__title"
            initial={prefersReduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.08 }}
          >
            {t('landing.cta.title')}
          </m.h2>
          <m.p
            className="sec-cta__sub"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.16 }}
          >
            {t('landing.cta.subtitle')}
          </m.p>
          <m.div
            className="sec-cta__btns"
            initial={prefersReduced ? false : { opacity: 0, y: 16, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.24 }}
          >
            <Link href="/submit" className="sec-cta__btn-p">{t('landing.cta.btnStudent')}</Link>
            <Link href="/register" className="sec-cta__btn-g">{t('landing.cta.btnCoordinator')}</Link>
          </m.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="bf-footer">
        <div className="bf-footer__inner">
          <div>
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <circle cx="12" cy="5" r="2.4" fill="rgba(255,255,255,0.65)"/>
              <path d="M12 7.5 L20 22 H4 Z" fill="rgba(255,255,255,0.65)"/>
            </svg>
            <div className="bf-footer__brand-name">Big Family</div>
            <p className="bf-footer__brand-desc">
              {t('landing.footer.brandDesc')}
            </p>
          </div>
          <div>
            <p className="bf-footer__col-title">{t('landing.footer.programTitle')}</p>
            <div className="bf-footer__links">
              <button onClick={() => navigateToTab('historia')} className="bf-footer__link bf-footer__link--btn">{t('nav.historia')}</button>
              <a href="#impacto" className="bf-footer__link">{t('nav.impacto')}</a>
              <button onClick={() => navigateToTab('red')} className="bf-footer__link bf-footer__link--btn">{t('nav.nuestraRed')}</button>
              <button onClick={() => navigateToTab('metodologia')} className="bf-footer__link bf-footer__link--btn">{t('nav.metodologia')}</button>
              <button onClick={() => navigateToTab('equipo')} className="bf-footer__link bf-footer__link--btn">{t('nav.equipo')}</button>
            </div>
          </div>
          <div>
            <p className="bf-footer__col-title">{t('landing.footer.accessTitle')}</p>
            <div className="bf-footer__links">
              <Link href="/login" className="bf-footer__link">{t('nav.ingresar')}</Link>
              <Link href="/submit" className="bf-footer__link">{t('landing.footer.studentRegister')}</Link>
              <Link href="/register" className="bf-footer__link">{t('landing.footer.coordinatorRegister')}</Link>
              <Link href="/news" className="bf-footer__link">{t('nav.noticias')}</Link>
              <Link href="/success-stories" className="bf-footer__link">{t('successStories.title')}</Link>
            </div>
          </div>
        </div>
        <div className="bf-footer__bottom">
          <p className="bf-footer__copy">© {new Date().getFullYear()} The Big Family Program · La Guajira, Colombia</p>
          <div className="bf-footer__legal">
            <Link href="/timeline" className="bf-footer__legal-link" style={{ fontFamily:'"Satoshi",sans-serif', fontSize:12, color:'rgba(255,255,255,.25)', textDecoration:'none' }}>{t('landing.footer.timeline')}</Link>
            <Link href="/success-stories" className="bf-footer__legal-link" style={{ fontFamily:'"Satoshi",sans-serif', fontSize:12, color:'rgba(255,255,255,.25)', textDecoration:'none' }}>{t('landing.footer.stories')}</Link>
          </div>
        </div>
      </footer>

      {/* ── Diploma modal — inline preview desde landing ─────────────────── */}
      <AnimatePresence>
        {showDiplomaModal && (
          <m.div
            className="dm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowDiplomaModal(false)}
          >
            <m.div
              className="dm-panel"
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="dm-close" onClick={() => setShowDiplomaModal(false)} aria-label={t('common.close')}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Membrete */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:16 }}>
                <img src="/Logo_ColegioAlbania.png" alt="" aria-hidden="true" style={{ height:28, objectFit:'contain' }} />
                <div style={{ width:1, height:20, background:'rgba(13,13,13,.15)', flexShrink:0 }} />
                <span style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:700, fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', color:'#0D0D0D' }}>The Big Family Program</span>
              </div>

              <div className="dm-sep" />

              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:12, color:'#6B6B6B', fontStyle:'italic', marginTop:14, marginBottom:10 }}>
                Este certificado se otorga a
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Instrument Serif",serif', fontStyle:'italic', fontWeight:400, fontSize:'clamp(1.8rem,4vw,2.8rem)', color:'#0D0D0D', letterSpacing:'-0.02em', lineHeight:1.1, marginBottom:14 }}>
                Valentina Torres Ospino
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:13, color:'#6B6B6B', marginBottom:8 }}>
                por haber completado exitosamente el programa de liderazgo
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontWeight:700, fontSize:12, letterSpacing:'0.22em', textTransform:'uppercase', color:'#C0392B', marginBottom:14 }}>
                The Big Leader
              </p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:12, color:'#6B6B6B', marginBottom:3 }}>IE Técnica María Inmaculada</p>
              <p style={{ textAlign:'center', fontFamily:'"Satoshi",sans-serif', fontSize:12, color:'#6B6B6B', marginBottom:16 }}>15 de mayo de 2026</p>

              <div className="dm-sep" />

              {/* Stats + Logos */}
              <div style={{ display:'flex', justifyContent:'center', alignItems:'center', flexWrap:'wrap', margin:'4px 0 4px' }}>
                <div style={{ textAlign:'center', padding:'8px 20px' }}>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:900, fontSize:20, color:'#C0392B' }}>1.840</div>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:'#6B6B6B', marginTop:3 }}>Puntos de Impacto</div>
                </div>
                <div style={{ width:1, height:34, background:'rgba(13,13,13,.12)', flexShrink:0 }} />
                <div style={{ textAlign:'center', padding:'8px 20px' }}>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:900, fontSize:20, color:'#C0392B' }}>6</div>
                  <div style={{ fontFamily:'"Satoshi",sans-serif', fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:'#6B6B6B', marginTop:3 }}>Módulos Completados</div>
                </div>
                <div style={{ width:1, height:34, background:'rgba(13,13,13,.12)', flexShrink:0 }} />
                <div style={{ textAlign:'center', padding:'8px 20px' }}>
                  <p style={{ fontFamily:'"Satoshi",sans-serif', fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:'#6B6B6B', marginBottom:7 }}>RECONOCIDO POR</p>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                    <img src="/cognia.png"                               alt="Cognia" style={{ height:24, objectFit:'contain' }} />
                    <img src="/International_Baccalaureate_Logo.svg.png" alt="IB"     style={{ height:24, objectFit:'contain' }} />
                    <img src="/tri.png"                                  alt="Tri"    style={{ height:24, objectFit:'contain' }} />
                  </div>
                </div>
              </div>

              <div className="dm-sep" />

              {/* Firma + Cert + Sello */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:10 }}>
                <div>
                  <div style={{ height:1, background:'rgba(13,13,13,.14)', marginBottom:6, width:148 }} />
                  <p style={{ fontFamily:'"Satoshi",sans-serif', fontWeight:700, fontSize:12, color:'#0D0D0D' }}>Luis Hernando Barrios</p>
                  <p style={{ fontFamily:'"Satoshi",sans-serif', fontSize:10.5, color:'#6B6B6B', marginTop:2 }}>Fundador, The Big Family Program</p>
                </div>
                <p style={{ fontFamily:'"Satoshi",sans-serif', fontSize:9.5, letterSpacing:'0.2em', color:'#6B6B6B', alignSelf:'flex-end', paddingBottom:1 }}>CERT-2026-1001</p>
                <svg viewBox="0 0 100 100" width="52" height="52" aria-hidden="true">
                  <defs><path id="dm-arc" d="M 8 50 A 42 42 0 0 0 92 50"/></defs>
                  <circle cx="50" cy="50" r="47" fill="none" stroke="#C0392B" strokeWidth="1.5"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#C0392B" strokeWidth="0.6"/>
                  <text fill="#C0392B" fontSize="6.8" fontFamily="Satoshi,sans-serif" fontWeight="700" letterSpacing="1.5">
                    <textPath href="#dm-arc" startOffset="50%" textAnchor="middle">BIG FAMILY · CERTIFIED</textPath>
                  </text>
                  <path d="M50 36 L53.5 45.1 L63.3 45.7 L55.7 51.8 L58.2 61.3 L50 56 L41.8 61.3 L44.3 51.8 L36.7 45.7 L46.5 45.1Z" fill="#C0392B"/>
                </svg>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
