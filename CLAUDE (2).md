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
  "email": "Resend (via Supabase Edge Functions)"
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

### CSS / Design
- **Never** hardcode colors — always use CSS variables
- **Exception:** `--accent: #C0392B` is always hardcoded, never via variable
- **Never** per-page `@import` for fonts — Satoshi loads globally in `layout.tsx`
- **Never** `body { background: #F5F3EF }` — always use `var(--bg)`
- **Never** `color: #0D0D0D` — always use `var(--ink)`
- **Never** `background: #fff` — always use `var(--card-bg)`
- **Never** `color: #6B6B6B` — always use `var(--mute)`
- Skeleton shimmer must use CSS variables: `var(--bg-2)` and `var(--card-bg)`

### Framer Motion
- Always `type: "spring"` — never `type: "tween"`
- Always `viewport={{ once: true }}` on `whileInView`
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
| `src/components/GlobeHero.tsx` | Landing page (complete, no Three.js) |
| `src/components/Globe/GlobeCanvas.tsx` | Globe React wrapper + flag overlays |
| `src/components/Globe/GlobeWorker.ts` | Three.js in Web Worker (OffscreenCanvas) |
| `src/components/Globe/GlobeFallback.ts` | Three.js fallback for Safari < 16.4 |
| `src/components/DashboardSidebar.tsx` | Student sidebar |
| `src/components/ExpositorSidebar.tsx` | Expositor sidebar |
| `src/components/ProjectEditor.tsx` | Capstone IDEMR editor |
| `src/components/ModuleEditor.tsx` | Module editor for expositores |
| `src/components/NewsEditor.tsx` | News editor with live preview |
| `src/components/ProjectReactions.tsx` | 5-emoji reaction system |
| `src/components/Toast.tsx` | Toast notifications |
| `src/proxy.ts` | Middleware (auth protection) |
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

## Recent Commits
- `ca542f7` — Quiz damping, evaluate animation, goals CSS, dashboard grid
- `99a395a` — PageSpeed: local fonts, browserslistrc, reflow fix
- `66cdedb` — Fix crash: removed optimizeCss, Framer Motion SSR guard, Three.js ES Module
- Latest — Globe migrated to OffscreenCanvas Web Worker, PageSpeed 54% → 98%

---

## Routes Structure
```
/ → Landing (GlobeHero)
/login, /register, /forgot-password
/submit/* → Día de Liderazgo special flow
/dashboard/* → Student area
/coordinator/* → Coordinator area
/admin/* → Admin area (Luis Barrios only)
/expositor/* → Module creators
/news, /news/[slug] → Public blog
/timeline → Public timeline
/success-stories, /success-stories/[id] → Public stories
/certificacion/[id] → Diploma page
```
