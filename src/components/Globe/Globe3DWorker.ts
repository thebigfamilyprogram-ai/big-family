// Globe3DWorker.ts — OffscreenCanvas Web Worker
// Pure THREE.js only (no three-globe).
// THREE.js uses typeof-window guards internally — safe in Workers.
// Textures loaded via fetch + createImageBitmap (no TextureLoader / Image).

import * as THREE from 'three'

// ── Arc data (origin: Colombia 4.57°N 74.30°W) ───────────────────────────────
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
let renderer:   THREE.WebGLRenderer       | null = null
let scene:      THREE.Scene               | null = null
let camera:     THREE.PerspectiveCamera   | null = null
let globeGroup: THREE.Group               | null = null
let globeMat:   THREE.MeshPhongMaterial   | null = null
let atmosMesh:  THREE.Mesh                | null = null
let arcGroup:   THREE.Group               | null = null
let ambLight:   THREE.AmbientLight        | null = null
let pointLight: THREE.PointLight          | null = null
let dayTex:     THREE.Texture             | null = null
let nightTex:   THREE.Texture             | null = null

let rafId     = 0
let lastTime  = 0
let isVisible = true
let isMobile  = false

// ── Geometry helpers ──────────────────────────────────────────────────────────
function latLngToVec(lat: number, lng: number, r = 1): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta) * r,
     Math.cos(phi) * r,
     Math.sin(phi) * Math.sin(theta) * r,
  )
}

function buildArcLine(
  startLat: number, startLng: number,
  endLat: number,   endLng: number,
  color: string,
): THREE.Line {
  const s   = latLngToVec(startLat, startLng)
  const e   = latLngToVec(endLat, endLng)
  // Elevate midpoint above sphere surface for the arc shape
  const mid = s.clone().add(e).multiplyScalar(0.5)
  mid.normalize().multiplyScalar(mid.length() + 0.4)

  const curve  = new THREE.QuadraticBezierCurve3(s, mid, e)
  const geo    = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64))
  const mat    = new THREE.LineDashedMaterial({
    color,
    dashSize:  0.12,
    gapSize:   0.07,
    linewidth: 1,
  })
  const line = new THREE.Line(geo, mat)
  line.computeLineDistances()
  return line
}

// ── Texture loading (Worker-safe: no Image / TextureLoader) ───────────────────
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
      const tex       = new THREE.Texture(bitmap)
      tex.flipY       = false
      tex.colorSpace  = THREE.SRGBColorSpace
      tex.needsUpdate = true
      return tex
    } catch { /* try next fallback */ }
  }
  return null
}

// ── Lights ────────────────────────────────────────────────────────────────────
function buildLights(isDark: boolean) {
  if (!scene) return
  if (ambLight)   { scene.remove(ambLight);   ambLight   = null }
  if (pointLight) { scene.remove(pointLight); pointLight = null }
  ambLight   = new THREE.AmbientLight(0xffffff, isDark ? 0.4 : 0.6)
  pointLight = new THREE.PointLight(0xffffff,   isDark ? 1.6 : 1.2)
  pointLight.position.set(200, 100, 200)
  scene.add(ambLight)
  scene.add(pointLight)
}

// ── Arc group (rebuilt on theme change) ───────────────────────────────────────
function buildArcs(isDark: boolean) {
  if (!globeGroup) return
  if (arcGroup) { globeGroup.remove(arcGroup); arcGroup = null }
  arcGroup = new THREE.Group()
  const colors = isDark ? ['#C0392B', '#F5F3EF'] : ['#C0392B', '#2D2D2D']
  const arcs   = isMobile ? ALL_ARCS.slice(0, 4) : ALL_ARCS
  arcs.forEach((a, i) => {
    arcGroup!.add(buildArcLine(
      a.startLat, a.startLng,
      a.endLat,   a.endLng,
      colors[i % colors.length],
    ))
  })
  globeGroup.add(arcGroup)
}

// ── Theme update (no globe rebuild) ──────────────────────────────────────────
function applyTheme(isDark: boolean) {
  if (globeMat) {
    globeMat.map       = isDark ? (nightTex ?? dayTex) : dayTex
    globeMat.needsUpdate = true
  }
  if (atmosMesh) {
    const m = atmosMesh.material as THREE.MeshPhongMaterial
    m.opacity    = isDark ? 0.14 : 0.09
    m.needsUpdate = true
  }
  if (ambLight)   ambLight.intensity   = isDark ? 0.4 : 0.6
  if (pointLight) pointLight.intensity = isDark ? 1.6 : 1.2
  buildArcs(isDark)
}

// ── Animation loop (30fps throttle) ──────────────────────────────────────────
function animate(now: number) {
  if (!isVisible) { rafId = 0; return }
  rafId = requestAnimationFrame(animate)
  if (now - lastTime < 33) return   // ~30fps cap
  lastTime = now

  if (globeGroup) globeGroup.rotation.y += 0.0005

  // Animate arc dashes by decrementing dashOffset (exists at runtime, missing in d.ts)
  if (arcGroup) {
    arcGroup.children.forEach((child) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;((child as THREE.Line).material as any).dashOffset -= 0.004
    })
  }

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

    renderer = new THREE.WebGLRenderer({
      canvas, antialias: dpr < 2, alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(dpr, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(w, h, false)
    renderer.outputColorSpace    = THREE.SRGBColorSpace
    renderer.toneMapping         = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    scene  = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100)
    camera.position.set(0, 0, 4.2)

    ;[dayTex, nightTex] = await Promise.all([
      loadTex(['/textures/earth-day.webp',   '/textures/earth-day.jpg']),
      loadTex(['/textures/earth-night.webp', '/textures/earth-night.jpg']),
    ])

    globeGroup = new THREE.Group()
    globeGroup.rotation.x = 0.1
    globeGroup.rotation.y = Math.PI * 0.55

    // Earth sphere
    globeMat = new THREE.MeshPhongMaterial({
      map:       isDark ? (nightTex ?? dayTex) : dayTex,
      specular:  new THREE.Color(0x333333),
      shininess: 15,
    })
    globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), globeMat))

    // Atmosphere halo (backside sphere, slightly larger, red tint)
    const atmosMat = new THREE.MeshPhongMaterial({
      color:       new THREE.Color('#C0392B'),
      transparent: true,
      opacity:     isDark ? 0.14 : 0.09,
      side:        THREE.BackSide,
      depthWrite:  false,
    })
    atmosMesh = new THREE.Mesh(new THREE.SphereGeometry(1.18, 64, 32), atmosMat)
    globeGroup.add(atmosMesh)

    // Colombia origin dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#C0392B' }),
    )
    dot.position.copy(latLngToVec(4.5709, -74.2973, 1.01))
    globeGroup.add(dot)

    buildArcs(isDark)
    buildLights(isDark)
    scene.add(globeGroup)

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
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m) => {
          const mat = m as THREE.MeshPhongMaterial
          if (mat.map) mat.map.dispose()
          mat.dispose()
        })
      }
    })
  }
  if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null }
  scene = null; camera = null; globeGroup = null; globeMat = null
  atmosMesh = null; arcGroup = null; ambLight = null; pointLight = null
  dayTex = null; nightTex = null
}

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  const msg = e.data as { type: string; [k: string]: unknown }
  switch (msg.type) {
    case 'init':
      initGlobe(
        msg.canvas   as OffscreenCanvas,
        msg.width    as number,
        msg.height   as number,
        msg.isMobile as boolean,
        msg.dpr      as number,
        msg.isDark   as boolean,
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
