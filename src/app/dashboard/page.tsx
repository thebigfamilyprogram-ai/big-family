'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { m, useReducedMotion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
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
  full_name:    string
  total_xp:     number
  role:         string | null
  school_level: string | null
}

interface DiplomaInfo {
  projectId: string
  resultado: string
}

interface WeeklyXP {
  week: string
  xp: number
}

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
  const [userId,       setUserId]       = useState('')
  const [weeklyXP,     setWeeklyXP]     = useState<WeeklyXP[]>([])
  const [streak,       setStreak]       = useState(0)
  const [rankPos,      setRankPos]      = useState<number | null>(null)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    if (!supabase) return
    setLoading(true)
    async function load() {
      setLoadError(false)
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !authUser) {
        if (!authUser) { router.replace('/login'); return }
        setLoadError(true); setLoading(false); return
      }
      setUserId(authUser.id)

      const [profileRes, xpRes, modsRes, progRes, projRes] = await Promise.all([
        supabase.from('profiles').select('full_name, role, school_level, school_id').eq('id', authUser.id).maybeSingle(),
        supabase.from('xp_log').select('amount').eq('user_id', authUser.id),
        supabase.from('modules').select('*').eq('status', 'published').order('order_index'),
        supabase.from('progress').select('module_id, completed').eq('user_id', authUser.id),
        supabase.from('projects').select('id, status').eq('user_id', authUser.id).in('status', ['approved']),
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
        full_name:    profile?.full_name ?? 'Líder Big Family',
        total_xp,
        role:         profile?.role ?? null,
        school_level: profile?.school_level ?? null,
      })
      setModules(mods ?? [])
      setProgressRows(prog ?? [])
      setLoading(false)
    }
    load()
  }, [retryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayName    = user?.full_name ?? 'Líder Big Family'
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
  // TEMP LAUNCH: capstone unlocked for all students regardless of module completion
  const capstoneLocked = false
  const nextModule = sortedModules.find(m => !completedIds.has(m.id) && !lockedIds.has(m.id)) ?? null

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
          <div className="load-error__title">No se pudieron cargar los datos</div>
          <div className="load-error__sub">Verifica tu conexión e intenta de nuevo.</div>
          <button className="load-error__btn" onClick={() => { setLoadError(false); setRetryKey(k => k + 1) }}>
            Reintentar
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

        /* ── User header ── */
        .user-header{display:flex;align-items:center;gap:18px;}
        .user-avatar-wrap{position:relative;flex-shrink:0;}
        .user-avatar{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#C0392B 0%,#8B1A1A 100%);color:#fff;font-family:"Satoshi",sans-serif;font-weight:900;font-size:22px;display:flex;align-items:center;justify-content:center;border:3px solid var(--card-bg);box-shadow:0 4px 16px -4px rgba(192,57,43,.35);}
        .online-badge{position:absolute;bottom:2px;right:2px;background:#22c55e;border:2px solid var(--card-bg);border-radius:999px;padding:2px 6px;font-size:9px;font-weight:700;color:#fff;letter-spacing:.08em;line-height:1;}
        .user-info{flex:1;min-width:0;}
        .user-name{font-family:"Satoshi",sans-serif;font-weight:900;font-size:22px;letter-spacing:-0.02em;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .user-sub{font-size:13px;color:var(--mute);margin-top:3px;}
        .user-sub strong{color:#C0392B;font-weight:700;}
        .user-stats{display:flex;gap:20px;flex-shrink:0;}
        .ustat{text-align:center;}
        .ustat__num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:20px;color:var(--ink);}
        .ustat__label{font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute);margin-top:2px;}

        /* ── Cards ── */
        .card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;box-shadow:0 2px 16px -6px rgba(13,13,13,.08);}

        /* ── Progress card ── */
        .prog-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
        .prog-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:18px;color:var(--ink);}
        .prog-badge{padding:4px 12px;background:rgba(192,57,43,.08);color:#C0392B;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;}
        .prog-row{margin-bottom:16px;}
        .prog-row:last-of-type{margin-bottom:0;}
        .prog-label{display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-2);font-weight:500;margin-bottom:7px;}
        .prog-label span:last-child{color:#C0392B;font-weight:700;}
        .prog-track{height:8px;background:var(--line);border-radius:999px;overflow:hidden;}
        .prog-bar{height:100%;background:#C0392B;border-radius:999px;transition:width .6s cubic-bezier(.4,0,.2,1);}
        .prog-hint{font-size:11px;color:var(--mute);margin-top:5px;}
        .prog-actions{display:flex;gap:10px;margin-top:22px;}
        .btn-ghost{padding:10px 18px;background:none;border:1px solid var(--line);border-radius:10px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer;transition:border-color .2s cubic-bezier(0.22,1,0.36,1),background .2s cubic-bezier(0.22,1,0.36,1);font-family:"Satoshi",sans-serif;}
        .btn-ghost:hover{border-color:var(--ink);}
        .btn-ghost:active{transform:scale(0.98);}
        .btn-solid{padding:10px 18px;background:#C0392B;border:none;border-radius:10px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;transition:background .2s cubic-bezier(0.22,1,0.36,1);font-family:"Satoshi",sans-serif;}
        .btn-solid:hover{background:#a93226;}
        .btn-solid:active{transform:scale(0.98);}

        /* ── Motivational block ── */
        .motiv{display:flex;flex-direction:column;align-items:center;text-align:center;padding:20px 12px 4px;gap:8px;}
        .motiv-icon{width:44px;height:44px;background:rgba(192,57,43,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
        .motiv-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:var(--ink);}
        .motiv-sub{font-size:12.5px;color:var(--mute);line-height:1.5;max-width:280px;}
        .motiv-btn{margin-top:4px;padding:10px 22px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s;}
        .motiv-btn:hover{background:#a93226;}

        /* ── Modules section ── */
        .mods-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
        .mods-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:18px;color:var(--ink);}
        .mods-count{padding:3px 10px;background:var(--line);color:var(--mute);border-radius:999px;font-size:11px;font-weight:600;}

        /* ── Next module — featured card ── */
        .mod-next{background:var(--card-bg);border:1px solid var(--card-border);border-left:3px solid var(--accent,#C0392B);border-radius:14px;padding:24px 28px;box-shadow:var(--shadow-raised);display:flex;gap:28px;align-items:flex-start;margin-bottom:16px;cursor:pointer;transition:box-shadow .25s cubic-bezier(0.22,1,0.36,1),transform .25s cubic-bezier(0.22,1,0.36,1);}
        .mod-next:hover{box-shadow:0 8px 32px -8px rgba(13,13,13,.16);transform:translateY(-1px);}
        .mod-next:active{transform:scale(0.99);}
        .mod-next__icon{width:52px;height:52px;border-radius:12px;background:rgba(192,57,43,.08);border:1px solid rgba(192,57,43,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .mod-next__body{flex:1;min-width:0;}
        .mod-next__eyebrow{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#C0392B);margin-bottom:8px;display:flex;align-items:center;gap:6px;}
        .mod-next__title{font-family:"Satoshi",sans-serif;font-weight:600;font-size:18px;color:var(--ink);line-height:1.3;margin-bottom:10px;}
        .mod-next__desc{font-size:13.5px;color:var(--mute);line-height:1.6;margin-bottom:16px;}
        .mod-next__footer{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
        .mod-next__xp{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(192,57,43,.08);color:#C0392B;border-radius:999px;font-size:11px;font-weight:700;}
        .mod-next__cta{padding:10px 22px;background:#C0392B;border:none;border-radius:9px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s cubic-bezier(0.22,1,0.36,1);white-space:nowrap;}
        .mod-next__cta:hover{background:#a93226;}
        .mod-next__cta:active{transform:scale(0.98);}

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

        /* ── Side-by-side cards row ── */
        .cards-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}

        /* ── Certification card ── */
        .cert-eyebrow{font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#C0392B;font-weight:700;font-family:"Satoshi",sans-serif;margin-bottom:10px;}
        .cert-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:var(--ink);margin-bottom:18px;}
        .cert-prog-label{display:flex;justify-content:space-between;font-size:12px;color:var(--mute);margin-bottom:7px;}
        .cert-prog-label span:last-child{color:#C0392B;font-weight:700;}
        .cert-text{font-size:14px;color:var(--mute);line-height:1.55;margin-bottom:20px;margin-top:12px;}
        .btn-upload{width:100%;padding:12px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s cubic-bezier(0.22,1,0.36,1);}
        .btn-upload:hover{background:#a93226;}
        .btn-upload:active{transform:scale(0.98);}

        /* ── Next module card ── */
        .next-eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);font-weight:600;font-family:"Satoshi",sans-serif;margin-bottom:12px;}
        .next-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:18px;color:var(--ink);margin-bottom:12px;line-height:1.3;}
        .next-xp{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(192,57,43,.1);color:#C0392B;border-radius:999px;font-size:11px;font-weight:700;margin-bottom:20px;}
        .btn-continue{width:100%;padding:12px;background:var(--ink);border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:var(--bg);cursor:pointer;transition:background .2s cubic-bezier(0.22,1,0.36,1);}
        .btn-continue:hover{background:#C0392B;}
        .btn-continue:active{transform:scale(0.98);}

        /* ── Coordinator button ── */
        .btn-coordinator{padding:8px 16px;background:transparent;border:1px solid var(--line);border-radius:999px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer;transition:border-color .2s,color .2s;white-space:nowrap;flex-shrink:0;}
        .btn-coordinator:hover{border-color:#C0392B;color:#C0392B;}

        @media(max-width:1200px){.mods-grid{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:860px){
          .cards-row{grid-template-columns:1fr;}
          .mods-grid{grid-template-columns:1fr;}
        }
      `}</style>

      <m.main
          className="content"
          initial={pref ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >

          {/* Announcement banner — most recent unread */}
          {annBanner && !annBannerDismissed && (
            <div className="ann-banner">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ann-banner__cat">{annBanner.category}</div>
                <div className="ann-banner__title">{annBanner.title}</div>
                <div className="ann-banner__body">{annBanner.content}</div>
              </div>
              <button className="ann-banner__dismiss" onClick={dismissBanner} aria-label="Cerrar anuncio">×</button>
            </div>
          )}

          {/* Onboarding banner — only for new users */}
          {isNewUser && (
            <div className="onboard">
              <div className="onboard-label">Paso 1 de 3 — Completa tu perfil</div>
              <div className="onboard-steps">
                <div className="ob-step">
                  <div className="ob-dot done">✓</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>Registro</span>
                </div>
                <div className="ob-sep" />
                <div className="ob-step">
                  <div className="ob-dot next">2</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0D0D0D' }}>Primer módulo</span>
                </div>
                <div className="ob-sep" />
                <div className="ob-step">
                  <div className="ob-dot idle">3</div>
                  <span style={{ fontSize: 13, color: '#9a9690' }}>Primer IC</span>
                </div>
              </div>
            </div>
          )}

          {/* User header */}
          <div className="user-header">
            <div className="user-avatar-wrap">
              <div className="user-avatar">
                {loading ? 'L' : initials}
              </div>
              <span className="online-badge">ONLINE</span>
            </div>

            <div className="user-info">
              {loading
                ? <><Sk w="60%" h={22} r={6} /><div style={{ marginTop: 8 }}><Sk w="80%" h={13} r={5} /></div></>
                : <>
                    <div className="user-name">{displayName}</div>
                    {(() => {
                      const lv = LEVEL_MAP[user?.school_level ?? 'senior'] ?? LEVEL_MAP['senior']
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 999, background: lv.bg, color: lv.color, fontSize: 12, fontWeight: 700, fontFamily: '"Satoshi",sans-serif', whiteSpace: 'nowrap' }}>
                            {lv.label}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--mute)' }}>· {lv.sub}</span>
                        </div>
                      )
                    })()}
                  </>
              }
            </div>

            {user?.role === 'coordinator' && (
              <button className="btn-coordinator" onClick={() => router.push('/coordinator')}>
                Panel Coordinador
              </button>
            )}
            {user?.role === 'expositor' && (
              <button className="btn-coordinator" onClick={() => router.push('/expositor')}>
                Ir al panel de expositor
              </button>
            )}

            <div className="user-stats">
              <div className="ustat">
                <div className="ustat__num">{loading ? '…' : (user?.total_xp ?? 0).toLocaleString()}</div>
                <div className="ustat__label">XP Total</div>
              </div>
              <div style={{ width: 1, background: 'var(--line)', margin: '4px 0' }} />
              <div className="ustat">
                <div className="ustat__num">{loading ? '…' : completedCount}</div>
                <div className="ustat__label">Módulos</div>
              </div>
            </div>
            <button
              className="bell-btn"
              onClick={() => router.push('/dashboard/announcements')}
              title={`${unreadAnnCount} anuncios sin leer`}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2A5 5 0 0 0 5 7v3l-1.5 2.5h13L15 10V7A5 5 0 0 0 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M8 15a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {unreadAnnCount > 0 && <span className="bell-badge" />}
            </button>
          </div>

          {/* ── KPI Bento ── */}
          <m.div
            className="kpi-bento"
            initial={pref ? false : 'hidden'}
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          >
            {([
              { label: 'XP Total',        val: loading ? null : (user?.total_xp ?? 0), color: 'var(--accent-amber,#D4821A)', border: 'var(--accent-amber,#D4821A)', isRank: false },
              { label: 'Módulos',         val: loading ? null : completedCount,         color: 'var(--accent-teal,#0F7B6C)',  border: 'var(--accent-teal,#0F7B6C)',  isRank: false },
              { label: 'Racha de días',   val: loading ? null : streak,                 color: 'var(--ink)',                  border: 'var(--line-strong)',            isRank: false },
              { label: 'Ranking colegio', val: loading ? null : (rankPos ?? 0),         color: 'var(--accent,#C0392B)',       border: 'var(--accent,#C0392B)',        isRank: true  },
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

          {/* ── Charts bento ── */}
          <div className="charts-row">
            {/* XP Line Chart */}
            <div className="card" style={{ padding: '22px 20px 16px' }}>
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 16 }}>
                Progreso XP — últimas 4 semanas
              </div>
              {loading || weeklyXP.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[80, 60, 100, 70].map((w, i) => <Sk key={i} w={`${w}%`} h={10} r={4} />)}
                </div>
              ) : (
                <m.div
                  initial={pref ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
                Leadership Path — avance general
              </div>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}><Sk w={120} h={120} r={999} /></div>
              ) : (() => {
                const pillars = [
                  { name: 'Visión',    fill: '#C0392B', value: visionPct },
                  { name: 'Módulos',   fill: '#D4821A', value: totalModules > 0 ? Math.round(completedCount / totalModules * 100) : 0 },
                  { name: 'Impacto',   fill: '#0F7B6C', value: diploma ? 100 : 0 },
                  { name: 'Comunidad', fill: '#8C7B6E', value: 0 },
                  { name: 'Proyectos', fill: '#6B6B6B', value: 0 },
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
                        Completa tu primer módulo para ver tu avance
                      </div>
                    </div>
                  )
                }

                return (
                  <m.div
                    initial={pref ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
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

          {/* Leadership Progress */}
          <div className="card">
            <div className="prog-header">
              <span className="prog-title">Leadership Progress</span>
              <span className="prog-badge">Phase 02: Deployment</span>
            </div>

            {/* Strategic Vision = overall module completion */}
            <div className="prog-row">
              <div className="prog-label">
                <span>Strategic Vision</span>
                <span>{loading ? '…' : `${visionPct}%`}</span>
              </div>
              <div className="prog-track">
                <m.div
                  className="prog-bar"
                  initial={{ width: '0%' }}
                  whileInView={{ width: loading ? '0%' : `${visionPct}%` }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.3 }}
                />
              </div>
              {!loading && visionPct === 0 && (
                <div className="prog-hint">Completa tu primer módulo para comenzar</div>
              )}
            </div>

            {/* Community Engagement */}
            <div className="prog-row" style={{ marginTop: 16 }}>
              <div className="prog-label">
                <span>Community Engagement</span>
                <span>{loading ? '…' : '0%'}</span>
              </div>
              <div className="prog-track">
                <m.div
                  className="prog-bar"
                  initial={{ width: '0%' }}
                  whileInView={{ width: '0%' }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20 }}
                />
              </div>
              {!loading && (
                <div className="prog-hint">Completa tu primer módulo para comenzar</div>
              )}
            </div>

            {/* Modules completed — motivational if zero */}
            {!loading && completedCount === 0
              ? (
                <div className="motiv">
                  <div className="motiv-icon">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M11 2C11 2 7 6 7 11a4 4 0 0 0 8 0c0-5-4-9-4-9Z" fill="#C0392B" opacity=".9"/>
                      <path d="M11 14v4M9 18h4" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M7.5 9.5L5 12M14.5 9.5L17 12" stroke="#C0392B" strokeWidth="1.4" strokeLinecap="round" opacity=".5"/>
                    </svg>
                  </div>
                  <div className="motiv-title">¡Bienvenido a Big Family!</div>
                  <div className="motiv-sub">Completa tu primer módulo y comienza a ganar Impact Credits</div>
                  <button className="motiv-btn" onClick={() => router.push('/dashboard/leadership-path')}>Comenzar ahora →</button>
                </div>
              )
              : loading
                ? <div style={{ marginTop: 16 }}><Sk w="100%" h={36} r={10} /></div>
                : (
                  <div className="prog-row" style={{ marginTop: 16 }}>
                    <div className="prog-label">
                      <span>Modules Completed</span>
                      <span>{completedCount} / {totalModules}</span>
                    </div>
                    <div className="prog-track">
                      <m.div
                        className="prog-bar"
                        initial={{ width: '0%' }}
                        whileInView={{ width: `${visionPct}%` }}
                        viewport={{ once: true }}
                        transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.3 }}
                      />
                    </div>
                  </div>
                )
            }

            <div className="prog-actions">
              <m.button
                className="btn-ghost"
                onClick={() => router.push('/dashboard/leadership-path')}
                whileHover={pref ? undefined : { scale: 1.02 }}
                whileTap={pref ? undefined : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              >Ver programa completo</m.button>
              {nextModule && (
                <m.button
                  className="btn-solid"
                  onClick={() => router.push('/dashboard/leadership-path')}
                  whileHover={pref ? undefined : { scale: 1.02 }}
                  whileTap={pref ? undefined : { scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                >Siguiente módulo →</m.button>
              )}
            </div>
          </div>

          {/* Capstone unlocked banner */}
          {!loading && allModulesDone && (
            <div className="capstone-banner">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2l2.4 5.1 5.6.8-4 3.9.9 5.6L10 14.8l-4.9 2.6.9-5.6L2 7.9l5.6-.8L10 2Z" fill="#16a34a"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 15, color: '#15803d' }}>¡Capstone desbloqueado!</div>
                <div style={{ fontSize: 12.5, color: '#166534', marginTop: 2 }}>Completaste los {totalModules} módulos. Ya puedes subir tu proyecto Capstone.</div>
              </div>
              <m.button
                style={{ marginLeft: 'auto', padding: '9px 18px', background: '#16a34a', border: 'none', borderRadius: 10, fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => router.push('/dashboard/projects/new')}
                whileHover={pref ? undefined : { scale: 1.02 }}
                whileTap={pref ? undefined : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              >
                Comenzar Capstone →
              </m.button>
            </div>
          )}

          {/* Certification + Next Step + Quote row */}
          <div className="cards-row">
            {/* Card 1 — Capstone / Certificación */}
            <div className="card">
              <div className="cert-eyebrow">The Big Leader</div>
              <div className="cert-title">Capstone</div>
              {capstoneLocked ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'var(--line)', borderRadius: 10, margin: '12px 0 16px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="7" width="10" height="8" rx="2" stroke="var(--mute)" strokeWidth="1.4"/>
                      <path d="M5 7V5a3 3 0 1 1 6 0v2" stroke="var(--mute)" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 1.4 }}>
                      Completa los {totalModules || 7} módulos para desbloquear el Capstone
                    </span>
                  </div>
                  <div className="prog-track" style={{ marginBottom: 16 }}>
                    <div className="prog-bar" style={{ width: `${visionPct}%` }} />
                  </div>
                  <button className="btn-upload" disabled>
                    Subir proyecto
                  </button>
                </>
              ) : (
                <>
                  <div className="cert-prog-label">
                    <span>Proyectos aprobados</span>
                    <span>0 / 3</span>
                  </div>
                  <div className="prog-track">
                    <div className="prog-bar" style={{ width: '0%' }} />
                  </div>
                  <div className="cert-text">
                    0 de 3 proyectos aprobados para obtener la certificación.
                  </div>
                  {diploma ? (
                    <m.button
                      className="btn-upload"
                      onClick={() => router.push(`/certificacion/${diploma.projectId}`)}
                      whileHover={pref ? undefined : { scale: 1.02 }}
                      whileTap={pref ? undefined : { scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                      style={{ background: '#16a34a' }}
                    >
                      🎓 Ver mi diploma →
                    </m.button>
                  ) : (
                    <m.button
                      className="btn-upload"
                      onClick={() => router.push('/dashboard/projects/new')}
                      whileHover={pref ? undefined : { scale: 1.02 }}
                      whileTap={pref ? undefined : { scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    >
                      Subir proyecto
                    </m.button>
                  )}
                </>
              )}
            </div>

            {/* Right column: Siguiente Paso + Quote stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Card 2 — Próximo módulo */}
              <div className="card">
                <div className="next-eyebrow">Siguiente Paso</div>
                {loading ? (
                  <>
                    <Sk w="85%" h={18} r={6} />
                    <div style={{ marginTop: 10 }}><Sk w="60px" h={22} r={999} /></div>
                    <div style={{ marginTop: 20 }}><Sk w="100%" h={40} r={10} /></div>
                  </>
                ) : nextModule ? (
                  <>
                    <div className="next-title">{nextModule.title}</div>
                    <div className="next-xp">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M5 0L6.2 3.8H10L6.9 6.1L8.1 10L5 7.6L1.9 10L3.1 6.1L0 3.8H3.8L5 0Z"/>
                      </svg>
                      {nextModule.xp_reward ?? 100} XP
                    </div>
                    <m.button
                      className="btn-continue"
                      onClick={() => router.push('/dashboard/leadership-path')}
                      whileHover={pref ? undefined : { scale: 1.02 }}
                      whileTap={pref ? undefined : { scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    >
                      Continuar →
                    </m.button>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--mute)', textAlign: 'center', padding: '20px 0', lineHeight: 1.6 }}>
                    ¡Completaste todos los módulos! 🎉
                  </div>
                )}
              </div>

              {/* Card 3 — Frase motivacional del día */}
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
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: 8 }}>{q.category} · Frase del día</div>
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

          {/* Modules Available */}
          <div>
            <div className="mods-header">
              <span className="mods-title">Módulos Disponibles</span>
              {!loading && (
                <span className="mods-count">{totalModules} módulo{totalModules !== 1 ? 's' : ''}</span>
              )}
            </div>

            {loading ? (
              <>
                {/* Next module skeleton */}
                <div className="mod-next" style={{ cursor: 'default', marginBottom: 16 }}>
                  <Sk w={52} h={52} r={12} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Sk w="30%" h={10} r={4} />
                    <Sk w="65%" h={18} r={6} />
                    <Sk w="100%" h={13} r={5} />
                    <Sk w="100%" h={13} r={5} />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Sk w={60} h={22} r={999} />
                      <Sk w={120} h={36} r={9} />
                    </div>
                  </div>
                </div>
                {/* Grid skeletons */}
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
                No hay módulos disponibles aún. ¡Vuelve pronto!
              </div>
            ) : (
              <>
                {/* ── Featured: next module ── */}
                {nextModule && (
                  <m.div
                    className="mod-next"
                    initial={pref ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                    onClick={() => router.push(`/dashboard/modules/${nextModule.id}`)}
                  >
                    <div className="mod-next__icon" aria-hidden="true">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M5 3l14 9-14 9V3Z" fill="var(--accent,#C0392B)"/>
                      </svg>
                    </div>
                    <div className="mod-next__body">
                      <div className="mod-next__eyebrow">
                        <span>Siguiente módulo</span>
                        <span style={{ opacity: .45 }}>·</span>
                        <span style={{ color: 'var(--mute)', fontWeight: 500 }}>
                          {String(nextModule.order_index).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="mod-next__title">{nextModule.title}</div>
                      <div className="mod-next__desc">{nextModule.description}</div>
                      <div className="mod-next__footer">
                        <span className="mod-next__xp">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                            <path d="M5 0L6.2 3.8H10L6.9 6.1L8.1 10L5 7.6L1.9 10L3.1 6.1L0 3.8H3.8L5 0Z"/>
                          </svg>
                          {nextModule.xp_reward ?? 100} XP
                        </span>
                        <m.button
                          className="mod-next__cta"
                          onClick={e => { e.stopPropagation(); router.push(`/dashboard/modules/${nextModule.id}`) }}
                          whileHover={pref ? undefined : { scale: 1.02 }}
                          whileTap={pref ? undefined : { scale: 0.97 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                        >
                          Comenzar ahora →
                        </m.button>
                      </div>
                    </div>
                  </m.div>
                )}

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
                            <div className="mod-num" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {String(mod.order_index).padStart(2, '0')}
                              {isLocked && (
                                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" style={{ opacity: .4 }}>
                                  <rect x="2" y="6" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                                  <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                                </svg>
                              )}
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
                                Completado
                              </div>
                            ) : isLocked ? (
                              <div className="lock-badge">
                                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                  <rect x="2" y="6" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                                  <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                                </svg>
                                Bloqueado
                              </div>
                            ) : (
                              <m.button
                                className="btn-start"
                                onClick={e => { e.stopPropagation(); router.push(`/dashboard/modules/${mod.id}`) }}
                                whileHover={pref ? undefined : { scale: 1.02 }}
                                whileTap={pref ? undefined : { scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                              >
                                Empezar
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

        </m.main>
    </>
  )
}
