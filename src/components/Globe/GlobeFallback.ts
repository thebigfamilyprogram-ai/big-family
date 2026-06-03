/* eslint-disable @typescript-eslint/no-explicit-any */
// GlobeFallback.ts — same Three.js logic but runs on the main thread (no OffscreenCanvas).
// Used for Safari < 16.4 which doesn't support OffscreenCanvas.

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
  { lat: 11.544, lon: -72.907 }, { lat: 11.373, lon: -72.244 },
  { lat: 11.713, lon: -72.268 }, { lat: 11.773, lon: -72.441 },
  { lat: 10.770, lon: -73.000 }, { lat: 10.613, lon: -72.982 },
  { lat: 11.142, lon: -72.613 }, { lat: 10.963, lon: -72.790 },
]
const SCHOOL_ARC_PAIRS = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,4],[2,6]]

const PULSE_VERT = `
  attribute float aT; varying float vT;
  void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const PULSE_FRAG = `
  uniform float uH1; uniform float uH2; uniform float uLen; uniform float uVis; uniform float uMaxA;
  varying float vT;
  float pulse(float head, float t, float len){ float d = mod(head - t + 2.0, 1.0); if(d > len) return 0.0; return sin((d / len) * 3.14159265); }
  void main(){ float a = max(pulse(uH1, vT, uLen), pulse(uH2, vT, uLen)) * uVis * uMaxA; gl_FragColor = vec4(1.0, 1.0, 1.0, a); }`

interface FallbackOptions {
  onReady?: () => void
  onCoordChange?: (label: string) => void
}

export async function initGlobeFallback(
  canvas: HTMLCanvasElement,
  wrap: HTMLDivElement,
  { onReady, onCoordChange }: FallbackOptions = {}
) {
  const THREE = await import('three')
  const isMobile = window.innerWidth < 768

  const scene  = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 4.2)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
  renderer.setClearColor(0x000000, 0)

  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(wrap)
  resize()

  scene.add(new THREE.AmbientLight(0x0F172A, 0.4))
  const sun = new THREE.DirectionalLight(0xFFFFFF, 1.2)
  sun.position.set(5, 3, 5); scene.add(sun)
  const fillLight = new THREE.DirectionalLight(0x1D4ED8, 0.3)
  fillLight.position.set(-5, -2, -3); scene.add(fillLight)

  const R = 1.25
  const sunDir = new THREE.Vector3(5, 3, 5).normalize()

  let dayTex: any
  try {
    dayTex = await new Promise<any>((resolve, reject) => {
      new THREE.TextureLoader().load('/textures/earth-day.jpg',
        (tex: any) => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; resolve(tex) },
        undefined, reject)
    })
  } catch {
    dayTex = null
  }

  const earthMat = new THREE.MeshStandardMaterial({
    map: dayTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.0,
    roughness: 0.8, metalness: 0.02,
  })

  const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), earthMat)
  scene.add(globe)

  globe.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.SphereGeometry(R, 24, 12)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, depthWrite: false })
  ))

  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.001, 32, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uSun: { value: sunDir } },
    vertexShader:   `varying vec3 vWN;void main(){vWN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 uSun;varying vec3 vWN;void main(){float d=dot(normalize(vWN),uSun);float a=smoothstep(0.15,-0.55,d)*0.82;gl_FragColor=vec4(0.0,0.01,0.05,a);}`,
  })))

  setTimeout(() => {
    new THREE.TextureLoader().load('/textures/earth-night.jpg', (tex: any) => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
      earthMat.emissiveMap = tex; earthMat.emissiveIntensity = 0.85; earthMat.needsUpdate = true
    })
  }, 300)

  const ATM_VERT = `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
  const atmInnerMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color('#60A5FA') }, uBreath: { value: 0.40 } },
    vertexShader: ATM_VERT,
    fragmentShader: `varying vec3 vN; uniform vec3 uC; uniform float uBreath; void main(){ float f=pow(1.0-abs(dot(vN,vec3(0.,0.,1.))),2.5); gl_FragColor=vec4(uC,f*uBreath);}`,
  })
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.020, 32, 32), atmInnerMat))
  const atmOuterMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color('#1E3A5F') }, uBreath: { value: 0.15 } },
    vertexShader: ATM_VERT,
    fragmentShader: `varying vec3 vN; uniform vec3 uC; uniform float uBreath; void main(){ float f=pow(1.0-abs(dot(vN,vec3(0.,0.,1.))),2.0); gl_FragColor=vec4(uC,f*uBreath);}`,
  })
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 32, 32), atmOuterMat))

  function latLonToVec3(lat: number, lon: number, r: number) {
    const phi = (90 - lat) * Math.PI / 180, theta = lon * Math.PI / 180
    return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), -r * Math.sin(phi) * Math.sin(theta))
  }

  const pinsGroup = new THREE.Group()
  globe.add(pinsGroup)
  const pinData: any[] = []

  // Create flag DOM elements inside wrap (fallback path — main thread has DOM access)
  const flagsLayer = document.createElement('div')
  flagsLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:15;overflow:visible;'
  wrap.appendChild(flagsLayer)

  const tipEl = document.createElement('div')
  tipEl.className = 'tip'
  wrap.appendChild(tipEl)
  tipEl.innerHTML = `<div class="tip__country"><span id="fb-tip-country">—</span></div><div class="tip__meta"><span class="tip__dot"></span><span id="fb-tip-students">—</span><span class="sep"></span><span>Cohorte activa</span></div>`
  const tipCountryEl  = tipEl.querySelector('#fb-tip-country')  as HTMLElement
  const tipStudentsEl = tipEl.querySelector('#fb-tip-students') as HTMLElement

  let rectOx = 0, rectOy = 0, rectW = 0, rectH = 0
  function updateRectCache() {
    const wr = wrap.getBoundingClientRect()
    const lr = flagsLayer.getBoundingClientRect()
    rectOx = wr.left - lr.left; rectOy = wr.top - lr.top
    rectW  = wr.width; rectH  = wr.height
  }
  updateRectCache()
  new ResizeObserver(updateRectCache).observe(wrap)

  countries.forEach((c, idx) => {
    const surfaceNormal = latLonToVec3(c.lat, c.lon, 1.0)
    const pos = surfaceNormal.clone().multiplyScalar(R * 1.008)
    const anchor = new THREE.Object3D(); anchor.position.copy(pos); pinsGroup.add(anchor)
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.0 }))
    dot.position.copy(pos); pinsGroup.add(dot)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.003, 6, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }))
    ring.position.copy(pos); ring.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), surfaceNormal)); pinsGroup.add(ring)

    const flagEl = document.createElement('div')
    flagEl.className = 'flag-pin'
    const imgEl = document.createElement('img')
    imgEl.className = 'flag-pin__img'
    imgEl.alt = c.name          // textContent equivalent — no innerHTML injection
    imgEl.src = `https://flagcdn.com/w80/${c.code}.png`
    flagEl.appendChild(imgEl)
    flagEl.addEventListener('mouseenter', () => {
      const r = flagsLayer.getBoundingClientRect(), fr = flagEl.getBoundingClientRect()
      tipEl.style.left = (fr.left + fr.width / 2 - r.left) + 'px'
      tipEl.style.top  = (fr.top - r.top) + 'px'
      tipCountryEl.textContent  = c.name
      tipStudentsEl.textContent = c.students + ' estudiantes'
      tipEl.classList.add('show')
    })
    flagEl.addEventListener('mouseleave', () => tipEl.classList.remove('show'))
    flagsLayer.appendChild(flagEl)
    pinData.push({ ...c, anchor, flagEl, worldPos: new THREE.Vector3(), dot, dotFreq: 0.8 + idx * 0.1 })
  })

  // Arcs
  const arcGroup = new THREE.Group(); globe.add(arcGroup)
  const arcEntries: any[] = []
  arcPairs.forEach(([a, b], i) => {
    const cA = countries[a], cB = countries[b]
    const vA = latLonToVec3(cA.lat, cA.lon, R), vB = latLonToVec3(cB.lat, cB.lon, R)
    const dist = vA.angleTo(vB) / Math.PI, height = R * (1.10 + dist * 0.62)
    const mid = vA.clone().add(vB).normalize().multiplyScalar(height)
    const SEG = 80, positions = new Float32Array((SEG + 1) * 3), tValues = new Float32Array(SEG + 1)
    for (let k = 0; k <= SEG; k++) {
      const t = k / SEG
      const p = new THREE.Vector3().addScaledVector(vA, (1-t)*(1-t)).addScaledVector(mid, 2*(1-t)*t).addScaledVector(vB, t*t)
      positions[k*3] = p.x; positions[k*3+1] = p.y; positions[k*3+2] = p.z; tValues[k] = t
    }
    const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
    const staticLine = new THREE.Line(sGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false }))
    arcGroup.add(staticLine)
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); pGeo.setAttribute('aT', new THREE.BufferAttribute(tValues, 1))
    const isHub = a === 6 || b === 6
    const phase = i / arcPairs.length
    const pulseMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uH1: { value: phase }, uH2: { value: (phase+.5)%1 }, uLen: { value: 0.22 }, uVis: { value: 1.0 }, uMaxA: { value: isHub ? 0.35 : 0.22 } },
      vertexShader: PULSE_VERT, fragmentShader: PULSE_FRAG,
    })
    arcGroup.add(new THREE.Line(pGeo, pulseMat))
    const particle = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 }))
    arcGroup.add(particle)
    arcEntries.push({ staticLine, pulseMat, midVec: mid, speed: 0.18/(0.35+dist), phase, particle, vA: vA.clone(), vB: vB.clone() })
  })

  const schoolGroup = new THREE.Group(); globe.add(schoolGroup)
  const schoolEntries: any[] = []
  SCHOOLS_GUAJIRA.forEach((s, i) => {
    const pos = latLonToVec3(s.lat, s.lon, R * 1.010)
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), new THREE.MeshBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.9 }))
    mesh.position.copy(pos); schoolGroup.add(mesh)
    schoolEntries.push({ mesh, timeOffset: i * 0.45 })
  })

  const schoolArcGroup = new THREE.Group(); globe.add(schoolArcGroup)
  const schoolArcEntries: any[] = []
  SCHOOL_ARC_PAIRS.forEach(([ai, bi], idx) => {
    const sA = SCHOOLS_GUAJIRA[ai], sB = SCHOOLS_GUAJIRA[bi]
    const vA = latLonToVec3(sA.lat, sA.lon, R), vB = latLonToVec3(sB.lat, sB.lon, R)
    const mid = vA.clone().add(vB).normalize().multiplyScalar(R * 1.45)
    const phase = idx / SCHOOL_ARC_PAIRS.length
    const SEG = 32, positions = new Float32Array((SEG + 1) * 3), tValues = new Float32Array(SEG + 1)
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG
      const p = new THREE.Vector3().addScaledVector(vA,(1-t)*(1-t)).addScaledVector(mid,2*(1-t)*t).addScaledVector(vB,t*t)
      positions[i*3]=p.x;positions[i*3+1]=p.y;positions[i*3+2]=p.z;tValues[i]=t
    }
    const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
    schoolArcGroup.add(new THREE.Line(sGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, depthWrite: false })))
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); pGeo.setAttribute('aT', new THREE.BufferAttribute(tValues, 1))
    const pulseMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uH1: { value: phase }, uH2: { value: (phase+.5)%1 }, uLen: { value: 0.28 }, uVis: { value: 1.0 }, uMaxA: { value: 0.30 } },
      vertexShader: PULSE_VERT, fragmentShader: PULSE_FRAG,
    })
    schoolArcGroup.add(new THREE.Line(pGeo, pulseMat))
    schoolArcEntries.push({ pulseMat, midVec: mid, speed: 0.35, phase })
  })

  globe.rotation.x = 0.3; globe.rotation.y = -0.2
  const clock = new THREE.Clock()
  const camFwd = new THREE.Vector3(0, 0, 1)
  let elapsed = 0, lastCoordKey = '', rafId = 0
  let isDown = false, lastX = 0, lastY = 0
  let angVelY = 0.0008, angVelX = 0.0
  let isVisible = true

  new IntersectionObserver(([e]) => { isVisible = e.isIntersecting }).observe(wrap)

  function animate() {
    rafId = requestAnimationFrame(animate)
    if (!isVisible) return
    const dt = clock.getDelta(); elapsed += dt
    if (!isDown) {
      angVelY = angVelY * 0.995 + 0.0008 * 0.005; angVelX *= 0.97
      globe.rotation.y += angVelY
      globe.rotation.x = Math.max(-0.9, Math.min(0.9, globe.rotation.x + angVelX))
    }
    arcEntries.forEach(arc => {
      arc.phase = (arc.phase + dt * arc.speed) % 1.0
      arc.pulseMat.uniforms.uH1.value = arc.phase; arc.pulseMat.uniforms.uH2.value = (arc.phase + 0.5) % 1.0
      const mw = arc.midVec.clone().applyEuler(globe.rotation)
      const vis = Math.max(0, mw.normalize().dot(camFwd))
      arc.pulseMat.uniforms.uVis.value = vis * 0.90; arc.staticLine.material.opacity = vis * 0.08
      const t = arc.phase
      arc.particle.position.set(
        (1-t)*(1-t)*arc.vA.x+2*(1-t)*t*arc.midVec.x+t*t*arc.vB.x,
        (1-t)*(1-t)*arc.vA.y+2*(1-t)*t*arc.midVec.y+t*t*arc.vB.y,
        (1-t)*(1-t)*arc.vA.z+2*(1-t)*t*arc.midVec.z+t*t*arc.vB.z,
      ); arc.particle.material.opacity = vis * 0.9
    })
    schoolEntries.forEach(d => { const s = Math.sin((elapsed + d.timeOffset) * 3.0); d.mesh.scale.setScalar(1.0 + 0.35 * s * s) })
    atmInnerMat.uniforms.uBreath.value = 0.40 + 0.08 * Math.sin(elapsed * 0.5)
    atmOuterMat.uniforms.uBreath.value = 0.15 + 0.04 * Math.sin(elapsed * 0.5)
    schoolArcEntries.forEach(arc => {
      arc.phase = (arc.phase + dt * arc.speed) % 1.0
      arc.pulseMat.uniforms.uH1.value = arc.phase; arc.pulseMat.uniforms.uH2.value = (arc.phase + 0.5) % 1.0
      const mw = arc.midVec.clone().applyEuler(globe.rotation)
      arc.pulseMat.uniforms.uVis.value = Math.max(0, mw.normalize().dot(camFwd))
    })
    let bestCenter: any = null, bestScore = -1
    pinData.forEach((p, i) => {
      p.anchor.getWorldPosition(p.worldPos)
      const camDir = new THREE.Vector3().subVectors(camera.position, p.worldPos).normalize()
      p._facing = camDir.dot(p.worldPos.clone().normalize()); p._visible = p._facing > 0.15
      const proj = p.worldPos.clone().project(camera)
      p._sx = (proj.x * 0.5 + 0.5) * rectW + rectOx
      p._sy = (-proj.y * 0.5 + 0.5) * rectH + rectOy
      const score = p._facing - Math.hypot(proj.x, proj.y) * 0.6
      if (p._visible && score > bestScore) { bestScore = score; bestCenter = p }
    })
    pinData.forEach((p, i) => {
      let lift = 0
      if (p._visible) {
        pinData.forEach((q, j) => {
          if (i !== j && q._visible && p.students < q.students && Math.hypot(p._sx - q._sx, p._sy - q._sy) < 40)
            lift = Math.max(lift, 30)
        })
      }
      p.flagEl.style.transform = `translate(${p._sx}px,${p._sy - 28 - lift}px) translateX(-50%)`
      const dotAlpha = p._visible ? Math.min(1, (p._facing - 0.15) * 4) : 0
      p.flagEl.style.opacity = String(dotAlpha); p.flagEl.style.pointerEvents = p._visible ? 'auto' : 'none'
      const _ds = Math.sin(elapsed * p.dotFreq * 2.5)
      p.dot.scale.setScalar(1.0 + 0.35 * _ds * _ds); p.dot.material.opacity = dotAlpha; p.dot.visible = dotAlpha > 0.01
    })
    if (bestCenter && bestCenter.name !== lastCoordKey) {
      lastCoordKey = bestCenter.name
      onCoordChange?.(bestCenter.coordLabel)
    }
    renderer.render(scene, camera)
  }
  rafId = requestAnimationFrame(animate)
  setTimeout(() => onReady?.(), 200)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId)
    else { clock.getDelta(); rafId = requestAnimationFrame(animate) }
  })

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  wrap.addEventListener('pointerdown', e => {
    isDown = true; lastX = e.clientX; lastY = e.clientY
    if (!reducedMotion()) wrap.classList.add('globe-dragging')
  })
  window.addEventListener('pointerup', () => { isDown = false; wrap.classList.remove('globe-dragging') })
  window.addEventListener('pointermove', e => {
    if (!isDown) return
    const dx = e.clientX - lastX, dy = e.clientY - lastY
    lastX = e.clientX; lastY = e.clientY
    const vy = dx * 0.005, vx = dy * 0.005
    globe.rotation.y += vy; globe.rotation.x = Math.max(-0.9, Math.min(0.9, globe.rotation.x + vx))
    angVelY = vy; angVelX = vx
  })

  // Ignore isMobile warning — used only in buildEarthTexture (not needed here since we load the real texture)
  void isMobile
}
