# context.md — Big Family Platform — Decision Log

## Last updated: Mayo 2026

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

---

## Tablas en Base de Datos

### Originales
`schools`, `profiles`, `coordinator_codes`, `expositor_codes`, `modules`, `questions`, `progress`, `xp_log`, `video_progress`, `badges`, `user_badges`, `quiz_attempts`, `quiz_answers`, `projects`, `project_images`, `project_likes`, `project_comments`, `coordinator_notes`, `capstone_evaluations`, `news`, `team_messages`, `team_projects`, `team_project_members`

### Añadidas en Mayo 2026
`timeline_events`, `quiz_retry_requests`, `news_reads`, `notification_preferences` (columna en profiles), `goals`, `goal_templates`, `project_reactions`, `calendar_events`, `announcements`, `announcement_reads`, `activity_feed`, `success_stories`

---

## Pendiente

### Antes del lanzamiento
- [ ] Ejecutar MISSION.md — diagnóstico bugs, fluidez globo, rediseño globo, UI/UX overhaul
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
```

**Importante:** Usar siempre las "Legacy anon, service_role API keys" de Supabase, NO las nuevas "Publishable/Secret keys" que tienen formato `sb_publishable_...`. Las nuevas keys no son compatibles con `@supabase/ssr`.

---

## Contactos del Proyecto
- **Fundador / Admin:** Luis Barrios
- **Coordinadores principales:** Samuel, JuanFelipe, Alejandro
- **8 colegios participantes** en La Guajira, Colombia
