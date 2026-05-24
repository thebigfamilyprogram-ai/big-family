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

**Estado:** En ejecución...
