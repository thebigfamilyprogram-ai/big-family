// Shared static data for the (landing) route group pages.

export const TIMELINE_EVENTS = [
  {
    id: 'founding',
    year: '2015',
    month: 'Agosto',
    title: 'El origen',
    summary: 'El programa inicia con 15 estudiantes de Grados 2, 3 y 4.',
    detail: 'PENDIENTE — Luis Barrios completará este espacio con la historia completa del origen del programa en el Colegio Albania.',
    tag: 'Fundación',
    icon: '🌱',
  },
  {
    id: 'first-graduates',
    year: '2018',
    month: '',
    title: 'Primera promoción reconocida',
    summary: 'Los primeros estudiantes del programa reciben reconocimiento al graduarse.',
    detail: 'PENDIENTE — Luis Barrios completará con nombres, logros específicos y fotos de la primera promoción.',
    tag: 'Hito',
    icon: '🎓',
  },
  {
    id: 'virtual-expansion',
    year: '2020',
    month: '',
    title: 'Expansión virtual',
    summary: 'El programa se adapta al formato virtual y amplía su alcance internacional.',
    detail: 'PENDIENTE — Luis Barrios completará con el contexto de la adaptación virtual y los países que se sumaron.',
    tag: 'Expansión',
    icon: '🌐',
  },
  {
    id: 'international-workshop',
    year: '2022',
    month: 'Mayo',
    title: 'International Workshop',
    summary: 'Primer taller internacional con instituciones de múltiples países.',
    detail: '"Thank you very much Mr Barrios for providing our students with this opportunity. They thoroughly enjoyed the opportunity to interact with students from around the globe." — Jonathan Smith, Col. Bilingue de Santa Marta',
    tag: 'Internacional',
    icon: '🤝',
  },
  {
    id: 'ib-americas',
    year: '2023',
    month: '',
    title: 'IB Americas Conference',
    summary: 'El programa se presenta ante la conferencia del IB en Orlando, Florida.',
    detail: 'PENDIENTE — Luis Barrios completará con detalles de la presentación, asistentes y resultados del evento en Orlando.',
    tag: 'Reconocimiento',
    icon: '🏛️',
  },
  {
    id: 'tri-association',
    year: '2024',
    month: '',
    title: 'Tri-Association — TRIHEROES',
    summary: 'La Tri-Association (Association of American Schools) destaca el programa y lo selecciona para TRIHEROES.',
    detail: 'PENDIENTE — Luis Barrios completará con detalles del proceso de selección y la experiencia en TRIHEROES.',
    tag: 'Selección',
    icon: '⭐',
  },
  {
    id: 'madrid-congress',
    year: '2025',
    month: 'Mayo',
    title: '3er lugar — Congreso Iberoamericano',
    summary: '"How to Achieve a Successful Process of Leadership Development in Schools" — 3er lugar en Madrid.',
    detail: 'PENDIENTE — Luis Barrios completará con detalles del congreso MBC Educación & Felicidad en Madrid y el impacto del reconocimiento.',
    tag: 'Premio',
    icon: '🥉',
  },
  {
    id: 'platform-2026',
    year: '2026',
    month: '',
    title: 'Plataforma digital',
    summary: '876 estudiantes formados · 8 colegios · 10 países · plataforma digital lanzada.',
    detail: 'PENDIENTE — Luis Barrios completará con la visión de futuro y los próximos pasos del programa hacia 2030.',
    tag: 'Presente',
    icon: '🚀',
  },
] as const

export const IMPACTO_STATS = [
  { to: 876,  duration: 1800, delayMs: 0,   comma: false, suffix: '',  label: 'Estudiantes impactados', sub: 'desde 2015'                    },
  { to: 22,   duration: 1200, delayMs: 200, comma: false, suffix: '',  label: 'Colegios en Colombia',   sub: 'aliados del programa'           },
  { to: 10,   duration: 1000, delayMs: 400, comma: false, suffix: '',  label: 'Países conectados',      sub: 'red internacional'              },
  { to: 3300, duration: 2400, delayMs: 100, comma: true,  suffix: '+', label: 'Meta 2030',              sub: '20% líderes transformacionales' },
] as const

export const VALORES = [
  { name: 'Ética',             slug: 'etica',            desc: 'Actuamos con integridad en cada decisión.'          },
  { name: 'Compromiso',        slug: 'compromiso',        desc: 'Nos entregamos completamente a nuestro propósito.'  },
  { name: 'Trascendencia',     slug: 'trascendencia',     desc: 'Dejamos una huella positiva que perdura.'           },
  { name: 'Conciencia Social', slug: 'conciencia-social', desc: 'Entendemos nuestro impacto en la comunidad.'        },
  { name: 'Innovación',        slug: 'innovacion',        desc: 'Buscamos nuevas formas de resolver problemas.'      },
  { name: 'Creatividad',       slug: 'creatividad',       desc: 'Encontramos soluciones originales y únicas.'        },
] as const

// Slug → translation key for VALORES (slug uses kebab-case, keys use camelCase)
export const valorKeyMap: Record<string, string> = {
  'etica':             'etica',
  'compromiso':        'compromiso',
  'trascendencia':     'trascendencia',
  'conciencia-social': 'concienciaSocial',
  'innovacion':        'innovacion',
  'creatividad':       'creatividad',
}

export const VALIDACIONES = [
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

export const misionStats = [
  { to: 5000, suffix: '+', label: 'Líderes a formar'      },
  { to: 50,   suffix: '+', label: 'Países para 2036'      },
  { to: 90,   suffix: '',  label: 'Instituciones aliadas' },
  { to: 2036, suffix: '',  label: 'Meta global'           },
]

/* EDITAR AQUÍ — fundadores */
export const FOUNDERS_STATIC = [
  { initials: 'SG', name: 'Samuel Gomez',       roleKey: 'landing.equipo.founder1Role' as const, bioKey: 'landing.equipo.founder1Bio' as const, tagKeys: ['landing.equipo.tagTecnologia', 'landing.equipo.tagPlataforma', 'landing.equipo.tagDesarrollo'] as const },
  { initials: 'JV', name: 'Juan Felipe Visbal', roleKey: 'landing.equipo.founder2Role' as const, bioKey: 'landing.equipo.founder2Bio' as const, tagKeys: ['landing.equipo.tagContenido',   'landing.equipo.tagComunicacion', 'landing.equipo.tagLiderazgo']  as const },
  { initials: 'AG', name: 'Alejandro Garcia',   roleKey: 'landing.equipo.founder3Role' as const, bioKey: 'landing.equipo.founder3Bio' as const, tagKeys: ['landing.equipo.tagOperaciones', 'landing.equipo.tagEstrategia',  'landing.equipo.tagEstructura']  as const },
]

export const PROGRAM_COMPONENTS = [
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
