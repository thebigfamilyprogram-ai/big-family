# ROADMAP MAESTRO — Big Family Platform

> Documento estratégico de rumbo. Vive en la raíz del repo junto a `CLAUDE.md`, `context.md` y `PROMPT_MAESTRO.md`.
> No es un prompt de "hazlo todo de una". Es un plan por fases que Claude Code ejecuta en orden.

---

## CÓMO USAR ESTE DOCUMENTO (instrucción para Claude Code)

1. Lee `CLAUDE.md`, `context.md` y `PROMPT_MAESTRO.md` antes de tocar nada.
2. Actúa como diseñador web senior de élite con criterio propio. Si algo aquí resultaría mediocre o hay una mejor forma de hacerlo, dilo y propón la alternativa.
3. **Ejecuta UNA fase a la vez.** No mezcles fases. Termina, verifica `tsc --noEmit`, actualiza `context.md`, y para.
4. Dentro de cada fase, completa cada feature entero antes de pasar al siguiente. Output parcial = output roto.
5. Respeta `MOCK_MODE` en todo. Respeta todos los tokens CSS. Solo `transform` y `opacity` en Framer Motion.
6. Cuando termines una fase, reporta: qué se hizo, qué migraciones SQL quedaron pendientes de correr en Supabase, y qué decisiones requieren a Luis Barrios.

**Para arrancar, el humano te dirá:** `"Lee ROADMAP.md y ejecuta la Fase 0"`.

---

## VISIÓN ESTRATÉGICA

La plataforma nació como un LMS con una landing hermosa. Lo que debe convertirse es una **plataforma de desarrollo de liderazgo y credenciales verificables**, donde la metodología real del programa vive, las certificaciones son verificables globalmente, y cada estudiante construye un portafolio que puede mostrarle al mundo.

Tres pilares ordenan todo lo demás:

1. **Que arranque de verdad** — tiene que correr sobre datos reales, de forma segura. Hoy `MOCK_MODE = true` bloquea el lanzamiento.
2. **Que la metodología esté completa** — el programa son 4 componentes (Big Leader, Leader's Game, Great Venture, Kashi). Solo el primero está construido. Los otros tres son el diferenciador real.
3. **Que sea creíble globalmente** — credenciales verificables, portafolios compartibles, multi-idioma. El programa ya manda alumni a ESADE y Concordia; la plataforma debe estar a esa altura.

---

## FASE 0 — LISTO PARA PRODUCCIÓN (bloqueantes)

Sin esto, no hay lanzamiento. Es la fase menos vistosa y la más importante.

### 0.1 — MOCK_MODE como variable de entorno
- `src/lib/mockData.ts`: `export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'`
- Default en producción: `false`. En `.env.local` para desarrollo: `NEXT_PUBLIC_MOCK_MODE=true`
- Documentar en `CLAUDE.md` cómo encenderlo/apagarlo.

### 0.2 — Override de rol en desarrollo (para probar paneles)
- `src/proxy.ts`: si `process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_MOCK_ROLE`, usar ese rol en vez del de Supabase.
- Permite probar `/admin`, `/coordinator`, `/expositor` sin cambiar el rol real en la DB.
- En producción este bloque nunca se activa.

### 0.3 — Auditoría de RLS (el backstop de seguridad)
- Las queries filtran por `user_id` en código, pero la RLS en BD debe ser la última barrera.
- Verificar y documentar políticas RLS en: `projects`, `profiles`, `success_stories`, `announcements`, `goals`, `quiz_attempts`, `coordinator_codes`, `expositor_codes`, `saved_dashboards`.
- Regla: un estudiante nunca debe poder leer datos de otro estudiante vía API directa, aunque el código cliente lo impida.

### 0.4 — Endurecer TypeScript
- Eliminar los 15+ `as any` en queries de Supabase (`DatosPage.tsx`, `coordinator/modules`, `coordinator/projects`).
- Crear interfaces reales: `StudentProfile`, `CoordinatorProfile`, `SchoolRow`, `ProjectRow`, `ModuleRow`.
- Eliminar los casts anónimos repetidos en `coordinator/layout.tsx`.

### 0.5 — Limpiar logs de producción
- Quitar/condicionar `console.error` y `console.log` en `src/lib/supabase.ts` y donde aparezcan en paths de producción.
- Un `logger` mínimo que solo emita en desarrollo.

### 0.6 — Estados completos en toda la app
- Verificar que cada componente que carga datos tiene los 4 estados: loading (skeleton, no spinner), empty (con CTA), error (con retry), success.
- Error boundaries (`error.tsx`) ya existen en los 3 dashboards — confirmar que cubren todos los flujos.

### 0.7 — Correr migraciones pendientes + reactivar email
- Correr en Supabase: `20260601000000_projects_fields_and_timeline.sql` y `20260601100000_schools_and_codes.sql`.
- Reactivar confirmación de email (estaba desactivada temporalmente).

---

## FASE 1 — COMPLETAR LA METODOLOGÍA (el corazón del programa)

Esta es la fase que convierte la plataforma de "un LMS bonito" en "la plataforma de Big Family". Aquí se construyen los 3 componentes del programa que hoy no existen.

### 1.1 — The Great Venture (Matriz Hoshin Kanri) — PRIORIDAD MÁXIMA
Es la propiedad intelectual del programa. Una herramienta guiada donde el estudiante define su "gran empresa" como emprendedor global.

**Ruta:** `/dashboard/great-venture`

**Wizard de 5 pasos** (uno por elemento de la matriz Hoshin Kanri):
1. **Meta núcleo** — el objetivo central, su sueño
2. **Creencias empoderadoras** — las creencias que lo impulsan
3. **Paradigma apreciativo** — su lente de fortalezas
4. **Equipo de poder** — las personas clave que lo acompañan
5. **Planes de acción** — pasos concretos con fechas

**Output:** una matriz Hoshin Kanri visual (los 5 elementos en una composición de cuadrícula clásica — centro = meta, cuadrantes alrededor). Guardable, editable, exportable a PDF/imagen.

**Diseño:** documento-style, editorial. La matriz debe verse como un artefacto serio que el estudiante quiere imprimir y pegar en su pared. Nueva tabla `great_ventures` (`user_id`, `meta_nucleo`, `creencias`, `paradigma`, `equipo` jsonb, `planes` jsonb, `updated_at`).

**Por qué primero:** ningún otro programa juvenil tiene esto. Es el feature que justifica la existencia de la plataforma.

### 1.2 — Kashi (Red de mentoría entre pares)
Red social educativa. Empezar simple y enfocado, no como "app global" — eso vino después.

**Ruta:** `/dashboard/kashi`

**MVP:**
- Cada estudiante declara **habilidades que puede enseñar** (tags) y **habilidades que quiere aprender**.
- Directorio buscable de mentores por habilidad.
- Sistema de solicitud de sesión: estudiante A pide a estudiante B una sesión sobre X habilidad, B acepta/rechaza, queda registrada.
- Las sesiones completadas dan XP y aparecen en el feed.

**Diseño:** masonry de tarjetas de mentores, filtro por habilidad. Tablas `kashi_skills` (`user_id`, `skill`, `type: 'teach'|'learn'`) y `kashi_sessions` (`mentor_id`, `student_id`, `skill`, `status`, `created_at`).

**Nombre:** Kashi = "luna" en wayuu. Honrar ese origen en el diseño (un motivo lunar sutil, no literal).

### 1.3 — The Leader's Game (panel de facilitador)
Es un juego presencial por estaciones. Para el web app, lo valioso es un **panel de facilitador** que registra puntajes durante el evento, no el juego en sí.

**Ruta:** `/coordinator/leaders-game`

**MVP:**
- El coordinador crea una sesión de juego con estaciones.
- Registra equipos y puntos por estación.
- Ranking en vivo proyectable.
- Al terminar, los resultados alimentan el perfil de fortalezas de cada participante (útil para diseñar talleres de mayor intensidad, especialmente para estudiantes neurodivergentes, como dice el PDF).

**Prioridad:** menor que 1.1 y 1.2. Es logística de evento, no plataforma core. Confirmar con Luis si lo necesitan digitalizado o si lo manejan presencial.

### 1.4 — Cerrar el gap de currículo (12 módulos)
- El PDF dice que CEO Junior y CEO MiniJunior completan un **currículo de 12 módulos**. El sistema tiene 7.
- Flag para Luis: ¿faltan 5 módulos de contenido por crear, o el número real es 7?
- Si son 12: el panel de expositor y el leadership path deben soportar el set completo.

### 1.5 — Tracks por edad (CEO MiniJunior / CEO Junior)
- El registro ya distingue Junior Leader (9-13) y Senior Leader (14-18).
- El PDF menciona tracks específicos: CEO MiniJunior (grado 4) y CEO Junior (último año).
- Flag para Luis: ¿hay currículo distinto por track, o es el mismo contenido con dificultad ajustada?

---

## FASE 2 — SISTEMA DE DISEÑO Y PULIDO

Con la metodología completa, pulir la experiencia.

### 2.1 — Refactor de GlobeHero (mantenibilidad)
- `GlobeHero.tsx` tiene 3000+ líneas en un solo componente.
- Extraer secciones a Client Components memoizados: `SeccionHistoria`, `SeccionImpacto`, `SeccionMetodologia`, `SeccionValores`, `SeccionAcreditaciones`, `SeccionCertificacion`, `SeccionTestimonios`, `SeccionFAQ`, `Footer`.
- PageSpeed ya está en 98% — no romper eso. El objetivo es mantenibilidad, no performance.

### 2.2 — Nuevas secciones de landing (faltan para un visitante nuevo)
- **"¿Quién puede participar?"** — la landing asume que ya sabes que eres estudiante de uno de los 8 colegios. Un visitante nuevo no sabe si aplica. Sección clara de elegibilidad.
- **Badge "Es gratuito"** — hoy solo aparece en el FAQ. Es un diferenciador clave. Merece presencia visual prominente.
- **"Cómo aplico"** — timeline simple de los pasos para entrar al programa.

### 2.3 — Integración de fotos reales (cuando lleguen los assets)
- Placeholders activos: About Dark (~1640), Componentes del Programa x4 (~1945), Valores x6 (~1987).
- Cuando Luis entregue las fotos, reemplazar los `div` placeholder por `<img>`.
- Las 6 ilustraciones de Valores (las que está generando el amigo) van en `/public/images/valores/`.

### 2.4 — Mobile polish
- Tablas de 8+ columnas en `CoordinatorClient.tsx` con `overflow-x: auto` verificado en <640px.
- Celdas de calendario con `aspect-ratio` correcto en mobile.
- Confirmar que cada sidebar colapsa bien y que el contenido respira en pantallas chicas.

### 2.5 — Dark mode completo
- Verificar cada superficie: skeletons, badges, charts, paneles deslizables, modales.
- Test mental: si el fondo fuera casi negro, ¿todo el texto sigue legible? Pasar esa prueba en toda la app.

### 2.6 — Biblioteca de componentes documentada
- `StatCard`, `Badge`, `Toast`, `AppSidebar`, panel deslizable — documentar variantes, estados y uso.
- Garantizar que ningún componente nuevo rompe el design system.

---

## FASE 3 — CREDIBILIDAD GLOBAL Y DIFERENCIACIÓN

Lo que convierte el certificado en "algo que abre puertas".

### 3.1 — Certificado verificable — ALTO IMPACTO
El PDF enfatiza que las empresas valoran habilidades verificadas y que los alumni usan esto para la universidad. Un certificado que cualquiera puede verificar es oro.

**Ruta pública:** `/verify/[cert-id]` (sin login)
- Un empleador o universidad escanea un **QR en el diploma** y llega a una página de verificación.
- La página confirma: nombre del estudiante, programa (The Big Leader), colegio, fecha, resultado (certificado/mención de honor), estado "Verificado".
- Diseño editorial, nivel institucional — debe verse como una verificación de Stanford/ESADE, no como una pantalla de app.
- Agregar el QR al diploma en `/certificacion/[id]` apuntando a `/verify/[cert-id]`.
- Tabla `certificate_ids` o derivar el cert-id determinísticamente del `user_id` + evaluación.

### 3.2 — Portafolio público de liderazgo — ALTO IMPACTO
Una página pública que el estudiante pone en su aplicación universitaria.

**Ruta pública:** `/p/[username]` (o `/portfolio/[id]`)
- Muestra: certificación, proyectos capstone, stats de impacto, avance del Leadership Path, Great Venture (si la hizo pública).
- Limpio, profesional, listo para imprimir/compartir.
- El estudiante controla qué es público (toggle en settings).
- Esto sirve directamente el outcome del programa: formar líderes con proyección global.

### 3.3 — Internacionalización (visión 10 países hacia 2036)
- `next-intl`: español, inglés, francés, portugués.
- El programa ya está en 10 países. La landing y los dashboards deben hablar el idioma del visitante.
- Empezar por landing pública (mayor alcance), luego dashboards.

### 3.4 — Sección Alumni con casos reales
- Hoy se menciona en `CLAUDE.md` pero no existe en la landing.
- Casos reales del PDF: presidente de Model UN, estudiante en ESADE (Liderazgo Transformacional e Impacto Social), VP de Latin Students en Concordia.
- "Nuestros graduados" — prueba viviente del impacto.

### 3.5 — Hub de notificaciones unificado
- Hoy hay emails (Resend) + banner + bell sueltos.
- Un centro de notificaciones in-app unificado: proyecto evaluado, módulo aprobado, sesión Kashi solicitada, reintento de quiz aprobado, etc.
- Una sola campana, un solo feed, marcado de leídas.

---

## DIRECCIONES DE DISEÑO NUEVAS

Recomendaciones creativas transversales:

### Lenguaje visual de "credencial"
Cualquier lugar donde aparezca un logro (card del dashboard, página verify, portafolio) debe compartir un lenguaje visual consistente: sello circular, doble borde, Instrument Serif para nombres, acento rojo. Que el "momento credencial" se sienta igual de ceremonial en todas partes.

### El arco de la "jornada de liderazgo"
El programa es continuo de grado 3 a grado 11 — años de formación. Hoy la plataforma muestra estado puntual, no la historia. Una visualización del recorrido multi-año (timeline personal del estudiante: dónde empezó, dónde está, a dónde va) contaría esa historia. Poderoso para el estudiante y para mostrarle a la familia.

### Páginas públicas de calidad editorial
`/verify` y `/p/[username]` no son pantallas de app — son documentos que el estudiante muestra al mundo. Merecen tratamiento editorial: tipografía masiva, whitespace generoso, cero ruido de UI. Que una universidad las abra y piense "este programa es serio".

---

## DECISIONES QUE REQUIEREN A LUIS BARRIOS

No avanzar en estos sin su confirmación:

- **MOCK_MODE a false:** ¿Supabase ya tiene datos reales de estudiantes/colegios?
- **12 vs 7 módulos:** ¿faltan 5 módulos de contenido o el número real es 7?
- **Tracks CEO MiniJunior / CEO Junior:** ¿currículo distinto por track o mismo contenido ajustado?
- **The Leader's Game:** ¿lo necesitan digitalizado o lo manejan presencial?
- **Contenido pendiente:** stats reales de "Sobre Nosotros", texto de "Nuestra Historia", fotos del equipo y del programa.
- **Nombre de la red de alumni:** el específico del programa está pendiente.

---

## ORDEN DE EJECUCIÓN RECOMENDADO

```
FASE 0  ->  bloqueantes de producción      (sin esto no hay lanzamiento)
FASE 1  ->  metodología completa            (el corazón — Great Venture primero)
FASE 2  ->  diseño y pulido                 (con assets reales cuando lleguen)
FASE 3  ->  credibilidad global             (verify + portafolio = abre puertas)
```

Empezar siempre por Fase 0. Dentro de Fase 1, empezar por The Great Venture.
