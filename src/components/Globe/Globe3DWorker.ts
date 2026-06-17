// Globe3DWorker.ts — OffscreenCanvas Web Worker
// Uses three-globe for globe/arcs/points, manual THREE for camera/lights/renderer.
// NO DOM access allowed in Workers — textures loaded via fetch + createImageBitmap.

// three is Worker-safe (uses typeof window guard). three-globe is NOT — it reads
// window.THREE / window.innerWidth at module eval time. We dynamic-import it inside
// initGlobe AFTER the polyfill below has run, so window exists when three-globe loads.
import type ThreeGlobe from 'three-globe'  // type-only: erased at compile time
import * as THREE from 'three'

// Polyfill window for three-globe (no typeof guard in its dist).
// Runs synchronously at module eval, before initGlobe ever calls import('three-globe').
if (typeof window === 'undefined') {
  ;(globalThis as any).window = {  // eslint-disable-line @typescript-eslint/no-explicit-any
    THREE:               undefined,
    innerWidth:          800,
    innerHeight:         600,
    devicePixelRatio:    1,
    addEventListener:    () => {},
    removeEventListener: () => {},
  }
}

// ── Arc data (all from Colombia 4.57°N, 74.30°W) ─────────────────────────────
const ALL_ARCS = [
  { startLat: 4.5709, startLng: -74.2973, endLat: 40.4168,  endLng: -3.7038  }, // España
  { startLat: 4.5709, startLng: -74.2973, endLat: 38.9072,  endLng: -77.0369 }, // EEUU
  { startLat: 4.5709, startLng: -74.2973, endLat: 45.4215,  endLng: -75.6972 }, // Canadá
  { startLat: 4.5709, startLng: -74.2973, endLat: 19.4326,  endLng: -99.1332 }, // México
  { startLat: 4.5709, startLng: -74.2973, endLat: 10.4806,  endLng: -66.9036 }, // Venezuela
  { startLat: 4.5709, startLng: -74.2973, endLat: -15.7939, endLng: -47.8828 }, // Brasil
  { startLat: 4.5709, startLng: -74.2973, endLat: -34.6037, endLng: -58.3816 }, // Argentina
  { startLat: 4.5709, startLng: -74.2973, endLat: 48.8566,  endLng: 2.3522   }, // Francia
  { startLat: 4.5709, startLng: -74.2973, endLat: 14.6349,  endLng: -90.5069 }, // Guatemala
  { startLat: 4.5709, startLng: -74.2973, endLat: 28.6139,  endLng: 77.2090  }, // India
]

// ── Module state ──────────────────────────────────────────────────────────────
let renderer: THREE.WebGLRenderer | null = null
let scene:    THREE.Scene    | null = null
let camera:   THREE.PerspectiveCamera | null = null
let globe:    ThreeGlobe     | null = null
let globeMat: THREE.MeshPhongMaterial | null = null
let ambLight:   THREE.AmbientLight  | null = null
let pointLight: THREE.PointLight    | null = null
let dayTex:   THREE.Texture | null = null
let nightTex: THREE.Texture | null = null

let rafId      = 0
let lastTime   = 0
let isVisible  = true
let isMobile   = false

// ── Texture loading (Worker-compatible — no TextureLoader/Image) ──────────────
async function loadTex(urls: string[]): Promise<THREE.Texture | null> {
  for (const url of urls) {
    try {
      const res    = await fetch(url)
      if (!res.ok) continue
      const blob   = await res.blob()
      const bitmap = await createImageBitmap(blob, {
        imageOrientation:    'flipY',
        premultiplyAlpha:    'none',
        colorSpaceConversion: 'none',
      })
      const tex           = new THREE.Texture(bitmap)
      tex.flipY           = false
      tex.colorSpace      = THREE.SRGBColorSpace
      tex.needsUpdate     = true
      return tex
    } catch { /* try next fallback */ }
  }
  return null
}

// ── Arc helpers ───────────────────────────────────────────────────────────────
function buildArcData(isDark: boolean) {
  const colors = isDark ? ['#C0392B', '#F5F3EF'] : ['#C0392B', '#2D2D2D']
  const arcs   = isMobile ? ALL_ARCS.slice(0, 4) : ALL_ARCS
  return arcs.map((a, i) => ({ ...a, color: colors[i % colors.length] }))
}

function applyArcs(isDark: boolean) {
  if (!globe) return
  globe
    .arcsData(buildArcData(isDark))
    .arcColor('color')
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000)
    .arcStroke(0.5)
    .arcAltitudeAutoScale(0.4)
    .arcCurveResolution(isMobile ? 16 : 32)
    .arcsTransitionDuration(1000)
}

// ── Lights ────────────────────────────────────────────────────────────────────
function buildLights(isDark: boolean) {
  if (!scene) return
  if (ambLight)   { scene.remove(ambLight);   ambLight   = null }
  if (pointLight) { scene.remove(pointLight); pointLight = null }
  ambLight   = new THREE.AmbientLight(0xffffff, isDark ? 0.4 : 0.6)
  pointLight = new THREE.PointLight(0xffffff, isDark ? 1.6 : 1.2)
  pointLight.position.set(200, 100, 200)
  scene.add(ambLight)
  scene.add(pointLight)
}

// ── Theme update (no globe rebuild) ──────────────────────────────────────────
function applyTheme(isDark: boolean) {
  if (globeMat) {
    globeMat.map        = isDark ? (nightTex ?? dayTex) : dayTex
    globeMat.needsUpdate = true
  }
  if (globe) {
    globe.atmosphereColor('#C0392B').atmosphereAltitude(isDark ? 0.22 : 0.18)
    applyArcs(isDark)
  }
  if (ambLight)   ambLight.intensity   = isDark ? 0.4 : 0.6
  if (pointLight) pointLight.intensity = isDark ? 1.6 : 1.2
}

// ── Animation loop (30fps throttle) ──────────────────────────────────────────
function animate(now: number) {
  if (!isVisible) { rafId = 0; return }
  rafId = requestAnimationFrame(animate)
  if (now - lastTime < 33) return  // ~30fps cap
  lastTime = now

  if (globe)    globe.rotation.y += 0.0005
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (globe)    (globe as any).tick(now)  // advance arc-dash animations (not in d.ts)
  if (renderer && scene && camera) renderer.render(scene, camera)
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function initGlobe(
  canvas: OffscreenCanvas,
  w: number, h: number,
  mobile: boolean,
  dpr: number,
  isDark: boolean,
) {
  try {
    isMobile = mobile

    // Dynamic import: three-globe evaluates here, AFTER the globalThis.window polyfill
    const { default: ThreeGlobeLib } = await import('three-globe')

    renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 2, alpha: true,
      powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(dpr, 2))
    renderer.setClearColor(0x000000, 0)  // transparent — CSS handles background
    renderer.setSize(w, h, false)
    renderer.outputColorSpace    = THREE.SRGBColorSpace
    renderer.toneMapping         = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    scene  = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100)
    camera.position.set(0, 0, 4.2)

    // Load textures in parallel (fetch + createImageBitmap — Worker safe)
    ;[dayTex, nightTex] = await Promise.all([
      loadTex(['/textures/earth-day.webp',   '/textures/earth-day.jpg']),
      loadTex(['/textures/earth-night.webp', '/textures/earth-night.jpg']),
    ])

    // Globe material with manually loaded texture
    globeMat = new THREE.MeshPhongMaterial({
      map:       isDark ? (nightTex ?? dayTex) : dayTex,
      specular:  new THREE.Color(0x333333),
      shininess: 15,
    })

    // ThreeGlobe — atmosphere via API, no globeImageUrl (would break in Worker)
    globe = new ThreeGlobeLib()
      .showAtmosphere(true)
      .atmosphereColor('#C0392B')
      .atmosphereAltitude(isDark ? 0.22 : 0.18)

    globe.globeMaterial(globeMat)

    applyArcs(isDark)

    globe
      .pointsData([{ lat: 4.5709, lng: -74.2973, size: 1.4, color: '#C0392B' }])
      .pointColor('color')
      .pointAltitude(0.01)
      .pointRadius('size')
      .pointsMerge(true)

    buildLights(isDark)

    globe.rotation.x = 0.1
    globe.rotation.y = Math.PI * 0.55
    scene.add(globe)

    lastTime = 0
    rafId    = requestAnimationFrame(animate)
    postMessage({ type: 'ready' })
  } catch (err) {
    postMessage({ type: 'error', message: String(err) })
  }
}

// ── Destroy ───────────────────────────────────────────────────────────────────
function destroyGlobe() {
  cancelAnimationFrame(rafId)
  rafId = 0
  if (scene) {
    scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m: THREE.Material) => {
          const mat = m as THREE.MeshPhongMaterial
          if (mat.map) mat.map.dispose()
          mat.dispose()
        })
      }
    })
  }
  if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null }
  scene = null; camera = null; globe = null; globeMat = null
  ambLight = null; pointLight = null; dayTex = null; nightTex = null
}

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  const msg = e.data as { type: string; [k: string]: unknown }
  switch (msg.type) {
    case 'init':
      initGlobe(
        msg.canvas    as OffscreenCanvas,
        msg.width     as number,
        msg.height    as number,
        msg.isMobile  as boolean,
        msg.dpr       as number,
        msg.isDark    as boolean,
      )
      break
    case 'theme':
      applyTheme(msg.isDark as boolean)
      break
    case 'resize':
      if (renderer) renderer.setSize(msg.width as number, msg.height as number, false)
      if (camera) {
        camera.aspect = (msg.width as number) / (msg.height as number)
        camera.updateProjectionMatrix()
      }
      break
    case 'pause':
      isVisible = false
      cancelAnimationFrame(rafId)
      rafId = 0
      break
    case 'resume':
      if (!isVisible) {
        isVisible = true
        lastTime  = 0
        rafId     = requestAnimationFrame(animate)
      }
      break
    case 'destroy':
      destroyGlobe()
      break
  }
}
