'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DashboardSidebar from '@/components/DashboardSidebar'
import { motion, useReducedMotion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'

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
  'Perseverancia':'#7c3e9e',
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
      background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)',
      backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite', flexShrink: 0,
    }} />
  )
}

export default function DashboardPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pref        = useReducedMotion()

  const [loading,      setLoading]      = useState(true)
  const [user,         setUser]         = useState<UserData | null>(null)
  const [modules,      setModules]      = useState<Module[]>([])
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([])

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.replace('/login'); return }

      const [{ data: profile }, { data: xpRows }, { data: mods }, { data: prog }] = await Promise.all([
        supabase.from('profiles').select('full_name, role, school_level').eq('id', authUser.id).maybeSingle(),
        supabase.from('xp_log').select('amount').eq('user_id', authUser.id),
        supabase.from('modules').select('*').eq('status', 'published').order('order_index'),
        supabase.from('progress').select('module_id, completed').eq('user_id', authUser.id),
      ])

      const total_xp = xpRows?.reduce((s, r) => s + r.amount, 0) ?? 0

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
  }, [])

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
  const capstoneLocked = !allModulesDone
  const nextModule = sortedModules.find(m => !completedIds.has(m.id) && !lockedIds.has(m.id)) ?? null

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}

        /* ── Layout ── */
        .layout{display:grid;grid-template-columns:260px 1fr;min-height:100vh;max-width:1280px;margin:0 auto;}

        /* ── Center content ── */
        .content{padding:32px 28px;display:flex;flex-direction:column;gap:20px;min-width:0;}

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
        .prog-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);}
        .prog-badge{padding:4px 12px;background:rgba(192,57,43,.08);color:#C0392B;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;}
        .prog-row{margin-bottom:16px;}
        .prog-row:last-of-type{margin-bottom:0;}
        .prog-label{display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-2);font-weight:500;margin-bottom:7px;}
        .prog-label span:last-child{color:#C0392B;font-weight:700;}
        .prog-track{height:8px;background:var(--line);border-radius:999px;overflow:hidden;}
        .prog-bar{height:100%;background:#C0392B;border-radius:999px;transition:width .6s cubic-bezier(.4,0,.2,1);}
        .prog-hint{font-size:11px;color:var(--mute);margin-top:5px;}
        .prog-actions{display:flex;gap:10px;margin-top:22px;}
        .btn-ghost{padding:10px 18px;background:none;border:1px solid var(--line);border-radius:10px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer;transition:all .2s;font-family:"Inter",sans-serif;}
        .btn-ghost:hover{border-color:var(--ink);}
        .btn-solid{padding:10px 18px;background:#C0392B;border:none;border-radius:10px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;transition:background .2s;font-family:"Satoshi",sans-serif;}
        .btn-solid:hover{background:#a93226;}

        /* ── Motivational block ── */
        .motiv{display:flex;flex-direction:column;align-items:center;text-align:center;padding:20px 12px 4px;gap:8px;}
        .motiv-icon{width:44px;height:44px;background:rgba(192,57,43,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
        .motiv-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:var(--ink);}
        .motiv-sub{font-size:12.5px;color:var(--mute);line-height:1.5;max-width:280px;}
        .motiv-btn{margin-top:4px;padding:10px 22px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s;}
        .motiv-btn:hover{background:#a93226;}

        /* ── Modules section ── */
        .mods-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
        .mods-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);}
        .mods-count{padding:3px 10px;background:var(--line);color:var(--mute);border-radius:999px;font-size:11px;font-weight:600;}
        .mods-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
        .mod-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:20px;box-shadow:0 2px 12px -6px rgba(13,13,13,.07);display:flex;flex-direction:column;gap:10px;transition:box-shadow .2s;}
        .mod-card:hover{box-shadow:0 6px 24px -8px rgba(13,13,13,.14);}
        .mod-card.done{background:var(--bg-2);}
        .mod-num{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#C0392B;}
        .mod-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);line-height:1.35;}
        .mod-desc{font-size:12px;color:var(--mute);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .mod-xp{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:rgba(192,57,43,.08);color:#C0392B;border-radius:999px;font-size:11px;font-weight:700;width:fit-content;}
        .mod-prog-track{height:5px;background:var(--line);border-radius:999px;overflow:hidden;}
        .mod-prog-bar{height:100%;background:#C0392B;border-radius:999px;transition:width .5s;}
        .mod-prog-bar.green{background:#22c55e;}
        .btn-start{padding:9px 14px;background:var(--ink);border:none;border-radius:9px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:12px;color:var(--bg);cursor:pointer;transition:background .2s;width:100%;margin-top:2px;}
        .btn-start:hover{background:#C0392B;}
        .done-badge{display:flex;align-items:center;justify-content:center;gap:5px;padding:9px;background:rgba(34,197,94,.1);border-radius:9px;font-size:12px;font-weight:700;color:#16a34a;margin-top:2px;}
        .lock-badge{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;background:var(--line);border-radius:9px;font-size:12px;font-weight:600;color:var(--mute);margin-top:2px;}
        .mod-card.locked{opacity:.5;cursor:default;}
        .mod-card.locked .btn-start{display:none;}
        .mods-empty{padding:32px 20px;text-align:center;color:var(--mute);font-size:13px;border:1px dashed var(--line);border-radius:14px;}
        .capstone-banner{display:flex;align-items:center;gap:14px;padding:18px 22px;background:linear-gradient(135deg,rgba(34,197,94,.08),rgba(34,197,94,.04));border:1px solid rgba(34,197,94,.25);border-radius:14px;}
        .btn-upload:disabled{opacity:.4;cursor:not-allowed;background:#9a9690 !important;}

        /* ── Side-by-side cards row ── */
        .cards-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}

        /* ── Certification card ── */
        .cert-eyebrow{font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#C0392B;font-weight:700;font-family:"Satoshi",sans-serif;margin-bottom:10px;}
        .cert-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:var(--ink);margin-bottom:18px;}
        .cert-prog-label{display:flex;justify-content:space-between;font-size:12px;color:var(--mute);margin-bottom:7px;}
        .cert-prog-label span:last-child{color:#C0392B;font-weight:700;}
        .cert-text{font-size:14px;color:var(--mute);line-height:1.55;margin-bottom:20px;margin-top:12px;}
        .btn-upload{width:100%;padding:12px;background:#C0392B;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:background .2s;}
        .btn-upload:hover{background:#a93226;}

        /* ── Next module card ── */
        .next-eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);font-weight:600;font-family:"Satoshi",sans-serif;margin-bottom:12px;}
        .next-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:18px;color:var(--ink);margin-bottom:12px;line-height:1.3;}
        .next-xp{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(192,57,43,.1);color:#C0392B;border-radius:999px;font-size:11px;font-weight:700;margin-bottom:20px;}
        .btn-continue{width:100%;padding:12px;background:var(--ink);border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;color:var(--bg);cursor:pointer;transition:background .2s;}
        .btn-continue:hover{background:#C0392B;}

        /* ── Coordinator button ── */
        .btn-coordinator{padding:8px 16px;background:transparent;border:1px solid var(--line);border-radius:999px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer;transition:border-color .2s,color .2s;white-space:nowrap;flex-shrink:0;}
        .btn-coordinator:hover{border-color:#C0392B;color:#C0392B;}

        @media(max-width:1100px){.layout{grid-template-columns:260px 1fr;}.mods-grid{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:860px){
          .layout{grid-template-columns:1fr;}
          .sidebar{position:relative;height:auto;flex-direction:row;flex-wrap:wrap;padding:16px;border-right:none;border-bottom:1px solid var(--line);}
          .sb-nav{flex-direction:row;flex:none;}
          .sb-divider{display:none;}
          .sb-user,.sb-links,.sb-btn-new{display:none;}
          .cards-row{grid-template-columns:1fr;}
          .mods-grid{grid-template-columns:1fr;}
        }
      `}</style>

      <div className="layout">

        {/* ── SIDEBAR ── */}
        <DashboardSidebar
          activePage="dashboard"
          userName={loading ? '…' : displayName}
          userInitial={loading ? 'L' : avatarLetter}
        />

        {/* ── CENTER CONTENT ── */}
        <motion.main
          className="content"
          initial={pref ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >

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
                <div className="ustat__num">42</div>
                <div className="ustat__label">Streak</div>
              </div>
              <div style={{ width: 1, background: 'var(--line)', margin: '4px 0' }} />
              <div className="ustat">
                <div className="ustat__num">2.4k</div>
                <div className="ustat__label">Network</div>
              </div>
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
                <div className="prog-bar" style={{ width: loading ? '0%' : `${visionPct}%` }} />
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
                <div className="prog-bar" style={{ width: '0%' }} />
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
                  <button className="motiv-btn">Comenzar ahora →</button>
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
                      <div className="prog-bar" style={{ width: `${visionPct}%` }} />
                    </div>
                  </div>
                )
            }

            <div className="prog-actions">
              <motion.button
                className="btn-ghost"
                whileHover={pref ? undefined : { scale: 1.02 }}
                whileTap={pref ? undefined : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              >View Syllabus</motion.button>
              <motion.button
                className="btn-solid"
                whileHover={pref ? undefined : { scale: 1.02 }}
                whileTap={pref ? undefined : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              >Next Lesson →</motion.button>
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
              <motion.button
                style={{ marginLeft: 'auto', padding: '9px 18px', background: '#16a34a', border: 'none', borderRadius: 10, fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => router.push('/dashboard/projects/new')}
                whileHover={pref ? undefined : { scale: 1.02 }}
                whileTap={pref ? undefined : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              >
                Comenzar Capstone →
              </motion.button>
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
                  <motion.button
                    className="btn-upload"
                    onClick={() => router.push('/dashboard/projects/new')}
                    whileHover={pref ? undefined : { scale: 1.02 }}
                    whileTap={pref ? undefined : { scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  >
                    Subir proyecto
                  </motion.button>
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
                    <motion.button
                      className="btn-continue"
                      onClick={() => router.push('/dashboard/leadership-path')}
                      whileHover={pref ? undefined : { scale: 1.02 }}
                      whileTap={pref ? undefined : { scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    >
                      Continuar →
                    </motion.button>
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
                    <span style={{ position: 'absolute', top: 4, left: 12, fontFamily: 'Georgia, serif', fontSize: 28, color: 'rgba(192,57,43,0.2)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>&ldquo;</span>
                    <div style={{ paddingLeft: 4 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: 8 }}>{q.category} · Frase del día</div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 14px 0', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.quote}</p>
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

            {loading
              ? (
                <div className="mods-grid">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="mod-card" style={{ gap: 12 }}>
                      <Sk w="40%" h={10} r={5} />
                      <Sk w="70%" h={16} r={6} />
                      <Sk w="100%" h={11} r={5} />
                      <Sk w="100%" h={11} r={5} />
                      <Sk w="60px" h={22} r={999} />
                      <Sk w="100%" h={5} r={999} />
                      <Sk w="100%" h={36} r={9} />
                    </div>
                  ))}
                </div>
              )
              : totalModules === 0
                ? (
                  <div className="mods-empty">
                    No hay módulos disponibles aún. ¡Vuelve pronto!
                  </div>
                )
                : (
                  <motion.div
                    className="mods-grid"
                    initial={pref ? false : 'hidden'}
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
                  >
                    {sortedModules.map((mod) => {
                      const isDone   = completedIds.has(mod.id)
                      const isLocked = lockedIds.has(mod.id)
                      return (
                        <motion.div
                          key={mod.id}
                          variants={fadeUp}
                          className={`mod-card ${isDone ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
                          onClick={!isLocked && !isDone ? () => router.push(`/dashboard/modules/${mod.id}`) : undefined}
                          style={!isLocked && !isDone ? { cursor: 'pointer' } : undefined}
                        >
                          <div className="mod-num" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {String(mod.order_index).padStart(2, '0')}
                            {isLocked && (
                              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" style={{ opacity: .5 }}>
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
                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <path d="M2 7l3 3 6-6" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
                            <motion.button
                              className="btn-start"
                              onClick={e => { e.stopPropagation(); router.push(`/dashboard/modules/${mod.id}`) }}
                              whileHover={pref ? undefined : { scale: 1.02 }}
                              whileTap={pref ? undefined : { scale: 0.97 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                            >
                              Empezar
                            </motion.button>
                          )}
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )
            }
          </div>

        </motion.main>

      </div>
    </>
  )
}
