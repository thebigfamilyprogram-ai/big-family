'use client'

import { memo, useEffect, useRef } from 'react'
import * as THREE from 'three'

// ── Ally data (coords match dashboard/global-map COUNTRIES) ──────────────────

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

// Colombia → todos, + regional hubs
const ARC_PAIRS: [number, number][] = [
  [0,  1], [0,  2], [0,  3], [0,  4],
  [0,  5], [0,  6], [0,  7], [0,  8],
  [0,  9], [0, 10], [0, 11],
  [1, 10], [1,  4], [1,  5],   // us → uk, fr, de
  [3,  4], [3,  5], [3, 10],   // es → fr, de, uk
  [11, 9], [11, 7],            // ar → br, py
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function isLand(lat: number, lng: number): boolean {
  if (lat >  15 && lat <  72 && lng > -168 && lng <  -52) return true  // N América
  if (lat > -56 && lat <  13 && lng >  -82 && lng <  -34) return true  // S América
  if (lat >  35 && lat <  71 && lng >  -10 && lng <   40) return true  // Europa
  if (lat > -35 && lat <  37 && lng >  -18 && lng <   52) return true  // África
  if (lat >   0 && lat <  75 && lng >   40 && lng <  145) return true  // Asia
  if (lat > -10 && lat <  30 && lng >   60 && lng <  105) return true  // Asia sur
  if (lat > -45 && lat < -10 && lng >  113 && lng <  155) return true  // Australia
  if (lat >  60 && lat <  84 && lng >  -58 && lng <  -18) return true  // Groenlandia
  if (lat >  30 && lat <  46 && lng >  129 && lng <  146) return true  // Japón
  return false
}

function latLngToVec3(lat: number, lng: number, r = 1.001): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

const HeroGlobe = memo(function HeroGlobe() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null)
  const frameRef     = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark'

    // ── Scene / clock
    const scene = new THREE.Scene()
    const clock = new THREE.Clock()

    // ── Renderer
    const w = container.clientWidth  || 600
    const h = container.clientHeight || 600
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(w, h)
    renderer.domElement.style.cssText = 'position:absolute;inset:0;cursor:grab;'
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── Camera
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100)
    camera.position.z = 2.6

    // ── Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(5, 3, 5)
    scene.add(dirLight)
    const pointLight = new THREE.PointLight(0xC0392B, isDark() ? 0.8 : 0.5, 8)
    pointLight.position.set(-4, -2, -2)
    scene.add(pointLight)

    // ── Globe group (all objects rotate together)
    const globeGroup = new THREE.Group()
    scene.add(globeGroup)
    if (!prefersReduced) globeGroup.scale.setScalar(0.001)

    // ── Surface sphere
    const surfaceMat = new THREE.MeshPhongMaterial({
      color:     isDark() ? 0x1C1B19 : 0xEAE6DE,
      emissive:  0x0a0000,
      specular:  0x1a1a1a,
      shininess: 15,
    })
    globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), surfaceMat))

    // ── Atmosphere layers
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0xC0392B, transparent: true,
      opacity: isDark() ? 0.06 : 0.03,
      side: THREE.BackSide,
    })
    globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.04, 32, 32), atmMat))
    globeGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.08, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0xC0392B, transparent: true,
        opacity: isDark() ? 0.03 : 0.015,
        side: THREE.BackSide,
      }),
    ))

    // ── Continent dots — InstancedMesh for performance
    const dotPositions: THREE.Vector3[] = []
    for (let i = 0; i < 9000; i++) {
      const lat = Math.asin(2 * Math.random() - 1) * (180 / Math.PI)
      const lng = Math.random() * 360 - 180
      if (isLand(lat, lng)) dotPositions.push(latLngToVec3(lat, lng, 1.001))
    }
    const dotMat = new THREE.MeshBasicMaterial({ color: isDark() ? 0x2E2C28 : 0xB8B0A4 })
    const instDots = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.004, 4, 4),
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

    // ── Ally positions (slightly above surface)
    const allyVecs = ALLIES.map(a => latLngToVec3(a.lat, a.lng, 1.015))

    // ── Ally dots + pulse rings
    const pulseRings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }[] = []
    ALLIES.forEach((ally, i) => {
      const pos = allyVecs[i]

      // Main dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(ally.isOrigin ? 0.028 : 0.018, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xC0392B }),
      )
      dot.position.copy(pos)
      globeGroup.add(dot)

      // Origin ring (static)
      if (ally.isOrigin) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.035, 0.042, 32),
          new THREE.MeshBasicMaterial({
            color: 0xC0392B, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
          }),
        )
        ring.position.copy(pos)
        ring.lookAt(new THREE.Vector3(0, 0, 0))
        globeGroup.add(ring)
      }

      // Pulse ring (animated)
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0xC0392B, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
      })
      const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.027, 32), pulseMat)
      pulseRing.position.copy(pos)
      pulseRing.lookAt(new THREE.Vector3(0, 0, 0))
      globeGroup.add(pulseRing)
      pulseRings.push({ mesh: pulseRing, mat: pulseMat, phase: i * (Math.PI * 2 / ALLIES.length) })
    })

    // ── Arcs + travelers
    const PTS = 61
    const arcCurves: THREE.QuadraticBezierCurve3[] = []
    const arcLines:  THREE.Line[]  = []
    interface Traveler { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; speed: number; offset: number }
    const travelers: Traveler[] = []

    ARC_PAIRS.forEach(([ai, bi], arcIdx) => {
      const pA = allyVecs[ai]
      const pB = allyVecs[bi]
      const dist = pA.distanceTo(pB)
      const mid  = new THREE.Vector3()
        .addVectors(pA, pB)
        .normalize()
        .multiplyScalar(1.3 + dist * 0.3)

      const curve = new THREE.QuadraticBezierCurve3(pA, mid, pB)
      arcCurves.push(curve)

      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(PTS - 1))
      geo.setDrawRange(0, prefersReduced ? PTS : 0)   // instant if reduced motion
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xC0392B, transparent: true, opacity: 0.18 }),
      )
      globeGroup.add(line)
      arcLines.push(line)

      if (!prefersReduced) {
        const tMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.008, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xC0392B }),
        )
        tMesh.position.copy(curve.getPointAt(0))
        globeGroup.add(tMesh)
        travelers.push({ mesh: tMesh, curve, speed: 0.08 + arcIdx * 0.003, offset: arcIdx * 0.15 })
      }
    })

    // Arc stagger start times (seconds after clock start)
    const arcStartT = ARC_PAIRS.map((_, i) => 0.5 + i * 0.09)

    // ── Interaction state
    let isDragging  = false
    let prevX = 0, prevY = 0
    let velX  = 0, velY  = 0
    let autoRotate  = !prefersReduced

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
      const dx = e.clientX - prevX
      const dy = e.clientY - prevY
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
      const dx = e.touches[0].clientX - prevX
      const dy = e.touches[0].clientY - prevY
      velX = dx * 0.005; velY = dy * 0.005
      globeGroup.rotation.y += velX
      globeGroup.rotation.x  = Math.max(-0.8, Math.min(0.8, globeGroup.rotation.x + velY))
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY
    }
    const onTouchEnd = () => { isDragging = false }

    renderer.domElement.addEventListener('mousedown',  onMouseDown)
    window.addEventListener('mousemove',  onMouseMove)
    window.addEventListener('mouseup',    onMouseUp)
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true })
    renderer.domElement.addEventListener('touchmove',  onTouchMove,  { passive: true })
    renderer.domElement.addEventListener('touchend',   onTouchEnd)

    // ── Pause when offscreen
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
      renderer.setSize(w2, h2)
    })
    ro.observe(container)

    // ── Dark mode live update
    const mo = new MutationObserver(() => {
      const dark = isDark()
      surfaceMat.color.setHex(dark ? 0x1C1B19 : 0xEAE6DE)
      dotMat.color.setHex(dark ? 0x2E2C28 : 0xB8B0A4)
      atmMat.opacity = dark ? 0.06 : 0.03
      pointLight.intensity = dark ? 0.8 : 0.5
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // ── Animate loop
    function animate() {
      if (!isVisible) { frameRef.current = 0; return }
      frameRef.current = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Entrance: scale up (easeOutCubic)
      if (!prefersReduced) {
        const p = Math.min(elapsed / 1.2, 1)
        globeGroup.scale.setScalar(1 - Math.pow(1 - p, 3))
      }

      // Arc draw — staggered reveal
      if (!prefersReduced) {
        arcLines.forEach((line, i) => {
          const dt = elapsed - arcStartT[i]
          if (dt <= 0) return
          const p  = Math.min(dt / 0.7, 1)
          const ep = 1 - Math.pow(1 - p, 2)          // easeOutQuad
          line.geometry.setDrawRange(0, Math.floor(ep * PTS))
        })
      }

      // Auto-rotate
      if (autoRotate && !isDragging) {
        globeGroup.rotation.y += 0.0015
      }

      // Inertia after drag
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
      window.removeEventListener('mousemove',  onMouseMove)
      window.removeEventListener('mouseup',    onMouseUp)
      renderer.domElement.removeEventListener('touchstart', onTouchStart)
      renderer.domElement.removeEventListener('touchmove',  onTouchMove)
      renderer.domElement.removeEventListener('touchend',   onTouchEnd)
      renderer.dispose()
      scene.clear()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
})

HeroGlobe.displayName = 'HeroGlobe'
export default HeroGlobe
