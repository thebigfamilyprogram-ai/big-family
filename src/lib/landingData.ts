// Shared static data for the (landing) route group pages.

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
