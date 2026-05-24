/* eslint-disable @typescript-eslint/no-explicit-any */
// GlobeWorker.ts — runs as an OffscreenCanvas Web Worker, no DOM access.

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

const FALLBACK_CONTINENTS: number[][][] = [
  [[-168,66],[-160,70],[-140,71],[-125,72],[-110,74],[-95,75],[-82,73],[-75,70],[-62,60],[-55,52],[-60,48],[-67,45],[-70,42],[-76,38],[-80,32],[-85,30],[-93,29],[-97,26],[-100,24],[-107,23],[-115,28],[-118,32],[-122,37],[-125,42],[-128,50],[-135,55],[-145,58],[-155,60],[-162,62],[-168,66]],
  [[-92,18],[-88,17],[-83,15],[-79,11],[-77,8],[-82,8],[-88,13],[-92,18]],
  [[-80,12],[-75,11],[-70,12],[-62,10],[-54,6],[-48,2],[-42,-3],[-38,-8],[-36,-12],[-38,-20],[-44,-24],[-52,-30],[-58,-35],[-64,-40],[-70,-44],[-73,-50],[-72,-54],[-68,-53],[-66,-46],[-68,-38],[-72,-30],[-74,-20],[-78,-12],[-80,-5],[-80,3],[-80,12]],
  [[-10,36],[-2,37],[5,37],[12,38],[20,38],[28,40],[35,38],[40,42],[45,48],[42,54],[35,58],[25,62],[15,64],[5,60],[-4,56],[-8,52],[-10,44],[-10,36]],
  [[-17,16],[-14,22],[-10,28],[-5,32],[5,33],[10,32],[18,30],[24,30],[30,30],[34,28],[38,22],[42,15],[45,10],[48,4],[46,-5],[40,-14],[35,-20],[32,-26],[28,-32],[22,-34],[18,-34],[15,-28],[12,-22],[10,-12],[8,-5],[5,1],[0,4],[-5,8],[-12,10],[-17,16]],
  [[40,60],[50,65],[60,70],[75,72],[90,74],[105,74],[125,73],[140,70],[150,62],[155,55],[150,48],[140,42],[132,38],[128,34],[122,30],[115,24],[108,18],[100,12],[90,8],[80,8],[70,12],[58,18],[48,22],[42,30],[40,40],[38,48],[40,60]],
  [[68,28],[74,32],[82,32],[89,27],[92,23],[90,18],[85,12],[80,8],[75,9],[70,15],[68,22],[68,28]],
  [[95,4],[100,6],[108,4],[115,2],[122,0],[130,-2],[135,-4],[130,-8],[120,-9],[110,-8],[100,-2],[95,4]],
  [[113,-12],[122,-12],[132,-12],[140,-15],[146,-19],[152,-25],[153,-32],[146,-38],[138,-37],[128,-33],[118,-32],[114,-25],[113,-18],[113,-12]],
  [[144,-41],[148,-41],[148,-43],[145,-43],[144,-41]],
  [[170,-36],[175,-38],[177,-42],[173,-46],[168,-46],[166,-42],[170,-36]],
  [[-55,60],[-40,60],[-25,65],[-15,72],[-25,80],[-45,82],[-58,78],[-62,70],[-55,60]],
  [[-8,50],[-3,50],[0,54],[-2,58],[-6,58],[-8,54],[-8,50]],
  [[-10,52],[-6,53],[-6,55],[-10,55],[-10,52]],
  [[131,32],[136,34],[140,37],[143,42],[145,45],[142,43],[138,39],[133,35],[131,32]],
  [[43,-13],[49,-15],[50,-22],[46,-25],[43,-20],[43,-13]],
  [[5,58],[12,60],[20,63],[28,68],[30,71],[22,70],[12,66],[6,62],[5,58]],
  [[120,7],[125,10],[124,14],[121,17],[119,14],[120,7]],
  [[-9,37],[-6,36],[-2,36],[2,38],[3,42],[-2,43],[-8,43],[-9,37]],
  [[35,30],[42,29],[48,25],[55,22],[58,18],[55,12],[48,13],[42,16],[38,20],[35,25],[35,30]],
]

const PULSE_VERT = `
  attribute float aT;
  varying float vT;
  void main(){
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

const PULSE_FRAG = `
  uniform float uH1;
  uniform float uH2;
  uniform float uLen;
  uniform float uVis;
  uniform float uMaxA;
  varying float vT;
  float pulse(float head, float t, float len){
    float d = mod(head - t + 2.0, 1.0);
    if(d > len) return 0.0;
    return sin((d / len) * 3.14159265);
  }
  void main(){
    float a = max(pulse(uH1, vT, uLen), pulse(uH2, vT, uLen)) * uVis * uMaxA;
    gl_FragColor = vec4(1.0, 1.0, 1.0, a);
  }`

// ── Module-level state ──────────────────────────────────────────────────────
let T: any = null
let scene: any, camera: any, _renderer: any, clock: any
let globe: any
let arcEntries: any[] = []
let schoolEntries: any[] = []
let schoolArcEntries: any[] = []
let pinData: any[] = []
let atmInnerMat: any, atmOuterMat: any
let camFwd: any
let isDown = false
let angVelY = 0.0008, angVelX = 0.0
let isVisible = true
let elapsed = 0
let lastCoordKey = ''
let rafId = 0
let frameCount = 0
let glWidth = 0, glHeight = 0
let isMobile = false
let lowQuality = false

// Pre-allocated vectors — never new T.Vector3() inside the render loop
let _tmpV3a: any = null
let _tmpV3b: any = null
let _tmpV3c: any = null

// Adaptive quality: measure FPS for first 60 frames
let _fpsMeasuring = true
let _fpsFrameCount = 0
let _fpsMeasureStart = 0

function handleResize(w: number, h: number) {
  if (!_renderer || !camera) return
  glWidth = w; glHeight = h
  _renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function animate() {
  rafId = requestAnimationFrame(animate)
  if (!isVisible) return

  const dt = clock.getDelta()
  elapsed += dt

  // Adaptive quality measurement (first 60 rendered frames)
  if (_fpsMeasuring) {
    if (_fpsFrameCount === 0) _fpsMeasureStart = performance.now()
    _fpsFrameCount++
    if (_fpsFrameCount >= 60) {
      _fpsMeasuring = false
      const elapsed60 = performance.now() - _fpsMeasureStart
      const fps = 60000 / elapsed60
      if (fps < 45) {
        lowQuality = true
        _renderer.setPixelRatio(1)
        // Reduce atmosphere geometry update rate
      }
    }
  }

  if (!isDown) {
    globe.rotation.y += 0.0008 * dt * 60
    globe.rotation.x = Math.max(-0.9, Math.min(0.9, globe.rotation.x + angVelX))
    angVelX *= 0.97
  }

  // Update arcs every frame — but use pre-allocated vectors
  arcEntries.forEach(arc => {
    arc.phase = (arc.phase + dt * arc.speed) % 1.0
    arc.pulseMat.uniforms.uH1.value = arc.phase
    arc.pulseMat.uniforms.uH2.value = (arc.phase + 0.5) % 1.0
    _tmpV3a.copy(arc.midVec).applyEuler(globe.rotation)
    const vis = Math.max(0, _tmpV3a.normalize().dot(camFwd))
    arc.pulseMat.uniforms.uVis.value = vis * 0.90
    arc.staticLine.material.opacity = vis * 0.08
    const t = arc.phase
    arc.particle.position.set(
      (1-t)*(1-t)*arc.vA.x + 2*(1-t)*t*arc.midVec.x + t*t*arc.vB.x,
      (1-t)*(1-t)*arc.vA.y + 2*(1-t)*t*arc.midVec.y + t*t*arc.vB.y,
      (1-t)*(1-t)*arc.vA.z + 2*(1-t)*t*arc.midVec.z + t*t*arc.vB.z,
    )
    const fadeIn  = t < 0.1 ? t / 0.1 : 1.0
    const fadeOut = t > 0.9 ? (1 - t) / 0.1 : 1.0
    arc.particle.material.opacity = vis * 0.9 * fadeIn * fadeOut
  })

  if (!lowQuality) {
    schoolEntries.forEach(d => {
      const s = Math.sin((elapsed + d.timeOffset) * 3.0)
      d.mesh.scale.setScalar(1.0 + 0.35 * s * s)
    })

    atmInnerMat.uniforms.uBreath.value = 0.40 + 0.08 * Math.sin(elapsed * 0.5)
    atmOuterMat.uniforms.uBreath.value = 0.15 + 0.04 * Math.sin(elapsed * 0.5)
  }

  schoolArcEntries.forEach(arc => {
    arc.phase = (arc.phase + dt * arc.speed) % 1.0
    arc.pulseMat.uniforms.uH1.value = arc.phase
    arc.pulseMat.uniforms.uH2.value = (arc.phase + 0.5) % 1.0
    _tmpV3b.copy(arc.midVec).applyEuler(globe.rotation)
    arc.pulseMat.uniforms.uVis.value = Math.max(0, _tmpV3b.normalize().dot(camFwd))
  })

  frameCount++
  if (frameCount % 2 === 0) {
    let bestCenter: any = null, bestScore = -1

    const flagData = pinData.map((p, i) => {
      p.anchor.getWorldPosition(p.worldPos)
      _tmpV3c.subVectors(camera.position, p.worldPos).normalize()
      p._facing  = _tmpV3c.dot(p.worldPos.clone().normalize())
      p._visible = p._facing > 0.15
      p.worldPos.project(camera)
      p._ndcX = p.worldPos.x
      p._ndcY = p.worldPos.y
      // Restore worldPos from NDC by reprojecting after (anchor re-fetched next frame anyway)

      let lift = 0
      if (p._visible) {
        pinData.forEach((q, j) => {
          if (i !== j && q._visible && p.students < q.students) {
            const dx = (p._ndcX - q._ndcX) * glWidth  * 0.5
            const dy = (p._ndcY - q._ndcY) * glHeight * 0.5
            if (Math.hypot(dx, dy) < 40) lift = Math.max(lift, 30)
          }
        })
      }

      const _ds = Math.sin(elapsed * p.dotFreq * 2.5)
      p.dot.scale.setScalar(1.0 + 0.35 * _ds * _ds)
      const dotAlpha = p._visible ? Math.min(1, (p._facing - 0.15) * 4) : 0
      p.dot.material.opacity = dotAlpha
      p.dot.visible = dotAlpha > 0.01

      const score = p._facing - Math.hypot(p._ndcX, p._ndcY) * 0.6
      if (p._visible && score > bestScore) { bestScore = score; bestCenter = p }

      return { index: i, ndcX: p._ndcX, ndcY: p._ndcY, visible: p._visible, facing: p._facing, lift }
    })

    postMessage({ type: 'flags', data: flagData })

    if (bestCenter && bestCenter.name !== lastCoordKey) {
      lastCoordKey = bestCenter.name
      postMessage({ type: 'coord', label: bestCenter.coordLabel })
    }
  }

  _renderer.render(scene, camera)
}

// ── Main init ───────────────────────────────────────────────────────────────
async function initGlobe(canvas: OffscreenCanvas, w: number, h: number, mobile: boolean, dpr: number) {
  try {
    T = (await import('three') as any).default ?? await import('three')
    isMobile = mobile
    glWidth = w; glHeight = h

    // Pre-allocate reusable vectors
    _tmpV3a = new T.Vector3()
    _tmpV3b = new T.Vector3()
    _tmpV3c = new T.Vector3()

    // ── BUILD EARTH TEXTURE (fallback) ──────────────────────────────────────
    async function buildEarthTexture() {
      const W = 2048, H = 1024
      const c = new OffscreenCanvas(W, H)
      const ctx = c.getContext('2d')!

      const og = ctx.createLinearGradient(0, 0, 0, H)
      og.addColorStop(0,   '#092540')
      og.addColorStop(0.3, '#0d3462')
      og.addColorStop(0.5, '#1a4a7a')
      og.addColorStop(0.7, '#0d3462')
      og.addColorStop(1,   '#092540')
      ctx.fillStyle = og as any
      ctx.fillRect(0, 0, W, H)

      for (let i = 0; i < 8000; i++) {
        ctx.fillStyle = `rgba(150,205,255,${Math.random() * 0.02})`
        ctx.fillRect(Math.random() * W, Math.random() * H, Math.random() * 6 + 1, 1)
      }

      const project = (lon: number, lat: number): [number, number] => [
        ((lon + 180) / 360) * W,
        ((90 - lat) / 180) * H,
      ]

      const maskC = new OffscreenCanvas(W, H)
      const mctx = maskC.getContext('2d')!
      mctx.fillStyle = '#000'

      interface ShapeEntry { type: 'Polygon' | 'MultiPolygon'; coords: any }
      const shapes: ShapeEntry[] = []

      const fillPolygon = (rings: number[][][]) => {
        mctx.beginPath()
        rings.forEach(ring => {
          ring.forEach(([lon, lat], i) => {
            const [x, y] = project(lon, lat)
            if (i === 0) mctx.moveTo(x, y); else mctx.lineTo(x, y)
          })
        })
        mctx.closePath(); mctx.fill()
      }

      try {
        const topojson = await import('topojson-client')
        const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        const topo = await res.json()
        const landGeo = topojson.feature(topo as any, (topo as any).objects.land) as any
        const processGeom = (geom: any) => {
          if (!geom) return
          if (geom.type === 'Polygon') {
            fillPolygon(geom.coordinates)
            shapes.push({ type: 'Polygon', coords: geom.coordinates })
          } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach((poly: number[][][]) => fillPolygon(poly))
            shapes.push({ type: 'MultiPolygon', coords: geom.coordinates })
          }
        }
        if (landGeo.type === 'Feature') processGeom(landGeo.geometry)
        else if (landGeo.type === 'FeatureCollection') landGeo.features.forEach((f: any) => processGeom(f?.geometry))
      } catch {
        FALLBACK_CONTINENTS.forEach(poly => {
          fillPolygon([poly as number[][]])
          shapes.push({ type: 'Polygon', coords: [poly] })
        })
      }

      const mdata = mctx.getImageData(0, 0, W, H).data
      const NW = 256, NH = 128
      const nf = new Float32Array(NW * NH)
      for (let i = 0; i < nf.length; i++) nf[i] = Math.random()
      const noise = (u: number, v: number) => {
        let val = 0, amp = 0.5, freq = 1
        for (let o = 0; o < 3; o++) {
          const nx = u * NW * freq, ny = v * NH * freq
          const xi = Math.floor(nx) % NW, yi = Math.floor(ny) % NH
          const xf = nx - Math.floor(nx), yf = ny - Math.floor(ny)
          const a  = nf[(yi % NH) * NW + (xi % NW)]
          const b  = nf[(yi % NH) * NW + ((xi + 1) % NW)]
          const cc = nf[((yi + 1) % NH) * NW + (xi % NW)]
          const d  = nf[((yi + 1) % NH) * NW + ((xi + 1) % NW)]
          const u2 = xf * xf * (3 - 2 * xf), v2 = yf * yf * (3 - 2 * yf)
          val += (a*(1-u2)*(1-v2) + b*u2*(1-v2) + cc*(1-u2)*v2 + d*u2*v2) * amp
          amp *= 0.5; freq *= 2
        }
        return val
      }

      const step = isMobile ? 3 : 4
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          if (mdata[(y * W + x) * 4 + 3] < 128) continue
          const n = noise(x / W, y / H)
          const lat = 90 - (y / H) * 180
          const lon = (x / W) * 360 - 180
          const absLat = Math.abs(lat)
          let r: number, g: number, b: number
          if (absLat > 65) {
            const s = Math.floor(218 + n * 30)
            r = s; g = Math.floor(s + n * 4); b = Math.min(255, s + 14 + Math.floor(n * 8))
          } else if (absLat > 50) {
            r = Math.floor(84 + n * 34); g = Math.floor(110 + n * 40); b = Math.floor(72 + n * 24)
          } else if (absLat > 30) {
            r = Math.floor(56 + n * 46); g = Math.floor(96 + n * 54); b = Math.floor(30 + n * 28)
          } else if (absLat > 15) {
            const desert =
              (lat > 15 && lat < 35 && lon > -18 && lon < 62)   ? 0.76 :
              (lat > 20 && lat < 35 && lon > 48  && lon < 100)  ? 0.52 :
              (lat > 15 && lat < 30 && lon > -120 && lon < -60) ? 0.35 :
              (lat < -15 && lat > -32 && lon > 13 && lon < 25)  ? 0.60 : 0.12
            const sr = Math.floor(178 + n * 42), sg = Math.floor(150 + n * 36), sb = Math.floor(86 + n * 26)
            const gr = Math.floor(52 + n * 50),  gg = Math.floor(114 + n * 50), gb = Math.floor(28 + n * 26)
            r = Math.floor(gr * (1 - desert) + sr * desert)
            g = Math.floor(gg * (1 - desert) + sg * desert)
            b = Math.floor(gb * (1 - desert) + sb * desert)
          } else {
            r = Math.floor(36 + n * 46); g = Math.floor(88 + n * 56); b = Math.floor(24 + n * 28)
          }
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.beginPath()
          ctx.arc(x + (Math.random() - .5) * .8, y + (Math.random() - .5) * .8, 1.5 + Math.random() * .6, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.20)'; (ctx as any).lineWidth = 1.5; (ctx as any).lineJoin = 'round'
      shapes.forEach(f => {
        const strokeRing = (ring: number[][]) => {
          ring.forEach(([lon, lat], i) => {
            const [x, y] = project(lon, lat)
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          })
        }
        if (f.type === 'Polygon') {
          ctx.beginPath(); f.coords.forEach(strokeRing); ctx.closePath(); ctx.stroke()
        } else {
          f.coords.forEach((poly: number[][][]) => {
            ctx.beginPath(); poly.forEach(strokeRing); ctx.closePath(); ctx.stroke()
          })
        }
      })
      ctx.restore()

      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; (ctx as any).lineWidth = 0.8
      for (let lat = -80; lat <= 80; lat += 15) {
        const [, y] = project(0, lat)
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }
      for (let lon = -180; lon <= 180; lon += 15) {
        const [x] = project(lon, 0)
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }

      const tex = new T.CanvasTexture(c)
      tex.colorSpace = T.SRGBColorSpace
      tex.anisotropy = 16
      return tex
    }

    // ── SCENE, CAMERA, RENDERER ─────────────────────────────────────────────
    scene  = new T.Scene()
    camera = new T.PerspectiveCamera(35, w / h, 0.1, 100)
    camera.position.set(0, 0, 4.2)

    const useAntialias = dpr < 2
    _renderer = new T.WebGLRenderer({
      canvas,
      antialias: useAntialias,
      alpha: false,
      powerPreference: 'high-performance',
    })
    _renderer.setPixelRatio(Math.min(dpr, 1.5))
    _renderer.setClearColor(0x000000, 1)
    _renderer.setSize(w, h, false)
    _renderer.shadowMap.enabled = false

    // ── LIGHTS ──────────────────────────────────────────────────────────────
    scene.add(new T.AmbientLight(0x0F172A, 0.4))
    const sun = new T.DirectionalLight(0xFFFFFF, 1.2)
    sun.position.set(5, 3, 5); scene.add(sun)
    const fill = new T.DirectionalLight(0x1D4ED8, 0.3)
    fill.position.set(-5, -2, -3); scene.add(fill)

    // ── GLOBE ───────────────────────────────────────────────────────────────
    const R = 1.25
    const sunDir = new T.Vector3(5, 3, 5).normalize()

    async function loadTexture(webpPath: string, jpgPath: string) {
      for (const path of [webpPath, jpgPath]) {
        try {
          const res = await fetch(path)
          if (!res.ok) continue
          const blob = await res.blob()
          const bitmap = await createImageBitmap(blob, {
            imageOrientation: 'flipY',
            premultiplyAlpha: 'none',
            colorSpaceConversion: 'none',
          })
          const tex = new T.Texture(bitmap)
          tex.flipY = false
          tex.colorSpace = T.SRGBColorSpace
          tex.anisotropy = _renderer.capabilities.getMaxAnisotropy()
          tex.needsUpdate = true
          return tex
        } catch { continue }
      }
      return null
    }

    let dayTex: any = await loadTexture('/textures/earth-day.webp', '/textures/earth-day.jpg')
    if (!dayTex) {
      console.warn('[GlobeWorker] Falling back to procedural texture')
      dayTex = await buildEarthTexture()
    }

    const earthMat = new T.MeshStandardMaterial({
      map: dayTex,
      emissive: new T.Color(0xffffff),
      emissiveIntensity: 0.0,
      roughness: 0.8,
      metalness: 0.02,
    })

    const sphereSegments = lowQuality ? 32 : 64
    globe = new T.Mesh(new T.SphereGeometry(R, sphereSegments, sphereSegments), earthMat)
    scene.add(globe)

    globe.add(new T.LineSegments(
      new T.EdgesGeometry(new T.SphereGeometry(R, 24, 12)),
      new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, depthWrite: false })
    ))

    const nightMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uSun: { value: sunDir } },
      vertexShader:   `varying vec3 vWN;void main(){vWN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 uSun;varying vec3 vWN;void main(){float d=dot(normalize(vWN),uSun);float a=smoothstep(0.15,-0.55,d)*0.82;gl_FragColor=vec4(0.0,0.01,0.05,a);}`,
    })
    scene.add(new T.Mesh(new T.SphereGeometry(R * 1.001, 32, 32), nightMat))

    setTimeout(() => {
      loadTexture('/textures/earth-night.webp', '/textures/earth-night.jpg')
        .then(tex => {
          if (!tex) return
          earthMat.emissiveMap      = tex
          earthMat.emissiveIntensity = 0.15
          earthMat.needsUpdate      = true
        })
        .catch((err: any) => console.error('[GlobeWorker] earth-night load failed:', err))
    }, 300)

    // ── ATMOSPHERE ──────────────────────────────────────────────────────────
    const ATM_VERT = `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
    atmInnerMat = new T.ShaderMaterial({
      transparent: true, side: T.BackSide, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uC: { value: new T.Color('#60A5FA') }, uBreath: { value: 0.40 } },
      vertexShader: ATM_VERT,
      fragmentShader: `varying vec3 vN; uniform vec3 uC; uniform float uBreath; void main(){ float f=pow(1.0-abs(dot(vN,vec3(0.,0.,1.))),2.5); gl_FragColor=vec4(uC,f*uBreath);}`,
    })
    scene.add(new T.Mesh(new T.SphereGeometry(R * 1.020, 32, 32), atmInnerMat))
    atmOuterMat = new T.ShaderMaterial({
      transparent: true, side: T.BackSide, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uC: { value: new T.Color('#1E3A5F') }, uBreath: { value: 0.15 } },
      vertexShader: ATM_VERT,
      fragmentShader: `varying vec3 vN; uniform vec3 uC; uniform float uBreath; void main(){ float f=pow(1.0-abs(dot(vN,vec3(0.,0.,1.))),2.0); gl_FragColor=vec4(uC,f*uBreath);}`,
    })
    scene.add(new T.Mesh(new T.SphereGeometry(R * 1.08, 32, 32), atmOuterMat))

    // ── PINS ────────────────────────────────────────────────────────────────
    const pinsGroup = new T.Group()
    globe.add(pinsGroup)

    function latLonToVec3(lat: number, lon: number, r: number) {
      const phi   = (90 - lat) * Math.PI / 180
      const theta = lon * Math.PI / 180
      return new T.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
       -r * Math.sin(phi) * Math.sin(theta)
      )
    }

    pinData = []
    countries.forEach((c, idx) => {
      const surfaceNormal = latLonToVec3(c.lat, c.lon, 1.0)
      const pos = surfaceNormal.clone().multiplyScalar(R * 1.008)
      const anchor = new T.Object3D()
      anchor.position.copy(pos)
      pinsGroup.add(anchor)

      const dot = new T.Mesh(
        new T.SphereGeometry(0.012, 8, 8),
        new T.MeshBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.0 })
      )
      dot.position.copy(pos)
      pinsGroup.add(dot)

      const ring = new T.Mesh(
        new T.TorusGeometry(0.024, 0.003, 6, 16),
        new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })
      )
      ring.position.copy(pos)
      ring.quaternion.copy(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), surfaceNormal))
      pinsGroup.add(ring)

      // Pre-allocate worldPos vector per pin (reused each frame without new)
      pinData.push({ ...c, anchor, worldPos: new T.Vector3(), dot, dotFreq: 0.8 + idx * 0.1 })
    })

    // ── ARCS ────────────────────────────────────────────────────────────────
    const arcGroup = new T.Group()
    globe.add(arcGroup)
    arcEntries = []

    function buildArc(idxA: number, idxB: number, initPhase: number, isHub = false) {
      const cA = countries[idxA], cB = countries[idxB]
      const vA = latLonToVec3(cA.lat, cA.lon, R)
      const vB = latLonToVec3(cB.lat, cB.lon, R)
      const dist   = vA.angleTo(vB) / Math.PI
      const height = R * (1.10 + dist * 0.62)
      const mid    = vA.clone().add(vB).normalize().multiplyScalar(height)
      const SEG = 80
      const positions = new Float32Array((SEG + 1) * 3)
      const tValues   = new Float32Array(SEG + 1)
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG
        const p = new T.Vector3()
          .addScaledVector(vA,  (1 - t) * (1 - t))
          .addScaledVector(mid,  2 * (1 - t) * t)
          .addScaledVector(vB,   t * t)
        positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z
        tValues[i] = t
      }
      const sGeo = new T.BufferGeometry()
      sGeo.setAttribute('position', new T.BufferAttribute(positions.slice(), 3))
      const staticLine = new T.Line(sGeo,
        new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false })
      )
      arcGroup.add(staticLine)
      const pGeo = new T.BufferGeometry()
      pGeo.setAttribute('position', new T.BufferAttribute(positions, 3))
      pGeo.setAttribute('aT',       new T.BufferAttribute(tValues, 1))
      const pulseMat = new T.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: {
          uH1: { value: initPhase }, uH2: { value: (initPhase + 0.5) % 1 },
          uLen: { value: 0.22 }, uVis: { value: 1.0 }, uMaxA: { value: isHub ? 0.35 : 0.22 },
        },
        vertexShader: PULSE_VERT, fragmentShader: PULSE_FRAG,
      })
      arcGroup.add(new T.Line(pGeo, pulseMat))
      const particle = new T.Mesh(new T.SphereGeometry(0.008, 6, 6),
        new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 })
      )
      arcGroup.add(particle)
      const speed = 0.18 / (0.35 + dist)
      arcEntries.push({ staticLine, pulseMat, midVec: mid, speed, phase: initPhase, particle, vA: vA.clone(), vB: vB.clone() })
    }

    arcPairs.forEach(([a, b], i) => buildArc(a, b, i / arcPairs.length, a === 6 || b === 6))

    // ── SCHOOL DOTS ─────────────────────────────────────────────────────────
    const schoolGroup = new T.Group()
    globe.add(schoolGroup)
    schoolEntries = []
    SCHOOLS_GUAJIRA.forEach((s, i) => {
      const pos = latLonToVec3(s.lat, s.lon, R * 1.010)
      const mesh = new T.Mesh(
        new T.SphereGeometry(0.014, 8, 8),
        new T.MeshBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.9 })
      )
      mesh.position.copy(pos)
      schoolGroup.add(mesh)
      schoolEntries.push({ mesh, timeOffset: i * 0.45 })
    })

    // ── SCHOOL ARCS ─────────────────────────────────────────────────────────
    const schoolArcGroup = new T.Group()
    globe.add(schoolArcGroup)
    schoolArcEntries = []
    SCHOOL_ARC_PAIRS.forEach(([ai, bi], idx) => {
      const sA = SCHOOLS_GUAJIRA[ai], sB = SCHOOLS_GUAJIRA[bi]
      const vA = latLonToVec3(sA.lat, sA.lon, R)
      const vB = latLonToVec3(sB.lat, sB.lon, R)
      const mid = vA.clone().add(vB).normalize().multiplyScalar(R * 1.45)
      const initPhase = idx / SCHOOL_ARC_PAIRS.length
      const SEG = 32
      const positions = new Float32Array((SEG + 1) * 3)
      const tValues   = new Float32Array(SEG + 1)
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG
        const p = new T.Vector3()
          .addScaledVector(vA,  (1 - t) * (1 - t))
          .addScaledVector(mid,  2 * (1 - t) * t)
          .addScaledVector(vB,   t * t)
        positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z
        tValues[i] = t
      }
      const sGeo = new T.BufferGeometry()
      sGeo.setAttribute('position', new T.BufferAttribute(positions.slice(), 3))
      schoolArcGroup.add(new T.Line(sGeo,
        new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, depthWrite: false })
      ))
      const pGeo = new T.BufferGeometry()
      pGeo.setAttribute('position', new T.BufferAttribute(positions, 3))
      pGeo.setAttribute('aT',       new T.BufferAttribute(tValues, 1))
      const pulseMat = new T.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: {
          uH1: { value: initPhase }, uH2: { value: (initPhase + 0.5) % 1 },
          uLen: { value: 0.28 }, uVis: { value: 1.0 }, uMaxA: { value: 0.30 },
        },
        vertexShader: PULSE_VERT, fragmentShader: PULSE_FRAG,
      })
      schoolArcGroup.add(new T.Line(pGeo, pulseMat))
      schoolArcEntries.push({ pulseMat, midVec: mid.clone(), speed: 0.35, phase: initPhase })
    })

    // ── START ───────────────────────────────────────────────────────────────
    globe.rotation.x = 0.3
    globe.rotation.y = Math.PI * 0.55
    clock = new T.Clock()
    camFwd = new T.Vector3(0, 0, 1)

    rafId = requestAnimationFrame(animate)
    setTimeout(() => postMessage({ type: 'ready' }), 200)

  } catch (err: any) {
    postMessage({ type: 'error', message: String(err) })
  }
}

function destroyGlobe() {
  cancelAnimationFrame(rafId)
  if (scene) {
    scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose())
        else obj.material.dispose()
      }
    })
  }
  if (_renderer) {
    _renderer.dispose()
    _renderer.forceContextLoss()
    _renderer = null
  }
  scene = null; camera = null; globe = null; clock = null
  arcEntries = []; schoolEntries = []; schoolArcEntries = []; pinData = []
}

// ── Message handler ─────────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  const msg = e.data
  switch (msg.type) {
    case 'init':
      initGlobe(msg.canvas, msg.width, msg.height, msg.isMobile, msg.dpr ?? 1)
      break
    case 'resize':
      handleResize(msg.width, msg.height)
      break
    case 'drag':
      if (!isDown || !globe) break
      {
        const vy = msg.dx * 0.005, vx = msg.dy * 0.005
        globe.rotation.y += vy
        globe.rotation.x = Math.max(-0.9, Math.min(0.9, globe.rotation.x + vx))
        angVelY = vy; angVelX = vx
      }
      break
    case 'dragStart':
      isDown = true
      break
    case 'dragEnd':
      isDown = false
      break
    case 'visibility':
      isVisible = msg.visible
      if (!msg.visible) {
        cancelAnimationFrame(rafId)
      } else if (clock) {
        clock.getDelta()
        rafId = requestAnimationFrame(animate)
      }
      break
    case 'destroy':
      destroyGlobe()
      break
  }
}
