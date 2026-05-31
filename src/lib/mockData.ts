// ─── MOCK MODE ────────────────────────────────────────────────────────────────
// Set to false to switch back to live Supabase data
export const MOCK_MODE = true

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
export const MOCK = {

  // USUARIO ACTUAL
  currentUser: {
    id:         'mock-user-1',
    name:       'Valentina Torres Ospino',
    email:      'valentina.torres@iemim.edu.co',
    role:       'student',
    school_id:  'MIM',
    school_name:'IE Técnica María Inmaculada',
    level:      'Senior Leader',
    avatar_url: null,
    created_at: '2026-01-15T08:00:00',
  },

  currentCoordinator: {
    id:         'mock-coord-1',
    name:       'Jorge Luis Gómez Solano',
    email:      'jorge.gomez@coordinator.bigfamily.co',
    role:       'coordinator',
    school_id:  'MIM',
    school_name:'IE Técnica María Inmaculada',
  },

  // COLEGIOS
  schools: [
    { id:'MIM', name:'IE Técnica María Inmaculada',        municipality:'Riohacha',           initials:'TM',
      students:58, avgXP:1240, modulesCompleted:287, projectsApproved:14,
      badges:89, retentionRate:82, score:91, weeklyActive:41,
      xpTrend:[820,940,1050,1240] },
    { id:'IPD', name:'Instituto Pedagógico',               municipality:'Riohacha',           initials:'IP',
      students:62, avgXP:980, modulesCompleted:234, projectsApproved:11,
      badges:74, retentionRate:75, score:84, weeklyActive:38,
      xpTrend:[640,720,850,980] },
    { id:'CMF', name:'IE Comfamiliar',                     municipality:'Riohacha',           initials:'CF',
      students:45, avgXP:760, modulesCompleted:189, projectsApproved:8,
      badges:51, retentionRate:68, score:74, weeklyActive:27,
      xpTrend:[480,560,690,760] },
    { id:'WWR', name:'Centro Etnoeducativo Ware Waren',    municipality:'Manaure',            initials:'WW',
      students:38, avgXP:620, modulesCompleted:142, projectsApproved:6,
      badges:38, retentionRate:61, score:63, weeklyActive:19,
      xpTrend:[310,420,530,620] },
    { id:'PVI', name:'IE Paulo VI',                        municipality:'Riohacha',           initials:'PV',
      students:51, avgXP:890, modulesCompleted:198, projectsApproved:9,
      badges:62, retentionRate:71, score:79, weeklyActive:32,
      xpTrend:[580,680,790,890] },
    { id:'CAF', name:'IE Camino al Futuro',                municipality:'Albania',            initials:'CA',
      students:34, avgXP:540, modulesCompleted:98, projectsApproved:4,
      badges:28, retentionRate:55, score:54, weeklyActive:14,
      xpTrend:[280,350,440,540] },
    { id:'CLM', name:'IE Colombia Mía',                    municipality:'Maicao',             initials:'CM',
      students:29, avgXP:480, modulesCompleted:67, projectsApproved:2,
      badges:19, retentionRate:48, score:47, weeklyActive:11,
      xpTrend:[180,240,350,480] },
    { id:'ELC', name:'IE El Carmelo',                      municipality:'San Juan del Cesar', initials:'EC',
      students:30, avgXP:510, modulesCompleted:78, projectsApproved:3,
      badges:22, retentionRate:52, score:51, weeklyActive:12,
      xpTrend:[200,290,390,510] },
  ],

  // ESTUDIANTES
  students: [
    { id:'s1',  name:'Valentina Torres Ospino',   school_id:'MIM', xp:1840, modules:6, level:'Senior Leader', badges:8,  streak:14, rank:1,  lastActive:'2026-05-27', projects:2, status:'active',   created_at:'2026-01-15T08:00:00' },
    { id:'s2',  name:'Carlos Andrés Pushaina',    school_id:'MIM', xp:1620, modules:5, level:'Senior Leader', badges:6,  streak:9,  rank:2,  lastActive:'2026-05-26', projects:1, status:'active',   created_at:'2026-01-18T08:00:00' },
    { id:'s3',  name:'Luisa Fernanda Ipuana',     school_id:'IPD', xp:1540, modules:6, level:'Senior Leader', badges:7,  streak:21, rank:3,  lastActive:'2026-05-27', projects:2, status:'active',   created_at:'2026-01-20T08:00:00' },
    { id:'s4',  name:'Miguel Ángel Epieyu',       school_id:'MIM', xp:1380, modules:5, level:'Senior Leader', badges:5,  streak:7,  rank:4,  lastActive:'2026-05-25', projects:1, status:'active',   created_at:'2026-02-01T08:00:00' },
    { id:'s5',  name:'Sara Milena Iguarán',       school_id:'PVI', xp:1290, modules:4, level:'Senior Leader', badges:5,  streak:12, rank:5,  lastActive:'2026-05-27', projects:1, status:'active',   created_at:'2026-01-22T08:00:00' },
    { id:'s6',  name:'Andrés Felipe Uriana',      school_id:'CMF', xp:1180, modules:4, level:'Junior Leader', badges:4,  streak:5,  rank:6,  lastActive:'2026-05-24', projects:1, status:'active',   created_at:'2026-02-05T08:00:00' },
    { id:'s7',  name:'Daniela Paz Arpushana',     school_id:'IPD', xp:1050, modules:4, level:'Junior Leader', badges:3,  streak:3,  rank:7,  lastActive:'2026-05-23', projects:0, status:'active',   created_at:'2026-02-10T08:00:00' },
    { id:'s8',  name:'Juan Pablo Montiel',        school_id:'PVI', xp:980,  modules:3, level:'Junior Leader', badges:3,  streak:8,  rank:8,  lastActive:'2026-05-27', projects:1, status:'active',   created_at:'2026-02-12T08:00:00' },
    { id:'s9',  name:'María José Ballesteros',    school_id:'CAF', xp:860,  modules:3, level:'Junior Leader', badges:2,  streak:2,  rank:9,  lastActive:'2026-05-20', projects:0, status:'inactive', created_at:'2026-02-18T08:00:00' },
    { id:'s10', name:'Roberto Carlos Fonseca',    school_id:'WWR', xp:780,  modules:2, level:'Junior Leader', badges:2,  streak:0,  rank:10, lastActive:'2026-05-15', projects:0, status:'inactive', created_at:'2026-03-01T08:00:00' },
  ],

  // MÓDULOS
  modules: [
    { id:'m1', title:'Liderazgo Personal',     order:1, completions:198, avgScore:87, status:'published', xpReward:200, duration:'45 min' },
    { id:'m2', title:'Comunicación Efectiva',  order:2, completions:176, avgScore:82, status:'published', xpReward:200, duration:'50 min' },
    { id:'m3', title:'Trabajo en Equipo',      order:3, completions:154, avgScore:79, status:'published', xpReward:250, duration:'55 min' },
    { id:'m4', title:'Pensamiento Crítico',    order:4, completions:132, avgScore:74, status:'published', xpReward:250, duration:'60 min' },
    { id:'m5', title:'Innovación Social',      order:5, completions:98,  avgScore:71, status:'published', xpReward:300, duration:'65 min' },
    { id:'m6', title:'Impacto Comunitario',    order:6, completions:67,  avgScore:68, status:'published', xpReward:300, duration:'70 min' },
    { id:'m7', title:'Proyecto Final',         order:7, completions:34,  avgScore:91, status:'published', xpReward:500, duration:'90 min' },
  ],

  // PROYECTOS
  projects: [
    { id:'p1',  title:'Huerta Comunitaria Sostenible', student:'Valentina Torres Ospino', school_id:'MIM', status:'approved', category:'Medio Ambiente', xpAwarded:450, createdAt:'2026-04-10T00:00:00', summary:'Proyecto de agricultura urbana en el barrio...' },
    { id:'p2',  title:'App de Tutorías Escolares',     student:'Luisa Fernanda Ipuana',   school_id:'IPD', status:'approved', category:'Tecnología',     xpAwarded:480, createdAt:'2026-04-15T00:00:00', summary:'Plataforma digital para conectar estudiantes...' },
    { id:'p3',  title:'Campaña de Salud Mental Wayuu', student:'Carlos Andrés Pushaina',  school_id:'MIM', status:'pending',  category:'Salud',           xpAwarded:0,   createdAt:'2026-05-01T00:00:00', summary:'Iniciativa de concientización sobre salud...' },
    { id:'p4',  title:'Radio Comunitaria Estudiantil', student:'Sara Milena Iguarán',     school_id:'PVI', status:'approved', category:'Comunicación',   xpAwarded:420, createdAt:'2026-04-20T00:00:00', summary:'Creación de un espacio radial estudiantil...' },
    { id:'p5',  title:'Biblioteca Digital Guajira',    student:'Andrés Felipe Uriana',    school_id:'CMF', status:'pending',  category:'Educación',       xpAwarded:0,   createdAt:'2026-05-10T00:00:00', summary:'Repositorio digital de recursos educativos...' },
    { id:'p6',  title:'Mural Historia Wayuu',          student:'Miguel Ángel Epieyu',     school_id:'MIM', status:'rejected', category:'Cultura',         xpAwarded:0,   createdAt:'2026-04-25T00:00:00', summary:'Arte urbano que documenta la historia...' },
    { id:'p7',  title:'Reciclaje Creativo Escolar',    student:'Daniela Paz Arpushana',   school_id:'IPD', status:'approved', category:'Medio Ambiente', xpAwarded:380, createdAt:'2026-04-05T00:00:00', summary:'Sistema de reciclaje artístico en el colegio...' },
    { id:'p8',  title:'Emprendimiento Artesanal',      student:'Juan Pablo Montiel',      school_id:'PVI', status:'pending',  category:'Emprendimiento', xpAwarded:0,   createdAt:'2026-05-15T00:00:00', summary:'Negocio de artesanías wayuu con comercio...' },
    { id:'p9',  title:'Huerto Escolar Ware Waren',     student:'Roberto Carlos Fonseca',  school_id:'WWR', status:'draft',    category:'Medio Ambiente', xpAwarded:0,   createdAt:'2026-05-20T00:00:00', summary:'Proyecto de siembra en tierras áridas...' },
    { id:'p10', title:'Festival Cultural Guajiro',     student:'María José Ballesteros',  school_id:'CAF', status:'approved', category:'Cultura',         xpAwarded:410, createdAt:'2026-04-18T00:00:00', summary:'Organización del primer festival cultural...' },
  ],

  // XP GLOBAL ÚLTIMAS 8 SEMANAS
  weeklyXP: [
    { week:'S1', xp:18400, students:142 },
    { week:'S2', xp:22800, students:168 },
    { week:'S3', xp:19600, students:155 },
    { week:'S4', xp:28400, students:189 },
    { week:'S5', xp:31200, students:201 },
    { week:'S6', xp:26800, students:178 },
    { week:'S7', xp:34500, students:218 },
    { week:'S8', xp:38900, students:234 },
  ],

  // XP PERSONAL (estudiante actual) — últimas 4 semanas
  currentStudentWeeklyXP: [
    { week:'S1', xp:380 },
    { week:'S2', xp:420 },
    { week:'S3', xp:350 },
    { week:'S4', xp:490 },
  ],

  // ACTIVIDAD SEMANAL COORDINADOR
  coordinatorWeeklyData: [
    { week:'S1', xp:18400, active:38 },
    { week:'S2', xp:22800, active:41 },
    { week:'S3', xp:19600, active:35 },
    { week:'S4', xp:28400, active:44 },
  ],

  // FEED DE ACTIVIDAD
  feed: [
    { id:'f1',  type:'project_approved',  user:'Valentina Torres Ospino',  school:'IE Técnica María Inmaculada', content:'Proyecto "Huerta Comunitaria" aprobado', xp:450,  createdAt:'2026-05-27T09:14:00' },
    { id:'f2',  type:'module_completed',  user:'Luisa Fernanda Ipuana',    school:'Instituto Pedagógico',        content:'Innovación Social',                     xp:300,  createdAt:'2026-05-27T08:45:00' },
    { id:'f3',  type:'badge_earned',      user:'Carlos Andrés Pushaina',   school:'IE Técnica María Inmaculada', content:'Comunicador Estrella',                  xp:100,  createdAt:'2026-05-26T16:30:00' },
    { id:'f4',  type:'project_submitted', user:'Andrés Felipe Uriana',     school:'IE Comfamiliar',              content:'Biblioteca Digital Guajira',            xp:0,    createdAt:'2026-05-26T14:20:00' },
    { id:'f5',  type:'module_completed',  user:'Sara Milena Iguarán',      school:'IE Paulo VI',                 content:'Pensamiento Crítico',                   xp:250,  createdAt:'2026-05-26T11:15:00' },
    { id:'f6',  type:'module_completed',  user:'Juan Pablo Montiel',       school:'IE Paulo VI',                 content:'Trabajo en Equipo',                     xp:250,  createdAt:'2026-05-25T15:40:00' },
    { id:'f7',  type:'project_approved',  user:'Sara Milena Iguarán',      school:'IE Paulo VI',                 content:'Proyecto "Radio Comunitaria" aprobado', xp:420,  createdAt:'2026-05-25T10:00:00' },
    { id:'f8',  type:'badge_earned',      user:'Daniela Paz Arpushana',    school:'Instituto Pedagógico',        content:'Líder en Formación',                    xp:100,  createdAt:'2026-05-24T17:00:00' },
    { id:'f9',  type:'module_completed',  user:'Miguel Ángel Epieyu',      school:'IE Técnica María Inmaculada', content:'Comunicación Efectiva',                 xp:200,  createdAt:'2026-05-24T09:30:00' },
    { id:'f10', type:'project_submitted', user:'Juan Pablo Montiel',       school:'IE Paulo VI',                 content:'Emprendimiento Artesanal',              xp:0,    createdAt:'2026-05-23T14:00:00' },
  ],

  // METAS PERSONALES (estudiante actual)
  goals: [
    { id:'g1', title:'Completar 5 módulos',     progress:80,  target:5, current:4, xpReward:200, deadline:'2026-06-30', status:'active'    },
    { id:'g2', title:'Enviar proyecto capstone', progress:60,  target:1, current:0, xpReward:300, deadline:'2026-07-15', status:'active'    },
    { id:'g3', title:'7 días de racha activa',   progress:100, target:7, current:7, xpReward:150, deadline:'2026-05-20', status:'completed' },
    { id:'g4', title:'Obtener 3 badges',         progress:100, target:3, current:3, xpReward:100, deadline:'2026-05-15', status:'completed' },
  ],

  // EVENTOS DE CALENDARIO
  events: [
    { id:'e1', title:'Taller de Liderazgo Regional',    date:'2026-06-05', type:'event',    school:'global', description:'Encuentro de líderes de los 8 colegios' },
    { id:'e2', title:'Entrega de Proyectos Capstone',   date:'2026-06-20', type:'deadline', school:'global', description:'Fecha límite para envío de proyectos' },
    { id:'e3', title:'Ceremonia de Certificación',       date:'2026-07-10', type:'event',    school:'global', description:'Entrega de diplomas Big Leader 2026' },
    { id:'e4', title:'Quiz Módulo 5',                   date:'2026-05-30', type:'deadline', school:'MIM',    description:'Evaluación Innovación Social' },
  ],

  // ANUNCIOS
  announcements: [
    { id:'a1', title:'¡Convocatoria Proyecto Capstone abierta!', category:'Operativo',    content:'Ya pueden enviar sus proyectos finales. La fecha límite es el 20 de junio.', school:'global', createdAt:'2026-05-25', expiresAt:'2026-06-20', author:'Jorge Luis Gómez Solano' },
    { id:'a2', title:'Valentina Torres en el Top 3 nacional',    category:'Logro',         content:'Orgullosos de nuestra estudiante, quien lidera el ranking nacional de XP.',   school:'MIM',    createdAt:'2026-05-20', expiresAt:'2026-06-20', author:'Jorge Luis Gómez Solano' },
    { id:'a3', title:'Nuevo módulo disponible: Impacto',        category:'Motivacional',  content:'El módulo 6 — Impacto Comunitario — ya está disponible para todos.',          school:'global', createdAt:'2026-05-15', expiresAt:'2026-07-01', author:'Admin Big Family' },
  ],

  // LEADERSHIP PATH (estudiante actual)
  leadershipPath: {
    pillars: [
      { name:'Visión',    progress:75, color:'#C0392B' },
      { name:'Módulos',  progress:86, color:'#D4821A' },
      { name:'Impacto',  progress:60, color:'#0F7B6C' },
      { name:'Comunidad',progress:70, color:'#8C7B6E' },
      { name:'Proyectos',progress:50, color:'#C0392B' },
    ],
    currentPhase:    'Phase 03: Impact',
    nextMilestone:   'Completar módulo 6',
    totalProgress:   68,
  },

  // DIPLOMA — estudiante certificado para /certificacion/[id]
  mockDiploma: {
    studentName:      'Valentina Torres Ospino',
    schoolName:       'IE Técnica María Inmaculada',
    resultado:        'certificado' as const,
    certDate:         '2026-05-15T10:00:00',
    totalXP:          1840,
    modulesCompleted: 6,
  },

  // ANALYTICS PARA /datos
  analytics: {
    kpis: {
      totalStudents:        347,
      totalXP:              284500,
      avgXP:                820,
      modulesCompleted:     1243,
      projectsSubmitted:    89,
      projectsApproved:     54,
      projectsRejected:     12,
      projectsPending:      23,
      badgesAwarded:        412,
      activeThisWeek:       178,
      retentionRate:        73,
      weekOverWeekGrowth:   12,
    },
    moduleCompletionRate: [
      { module:'Liderazgo Personal',    rate:94 },
      { module:'Comunicación Efectiva', rate:83 },
      { module:'Trabajo en Equipo',     rate:72 },
      { module:'Pensamiento Crítico',   rate:62 },
      { module:'Innovación Social',     rate:46 },
      { module:'Impacto Comunitario',   rate:31 },
      { module:'Proyecto Final',        rate:16 },
    ],
    projectsByCategory: [
      { category:'Medio Ambiente', count:24 },
      { category:'Tecnología',     count:18 },
      { category:'Educación',      count:15 },
      { category:'Cultura',        count:14 },
      { category:'Salud',          count:10 },
      { category:'Emprendimiento', count:8  },
    ],
    weeklyGrowth: [
      { week:'S1', students:12 },{ week:'S2', students:18 },{ week:'S3', students:15 },{ week:'S4', students:22 },
      { week:'S5', students:28 },{ week:'S6', students:21 },{ week:'S7', students:31 },{ week:'S8', students:34 },
    ],
    weeklyActivity: [
      { week:'S1', actions:142 },{ week:'S2', actions:168 },{ week:'S3', actions:155 },{ week:'S4', actions:189 },
      { week:'S5', actions:201 },{ week:'S6', actions:178 },{ week:'S7', actions:218 },{ week:'S8', actions:234 },
    ],
  },
}
