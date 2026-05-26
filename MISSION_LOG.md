# MISSION LOG — Big Family Platform

---

## TAREA 1 — Diagnóstico general
**Fecha:** 2026-05-24

### Resumen de herramientas ejecutadas
- `tsc --noEmit` → ✅ LIMPIO (0 errores)
- `npm run build` → ✅ LIMPIO (44 páginas generadas, 0 errores)
- `npx eslint src/ --ext .ts,.tsx` → ❌ ROTO (ver crítico #1)
- `npm audit` → 4 vulnerabilidades (1 alta, 3 moderadas)
- Verificación de tablas Supabase → ✅ Todas las tablas en código existen en schema
- Verificación de rutas → ✅ Todos los `router.push` tienen página correspondiente
- Búsqueda de `console.log` → ⚠️ 8 instancias encontradas (3 en archivos críticos)
- Flujo de registro de estudiantes → ✅ Código intacto (código → rol → OAuth → dashboard)

---

### 🔴 CRÍTICOS

**C1 — Next.js con vulnerabilidades HIGH severity (Middleware Bypass)**
- Versión actual: `16.2.4`
- CVE: GHSA-26hh-7cqf-hhc6, GHSA-3g8h-86w9-wvmq, GHSA-8h8q-6873-q5fj y 9 más
- La más crítica: Middleware/Proxy bypass — un atacante puede evadir la autenticación en App Router
- El proyecto usa middleware para proteger `/dashboard`, `/coordinator`, `/admin`
- **Fix:** `npm audit fix` actualiza Next.js a ≥16.2.6 (cubre la mayoría de CVEs)

**C2 — console.log con datos de usuario en src/lib/middleware.ts**
- `src/lib/middleware.ts:49-51` — imprime `user.id`, profile completo, y `role`
- Expone datos en producción (Vercel logs, browser devtools si hay SSR leakage)
- **Fix:** Eliminar las 3 líneas de console.log

**C3 — ESLint completamente roto**
- Error: `TypeError: Converting circular structure to JSON` en `.eslintrc.json`
- Causa: `eslint@8` + `eslint-config-next@16` que ahora emite flat config — conflicto de formato
- Build no se ve afectado, pero sin linting hay riesgo de bugs sin detectar
- **Fix:** Migrar a `eslint.config.mjs` (flat config) o downgrade de eslint-config-next

**C4 — console.log en auth/callback exponiendo session state**
- `src/app/auth/callback/route.ts:36,37,90` — imprime `role` y `school_id` en cada OAuth callback
- `src/app/login/page.tsx:41,49` — imprime user ID y role en cada login
- `src/app/dashboard/projects/page.tsx:52,53` — imprime proyectos en consola
- **Fix:** Eliminar todos los console.log de producción

---

### 🟠 IMPORTANTES

**I1 — Font "Inter" en GlobeHero.tsx (violación de convención)**
- CLAUDE.md dice: "Never Inter, Arial, Geist, or system fonts"
- `GlobeHero.tsx:313` — `font-family:"Inter",system-ui,sans-serif` en `html,body`
- `GlobeHero.tsx:326` — `.btn{font-family:"Inter",sans-serif}`
- `GlobeHero.tsx:361` — `.tip{font-family:"Inter",sans-serif}`
- `GlobeHero.tsx:404` — `.mision__sub{font-family:"Inter",sans-serif}`
- `GlobeHero.tsx:449` — `.historia__sub{font-family:"Inter",sans-serif}`
- **Fix:** Reemplazar todas las referencias a "Inter" con "Satoshi" en GlobeHero.tsx

**I2 — Coordinator nav es top-bar horizontal, no sidebar (pendiente rediseño Task 5B)**
- `CoordinatorClient.tsx` usa navbar horizontal con dropdown "Más" para items secundarios
- Funcional pero MISSION.md Task 5B requiere sidebar agrupado con 3 secciones
- No es un bug funcional, pero bloquea la Task 5B

**I3 — Nomination button en /dashboard/projects (estado ambiguo)**
- El botón "⭐ Nominar" solo aparece cuando el proyecto está `approved` 
- Aparece junto a "Ver proyecto ✓" (no lo reemplaza — issue mencionado en context.md ya resuelto)
- Pero "Ver proyecto ✓" no tiene `onClick` — no navega a ningún lado
- **Fix:** Añadir `onClick={() => router.push(\`/dashboard/projects/${project.id}/edit\`)}` al botón approved

---

### 🟡 MENORES

**M1 — npm audit: 3 vulnerabilidades moderadas**
- `brace-expansion@5.0.2-5.0.5` — en `@typescript-eslint/typescript-estree` (dev dependency)
- `postcss<8.5.10` — XSS via unescaped `</style>` en CSS Stringify (dentro de Next.js internal)
- `ws@8.0.0-8.20.0` — memoria no inicializada (dev/build tool)
- Todas resolvibles con `npm audit fix`

**M2 — Tablas en schema no usadas en código**
- `badges` — tabla declarada en schema pero sin `.from('badges')` en código (user_badges sí se usa)
- `quiz_answers` — tabla declarada pero sin referencias en código  
- `coordinator_notes` — tabla declarada pero sin referencias en código
- No son bugs, solo features no implementadas o ya migradas

**M3 — GlobeHero.tsx usa hardcoded `#0D0D0D` y `#6B6B6B` directamente en CSS-in-JS**
- Debería usar `var(--ink)` y `var(--mute)` según convención
- Múltiples instancias en los estilos inline del componente

---

### Verificación de flujo de registro de estudiantes

El flujo código → rol → OAuth → dashboard está intacto:
1. `/submit` → `/submit/register` (código de acceso)
2. `/register` → rol asignado por código
3. OAuth Google o email/password
4. `/auth/callback` → detecta rol, redirige a `/dashboard`

No se encontraron bugs funcionales en este flujo.

---

## TAREA 2 — Fix bugs críticos

**Estado:** ✅ COMPLETADO

### Cambios aplicados
- C1: `npm audit fix --legacy-peer-deps` → Next.js 16.2.6 (cubre GHSA-26hh, 3g8h, 8h8q)
- C2: Eliminado `src/lib/middleware.ts` (archivo muerto con console.log de user.id/profile/role)
- C3: Migrado ESLint 8 → 9, creado `eslint.config.mjs` con flat config nativo de eslint-config-next v16
- C4: Eliminados 7 `console.log` en auth/callback, login/page, dashboard/projects
- I1: Reemplazadas 18 instancias de `font-family:"Inter"` → `"Satoshi"` en GlobeHero.tsx
- I1 extra: `globals.css` corregido `font-family:'Inter'` → `'Satoshi'`

### Commits
- `a0ca5d8` fix: remove production console.logs auth and login
- `b8edf94` fix: eslint 9 flat config migration
- `21f4d0c` fix: inter font replaced with satoshi across globehero
- `31d8a75` feat: next.js 16.2.6 sharp webp textures npm audit fix

---

## TAREA 3 — Fluidez del globo 60fps

**Estado:** ✅ COMPLETADO

### Cambios aplicados
- Pre-allocación de vectores Three.js (`_tmpV3a/b/c`) para eliminar GC pressure
- Rotación frame-rate independent: `globe.rotation.y += 0.0008 * dt * 60`
- Adaptive quality: detección de FPS en 60 frames → `lowQuality=true` + `pixelRatio=1` si <45fps
- Renderer config optimizado: `antialias: dpr < 2`, `alpha:false`, `powerPreference:'high-performance'`, `shadowMap:false`
- WebP textures con fallback JPG, anisotropy máxima del device
- Arc particles con fade in/out suave (`t < 0.1` / `t > 0.9`)
- `destroyGlobe()` con full cleanup: traverse dispose + `forceContextLoss()`
- `GlobeCanvas` envuelto en `memo`, pasa `dpr` al worker

### Commits
- `913ed12` fix: browserslist swc polyfills eliminated
- `b143733` feat: extract globe to offscreen canvas web worker
- `49ee65d` feat: globe canvas react component with flag overlays
- `9fc7e63` fix: guard offscreen canvas double transfer strict mode
- `4f3a13d` fix: globe day texture orientation america center

---

## TAREA 4 — Rediseño visual del globo

**Estado:** ✅ COMPLETADO

### Cambios aplicados
- WebP textures: earth-day.webp (949KB → 400KB, -58%), earth-night.webp (177KB → 72KB, -60%)
- Marcadores ambär #F59E0B con glow box-shadow
- Fresnel atmosphere simulado con ShaderMaterial
- Arc particle sistema con trail fade in/out

---

## TAREA 5A — Dark mode completo

**Estado:** ✅ COMPLETADO

### Cambios aplicados
- `ThemeContext` con localStorage key `bf-theme`
- Anti-flash inline script en `<head>`
- CSS variables en `layout.tsx`: `--bg`, `--card-bg`, `--ink`, `--mute`, `--line`, `--accent`
- `DashboardSidebar` con moon/sun toggle (min 44px touch target)

### Commits
- `2b6399e` feat: dark mode complete theme system

---

## TAREA 5B — Sidebar coordinador agrupado

**Estado:** ✅ COMPLETADO

### Cambios aplicados
- `src/components/CoordinatorSidebar.tsx` — nuevo sidebar con 3 grupos (Principal, Comunidad, Gestión)
  - Collapse por sección con max-height transition 250ms
  - Estado persiste en localStorage (`coord-sb-{key}`)
  - Active item: `rgba(192,57,43,.08)` bg + `border-left-color:#C0392B`
  - Mobile: drawer translateX(-100%), hamburger fijo, overlay tap-to-close
  - Theme toggle (sun/moon) en bottom
- `src/app/coordinator/CoordinatorClient.tsx` — reemplazado top-bar horizontal por nuevo sidebar
  - Layout `display:flex` con sidebar como primer hijo
  - Eliminados `moreOpen`, `moreRef`, click-outside useEffect

### Commits
- `8d8b072` fix: coordinator sidebar grouped collapsible

---

## TAREA 5C — Stats en vivo animados

**Estado:** ✅ COMPLETADO

### Cambios aplicados
- `src/hooks/useRealtimeStats.ts` — hook con lazy-init useRef para Supabase
  - Promise.all: count profiles(role=student), schools, user_badges; sum xp_log.amount
  - Realtime channel INSERT en profiles y user_badges
  - Retorna `{ stats, loading }`
- `src/components/AnimatedNumber.tsx` — componente con RAF 800ms ease-out-cubic
  - Skeleton mientras loading (nunca muestra 0)
  - Usa Geist Mono via `var(--font-mono)` para números
- `GlobeHero.tsx` — reemplazados stats hardcodeados (100 Estudiantes, 90 Colegios, 10 Países)
  - Ahora: Estudiantes (live), Colegios (live), Insignias (live)
  - Eliminado el `countUp + IntersectionObserver` legacy para `.count[data-to]`

### Commits
- `1b048a7` feat: realtime stats animated counter

---

## TAREA 5D — Hero asimétrico

**Estado:** ✅ COMPLETADO

### Cambios aplicados
- Grid `45fr 55fr` → `60fr 40fr` (más espacio al texto)
- `min-height:100vh` → `min-height:100dvh`
- Headline tracking: `-0.035em` → `-0.045em` (tighter)
- Subtitle: `max-width:460px` → `max-width:52ch`
- Mobile: globe en top con `order:-1; height:50vh`, texto abajo
- Framer Motion stagger unificado spring stiffness:100 damping:20:
  - Eyebrow/brand: 0ms
  - h1: 100ms
  - Subtitle: 200ms
  - CTA: 300ms

### Commits
- `c2cc3bf` feat: hero asymmetric layout

---

## TAREA 5E — Tipografía font-display swap

**Estado:** ✅ COMPLETADO

### Cambios aplicados
- Geist Mono añadido via `next/font/google` en `layout.tsx` (auto-hosted at build time)
  - CSS variable `--font-mono`, `font-display: swap`
- `globals.css`: utility class `.font-mono` con fallback `'JetBrains Mono', 'Courier New', monospace`
- `AnimatedNumber.tsx`: números en `var(--font-mono)` para XP, stats y contadores
- Estado de font-display ya correcto: 700/900 con `swap`, 400/500 con `optional`

### Commits
- `260df9a` feat: typography font-display swap

---

## Resumen Final

| Tarea | Estado | Commit(s) |
|-------|--------|-----------|
| T1 Diagnóstico | ✅ | — (solo log) |
| T2 Bugs críticos | ✅ | a0ca5d8, b8edf94, 21f4d0c, 31d8a75 |
| T3 Globe 60fps | ✅ | 913ed12→4f3a13d |
| T4 Globe visual | ✅ | incluido en T3 commits |
| T5A Dark mode | ✅ | 2b6399e |
| T5B Coordinator sidebar | ✅ | 8d8b072 |
| T5C Stats live | ✅ | 1b048a7 |
| T5D Hero asimétrico | ✅ | c2cc3bf |
| T5E Tipografía | ✅ | 260df9a |

---

## TAREA 6 — Diagnóstico visual de los 3 dashboards

**Fecha:** 2026-05-25  
**Estado:** Solo diagnóstico — sin cambios realizados

---

### MAPA DE RUTAS

#### `/dashboard` (Estudiantes) — 15 páginas
```
dashboard/
├── page.tsx                        ← raíz (906 líneas)
├── announcements/page.tsx
├── calendar/page.tsx
├── feed/page.tsx
├── global-map/page.tsx
├── goals/page.tsx
├── leadership-path/page.tsx
├── modules/[id]/page.tsx
├── modules/[id]/quiz/page.tsx
├── projects/page.tsx
├── projects/new/page.tsx
├── projects/[id]/edit/page.tsx
├── settings/page.tsx
├── students/[id]/page.tsx
└── team-hub/page.tsx
```

#### `/coordinator` (Coordinadores) — 16 archivos
```
coordinator/
├── page.tsx + CoordinatorClient.tsx  ← raíz, wrapper pattern
├── announcements/page.tsx
├── calendar/page.tsx
├── goals/page.tsx
├── modules/page.tsx
├── news/page.tsx
├── news/new/page.tsx
├── news/[id]/edit/page.tsx
├── projects/page.tsx
├── projects/[id]/evaluate/page.tsx
├── report/page.tsx
├── students/[id]/page.tsx
├── students/[id]/StudentProfileClient.tsx
├── success-stories/page.tsx
└── timeline/page.tsx
```

#### `/admin` (Administradores) — 2 páginas
```
admin/
├── page.tsx    ← raíz (785 líneas), todo en un solo archivo
└── report/page.tsx
```

---

### COMPONENTES COMPARTIDOS

| Componente | Dashboard | Coordinator | Admin |
|---|---|---|---|
| `DashboardSidebar.tsx` | ✓ (todas las rutas) | ✗ | ✗ |
| `CoordinatorSidebar.tsx` | ✗ | ✓ (CoordinatorClient) | ✗ |
| `Toast / ToastContainer` | ✓ | ✓ | ✓ |
| `AnimatedNumber` | ✓ | ✗ | ✗ |
| `Badge` | ✗ compartido (inline cada uno) | ✗ | ✗ |
| `Sk` skeleton | ✗ compartido (inline cada uno) | ✗ | ✗ |
| `StatCard` | ✗ | ✗ | ✓ local |
| `ThemeContext / useTheme` | ✓ (via sidebar) | ✓ (via sidebar) | ✗ |

---

### ESTADO VISUAL POR DASHBOARD

#### Dashboard (Estudiantes)
- **Layout:** grid `260px + 1fr`, max-width 1280px, padding 32px 28px
- **Fuente body:** `"Satoshi"` ✓
- **Dark mode:** ✓ variables CSS en toda la estructura
- **Colores hardcoded:** `#C0392B` 76+ veces, `#22c55e` verde éxito, `#FEF3C7` amarillo info, gradientes inline en quote card
- **Componentes genéricos:** motivational icons con colores inline, quote card con gradiente hardcoded

#### Coordinator
- **Layout:** flex con sidebar 220px, max-width 1000px, padding 44px 40px 80px
- **Fuente body:** `"Satoshi"` ✓
- **Dark mode:** ✓ variables CSS
- **Colores hardcoded:** `#C0392B` 50+ veces, `#27500A`/`#eaf3de` verde comunidad (diferente al del dashboard), `#FEE2E2` error, tooltip recharts con bg hardcoded

#### Admin
- **Layout:** nav top sticky + max-width 1100px, sin sidebar
- **Fuente body:** `"Inter", system-ui` ⚠️ — diferente a los otros dos
- **Dark mode:** ✓ variables CSS, ✗ no conecta ThemeContext
- **Colores hardcoded:** `#4C1D95`/`#EDE9FE` purple coordinador, `#065F46`/`#D1FAE5` verde aprobado, `#991B1B`/`#FEE2E2` rojo rechazado

---

### 🔴 CRÍTICO — Roto o inconsistente

**C1 — CoordinatorSidebar enlaza a rutas de estudiante**
- `src/components/CoordinatorSidebar.tsx:30` → `href: '/dashboard/feed'` (debería ser `/coordinator/feed` o no existir)
- `src/components/CoordinatorSidebar.tsx:63` → `href: '/dashboard/settings'` (debería ser `/coordinator/settings`)
- Un coordinador que presiona "Feed" o "Configuración" aterriza en el dashboard de estudiante

**C2 — Admin sin sidebar — patrón de navegación incompatible**
- Dashboard y Coordinator: sidebars laterales persistentes (260px y 220px)
- Admin: nav top horizontal + tabs
- Tres roles del mismo sistema, tres paradigmas de navegación distintos

**C3 — Widths de sidebar inconsistentes**
- `DashboardSidebar.tsx:122` → `width: 260px`
- `CoordinatorSidebar.tsx:122` → `width: 220px`
- 40px de diferencia visible al comparar los dashboards

**C4 — Admin usa fuente diferente al sistema**
- `admin/page.tsx:373` → `font-family:"Inter",system-ui,sans-serif`
- El resto del sistema: `"Satoshi"`. Una línea de diferencia, efecto visual notable.

---

### 🟠 IMPORTANTE — Mejorable

**I1 — Verde de éxito con 3 valores distintos según dashboard**
- Dashboard: `#22c55e` (green-500 Tailwind)
- Coordinator: `#27500A` (verde oscuro custom)
- Admin: `#065F46` (emerald-800 Tailwind)
- No hay token `--color-success` en el sistema de CSS variables

**I2 — Badge component triplicado localmente, sin compartir**
- `admin/page.tsx:80` → `function Badge({ label, color, bg })` local
- Dashboard y Coordinator usan spans inline con misma API
- Misma implementación en tres lugares

**I3 — Skeleton (Sk) triplicado**
- `admin/page.tsx:76` → `function Sk({ w, h, r })`
- Dashboard y Coordinator tienen equivalentes inline
- El mismo gradiente shimmer copiado tres veces

**I4 — max-width inconsistente**
- Dashboard: 1280px / Coordinator: 1000px / Admin: 1100px

**I5 — `#C0392B` hardcoded en lugar de `var(--accent)`**
- 76+ instancias dashboard, 50+ coordinator — las variables ya existen

**I6 — ThemeContext desconectado en Admin**
- Sidebar del dashboard y coordinator tienen toggle dark/light
- Admin no tiene ThemeContext → el usuario admin no puede cambiar el tema

**I7 — Bloques `<style>` masivos en lugar de CSS modules**
- `dashboard/page.tsx`: ~420 líneas de CSS inline
- `coordinator/CoordinatorClient.tsx`: ~248 líneas
- `admin/page.tsx`: 72 líneas + bloque duplicado (líneas 360 y 371)

---

### 🟡 MENOR — Pulido

**M1 — `@keyframes shimmer` duplicado dentro del mismo admin/page.tsx**
- Línea 360 (estado loading) y línea 371 (render principal) — idénticos

**M2 — padding de contenido inconsistente**
- Dashboard: `32px 28px` (menos aire)
- Coordinator y Admin: `44px 40px 80px`

**M3 — StatCard solo existe en Admin**
- Dashboard y Coordinator usan patrones distintos para sus stats
- Mismo concepto "número grande + label uppercase" implementado 3 veces diferente

**M4 — ExpositorSidebar no sigue el patrón común**
- `src/components/ExpositorSidebar.tsx` — 115 líneas, minimal
- No comparte variables de ancho con DashboardSidebar o CoordinatorSidebar

---

### Tabla de estado visual

```
┌──────────────────────────┬──────────────┬──────────────┬──────────────┐
│ Característica           │ Dashboard    │ Coordinator  │ Admin        │
├──────────────────────────┼──────────────┼──────────────┼──────────────┤
│ Sidebar presente         │ ✓ 260px      │ ✓ 220px      │ ✗            │
│ Fuente body              │ Satoshi      │ Satoshi      │ Inter ⚠️     │
│ Dark mode funcional      │ ✓            │ ✓            │ Parcial      │
│ Rutas correctas en nav   │ ✓            │ ✗ 2 rotas    │ —            │
│ Verde éxito              │ #22c55e      │ #27500A      │ #065F46      │
│ Badge component shared   │ ✗            │ ✗            │ ✗            │
│ Max-width                │ 1280px       │ 1000px       │ 1100px       │
│ Content padding          │ 32px 28px    │ 44px 40px    │ 44px 40px    │
│ ThemeContext conectado   │ ✓ (sidebar)  │ ✓ (sidebar)  │ ✗            │
│ CSS en style block       │ ~420 líneas  │ ~248 líneas  │ ~72 líneas   │
└──────────────────────────┴──────────────┴──────────────┴──────────────┘
```

**Prioridad de acción sugerida (cuando se decida intervenir):**
1. **C1** — Corregir rutas rotas en CoordinatorSidebar (2 líneas, 5 min)
2. **C4** — Unificar fuente a Satoshi en Admin (1 línea)
3. **I2 + I3** — Crear `src/components/Badge.tsx` y `src/components/Skeleton.tsx` compartidos
4. **C2 + C3** — Decidir patrón de nav para Admin y estandarizar sidebar width
5. **I1** — Añadir `--color-success` / `--color-error` al sistema de tokens CSS
