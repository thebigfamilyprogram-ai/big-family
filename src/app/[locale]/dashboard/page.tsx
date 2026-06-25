'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import NotificationDrawer from '@/components/NotificationDrawer'
import EventCard, { type EventCardEvent, type RsvpStatus } from '@/components/EventCard'
import { m, useReducedMotion, AnimatePresence } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import { useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts'

interface Module {
  id: string
  title: string
  description: string
  xp_reward: number
  order_index: number
}

interface ProgressRow {
  module_id: string
  completed: boolean
}

interface UserData {
  display_name:     string
  total_xp:        number
  role:            string | null
  school_level:    string | null
  username:        string | null
  portfolio_public: boolean
}

interface DiplomaInfo {
  projectId: string
  resultado: string
}

interface WeeklyXP {
  week: string
  xp: number
}

interface LeaderProfile {
  arquetipo:         string
  fortalezas:        string[]
  areas_crecimiento: string[]
  big_five: { O: number; C: number; E: number; A: number; N: number; ES: number }
}

// Fallback profile for MOCK_MODE (shared between MOCK block and render)
const MOCK_LEADER_PROFILE: LeaderProfile = {
  arquetipo:         'Líder Visionaria',
  fortalezas:        ['Norte', 'Acción'],
  areas_crecimiento: ['Yo', 'Vínculo'],
  big_five:          { O: 85, C: 42, E: 78, A: 38, N: 35, ES: 65 },
}

// Module → Big Leader Model pillar mapping (by order_index)
const MODULE_PILLAR: Record<number, string> = {
  1: 'Yo', 2: 'Norte', 3: 'Vínculo', 4: 'Vínculo', 5: 'Acción', 6: 'Acción', 7: 'Legado',
}
// Pillar → which module order_indices belong to it
const PILLAR_MODS: Record<string, number[]> = {
  Yo: [1], Norte: [2], Vínculo: [3, 4], Acción: [4, 5, 6], Legado: [7],
}
const PILLAR_ORDER = ['Yo', 'Norte', 'Vínculo', 'Acción', 'Legado'] as const

const QUOTES = [
  { quote: "El líder es aquel que conoce el camino, recorre el camino y muestra el camino.", author: "John C. Maxwell", category: "Liderazgo" },
  { quote: "No se nace líder, uno se hace líder.", author: "Vince Lombardi", category: "Liderazgo" },
  { quote: "El arte de liderar consiste en decir no, en decidir. No en complacer a todo el mundo.", author: "Margaret Thatcher", category: "Liderazgo" },
  { quote: "Un líder es un comerciante en esperanza.", author: "Napoleón Bonaparte", category: "Liderazgo" },
  { quote: "El liderazgo no se trata de ser el jefe, sino de cuidar a los que están a tu cargo.", author: "Simon Sinek", category: "Liderazgo" },
  { quote: "Los líderes verdaderos no crean seguidores, crean más líderes.", author: "Nelson Mandela", category: "Liderazgo" },
  { quote: "El liderazgo se demuestra con hechos, no con palabras.", author: "Sócrates", category: "Liderazgo" },
  { quote: "Para liderar al pueblo, camina detrás de él.", author: "Lao Tzu", category: "Liderazgo" },
  { quote: "El liderazgo es la capacidad de transformar la visión en realidad.", author: "Warren Bennis", category: "Liderazgo" },
  { quote: "El liderazgo no tiene que ver con el título ni con el rango. Tiene que ver con la acción y el ejemplo.", author: "Cory Booker", category: "Liderazgo" },
  { quote: "Nada está fuera de alcance para quienes lideran con valentía y corazón.", author: "Jacinda Ardern", category: "Liderazgo" },
  { quote: "Un líder lleva a las personas a donde ellas nunca irían solas.", author: "Hans Finzel", category: "Liderazgo" },
  { quote: "Los grandes líderes están dispuestos a sacrificar su propio interés por el bien del equipo.", author: "John Wooden", category: "Liderazgo" },
  { quote: "El liderazgo es liberar el potencial humano para hacerlo mejor.", author: "Peter Drucker", category: "Liderazgo" },
  { quote: "El que quiera ser líder debe ser primero servidor.", author: "Martin Luther King Jr.", category: "Liderazgo" },
  { quote: "El progreso es imposible sin cambio, y aquellos que no pueden cambiar de opinión no pueden cambiar nada.", author: "George Bernard Shaw", category: "Liderazgo" },
  { quote: "El líder debe tener el valor de actuar contra la opinión de la mayoría.", author: "Margaret Thatcher", category: "Liderazgo" },
  { quote: "Ningún hombre es lo bastante bueno para gobernar a otros sin su consentimiento.", author: "Abraham Lincoln", category: "Liderazgo" },
  { quote: "El liderazgo es la capacidad de esconder tu pánico ante los demás mientras todos te miran.", author: "John F. Kennedy", category: "Liderazgo" },
  { quote: "El mejor líder es aquel que la gente apenas sabe que existe.", author: "Lao Tzu", category: "Liderazgo" },
  { quote: "La educación es el arma más poderosa que puedes usar para cambiar el mundo.", author: "Nelson Mandela", category: "Educación" },
  { quote: "La educación no es preparación para la vida; la educación es la vida en sí misma.", author: "John Dewey", category: "Educación" },
  { quote: "La educación es la llave para abrir las puertas de oro de la libertad.", author: "George Washington Carver", category: "Educación" },
  { quote: "Invertir en conocimiento paga el mejor interés.", author: "Benjamin Franklin", category: "Educación" },
  { quote: "La educación no es llenar un cubo, sino encender un fuego.", author: "William Butler Yeats", category: "Educación" },
  { quote: "El analfabeto del futuro no será quien no sepa leer, sino quien no sepa aprender, desaprender y reaprender.", author: "Alvin Toffler", category: "Educación" },
  { quote: "La función de la educación es enseñar a pensar intensamente y a pensar críticamente.", author: "Martin Luther King Jr.", category: "Educación" },
  { quote: "El aprendizaje es un tesoro que seguirá a su dueño a todas partes.", author: "Confucio", category: "Educación" },
  { quote: "La educación es el pasaporte hacia el futuro, porque el mañana pertenece a quienes se preparan hoy.", author: "Malcolm X", category: "Educación" },
  { quote: "Un niño, un maestro, un libro y un lápiz pueden cambiar el mundo.", author: "Malala Yousafzai", category: "Educación" },
  { quote: "El único hombre educado es el que ha aprendido a aprender y a adaptarse.", author: "Carl Rogers", category: "Educación" },
  { quote: "Aprender sin pensar es inútil; pensar sin aprender es peligroso.", author: "Confucio", category: "Educación" },
  { quote: "La enseñanza que deja huella no es la que se hace de cabeza a cabeza, sino de corazón a corazón.", author: "Howard G. Hendricks", category: "Educación" },
  { quote: "La educación es lo que queda después de olvidar lo que se aprendió en la escuela.", author: "Albert Einstein", category: "Educación" },
  { quote: "Nunca consideres el estudio como una obligación, sino como una oportunidad para penetrar en el bello mundo del saber.", author: "Albert Einstein", category: "Educación" },
  { quote: "Un maestro influye en la eternidad; nunca se sabe dónde termina su influencia.", author: "Henry Adams", category: "Educación" },
  { quote: "La educación es el gran motor del desarrollo personal.", author: "Nelson Mandela", category: "Educación" },
  { quote: "La educación es el movimiento de la oscuridad a la luz.", author: "Allan Bloom", category: "Educación" },
  { quote: "La educación es el motor del desarrollo y la igualdad.", author: "Michelle Bachelet", category: "Educación" },
  { quote: "El objetivo de la educación es formar seres aptos para gobernar sus propias vidas.", author: "Herbert Spencer", category: "Educación" },
  { quote: "El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el valor para continuar.", author: "Winston Churchill", category: "Perseverancia" },
  { quote: "Nuestro mayor honor no es no caer nunca, sino levantarnos cada vez que caemos.", author: "Confucio", category: "Perseverancia" },
  { quote: "No he fracasado. He encontrado 10.000 formas que no funcionan.", author: "Thomas Edison", category: "Perseverancia" },
  { quote: "La perseverancia no es una carrera larga; son muchas carreras cortas, una tras otra.", author: "Walter Elliot", category: "Perseverancia" },
  { quote: "No importa lo lento que vayas, siempre y cuando no te detengas.", author: "Confucio", category: "Perseverancia" },
  { quote: "El carácter consiste en levantarse cada vez que caes.", author: "Nelson Mandela", category: "Perseverancia" },
  { quote: "Muchos fracasos ocurren cuando las personas no se dan cuenta de lo cerca que estaban del éxito cuando se rindieron.", author: "Thomas Edison", category: "Perseverancia" },
  { quote: "El hombre que mueve montañas comienza cargando pequeñas piedras.", author: "Proverbio chino", category: "Perseverancia" },
  { quote: "El coraje no es la ausencia de miedo, sino el triunfo sobre él.", author: "Nelson Mandela", category: "Perseverancia" },
  { quote: "No te preocupes por los fracasos, preocúpate por las oportunidades que pierdes cuando ni siquiera lo intentas.", author: "Jack Ma", category: "Perseverancia" },
  { quote: "Cae siete veces, levántate ocho.", author: "Proverbio japonés", category: "Perseverancia" },
  { quote: "No hay atajos para ningún lugar al que valga la pena ir.", author: "Beverly Sills", category: "Perseverancia" },
  { quote: "La perseverancia es la madre del éxito.", author: "Simón Bolívar", category: "Perseverancia" },
  { quote: "Es duro fracasar, pero es peor no haber intentado nunca tener éxito.", author: "Theodore Roosevelt", category: "Perseverancia" },
  { quote: "El único límite a nuestros logros del mañana son nuestras dudas de hoy.", author: "Franklin D. Roosevelt", category: "Perseverancia" },
  { quote: "Sé como una piedra que el agua golpea y desgasta, no por la fuerza, sino por la constancia.", author: "Ovidio", category: "Perseverancia" },
  { quote: "El que resiste, gana.", author: "Napoleón Bonaparte", category: "Perseverancia" },
  { quote: "Es duro fracasar, pero es peor no haber intentado nunca.", author: "Theodore Roosevelt", category: "Perseverancia" },
  { quote: "La paciencia y la perseverancia tienen un efecto mágico ante el cual las dificultades desaparecen.", author: "John Quincy Adams", category: "Perseverancia" },
  { quote: "El único lugar donde el éxito viene antes que el trabajo es en el diccionario.", author: "Vidal Sassoon", category: "Perseverancia" },
  { quote: "Ninguno de nosotros es tan inteligente como todos nosotros.", author: "Ken Blanchard", category: "Comunidad" },
  { quote: "Solos podemos hacer tan poco; juntos podemos hacer tanto.", author: "Helen Keller", category: "Comunidad" },
  { quote: "Si quieres ir rápido, ve solo. Si quieres llegar lejos, ve acompañado.", author: "Proverbio africano", category: "Comunidad" },
  { quote: "Nunca dudes que un pequeño grupo de ciudadanos reflexivos y comprometidos puede cambiar el mundo.", author: "Margaret Mead", category: "Comunidad" },
  { quote: "La mejor manera de encontrarte a ti mismo es perderte en el servicio a los demás.", author: "Mahatma Gandhi", category: "Comunidad" },
  { quote: "El servicio a los demás es el alquiler que pagamos por vivir en este planeta.", author: "Marian Wright Edelman", category: "Comunidad" },
  { quote: "Lo que hacemos por nosotros mismos muere con nosotros. Lo que hacemos por los demás permanece.", author: "Albert Pike", category: "Comunidad" },
  { quote: "No podemos vivir solo para nosotros. Mil fibras nos conectan con nuestros semejantes.", author: "Herman Melville", category: "Comunidad" },
  { quote: "El progreso social no se mide por la riqueza de los ricos, sino por el bienestar de los más pobres.", author: "Franklin D. Roosevelt", category: "Comunidad" },
  { quote: "La unión hace la fuerza.", author: "Proverbio universal", category: "Comunidad" },
  { quote: "Las manos que ayudan son más sagradas que los labios que rezan.", author: "Robert G. Ingersoll", category: "Comunidad" },
  { quote: "Cada vez que ayudas a alguien a levantarse, te elevas a ti mismo.", author: "Kofi Annan", category: "Comunidad" },
  { quote: "La verdadera compasión consiste no solo en sentir el dolor del otro, sino en actuar para aliviarlo.", author: "Daniel Goleman", category: "Comunidad" },
  { quote: "El mundo no se divide entre países, sino entre quienes eligen construir comunidad y quienes eligen construir muros.", author: "Malala Yousafzai", category: "Comunidad" },
  { quote: "Una comunidad saludable es aquella donde cada persona se siente valorada.", author: "Melinda Gates", category: "Comunidad" },
  { quote: "Si has venido porque tu liberación está ligada a la mía, trabajemos juntos.", author: "Lilla Watson", category: "Comunidad" },
  { quote: "La humanidad entera es una sola nación.", author: "Bahá'u'lláh", category: "Comunidad" },
  { quote: "Somos lo que hacemos repetidamente. La excelencia no es un acto, sino un hábito.", author: "Aristóteles", category: "Comunidad" },
  { quote: "Donde hay amor e inspiración, no puedes equivocarte.", author: "Ella Fitzgerald", category: "Comunidad" },
  { quote: "La verdadera grandeza consiste en servir.", author: "Mahatma Gandhi", category: "Comunidad" },
  { quote: "La innovación distingue entre un líder y un seguidor.", author: "Steve Jobs", category: "Innovación" },
  { quote: "La creatividad es la inteligencia divirtiéndose.", author: "Albert Einstein", category: "Innovación" },
  { quote: "La mejor manera de predecir el futuro es crearlo.", author: "Peter Drucker", category: "Innovación" },
  { quote: "No podemos resolver los problemas pensando de la misma manera que cuando los creamos.", author: "Albert Einstein", category: "Innovación" },
  { quote: "Si siempre haces lo que siempre has hecho, siempre obtendrás lo que siempre has obtenido.", author: "Henry Ford", category: "Innovación" },
  { quote: "La innovación es ver lo que todos han visto y pensar lo que nadie ha pensado.", author: "Albert Szent-GyÃ¶rgyi", category: "Innovación" },
  { quote: "No hay nada más peligroso que una idea cuando es la única que tienes.", author: "Ã‰mile Chartier", category: "Innovación" },
  { quote: "La manera de empezar es dejar de hablar y empezar a hacer.", author: "Walt Disney", category: "Innovación" },
  { quote: "No sigas los caminos existentes. Ve donde no hay camino y deja un rastro.", author: "Ralph Waldo Emerson", category: "Innovación" },
  { quote: "El cambio es la ley de la vida. Aquellos que solo miran al pasado se perderán el futuro.", author: "John F. Kennedy", category: "Innovación" },
  { quote: "Las ideas difíciles son las que transforman el mundo.", author: "Marie Curie", category: "Innovación" },
  { quote: "La innovación no es cuestión de suerte; es cuestión de curiosidad y perseverancia.", author: "Jeff Bezos", category: "Innovación" },
  { quote: "No tengas miedo de abandonar lo bueno para ir por lo grandioso.", author: "John D. Rockefeller", category: "Innovación" },
  { quote: "El riesgo es el precio que pagas por la oportunidad.", author: "Jeff Bezos", category: "Innovación" },
  { quote: "El que no quiere arriesgar no debe quejarse de no avanzar.", author: "Leonardo da Vinci", category: "Innovación" },
  { quote: "Las grandes mentes discuten ideas; las mentes mediocres discuten eventos.", author: "Eleanor Roosevelt", category: "Innovación" },
  { quote: "Ten el valor de seguir a tu corazón y tu intuición.", author: "Steve Jobs", category: "Innovación" },
  { quote: "La innovación requiere preguntarse ¿y si? constantemente.", author: "Walter Isaacson", category: "Innovación" },
  { quote: "El progreso no se detiene; la innovación es continua.", author: "Elon Musk", category: "Innovación" },
  { quote: "Primero ignóralo, luego ríete de él, luego combátelo, luego gana.", author: "Mahatma Gandhi", category: "Innovación" },
]

const CATEGORY_COLORS: Record<string, string> = {
  'Liderazgo':    '#C0392B',
  'Educación':    '#1a5c8a',
  'Perseverancia':'#D4821A',
  'Comunidad':    '#27500A',
  'Innovación':   '#b25a00',
}

function getDailyQuote() {
  const start = new Date(new Date().getFullYear(), 0, 0)
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

const LEVEL_MAP: Record<string, { label: string; sub: string; bg: string; color: string }> = {
  junior: { label: 'Junior Leader', sub: 'Primaria a 7° bachillerato', bg: '#FEF3C7',             color: '#92400E' },
  senior: { label: 'Senior Leader', sub: '8° a 11° bachillerato',      bg: 'rgba(192,57,43,0.1)', color: '#C0392B' },
}

function Sk({ w = '100%', h = 16, r = 7 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)',
      backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite', flexShrink: 0,
    }} />
  )
}

function AnimatedKPI({ value, locale = 'es-CO' }: { value: number; locale?: string }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now()
    const dur = 900
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplayed(Math.round(value * e))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [value])
  return <>{displayed.toLocaleString(locale)}</>
}

export default function DashboardPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()
  const t           = useTranslations('dashboard.home')
  const tModules    = useTranslations('dashboard.modules')
  const tCommon     = useTranslations('common')

  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(false)
  const [retryKey,     setRetryKey]     = useState(0)
  const [user,         setUser]         = useState<UserData | null>(null)
  const [modules,      setModules]      = useState<Module[]>([])
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([])
  const [diploma,      setDiploma]      = useState<DiplomaInfo | null>(null)
  const [annBanner,    setAnnBanner]    = useState<{ id: string; title: string; content: string; category: string } | null>(null)
  const [annBannerDismissed, setAnnBannerDismissed] = useState(false)
  const [unreadAnnCount, setUnreadAnnCount] = useState(0)
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [notifCount,   setNotifCount]   = useState(0)
  const [userId,       setUserId]       = useState('')
  const [weeklyXP,     setWeeklyXP]     = useState<WeeklyXP[]>([])
  const [streak,       setStreak]       = useState(0)
  const [rankPos,      setRankPos]      = useState<number | null>(null)
  const [leaderProfile, setLeaderProfile] = useState<LeaderProfile | null>(null)
  const [nextEvent,     setNextEvent]     = useState<EventCardEvent | null>(null)
  const [nextEventRsvp, setNextEventRsvp] = useState<RsvpStatus>(null)
  const [userProjects,  setUserProjects]  = useState<{ id: string; status: string }[]>([])
  const [progressOpen,  setProgressOpen]  = useState(false)

  // Estado del colapsable "Ver mi progreso completo" — persistido en localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      setProgressOpen(localStorage.getItem('bf-dashboard-progress-open') === '1')
    }
  }, [])
  function toggleProgress() {
    setProgressOpen(p => {
      const next = !p
      if (typeof localStorage !== 'undefined') localStorage.setItem('bf-dashboard-progress-open', next ? '1' : '0')
      return next
    })
  }

  // Next upcoming event relevant to this user — self-contained fetch (own
  // school_id/role lookup), kept independent from the larger effect below.
  useEffect(() => {
    if (!userId) return
    async function loadNextEvent() {
      if (MOCK_MODE) {
        const d = new Date(); d.setDate(d.getDate() + 3)
        setNextEvent({
          id: 'mock-event-1', title: 'Taller de Liderazgo Regional',
          description: 'Encuentro de líderes de los 8 colegios.',
          location: 'Colegio Albania — Sala de reuniones', meeting_link: null,
          event_date: d.toISOString().slice(0, 10), event_time: '15:00',
        })
        setNextEventRsvp('pending')
        return
      }
      if (!supabaseRef.current) supabaseRef.current = createClient()
      const sb = supabaseRef.current
      if (!sb) return

      const { data: profile } = await sb.from('profiles').select('school_id, role').eq('id', userId).maybeSingle()
      if (!profile?.school_id || !profile.role) return

      const today = new Date().toISOString().slice(0, 10)
      const { data: ev } = await sb
        .from('calendar_events')
        .select('id, title, description, location, meeting_link, event_date, event_time')
        .gte('event_date', today)
        .contains('audience_schools', [profile.school_id])
        .contains('audience_roles', [profile.role])
        .order('event_date')
        .limit(1)
        .maybeSingle()

      if (!ev) return
      setNextEvent(ev)

      const { data: rsvp } = await sb
        .from('event_rsvps').select('status').eq('event_id', ev.id).eq('user_id', userId).maybeSingle()
      setNextEventRsvp((rsvp?.status as RsvpStatus) ?? 'pending')
    }
    loadNextEvent()
  }, [userId])

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    setLoading(true)
    async function load() {
      setLoadError(false)

      if (MOCK_MODE) {
        const u = MOCK.currentUser
        const s = MOCK.students[0]
        setUserId(u.id)
        setUser({ display_name: u.name, total_xp: s.xp, role: 'student', school_level: 'senior', username: u.username, portfolio_public: u.portfolio_public })
        setModules(MOCK.modules.map(m => ({ id: m.id, title: m.title, description: '', xp_reward: m.xpReward, order_index: m.order })))
        setProgressRows([
          { module_id: 'm1', completed: true },
          { module_id: 'm2', completed: true },
          { module_id: 'm3', completed: true },
          { module_id: 'm4', completed: true },
          { module_id: 'm5', completed: true },
        ])
        setWeeklyXP(MOCK.currentStudentWeeklyXP)
        setStreak(s.streak)
        setRankPos(s.rank)
        setAnnBanner({ id: MOCK.announcements[0].id, title: MOCK.announcements[0].title, content: MOCK.announcements[0].content, category: MOCK.announcements[0].category })
        setUnreadAnnCount(MOCK.announcements.length)
        setDiploma({ projectId: 'mock-project-1', resultado: 'certificado' })
        setUserProjects([{ id: 'mock-project-1', status: 'approved' }])
        setLeaderProfile(MOCK_LEADER_PROFILE)
        setNotifCount(2) // 2 unread notifications in mock
        setLoading(false)
        return
      }

      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !authUser) {
        if (!authUser) { router.replace('/login'); return }
        setLoadError(true); setLoading(false); return
      }
      setUserId(authUser.id)

      const [profileRes, xpRes, modsRes, progRes, projRes] = await Promise.all([
        supabase.from('profiles').select('display_name, role, school_level, school_id, leadership_profile, username, portfolio_public').eq('id', authUser.id).maybeSingle(),
        supabase.from('xp_log').select('amount').eq('user_id', authUser.id),
        supabase.from('modules').select('*').eq('status', 'published').order('order_index'),
        supabase.from('progress').select('module_id, completed').eq('user_id', authUser.id),
        supabase.from('projects').select('id, status').eq('user_id', authUser.id),
      ])
      if (modsRes.error || xpRes.error) { setLoadError(true); setLoading(false); return }
      const profile      = profileRes.data
      const xpRows       = xpRes.data
      const mods         = modsRes.data
      const prog         = progRes.data
      const userProjects = projRes.data

      // Fetch announcements for this user's school (or all)
      try {
        const schoolId = profile?.school_id ?? null
        const { data: allAnn } = await supabase
          .from('announcements')
          .select('id, title, content, category, expires_at, target')
          .or(`target.eq.all${schoolId ? `,target.eq.${schoolId}` : ''}`)
          .order('created_at', { ascending: false })
        const { data: reads } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', authUser.id)
        const readSet = new Set(reads?.map((r: { announcement_id: string }) => r.announcement_id) ?? [])
        const now = new Date()
        const visible = (allAnn ?? []).filter((a: { expires_at: string | null }) =>
          !a.expires_at || new Date(a.expires_at) > now
        )
        const unread = visible.filter((a: { id: string }) => !readSet.has(a.id))
        setUnreadAnnCount(unread.length)
        if (unread.length > 0) setAnnBanner(unread[0])
      } catch { /* best-effort */ }

      // Check for a diploma (approved project with certificado/mencion_honor evaluation)
      if (userProjects && userProjects.length > 0) {
        const projectIds = userProjects.map((p: { id: string }) => p.id)
        const { data: evals } = await supabase
          .from('capstone_evaluations')
          .select('project_id, resultado')
          .in('project_id', projectIds)
          .in('resultado', ['certificado', 'mencion_honor'])
          .limit(1)
          .maybeSingle()
        if (evals) setDiploma({ projectId: evals.project_id, resultado: evals.resultado })
      }

      const total_xp = xpRows?.reduce((s: number, r: { amount: number }) => s + r.amount, 0) ?? 0

      // ── Weekly XP (last 4 weeks) ──
      try {
        const since4w = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
        const { data: xpDated } = await supabase
          .from('xp_log').select('amount, created_at').eq('user_id', authUser.id).gte('created_at', since4w)
        const weekMap: Record<string, number> = {}
        const now = new Date()
        for (let i = 3; i >= 0; i--) {
          const d = new Date(now); d.setDate(d.getDate() - i * 7)
          const key = `S${4 - i}`
          weekMap[key] = 0
        }
        xpDated?.forEach((r: { amount: number; created_at: string }) => {
          const daysAgo = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)
          const weekIdx = Math.min(3, Math.floor(daysAgo / 7))
          const key = `S${4 - weekIdx}`
          if (weekMap[key] !== undefined) weekMap[key] += r.amount
        })
        setWeeklyXP(Object.entries(weekMap).map(([week, xp]) => ({ week, xp })))

        // ── Streak (consecutive days active) ──
        const { data: xpDays } = await supabase
          .from('xp_log').select('created_at').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(60)
        if (xpDays && xpDays.length > 0) {
          const daySet = new Set(xpDays.map((r: { created_at: string }) =>
            new Date(r.created_at).toISOString().slice(0, 10)
          ))
          let s = 0
          const today = new Date()
          for (let i = 0; i < 60; i++) {
            const d = new Date(today); d.setDate(d.getDate() - i)
            if (daySet.has(d.toISOString().slice(0, 10))) s++; else break
          }
          setStreak(s)
        }

        // ── Ranking in school ──
        if (profile?.school_id) {
          const { data: schoolStudents } = await supabase
            .from('profiles').select('id').eq('school_id', profile.school_id).eq('role', 'student')
          if (schoolStudents && schoolStudents.length > 0) {
            const sids = schoolStudents.map((p: { id: string }) => p.id)
            const { data: schoolXP } = await supabase.from('xp_log').select('user_id, amount').in('user_id', sids)
            const xpByUser: Record<string, number> = {}
            schoolXP?.forEach((r: { user_id: string; amount: number }) => { xpByUser[r.user_id] = (xpByUser[r.user_id] ?? 0) + r.amount })
            const rank = Object.values(xpByUser).filter(v => v > total_xp).length + 1
            setRankPos(rank)
          } else {
            setRankPos(0) // no other students in school
          }
        } else {
          setRankPos(0) // no school assigned
        }
      } catch {
        setRankPos(0) // error fallback — never stay in skeleton
      }

      setUser({
        display_name:     profile?.display_name ?? 'Líder Big Family',
        total_xp,
        role:            profile?.role ?? null,
        school_level:    profile?.school_level ?? null,
        username:        (profile as { username?: string | null } | null)?.username ?? null,
        portfolio_public: (profile as { portfolio_public?: boolean } | null)?.portfolio_public ?? true,
      })
      if (profile?.leadership_profile) setLeaderProfile(profile.leadership_profile as LeaderProfile)

      // Unread notifications count
      try {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .eq('read', false)
        setNotifCount(count ?? 0)
      } catch { /* non-fatal */ }

      setModules(mods ?? [])
      setProgressRows(prog ?? [])
      setUserProjects(userProjects ?? [])
      setLoading(false)
    }
    load()
  }, [retryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayName    = user?.display_name ?? 'Líder Big Family'
  const avatarLetter   = displayName[0]?.toUpperCase() ?? 'L'
  const initials       = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'L'
  const completedIds   = new Set(progressRows.filter(p => p.completed).map(p => p.module_id))
  const totalModules   = modules.length
  const completedCount = completedIds.size
  const visionPct      = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0
  const hasAnyProgress = progressRows.length > 0
  const isNewUser      = !loading && !hasAnyProgress

  // Sequential lock: module N+1 is locked until module N is completed
  const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index)
  const lockedIds = new Set<string>()
  for (let i = 1; i < sortedModules.length; i++) {
    if (!completedIds.has(sortedModules[i - 1].id)) {
      sortedModules.slice(i).forEach(m => lockedIds.add(m.id))
      break
    }
  }
  const allModulesDone = totalModules > 0 && completedCount >= totalModules
  const capstoneLocked = !allModulesDone
  const nextModule = sortedModules.find(m => !completedIds.has(m.id) && !lockedIds.has(m.id)) ?? null

  const capstoneState: 'bloqueado' | 'enviado' | 'evaluado' | 'en_progreso' =
    capstoneLocked                                          ? 'bloqueado'   :
    userProjects.some(p => p.status === 'pending')          ? 'enviado'     :
    diploma || userProjects.some(p => p.status === 'approved') ? 'evaluado' :
                                                                 'en_progreso'

  async function dismissBanner() {
    if (!annBanner || !supabaseRef.current) return
    const sb = supabaseRef.current
    setAnnBannerDismissed(true)
    await sb.from('announcement_reads').upsert({ user_id: userId, announcement_id: annBanner.id }, { onConflict: 'user_id,announcement_id' }).select()
    setUnreadAnnCount(c => Math.max(0, c - 1))
  }

  if (loadError) {
    return (
      <div className="content">
        <div className="load-error">
          <div className="load-error__icon">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="9" stroke="#C0392B" strokeWidth="1.5"/>
              <path d="M11 7v5M11 15v.5" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="load-error__title">{t('loadError.title')}</div>
          <div className="load-error__sub">{t('loadError.subtitle')}</div>
          <button className="load-error__btn" onClick={() => { setLoadError(false); setRetryKey(k => k + 1) }}>
            {tCommon('retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`


        /* ── Center content ── */
        .content{flex:1;min-width:0;overflow-y:auto;padding:32px 28px;display:flex;flex-direction:column;gap:20px;}

        /* ── Error state ── */
        .load-error{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:16px;padding:60px 24px;text-align:center;}
        .load-error__icon{width:48px;height:48px;border-radius:12px;background:rgba(192,57,43,.08);display:flex;align-items:center;justify-content:center;}
        .load-error__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);}
        .load-error__sub{font-size:13px;color:var(--mute);max-width:280px;line-height:1.55;}
        .load-error__btn{padding:10px 22px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s cubic-bezier(0.22,1,0.36,1);}
        .load-error__btn:hover{background:#a93226;}
        .load-error__btn:active{transform:scale(0.98);}

        /* ── Announcement banner ── */
        .ann-banner{display:flex;align-items:flex-start;gap:12px;padding:14px 18px;background:rgba(192,57,43,.07);border:1px solid rgba(192,57,43,.2);border-radius:14px;}
        .ann-banner__cat{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#C0392B;margin-bottom:4px;}
        .ann-banner__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);}
        .ann-banner__body{font-size:13px;color:var(--mute);margin-top:2px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .ann-banner__dismiss{background:none;border:none;cursor:pointer;color:var(--mute);font-size:18px;line-height:1;padding:2px;flex-shrink:0;transition:color .15s;}
        .ann-banner__dismiss:hover{color:var(--ink);}
        .bell-btn{position:relative;background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:var(--mute);transition:color .15s,background .15s;flex-shrink:0;}
        .bell-btn:hover{color:var(--ink);background:var(--line);}
        .bell-badge{position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:#C0392B;border:2px solid var(--card-bg);}

        /* ── Onboarding banner ── */
        .onboard{background:linear-gradient(135deg,var(--bg),var(--card-bg));border:1px solid rgba(192,57,43,.15);border-radius:16px;padding:20px 24px;}
        .onboard-label{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#C0392B;font-weight:700;margin-bottom:10px;}
        .onboard-steps{display:flex;align-items:center;gap:0;}
        .ob-step{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;}
        .ob-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;}
        .ob-dot.done{background:#22c55e;color:#fff;}
        .ob-dot.next{background:#C0392B;color:#fff;}
        .ob-dot.idle{background:var(--line);color:var(--mute);}
        .ob-sep{flex:1;height:1px;background:var(--line);margin:0 12px;min-width:24px;}

        /* ── Cards ── */
        .card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;box-shadow:0 2px 16px -6px rgba(13,13,13,.08);}

        /* ── Progress bar (reusada por la card de Capstone en Zona 3A) ── */
        .prog-track{height:8px;background:var(--line);border-radius:999px;overflow:hidden;}
        .prog-bar{height:100%;background:#C0392B;border-radius:999px;transition:width .6s cubic-bezier(.4,0,.2,1);}
        .btn-ghost{padding:10px 18px;background:none;border:1px solid var(--line);border-radius:10px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer;transition:border-color .2s cubic-bezier(0.22,1,0.36,1),background .2s cubic-bezier(0.22,1,0.36,1);font-family:"Satoshi",sans-serif;}
        .btn-ghost:hover{border-color:var(--ink);}
        .btn-ghost:active{transform:scale(0.98);}
        /* ── Modules section ── */
        .mods-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
        .mods-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:18px;color:var(--ink);}
        .zone3b-title{font-size:20px;font-weight:600;margin-bottom:20px;}
        .mods-count{padding:3px 10px;background:var(--line);color:var(--mute);border-radius:999px;font-size:11px;font-weight:600;}

        /* ── Standard module grid ── */
        .mods-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
        .mod-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:20px;box-shadow:var(--shadow-card);display:flex;flex-direction:column;gap:10px;transition:box-shadow .25s cubic-bezier(0.22,1,0.36,1),transform .25s cubic-bezier(0.22,1,0.36,1);}
        .mod-card:hover{box-shadow:0 6px 24px -8px rgba(13,13,13,.14);transform:translateY(-1px);}
        .mod-card:active{transform:scale(0.99);}
        .mod-card.done{background:var(--bg-2);opacity:0.72;}
        .mod-card.locked{opacity:.45;cursor:default;pointer-events:none;}
        .mod-num{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#C0392B;}
        .mod-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);line-height:1.35;}
        .mod-desc{font-size:12px;color:var(--mute);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .mod-xp{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:rgba(192,57,43,.08);color:#C0392B;border-radius:999px;font-size:11px;font-weight:700;width:fit-content;}
        .mod-prog-track{height:4px;background:var(--line);border-radius:999px;overflow:hidden;}
        .mod-prog-bar{height:100%;background:#C0392B;border-radius:999px;transition:width .5s cubic-bezier(0.22,1,0.36,1);}
        .mod-prog-bar.green{background:#22c55e;}
        .btn-start{padding:9px 14px;background:var(--ink);border:none;border-radius:9px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:12px;color:var(--bg);cursor:pointer;transition:background .2s cubic-bezier(0.22,1,0.36,1);width:100%;margin-top:2px;}
        .btn-start:hover{background:#C0392B;}
        .btn-start:active{transform:scale(0.98);}

        /* ── Done badge with animated check ── */
        .done-badge{display:flex;align-items:center;justify-content:center;gap:5px;padding:9px;background:rgba(34,197,94,.1);border-radius:9px;font-size:12px;font-weight:700;color:#16a34a;margin-top:2px;}
        .done-check-svg{overflow:visible;}
        .done-check-path{stroke-dasharray:20;stroke-dashoffset:20;animation:drawCheck .4s cubic-bezier(0.22,1,0.36,1) forwards;}
        @keyframes drawCheck{to{stroke-dashoffset:0}}
        @media(prefers-reduced-motion:no-preference){
          .mod-card.done .done-check-path{animation:drawCheck .4s cubic-bezier(0.22,1,0.36,1) forwards;}
        }
        @media(prefers-reduced-motion:reduce){
          .done-check-path{stroke-dashoffset:0;animation:none;}
        }
        .lock-badge{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;background:var(--line);border-radius:9px;font-size:12px;font-weight:600;color:var(--mute);margin-top:2px;}
        .mods-empty{padding:32px 20px;text-align:center;color:var(--mute);font-size:13px;border:1px dashed var(--line);border-radius:14px;}
        .capstone-banner{display:flex;align-items:center;gap:14px;padding:18px 22px;background:linear-gradient(135deg,rgba(34,197,94,.08),rgba(34,197,94,.04));border:1px solid rgba(34,197,94,.25);border-radius:14px;}
        .btn-upload:disabled{opacity:.4;cursor:not-allowed;background:#9a9690 !important;}

        /* ── KPI bento ── */
        .kpi-bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;}
        @media(max-width:1100px){.kpi-bento{grid-template-columns:repeat(2,minmax(0,1fr));}}
        @media(max-width:600px){.kpi-bento{grid-template-columns:1fr;}}
        .kpi-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:20px 22px;box-shadow:var(--shadow-card);transition:transform .2s;}
        .kpi-card:hover{transform:translateY(-1px);}
        .kpi-num{font-family:var(--font-mono,"JetBrains Mono",monospace);font-variant-numeric:tabular-nums;font-weight:700;font-size:32px;letter-spacing:-.02em;line-height:1;}
        .kpi-label{font-size:10.5px;color:var(--mute);margin-top:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:600;}

        /* ── Charts bento ── */
        .charts-row{display:grid;grid-template-columns:8fr 4fr;gap:16px;}
        @media(max-width:860px){.charts-row{grid-template-columns:1fr;}}

        /* ── Zona 3A: Mi Capstone (58%) + Frase del día (42%) ── */
        .zone3a-row{display:grid;grid-template-columns:58fr 42fr;gap:16px;}

        /* ── Diploma unlocked banner ── */
        .cert-unlocked{display:flex;align-items:center;gap:20px;background:var(--ink,#0D0D0D);border:1px solid rgba(192,57,43,.35);border-radius:16px;padding:20px 24px;cursor:pointer;transition:border-color .2s cubic-bezier(0.22,1,0.36,1);text-decoration:none;margin-bottom:20px;width:100%;}
        .cert-unlocked:hover{border-color:var(--accent,#C0392B);}
        .cert-unlocked__seal{width:48px;height:48px;border-radius:50%;background:rgba(192,57,43,.15);border:1.5px solid rgba(192,57,43,.4);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .cert-unlocked__body{flex:1;min-width:0;}
        .cert-unlocked__eyebrow{font-family:"Satoshi",sans-serif;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:4px;}
        .cert-unlocked__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:#fff;margin-bottom:2px;}
        .cert-unlocked__sub{font-family:"Satoshi",sans-serif;font-size:13px;color:var(--accent,#C0392B);}
        .cert-unlocked__arrow{color:rgba(255,255,255,.35);font-size:22px;flex-shrink:0;line-height:1;}
        /* ── Certification card ── */
        .cert-eyebrow{font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#C0392B;font-weight:700;font-family:"Satoshi",sans-serif;margin-bottom:10px;}
        .cert-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:var(--ink);margin-bottom:18px;}
        .cert-text{font-size:14px;color:var(--mute);line-height:1.55;margin-bottom:20px;margin-top:12px;}
        .btn-upload{width:100%;padding:12px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s cubic-bezier(0.22,1,0.36,1);}
        .btn-upload:hover{background:#a93226;}
        .btn-upload:active{transform:scale(0.98);}

        /* ── Coordinator button ── */
        .btn-coordinator{padding:8px 16px;background:transparent;border:1px solid var(--line);border-radius:999px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer;transition:border-color .2s,color .2s;white-space:nowrap;flex-shrink:0;}
        .btn-coordinator:hover{border-color:#C0392B;color:#C0392B;}

        @media(max-width:1200px){.mods-grid{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:860px){
          .zone3a-row{grid-template-columns:1fr;}
          .mods-grid{grid-template-columns:1fr;}
        }
        /* Zona 3 en mobile: el grid de módulos vuelve a 2 columnas (no 1) —
           esta regla debe ir DESPUÉS de la de 860px para ganar la cascada,
           misma especificidad, gana la última en orden de aparición. */
        @media(max-width:768px){.mods-grid{grid-template-columns:repeat(2,1fr);}}

        /* ── Zona 1 — Header personal ── */
        .zone1-header{display:grid;grid-template-columns:60fr 40fr;gap:28px;align-items:start;}
        .zone1-left{min-width:0;display:flex;flex-direction:column;}
        .zone1-greeting{font-family:"Satoshi",sans-serif;font-weight:600;font-size:28px;letter-spacing:-0.01em;color:var(--ink);line-height:1.2;}
        .zone1-archetype-row{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;}
        .identity-archetype{font-family:"Instrument Serif",serif;font-style:italic;font-size:18px;color:#C0392B;line-height:1.2;}
        .zone1-stats{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-top:14px;}
        .zone1-stat-num{font-family:"Satoshi",sans-serif;font-weight:600;font-size:16px;color:var(--ink);font-variant-numeric:tabular-nums;}
        .zone1-stat-label{font-size:11px;color:var(--mute);}
        .zone1-sep{color:var(--mute);}
        /* Right column: pentagon + pills, centered */
        .zone1-right{flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;}
        .zone1-pentagon-mobile{display:none;}
        /* Profile pills under SVG */
        .identity-pent-pills{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;}
        .identity-pent-pill{padding:2px 8px;border-radius:999px;font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;}
        .identity-pent-pill.strength{background:rgba(15,123,108,.1);color:var(--accent-teal,#0F7B6C);border:1px solid rgba(15,123,108,.2);}
        .identity-pent-pill.growth{background:rgba(192,57,43,.08);color:#C0392B;border:1px solid rgba(192,57,43,.2);}
        @media(max-width:768px){
          .zone1-header{grid-template-columns:1fr;}
          .zone1-right{margin-top:8px;}
          .zone1-pentagon-desktop{display:none;}
          .zone1-pentagon-mobile{display:block;}
        }

        /* ── Zona 2 — Acción principal ── */
        .zone2-hero{display:grid;grid-template-columns:65fr 35fr;gap:24px;background:var(--card-bg);border:1px solid var(--card-border);border-left:4px solid #C0392B;border-radius:14px;padding:28px 32px;align-items:center;}
        .zone2-hero__eyebrow{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#C0392B);margin-bottom:10px;display:flex;align-items:center;gap:6px;}
        .zone2-hero__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:28px;color:var(--ink);line-height:1.25;margin-bottom:8px;}
        .zone2-hero__desc{font-size:13px;color:var(--mute);line-height:1.5;margin-bottom:18px;}
        .zone2-hero__footer{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
        .zone2-hero__xp{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(192,57,43,.08);color:#C0392B;border-radius:999px;font-size:11px;font-weight:700;}
        .zone2-hero__cta{padding:12px 28px;background:#C0392B;border:none;border-radius:100px;font-family:"Satoshi",sans-serif;font-weight:600;font-size:14px;color:#fff;cursor:pointer;transition:background .2s cubic-bezier(0.22,1,0.36,1);white-space:nowrap;}
        .zone2-hero__cta:hover{background:#a93226;}
        .zone2-hero__cta:active{transform:scale(0.98);}
        .zone2-hero__right{display:flex;align-items:center;justify-content:center;background:var(--bg-2);border-radius:10px;padding:32px;}
        @media(max-width:768px){
          .zone2-hero{grid-template-columns:1fr;padding:22px 20px;}
          .zone2-hero__right{display:none;}
          .zone2-hero__title{font-size:22px;}
          .zone2-hero__cta{width:100%;text-align:center;}
        }

        /* ── Zona 3C — toggle "Ver mi progreso completo" ── */
        .zone3c-toggle{display:inline-flex;align-items:center;gap:8px;background:var(--bg-2);border:1px solid var(--card-border);border-radius:100px;padding:10px 20px;font-family:"Satoshi",sans-serif;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;}

        /* ── Pillar pills ── */
        .pillar-pills{display:flex;gap:10px;flex-wrap:wrap;}
        .pillar-pill{flex:1;min-width:100px;display:flex;flex-direction:column;gap:5px;padding:12px 14px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:12px;box-shadow:var(--shadow-card);}
        .pillar-pill__header{display:flex;justify-content:space-between;align-items:center;}
        .pillar-pill__name{font-family:"Satoshi",sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;}
        .pillar-pill__pct{font-family:"Satoshi",sans-serif;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;}
        .pillar-pill__track{height:3px;background:var(--line);border-radius:999px;overflow:hidden;}
        .pillar-pill__bar{height:100%;border-radius:999px;transition:width .5s cubic-bezier(.4,0,.2,1);}

        /* ── Module profile badges ── */
        .mod-profile-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.03em;white-space:nowrap;}
        .mod-profile-badge.strength{background:rgba(15,123,108,.1);color:var(--accent-teal,#0F7B6C);border:1px solid rgba(15,123,108,.2);}
        .mod-profile-badge.growth{background:rgba(192,57,43,.08);color:#C0392B;border:1px solid rgba(192,57,43,.2);}
      `}</style>

      <m.main
          className="content"
          initial={pref ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
        >

          {/* Announcement banner — most recent unread */}
          {annBanner && !annBannerDismissed && (
            <div className="ann-banner">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ann-banner__cat">{annBanner.category}</div>
                <div className="ann-banner__title">{annBanner.title}</div>
                <div className="ann-banner__body">{annBanner.content}</div>
              </div>
              <button className="ann-banner__dismiss" onClick={dismissBanner} aria-label={t('closeAnnouncementAria')}>×</button>
            </div>
          )}

          {/* Onboarding banner — only for new users */}
          {isNewUser && (
            <div className="onboard">
              <div className="onboard-label">{t('onboarding.step')}</div>
              <div className="onboard-steps">
                <div className="ob-step">
                  <div className="ob-dot done">✓</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>{t('onboarding.register')}</span>
                </div>
                <div className="ob-sep" />
                <div className="ob-step">
                  <div className="ob-dot next">2</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{t('onboarding.firstModule')}</span>
                </div>
                <div className="ob-sep" />
                <div className="ob-step">
                  <div className="ob-dot idle">3</div>
                  <span style={{ fontSize: 13, color: 'var(--mute)' }}>{t('onboarding.firstIC')}</span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ZONA 1 — Header personal (compacto)
          ══════════════════════════════════════════════════════════════ */}
          <m.div
            className="zone1-header"
            initial={pref ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          >
            <div className="zone1-left">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                {loading ? (
                  <Sk w="60%" h={28} r={6} />
                ) : (
                  <div className="zone1-greeting">{t('zone1.greeting', { name: displayName })}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {user?.role === 'coordinator' && (
                    <button className="btn-coordinator" onClick={() => router.push('/coordinator')}>{t('coordinatorPanel')}</button>
                  )}
                  {user?.role === 'expositor' && (
                    <button className="btn-coordinator" onClick={() => router.push('/expositor')}>{t('expositorPanel')}</button>
                  )}
                  <button
                    className="bell-btn"
                    onClick={() => setNotifOpen(true)}
                    title={notifCount > 0 ? t('unreadNotifications', { count: notifCount }) : tCommon('notifications')}
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2A5 5 0 0 0 5 7v3l-1.5 2.5h13L15 10V7A5 5 0 0 0 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M8 15a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {notifCount > 0 && <span className="bell-badge" />}
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ marginTop: 10 }}><Sk w="40%" h={16} r={5} /></div>
              ) : (
                <>
                  {(() => {
                    const lv = LEVEL_MAP[user?.school_level ?? 'senior'] ?? LEVEL_MAP['senior']
                    return (
                      <div className="zone1-archetype-row">
                        {leaderProfile && <div className="identity-archetype">{leaderProfile.arquetipo}</div>}
                        <span style={{ padding: '2px 9px', borderRadius: 999, background: lv.bg, color: lv.color, fontSize: 11, fontWeight: 700, fontFamily: '"Satoshi",sans-serif', whiteSpace: 'nowrap' }}>
                          {lv.label}
                        </span>
                      </div>
                    )
                  })()}

                  <div className="zone1-stats">
                    <span><span className="zone1-stat-num">{(user?.total_xp ?? 0).toLocaleString('es-CO')}</span> <span className="zone1-stat-label">{t('zone1.statsXp')}</span></span>
                    <span className="zone1-sep">·</span>
                    <span><span className="zone1-stat-num">{completedCount}</span> <span className="zone1-stat-label">{t('zone1.statsModules')}</span></span>
                    <span className="zone1-sep">·</span>
                    <span><span className="zone1-stat-num">{streak}</span> <span className="zone1-stat-label">{t('zone1.statsStreak')}</span></span>
                    <span className="zone1-sep">·</span>
                    <span className="zone1-stat-num">{rankPos === 0 || rankPos === null ? '—' : `#${rankPos}`}</span>
                  </div>
                </>
              )}
            </div>

            {/* Right: pentagon (140px desktop / 100px mobile) + pills de fortaleza */}
            {!loading && (leaderProfile ?? (MOCK_MODE ? MOCK_LEADER_PROFILE : null)) && (
              <div className="zone1-right">
                <div className="zone1-pentagon-desktop">
                  <CompactPentagon profile={(leaderProfile ?? MOCK_LEADER_PROFILE)!} size={140} />
                </div>
                <div className="zone1-pentagon-mobile">
                  <CompactPentagon profile={(leaderProfile ?? MOCK_LEADER_PROFILE)!} size={100} />
                </div>
                <div className="identity-pent-pills">
                  {(leaderProfile ?? MOCK_LEADER_PROFILE)!.fortalezas.map(p => (
                    <span key={p} className="identity-pent-pill strength">{p} ↑</span>
                  ))}
                </div>
              </div>
            )}
          </m.div>

          {/* ── Entre Zona 1 y Zona 2: próximo evento + link de portafolio ── */}
          {nextEvent && (
            <EventCard
              event={nextEvent}
              userRsvp={nextEventRsvp}
              onRsvp={(_, status) => setNextEventRsvp(status)}
            />
          )}

          {!loading && user?.role === 'student' && (
            <m.div
              initial={pref ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            >
              {!user.username ? (
                /* Sin username: guiar al usuario a configurar su portafolio */
                <a
                  href="/dashboard/settings"
                  style={{
                    fontFamily: '"Satoshi",sans-serif', fontSize: 12,
                    color: 'var(--mute)', textDecoration: 'none',
                  }}
                >
                  {t('portfolioLink.configurePrefix')}{' '}
                  <span style={{ color: '#C0392B', fontWeight: 600 }}>{t('portfolioLink.configureLink')}</span>
                </a>
              ) : user.portfolio_public ? (
                /* Portafolio activo */
                <a
                  href={`/p/${user.username}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '8px 16px', border: '1px solid var(--line)',
                    borderRadius: 999, fontFamily: '"Satoshi",sans-serif',
                    fontSize: 13, fontWeight: 600, color: 'var(--mute)',
                    textDecoration: 'none', transition: 'border-color .2s, color .2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#C0392B'; (e.currentTarget as HTMLAnchorElement).style.color = '#C0392B' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--mute)' }}
                >
                  {t('portfolioLink.viewPublic')}
                </a>
              ) : (
                /* Portafolio privado */
                <span style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 12, color: 'var(--mute)' }}>
                  {t('portfolioLink.privatePrefix')}{' '}
                  <a href="/dashboard/settings" style={{ color: '#C0392B', textDecoration: 'none', fontWeight: 600 }}>
                    {t('portfolioLink.activateLink')}
                  </a>
                </span>
              )}
            </m.div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ZONA 2 — Acción principal
          ══════════════════════════════════════════════════════════════ */}
          {!loading && allModulesDone ? (
            <div className="capstone-banner">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2l2.4 5.1 5.6.8-4 3.9.9 5.6L10 14.8l-4.9 2.6.9-5.6L2 7.9l5.6-.8L10 2Z" fill="#16a34a"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 15, color: '#15803d' }}>{t('capstoneBanner.unlocked')}</div>
                <div style={{ fontSize: 12.5, color: '#166534', marginTop: 2 }}>{t('capstoneBanner.body', { total: totalModules })}</div>
              </div>
              <m.button
                style={{ marginLeft: 'auto', padding: '9px 18px', background: '#16a34a', border: 'none', borderRadius: 10, fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => router.push('/dashboard/projects/new')}
                whileHover={pref ? undefined : { scale: 1.02 }}
                whileTap={pref ? undefined : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              >
                {t('capstoneCard.uploadProject')}
              </m.button>
            </div>
          ) : !loading && nextModule ? (
            <m.div
              className="zone2-hero"
              initial={pref ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            >
              <div className="zone2-hero__left">
                <div className="zone2-hero__eyebrow">
                  <span>{t('modulesAvailable.nextModuleLabel')}</span>
                  <span style={{ opacity: .45 }}>·</span>
                  <span style={{ color: 'var(--mute)', fontWeight: 500, textTransform: 'none' }}>
                    {String(nextModule.order_index).padStart(2, '0')}
                  </span>
                  {leaderProfile && (() => {
                    const pillar = MODULE_PILLAR[nextModule.order_index]
                    if (!pillar) return null
                    if (leaderProfile.fortalezas.includes(pillar))
                      return <span className="mod-profile-badge strength">{tModules('strengthBadge')}</span>
                    if (leaderProfile.areas_crecimiento.includes(pillar))
                      return <span className="mod-profile-badge growth">{tModules('growthBadge')}</span>
                    return null
                  })()}
                </div>
                <div className="zone2-hero__title">{nextModule.title}</div>
                <div className="zone2-hero__desc">{nextModule.description}</div>
                <div className="zone2-hero__footer">
                  <span className="zone2-hero__xp">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <path d="M5 0L6.2 3.8H10L6.9 6.1L8.1 10L5 7.6L1.9 10L3.1 6.1L0 3.8H3.8L5 0Z"/>
                    </svg>
                    {nextModule.xp_reward ?? 100} XP
                  </span>
                  <m.button
                    className="zone2-hero__cta"
                    onClick={() => router.push(`/dashboard/modules/${nextModule.id}`)}
                    whileHover={pref ? undefined : { scale: 1.02 }}
                    whileTap={pref ? undefined : { scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  >
                    {t('modulesAvailable.startNow')}
                  </m.button>
                </div>
              </div>
              <div className="zone2-hero__right" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M5 3l14 9-14 9V3Z" fill="var(--mute)"/>
                </svg>
              </div>
            </m.div>
          ) : null}

          {/* KPI bento, pillar pills y charts bento ahora viven dentro de la
              Zona 3C colapsable — ver el bloque "Ver mi progreso completo"
              más abajo, justo después de la Zona 3B (Mis módulos). */}

          {/* La antigua Leadership Progress Card se recortó: Strategic Vision
              duplicaba el % de módulos (ya visible en Zona 1/3A), Community
              Engagement estaba hardcodeada en 0% sin dato real, y el botón
              "siguiente módulo" enlazaba a /leadership-path en vez del módulo
              directo (ya resuelto mejor por la Zona 2). Solo sobrevive el
              botón "Ver programa completo", reubicado dentro de Zona 3C.
              El banner de Capstone desbloqueado se reubicó dentro de Zona 2. */}

          {/* ══════════════════════════════════════════════════════════════
              ZONA 3A — Mi Capstone + Frase del día
          ══════════════════════════════════════════════════════════════ */}
          <div className="zone3a-row">
            {/* Izquierda — Mi Capstone, 4 estados */}
            <div className="card">
              <div className="cert-eyebrow">{t('capstoneCard.eyebrow')}</div>
              <div className="cert-title">{t('capstoneCard.title')}</div>

              {(() => {
                const STATE_STYLE: Record<typeof capstoneState, { bg: string; color: string }> = {
                  bloqueado:   { bg: 'var(--line)',             color: 'var(--mute)'  },
                  en_progreso: { bg: 'var(--bg-2)',              color: 'var(--ink-2)' },
                  enviado:     { bg: '#FEF3C7',                  color: '#92400E'      },
                  evaluado:    { bg: 'rgba(34,197,94,.12)',      color: '#16a34a'      },
                }
                const s = STATE_STYLE[capstoneState]
                return (
                  <span style={{ display: 'inline-flex', padding: '3px 11px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, fontFamily: '"Satoshi",sans-serif', marginBottom: 14 }}>
                    {t(`capstoneCard.states.${capstoneState}`)}
                  </span>
                )
              })()}

              <div className="prog-track" style={{ marginBottom: 16 }}>
                <div className="prog-bar" style={{ width: `${visionPct}%` }} />
              </div>

              {capstoneState === 'bloqueado' && (
                <button className="btn-upload" disabled>
                  {t('capstoneCard.uploadProject')}
                </button>
              )}
              {capstoneState === 'en_progreso' && (
                <m.button
                  className="btn-upload"
                  onClick={() => router.push('/dashboard/projects/new')}
                  whileHover={pref ? undefined : { scale: 1.02 }}
                  whileTap={pref ? undefined : { scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                >
                  {t('capstoneCard.continueProject')}
                </m.button>
              )}
              {capstoneState === 'enviado' && (
                <div className="cert-text" style={{ marginBottom: 0, textAlign: 'center' }}>
                  {t('capstoneCard.inReview')}
                </div>
              )}
              {capstoneState === 'evaluado' && (
                <m.button
                  className="btn-upload"
                  onClick={() => router.push(diploma ? `/certificacion/${diploma.projectId}` : '/dashboard/projects')}
                  whileHover={pref ? undefined : { scale: 1.02 }}
                  whileTap={pref ? undefined : { scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  style={{ background: '#16a34a' }}
                >
                  {diploma ? t('capstoneCard.viewDiploma') : t('capstoneCard.viewProject')}
                </m.button>
              )}
            </div>

            {/* Derecha — Frase del día */}
            <div>
              {(() => {
                const q = getDailyQuote()
                const accent = CATEGORY_COLORS[q.category] ?? '#C0392B'
                const qInitials = (() => {
                  const parts = q.author.split(' ')
                  return parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
                })()
                return (
                  <div style={{ background: 'rgba(192,57,43,0.04)', border: '1px solid rgba(192,57,43,0.12)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                    <span style={{ position: 'absolute', top: 4, left: 12, fontFamily: "'Instrument Serif',serif", fontSize: 28, color: 'rgba(192,57,43,0.2)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>&ldquo;</span>
                    <div style={{ paddingLeft: 4 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: 8 }}>{q.category} · {t('quoteOfDay')}</div>
                      <p style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65, margin: '0 0 14px 0', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.quote}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg, ${accent}, #0D0D0D)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', fontFamily: '"Satoshi", sans-serif', flexShrink: 0 }}>{qInitials}</div>
                        <span style={{ fontSize: 12, fontFamily: '"Satoshi", sans-serif', fontWeight: 600, color: '#C0392B' }}>— {q.author}</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              ZONA 3B — Mis módulos
          ══════════════════════════════════════════════════════════════ */}
          <div>
            <div className="mods-header">
              <span className="mods-title zone3b-title">{t('zone3.modulesTitle')}</span>
              {!loading && (
                <span className="mods-count">{totalModules} {totalModules !== 1 ? t('modulesAvailable.modulePlural') : t('modulesAvailable.moduleSingular')}</span>
              )}
            </div>

            {loading ? (
              <>
                {/* Grid skeleton */}
                <div className="mods-grid">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="mod-card" style={{ gap: 12 }}>
                      <Sk w="40%" h={10} r={5} />
                      <Sk w="70%" h={14} r={6} />
                      <Sk w="100%" h={10} r={5} />
                      <Sk w="60px" h={20} r={999} />
                      <Sk w="100%" h={4} r={999} />
                      <Sk w="100%" h={34} r={9} />
                    </div>
                  ))}
                </div>
              </>
            ) : totalModules === 0 ? (
              <div className="mods-empty">
                {t('modulesAvailable.empty')}
              </div>
            ) : (
              <>
                {/* ── Diploma unlocked card — shown above modules when certified ── */}
                {diploma && (
                  <m.button
                    className="cert-unlocked"
                    onClick={() => router.push(`/certificacion/${userId}`)}
                    initial={pref ? false : { opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    whileHover={pref ? undefined : { scale: 1.01, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
                    style={{ border: 'none' }}
                  >
                    <div className="cert-unlocked__seal" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M11 1L13.5 8H21L15 12.5L17.5 20L11 15.5L4.5 20L7 12.5L1 8H8.5L11 1Z" fill="#C0392B"/>
                      </svg>
                    </div>
                    <div className="cert-unlocked__body">
                      <div className="cert-unlocked__eyebrow">{t('modulesAvailable.diplomaUnlocked.eyebrow')}</div>
                      <div className="cert-unlocked__title">{t('modulesAvailable.diplomaUnlocked.title')}</div>
                      <div className="cert-unlocked__sub">{t('modulesAvailable.diplomaUnlocked.subtitle')}</div>
                    </div>
                    <div className="cert-unlocked__arrow" aria-hidden="true">›</div>
                  </m.button>
                )}

                {/* La tarjeta destacada de "próximo módulo" ahora vive en la
                    Zona 2 (arriba) — aquí solo queda el grid estándar, que
                    ya excluye nextModule del listado para no duplicarlo. */}

                {/* ── Standard grid: all other modules ── */}
                {sortedModules.filter(m => m.id !== nextModule?.id).length > 0 && (
                  <m.div
                    className="mods-grid"
                    initial={pref ? false : 'hidden'}
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
                  >
                    {sortedModules
                      .filter(mod => mod.id !== nextModule?.id)
                      .map((mod) => {
                        const isDone   = completedIds.has(mod.id)
                        const isLocked = lockedIds.has(mod.id)
                        return (
                          <m.div
                            key={mod.id}
                            variants={fadeUp}
                            className={`mod-card ${isDone ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
                            onClick={!isLocked && !isDone ? () => router.push(`/dashboard/modules/${mod.id}`) : undefined}
                            style={!isLocked && !isDone ? { cursor: 'pointer' } : undefined}
                          >
                            <div className="mod-num" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {String(mod.order_index).padStart(2, '0')}
                              {isLocked && (
                                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" style={{ opacity: .4 }}>
                                  <rect x="2" y="6" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                                  <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                                </svg>
                              )}
                              {leaderProfile && (() => {
                                const pillar = MODULE_PILLAR[mod.order_index]
                                if (!pillar) return null
                                if (leaderProfile.fortalezas.includes(pillar))
                                  return <span className="mod-profile-badge strength">{tModules('strengthBadge')}</span>
                                if (leaderProfile.areas_crecimiento.includes(pillar))
                                  return <span className="mod-profile-badge growth">{tModules('growthBadge')}</span>
                                return null
                              })()}
                            </div>
                            <div className="mod-name">{mod.title}</div>
                            <div className="mod-desc">{mod.description}</div>
                            <div className="mod-xp">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                <path d="M5 0L6.2 3.8H10L6.9 6.1L8.1 10L5 7.6L1.9 10L3.1 6.1L0 3.8H3.8L5 0Z"/>
                              </svg>
                              {mod.xp_reward ?? 100} XP
                            </div>
                            <div className="mod-prog-track">
                              <div
                                className={`mod-prog-bar ${isDone ? 'green' : ''}`}
                                style={{ width: isDone ? '100%' : '0%' }}
                              />
                            </div>
                            {isDone ? (
                              <div className="done-badge">
                                <svg className="done-check-svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
                                  <path
                                    className="done-check-path"
                                    d="M2 7l3 3 6-6"
                                    stroke="#16a34a"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                {tModules('completed')}
                              </div>
                            ) : isLocked ? (
                              <div className="lock-badge">
                                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                  <rect x="2" y="6" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                                  <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                                </svg>
                                {tModules('locked')}
                              </div>
                            ) : (
                              <m.button
                                className="btn-start"
                                onClick={e => { e.stopPropagation(); router.push(`/dashboard/modules/${mod.id}`) }}
                                whileHover={pref ? undefined : { scale: 1.02 }}
                                whileTap={pref ? undefined : { scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                              >
                                {t('modulesAvailable.startBtn')}
                              </m.button>
                            )}
                          </m.div>
                        )
                      })}
                  </m.div>
                )}
              </>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              ZONA 3C — Mi progreso completo (colapsable)
          ══════════════════════════════════════════════════════════════ */}
          <div>
            <m.button
              className="zone3c-toggle"
              onClick={toggleProgress}
              whileHover={pref ? undefined : { scale: 1.02 }}
              whileTap={pref ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              {t('zone3.toggleLabel')}
              <svg
                width="11" height="11" viewBox="0 0 18 18" fill="none"
                style={{ transform: progressOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)' }}
              >
                <path d="M4 6.5L9 11.5L14 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </m.button>

            <AnimatePresence>
              {progressOpen && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>

                    {/* KPI Bento */}
                    <m.div
                      className="kpi-bento"
                      initial={pref ? false : 'hidden'}
                      animate="visible"
                      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                    >
                      {([
                        { label: t('stats.xpTotal'),        val: loading ? null : (user?.total_xp ?? 0), color: 'var(--accent-amber,#D4821A)', border: 'var(--accent-amber,#D4821A)', isRank: false },
                        { label: t('kpiLabels.modules'),    val: loading ? null : completedCount,         color: 'var(--accent-teal,#0F7B6C)',  border: 'var(--accent-teal,#0F7B6C)',  isRank: false },
                        { label: t('kpiLabels.streakDays'), val: loading ? null : streak,                 color: 'var(--ink)',                  border: 'var(--line-strong)',            isRank: false },
                        { label: t('kpiLabels.schoolRanking'), val: loading ? null : (rankPos ?? 0),      color: 'var(--accent,#C0392B)',       border: 'var(--accent,#C0392B)',        isRank: true  },
                      ]).map(({ label, val, color, border, isRank }) => (
                        <m.div
                          key={label}
                          className="kpi-card"
                          style={{ borderLeft: `3px solid ${border}` }}
                          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } }}
                        >
                          {val === null
                            ? <><Sk w="50%" h={32} r={6} /><div style={{ marginTop: 9 }}><Sk w="70%" h={10} r={4} /></div></>
                            : <>
                                <div className="kpi-num" style={{ color }}>
                                  {isRank
                                    ? (val === 0 ? '—' : `#${val}`)
                                    : <AnimatedKPI value={val} />}
                                </div>
                                <div className="kpi-label">{label}</div>
                              </>
                          }
                        </m.div>
                      ))}
                    </m.div>

                    {/* Pillar pills */}
                    <div className="pillar-pills">
                      {PILLAR_ORDER.map(pillar => {
                        const modsInPillar = PILLAR_MODS[pillar]
                        const completedInPillar = loading ? 0 : modules.filter(m => modsInPillar.includes(m.order_index) && completedIds.has(m.id)).length
                        const pct = modsInPillar.length > 0 ? Math.round(completedInPillar / modsInPillar.length * 100) : 0
                        const isStrength = leaderProfile?.fortalezas.includes(pillar)
                        const isGrowth   = leaderProfile?.areas_crecimiento.includes(pillar)
                        const color = isStrength
                          ? 'var(--accent-teal,#0F7B6C)'
                          : isGrowth
                            ? '#C0392B'
                            : 'var(--mute)'
                        return (
                          <div key={pillar} className="pillar-pill">
                            {loading ? (
                              <><Sk w="60%" h={10} r={4} /><Sk w="100%" h={3} r={999} /></>
                            ) : (
                              <>
                                <div className="pillar-pill__header">
                                  <span className="pillar-pill__name" style={{ color }}>{pillar}</span>
                                  <span className="pillar-pill__pct" style={{ color }}>{pct}%</span>
                                </div>
                                <div className="pillar-pill__track">
                                  <div className="pillar-pill__bar" style={{ width: `${pct}%`, background: color }} />
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Charts bento */}
                    <div className="charts-row">
                      {/* XP Line Chart */}
                      <div className="card" style={{ padding: '22px 20px 16px' }}>
                        <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 16 }}>
                          {t('charts.xpProgress')}
                        </div>
                        {loading || weeklyXP.length === 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[80, 60, 100, 70].map((w, i) => <Sk key={i} w={`${w}%`} h={10} r={4} />)}
                          </div>
                        ) : (
                          <m.div
                            initial={pref ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 180, damping: 26 }}
                          >
                            <ResponsiveContainer width="100%" height={140}>
                              <LineChart data={weeklyXP} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
                                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--mute)', fontFamily: 'Satoshi,sans-serif' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--mute)' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (!active || !payload?.[0]) return null
                                    return (
                                      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow-raised)', fontFamily: '"Satoshi",sans-serif' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--accent-amber,#D4821A)' }}>{payload[0].value?.toLocaleString('es-CO')} XP</span>
                                      </div>
                                    )
                                  }}
                                />
                                <Line type="monotone" dataKey="xp" stroke="var(--accent-amber,#D4821A)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-amber,#D4821A)', strokeWidth: 0 }} activeDot={{ r: 5, fill: 'var(--accent-amber,#D4821A)' }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </m.div>
                        )}
                      </div>

                      {/* Leadership RadialBarChart */}
                      <div className="card" style={{ padding: '22px 20px 16px' }}>
                        <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 16 }}>
                          {t('charts.leadershipPath')}
                        </div>
                        {loading ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}><Sk w={120} h={120} r={999} /></div>
                        ) : (() => {
                          const pillars = [
                            { name: t('charts.pillarVision'),    fill: '#C0392B', value: visionPct },
                            { name: t('charts.pillarModules'),   fill: '#D4821A', value: totalModules > 0 ? Math.round(completedCount / totalModules * 100) : 0 },
                            { name: t('charts.pillarImpact'),    fill: '#0F7B6C', value: diploma ? 100 : 0 },
                            { name: t('charts.pillarCommunity'), fill: '#8C7B6E', value: 0 },
                            { name: t('charts.pillarProjects'),  fill: '#6B6B6B', value: 0 },
                          ]
                          const hasProgress = pillars.some(p => p.value > 0)

                          if (!hasProgress) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 10, padding: '0 12px' }}>
                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.3 }}>
                                  <circle cx="16" cy="16" r="13" stroke="var(--mute)" strokeWidth="2"/>
                                  <circle cx="16" cy="16" r="8" stroke="var(--mute)" strokeWidth="1.5" strokeDasharray="4 3"/>
                                  <circle cx="16" cy="16" r="2.5" fill="var(--mute)"/>
                                </svg>
                                <div style={{ fontSize: 12.5, color: 'var(--mute)', textAlign: 'center', lineHeight: 1.5, fontFamily: '"Satoshi",sans-serif' }}>
                                  {t('charts.emptyState')}
                                </div>
                              </div>
                            )
                          }

                          return (
                            <m.div
                              initial={pref ? false : { opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: 'spring', stiffness: 180, damping: 26, delay: 0.1 }}
                            >
                              <ResponsiveContainer width="100%" height={140}>
                                <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={68} data={pillars} startAngle={90} endAngle={-270}>
                                  <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'var(--line)' }} />
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (!active || !payload?.[0]) return null
                                      const d = payload[0].payload
                                      return (
                                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow-raised)', fontFamily: '"Satoshi",sans-serif' }}>
                                          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{d.name}: </span>
                                          <span style={{ color: d.fill }}>{d.value}%</span>
                                        </div>
                                      )
                                    }}
                                  />
                                </RadialBarChart>
                              </ResponsiveContainer>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 4 }}>
                                {pillars.map(p => (
                                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
                                    <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: '"Satoshi",sans-serif' }}>{p.name} {p.value}%</span>
                                  </div>
                                ))}
                              </div>
                            </m.div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Link al programa completo — único resto útil de la antigua Leadership Progress Card */}
                    <m.button
                      className="btn-ghost"
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() => router.push('/dashboard/leadership-path')}
                      whileHover={pref ? undefined : { scale: 1.02 }}
                      whileTap={pref ? undefined : { scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    >{t('leadershipProgress.viewFullProgram')}</m.button>

                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

        </m.main>

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        userId={userId}
      />
    </>
  )
}

// ── Compact pentagon SVG for identity card ────────────────────────────────────
// Layout: Yo=top, Norte=top-right, Acción=bottom-right, Legado=bottom-left, Vínculo=top-left
const PENT = [
  { key: 'Yo',      angle: -90,  getDim: (b: LeaderProfile['big_five']) => b.C  },
  { key: 'Norte',   angle: -18,  getDim: (b: LeaderProfile['big_five']) => b.O  },
  { key: 'Acción',  angle:  54,  getDim: (b: LeaderProfile['big_five']) => b.E  },
  { key: 'Legado',  angle:  126, getDim: (b: LeaderProfile['big_five']) => b.ES },
  { key: 'Vínculo', angle:  198, getDim: (b: LeaderProfile['big_five']) => b.A  },
]

function CompactPentagon({ profile, size = 160 }: { profile: LeaderProfile; size?: number }) {
  const CX = 100, CY = 100, R = 62
  const toRad = (d: number) => (d * Math.PI) / 180
  const pt = (angle: number, r: number) => ({
    x: CX + r * Math.cos(toRad(angle)),
    y: CY + r * Math.sin(toRad(angle)),
  })

  const refPoints = PENT.map(p => { const v = pt(p.angle, R); return `${v.x},${v.y}` }).join(' ')
  const profPoints = PENT.map(p => {
    const score = p.getDim(profile.big_five)
    const v = pt(p.angle, (score / 100) * R)
    return `${v.x},${v.y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
      {/* Grid lines */}
      {PENT.map(p => {
        const v = pt(p.angle, R)
        return <line key={p.key} x1={CX} y1={CY} x2={v.x} y2={v.y} stroke="var(--line)" strokeWidth={0.8} />
      })}
      {/* 50% ring */}
      <polygon
        points={PENT.map(p => { const v = pt(p.angle, R * 0.5); return `${v.x},${v.y}` }).join(' ')}
        fill="none" stroke="var(--line)" strokeWidth={0.8} strokeDasharray="2 3"
      />
      {/* Reference polygon */}
      <polygon points={refPoints} fill="none" stroke="var(--bg-2)" strokeWidth={1} />
      {/* Profile polygon */}
      <polygon points={profPoints} fill="rgba(192,57,43,0.10)" stroke="#C0392B" strokeWidth={1.5} />
      {/* Vertex dots */}
      {PENT.map(p => {
        const score = p.getDim(profile.big_five)
        const v = pt(p.angle, (score / 100) * R)
        const isStrength = profile.fortalezas.includes(p.key)
        const isGrowth   = profile.areas_crecimiento.includes(p.key)
        return (
          <circle
            key={p.key} cx={v.x} cy={v.y} r={4}
            fill={isStrength ? 'var(--accent-teal,#0F7B6C)' : isGrowth ? '#C0392B' : 'var(--bg-2)'}
          />
        )
      })}
      {/* Labels */}
      {PENT.map(p => {
        const lv = pt(p.angle, R + 22)
        return (
          <text
            key={p.key} x={lv.x} y={lv.y}
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: 'Satoshi,sans-serif', fontSize: 10, fill: 'var(--mute)', letterSpacing: '0.04em' }}
          >
            {p.key}
          </text>
        )
      })}
    </svg>
  )
}
