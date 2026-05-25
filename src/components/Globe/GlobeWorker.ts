/* eslint-disable @typescript-eslint/no-explicit-any */
// GlobeWorker.ts — OffscreenCanvas Web Worker.  No DOM access.

// ── Static data ───────────────────────────────────────────────────────────────
const countries = [
  { name: 'Canadá',          code: 'ca', lat: 45.42,  lon: -75.69, students: 8,  coordLabel: 'N 45°25′ · W 75°41′ · Ottawa' },
  { name: 'Estados Unidos',  code: 'us', lat: 38.89,  lon: -77.03, students: 18, coordLabel: 'N 38°53′ · W 77°01′ · Washington' },
  { name: 'México',          code: 'mx', lat: 19.43,  lon: -99.13, students: 6,  coordLabel: 'N 19°25′ · W 99°07′ · Ciudad de México' },
  { name: 'Guatemala',       code: 'gt', lat: 14.64,  lon: -90.51, students: 6,  coordLabel: 'N 14°38′ · W 90°30′ · Guatemala' },
  { name: 'Nicaragua',       code: 'ni', lat: 12.13,  lon: -86.29, students: 4,  coordLabel: 'N 12°07′ · W 86°17′ · Managua' },
  { name: 'Costa Rica',      code: 'cr', lat:  9.93,  lon: -84.08, students: 5,  coordLabel: 'N 09°55′ · W 84°04′ · San José' },
  { name: 'Colombia',        code: 'co', lat:  4.71,  lon: -74.07, students: 24, coordLabel: 'N 04°42′ · W 74°04′ · Bogotá' },
  { name: 'Paraguay',        code: 'py', lat: -25.28, lon: -57.63, students: 9,  coordLabel: 'S 25°16′ · W 57°37′ · Asunción' },
  { name: 'Francia',         code: 'fr', lat: 48.85,  lon:  2.35,  students: 7,  coordLabel: 'N 48°51′ · E 02°21′ · París' },
  { name: 'Alemania',        code: 'de', lat: 52.52,  lon: 13.40,  students: 6,  coordLabel: 'N 52°31′ · E 13°24′ · Berlín' },
  { name: 'España',          code: 'es', lat: 40.41,  lon: -3.70,  students: 10, coordLabel: 'N 40°24′ · W 03°42′ · Madrid' },
  { name: 'Emiratos Árabes', code: 'ae', lat: 25.20,  lon: 55.27,  students: 5,  coordLabel: 'N 25°12′ · E 55°16′ · Dubái' },
]

const arcPairs = [
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [1, 2], [1, 8], [1, 9], [1, 10],
  [6, 8], [6, 10],
  [8, 11], [10, 11],
  [7, 6], [7, 1],
]

const SCHOOLS_GUAJIRA = [
  { lat: 11.544, lon: -72.907 },
  { lat: 11.373, lon: -72.244 },
  { lat: 11.713, lon: -72.268 },
  { lat: 11.773, lon: -72.441 },
  { lat: 10.770, lon: -73.000 },
  { lat: 10.613, lon: -72.982 },
  { lat: 11.142, lon: -72.613 },
  { lat: 10.963, lon: -72.790 },
]
const SCHOOL_ARC_PAIRS = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,4],[2,6]]

// ── Shader sources ────────────────────────────────────────────────────────────
const PULSE_VERT = `
  attribute float aT;
  varying float vT;
  void main(){
    vT=aT;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }`

const PULSE_FRAG = `
  uniform float uH1,uH2,uLen,uVis,uMaxA;
  varying float vT;
  float pulse(float head,float t,float len){
    float d=mod(head-t+2.0,1.0);
    if(d>len)return 0.0;
    return sin((d/len)*3.14159265);
  }
  void main(){
    float a=max(pulse(uH1,vT,uLen),pulse(uH2,vT,uLen))*uVis*uMaxA;
    gl_FragColor=vec4(1.0,1.0,1.0,a);
  }`

// Atmosphere — Fresnel via dot(viewDir, normal)
const ATM_VERT = `
  varying vec3 vN;
  varying vec3 vView;
  void main(){
    vN=normalize(normalMatrix*normal);
    vec4 mvPos=modelViewMatrix*vec4(position,1.0);
    vView=normalize(-mvPos.xyz);
    gl_Position=projectionMatrix*mvPos;
  }`

const ATM_INNER_FRAG = `
  uniform vec3 uC;
  uniform float uBreath;
  varying vec3 vN,vView;
  void main(){
    float f=pow(1.0-abs(dot(vView,vN)),2.5);
    gl_FragColor=vec4(uC,f*uBreath);
  }`

const ATM_OUTER_FRAG = `
  uniform vec3 uC;
  uniform float uBreath;
  varying vec3 vN,vView;
  void main(){
    float f=pow(1.0-abs(dot(vView,vN)),2.0);
    gl_FragColor=vec4(uC,f*uBreath);
  }`

// ── Module state ──────────────────────────────────────────────────────────────
let T: any = null
let scene: any, camera: any, _renderer: any, clock: any
let globe: any
let earthMat: any
let sunLight: any, fillLight: any, ambLight: any
let atmInnerMat: any, atmOuterMat: any
let arcEntries:       any[] = []
let schoolEntries:    any[] = []
let schoolArcEntries: any[] = []
let pinData:          any[] = []

let isDown     = false
let dragVelY   = 0
let dragVelX   = 0
let isVisible  = true
let elapsed    = 0
let lastCoord  = ''
let rafId      = 0
let frameCount = 0
let glW = 0, glH = 0
let isMobile    = false
let lowQuality  = false
let currentTheme: 'light' | 'dark' = 'light'

// Pre-allocated scratch vectors — never allocate inside rAF
let _va: any = null   // arc mid-vec scratch
let _vb: any = null   // school-arc mid-vec scratch
let _vc: any = null   // pin normal scratch
let _camFwd: any = null   // constant (0,0,1) — camera faces +Z

// FPS adaptive measurement
let _fpsMeasuring = true
let _fpsCount     = 0
let _fpsMeasureStart = 0

// ── Helpers ───────────────────────────────────────────────────────────────────
function latLonToVec3(lat: number, lon: number, r: number): any {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = lon * (Math.PI / 180)
  return new T.Vector3(
     r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
    -r * Math.sin(phi) * Math.sin(theta),
  )
}

function handleResize(w: number, h: number) {
  if (!_renderer || !camera) return
  glW = w; glH = h
  _renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function applyTheme(theme: 'light' | 'dark') {
  currentTheme = theme
  const dark = theme === 'dark'
  if (earthMat) {
    earthMat.emissiveIntensity = dark ? 0.9 : 0.0
    earthMat.needsUpdate = true
  }
  if (sunLight)  sunLight.intensity  = dark ? 0.5  : 2.0
  if (fillLight) fillLight.intensity = dark ? 0.15 : 0.4
  if (ambLight)  ambLight.intensity  = dark ? 0.15 : 0.25
  if (atmInnerMat) {
    atmInnerMat.uniforms.uC.value.set(dark ? '#3B82F6' : '#60A5FA')
  }
  if (atmOuterMat) {
    atmOuterMat.uniforms.uC.value.set(dark ? '#0F1E3A' : '#1E3A5F')
  }
}

// ── Render loop ───────────────────────────────────────────────────────────────
function animate() {
  if (!isVisible) { rafId = 0; return }
  rafId = requestAnimationFrame(animate)

  const dt = Math.min(clock.getDelta(), 0.05)
  elapsed += dt

  // Adaptive quality — measure real FPS for first 60 frames
  if (_fpsMeasuring) {
    if (_fpsCount === 0) _fpsMeasureStart = performance.now()
    _fpsCount++
    if (_fpsCount >= 60) {
      _fpsMeasuring = false
      const fps = 60000 / (performance.now() - _fpsMeasureStart)
      if (fps < 45) { lowQuality = true; _renderer.setPixelRatio(1) }
    }
  }

  // Globe rotation — inertia decays to auto-rotate
  if (!isDown) {
    const speed = Math.abs(dragVelY) + Math.abs(dragVelX)
    if (speed > 0.00002) {
      globe.rotation.y += dragVelY
      globe.rotation.x  = Math.max(-0.9, Math.min(0.9, globe.rotation.x + dragVelX))
      dragVelY *= 0.95
      dragVelX *= 0.95
    } else {
      dragVelY = 0; dragVelX = 0
      globe.rotation.y += 0.0008 * dt * 60
    }
  }

  // Arc pulses — uses _va
  for (let i = 0; i < arcEntries.length; i++) {
    const arc = arcEntries[i]
    arc.phase = (arc.phase + dt * arc.speed) % 1.0
    arc.pulseMat.uniforms.uH1.value = arc.phase
    arc.pulseMat.uniforms.uH2.value = (arc.phase + 0.5) % 1.0

    _va.copy(arc.mid).applyEuler(globe.rotation).normalize()
    const vis = Math.max(0, _va.dot(_camFwd))
    arc.pulseMat.uniforms.uVis.value = vis * 0.90
    arc.staticLine.material.opacity  = vis * 0.08

    const t = arc.phase
    arc.particle.position.set(
      (1-t)*(1-t)*arc.vA.x + 2*(1-t)*t*arc.mid.x + t*t*arc.vB.x,
      (1-t)*(1-t)*arc.vA.y + 2*(1-t)*t*arc.mid.y + t*t*arc.vB.y,
      (1-t)*(1-t)*arc.vA.z + 2*(1-t)*t*arc.mid.z + t*t*arc.vB.z,
    )
    const fadeIn  = t < 0.1 ? t / 0.1 : 1.0
    const fadeOut = t > 0.9 ? (1 - t) / 0.1 : 1.0
    arc.particle.material.opacity = vis * 0.9 * fadeIn * fadeOut
  }

  // Atmosphere breathing — very slow sine
  if (!lowQuality) {
    const breath = Math.sin(elapsed * 0.45)
    atmInnerMat.uniforms.uBreath.value = 0.42 + 0.08 * breath
    atmOuterMat.uniforms.uBreath.value = 0.15 + 0.04 * breath
  }

  // School dot pulse — organic pow(sin,2) per-dot offset
  for (let i = 0; i < schoolEntries.length; i++) {
    const s = schoolEntries[i]
    const p = Math.sin((elapsed + s.timeOffset) * 3.0)
    s.mesh.scale.setScalar(1.0 + 0.35 * p * p)
  }

  // School arc pulses — uses _vb
  for (let i = 0; i < schoolArcEntries.length; i++) {
    const arc = schoolArcEntries[i]
    arc.phase = (arc.phase + dt * arc.speed) % 1.0
    arc.pulseMat.uniforms.uH1.value = arc.phase
    arc.pulseMat.uniforms.uH2.value = (arc.phase + 0.5) % 1.0
    _vb.copy(arc.midVec).applyEuler(globe.rotation).normalize()
    arc.pulseMat.uniforms.uVis.value = Math.max(0, _vb.dot(_camFwd))
  }

  // Flag projection — every 2 frames, uses _vc
  frameCount++
  if (frameCount % 2 === 0) {
    let bestPin: any = null, bestScore = -1

    const flagData = pinData.map((p, i) => {
      // World-space surface normal via globe rotation
      _vc.copy(p.surfaceNormal).applyEuler(globe.rotation)
      const facing = _vc.dot(_camFwd)
      const visible = facing > 0.10

      // Project world position to NDC (modifies p.worldPos in place)
      p.anchor.getWorldPosition(p.worldPos)
      p.worldPos.project(camera)
      const ndcX = p.worldPos.x
      const ndcY = p.worldPos.y

      // Amber dot scale pulse + fade
      const sp = Math.sin((elapsed + p.pulseOffset) * p.dotFreq * 2.5)
      p.dot.scale.setScalar(1.0 + 0.35 * sp * sp)
      const alpha = visible ? Math.min(1, (facing - 0.10) * 5) : 0
      p.dot.material.opacity = alpha
      p.dot.visible = alpha > 0.01

      // Lift overlapping pins
      let lift = 0
      if (visible) {
        for (let j = 0; j < pinData.length; j++) {
          if (j !== i && pinData[j]._visible && p.students < pinData[j].students) {
            const dx = (ndcX - pinData[j]._ndcX) * glW * 0.5
            const dy = (ndcY - pinData[j]._ndcY) * glH * 0.5
            if (Math.hypot(dx, dy) < 40) lift = Math.max(lift, 30)
          }
        }
      }

      p._visible = visible
      p._ndcX    = ndcX
      p._ndcY    = ndcY

      const score = facing - Math.hypot(ndcX, ndcY) * 0.6
      if (visible && score > bestScore) { bestScore = score; bestPin = p }

      return { index: i, ndcX, ndcY, visible, facing, lift }
    })

    postMessage({ type: 'flags', data: flagData })

    if (bestPin && bestPin.name !== lastCoord) {
      lastCoord = bestPin.name
      postMessage({ type: 'coord', label: bestPin.coordLabel })
    }
  }

  _renderer.render(scene, camera)
}

// ── Texture loading — fetch + createImageBitmap (no TextureLoader in workers) ─
async function loadTex(paths: string[]): Promise<any> {
  for (const path of paths) {
    try {
      const res = await fetch(path)
      if (!res.ok) continue
      const blob   = await res.blob()
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: 'flipY',
        premultiplyAlpha:  'none',
        colorSpaceConversion: 'none',
      })
      const tex = new T.Texture(bitmap)
      tex.flipY             = false
      tex.colorSpace        = T.SRGBColorSpace
      tex.anisotropy        = _renderer.capabilities.getMaxAnisotropy()
      tex.minFilter         = T.LinearMipmapLinearFilter
      tex.generateMipmaps   = true
      tex.needsUpdate       = true
      return tex
    } catch { /* try next path */ }
  }
  return null
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function initGlobe(
  canvas: OffscreenCanvas,
  w: number, h: number,
  mobile: boolean,
  dpr: number,
  theme: 'light' | 'dark',
) {
  try {
    T          = (await import('three') as any).default ?? await import('three')
    isMobile   = mobile
    glW = w; glH = h
    currentTheme = theme

    // Pre-allocate scratch vectors — never new inside rAF
    _va     = new T.Vector3()
    _vb     = new T.Vector3()
    _vc     = new T.Vector3()
    _camFwd = new T.Vector3(0, 0, 1) // camera is at (0,0,4.2), faces origin

    // ── Renderer ──────────────────────────────────────────────────────────────
    _renderer = new T.WebGLRenderer({
      canvas,
      antialias:         dpr < 2,
      alpha:             true,
      powerPreference:   'high-performance',
    })
    _renderer.setPixelRatio(Math.min(dpr, 1.5))
    _renderer.setClearColor(0x000000, 0)   // fully transparent background
    _renderer.setSize(w, h, false)
    _renderer.shadowMap.enabled     = false
    _renderer.outputColorSpace      = T.SRGBColorSpace
    _renderer.toneMapping           = T.ACESFilmicToneMapping
    _renderer.toneMappingExposure   = 1.0

    // ── Scene & camera ────────────────────────────────────────────────────────
    scene  = new T.Scene()
    camera = new T.PerspectiveCamera(35, w / h, 0.1, 100)
    camera.position.set(0, 0, 4.2)

    // ── Lights ────────────────────────────────────────────────────────────────
    // Ambient: almost-black so night side isn't pure black
    ambLight = new T.AmbientLight(0x030509, theme === 'dark' ? 0.15 : 0.25)
    scene.add(ambLight)

    // Sun: white, upper-right
    sunLight = new T.DirectionalLight(0xffffff, theme === 'dark' ? 0.5 : 2.0)
    sunLight.position.set(5, 3, 5)
    scene.add(sunLight)

    // Fill: atmospheric blue, opposite side
    fillLight = new T.DirectionalLight(0x1D4ED8, theme === 'dark' ? 0.15 : 0.4)
    fillLight.position.set(-5, -2, -3)
    scene.add(fillLight)

    // ── Textures — load day + night in parallel ───────────────────────────────
    const R = 1.25
    const [dayTex, nightTex] = await Promise.all([
      loadTex(['/textures/earth-day.webp',   '/textures/earth-day.jpg']),
      loadTex(['/textures/earth-night.webp', '/textures/earth-night.jpg']),
    ])

    if (!dayTex) {
      postMessage({ type: 'error', message: '[GlobeWorker] earth-day texture failed to load' })
      return
    }

    // ── Globe material ─────────────────────────────────────────────────────────
    // earth-day  → always .map
    // earth-night → always .emissiveMap, never .map
    earthMat = new T.MeshStandardMaterial({
      map:              dayTex,
      emissiveMap:      nightTex ?? undefined,
      emissive:         new T.Color(0xffffff),
      emissiveIntensity: theme === 'dark' ? 0.9 : 0.0,
      roughness:        0.75,
      metalness:        0.02,
    })

    const segments = lowQuality ? 32 : 64
    globe = new T.Mesh(new T.SphereGeometry(R, segments, segments), earthMat)
    scene.add(globe)

    // HUD grid — EdgesGeometry, very subtle
    globe.add(new T.LineSegments(
      new T.EdgesGeometry(new T.SphereGeometry(R * 1.001, 24, 12)),
      new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.04, depthWrite: false }),
    ))

    // ── Atmosphere — two Fresnel layers that breathe ──────────────────────────
    const atmUniforms = (color: string, breath: number) => ({
      uC:      { value: new T.Color(color) },
      uBreath: { value: breath },
    })

    atmInnerMat = new T.ShaderMaterial({
      transparent: true, side: T.BackSide, depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: atmUniforms(theme === 'dark' ? '#3B82F6' : '#60A5FA', 0.42),
      vertexShader: ATM_VERT, fragmentShader: ATM_INNER_FRAG,
    })
    scene.add(new T.Mesh(new T.SphereGeometry(R * 1.022, 32, 32), atmInnerMat))

    atmOuterMat = new T.ShaderMaterial({
      transparent: true, side: T.BackSide, depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: atmUniforms(theme === 'dark' ? '#0F1E3A' : '#1E3A5F', 0.15),
      vertexShader: ATM_VERT, fragmentShader: ATM_OUTER_FRAG,
    })
    scene.add(new T.Mesh(new T.SphereGeometry(R * 1.10, 32, 32), atmOuterMat))

    // ── Country pins ──────────────────────────────────────────────────────────
    const pinsGroup = new T.Group()
    globe.add(pinsGroup)
    pinData = []

    countries.forEach((c, idx) => {
      const surfaceNormal = latLonToVec3(c.lat, c.lon, 1.0).normalize()
      const pos = surfaceNormal.clone().multiplyScalar(R * 1.008)

      const anchor = new T.Object3D()
      anchor.position.copy(pos)
      pinsGroup.add(anchor)

      // Amber pulsing dot
      const dot = new T.Mesh(
        new T.SphereGeometry(0.012, 8, 8),
        new T.MeshBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.0 }),
      )
      dot.position.copy(pos)
      pinsGroup.add(dot)

      // White static ring
      const ring = new T.Mesh(
        new T.TorusGeometry(0.024, 0.003, 6, 16),
        new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }),
      )
      ring.position.copy(pos)
      ring.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), surfaceNormal)
      pinsGroup.add(ring)

      pinData.push({
        ...c,
        anchor,
        surfaceNormal,                    // used for facing test in rAF
        worldPos:    new T.Vector3(),     // pre-allocated, reused per frame
        dot,
        dotFreq:     0.8 + idx * 0.13,   // unique frequency per pin
        pulseOffset: idx * 0.37,          // unique phase offset per pin
        _visible: false,
        _ndcX: 0,
        _ndcY: 0,
      })
    })

    // ── Arcs ──────────────────────────────────────────────────────────────────
    const arcGroup = new T.Group()
    globe.add(arcGroup)
    arcEntries = []

    function buildArc(idxA: number, idxB: number, initPhase: number, isHub: boolean) {
      const cA = countries[idxA], cB = countries[idxB]
      const vA   = latLonToVec3(cA.lat, cA.lon, R)
      const vB   = latLonToVec3(cB.lat, cB.lon, R)
      const dist = vA.angleTo(vB) / Math.PI
      const mid  = vA.clone().add(vB).normalize().multiplyScalar(R * (1.10 + dist * 0.62))
      const SEG  = 80
      const pos  = new Float32Array((SEG + 1) * 3)
      const tVal = new Float32Array(SEG + 1)
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG
        pos[i*3]   = (1-t)*(1-t)*vA.x + 2*(1-t)*t*mid.x + t*t*vB.x
        pos[i*3+1] = (1-t)*(1-t)*vA.y + 2*(1-t)*t*mid.y + t*t*vB.y
        pos[i*3+2] = (1-t)*(1-t)*vA.z + 2*(1-t)*t*mid.z + t*t*vB.z
        tVal[i] = t
      }
      const staticGeo = new T.BufferGeometry()
      staticGeo.setAttribute('position', new T.BufferAttribute(pos.slice(), 3))
      const staticLine = new T.Line(staticGeo,
        new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false }),
      )
      arcGroup.add(staticLine)

      const pGeo = new T.BufferGeometry()
      pGeo.setAttribute('position', new T.BufferAttribute(pos, 3))
      pGeo.setAttribute('aT',       new T.BufferAttribute(tVal, 1))
      const pulseMat = new T.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: {
          uH1:   { value: initPhase },
          uH2:   { value: (initPhase + 0.5) % 1 },
          uLen:  { value: 0.22 },
          uVis:  { value: 1.0 },
          uMaxA: { value: isHub ? 0.35 : 0.22 },
        },
        vertexShader: PULSE_VERT, fragmentShader: PULSE_FRAG,
      })
      arcGroup.add(new T.Line(pGeo, pulseMat))

      const particle = new T.Mesh(
        new T.SphereGeometry(0.008, 6, 6),
        new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 }),
      )
      arcGroup.add(particle)

      arcEntries.push({
        staticLine, pulseMat, particle,
        mid: mid.clone(),
        vA:  vA.clone(), vB: vB.clone(),
        speed: 0.18 / (0.35 + dist),
        phase: initPhase,
      })
    }

    arcPairs.forEach(([a, b], i) => buildArc(a, b, i / arcPairs.length, a === 6 || b === 6))

    // ── La Guajira school dots ────────────────────────────────────────────────
    const schoolGroup = new T.Group()
    globe.add(schoolGroup)
    schoolEntries = []

    SCHOOLS_GUAJIRA.forEach((s, i) => {
      const pos  = latLonToVec3(s.lat, s.lon, R * 1.010)
      const mesh = new T.Mesh(
        new T.SphereGeometry(0.014, 8, 8),
        new T.MeshBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.9 }),
      )
      mesh.position.copy(pos)
      schoolGroup.add(mesh)
      schoolEntries.push({ mesh, timeOffset: i * 0.45 })
    })

    // ── La Guajira school arcs ────────────────────────────────────────────────
    const schoolArcGroup = new T.Group()
    globe.add(schoolArcGroup)
    schoolArcEntries = []

    SCHOOL_ARC_PAIRS.forEach(([ai, bi], idx) => {
      const sA  = SCHOOLS_GUAJIRA[ai], sB = SCHOOLS_GUAJIRA[bi]
      const vA  = latLonToVec3(sA.lat, sA.lon, R)
      const vB  = latLonToVec3(sB.lat, sB.lon, R)
      const mid = vA.clone().add(vB).normalize().multiplyScalar(R * 1.45)
      const ip  = idx / SCHOOL_ARC_PAIRS.length
      const SEG = 32
      const pos  = new Float32Array((SEG + 1) * 3)
      const tVal = new Float32Array(SEG + 1)
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG
        pos[i*3]   = (1-t)*(1-t)*vA.x + 2*(1-t)*t*mid.x + t*t*vB.x
        pos[i*3+1] = (1-t)*(1-t)*vA.y + 2*(1-t)*t*mid.y + t*t*vB.y
        pos[i*3+2] = (1-t)*(1-t)*vA.z + 2*(1-t)*t*mid.z + t*t*vB.z
        tVal[i] = t
      }
      const sGeo = new T.BufferGeometry()
      sGeo.setAttribute('position', new T.BufferAttribute(pos.slice(), 3))
      schoolArcGroup.add(new T.Line(sGeo,
        new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, depthWrite: false }),
      ))
      const pGeo = new T.BufferGeometry()
      pGeo.setAttribute('position', new T.BufferAttribute(pos, 3))
      pGeo.setAttribute('aT',       new T.BufferAttribute(tVal, 1))
      const pulseMat = new T.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: {
          uH1:   { value: ip }, uH2: { value: (ip + 0.5) % 1 },
          uLen:  { value: 0.28 }, uVis: { value: 1.0 }, uMaxA: { value: 0.30 },
        },
        vertexShader: PULSE_VERT, fragmentShader: PULSE_FRAG,
      })
      schoolArcGroup.add(new T.Line(pGeo, pulseMat))
      schoolArcEntries.push({ pulseMat, midVec: mid.clone(), speed: 0.35, phase: ip })
    })

    // ── Start ─────────────────────────────────────────────────────────────────
    globe.rotation.x = 0.3
    globe.rotation.y = Math.PI * 0.55   // Americas / Colombia centered
    clock = new T.Clock()

    rafId = requestAnimationFrame(animate)
    setTimeout(() => postMessage({ type: 'ready' }), 200)

  } catch (err: any) {
    postMessage({ type: 'error', message: String(err) })
  }
}

// ── Destroy — full cleanup ────────────────────────────────────────────────────
function destroyGlobe() {
  cancelAnimationFrame(rafId)
  rafId = 0
  if (scene) {
    scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m: any) => {
          if (m.map)          m.map.dispose()
          if (m.emissiveMap)  m.emissiveMap.dispose()
          m.dispose()
        })
      }
    })
  }
  if (_renderer) {
    _renderer.dispose()
    _renderer.forceContextLoss()
    _renderer = null
  }
  scene = null; camera = null; globe = null; clock = null; earthMat = null
  sunLight = null; fillLight = null; ambLight = null
  atmInnerMat = null; atmOuterMat = null
  arcEntries = []; schoolEntries = []; schoolArcEntries = []; pinData = []
}

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  const msg = e.data
  switch (msg.type) {

    case 'init':
      initGlobe(
        msg.canvas,
        msg.width, msg.height,
        msg.isMobile ?? false,
        msg.dpr      ?? 1,
        msg.theme    ?? 'light',
      )
      break

    case 'resize':
      handleResize(msg.width, msg.height)
      break

    case 'drag':
      if (!isDown || !globe) break
      {
        const vy = msg.dx * 0.005
        const vx = msg.dy * 0.005
        globe.rotation.y += vy
        globe.rotation.x  = Math.max(-0.9, Math.min(0.9, globe.rotation.x + vx))
        dragVelY = vy; dragVelX = vx
      }
      break

    case 'dragStart':
      isDown   = true
      dragVelY = 0; dragVelX = 0
      break

    case 'dragEnd':
      isDown = false
      break

    case 'visibility':
      isVisible = msg.visible
      if (msg.visible && rafId === 0 && clock) {
        clock.getDelta()                           // consume accumulated time
        rafId = requestAnimationFrame(animate)
      } else if (!msg.visible) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      break

    case 'theme':
      applyTheme(msg.value as 'light' | 'dark')
      break

    case 'destroy':
      destroyGlobe()
      break
  }
}
