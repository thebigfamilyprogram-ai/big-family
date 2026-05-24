# MISSION.md — Big Family Platform

Lee context.md y claude.md antes de empezar.
Ejecuta cada tarea en orden. No pases a la siguiente hasta que
tsc --noEmit retorne 0 errores y el build sea limpio.
Documenta cada tarea completada en MISSION_LOG.md.

---

## TAREA 1 — Diagnóstico general (sin tocar nada)

Haz un diagnóstico completo del proyecto y produce un reporte
organizado por severidad. No hagas ningún cambio todavía.

1. tsc --noEmit — lista cada error con archivo y línea
2. npm run build — captura warnings y errores
3. npx eslint src/ --ext .ts,.tsx — lista todos los problemas
4. npm audit — lista vulnerabilidades críticas o altas
5. Busca todos los .from('tabla') en el código y verifica que
   esas tablas existan según context.md
6. Busca todos los href y router.push() y verifica que cada
   ruta tenga un archivo de página en src/app/
7. grep -r "console.log" src/ --include="*.tsx" --include="*.ts"
8. Verifica que el flujo completo de registro de estudiantes
   funcione: código de acceso → rol → OAuth → dashboard

Output en MISSION_LOG.md con:
🔴 CRÍTICO — rompe funcionalidad
🟠 IMPORTANTE — afecta experiencia
🟡 MENOR — limpieza

---

## TAREA 2 — Fix todos los bugs críticos encontrados

Basándote en el reporte de la Tarea 1, arregla todos los
🔴 CRÍTICOS primero, luego los 🟠 IMPORTANTES.

Prioridad máxima:
- Cualquier bug en el flujo de registro de estudiantes
- Cualquier bug en acceso a módulos
- Cualquier bug en envío de proyectos capstone
- Rutas rotas
- Errores de TypeScript

tsc --noEmit limpio.
Commit: fix: critical bugs pre-launch

---

## TAREA 3 — Fluidez del globo 60fps

Lee src/components/GlobalMap.tsx o GlobeHero.tsx completo.

1. RENDER LOOP — audita todo lo que ocurre dentro del rAF:
   - Elimina cualquier new THREE.Vector3() o instanciación
     de objetos dentro del loop — pre-aloca fuera con useRef
   - Elimina .map() .filter() dentro del loop
   - Actualiza posiciones de banderas HTML cada 2 frames:
     if (frameCount % 2 === 0) updateFlagPositions()
   - Usa delta time para rotación:
     const delta = clock.getDelta()
     globe.rotation.y += 0.0008 * delta * 60

2. TEXTURA — verifica tamaño:
   ls -lh public/textures/
   Si earth-day.jpg > 800KB, comprime con sharp a quality 82
   Convierte a WebP: quality 80 para día, quality 60 para noche
   Carga WebP con fallback JPG
   Aplica anisotropy: texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

3. REACT ISOLATION:
   - Renderer en useRef nunca en useState
   - Export default React.memo(GlobalMap)
   - Verifica que ningún prop que cambie frecuentemente
     llegue al componente

4. INTERSECTION OBSERVER — pausa fuera del viewport:
   const isVisible = useRef(false)
   En animate(): if (!isVisible.current) return

5. RENDERER CONFIG:
   antialias: window.devicePixelRatio < 2
   powerPreference: 'high-performance'
   alpha: false
   shadowMap.enabled: false
   pixelRatio: Math.min(window.devicePixelRatio, 1.5)

6. ADAPTIVE QUALITY — detecta rendimiento del dispositivo:
   Mide FPS por 60 frames al montar
   Si fps < 45: reduce segmentos esfera, desactiva partículas,
   usa textura pequeña, pixelRatio 1
   Si fps >= 45: todos los detalles activos

7. CLEANUP completo en useEffect return:
   cancelAnimationFrame, observer.disconnect()
   scene.traverse con geometry.dispose() material.dispose()
   renderer.dispose() renderer.forceContextLoss()

tsc --noEmit limpio.
Commit: perf: globe 60fps render loop optimization

---

## TAREA 4 — Rediseño visual del globo

Estilo objetivo: Técnico/Espacial + Elegante.
Referencia: SpaceX mission control meets Apple Maps.
Paleta: azules profundos, blanco baja opacidad, ámbar #F59E0B
como único acento cálido.

1. ATMÓSFERA FRESNEL — dos capas:
   Capa interior: SphereGeometry(1.02), ShaderMaterial con
   dot(viewDirection, normal), color #60A5FA, AdditiveBlending,
   opacidad 0-0.4 según ángulo, efecto de respiración:
   intensidad += 0.08 * sin(time * 0.5)

   Capa exterior: SphereGeometry(1.08), mismo shader,
   color #1E3A5F, opacidad máx 0.15

2. MARCADORES DE PAÍSES — reemplaza implementación actual:
   Por país: esfera pequeña r=0.012 color #F59E0B +
   TorusGeometry fino color blanco opacidad 0.3
   Pulso orgánico: scale = 1 + 0.35 * Math.pow(Math.sin(t * freq + offset), 2)
   Frecuencia única por país entre 0.8 y 1.4
   Posición con: latLngToVec3(lat, lng, 1.0)

3. ARCOS ANIMADOS:
   QuadraticBezierCurve3 con midpoint = start.add(end).normalize() * 1.4
   LineBasicMaterial color blanco opacidad 0.2, depthWrite false
   Colombia como hub: opacidad 0.35 en sus arcos
   Partícula por arco: t = (elapsed * 0.25 + offset) % 1
   Fade in t<0.1, fade out t>0.9

4. GRILLA TÉCNICA:
   EdgesGeometry sobre SphereGeometry(1.001, 24, 12)
   Color blanco opacidad 0.05

5. ILUMINACIÓN:
   DirectionalLight #ffffff intensidad 1.2 en (5,3,5)
   DirectionalLight #1D4ED8 intensidad 0.3 en (-5,-2,-3)
   AmbientLight #0F172A intensidad 0.4

6. BANDERAS como HTML overlay:
   Proyecta posición 3D a screen con pos.project(camera)
   Verifica visibilidad: normal.dot(toCam) > 0
   CSS: 22px, border-radius 6px, border rgba(255,255,255,0.2)
   box-shadow 0 2px 8px rgba(0,0,0,0.4), pointer-events none
   opacity 0 cuando el país está en el lado oscuro, transition 300ms
   Actualiza cada 2 frames

7. ELIMINA cualquier objeto rojo o debug que haya quedado

tsc --noEmit limpio.
Commit: feat: globe visual redesign technical-elegant

---

## TAREA 5 — UI/UX Overhaul

Lee antes de tocar:
- El hero de la landing
- El sidebar del coordinador
- El dashboard del estudiante sección stats
- src/app/globals.css
- tailwind.config.js

### 5A. DARK MODE — primero siempre

Audita hardcoded colors:
grep -r "bg-gray-\|bg-white\|bg-black\|text-gray-\|#[0-9a-fA-F]" \
  src/components src/app --include="*.tsx" --include="*.css" \
  | grep -v "dark:" | grep -v "//.*#"

Para cada violación: usa CSS variable existente o créala en
:root y .dark

Script anti-flash en <head> ANTES de cualquier CSS:
  (function() {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark',
      saved ? saved === 'dark' : prefersDark)
  })()

Skeletons: solo bg-muted o var(--muted), nunca bg-gray-200
Success-stories: audita y corrige cada elemento
Toggle: 44x44px, aria-label, persiste en localStorage

Commit: fix: dark mode complete

### 5B. SIDEBAR COORDINADOR

Agrupa 10 items en 3 secciones:
PRINCIPAL: Dashboard, Proyectos, Módulos
COMUNIDAD: Feed, Historias, Anuncios
GESTIÓN: Estudiantes, Calendario, Reportes, Configuración

Cada grupo:
- Header: 10px uppercase letter-spacing 0.1em color muted
- Collapse con max-height transition 250ms (no height)
- Estado persiste en localStorage por grupo
- Active item: background accent 10% opacity + border-left 2px accent

Mobile < 768px: sidebar como drawer, transform translateX(-100%),
hamburger button fixed, tap outside cierra

Commit: fix: coordinator sidebar grouped collapsible

### 5C. STATS EN VIVO

Elimina "42 Streak" y "2.4k Network" hardcodeados.

Crea src/hooks/useRealtimeStats.ts:
- Fetch inicial con Promise.all: count de profiles(role=student),
  schools, user_badges, sum de xp_log.amount
- Realtime con supabase.channel() en INSERT de profiles y user_badges
- Retorna { stats, loading }
- Usa el patrón lazy-init con useRef del proyecto para el cliente Supabase

Componente AnimatedNumber:
- useEffect con requestAnimationFrame cuando value cambia
- Duración 800ms, easing ease-out-cubic
- Skeleton mientras loading (nunca mostrar 0)

Commit: feat: realtime stats animated counter

### 5D. HERO ASIMÉTRICO

Reemplaza hero centrado con split-screen:
- Grid: grid-cols-[60%_40%] en desktop
- Izquierda: texto left-aligned, headline tracking-tighter,
  subtítulo max 52ch, CTAs left-aligned
- Derecha: GlobalMap
- Mobile: stack vertical, globo arriba height 50vh, texto abajo
- Usa min-h-[100dvh] nunca h-screen

Entrada con Framer Motion staggered:
- Eyebrow delay 0ms, h1 delay 100ms, sub delay 200ms, CTA delay 300ms
- spring: stiffness 100, damping 20
- initial: opacity 0, y: 20

Commit: feat: hero asymmetric layout

### 5E. TIPOGRAFÍA

Verifica fuentes actuales en globals.css y tailwind.config.js
Si Inter se usa como fuente principal reemplaza por Satoshi
Todos los @font-face deben tener font-display: swap
Geist Mono para XP, stats, códigos numéricos

Commit: feat: typography font-display swap

---

## Reglas globales

- tsc --noEmit limpio antes de cada commit
- Un commit por tarea o subtarea
- Si una tarea falla, documenta en MISSION_LOG.md y continúa
- No pidas confirmación entre tareas
- Al terminar todo escribe resumen en MISSION_LOG.md
