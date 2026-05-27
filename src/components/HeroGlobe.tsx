'use client'

import { memo, useEffect, useRef } from 'react'
import * as THREE from 'three'

// ── Ally data ─────────────────────────────────────────────────────────────────
const ALLIES = [
  { name: 'Colombia',       lat:   4.71, lng:  -74.07, isOrigin: true  },
  { name: 'Estados Unidos', lat:  38.90, lng:  -77.00, isOrigin: false },
  { name: 'Canadá',         lat:  56.10, lng: -106.30, isOrigin: false },
  { name: 'España',         lat:  40.40, lng:   -3.70, isOrigin: false },
  { name: 'Francia',        lat:  46.20, lng:    2.20, isOrigin: false },
  { name: 'Alemania',       lat:  51.20, lng:   10.50, isOrigin: false },
  { name: 'Emiratos',       lat:  23.40, lng:   53.80, isOrigin: false },
  { name: 'Paraguay',       lat: -23.40, lng:  -58.40, isOrigin: false },
  { name: 'México',         lat:  23.60, lng: -102.60, isOrigin: false },
  { name: 'Brasil',         lat: -14.20, lng:  -51.90, isOrigin: false },
  { name: 'Reino Unido',    lat:  55.40, lng:   -3.40, isOrigin: false },
  { name: 'Argentina',      lat: -38.40, lng:  -63.60, isOrigin: false },
] as const

const ARC_PAIRS: [number, number][] = [
  [0,  1], [0,  2], [0,  3], [0,  4],
  [0,  5], [0,  6], [0,  7], [0,  8],
  [0,  9], [0, 10], [0, 11],
  [1, 10], [1,  4], [1,  5],
  [3,  4], [3,  5], [3, 10],
  [11, 9], [11, 7],
]

// ── Improved land detection: 20+ bounding boxes ───────────────────────────────
function isLand(lat: number, lng: number): boolean {
  // North America (west)
  if (lat > 20 && lat < 70  && lng > -168 && lng < -105) return true
  // North America (east)
  if (lat > 15 && lat < 50  && lng > -105 && lng <  -52) return true
  // Central America
  if (lat >  7 && lat < 21  && lng >  -92 && lng <  -77) return true
  // Caribbean (approximate)
  if (lat > 15 && lat < 24  && lng >  -85 && lng <  -65) return true
  // South America north
  if (lat > -5 && lat < 12  && lng >  -82 && lng <  -60) return true
  // South America central/east
  if (lat > -35 && lat <  5 && lng >  -73 && lng <  -34) return true
  // South America south
  if (lat > -55 && lat < -35 && lng > -75 && lng < -63)  return true
  // Western Europe
  if (lat > 36  && lat < 71  && lng > -10 && lng <  25)  return true
  // Eastern Europe
  if (lat > 45  && lat < 71  && lng >  20 && lng <  40)  return true
  // Scandinavia
  if (lat > 57  && lat < 71  && lng >   5 && lng <  31)  return true
  // Africa north
  if (lat > -5  && lat < 37  && lng > -18 && lng <  52)  return true
  // Africa south
  if (lat > -35 && lat <  -5 && lng >  12 && lng <  42)  return true
  // Africa east horn
  if (lat > -5  && lat < 15  && lng >  38 && lng <  52)  return true
  // Middle East / Arabian Peninsula
  if (lat > 12  && lat < 38  && lng >  32 && lng <  60)  return true
  // Russia / Central Asia
  if (lat > 45  && lat < 75  && lng >  40 && lng < 145)  return true
  // South Asia
  if (lat >  5  && lat < 35  && lng >  60 && lng <  95)  return true
  // Southeast Asia
  if (lat > -10 && lat < 25  && lng >  95 && lng < 141)  return true
  // East Asia / China
  if (lat > 20  && lat < 55  && lng >  95 && lng < 140)  return true
  // Japan
  if (lat > 30  && lat < 46  && lng > 129 && lng < 146)  return true
  // Australia
  if (lat > -39 && lat < -12 && lng > 113 && lng < 154)  return true
  // New Zealand
  if (lat > -47 && lat < -34 && lng > 166 && lng < 179)  return true
  // Greenland
  if (lat > 60  && lat < 84  && lng > -58 && lng < -18)  return true
  // Iceland
  if (lat > 63  && lat < 67  && lng > -25 && lng < -13)  return true
  return false
}

function latLngToVec3(lat: number, lng: number, r = 1.0): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}

// Canvas 2D radial gradient → atmosphere glow texture
function makeAtmTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2, cy = size / 2, r = size / 2
  const grad = ctx.createRadialGradient(cx, cy, r * 0.48, cx, cy, r)
  grad.addColorStop(0,    'rgba(192,57,43,0.00)')
  grad.addColorStop(0.72, 'rgba(192,57,43,0.07)')
  grad.addColorStop(1.0,  'rgba(192,57,43,0.22)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

// ── Component ─────────────────────────────────────────────────────────────────
const HeroGlobe = memo(function HeroGlobe() {
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef     = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark'

    // ── Scene / clock
    const scene = new THREE.Scene()
    const clock = new THREE.Clock()

    // ── Renderer — canvas is 120% wide/tall, inset -10% to avoid any border-radius clipping
    const w = container.clientWidth  || 600
    const h = container.clientHeight || 600
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(w * 1.2, h * 1.2)
    renderer.domElement.style.cssText = [
      'position:absolute',
      'inset:-10%',
      'width:120%',
      'height:120%',
      'cursor:grab',
      'border-radius:0',
    ].join(';')
    container.appendChild(renderer.domElement)

    // ── Camera
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100)
    camera.position.z = 2.6

    // ── Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0)
    sunLight.position.set(5, 3, 5)
    scene.add(sunLight)
    // Red contraluz from behind-left
    const redLight = new THREE.DirectionalLight(0xC0392B, 0.3)
    redLight.position.set(-5, -2, -3)
    scene.add(redLight)
    const pointLight = new THREE.PointLight(0xC0392B, isDark() ? 0.8 : 0.5, 8)
    pointLight.position.set(-4, -2, -2)
    scene.add(pointLight)

    // ── Globe group — initial rotation puts Colombia toward viewer
    const globeGroup = new THREE.Group()
    globeGroup.rotation.y = -1.3
    scene.add(globeGroup)
    if (!prefersReduced) globeGroup.scale.setScalar(0.001)

    // ── Surface sphere
    const surfaceMat = new THREE.MeshPhongMaterial({
      color:     isDark() ? 0x1C1B19 : 0xEAE6DE,
      emissive:  0x050000,
      specular:  0x222222,
      shininess: 20,
    })
    globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), surfaceMat))

    // ── Atmosphere — Canvas2D sprite (outside globeGroup so it never rotates)
    const atmTex = makeAtmTexture()
    const atmSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: atmTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    }))
    atmSprite.renderOrder = -1
    atmSprite.scale.setScalar(2.4)
    scene.add(atmSprite)

    // ── Continent dots — InstancedMesh (5000 land-sampled points, radius 0.003)
    const dotPositions: THREE.Vector3[] = []
    let attempts = 0
    while (dotPositions.length < 5000 && attempts < 50000) {
      const lat = Math.asin(2 * Math.random() - 1) * (180 / Math.PI)
      const lng = Math.random() * 360 - 180
      if (isLand(lat, lng)) dotPositions.push(latLngToVec3(lat, lng, 1.003))
      attempts++
    }
    const dotMat = new THREE.MeshBasicMaterial({ color: isDark() ? 0x3D3A35 : 0xC8C0B4 })
    const instDots = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.003, 4, 4),
      dotMat,
      dotPositions.length,
    )
    const dummy = new THREE.Object3D()
    dotPositions.forEach((pos, i) => {
      dummy.position.copy(pos)
      dummy.updateMatrix()
      instDots.setMatrixAt(i, dummy.matrix)
    })
    instDots.instanceMatrix.needsUpdate = true
    globeGroup.add(instDots)

    // ── Ally positions — radius 1.012 to sit just above the surface
    const allyVecs = ALLIES.map(a => latLngToVec3(a.lat, a.lng, 1.012))

    // ── Ally markers + animated pulse rings
    const pulseRings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }[] = []
    ALLIES.forEach((ally, i) => {
      const pos = allyVecs[i]
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(ally.isOrigin ? 0.028 : 0.016, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xC0392B }),
      )
      dot.position.copy(pos)
      globeGroup.add(dot)

      if (ally.isOrigin) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.035, 0.042, 32),
          new THREE.MeshBasicMaterial({ color: 0xC0392B, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
        )
        ring.position.copy(pos)
        ring.lookAt(new THREE.Vector3(0, 0, 0))
        globeGroup.add(ring)
      }

      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0xC0392B, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
      })
      const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.027, 32), pulseMat)
      pulseRing.position.copy(pos)
      pulseRing.lookAt(new THREE.Vector3(0, 0, 0))
      globeGroup.add(pulseRing)
      pulseRings.push({ mesh: pulseRing, mat: pulseMat, phase: i * (Math.PI * 2 / ALLIES.length) })
    })

    // ── Arcs — TubeGeometry for real geometric thickness (WebGL linewidth > 1 is unreliable)
    const arcTubes: THREE.Mesh[] = []
    interface Traveler { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; speed: number; offset: number }
    const travelers: Traveler[] = []

    ARC_PAIRS.forEach(([ai, bi], arcIdx) => {
      const pA = allyVecs[ai]
      const pB = allyVecs[bi]
      const mid = new THREE.Vector3()
        .addVectors(pA, pB)
        .normalize()
        .multiplyScalar(1.3 + pA.distanceTo(pB) * 0.3)

      const curve = new THREE.QuadraticBezierCurve3(pA, mid, pB)
      const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.003, 6, false)
      // Start hidden — animate drawRange to reveal progressively
      if (!prefersReduced) tubeGeo.setDrawRange(0, 0)

      const tube = new THREE.Mesh(
        tubeGeo,
        new THREE.MeshBasicMaterial({ color: 0xC0392B, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
      )
      globeGroup.add(tube)
      arcTubes.push(tube)

      if (!prefersReduced) {
        const tMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.007, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xC0392B }),
        )
        tMesh.position.copy(curve.getPointAt(0))
        globeGroup.add(tMesh)
        travelers.push({ mesh: tMesh, curve, speed: 0.08 + arcIdx * 0.003, offset: arcIdx * 0.15 })
      }
    })

    // Staggered reveal start times (seconds after clock start)
    const arcStartT = ARC_PAIRS.map((_, i) => 0.5 + i * 0.09)

    // ── Drag + inertia state
    let isDragging = false
    let prevX = 0, prevY = 0
    let velX = 0, velY = 0
    let autoRotate = !prefersReduced

    const setGrabbing = (on: boolean) => {
      renderer.domElement.style.cursor = on ? 'grabbing' : 'grab'
    }

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true; autoRotate = false
      prevX = e.clientX; prevY = e.clientY; velX = 0; velY = 0
      setGrabbing(true)
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - prevX; const dy = e.clientY - prevY
      velX = dx * 0.005; velY = dy * 0.005
      globeGroup.rotation.y += velX
      globeGroup.rotation.x  = Math.max(-0.8, Math.min(0.8, globeGroup.rotation.x + velY))
      prevX = e.clientX; prevY = e.clientY
    }
    const onMouseUp = () => { isDragging = false; setGrabbing(false) }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      isDragging = true; autoRotate = false
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; velX = 0; velY = 0
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return
      const dx = e.touches[0].clientX - prevX; const dy = e.touches[0].clientY - prevY
      velX = dx * 0.005; velY = dy * 0.005
      globeGroup.rotation.y += velX
      globeGroup.rotation.x  = Math.max(-0.8, Math.min(0.8, globeGroup.rotation.x + velY))
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY
    }
    const onTouchEnd = () => { isDragging = false }

    renderer.domElement.addEventListener('mousedown',  onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true })
    renderer.domElement.addEventListener('touchmove',  onTouchMove,  { passive: true })
    renderer.domElement.addEventListener('touchend',   onTouchEnd)

    // ── Pause RAF when component is offscreen
    let isVisible = true
    const io = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
      if (isVisible && !frameRef.current) animate()
    }, { threshold: 0.1 })
    io.observe(container)

    // ── Responsive resize
    const ro = new ResizeObserver(() => {
      const w2 = container.clientWidth  || 600
      const h2 = container.clientHeight || 600
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
      renderer.setSize(w2 * 1.2, h2 * 1.2)
    })
    ro.observe(container)

    // ── Live dark-mode swap
    const mo = new MutationObserver(() => {
      const dark = isDark()
      surfaceMat.color.setHex(dark ? 0x1C1B19 : 0xEAE6DE)
      dotMat.color.setHex(dark ? 0x3D3A35 : 0xC8C0B4)
      pointLight.intensity = dark ? 0.8 : 0.5
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // ── Main RAF loop
    function animate() {
      if (!isVisible) { frameRef.current = 0; return }
      frameRef.current = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Entrance scale (easeOutCubic)
      if (!prefersReduced) {
        const p = Math.min(elapsed / 1.2, 1)
        globeGroup.scale.setScalar(1 - Math.pow(1 - p, 3))
      }

      // Staggered arc reveal via drawRange
      if (!prefersReduced) {
        arcTubes.forEach((tube, i) => {
          const dt = elapsed - arcStartT[i]
          if (dt <= 0) return
          const p     = Math.min(dt / 0.7, 1)
          const ep    = 1 - Math.pow(1 - p, 2)    // easeOutQuad
          const geo   = tube.geometry
          const total = geo.index ? geo.index.count : geo.attributes.position.count
          geo.setDrawRange(0, Math.floor(ep * total))
        })
      }

      // Auto-rotate
      if (autoRotate && !isDragging) globeGroup.rotation.y += 0.0015

      // Inertia decay
      if (!isDragging && !autoRotate) {
        velX *= 0.95; velY *= 0.95
        globeGroup.rotation.y += velX
        globeGroup.rotation.x  = Math.max(-0.8, Math.min(0.8, globeGroup.rotation.x + velY))
        if (Math.abs(velX) < 0.0001 && Math.abs(velY) < 0.0001) autoRotate = !prefersReduced
      }

      // Pulse rings
      pulseRings.forEach(({ mesh, mat, phase }) => {
        const t = (Math.sin(elapsed * 0.8 + phase) + 1) / 2
        mesh.scale.setScalar(1 + t * 1.5)
        mat.opacity = (1 - t) * 0.4
      })

      // Traveler particles
      if (!prefersReduced) {
        travelers.forEach(({ mesh, curve, speed, offset }) => {
          const t = ((elapsed * speed + offset) % 1 + 1) % 1
          mesh.position.copy(curve.getPointAt(t))
        })
      }

      renderer.render(scene, camera)
    }

    animate()

    // ── Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
      io.disconnect()
      ro.disconnect()
      mo.disconnect()
      renderer.domElement.removeEventListener('mousedown',  onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      renderer.domElement.removeEventListener('touchstart', onTouchStart)
      renderer.domElement.removeEventListener('touchmove',  onTouchMove)
      renderer.domElement.removeEventListener('touchend',   onTouchEnd)
      atmTex.dispose()
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mat = mesh.material
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose())
          else (mat as THREE.Material).dispose()
        }
      })
      renderer.forceContextLoss()
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'visible',
        borderRadius: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(192,57,43,0.06) 0%, transparent 70%)',
      }}
    />
  )
})

HeroGlobe.displayName = 'HeroGlobe'
export default HeroGlobe
