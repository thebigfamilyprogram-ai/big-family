# context.md — Big Family Platform — Decision Log

## Last updated: Junio 2026 (Sesión 4)

---

## Features Completas

### Core Platform
- **Auth completo** — Google OAuth + email/password, forgot password, confirmación de email (desactivada temporalmente), roles por código de acceso (3 pasos: código → nivel → OAuth)
- **Dashboard estudiante** — XP, módulos, capstone, progreso de liderazgo, frase del día
- **Módulos (7 oficiales)** — Video, quiz con 2 intentos, badges, progreso, XP rewards
- **Sistema de quiz** — Anti-tab-switch detection, intentos guardados, solicitud de reintento al coordinador
- **Proyectos Capstone IDEMR** — Editor con 5 secciones (Identificar, Diseñar, Ejecutar, Medir, Reflexionar), subida de imágenes/PDFs/video URL, toolbar de formato rich text
- **Panel Coordinador** — Ver proyectos por colegio, evaluar con rúbrica Big Leader (scores 1-4), resultado: certificado/mención honor/retroalimentación/no certificado, breadcrumbs
- **Panel Super Admin** — Estadísticas, usuarios, proyectos, confirmar evaluaciones (segunda revisión)
- **Módulos Coordinador** — Aprobar/rechazar módulos de expositores, pestaña de reintentos de quiz
- **Panel Expositor** — Crear y editar módulos, submit para revisión
- **Noticias** — Blog público, editor con preview en tiempo real, galería, cover, slug, publicación programada (pendiente)
- **Team Hub** — Chat en tiempo real por colegio, ranking estudiantes y colegios (datos reales)
- **Global Map** — Mapa 3D WebGL con países objetivo (etiquetado "Visión 2036")
- **Leadership Path** — Ruta de liderazgo con 5 pilares
- **Globo 3D OffscreenCanvas** — Three.js migrado a Web Worker (OffscreenCanvas), textura NASA día/noche, fallback para Safari < 16.4. Archivos: src/components/Globe/GlobeWorker.ts, GlobeCanvas.tsx, GlobeFallback.ts. PageSpeed subió de 54% a 98%.

### Features Nuevas (Junio 2026)
- **Onboarding con Test de Perfil de Líder** — BFI-44 (John & Srivastava, 1999) traducido al español. Versión Senior (44 preguntas) y Junior (20 preguntas, lenguaje simplificado). Calcula Big Five → mapea a 5 pilares del Big Leader Model (Yo=C, Norte=O, Vínculo=A, Acción=E, Legado=ES). Llama a Claude API para generar descripción personalizada en JSON. Guarda en `profiles.leadership_profile` + tabla `leadership_assessments`. Gate en proxy.ts: estudiante sin onboarding → redirige a `/onboarding/test`.
- **Sección "Aprendizaje Personalizado" en landing** — Entre Metodología y Valores. Parte 1: header con eyebrow pill + título + subtítulo + 3 pasos con animación stagger x-spring. Parte 2: 5 cards de arquetipos en grid 3+2 centrado con pentagon SVG 120px único por arquetipo, expandibles con AnimatePresence height 0→auto spring, fortalezas/áreas en pills, dimming de cards no seleccionadas. `React.memo` en la sección completa. `src/components/AprendizajeSection.tsx`.
- **Dashboard personalizado con perfil de líder** — Identity card reemplaza el user-header: split izquierda (avatar + nombre + track badge + arquetipo en Instrument Serif italic) / derecha (pentagon SVG compacto 160×160 estático con fortalezas en teal y áreas en accent). 5 pillar pills debajo del KPI bento con progreso de módulos por pilar (color semántico: teal=fortaleza, accent=área de crecimiento, mute=neutral). Badges "Tu fortaleza" / "Área clave" en cada módulo del grid. Todo oculto graciosamente si no hay `leadership_profile`.
  - `src/lib/bigFiveQuestions.ts` — BFI-44 questions, `calcBigFive()`, `getArchetype()`, `getPillarScores()`, `getStrengths()`, `getGrowthAreas()`
  - `src/app/api/leadership/assess/route.ts` — Route Handler autenticado: calcula scores, llama Claude sonnet-4-6, guarda en Supabase
  - `src/app/onboarding/test/page.tsx` — Test page: una pregunta por pantalla, AnimatePresence transitions (x:±40 spring), progress bar, auto-advance 300ms, MOCK_MODE support
  - `src/app/onboarding/resultado/page.tsx` — Resultado ceremonial: pentagon SVG animado con pathLength, stagger 7 elementos, fortalezas vs áreas de crecimiento, CTA → /dashboard
  - `supabase/migrations/20260602000000_leadership_profile.sql` — Columnas `leadership_profile JSONB` + `onboarding_completed BOOLEAN` en profiles; tabla `leadership_assessments` con RLS; update existentes a TRUE

### Features Nuevas (Mayo 2026)
- **Línea del tiempo global** — `/timeline` público + `/coordinator/timeline` para gestión, embed en landing "Nuestra Historia"
- **Diploma / Certificación** — `/certificacion/[id]` con animación ceremonial, confetti, wax seal, print CSS
- **Metas Personales** — `/dashboard/goals`, plantillas del programa, XP al completar, visible para coordinador y admin
- **Reacciones en proyectos** — 5 emojis (🔥💡❤️👏⭐), toggle, tooltip con nombres, spring animation
- **Reporte PDF exportable** — jspdf-autotable, coordinador por colegio, admin todos los colegios
- **Calendario de eventos** — CSS Grid mensual, coordinadores crean eventos globales con título/descripción/ubicación/link
- **Anuncios** — Categorías (Operativo/Motivacional/Evento/Logro), global o por colegio, fecha de expiración, banner + bell + feed
- **Feed de actividad** — Global, infinite scroll, 6 tipos de eventos, filtros por tipo
- **Historias de éxito** — Nominación por estudiantes, publicación por coordinadores, masonry grid público, embed en landing
- **Perfil público estudiante** — `/dashboard/students/[id]`, XP, módulos, badges, proyectos
- **Notificaciones por email** — Resend + Supabase Edge Functions: proyecto enviado → coordinador, evaluado → estudiante, módulo publicado → expositor
- **Forgot password** — `/forgot-password` con resetPasswordForEmail
- **Cambiar contraseña** — En settings con verificación de contraseña actual
- **Eliminar cuenta** — Zona de peligro en settings, confirmación "ELIMINAR"
- **Términos y condiciones** — En `/submit/register`, campo guardian email para junior
- **Solicitar reintento quiz** — Estudiante solicita, coordinador aprueba en panel
- **Noticias leídas** — Badge "✓ Leído" en lista de artículos
- **Compartir noticias** — Web Share API con fallback clipboard
- **Breadcrumbs** — En rutas profundas de coordinator y dashboard
- **Paginación** — Admin panel y coordinator projects (20 por página)
- **Notificaciones persistidas** — notification_preferences JSONB en profiles
- **Video URL en proyectos** — Input YouTube/Vimeo con preview embed
- **Toolbar de formato** — Bold, italic, listas, heading, blockquote, links, undo/redo, word count

### Performance (Mayo 2026)
- **PageSpeed 98%** — Three.js migrado a OffscreenCanvas Web Worker, fuentes locales en public/fonts/, browserslistrc targeting modern browsers, reflow forzado eliminado
- **Fuentes locales** — Satoshi + Instrument Serif descargadas a public/fonts/, sin dependencia de CDN externo, font-display: swap en satoshi-700, font-display: optional en el resto
- **Three.js Web Worker** — GlobeWorker.ts corre en thread separado, hilo principal libre de 31s de trabajo WebGL

### Diseño y Animaciones
- **Motion design system** completo — spring presets, stagger intervals, duration scale, easing presets
- **Top 10 animaciones** implementadas — diploma entrance 3D, layoutId tabs, quiz question transitions, login card entrance, etc.
- **Audit completo de diseño** — 6 críticos, 13 importantes, 15 nice-to-have identificados y en proceso

### Features Nuevas (Mayo 2026 — Sesión 2)

**Landing Page:**
- **SchoolTicker** — ticker horizontal infinito de los 8 colegios, logos desde Supabase Storage bucket `school-logos`, CSS animation puro, dos filas velocidades distintas
- **HeroCollage** — cards flotantes países aliados con parallax al mouse, Framer Motion useMotionValue + useSpring, preparado para fotos reales (prop `photos?` opcional)
- **WorldMapPublic** — mapa mundial público con puntos aliados, arcos animados desde Colombia, partículas viajeras, stroke-dashoffset de entrada, en sección `#alianzas-globales`
- **Sección Historia** — split asimétrico 45/55 (`id="historia"`), watermark "2015", parallax sutil en scroll (`historiaTextY`), badges reconocimientos reales, `navMounted` guard
- **Sección Impacto en Números** — fondo `var(--ink)`, 4 stats: 876 estudiantes / 22 colegios / 10 países / meta 3300, counters `ImpactoNum` con duración y delay por stat, líneas separadoras `scaleY`
- **Sección Metodología** — bento asimétrico 4 componentes: Big Leader, Leader's Game, Great Venture, Kashi — `id="metodologia"`
- **Sección Valores** — 6 tiles 3×2 con blur-reveal stagger (`filter: blur(8px→0)`), hover CSS nativo, `id="valores"`
- **Navbar pill flotante** — fixed top-4, backdrop-blur, smooth scroll a todas las secciones, mobile drawer, 5 links: Historia · Impacto · Nuestra Red · Equipo · Noticias
- **Contenido real del PDF integrado** — misión, visión, historia, Luis Barrios (M.S. University at Buffalo, MIT, Javeriana), reconocimientos internacionales

**Dashboards:**
- **Rediseño visual completo** — 3 dashboards con sistema de diseño unificado: StatCards con borde semántico izquierdo 3px, Geist Mono para números, bento asimétrico layout
- **Gráficas con Recharts** — LineChart XP, RadialBar Leadership Path, BarChart Top 10 estudiantes, AreaChart actividad, charts 8fr/4fr asimétrico
- **KPI counters** — AnimatedNumber desde 0, stagger 80ms entre cards
- **Sidebar indicator** — `layoutId="sidebar-indicator"` spring entre items activos
- **Centro de Datos** `/coordinator/datos` y `/admin/datos` — 3 tabs: Resumen, Constructor de gráficas, IA Insights. Constructor: modo rápido + modo avanzado con filtros. Guardar dashboards en tabla `saved_dashboards` (Supabase). Export PNG y CSV. IA Insights: Claude API via Route Handler seguro, análisis automático + chat con datos, max 10 msgs/sesión
- **MOCK_MODE** — `src/lib/mockData.ts` con `MOCK_MODE` flag, datos hardcodeados para todos los dashboards: 10 estudiantes mock, 8 colegios, 10 proyectos, 7 módulos, feed actividad, metas, eventos, anuncios

**Componentes:**
- **StatCard rediseñado** — borde izquierdo 3px semántico, delta con ↑↓, hover translateY(-1px) spring
- **Badge rediseñado** — colores semánticos con nuevos tokens de color
- **AppSidebar** — 10 fixes: collapse Framer height auto, active color var(--accent), accesibilidad button/aria, overlay AnimatePresence, chevron spring, iconos outlined, bottom sticky fix, stagger entrada, labels 11px, tabular-nums en badges

**Bugs resueltos en Sesión 2:**
- **BUG 1** — Configuración coordinador redirigía al panel (causa: BUG 2)
- **BUG 2** — `profiles?select=full_name` → 400. Columna correcta es `display_name`. Reemplazado globalmente en 50+ archivos src/
- **BUG 3** — 400 en Supabase Storage logos. Fix: `logo_url` resuelto en fetch con `getPublicUrl()` si es filename, pass-through si es URL completa, iniciales si null

### Tokens CSS (globals.css — añadidos en Sesión 2)
```css
--accent-amber: #D4821A;
--accent-teal: #0F7B6C;
--accent-muted: #8C7B6E;
--shadow-card: 0 1px 3px rgba(13,13,13,0.06), 0 1px 2px rgba(13,13,13,0.04);
--shadow-raised: 0 4px 16px rgba(13,13,13,0.08), 0 2px 6px rgba(13,13,13,0.04);
--line-strong: rgba(13,13,13,0.14);
--surface-1: #FFFFFF;
--surface-2: var(--bg);
--surface-3: var(--bg-2);
/* [data-theme="dark"]: --surface-1: #1C1B19; --surface-2: #141412 */
```

### Features Nuevas (Mayo 2026 — Sesión 3)

**Landing Page — WorldMapPublic rediseñado:**
- **Page transitions** — implementadas con `next-view-transitions@0.3.5`. `<ViewTransitions>` wrappea `{children}` en `layout.tsx`. `::view-transition-old/new(root)` con `vt-fade-out`/`vt-fade-in`, 180ms out / 280ms in / translateY ±6px.
- **WorldMapPublic jerarquía visual completa** — rediseño total del mapa con sistema de capas SVG:
  - **6 layers de render** (el orden SVG determina z-index): base map → arcos → partículas → dots destino → líneas conectoras → Colombia al último
  - **3 pesos de arco** según importancia institucional: HIGH 1.8px/0.80 (España, EEUU, Canadá), MEDIUM 1.0px/0.45 (México, Venezuela, Brasil, Argentina, Francia), LOW 0.5px/0.25 (Guatemala, India)
  - **Colombia como elemento dominante**: `r=9`, `strokeWidth=2.5`, 2 pulse rings permanentes en loop con delay 0s/1s para efecto de irradiación, label `font-weight:700` encima del dot
  - **Tinte sutil en países conectados**: `rgba(192,57,43,0.04)` fill en los 10 países del programa, `rgba(192,57,43,0.04)` base más profundo en Colombia
  - **Z-index fix**: Colombia renderizado en Layer 6 (último en SVG tree) para quedar siempre encima de arcos y dots
- **Cards flotantes permanentes** (Sistema A) — España, EEUU, Canadá:
  - `position:absolute` dentro de `.wmp-map-wrap` (`position:relative`)
  - Posiciones ancladas geográficamente: EEUU `top:8%/left:16%`, Canadá `top:2%/left:24%`, España `top:10%/left:60%`
  - Contenido real: logros institucionales del programa (IB Americas Conference, Concordia University, Congreso Iberoamericano 3er lugar)
  - Líneas conectoras SVG dashed (`strokeDasharray:"4 4"`, `opacity:0.25`) desde card hasta dot
  - Spring entrance `delay: 2.0 + i*0.20` (después de que arcos y dots terminan)
  - `whileHover: {y:-2}` — nunca `box-shadow` en whileHover
- **Modal centrado en el mapa** (Sistema B) — 7 países restantes (México, Venezuela, Brasil, Argentina, Francia, Guatemala, India):
  - Click en dot → modal centrado dentro del contenedor del mapa (nunca `position:fixed`)
  - Overlay `position:absolute inset:0` con `display:flex` wrappea al modal para flex-centering
  - `e.stopPropagation()` en modal para no cerrar al clickearse
  - Cierre por: click en overlay, botón X con `whileHover:{rotate:90}`, tecla Escape con cleanup de event listener
  - Separación HIGH (floating cards) vs MEDIUM/LOW (modal): dots HIGH tienen `cursor:default` y no abren modal

**Bugs resueltos en Sesión 3:**
- **BUG SVG z-index** — Colombia tapado por arcos. Fix: reestructurar el árbol SVG para renderizar Colombia en último lugar. Los elementos SVG posteriores tienen z-index mayor.
- **BUG modal position:fixed** — el overlay cubría toda la página en vez de solo el mapa. Fix: cambiar de arquitectura sibling (overlay + modal como hermanos) a overlay wrapping modal. El overlay con `position:absolute inset:0` queda contenido en el mapa.
- **BUG cards fuera del mapa** — cards flotantes aparecían fuera del contenedor. Fix: confirmar que `.wmp-map-wrap` tiene `position:relative` y las cards son `position:absolute` dentro de él.
- **BUG profiles duplicate select** — `profiles?select=display_name,display_name` causaba 400. Fix: deduplicar columnas en queries.
- **BUG admin redirect** — admin redirect enviaba a `/dashboard` en vez de `/admin`. Fix en `proxy.ts`.
- **BUG sidebar coordinador** — desaparecía en rutas `/news`, `/success-stories`, `/announcements`, `/calendar`, `/report`. Fix en `layout.tsx` del coordinador.
- **BUG avatar coordinador** — mostraba "..." en lugar de iniciales cuando `display_name` es null. Fix con fallback a iniciales de email.
- **BUG ProjectCard whileHover boxShadow** — Framer Motion no anima box-shadow correctamente. Fix: mover sombra a CSS estático, `whileHover` solo con `y` y `scale`.

---

## Bugs Resueltos

### Deploy / Supabase
- **sb_publishable_ como URL** — La integración Supabase-Vercel sobreescribió variables de entorno. Solución: eliminar variables automáticas de la integración, dejar solo las manuales correctas
- **createBrowserClient a nivel de módulo** — 3 archivos tenían Supabase inicializado fuera de función/useRef. Fixed: coordinator/projects/[id]/evaluate, dashboard/projects/[id]/edit, news/[slug]
- **Middleware en ubicación incorrecta** — Era `src/lib/middleware.ts`, Next.js requiere `src/middleware.ts`. El proyecto usa `src/proxy.ts` por convención
- **URL de Supabase con espacio** — Al copiar manualmente quedó `hkqzofpaoze cjvfsmdumm` en vez de `hkqzofpaozecjvfsmdum`
- **Buckets de Storage faltantes** — `project-images`, `project-pdfs`, `news-images` no existían. Creados con RLS

### Framer Motion
- **Target ref not hydrated** — Framer Motion v12 lanza error si useScroll recibe un ref con .current null durante SSR. Fix: mounted guard en todos los componentes que usen useScroll({ target: ref }). Ver convención en CLAUDE.md.
- **experimental.optimizeCss crasheaba** — critters activa un SSR pass extra que expone el bug de Framer Motion. Removido de next.config.mjs.
- **boxShadow en whileHover** — Framer Motion interpola box-shadow incorrectamente. Regla: box-shadow solo en CSS estático, nunca en propiedades animadas de FM.

### Three.js / Globe
- **CDN UMD deprecado** — three@0.160.0/build/three.min.js deprecado en r160. Migrado a `import * as THREE from 'three'` (npm ES Module)
- **transferControlToOffscreen doble** — React StrictMode monta componentes dos veces. Fix: guard `transferred.current` en GlobeCanvas.tsx
- **Textura nocturna como textura principal** — earth-night.jpg estaba en map en vez de emissiveMap. Fix: earth-day como map, earth-night solo en emissiveMap
- **Orientación incorrecta** — Globo iniciaba mirando África. Fix: `globe.rotation.y = Math.PI * 0.55`

### TypeScript
- Múltiples `implicit any` en callbacks de `.map()` y `.forEach()` — resueltos con tipos explícitos
- `npx tsc --noEmit` limpio en todos los pushes posteriores

---

## Decisiones de Arquitectura

### Por qué OffscreenCanvas + Web Worker para el globo
Three.js en el hilo principal causaba 31 segundos de trabajo bloqueante que PageSpeed penalizaba duramente (54%). Al mover el render loop a un Web Worker con OffscreenCanvas, el hilo principal queda libre y PageSpeed subió a 98%. El fallback en GlobeFallback.ts cubre Safari < 16.4 que no soporta OffscreenCanvas.

### Por qué proxy.ts en vez de middleware.ts
El proyecto fue configurado con un middleware personalizado llamado `proxy.ts` que exporta `proxy`. Next.js detecta ambos y falla el build si existen simultáneamente. Siempre usar `proxy.ts`.

### Por qué lazy-init con useRef
`createBrowserClient()` llamado a nivel de módulo falla en Vercel porque las variables de entorno `NEXT_PUBLIC_*` no están disponibles durante el prerender estático. El patrón useRef garantiza que solo se inicializa en el cliente, después del mount.

### Por qué no shadcn/MUI/Radix
El proyecto tiene su propio sistema de diseño basado en CSS variables. Librerías externas romperían la consistencia visual y añaden dependencias innecesarias.

### Por qué Resend para emails
Supabase Auth tiene SMTP propio pero con límites bajos (3/hora en free tier). Resend da 3,000 emails/mes gratis y tiene una API simple compatible con Deno (Edge Functions).

### Por qué fuentes locales en vez de CDN
Fontshare CDN añadía 370ms al LCP y las fuentes tenían caché de solo 7 días. Las fuentes locales en public/fonts/ con Cache-Control immutable eliminan la dependencia externa y la latencia de conexión.

### Por qué WorldMapPublic usa 6 layers SVG
El orden de renderizado en SVG determina el z-index (sin propiedad z-index en SVG). Al separar en 6 layers (base → arcos → partículas → dots → conectores → Colombia), Colombia siempre queda encima de todo lo demás. Antes del fix, Colombia era tapado por los arcos porque se renderizaba antes.

### Por qué el modal del mapa usa overlay como wrapper (no position:fixed)
Si el overlay es `position:fixed`, cubre toda la página. Como el overlay wrappea al modal con `position:absolute inset:0` dentro de `.wmp-map-wrap` (`position:relative`), el overlay queda contenido exactamente en el mapa. El modal se centra con flexbox del overlay. `e.stopPropagation()` en el modal evita que clicks en el modal cierren el overlay.

---

## Tablas en Base de Datos

### Originales
`schools`, `profiles`, `coordinator_codes`, `expositor_codes`, `modules`, `questions`, `progress`, `xp_log`, `video_progress`, `badges`, `user_badges`, `quiz_attempts`, `quiz_answers`, `projects`, `project_images`, `project_likes`, `project_comments`, `coordinator_notes`, `capstone_evaluations`, `news`, `team_messages`, `team_projects`, `team_project_members`

### Añadidas en Mayo 2026
`timeline_events`, `quiz_retry_requests`, `news_reads`, `notification_preferences` (columna en profiles), `goals`, `goal_templates`, `project_reactions`, `calendar_events`, `announcements`, `announcement_reads`, `activity_feed`, `success_stories`

### Añadidas en Sesión 2
`saved_dashboards` — `id`, `user_id`, `name`, `config` (jsonb), `created_at` — RLS: `user_id = auth.uid()` para SELECT / INSERT / DELETE

---

## Archivos Clave

| Archivo | Descripción |
|---|---|
| `src/lib/mockData.ts` | `MOCK_MODE` flag + todos los datos mock (estudiantes, colegios, proyectos, módulos, feed, metas, eventos, anuncios) |
| `src/components/GlobeHero.tsx` | Landing page completa — Hero, Misión, Visión, Historia, Impacto, Metodología, Valores, Equipo, navbar pill |
| `src/components/SchoolTicker.tsx` | Ticker horizontal colegios — logos desde Supabase Storage `school-logos` |
| `src/components/HeroCollage.tsx` | Collage países hero derecho — parallax mouse con Framer Motion |
| `src/components/WorldMapPublic.tsx` | Mapa mundial landing — 6 layers SVG, cards flotantes España/EEUU/Canadá, modal para 7 países red |
| `src/components/AnimatedNumber.tsx` | Counter animado desde 0 con easing cúbico |
| `src/components/datos/DatosPage.tsx` | Centro de datos compartido — 3 tabs: Resumen, Constructor, IA Insights |
| `src/app/coordinator/datos/page.tsx` | Centro de datos coordinador |
| `src/app/admin/datos/page.tsx` | Centro de datos admin |
| `src/app/api/ai/insights/route.ts` | Route Handler Claude API — análisis automático + chat con datos |

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Landing pública (GlobeHero) |
| `/dashboard` | Dashboard estudiante |
| `/coordinator` | Panel coordinador |
| `/coordinator/datos` | Centro de datos coordinador |
| `/admin` | Panel super admin |
| `/admin/datos` | Centro de datos admin |
| `/expositor` | Panel expositor |
| `/dia-de-liderazgo` | Evento especial (countdown + info) |
| `/certificacion/[id]` | Diploma animado estudiante |
| `/success-stories` | Historias de éxito públicas |
| `/news` | Blog de noticias |
| `/timeline` | Línea del tiempo pública |

---

## Pendiente

### Antes del lanzamiento
- [ ] Fix diseño dark mode — skeletons, hardcoded colors, success-stories page
- [ ] Announcement banner + bell en /dashboard (feature half-built)
- [ ] Fix coordinator nav overflow (10 items)
- [ ] Agrupar sidebar en "Comunidad" (Feed, Historias, Anuncios)
- [ ] Fix reacciones zero-count (mostrar solo si hay reacciones)
- [ ] Fix nomination button (no reemplazar "Ver proyecto")
- [ ] Fix calendar cells en mobile (aspect-ratio)
- [ ] Remover stats hardcodeados (42 Streak, 2.4k Network) del dashboard
- [ ] Fix "Next Lesson →" button (no tiene acción)
- [ ] Probar pipeline de emails end-to-end
- [ ] Ejecutar SQL migration features_v2 en Supabase
- [ ] PageSpeed 98% → quedan reflow forzado y polyfills menores (no crítico)

#### Añadidos en Sesión 2
- [ ] Conectar `MOCK_MODE = false` cuando Supabase tenga datos reales
- [ ] API key `ANTHROPIC_API_KEY` en variables de entorno Vercel
- [ ] Ejecutar SQL: migración `saved_dashboards` en Supabase
- [ ] Imágenes reales en `/public/images/`: `historia-graduacion.jpg`, `luis-barrios.jpg`, `metodologia-taller.jpg`
- [ ] Fotos reales en HeroCollage (prop `photos` cuando estén en Storage)
- [x] Fix error 400 logos Supabase Storage en SchoolTicker *(resuelto — `getPublicUrl()` en fetch)*
- [x] Fix configuración coordinador redirige al panel *(resuelto — causado por BUG 2)*
- [x] Fix `profiles.full_name` → columna correcta es `display_name` *(resuelto — reemplazo global en 50+ archivos)*

#### Añadidos en Sesión 3
- [ ] `MOCK_MODE = false` cuando Supabase tenga datos reales (pendiente de datos)
- [ ] `ANTHROPIC_API_KEY` en variables de entorno Vercel
- [ ] Imágenes reales: `historia-graduacion.jpg`, `luis-barrios.jpg`, foto del programa
- [ ] `/dashboard/modules` — página lista para estudiantes
- [ ] `/coordinator/projects/[id]` — vista detalle de proyecto para coordinador
- [ ] Anti-tab-switch en quiz — detectar cambio de tab durante el quiz
- [ ] FAQ accordion en landing
- [ ] CTA final + footer en landing
- [ ] Sección Testimonios con Jonathan Smith quote
- [ ] Sección Validaciones Internacionales en landing
- [ ] Sección 4 Componentes del Programa en landing
- [ ] topojson bundleado localmente en WorldMapPublic (eliminar fetch a CDN en runtime)
- [ ] Error boundaries en 3 dashboards (student, coordinator, admin)
- [ ] Colores hardcodeados en coordinator/feed y admin — reemplazar con CSS variables
- [x] Fix Colombia tapado por arcos *(resuelto — render order SVG Layer 6)*
- [x] Fix modal fuera del contenedor del mapa *(resuelto — overlay como wrapper con position:absolute)*
- [x] Fix cards flotantes fuera del mapa *(resuelto — position:absolute dentro de position:relative)*
- [x] Fix profiles duplicate select *(resuelto — deduplicar columnas en query)*
- [x] Fix admin redirect *(resuelto — proxy.ts corregido)*
- [x] Fix sidebar coordinador desaparecía en rutas adicionales *(resuelto — layout.tsx)*
- [x] Fix avatar coordinador mostraba "..." *(resuelto — fallback a iniciales de email)*
- [x] Fix ProjectCard whileHover boxShadow *(resuelto — sombra a CSS estático)*

### Contenido (esperando al fundador Luis Barrios)
- [ ] Stats reales "Sobre Nosotros" (actualmente placeholders en aboutStats)
- [ ] Foto o rediseño sección "Sobre Nosotros"
- [ ] Texto real "Nuestra Historia"
- [ ] Red de alumni (nombre específico del programa pendiente)

### Post-lanzamiento
- [ ] Internacionalización — español, inglés, francés, portugués (next-intl)
- [ ] Dominio propio (subdominio del colegio — configurar CNAME en DNS)
- [ ] Reactivar confirmación de email
- [ ] Rate limiting y CSP headers
- [ ] Sanitización editor de noticias
- [ ] Noticias destacadas en landing
- [ ] Programar publicación de noticias
- [ ] Expositor sidebar completo (Team Hub, comunidad)
- [ ] Segunda revisión admin capstones (UI completa)
- [ ] Globe rediseño visual completo (atmósfera Fresnel, arcos animados, marcadores ámbar)

---

## Variables de Entorno Vercel
```
NEXT_PUBLIC_SUPABASE_URL=https://hkqzofpaozecjvfsmdum.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (legacy anon key de Supabase)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (legacy service_role key de Supabase)
ANTHROPIC_API_KEY=sk-ant-... (para IA Insights en /datos — Route Handler server-side)
```

**Importante:** Usar siempre las "Legacy anon, service_role API keys" de Supabase, NO las nuevas "Publishable/Secret keys" que tienen formato `sb_publishable_...`. Las nuevas keys no son compatibles con `@supabase/ssr`.

---

## Contactos del Proyecto
- **Fundador / Admin:** Luis Barrios
- **Coordinadores principales:** Samuel, JuanFelipe, Alejandro
- **8 colegios participantes** en La Guajira, Colombia
