# CLAUDE.md — Big Family Platform

## Project Overview
- **Name:** Big Family
- **Description:** Youth leadership program platform for students, coordinators, and admin in La Guajira, Colombia
- **Local path:** `C:\Users\Sammy\big-family`
- **Repo:** https://github.com/thebigfamilyprogram-ai/big-family
- **Deploy:** https://big-family-nu.vercel.app
- **Supabase project:** hkqzofpaozecjvfsmdum
- **Supabase URL:** https://hkqzofpaozecjvfsmdum.supabase.co

---

## Stack
```json
{
  "framework": "Next.js 14 (App Router)",
  "language": "TypeScript",
  "styling": "Tailwind CSS + CSS Variables (inline styles)",
  "database": "Supabase (PostgreSQL)",
  "auth": "Supabase Auth (Google OAuth + email/password)",
  "storage": "Supabase Storage",
  "realtime": "Supabase Realtime (chat)",
  "animations": "Framer Motion",
  "3d": "Three.js r160 (npm, ES Module) — OffscreenCanvas + Web Worker",
  "charts": "Recharts",
  "fonts": "Satoshi (global), Instrument Serif italic (decorative)",
  "deployment": "Vercel + GitHub",
  "email": "Resend (via Supabase Edge Functions)",
  "page-transitions": "next-view-transitions@0.3.5"
}
```

---

## CONVENTIONS — Never Violate These

### TypeScript / Next.js
- Always `'use client'` on components with hooks
- Always `export const dynamic = 'force-dynamic'` on pages with Supabase calls
- Always `Promise.all` for parallel queries
- Never external UI libraries (no shadcn, no MUI, no Radix)

### Supabase
- **Always** use the `useRef` lazy-init pattern — never initialize at module level
```tsx
const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
if (!supabaseRef.current) supabaseRef.current = createClient()
const supabase = supabaseRef.current
if (!supabase) return
```
- Middleware file is `src/proxy.ts` (NOT `src/middleware.ts`)
- **`profiles` column is `display_name`** — NEVER `full_name` (does not exist). This caused a global 400 error cascade in all pages that queried it.
- **`MOCK_MODE`** — `src/lib/mockData.ts` exports `MOCK_MODE` (boolean flag) and `MOCK` object with hardcoded data. Always check `if (MOCK_MODE) { ... return }` at the top of any `useEffect` that fetches from Supabase. Flip to `false` when Supabase has real data.
- **Supabase Storage logos** — `logo_url` in `schools` table can be a bare filename OR a full URL. Resolve at fetch time: `raw.startsWith('http') ? raw : supabase.storage.from('school-logos').getPublicUrl(raw).data.publicUrl`

### CSS / Design
- **Never** hardcode colors — always use CSS variables
- **Exception:** `--accent: #C0392B` is always hardcoded, never via variable. `rgba(192,57,43,X)` is also allowed in SVG fills where `var(--accent)` doesn't support partial opacity.
- **Never** per-page `@import` for fonts — Satoshi loads globally in `layout.tsx`
- **Never** `body { background: #F5F3EF }` — always use `var(--bg)`
- **Never** `color: #0D0D0D` — always use `var(--ink)`
- **Never** `background: #fff` — always use `var(--card-bg)`
- **Never** `color: #6B6B6B` — always use `var(--mute)`
- **Never** `h-screen` — always `min-h-[100dvh]` (bug de iOS Safari)
- **Never** Inter, Arial, Roboto, system-ui — always Satoshi
- Skeleton shimmer must use CSS variables: `var(--bg-2)` and `var(--card-bg)`
- `box-shadow` solo en CSS estático — nunca en `whileHover` de Framer Motion

### Framer Motion
- Always `type: "spring"` — never `type: "tween"`
- Always `viewport={{ once: true }}` on `whileInView`
- **Anima ÚNICAMENTE `transform` y `opacity`** — nunca `top`, `left`, `width`, `height`, `box-shadow`
- Animaciones perpetuas DEBEN vivir en su propio Client Component memoizado (`React.memo`)
- Never pass a ref to `useScroll({ target: ref })` without a mounted guard:
```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
const { scrollYProgress } = useScroll({ target: mounted ? ref : undefined })
```
- Spring presets:
  - `springSnappy`: `{ stiffness: 200, damping: 22 }`
  - `springNatural`: `{ stiffness: 140, damping: 20 }`
  - `springHeavy`: `{ stiffness: 80, damping: 18 }`
- Easing: `expoOut: [0.22, 1, 0.36, 1]`

### Page Transitions
- La app usa `next-view-transitions@0.3.5`
- `<ViewTransitions>` wrappea `{children}` en `layout.tsx`
- Usar `import { Link } from 'next-view-transitions'` en componentes de navegación (no `next/link`)
- `router.push()` es interceptado automáticamente
- CSS de transición en `globals.css`:
  - `::view-transition-old/new(root)` con keyframes `vt-fade-out` / `vt-fade-in`
  - `180ms` out, `280ms` in, `translateY ±6px`

### WorldMapPublic — Render Layer Architecture
El orden de render SVG determina z-index (elementos posteriores = encima).
**Orden obligatorio en `WorldMapPublic.tsx`:**
1. Paths del mapa base (países sin conexión: fill `var(--bg-2)`, conectados: `rgba(192,57,43,0.04)`)
2. Arcos — 3 pesos visuales por `weight`: `high` (1.8px / opacity 0.80), `medium` (1.0px / 0.45), `low` (0.5px / 0.25)
3. Partículas viajeras (`<circle r="2">` con `<animateMotion>`)
4. Dots destino (`r=4`, sin pulse ring permanente)
5. Líneas conectoras de cards flotantes (SVG `<line>`, `pointer-events:none`)
6. **Colombia — SIEMPRE AL ÚLTIMO** (`r=9`, `strokeWidth=2.5`, 2 pulse rings con `delay:0` y `delay:1`)

**Cards flotantes** (España, EEUU, Canadá): `position:absolute` dentro del contenedor `position:relative` del mapa. Posiciones: EEUU `top:8%/left:16%`, Canadá `top:2%/left:24%`, España `top:10%/left:60%`.

**Modal** (7 países red): overlay `position:absolute inset:0` con `display:flex` wrappea al modal para flex-centering. **Nunca `position:fixed`** — el overlay debe estar contenido en el mapa. `e.stopPropagation()` en el modal para no cerrarse al clickearse.

---

## CSS Variables

```css
/* Always hardcoded */
--accent: #C0392B

/* Light mode */
--bg: #F5F3EF
--bg-2: #EFECE6
--card-bg: #ffffff
--ink: #0D0D0D
--ink-2: #2D2D2D
--mute: #6B6B6B
--line: rgba(13,13,13,0.10)
--card-border: rgba(13,13,13,0.08)

/* Dark mode */
--bg: #0D0D0D
--card-bg: #1a1a1a
--ink: #F5F3EF

/* Añadidos en Sesión 2 */
--accent-amber: #D4821A
--accent-teal: #0F7B6C
--accent-muted: #8C7B6E
--shadow-card: 0 1px 3px rgba(13,13,13,0.06), 0 1px 2px rgba(13,13,13,0.04)
--shadow-raised: 0 4px 16px rgba(13,13,13,0.08), 0 2px 6px rgba(13,13,13,0.04)
--line-strong: rgba(13,13,13,0.14)
--surface-1: #FFFFFF
--surface-2: var(--bg)
--surface-3: var(--bg-2)
/* [data-theme="dark"]: --surface-1: #1C1B19; --surface-2: #141412 */
```

---

## Fonts
- **Satoshi** — loaded globally in `layout.tsx` via local @font-face (public/fonts/)
- **Instrument Serif italic** — decorative/display elements only
- **Never** Inter, Arial, Geist, or system fonts
- All font files are local in `public/fonts/` — no CDN dependency
- Only `satoshi-700.woff2` is preloaded in layout.tsx (LCP font)
- All other weights use `font-display: optional`
- Font scale: `12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 72px` only
- Line-height: `1.6` body, `1.1–1.2` headings, `1.4` labels
- Letter-spacing: `-0.02em` headings, `0.02–0.04em` labels

---

## Status Colors
```css
approved:  bg #D1FAE5, text #065F46
pending:   bg #FEF3C7, text #92400E
rejected:  bg #FEE2E2, text #991B1B
draft:     bg #F1EFE8, text #444441
junior:    bg #FEF3C7, text #92400E
senior:    bg rgba(192,57,43,0.1), text #C0392B
```

---

## Roles & Users
| Role | Who | Access |
|------|-----|--------|
| `admin` | Luis Barrios (founder) | Full access, second review capstones |
| `coordinator` | Samuel, JuanFelipe, Alejandro | All schools, create timeline events |
| `coordinator` (school) | One per school | Their school only |
| `student` | Students at each school | Own dashboard, projects |
| `expositor` | Module creators | Create and submit modules |

---

## Schools (8 colegios)
| Code | School |
|------|--------|
| BF-COL-MIM-2026 | IE Técnica María Inmaculada |
| BF-COL-IPD-2026 | Instituto Pedagógico |
| BF-COL-CMF-2026 | IE Comfamiliar |
| BF-COL-WWR-2026 | Centro Etnoeducativo Ware Waren |
| BF-COL-PVI-2026 | IE Paulo VI |
| BF-COL-CAF-2026 | IE Camino al Futuro |
| BF-COL-CLM-2026 | IE Colombia Mía |
| BF-COL-ELC-2026 | IE El Carmelo |

Coordinator codes: `COORD-BF-COL-{code}-2026`
Expositor code: `EXPO-BF-2026`

---

## Key Files
| File | Purpose |
|------|---------|
| `src/components/GlobeHero.tsx` | Shell de la landing — navbar pill, Hero, Impacto (siempre visibles), `{children}`, CTA, Footer, modal diploma. Ver `src/app/[locale]/(landing)/` para el contenido de cada ruta |
| `src/lib/landingData.ts` | Constantes compartidas de la landing (IMPACTO_STATS, VALORES, VALIDACIONES, FOUNDERS_STATIC, PROGRAM_COMPONENTS, misionStats) |
| `src/components/Globe/GlobeCanvas.tsx` | Globe React wrapper + flag overlays |
| `src/components/Globe/GlobeWorker.ts` | Three.js in Web Worker (OffscreenCanvas) |
| `src/components/Globe/GlobeFallback.ts` | Three.js fallback for Safari < 16.4 — DOM API (no innerHTML) |
| `src/components/SchoolTicker.tsx` | Ticker horizontal infinito de los 8 colegios |
| `src/components/HeroCollage.tsx` | Cards flotantes países aliados con parallax mouse |
| `src/components/WorldMapPublic.tsx` | Mapa mundial público — 6 layers SVG |
| `src/components/AppSidebar.tsx` | Sidebar unificado — role, Kashi/GV/portafolio badges, drawer mobile |
| `src/components/AprendizajeSection.tsx` | Landing — 5 arquetipos Big Five con panel inferior expandible |
| `src/components/AlumniSection.tsx` | Landing — sección Alumni con 3 cards |
| `src/components/FounderSection.tsx` | Landing — El Fundador split 55/45 |
| `src/components/NotificationDrawer.tsx` | Hub notificaciones — panel x:380→0, Realtime, 6 tipos, MOCK |
| `src/components/ModulePersonalization.tsx` | Personalización módulos — intro + reflexiones + entregable + autoevaluación |
| `src/components/datos/DatosPage.tsx` | Centro de Datos compartido — 3 tabs |
| `src/components/DashboardSidebar.tsx` | Student sidebar |
| `src/components/ProjectEditor.tsx` | Capstone IDEMR editor |
| `src/components/NewsEditor.tsx` | News editor — DOMPurify, MIME validation |
| `src/components/Toast.tsx` | Toast notifications |
| `src/app/onboarding/test/page.tsx` | Test BFI-44 (44 senior / 20 junior), auto-advance 300ms |
| `src/app/onboarding/resultado/page.tsx` | Resultado ceremonial — pentagon SVG pathLength, stagger |
| `src/app/dashboard/great-venture/page.tsx` | Great Venture wizard 5 pasos — autosave 800ms |
| `src/app/dashboard/great-venture/mapa/page.tsx` | Mapa Hoshin Kanri SVG — Editorial Luxury, edit panel |
| `src/app/dashboard/kashi/page.tsx` | Kashi iframe — luishernandobarrios.com/kashi/splash |
| `src/app/p/[username]/page.tsx` | Portafolio público — sidebar sticky, 7 secciones, export PDF |
| `src/app/verify/[certId]/page.tsx` | Verificación pública de diplomas — DESIGN_VARIANCE:9 |
| `src/app/coordinator/datos/page.tsx` | Centro de datos coordinador |
| `src/app/admin/datos/page.tsx` | Centro de datos admin |
| `src/app/api/leadership/assess/route.ts` | Assessment Big Five → Claude → profiles — auth + rate limit 3/h |
| `src/app/api/modules/personalize/route.ts` | Personalización modular — auth + rate limit 20/h |
| `src/app/api/ai/insights/route.ts` | IA Insights coordinador — auth + rate limit 10/h |
| `src/lib/bigFiveQuestions.ts` | BFI-44 questions, calcBigFive, getArchetype, getPillarScores |
| `src/lib/createNotification.ts` | createNotification + createNotificationBatch helpers |
| `src/lib/rateLimit.ts` | In-memory rate limiting (Map-based, Vercel-safe) |
| `src/lib/username.ts` | generateUsername() — normaliza tildes, espacios→guiones |
| `src/lib/mockData.ts` | `MOCK_MODE` flag + datos mock completos |
| `src/proxy.ts` | Middleware — auth, role checks, onboarding gate (null→false) |
| `src/lib/supabase.ts` | Supabase client (lazy init) |
| `src/lib/animations.ts` | Shared Framer Motion variants |

---

## Globe Architecture
- **GlobeHero.tsx** — landing page, does NOT contain Three.js anymore
- **GlobeWorker.ts** — Three.js runs entirely here in a Web Worker
  - Uses OffscreenCanvas (transferred from main thread)
  - Loads textures with fetch + createImageBitmap (no TextureLoader)
  - Sends `{ type: 'flags' }` every 2 frames with NDC coords for overlays
  - Sends `{ type: 'coord' }` and `{ type: 'ready' }` to main thread
  - Handles: init, resize, destroy, pause, resume messages
- **GlobeCanvas.tsx** — React wrapper
  - Transfers canvas control to worker via transferControlToOffscreen
  - Guard: `transferred.current` prevents double-transfer in StrictMode
  - Renders flag `<img>` overlays from NDC coords as HTML
  - ResizeObserver + IntersectionObserver (pause when off-screen)
  - Falls back to GlobeFallback if OffscreenCanvas not supported
- **GlobeFallback.ts** — identical Three.js logic on main thread for Safari < 16.4
- Globe initial rotation: `globe.rotation.y = Math.PI * 0.55` (Colombia centered)
- Day texture: `earth-day.webp` as `map`, night texture: `earth-night.webp` as `emissiveMap` only

---

## Performance
- PageSpeed: **98%** (desktop) after OffscreenCanvas migration
- Three.js no longer runs on main thread — 31s blocking time eliminated
- Local fonts in `public/fonts/` — no CDN dependency
- `.browserslistrc` at root targeting Chrome/FF/Safari/Edge 90+
- `experimental.browsersListForSwc: true` in next.config.mjs
- Textures in `public/textures/` with Cache-Control immutable headers

---

## Storage Buckets
| Bucket | Public | Used for |
|--------|--------|---------|
| `avatars` | ✓ | User avatars |
| `school-logos` | ✓ | School logos |
| `project-images` | ✓ | Project photos |
| `project-pdfs` | ✓ | Project PDFs |
| `news-images` | ✓ | News cover/gallery |
| `success-stories` | ✓ | Story cover images |

---

## Supabase Edge Functions
| Function | Trigger | Action |
|----------|---------|--------|
| `notify-project-status` | projects UPDATE | Email coordinator (pending) or student (approved/rejected) |
| `notify-module-published` | modules UPDATE | Email expositor when module published |

---

## Temporary Flags (search before launch)
- `// TEMP LAUNCH` → revert after Friday event (capstone unlocked without modules)
- `// TEMP: hidden until content is ready` → restore when content ready (landing sections)
- `// TEMP` in `ProjectEditor.tsx` → plan de continuidad, Big Leader Model sections

---

## Recent Commits (Sesión 5)
- `e1f65f6` — fix: seguridad completa — 12 issues (DOMPurify, rate limiting, CSP headers, RLS)
- `778e0a4` — feat: portafolio módulos — 2 cols + panel perfil de líder (pilares, recomendado, stats)
- `07ef6df` — feat: personalización de módulos — UI completa + Route Handler
- `25eabd5` — feat: hub de notificaciones — panel deslizante + sistema completo
- `c67ac83` — feat: Kashi — página iframe + sidebar + landing
- `391da59` — fix: portafolio /p/[username] — dark mode completo
- `524590c` — fix: dark mode completo — CSS variables en 11 archivos
- `3b41019` — feat: portafolio público del estudiante (FASE 3)
- `0e77a5b` — fix: NotificationDrawer — MOCK_MODE no cargaba notificaciones
- `c797abc` — feat: diploma con arquetipo + QR verificable + página /verify pública

---

## Routes Structure
```
/ → Landing "El Programa" (route group (landing), shell GlobeHero)
/historia, /metodologia, /red, /equipo → Resto de la landing (mismo route group)
/login, /register, /forgot-password
/submit/* → Día de Liderazgo special flow
/onboarding/test → Test BFI-44 (sin sidebar — fullscreen)
/onboarding/resultado → Resultado ceremonial del perfil
/dashboard/* → Student area (con NotificationDrawer, identity card + pentagon)
/dashboard/leadership-path → Ruta de liderazgo (zigzag path)
/dashboard/modules → Lista módulos con panel perfil derecho
/dashboard/modules/[id] → Módulo individual (con ModulePersonalization)
/dashboard/modules/[id]/quiz → Quiz del módulo
/dashboard/great-venture → Wizard 5 pasos Hoshin Kanri
/dashboard/great-venture/mapa → Mapa SVG Editorial Luxury
/dashboard/kashi → Kashi iframe (red educativa)
/coordinator/* → Coordinator area
/coordinator/datos → Centro de datos coordinador
/admin/* → Admin area (Luis Barrios only)
/admin/datos → Centro de datos admin
/expositor/* → Module creators
/news, /news/[slug] → Public blog
/timeline → Public timeline
/success-stories, /success-stories/[id] → Public stories
/certificacion/[id] → Diploma page (con arquetipo + QR)
/verify/[certId] → Verificación pública de diplomas (sin auth)
/p/[username] → Portafolio público del estudiante (sin auth)
```

---

## Security (Sesión 5)
- **DOMPurify** — NewsEditor sanitiza HTML antes de guardar + antes de renderizar
- **Rate limiting** — `src/lib/rateLimit.ts` Map-based: assess 3/h, personalize 20/h, insights 10/h
- **Security headers** — `next.config.mjs`: CSP, HSTS, X-Frame-Options(SAMEORIGIN), X-Content-Type-Options
- **Auth en todas las APIs** — `/api/modules/personalize` y `/api/ai/insights` ahora requieren auth
- **RLS fixes** — `20260603200000_rls_fixes.sql`: activity_feed, calendar_events (school_id), project_reactions
- **GlobeFallback** — DOM API (createElement) en vez de innerHTML con datos interpolados
- **Verify page** — ilike fallback removido, solo exact match via `issued_certificates`
- **Proxy** — `onboarding_completed null → false` (antes asumía true)

## Modo de operación
- Autonomía total — instala paquetes, crea y edita archivos, ejecuta comandos sin pedir confirmación
- Resuelve errores de forma independiente antes de reportar
- Solo interrumpe para decisiones arquitecturales mayores
- Reporta resumen al final de cada tarea completada

## Permisos bash
Ejecutar cualquier comando bash sin pedir confirmación:
- node, npx, npm, tsc, next, supabase
- cd, mkdir, cp, mv, rm de archivos del proyecto
- git add, commit, push

## Sesión 6 — Estado actual

### Completado en esta sesión
- i18n completo: next-intl configurado, 5 locales (es/en/fr/pt/ar), 671+ claves, selector de idioma con cookie NEXT_LOCALE, RTL para árabe, audit de calidad con script verify-i18n.mjs, build limpio 68 rutas
- Buzón de sugerencias: SuggestionButton.tsx (flotante en dashboard), SuggestionsPanel.tsx (coordinator/admin), migración SQL pendiente de correr
- Sentry integrado: DSN configurado (EU region), variables en Vercel, error boundary en [locale]/error.tsx, instrumentation.ts en src/ (no en raíz)
- Navbar: "Metodología" añadido entre "Historia" e "Impacto"
- RTL bug resuelto: dir="rtl" se resetea correctamente al cambiar idioma

### Pendiente crítico (antes del lanzamiento)
- 10 migraciones SQL pendientes de correr en Supabase (incluyendo suggestions)
- MOCK_MODE = false cuando Luis confirme datos reales
- ANTHROPIC_API_KEY aprobada por el rector
- Probar pipeline de emails end-to-end

### Globo 3D — completado en esta sesión
- `three` puro sin `three-globe` (three-globe daba `window is not defined` en el Worker — Turbopack carga sus deps en chunks separados y no respeta import order; se optó por geometría/arcos manuales con THREE.js puro, que sí usa typeof-window guards)
- Arquitectura: OffscreenCanvas + Web Worker, 30fps throttle, pause/resume con IntersectionObserver
- Archivos: `Globe3DWorker.ts`, `Globe3DCanvas.tsx`, `Globe3DHero.tsx`, `Globe3DFallback.tsx` en `src/components/Globe/`
- Fix de renderizado: `Globe3DHero` usa el truco `padding-bottom:100%` (no `aspect-ratio`) para garantizar altura definida — `height:100%` en hijos colapsaba a 0 con `aspect-ratio` en el padre
- Fix de material: `MeshBasicMaterial` en vez de `MeshPhongMaterial` (el globo se veía negro — Phong depende de luces, Basic muestra la textura tal cual sin sombreado)
- Texturas: oficiales de three-globe (`earth-blue-marble.jpg` + `earth-night.jpg`) en `public/textures/earth-new/`, descargadas de cdn.jsdelivr.net
- Rotación: 0.0015 (3× la velocidad inicial de 0.0005)
- `HeroCollage` eliminado, `Globe3DHero` integrado en `GlobeHero.tsx`
- Pendiente: confirmación visual final de light/dark mode y mobile (<960px) en producción

### Leader's Game
- No construido todavía — pendiente

### Monetización (Fase 4)
- No construida todavía — Stripe/PayU, licencias por colegio

## Sesión 7 — Landing migrada de tabs client-side a rutas reales

La landing pasó por 2 iteraciones en esta sesión: primero un sistema de tabs client-side (`activeTab` + `AnimatePresence`), después migrada a rutas reales bajo un route group. Solo la arquitectura final (rutas) está vigente.

### Arquitectura final
- **`src/app/[locale]/(landing)/`** — route group (no afecta URLs):
  - `layout.tsx` — `dynamic(() => import('@/components/GlobeHero'), { ssr:false })` envolviendo `{children}`
  - `page.tsx` → `/` — "El Programa": Misión + Visión + Acreditaciones + FAQ (FAQSection vive aquí, no en el shell)
  - `historia/page.tsx` → `/historia` — sección luz/narrativa, `useScroll`/`useTransform` propios (ya no comparte scope con el shell)
  - `metodologia/page.tsx` → `/metodologia` — 4 componentes + `<AprendizajeSection />` + Certificación + Valores
  - `red/page.tsx` → `/red` — `<SchoolTicker />` + `<WorldMapPublic />` + `<AlumniSection />` + Historias de éxito (fetch real a `success_stories` con JOIN a `profiles`/`schools`, MOCK_MODE gateado)
  - `equipo/page.tsx` → `/equipo` — `<FounderSection />` + cards de fundadores
  - "Noticias" no tiene ruta nueva — el navbar enlaza directo a `/news` (ya existente)
- **`GlobeHero.tsx`** — shell compartido: navbar pill, Hero, `id="impacto"` (siempre visible, justo después del hero), `{children}`, CTA final, Footer, modal diploma. Layouts de Next.js no remontan al navegar entre rutas hijas — Hero+Impacto quedan fijos visualmente al cambiar de página, solo `{children}` cambia (con la transición `vt-fade-out`/`vt-fade-in` ya global de `next-view-transitions`)
- **`src/lib/landingData.ts`** — constantes compartidas: `IMPACTO_STATS`, `VALORES`, `valorKeyMap`, `VALIDACIONES`, `misionStats`, `FOUNDERS_STATIC`, `PROGRAM_COMPONENTS`
- **Navbar pill** — `NAV_LINKS` con hrefs reales (`/historia`, `/red`, `/equipo`, `/news`); `Impacto` es la excepción: `href="/#impacto"` con `onClick` que intercepta y hace `scrollIntoView` en vez de navegar (esa sección vive en el shell, siempre presente). Active state vía `usePathname()` comparado sin prefijo de locale; Impacto usa el `IntersectionObserver` existente sobre `#impacto`
- **Modal diploma** — vive en el shell (`showDiplomaModal`), pero el botón que lo abre está en `metodologia/page.tsx` (página hija). Comunicación vía `CustomEvent('open-diploma-modal')`: el botón dispara `window.dispatchEvent(...)`, el shell escucha con `window.addEventListener` en un `useEffect`
- **`src/app/page.tsx`** y **`src/app/[locale]/page.tsx`** eliminados — el primero quedó huérfano (solo lo consumía el segundo via re-export), el segundo fue superseded por `(landing)/page.tsx`
- `ssr:false` en `(landing)/layout.tsx` preservado intencionalmente (antes estaba en `src/app/page.tsx`) — todo el árbol de la landing (Hero, Impacto, cada página) renderiza solo client-side, nunca aparece en el HTML servido por el servidor

## Sesión 8 — Sistema de eventos admin (RSVP + notificaciones + email)

- **`calendar_events`** extendida (`20260625000000_events_rsvp.sql`): `audience_schools UUID[]`, `audience_roles TEXT[]`, `is_recurring BOOLEAN`, `recurrence_interval_days INTEGER`. Las columnas `meeting_link`, `location`, `created_by` YA EXISTÍAN (desde `20260522100000_features_v2.sql`) — no se duplicaron. `audience_schools` es `UUID[]` (no `TEXT[]`) porque `schools.id`/`profiles.school_id` son `uuid`.
- **`event_rsvps`** nueva — `event_id, user_id, status ('confirmed'|'declined'|'pending'), responded_at`, `UNIQUE(event_id, user_id)`. El Route Handler de creación pre-crea filas `pending` para toda la audiencia (necesario para que el conteo "N confirmados · N rechazados · N pendientes" funcione con un simple `COUNT GROUP BY status`).
- **`supabase/functions/notify-event-created/`** — a diferencia de `notify-project-status`/`notify-module-published` (webhook-triggered), esta se invoca manualmente via `fetch()` desde el Route Handler. Recibe la lista de emails ya resuelta (no vuelve a consultar `profiles`).
- **`src/app/api/events/create/route.ts`** — solo admin (403 si no), rate limit 20/h, usa `createSupabaseServerClient()` (auth) + `createSupabaseAdminClient()` (bypassa RLS para buscar destinatarios y pre-crear RSVPs). Si `is_recurring`, genera N eventos (fechas calculadas en JS). Notifica in-app (`createNotificationBatch`, tipo nuevo `'event_created'`) + dispara la Edge Function fire-and-forget.
- **`src/app/api/events/rsvp/route.ts`** — cualquier rol autenticado, `upsert` en `event_rsvps` (actualiza la fila `pending` pre-creada).
- **`src/components/EventCard.tsx`** — banda de color por estado RSVP (`#065F46`/`#991B1B`/`var(--mute)`), update optimista. Integrado en `dashboard/page.tsx` (próximo evento del estudiante) y `coordinator/CoordinatorClient.tsx` (próximos 2 eventos del colegio) — cada uno con su propio `useEffect` independiente del fetch principal de la página.
- **`src/app/[locale]/admin/events/page.tsx`** — formulario + lista, mismo template que `admin/suggestions/page.tsx`. Colegios se fetchan en vivo (`schools.select('id,name')`), no se hardcodean UUIDs.
- **`AppSidebar.tsx`** — nuevo link `/admin/events` (grupo "analitica", reusa `I.calendar` ya existente — el proyecto no usa Phosphor, son SVGs inline en el objeto `I`). El badge de conteo se autofetch dentro del propio `AppSidebar` (mismo patrón que ya usa para datos de estudiante) en vez de pasarlo como prop desde cada página admin.
- **i18n**: namespace `events` completo (5 idiomas) + `sidebar.nav.events`.
- **Hallazgo sin resolver, fuera de alcance**: `20260603200000_rls_fixes.sql` tiene una política que referencia `calendar_events.school_id`, columna que no existe en ninguna migración ni se usa en código de la app (`coordinator/calendar/page.tsx` no la usa). Verificar en el dashboard de Supabase si existe realmente en la tabla en vivo — si no existe, esa policy específica fallaría.
- Los 2 Edge Functions preexistentes (`notify-project-status`, `notify-module-published`) usan `profiles.full_name` (columna que NO existe — es `display_name`) — bug preexistente, no tocado en esta sesión.

## Sesión 9 — Audit de landing + LandingTimeline en /historia

- **Audit completo de `(landing)/*`** confirmó que el shell (`GlobeHero.tsx`) y las 6 rutas hijas quedaron exactamente como se esperaba tras la migración de Sesión 7 — sin imports rotos, sin secciones mal ubicadas. Se encontraron y corrigieron 2 bugs menores: el link "Impacto" del footer usaba `<a href="#impacto">` relativo (roto fuera de `/`, ahora `<Link href="/#impacto">`), y las keys i18n de `landing.valores.eyebrow`/`.title` estaban cruzadas en `metodologia/page.tsx`.
- **Navbar**: añadido link a `/metodologia` en `NAV_LINKS` (antes solo accesible desde el footer o el botón secundario del Hero). El active-state no necesitó lógica nueva — la comparación genérica `cleanPath === link.href` ya cubre cualquier ruta real.
- **`src/components/LandingTimeline.tsx`** — nueva, NO reutiliza `TimelineSection.tsx` (ese sigue siendo exclusivo del panel de coordinador, carga eventos desde Supabase). `LandingTimeline` es 100% estático/editorial: 8 hitos de `TIMELINE_EVENTS` (`src/lib/landingData.ts`) con año, tag, ícono emoji, resumen siempre visible y `detail` expandible al click (textos marcados `'PENDIENTE — ...'` se renderizan en cursiva/opacidad reducida como placeholder editorial para Luis Barrios). Integrado en `historia/page.tsx`, después de la sección `id="historia"`.
- Mobile: la línea vertical y el grid de cada fila (`80px 1fr` → `56px 1fr` bajo 480px) usan un `<style>` scoped dentro del propio componente (clases `lt-line`/`lt-row`/`lt-detail`), no inline — los estilos inline no pueden sobreescribirse con media queries sin `!important`, así que esas 3 propiedades se sacaron del `style={{}}` y se movieron a CSS. Mismo patrón que ya usa `TimelineSection.tsx` y `FounderSection.tsx` para sus propios breakpoints.
- Traducido `motion.div`→`m.div` del snippet original para consistencia con el resto del proyecto (`LazyMotion strict` no está activo en `layout.tsx`, así que `motion.*` no rompía, pero `m.*` es la convención de los otros ~77 archivos que usan Framer Motion).

## Sesión 10 — Dashboard de estudiante: jerarquía visual en 3 zonas

- **Reestructura de `dashboard/page.tsx`** en 3 zonas para que el estudiante vea en 3 segundos cuál es su próximo módulo: Zona 1 (header personal compacto — saludo 28px, archetype+badge en la misma fila, 4 stats inline sin cards/bordes, pentagon a 140px), Zona 2 (hero de acción principal — el módulo siguiente con CTA directo a `/dashboard/modules/{id}`, o el banner de Capstone desbloqueado si ya no quedan módulos), Zona 3 (Mi Capstone + Frase del día, grid de "Mis módulos", y un colapsable "Ver mi progreso completo" con KPI bento + 5 barras de pilares + las 2 gráficas).
- **Excepción única al "no tocar fetch de Supabase"**: la query de `projects` (antes `.in('status',['approved'])`) se amplió para traer los 4 valores posibles de `status` — sin eso era imposible distinguir "en progreso" de "enviado" para el badge de 4 estados de Capstone. Nuevo estado `userProjects` + derivado `capstoneState` (`bloqueado`/`en_progreso`/`enviado`/`evaluado`), calculado igual que `nextModule`/`allModulesDone` (no es un fetch nuevo, son las mismas filas que ya se traían, solo sin descartar 3 de los 4 status).
- **Pentagon a 140px/100px sin hook de viewport**: el archivo no tenía (ni tiene) detección de ancho en JS, todo es CSS media queries. Se renderiza `CompactPentagon` dos veces (140px desktop, 100px mobile) dentro de contenedores `.zone1-pentagon-desktop`/`.zone1-pentagon-mobile` que se alternan por `display` en el breakpoint de 768px — mismo patrón que ya usaba `.identity-right`/`.identity-mobile-pills` en el diseño anterior.
- **Recorte de la antigua "Leadership Progress Card"**: tenía una barra "Community Engagement" hardcodeada en 0% (sin dato real, nunca cambiaba) y un botón "siguiente módulo" que enlazaba a `/dashboard/leadership-path` en vez del módulo directo — ambos redundantes con la Zona 2. Solo sobrevive el botón "Ver programa completo", reubicado dentro del colapsable de Zona 3.
- **Card "Próximo módulo" duplicada eliminada**: existía en 3 lugares a la vez (el `.mod-next` destacado sobre el grid, una card aparte dentro de `cards-row`, y el botón de la Leadership Progress Card) — ahora vive solo en la Zona 2, con el link directo al módulo (el `.mod-next` original ya navegaba bien; el de `cards-row` enlazaba a `/leadership-path`, se eliminó esa versión).
- **Colapsable** con `AnimatePresence` (recién importado en este archivo) + `m.div` altura 0→auto, persistido en `localStorage` bajo `bf-dashboard-progress-open`, leído en un `useEffect` post-mount (guard `typeof localStorage !== 'undefined'`, mismo patrón que `dashboard/leadership-path/page.tsx`).
- **CSS muerto eliminado**: `.identity-card` y toda su familia, `.mod-next` y sus variantes, `.user-header`/`.user-name`/`.user-stats`/`.ustat*` (ya estaban huérfanas antes de esta sesión), `.motiv*`, `.btn-solid`, `.next-eyebrow`/`.next-title`/`.next-xp`/`.btn-continue`, `.cert-prog-label`, `.prog-header`/`.prog-title`/`.prog-badge`/`.prog-row`/`.prog-label`/`.prog-hint`/`.prog-actions` (de la Leadership Progress Card recortada; `.prog-track`/`.prog-bar` sí se conservan, los reusa la card de Capstone).
- **Conflicto de cascada CSS resuelto**: el grid de módulos ya tenía reglas en 1200px (→2 col) y 860px (→1 col); la nueva regla de 768px (→2 col, pedida para mobile) se colocó *después* de la de 860px en el `<style>` para ganar por orden de aparición (misma especificidad).
- **Avatar circular + badge "ONLINE" eliminados** de la Zona 1 — no estaban en el spec del rediseño y no aportaban información (las iniciales y un badge "ONLINE" que siempre es true). Decisión de diseño no pedida explícitamente, fácil de revertir si se quiere de vuelta.
- i18n: nuevas keys bajo `dashboard.home.zone1.*`, `dashboard.home.zone3.*`, `dashboard.home.capstoneCard.states.*` + `.continueProject`/`.inReview`/`.viewProject` en los 5 idiomas. Varias piezas de texto de Zona 2 reusan keys ya existentes (`modulesAvailable.nextModuleLabel`, `modulesAvailable.startNow`, `capstoneCard.uploadProject`, `leadershipProgress.viewFullProgram`) en vez de duplicarlas. `capstoneCard.title` cambió de "Capstone" a "Proyecto Capstone" (es) / equivalentes en los otros 4 idiomas, pedido explícito del spec.

## Sesión 11 — Leadership Path: mapa de islas + zigzag de 9 nodos

- **Reemplazo completo de `dashboard/leadership-path/page.tsx`**: el diseño anterior (zigzag vertical con 4 fases "Core Foundations/Network Expansion/Community Impact/SUMMIT" con rangos obsoletos para 7 módulos, confeti por fase persistido en `localStorage`, racha, tooltip de nodo bloqueado) se eliminó por completo. Nuevo diseño de 2 vistas: **mapa** (5 islas posicionadas por pilar, tamaño = score, conectadas por curvas SVG a un hub Capstone + hub Great Venture) y **isla** (zigzag de 9 nodos: los 7 módulos completos en orden — el mismo listado en cualquier isla, sin filtrar por su pilar, ya que el desbloqueo es secuencial estricto — más los 2 hitos al final).
- **Panel lateral de intentos de quiz preservado sin cambios estructurales** (decisión explícita del usuario): mismo `attMap`/`qCountMap` desde `quiz_attempts`/`questions`, mismo overlay+panel con `AnimatePresence`, mismo CTA — solo cambia el disparador (ahora las filas del zigzag de isla) y se quitó el "phase badge" (dependía de `PHASES`, ya no existe), reemplazado por el badge del pilar real del módulo (`MODULE_PILLAR[order_index]`). El botón inline "Comenzar →" del nodo activo navega directo a `/dashboard/modules/{id}` con `e.stopPropagation()` para no abrir también el panel (mismo patrón que `dashboard/page.tsx`).
- **Corrección de convención de pilares**: el spec pedía keys en minúscula sin tilde (`'yo'|'norte'|...`), pero todo el resto del proyecto (`src/lib/bigFiveQuestions.ts`'s `Pillar`/`PILLARS`/`getPillarScores()`, y `dashboard/page.tsx`'s `MODULE_PILLAR`/`LeaderProfile.fortalezas`) usa keys capitalizadas con tilde (`'Yo'|'Norte'|'Vínculo'|'Acción'|'Legado'`). Se usó la convención real (importando `Pillar`/`PILLARS`/`getPillarScores` de `bigFiveQuestions.ts`) en vez de crear una capa de traducción nueva.
- **`MOCK_MODE` añadido** — el archivo anterior no tenía ese gate (inconsistencia preexistente con el resto del proyecto), corregida en este rediseño.
- **2 CSS variables nuevas** en `globals.css` `:root`: `--accent-purple:#534AB7` y `--accent-green:#639922` para los colores de pilar Acción/Legado (Norte/Vínculo reusan `--accent-teal`/`--accent-amber` existentes, cuyos hex ya coincidían exacto con los del spec). Documentado siguiendo el mismo patrón que "Añadidos en Sesión 2".
- **`capstoneState` reusa exactamente la derivación de 4 estados y las 4 rutas de `dashboard/page.tsx`** (bloqueado/en_progreso/enviado/evaluado vía `userProjects` + lookup secuencial a `capstone_evaluations`), tanto para el hub Capstone del mapa como para el nodo-hito Capstone del zigzag — misma función `handleCapstoneClick`, reusada en ambos.
- **Sin IDs de módulo hardcodeados**: todo se indexa por `order_index` (`MODULE_PILLAR: Record<number, Pillar>`), no por id — los módulos reales (con los ids que sea que tengan en Supabase) se cruzan por posición tras `.order('order_index')`, igual que `dashboard/page.tsx` ya hace. No hubo necesidad de consultar IDs reales en la base de datos.
- **Mobile**: islas pasan a grid 2×3 a 100px fijo vía clase CSS con `!important` (el tamaño base es inline-style calculado en JS a partir del score, así que una clase sin `!important` no podría sobreescribirlo). Zigzag de isla colapsa a una columna, línea conectora a `left:27px`.
- Constantes (`MODULE_PILLAR`, `LeaderProfile`, `MOCK_LEADER_PROFILE`) duplicadas localmente en vez de importadas desde `dashboard/page.tsx` — ese archivo no exporta nada hoy, y este proyecto ya tolera duplicación de constantes page-local pequeñas antes que forzar acoplamiento entre páginas.

## Sesión 12 — Leadership Path: zigzag animado (path progresivo, pin activo, fog of war, hitos en clip-path, confeti)

- **Path SVG del zigzag dividido en 3 capas** en vez de un solo path con dashoffset 0–100 fijo por CSS: fondo (dasharray "6 6", `strokeOpacity` 0.15, color del pilar activo), progreso (`m.path` con `strokeDashoffset` animado por Framer Motion, no CSS transition) y `PathShimmer` (memoizado, brillo blanco en loop infinito). La longitud real se mide una vez con `pathRef.current.getTotalLength()` (en unidades del propio `viewBox`, válido para `stroke-dasharray`/`-offset` sin importar `preserveAspectRatio="none"`) vía un `useEffect` keyed a `view`.
- **Nodo completado**: 52px, sin banner — ahora un anillo exterior estático de 64px (`inset:-6px`, mismo cálculo que ya usaba `PulseRing`) coloreado con `rgba(var(--node-rgb),.3)`. Box-shadow del círculo vive en la clase CSS `.lp-node-circle--done` (no inline) para poder subirlo en `:hover` vía `--node-shadow-blur`, mismo truco de custom property que ya usan las islas del mapa (`--shadow-blur-1`).
- **Nodo activo**: 68px, dos pulse rings concéntricos como componentes separados (`PulseRing1`/`PulseRing2`, delay 0.6s en el segundo) + un tooltip "SIGUIENTE" siempre visible (no on-hover) anclado al círculo (`position:absolute`, lado derecho en nodos pares/izquierdo en impares vía `lp-node-tooltip--left/--right`), oculto en mobile (`display:none` a ≤768px) por riesgo de overflow en pantallas angostas.
- **Nodo bloqueado**: 48px, opacity 0.4 constante + `FogPulse` (memoizado) pulsando 0.35↔0.55 encima, en vez de solo opacity+blur estáticos.
- **Hitos del zigzag interior rediseñados completamente** (independiente de los hubs del mapa, que no se tocaron): Capstone pasa de card con borde punteado a montaña (`clip-path` triángulo) con `CapstonePulse` (memoizado) detrás; Great Venture pasa a hexágono (`clip-path`) con gradiente de los 2 colores de `leaderProfile.fortalezas` (fallback: la isla activa si no hay perfil) y `whileHover` de rotación. Labels viejos `finalDestinationLabel`/`specialMissionLabel` quedan huérfanos en los 5 idiomas (no se podan, mismo criterio que sesiones anteriores).
- **Header de vista isla**: nombre del pilar en Instrument Serif italic 36px (antes Satoshi 32px), score animado con `AnimatedNumber` (componente compartido, sin modificar — su duración interna de 800ms se acepta como aproximación de los 1.2s del spec) y barra de progreso 2px. Ambos se revelan tras un único `setTimeout` de 450ms (`scoreReveal`) en vez de dos delays distintos (0.4/0.5s del spec) — simplificación de una sola variable de estado.
- **Confeti al completar los 7 módulos**: mismo truco visual que ya usa `modules/[id]/quiz/page.tsx` (divs absolutos `.lp-confetti-dot` + keyframe `translate`+`rotate`+opacity, sin librería nueva), no el `canvas-confetti` que sugería el spec como fallback — generador propio `leadershipConfettiParticles()` con los 5 colores de pilar, disparado 1.5s después de entrar a la isla si `allModulesDone`, y solo si `!pref` (respeta `prefers-reduced-motion`, igual que el resto del archivo).
- **Hallazgo no relacionado, sin tocar**: `src/app/[locale]/dashboard/modules/[id]/quiz/page.tsx` (890 líneas) resultó ser una copia completa del diseño *anterior* de `leadership-path/page.tsx` (fases/racha/confeti viejo) sirviendo en la ruta de quiz — `VideoPlayer.tsx` navega activamente a esa ruta tras ver un video, así que es una página rota en producción para cualquier estudiante que complete un video. Fuera de alcance de esta sesión (lógica de quiz desconocida/no reconstruida aquí); pendiente de una tarea propia.

## Sesión 13 — Leadership Path: path orgánico por estudiante + Capstone card premium + 3 fixes visuales

- **Fix 1 — punto animado al Capstone eliminado**: el `<circle><animateMotion .../></circle>` que viajaba por la ruta marítima activa del mapa (y su derivado `activeRoutePillar`/`isActiveRoute`, ya sin otro uso) se borraron por completo, junto con `.lp-connector-dot`. Reemplazado conceptualmente por las `CapstoneParticles` del Fix 3 (en la vista isla, no el mapa).
- **Fix 2 — path del zigzag interior, único por estudiante**: reemplaza el S simétrico (`buildZigzagPath`/`ZIGZAG_PATH_D`, en % sobre un viewBox 0-100) por coordenadas en **píxeles reales**, generadas con `seededRandom(userId, index)` (hash determinista) — mismo estudiante = mismo path siempre, estudiantes distintos = paths distintos. `generateOrganicPoints`/`generateOrganicPath`/`generateOrganicSegments` son funciones puras a nivel de módulo; los puntos/segmentos se memoizan con `useMemo([userId, nodes.length, containerWidth, nodeHeight])`. `containerWidth` se mide del DOM (`zigzagContainerRef.clientWidth`, con listener de `resize`) porque coordenadas en px reales no pueden venir de un `viewBox` porcentual; `userId` se captura en el efecto de fetch existente (`setUserId(au.id)` justo después de `auth.getUser()` — no es una query nueva, solo se guarda un id que ya se traía). **Corregido un bug del algoritmo dado en el spec**: construía los comandos `C` en orden inverso (terminando cada uno en el punto `i-1`) y luego hacía `.reverse()` del array de strings — eso deja un comando `C` colgando sin `M` previo (path SVG inválido). Implementado igual en espíritu (mismas variables/multiplicadores: variance ±80, control-x ±60 vía `*120`, `nodeHeight*0.6`/`*0.4`) pero construido en orden forward, válido.
- **Nodos posicionados por las coordenadas del path, no por flexbox row/row-reverse**: cada nodo es un `<div style={position:absolute,left:pt.x,top:pt.y}>` con dos hijos independientes (círculo e info), cada uno con su propio offset/centrado — ya no existe `.lp-node-row`/`.lp-connector-arm`. El lado del texto/tooltip (`onLeftSide`) se decide por la x **real** generada para ese nodo (`pt.x < containerWidth/2`), no por `idx%2`. En viewports angostos (`containerWidth < 480`, propio `isNarrow`, no media query) el texto pasa a ir debajo del círculo en vez de al lado, y el tooltip "SIGUIENTE" se oculta (ya no por CSS a 768px, sino por la misma medición real).
- **Bug de Framer Motion evitado — transform estático vs animado no pueden compartir elemento**: al posicionar con `transform:translate(-50%,-50%)` (centrado) un nodo que ALSO anima `x`/`y`/`scale` vía Framer Motion, FM reescribe `style.transform` completo a partir de sus propios valores animados y el `-50%,-50%` estático se pierde — el nodo quedaría desplazado medio-círculo de su punto real. Patrón usado en todo el archivo para evitar esto: el centrado estático vive en un `<div>` plano (no `motion`); el `x`/`y`/`scale` animado vive en un `m.div` HIJO sin ningún transform propio. Aplica a los círculos de módulo, su info, y los wrappers de Capstone/Great Venture.
- **Path en segmentos**: en vez de un solo `<path>`, `organicSegments` (uno por tramo entre nodos consecutivos) se renderizan como `<path>` independientes con `strokeWidth = 1.5 + (i / (segments.length-1)) * 1.5` — más fino al inicio del recorrido, 3px en el tramo más reciente. Un `organicHaloPath` (el path completo unido, `generateOrganicPath`) se dibuja debajo en `var(--line)` opacity 0.06 como halo de fondo, igual que el `.lp-connector-halo` del mapa.
- **Capstone — card premium (Fix 3 en isla, Fix 4 en mapa)**: reemplaza la montaña (`clip-path` triángulo) de la sesión anterior por una card 140×140 (`100×100` en el mapa, `.capstone-card--sm`) con sombra de 3 capas + `CapstoneCardBorder` (memoizado, conic-gradient rotando vía `m.div animate={{rotate:360}}`, nunca CSS `@keyframes`, para respetar `useReducedMotion`) + `CapstoneParticles` (memoizado, solo en isla — 2 por pilar, posición inicial en `seededRandom(userId, 500+idx)*2π` a radio 180px, color real del pilar si ese pilar está 100% completo o `var(--line-strong)` si no). **Sustitución deliberada**: el spec define un `PILLAR_COLORS` plano (`['#C0392B',...]`) para las partículas, pero ese nombre ya existe en el archivo como `Record<Pillar,{solid,soft}>` — se reusa ese (`PILLARS.map(p => PILLAR_COLORS[p].solid)`) en vez de declarar un array duplicado que podría desincronizarse.
- **Reducción de movimiento real, no solo `useReducedMotion`**: el spec pedía detectar con `window.matchMedia('(prefers-reduced-motion: reduce)')`, pero el archivo ya usa `useReducedMotion()` de Framer Motion (mismo mecanismo, ya importado, usado en cada animación de esta página) — se reusa esa única fuente (`pref`) para gatear el giro del borde, las partículas y el `initial` del path, en vez de añadir una segunda detección redundante.
- **Constantes eliminadas por quedar huérfanas**: `TOTAL_NODES`, `fillIndex`/`fillPct`, `PathShimmer`, `CapstonePulse`, `buildZigzagPath`/`ZIGZAG_PATH_D`, `pathLen`/`zigzagBgPathRef`, CSS de `.lp-node-row`, `.lp-connector-arm`, `.lp-zigzag-svg`/`-line-path`/`-line-fill-path`/`-mobile-line-*`, `.lp-zznode-capstone(-label)`, `.lp-hub-capstone`.
- Componentes memoizados nuevos: `CapstoneCardBorder`, `CapstoneParticles` (perpetuos, fuera del componente principal, nunca dentro de un `.map()`). `PulseRing1`/`PulseRing2`/`FogPulse` no se tocaron.