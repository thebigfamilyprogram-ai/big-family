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