# context.md — Big Family Platform — Decision Log

## Last updated: Junio 2026 (Sesión 5)

---

## Features Completas

### Core Platform
- **Auth completo** — Google OAuth + email/password, forgot password, confirmación de email desactivada intencionalmente (ver Sesión 23 — el registro por código de colegio es el gate real de pertenencia), roles por código de acceso
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
- **The Great Venture (Mapa Hoshin Kanri)** — Wizard de 5 pasos + mapa radial SVG animado. `great_ventures` table (meta_nucleo, creencias, paradigma, equipo JSONB, planes JSONB). Wizard fullscreen overlay (z-index 200) con segmented progress bar + AnimatePresence x-transitions + autosave debounce 800ms + títulos adaptativos por arquetipo. Mapa: Editorial Luxury, fondo var(--bg) crema, card blanca con dot grid, SVG viewBox 800×600 con elipse central #C0392B + 4 rects satélite (Creencias/Paradigma/Planes/Equipo), pathLength 0→1 para líneas bezier, scale spring para nodos, memo'd MapSVG, panel deslizable x:320→0 light theme, export PNG html2canvas. DESIGN_VARIANCE:8. AppSidebar: ícono compass + badge "✓"/"Pendiente". StudentProfileClient: columna GV. MOCK_MODE completo.
  - `supabase/migrations/20260602100000_great_venture.sql`
  - `src/app/dashboard/great-venture/page.tsx` — wizard
  - `src/app/dashboard/great-venture/mapa/page.tsx` — mapa SVG
- **Personalización de módulos** — Route Handler `/api/modules/personalize` (mock cuando no hay ANTHROPIC_API_KEY, stub listo para Claude). `ModulePersonalization.tsx` con 4 secciones: intro (Instrument Serif italic, border-left por pilar fortaleza/crecimiento), reflexiones (3 preguntas numeradas + textarea), entregable (card bg-2 + textarea + botón guardar), autoevaluación (4 escala 1-4 pills spring + completar → Supabase). Caché en localStorage por módulo+usuario. Integrado en `modules/[id]/page.tsx` — intro antes del video section, secciones 2-4 después. Solo visible si tiene `leadership_profile`. `module_personalizations` table con UNIQUE(user_id, module_id).
- **Hub de Notificaciones** — Panel deslizante `NotificationDrawer.tsx` (x:380→0 spring, overlay backdrop, AnimatePresence). Tabla `notifications` (user_id, type, title, body, link, read). Supabase Realtime para INSERT en tiempo real. Agrupación por Hoy/Ayer/Esta semana/Antes. Border-left por tipo (announcement=accent, project_evaluated=teal, etc.). `createNotification.ts` + `createNotificationBatch.ts` helper. Integrado en dashboard (reemplaza bell→announcements), coordinator, admin. Notificaciones generadas automáticamente en: coordinator crea anuncio, aprueba/rechaza proyecto, aprueba reintento quiz. MOCK_MODE: 5 notificaciones mock de distintos tipos.
- **Página Kashi** — `/dashboard/kashi` iframe de `luishernandobarrios.com/kashi/splash` (verificado: sin X-Frame-Options ni CSP frame-ancestors). Header con eyebrow + "Kashi / luna en wayuu" + descripción + badge "Desarrollado por Luis Barrios". Loading skeleton con spinner mientras carga. Link externo al pie. Sidebar: ícono moon + badge "Nuevo" teal hasta 2026-07-03. Landing Kashi card: botón "Explorar Kashi →" outline accent en la carta de metodología.
- **Dark mode completo** — Reemplazos sistemáticos de colores hardcodeados por CSS variables en 11 archivos. Críticos: diploma loading/skeleton/card/page bg, verify loading/page/card, submit/project bg, submit/register terms. Importantes: login/register/forgot-password card+inputs+buttons+labels, GlobeHero equipo section+dm-panel+sc-dp+pill-nav, coordinator/news todos los elementos, coordinator/modules empty state, news/page.tsx todos los elementos. Patrón: #FAF8F4→var(--bg), #fff→var(--card-bg), #0D0D0D→var(--ink), #6B6B6B→var(--mute), rgba(13,13,13,.X)→var(--line)/var(--card-border).
- **Seguridad completa** — Audit de 12 issues resueltos. 🔴 XSS en NewsEditor: DOMPurify (isomorphic-dompurify) en save + dangerouslySetInnerHTML, MIME validation 5MB en uploads. Rate limiting in-memory (rateLimit.ts): 3/h assess, 20/h personalize, 10/h insights. Security headers en next.config.mjs: CSP + HSTS + X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy. 🟡 Auth en /api/modules/personalize + /api/ai/insights. Error messages genéricos (no exponen detalles internos). RLS migration 20260603200000_rls_fixes.sql: activity_feed/calendar_events/project_reactions con políticas más estrictas. 🟢 GlobeFallback: DOM API para img (no innerHTML). Verify: ilike fallback removido (collision risk). Proxy: onboarding null → false. BigFive: validación 1-5 en answers.
- **Mobile polish completo** — Audit de 32 issues resueltos. Críticos: GlobeHero @480px mision__stats 1-col + bento tablet 2-col (min-width:769px), equipo cards padding 24px 20px; dashboard identity-right width:auto max-width:220px; portafolio mapa SVG minWidth:600→0 + card padding mobile; diploma @480px padding + firma row stack; alumni grid 3→2→1 cols; arquetipos sp-grid tablet 2-col; FounderSection avatar 120px @480px; onboarding test safe-area dots + ob-junior-faces max-width + ob-main-area padding.
- **Portafolio público del estudiante (FASE 3)** — Layout Magazine Editorial: sidebar 320px sticky con pentagon 160px, stats con Counter animado, cert compacta con QR 48px, logos acreditaciones a color, acciones (PDF/compartir/editar privacidad si es owner). Contenido scrolleable max-width 860px: hero libre, capstone border-left accent, GV grid 2×2 (creencias/paradigma/equipo/planes), universidades 3 cols sin card wrapper, export dark. `gvCreencias` y `gvParadigma` añadidos a `PortfolioData` y fetch GV. `isOwner` state para mostrar "Ver mapa completo →" y "Editar privacidad →". — `/p/[username]` pública sin auth. 7 secciones: identidad (avatar+nombre+arquetipo+pentagon), certificación con QR 56px + link /verify, capstone con IDEMR pills, estadísticas 2×2, Great Venture, 12 universidades (CommonApp/UCAS/ESADE/Concordia + 8 colombianas), export PDF jsPDF formato Common App. Migration: `username`, `portfolio_public`, `portfolio_show_*` en profiles. `src/lib/username.ts` con `generateUsername()`. Settings: nueva sección "Portafolio" con 4 toggles autosave + URL readonly + copy link + "Ver portafolio" button. Dashboard: link "Ver mi portafolio público" bajo identity card (o mensaje si privado).
- **Diploma con arquetipo + QR verificable** — `/certificacion/[id]` ahora incluye: arquetipo del líder en Instrument Serif italic accent debajo del nombre; mini pentagon 40×40px + "PERFIL DE LÍDER" en la franja de validaciones; cert number formato `CERT-2026-XXXX · VISIONARIA`; QR code 64×64px generado con `qrcode` (import dinámico) al lado del sello. `makeCertId(userId, date)` = `BF${year}${uuid8}`. Certs registrados en `issued_certificates` (lookup table). Verificaciones logueadas en `certificate_verifications`.
- **Página de verificación pública** — `/verify/[certId]` pública (sin auth). Decodifica certId → busca en `issued_certificates` → fallback UUID prefix search. Diseño Editorial institucional DESIGN_VARIANCE:9, similar a verificación Harvard/ESADE. Eyebrow pill verde/rojo, datos del estudiante, logos en grayscale, footer con fecha de verificación y texto legal.
- **Sección "Aprendizaje Personalizado" en landing** — Entre Metodología y Valores. Parte 1: header + 3 pasos stagger. Parte 2: 5 cards fijas (tamaño constante, nunca se expanden) en grid 3+2 con pentagon 120px + stagger. Click → panel debajo del grid completo con AnimatePresence mode="wait", height 0→auto + opacity spring 200/25. Panel: split 40/60 — izquierda pentagon 200px + nombre + fortalezas/áreas pills, derecha descripción + módulos clave + box ejemplo + CTA. Botón X con rotate:90° spring. Cards: `animate={{ opacity, scale }}` para active/dimmed. `React.memo`. `src/components/AprendizajeSection.tsx`.
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
- **Navbar pill flotante** — Extraído a `src/components/PublicNavbar.tsx` como componente único reutilizable. fixed top-4, backdrop-blur, smooth scroll a `#impacto` en landing (no-op en otras rutas), mobile drawer, 6 links: Historia · Impacto · Metodología · Nuestra Red · Equipo · Noticias. Toggle dark/light incluido. Usado en: GlobeHero (landing), /news, /news/[slug], /timeline, /success-stories, /success-stories/[id]. Excluidos por diseño: /dia-de-liderazgo (nav temática oscura del evento), /verify/[certId] (standalone sin nav), /p/[username] (sidebar propio).
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

### Por qué se eliminó el globo 3D (Sesión 18)
El sistema Globe3D (Three.js + OffscreenCanvas + Web Worker: `Globe3DHero.tsx`, `Globe/Globe3DCanvas.tsx`, `Globe/Globe3DWorker.ts`, `Globe/Globe3DFallback.tsx`) fue eliminado completamente. Razones: (1) bug de océanos negros nunca resuelto, (2) arquitectura compleja para un problema cosmético, (3) redundancia conceptual — el mapa mundial ya existe en `WorldMapPublic.tsx` más abajo en la misma landing. Reemplazado por `HeroArc.tsx`, que usa solo SVG + Framer Motion.

**Nota:** `Globe/GlobeCanvas.tsx`, `Globe/GlobeWorker.ts`, `Globe/GlobeFallback.ts` (sin prefijo Globe3D) se conservan — los usa `WorldMapPublic.tsx`.

### Por qué OffscreenCanvas + Web Worker para el mapa mundial (histórico)
Three.js en el hilo principal causaba 31 segundos de trabajo bloqueante que PageSpeed penalizaba duramente (54%). Al mover el render loop a un Web Worker con OffscreenCanvas, el hilo principal queda libre y PageSpeed subió a 98%. El fallback en GlobeFallback.ts cubre Safari < 16.4 que no soporta OffscreenCanvas. Esto aplica hoy solo a `WorldMapPublic.tsx`.

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

### Contacto de acudiente para estudiantes junior (Sesión 20)

`guardian_email` en `profiles` es prerequisito del flujo de consentimiento para el test de perfil de liderazgo (onboarding BFI-44). Sin este dato, el test se generaba sin consentimiento de ningún adulto responsable para niños de grado 2°-7°.

**Definición confirmada por el fundador**: Junior = grados 2°-7°. Senior = grados 8°-11°.

**Cambio de UI**: el flujo de registro ya tenía tarjetas "Junior Leader / Senior Leader" de auto-reporte. Esas tarjetas se reemplazaron por una grilla de grados 2°-11° agrupados en dos filas (Junior / Senior). El nivel se deriva automáticamente del grado — el estudiante no elige el track, elige su grado real.

**Guardado**: columnas `grade SMALLINT` y `guardian_email TEXT` en `profiles` (migration 20260722000000). Ambas nullable para no romper registros existentes. Validación obligatoria solo a nivel de aplicación para registros nuevos.

**Flujos cubiertos**: `/register` (email/password + Google OAuth) y `/submit/register` (Día de Liderazgo). Para Google OAuth, `guardian_email` se captura antes del redirect y viaja como query param al callback; el botón de Google queda deshabilitado mientras el campo esté vacío para juniors.

**Retroactividad**: los estudiantes junior ya registrados no quedan bloqueados — no hay validación en proxy ni dashboard. Pedirlo retroactivamente es decisión de producto separada, no implementada.

**Próximo paso**: usar `guardian_email` como gate en el onboarding del test — mostrar pantalla de consentimiento antes del BFI-44, con notificación al acudiente si el campo está disponible.

### Portafolio privado por defecto para estudiantes junior (Sesión 21)

Hallazgo del audit legal (`legal/drafts/02-politica-tratamiento-datos.md`, gap del portafolio público): `portfolio_public` tenía `DEFAULT TRUE` a nivel de columna (migration `20260602300000_portfolio.sql`), sin distinguir edad — un estudiante de grado 3° quedaba con su perfil de liderazgo público exactamente igual que uno de grado 11°, sin que nadie lo hubiera decidido activamente.

**Regla confirmada por el fundador**: Junior (grados 2°-7°) = portafolio **privado por defecto**. Senior (grados 8°-11°) = portafolio **público por defecto** (sin cambios). El corte reutiliza la misma lógica junior/senior de la Sesión 20 (`grade >= 2 && grade <= 7`), no una línea nueva.

**Implementación**: `portfolio_public: !junior` (o `!isJunior` en el callback route) añadido en los 3 puntos donde se crea el profile — `register/page.tsx`, `submit/register/page.tsx`, `auth/callback/route.ts`. No hay trigger ni función de Supabase que cree profiles; los 3 insert están en código de aplicación.

**El toggle manual en Ajustes → Portafolio sigue funcional para todos los niveles sin distinción** — un junior puede poner su portafolio en público desde su propia configuración, sin aprobación del acudiente. Decisión de producto explícita: el default protege, no restringe la agencia del estudiante.

**Migración retroactiva**: `supabase/migrations/20260805000000_junior_portfolio_private_default.sql` — pone `portfolio_public = false` para todos los profiles con `grade` 2-7 que no estuvieran ya en `false`. Se aplica sin excepción porque `profiles` no tiene `updated_at` ni ningún log de cambios de configuración — no hay forma de distinguir "nunca tocó el toggle" de "lo puso en público a propósito", y proteger datos de menores por defecto pesa más que preservar un estado que pudo haber sido accidental desde el origen.

**⚠️ Bloqueado — verificar antes de dar por resuelto**: al intentar ejecutar la migración retroactiva contra la base real (vía service role key), Supabase devolvió `column profiles.grade does not exist`. Esto significa que la migración anterior de la Sesión 20 (`20260722000000_guardian_email.sql`, que añade `grade` y `guardian_email`) **nunca se aplicó a la base de datos de producción** — solo existe como archivo en el repo. Las migraciones de este proyecto no corren automáticamente (no hay `DATABASE_URL` ni Supabase CLI configurado); alguien debe pegarlas manualmente en el SQL Editor de Supabase. **Pendiente**: correr en orden en el SQL Editor: (1) `20260722000000_guardian_email.sql`, (2) `20260805000000_junior_portfolio_private_default.sql`. Hasta entonces, el gate de nivel funciona en el código pero `grade`/`guardian_email`/la corrección retroactiva de `portfolio_public` no existen en producción.

### Bug crítico: usuario/profile borrado con sesión activa mostraba dashboard sin expulsar (Sesión 22)

**Reporte**: se borraron 3 usuarios directamente en Supabase (Auth + profiles). El navegador con sesión activa de uno de ellos, al recargar `/dashboard`, no fue expulsado — mostró el dashboard con el nombre "Valentina Torres Ospino" (dato hardcodeado en `mockData.ts`). Se sospechó un patrón de "fallback silencioso a mock cuando el fetch real falla o vuelve vacío" — un error más grave que un flag mal puesto, porque implicaría que cualquier fallo real de red o de Supabase mostraría datos de otra persona sin ninguna señal de error.

**Investigación (`grep -rn "MOCK_MODE\|MOCK\." src/app/dashboard/ src/components/`)**: revisados todos los usos de `MOCK`/`MOCK_MODE` en dashboard de estudiante, coordinador (`CoordinatorClient.tsx`+`coordinator/page.tsx`), admin (`admin/page.tsx`), expositor (`expositor/page.tsx`) y componentes compartidos (`AppSidebar.tsx`, `NotificationDrawer.tsx`, `datos/DatosPage.tsx`, `SuggestionsPanel.tsx`). **No se encontró el patrón sospechado** (`if (error || !data) { usar mock }`) en ningún archivo — todo uso de `MOCK.*` está gateado por un `if (MOCK_MODE)` explícito y global al inicio del fetch, tal como documenta CLAUDE.md. `expositor/page.tsx` ya tenía el patrón correcto de siempre (chequea auth real primero, `if (!profile || profile.role !== 'expositor') → redirect`, independiente de MOCK_MODE).

**Causa real, más simple y más grave de lo sospechado**: `MOCK_MODE = true` en `src/lib/mockData.ts` — ese flag está en `true` en el código actualmente desplegado. El bloque `if (MOCK_MODE) { ...; return }` en `dashboard/page.tsx` se ejecuta **antes** de llamar siquiera a `supabase.auth.getUser()`, así que ningún usuario borrado (ni ningún usuario real, de hecho) llega nunca al chequeo de auth — todos ven "Valentina Torres Ospino" siempre, sin importar quién esté autenticado o si hay sesión. No es un fallback ante error: es el comportamiento explícito y documentado del flag, que sigue en `true` en producción.

**Gap secundario real (defensa en profundidad, sin relación con el síntoma reportado)**: con `MOCK_MODE = false`, `dashboard/page.tsx` no verificaba si `profileRes.data` venía `null` tras un `auth.getUser()` exitoso (sesión válida pero profile borrado después) — seguía renderizando con placeholders genéricos (`'Líder Big Family'`, 0 XP) en vez de expulsar a login. `dashboard/progreso/page.tsx` tenía el mismo hueco. `admin/page.tsx` sí redirigía, pero mandaba a `/dashboard` en vez de a login tanto para "sin profile" como para "rol incorrecto", sin distinguir los dos casos. Fix aplicado en los tres: si `profileRes.data` es null tras auth válido → `supabase.auth.signOut()` + `router.replace('/login?error=no_profile')` (mismo mensaje y query param que ya usa `proxy.ts` para el caso de OAuth sin profile). `coordinator/page.tsx` (server component) y `expositor/page.tsx` ya tenían el chequeo correcto, sin cambios.

**Hallazgo adicional, más urgente que el bug original**: al auditar la base real antes de considerar apagar `MOCK_MODE`, se encontró que **`profiles` tiene 0 filas** mientras `auth.users` tiene 11 cuentas reales (Luis Barrios, coordinadores, `samuelgomezm1509@gmail.com`, etc.). Ninguna cuenta real tiene profile. Apagar `MOCK_MODE` en este estado bloquearía a los 11 usuarios reales del acceso a la plataforma vía el mismo gate de `proxy.ts`/`dashboard/page.tsx` que se acaba de reforzar. **Decisión del fundador (Sesión 22): MOCK_MODE se mantiene en `true` por ahora** — no se apaga hasta resolver el backfill de `profiles` para las 11 cuentas reales, que es un problema independiente y más urgente (probablemente relacionado con que `20260722000000_guardian_email.sql` tampoco corrió — ver nota de la Sesión 21 arriba; hay que confirmar si ninguna migración de columnas en `profiles` se ha aplicado nunca contra la base real, o si el problema es más profundo, e.g. el trigger/flujo que debía crear esas filas nunca se ejecutó para estas 11 cuentas).

**Estado de `MOCK_MODE` tras este fix**: sigue en `true`. El fix de expulsión a login queda listo en el código para el momento en que se apague, pero no se pudo verificar en vivo (usuario de prueba + Playwright) porque hacerlo requería MOCK_MODE=false, y esta sesión decidió no tocar ese flag dado el hallazgo de `profiles` vacía. Verificar en vivo cuando se resuelva el backfill.

### Causa raíz y fix: registro por email no creaba profile (Sesión 23)

Investigación de por qué `profiles` estaba en 0 filas con 11 cuentas reales en `auth.users`. Descartada la hipótesis de un trigger de Supabase nunca aplicado: no existe ningún `CREATE TRIGGER`/`handle_new_user` en el repo — la arquitectura nunca dependió de un trigger, cada punto de registro hace un `INSERT` manual a `profiles` desde el código de aplicación. Tampoco hay un `CREATE TABLE profiles` en las migraciones versionadas: la tabla y sus políticas RLS se crearon a mano en el dashboard de Supabase, antes de que empezara el flujo de migraciones de este repo (la más antigua es del 22 de mayo).

**Causa raíz confirmada por reproducción en vivo (cuenta desechable, creada y borrada por la propia sesión de diagnóstico)**: dos problemas independientes, ambos necesarios para que el registro por email funcionara:

1. **"Confirm email" activo en el proyecto de Supabase** — contradice la nota anterior de este documento que decía "desactivada temporalmente" (nota desactualizada, corregida aquí). Sin confirmación, `supabase.auth.signUp()` no devolvía sesión activa de inmediato, así que el `INSERT` a `profiles` que sigue corría como `anon` sin autenticar. **Corregido**: el fundador desactivó "Confirm email" manualmente en el dashboard de Supabase (Ruta B de las dos evaluadas — se prefirió sobre construir un flujo de confirmación post-signup porque el código de colegio ya es el gate real de pertenencia, y coincidía con lo que el proyecto ya asumía como comportamiento intencional).
2. **`profiles` no tenía ninguna política RLS de `INSERT` funcional para el rol `authenticated`** — un problema totalmente independiente del anterior. Incluso con sesión activa y `auth.uid()` coincidiendo con el `id` insertado, el insert seguía siendo rechazado con `42501`. Corregido con `supabase/migrations/20260806000000_profiles_insert_policy.sql`, que agrega `CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)` — política aditiva y permisiva, no requiere conocer ni tocar las políticas ya existentes en la tabla.

Ninguno de los dos archivos de registro (`register/page.tsx`, `submit/register/page.tsx`) revisaba el `{error}` del insert — el fallo era 100% silencioso: el usuario veía "registro exitoso" y quedaba con una cuenta fantasma en `auth.users` sin fila en `profiles`. **Fix de Parte 1 (independiente de la causa raíz, ya aplicado)**: ambos archivos ahora capturan `{error: profileError}`, y si falla, cierran la sesión (`signOut()`) y muestran `errorProfileCreation` (nueva key i18n en los 5 locales, bajo `auth.register` y `submit.register`) en vez de dejar avanzar al usuario. Esto por sí solo ya frena la aparición de cuentas fantasma nuevas, incluso si la causa raíz de RLS/confirmación volviera a romperse en el futuro por cualquier otro motivo.

**Verificado en vivo, de punta a punta, tras ambos fixes**: `signUp()` devuelve sesión inmediata, el insert a `profiles` corre sin error, y una lectura independiente vía service role confirma la fila físicamente en la tabla. Verificación adicional con Playwright contra el formulario real (no vía API directa) en `/register`, clic por clic, para un caso senior (grado 10°) y uno junior (grado 5°): ambos crean su `profiles` row correctamente, incluyendo el campo `guardian_email` para el caso junior y `portfolio_public: false` derivado automáticamente. Cuentas de prueba desechables, borradas al terminar.

El flujo de Google OAuth (`auth/callback/route.ts`) nunca tuvo este problema — usa `createSupabaseAdminClient()` (service role), que ignora RLS por completo, así que no dependía de ninguno de los dos fixes.

### Backfill de las 11 cuentas huérfanas: se optó por reset completo en vez de backfill (Sesión 24)

Al presentar el mapeo correo→rol/colegio/nombre pedido para las 11 cuentas identificadas en la Sesión 22, se descubrió que el `full_name` en el `user_metadata` de 7 de ellas (Grupo A) no correspondía a la persona dueña del correo — venía con la clave `full_name` (no `display_name`), lo que apunta a que se crearon probando el formulario con una versión de código anterior al rename `full_name`→`display_name` documentado como bug histórico arriba. Antes de borrarlas se encontró que 4 de esas 7 sí tenían un `project` real asociado (uno con reflexión IDEMR completa y detallada, `APRENDER JUGANDO`; otro marcado como enviado formalmente con `submitted_at`) — se verificó con el fundador cuenta por cuenta antes de tocar nada, ya que el metadata sospechoso no era prueba suficiente de que el trabajo detrás fuera falso.

**Decisión final del fundador**: borrar las 11 cuentas por completo (incluida `luis.barrios@colegioalbania.edu.co` y los proyectos reales confirmados) y empezar de cero, en vez de backfillear. Motivo: con el registro ya arreglado (Sesión 23), es más simple que cada persona real se registre de nuevo por el flujo normal que reconstruir manualmente 11 perfiles con datos de un día de pruebas.

**Ejecutado**: borradas las 11 filas de `auth.users` y toda la data de prueba que las referenciaba — 4 `projects`, 1 `news` (borrador vacío nunca publicado), 2 `modules` + 1 `questions` (borradores vacíos de un expositor de prueba), reseteado `expositor_codes` (`EXPO-BF-2026`: `used: false, used_by: null`) para que quede disponible para un expositor real. Verificado: `auth.users` y `profiles` en 0 filas, plataforma en blanco limpio.

**Esto remueve el bloqueo que mantenía `MOCK_MODE = true`** (Sesión 22: "no se apaga hasta resolver el backfill de las 11 cuentas reales") — ya no hay cuentas huérfanas que se romperían al apagarlo. Sigue en `true` por ahora; apagarlo es una decisión aparte, no tomada en esta sesión.

### Fix dark mode audit — secciones "editorial dark" de GlobeHero.tsx ahora siguen el tema (Sesión 25)

Reporte: en modo claro, varias secciones de la landing se veían negras (mismo negro que en modo oscuro) mientras el resto de la página sí respondía al tema.

**Primer intento (incorrecto, revertido en la misma sesión)**: se interpretó que estas secciones eran "editorial dark" intencional (fondo negro deliberado con texto blanco en ambos temas, precedente de `--surface-inverse` ya usado en `cert-unlocked` del dashboard y en `.sec-impacto`/`.sec-valid`), y se formalizó ese comportamiento con el token en vez de con hardcode. El fundador corrigió: no, la intención real es que estas secciones respondan al tema como el resto del sitio — claras en modo claro, oscuras en modo oscuro — igual que `.sec-faq`/`.sec-prog`/`.sec-valores`, que ya seguían este patrón correctamente y sirvieron de referencia.

**Fix real**: las 9 secciones (`.mision`, `.vision`, `.sec-impacto`, `.sec-valid`, `.sec-cta` — la que el reporte llamaba "Hero" por error, en realidad es el CTA final "Tu liderazgo empieza aquí." —, `.bf-footer`, `.sec-test`, `.historia`, `.about-dark`) dejaron de usar `--surface-inverse`/hardcode y pasaron a los tokens normales que sí invierten con el tema: `background:var(--bg)` en vez de negro fijo, y cada texto que estaba en `#fff`/`rgba(255,255,255,X)` pasó a `var(--ink)`/`var(--ink-2)`/`var(--mute)` según su rol semántico, bordes/separadores a `var(--line)`/`var(--line-strong)`. `.historia`, `.about-dark`, `.sec-test` son CSS huérfano (ninguna ruta actual de `(landing)/` las renderiza, quedaron de un rediseño anterior) — se corrigieron igual por consistencia. Excepciones que se dejaron en blanco fijo a propósito: texto/badges que viven sobre un fondo de color sólido que no cambia con el tema (ej. `.about-dark__badge` sobre rojo acento, avatares, botones primarios rojos) — ahí `#fff` sigue siendo correcto en los dos temas.

`--surface-inverse` se queda como token (sigue usándolo `cert-unlocked` en el dashboard, caso legítimo de "elemento puntual siempre oscuro sobre cualquier fondo"), pero ya no se usa en ninguna sección de la landing — documentado el matiz en `CLAUDE.md`.

**Verificado con Playwright** (`localStorage.setItem('bf-theme', ...)` + screenshot por sección, luz y oscuro, dos rondas — antes y después de la corrección): las 6 secciones activas hoy en la landing (CTA, Impacto, Misión, Visión, Validación, Footer) confirmadas claras con texto oscuro en modo claro, y negras con texto claro en modo oscuro — igual que el resto del sitio. `Validación Internacional` incluso mejoró en dark mode: las cards ahora usan `var(--card-bg)` (gris oscuro sólido) en vez del `rgba(255,255,255,.04)` casi invisible de antes. `Equipo` confirmada sin cambios. Barrido completo de `(landing)/`, `PublicNavbar.tsx`, `WorldMapPublic.tsx` y demás componentes: sin más fondos hardcodeados fuera de `GlobeHero.tsx`.

### Legibilidad de los pentágonos de arquetipo en AprendizajeSection.tsx (Sesión 26)

Reporte confirmado con el fundador: los 5 pentágonos/radar de arquetipos (`/metodologia`, componente `AprendizajeSection.tsx`) eran ilegibles en su estado cerrado — cada pico del pentágono representa un pilar del Big Leader Model (Yo/Norte/Vínculo/Acción/Legado) y el tamaño del radar rojo la fuerza relativa del arquetipo en ese pilar, pero sin abrir el panel no había forma de saber qué pico era cuál.

**Fix en `ArchPentagon`** (componente compartido por la card cerrada y el panel expandido):
- Pentágono de la card: `size` 120px → 150px (radio del radar en unidades de viewBox 52 → 48, pero el tamaño físico neto sigue creciendo porque escala con `size`: ~39px → ~45px de radio real).
- 5 labels de pilar añadidas junto a cada vértice, ancladas por ángulo (mismo patrón radial ya usado en el mapa Hoshin Kanri para posicionar elementos alrededor de un centro): `textAnchor` `start`/`end`/`middle` según el signo del coseno del ángulo, offset vertical (`dy`) según el signo del seno. `<svg style={{overflow:'visible'}}>` para que las labels puedan extenderse más allá del viewBox nominal sin recortarse.
- Los 2 pilares "fuertes" de cada arquetipo (los mismos que ya se mostraban como pills debajo) se distinguen visualmente sin leer texto: label en `var(--accent-teal)` en vez de `var(--mute)`, y su punto en el radar más grande (`r=5` vs `r=3` en los otros 3).
- `showLabels` es un prop opcional (default `true`) — se activó tanto en la card cerrada como en el panel expandido (200px) para que el radar grande también quede autoexplicativo, no solo la card.
- Los pills de texto "Norte"/"Acción" debajo de cada card se mantuvieron intactos como refuerzo redundante, tal como se pidió — no se reemplazaron por las labels del SVG.

**Verificado**: `npx tsc --noEmit` limpio. Grid 3+2 sigue sin romperse con el pentágono más grande (probado 1280px, 700px tablet, 390px mobile — 1 columna en mobile, 2 en tablet, 3+2 en desktop, sin overlap ni recorte de labels en ningún breakpoint). Panel expandible al clic sigue funcionando igual, sin cambios en esa lógica. Confirmado en claro y oscuro.

### Contexto de pilares + scroll automático al abrir/cerrar el panel (Sesión 27)

Dos mejoras sobre el fix de legibilidad de la Sesión 26, mismo componente `AprendizajeSection.tsx`.

**1. Contexto para los pilares (subtítulo + tooltips):**
- Subtítulo nuevo bajo "¿Cuál tipo de líder eres tú?" explicando qué son los 5 pilares en una frase, key `landing.aprendizaje.pillarsSubtitle` (5 locales).
- Tooltip por pilar al hover/tap en cada label del pentágono, texto nuevo y más conversacional que el ya existente `dashboard.leadershipPathPage.pillarDescriptions` (no se reutilizó ese porque el tono/audiencia difiere — landing vs dashboard ya autenticado — y el prompt pidió texto específico para este caso). Nuevas keys: `landing.aprendizaje.pillarTooltips.{yo,norte,vinculo,accion,legado}` (mismos nombres de clave que `pillarDescriptions`, por consistencia), 5 locales.
- Implementación: estado `hoverKey` local en `ArchPentagon`, hit-circle transparente `r=13` sobre cada label (`pointerEvents:'all'`) con `onMouseEnter`/`onMouseLeave`/`onClick`. El `onClick` hace `e.stopPropagation()` — indispensable, si no cada tap en un label también dispara el `onClick` de la card padre y abre el panel de detalle sin querer.
- **Bug encontrado y corregido durante la verificación**: el `<m.div>` del tooltip usaba `animate={{opacity:1, scale:1}}` junto con un `style.transform` manual para el posicionamiento — Framer Motion compone `x/y/scale/rotate` en la propiedad `transform` del elemento y **sobreescribe silenciosamente cualquier `transform` manual** si el componente tiene esas props en `initial`/`animate`/`exit`. Resultado: el tooltip se renderizaba pegado a la esquina superior-izquierda de su ancla en vez de centrado/desplazado como se calculaba. Fix: se quitó `scale` de la animación (solo `opacity`, con spring en la transición — sigue sin ser un fade lineal), dejando el `transform` de posicionamiento intacto. Lección para futuras animaciones sobre elementos con posicionamiento manual: nunca mezclar `style.transform` propio con `x/y/scale/rotate` de Framer Motion en el mismo elemento.
- **Segundo bug encontrado (solo mobile)**: en touch, un tap dispara `touchstart → touchend → mouseenter → click` en la misma gestión — el `onClick` original hacía `toggle` (si ya estaba abierto para esa key, lo cerraba), pero como `mouseenter` ya lo había abierto milisegundos antes en la misma secuencia, el toggle lo cerraba inmediatamente después de abrirlo, netamente invisible. Fix: `onClick` ahora siempre *asigna* (`setHoverKey(v.key)`) en vez de alternar, y se agregó un auto-dismiss de 3s vía `useEffect` para que el tooltip no quede pegado en pantalla indefinidamente en touch (no hay `mouseleave` que lo cierre).
- **Tercer ajuste (solo mobile)**: con el pentágono casi a ancho completo en 1 columna, el tooltip posicionado a la izquierda/derecha del label se salía de la pantalla en los pilares laterales (Norte/Acción a la derecha). Fix: por debajo de 480px de viewport se fuerza el posicionamiento centrado arriba/abajo del label (`horiz:'center'`) en vez de izquierda/derecha, ya que solo necesita espacio vertical y ese sí sobra dentro de la card.
- Ancho del tooltip: se probó primero con `max-width:200px` sin `width` explícito — bug de layout: en un contenedor SVG de solo 150px, el algoritmo shrink-to-fit de CSS para elementos `position:absolute` calcula el ancho disponible ANTES de aplicar el `transform`, así que el tooltip se renderizaba angostísimo (una palabra por línea). Fix: `width:190px` fijo en vez de `max-width`.

**2. Scroll automático al abrir/cerrar el panel:**
- Al hacer clic en una card (con el panel cerrado): se guarda `window.scrollY` en un `ref` (`savedScrollY`), y un `useEffect` con `panelWrapRef.current?.scrollIntoView({block:'start'})` lleva la vista al panel automáticamente.
- Al cambiar de card con el panel ya abierto: el mismo efecto se vuelve a disparar (dependencia `[sel, pref]`) — actualiza contenido y vuelve a hacer scroll, sin tocar `savedScrollY` (para que "cerrar" siga volviendo al punto original, no al punto donde se cambió de card).
- Al cerrar (X o clic en la misma card activa): se restaura `window.scrollTo` a `savedScrollY` y se limpia el ref.
- `prefers-reduced-motion`: `behavior: pref ? 'auto' : 'smooth'` en ambos casos — salto instantáneo si está activo.
- **Bug evitado antes de shippear**: el panel usa `<AnimatePresence mode="wait"><m.div key={selected.id}>` — el nodo DOM se reemplaza por completo en cada cambio de card (unmount+remount por key). Poner el `ref` directamente en ese `m.div` habría hecho que `panelWrapRef.current` fuera `null` justo cuando el efecto necesita leerlo (la entrada nueva no monta hasta que la salida anterior termina su animación, por el `mode="wait"`). Fix: el `ref` vive en un `<div>` estático que envuelve todo el bloque `AnimatePresence`, nunca se remonta, así que siempre está disponible sin depender del timing de la animación de salida/entrada.

**Verificado con Playwright** (no solo visual — se leyó `window.scrollY` antes/después de cada acción): abrir card → scroll automático exacto al tope del panel (`panelBox.y ≈ 0`); cambiar de card con panel abierto → contenido actualizado, mismo scrollY (el panel siempre queda en el mismo lugar bajo el grid); cerrar → `scrollY` restaurado al valor exacto de antes de abrir. `prefers-reduced-motion` confirmado con salto casi instantáneo (< 300ms) en vez de animación suave. Tooltips confirmados en claro/oscuro, desktop (3 posiciones: arriba/izquierda/derecha) y mobile (tap-to-show, auto-dismiss, sin overflow de viewport, sin abrir el panel por accidente). `npx tsc --noEmit` limpio.

### Rediseño del panel expandido de arquetipos — padding y orden (Sesión 28)

Reporte: "VÍNCULO" (el label más largo del pentágono) se cortaba contra el borde izquierdo del panel expandido, y el botón X y el bloque "Ejemplo" se sentían pegados a los bordes. Causa raíz del corte: el pentágono (crecido a 200px en el fix de legibilidad de la Sesión 26) estaba flush contra el borde izquierdo de su columna — `.sp-panel__left` es un flex-column sin `align-items:center` ni wrapper propio, así que el pentágono se posicionaba al inicio del eje cruzado, sin margen para que el `overflow:visible` de sus labels respirara.

**Fix de columnas y pentágono**: ratio de `.sp-panel__inner` de `40% 60%` a `46% 54%`. Se agregó `.sp-panel__pent{display:flex;justify-content:center}` como wrapper dedicado del pentágono — mismo patrón que ya usa `.sp-card__pent` en la card cerrada — en vez de depender de alineación heredada del flex-column padre.

**Reorden de la columna izquierda**: nombre del arquetipo → subtítulo del rasgo → pentágono centrado → badges Fortalezas/A desarrollar. Antes el pentágono era el primer elemento; ahora el título ancla la columna desde arriba.

**Padding general**: `.sp-panel` de `40px` uniforme a `44px` (referencia: `.dm-panel` del modal de diploma en `GlobeHero.tsx` usa `36px 44px` para un patrón similar de panel-con-cierre). Botón de cerrar: de `top/right:16px` + `padding:6px` (hit area ~28px) a `top/right:20px` + `width/height:40px` con fondo `var(--bg-2)` que se oscurece en hover — más separación del borde y área de toque más cercana al mínimo de 44px recomendado.

**Bug real encontrado durante la verificación, no cosmético**: el fix de scroll automático de la Sesión 27 hacía `scrollIntoView({block:'start'})` sin ningún offset — el panel terminaba con su borde superior exactamente en `y=0` del viewport, justo debajo del navbar flotante fijo (`PublicNavbar`, `position:fixed;top:0`). Como el pentágono dejó de ser el primer elemento de la columna (ahora lo es el título), el nombre del arquetipo y el botón de cerrar quedaban tapados por el nav en cada apertura — invisibles hasta que el usuario scrolleaba manualmente hacia arriba, lo cual iba en contra del propósito completo del auto-scroll. Fix: `scroll-margin-top:96px` en el wrapper que recibe el `scrollIntoView` (clase `.sp-panel-scroll-target`, aplicada al `<div ref={panelWrapRef}>`) — el navegador respeta ese margen al calcular dónde cae "el inicio" del elemento, dejando aire real para el nav en cualquier breakpoint. Se encontró comparando una captura de página completa (`page.screenshot()`) contra una captura de elemento (`locator('.sp-panel').screenshot()`) — esta última hace su propio auto-scroll interno en Playwright que no respeta `scroll-margin-top` igual que un `scrollIntoView` real del navegador, así que puede dar falsos negativos o falsos positivos sobre qué ve realmente un usuario; la captura de página completa es la que refleja el comportamiento real.

**Verificado**: los 5 arquetipos (Visionario, Conector, Ejecutor, Catalizador, Guardián) confirmados sin ningún label cortado — "VÍNCULO" es el caso más ajustado y quedó con margen amplio en los 5. Mobile (1 columna) y tablet (columnas apiladas) confirmados sin layout forzado. Sin espacio vacío evidente en la columna izquierda con el nuevo orden. Claro y oscuro confirmados. `npx tsc --noEmit` limpio.

### Por qué el dashboard se dividió en /dashboard (Hoy) y /dashboard/progreso (Sesión 19)

El dashboard crecía en scroll infinito porque cada bloque fue construido en sesiones separadas sin visión del conjunto: la Zone 1 (identity card) se diseñó sin saber que Zone 3B repetiría los módulos; el accordion de progreso se añadió sin saber que Zone 1 ya mostraba stats de XP/racha. La duplicación era estructural, no superficial.

La solución elegida fue una ruta nueva `/dashboard/progreso` en lugar de tabs porque:
- Encaja en el patrón App Router ya establecido (`/dashboard/*` → hereda sidebar de `layout.tsx` automáticamente, proxy protege todo el subtree sin cambios).
- El volumen de contenido de "Mi Progreso" (4 KPIs, 5 barras de pilares, chart XP, donut, grilla completa) justifica su propia página — no es un panel ancilario.
- No hay estado compartido entre las dos vistas que justifique mantenerlas en el mismo componente.
- El enlace "Ver mi progreso →" es un `<a>` simple, no requiere estado de tabs ni AnimatePresence entre rutas.

**Qué quedó en /dashboard (Hoy):** anuncios, saludo + "Qué sigue" (Zone 1), portfolio link, módulo actual (Zone 2), Capstone con explicación clara de bloqueo, frase del día, cert banner, link a progreso.

**Qué quedó en /dashboard/progreso:** 4 KPI bento (XP / módulos / racha / ranking), "Tu perfil de líder" (5 barras de pilares), "Tu avance en el programa" (line chart XP + donut RadialBar), "Mis módulos" (grilla completa), "Ver programa completo" → `/dashboard/leadership-path`.

**Bugs corregidos en el proceso:**
- `cert-unlocked` tenía `background:var(--ink,#0D0D0D)` — en dark mode `--ink` es `#F5F3EF` (claro) con texto blanco = invisible. Fix: `background:var(--surface-inverse)` que siempre es `#0D0D0D` (declarado solo en `:root`, nunca en dark).
- Zone 1 "Qué sigue" mostraba el título del módulo, duplicando Zone 2 debajo. Fix: simplificado a `Módulo XX · YY XP` sin título.

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
| `src/components/GlobeHero.tsx` | Landing page shell — nav pill, Misión, Visión, Historia, Impacto, Metodología, Valores, Equipo, footer |
| `src/components/HeroArc.tsx` | Hero de la landing — composición editorial: eyebrow pill, H1 con italic accent, arco SVG doble, foto circular Colegio Albania, CTA pill con inner arrow, micro-stat. Reemplazó el Globe3D. |
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
