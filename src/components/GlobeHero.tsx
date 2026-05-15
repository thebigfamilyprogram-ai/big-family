'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView, useMotionValue, useTransform, useSpring, useReducedMotion } from 'framer-motion'
// TEMP LAUNCH: import restored when nav buttons are re-enabled
// import CoordinatorButton from '@/components/CoordinatorButton'
import * as topojson from 'topojson-client'

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

// Index map after adding México at 2:
//  0 Canadá  1 US  2 México  3 Guatemala  4 Nicaragua  5 Costa Rica
//  6 Colombia  7 Paraguay  8 Francia  9 Alemania  10 España  11 UAE
const arcPairs = [
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [1, 2], [1, 8], [1, 9], [1, 10],
  [6, 8], [6, 10],
  [8, 11], [10, 11],
  [7, 6], [7, 1],
]

// Fallback continent polygons used if world-atlas CDN is unavailable
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

// ── Pulse arc shaders ──────────────────────────────────────────────────────
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
  varying float vT;
  float pulse(float head, float t, float len){
    float d = mod(head - t + 2.0, 1.0);
    if(d > len) return 0.0;
    return sin((d / len) * 3.14159265);
  }
  void main(){
    float a = max(pulse(uH1, vT, uLen), pulse(uH2, vT, uLen)) * uVis;
    gl_FragColor = vec4(0.753, 0.22, 0.169, a);
  }`

// ── CountNumber helper ────────────────────────────────────────────────────────
function CountNumber({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const dur = 1400
    function tick(t: number) {
      const p = Math.min((t - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(to * e))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, to])
  return <span ref={ref}>{val}{suffix}</span>
}

// ── Static section data ───────────────────────────────────────────────────────
const misionStats = [
  { to: 5000, suffix: '+', label: 'Líderes a formar'      },
  { to: 50,   suffix: '+', label: 'Países para 2036'      },
  { to: 90,   suffix: '',  label: 'Instituciones aliadas' },
  { to: 2036, suffix: '',  label: 'Meta global'           },
]


/* EDITAR AQUÍ — fundadores */
const founders = [
  { initials: 'JV', name: 'Juan Felipe Visbal', role: 'Director de Visión y Contenido',        bio: 'La cara y voz del programa. Lidera la estrategia de contenido y la comunicación del impacto de Big Family.',                                                    tags: ['Contenido', 'Comunicación', 'Liderazgo'] },
  { initials: 'AG', name: 'Alejandro Garcia',   role: 'Director de Arquitectura y Operaciones', bio: 'Estructura y organización de todo el programa. Garantiza que cada pieza del sistema funcione con coherencia.',                                               tags: ['Operaciones', 'Estrategia', 'Estructura'] },
  { initials: 'SG', name: 'Samuel Gomez',       role: 'Director de Tecnología',                 bio: 'Construye y mantiene la plataforma tecnológica que hace posible la certificación The Big Leader.',                                                           tags: ['Tecnología', 'Plataforma', 'Desarrollo'] },
  { initials: 'LB', name: 'Luis Barrios',       role: 'Fundador y Mentor Estratégico',          bio: 'Fundador del programa y mentor del equipo. Su visión y liderazgo son la base institucional de Big Family.',                                                  tags: ['Fundador', 'Mentoría', 'Visión'] },
]

/* EDITAR AQUÍ — hitos del bento (Nuestra Historia) */
const bentoHitos = [
  { year: '2022', title: '[PLACEHOLDER — TÍTULO HITO 2022]', desc: '[PLACEHOLDER — DESCRIPCIÓN HITO 2022]', tag: '[PLACEHOLDER TAG]' },
  { year: '2023', title: '[PLACEHOLDER — TÍTULO HITO 2023]', desc: '[PLACEHOLDER — DESCRIPCIÓN HITO 2023]', tag: '[PLACEHOLDER TAG]' },
  { year: '2024', title: '[PLACEHOLDER — TÍTULO HITO 2024]', desc: '[PLACEHOLDER — DESCRIPCIÓN HITO 2024]', tag: '[PLACEHOLDER TAG]' },
  { year: '2025', title: '[PLACEHOLDER — TÍTULO HITO 2025]', desc: '[PLACEHOLDER — DESCRIPCIÓN HITO 2025]', tag: '[PLACEHOLDER TAG]' },
]

/* EDITAR AQUÍ — estadísticas del About */
const aboutStats = [
  { num: '[00]', label: '[PLACEHOLDER LABEL]' },
  { num: '[00]', label: '[PLACEHOLDER LABEL]' },
  { num: '[00]', label: '[PLACEHOLDER LABEL]' },
]

const particles = [
  { x: 15, y: 25, size: 3, dur: 5.2, delay: 0   },
  { x: 72, y: 60, size: 2, dur: 7.1, delay: 1.3 },
  { x: 38, y: 80, size: 4, dur: 4.8, delay: 0.7 },
  { x: 85, y: 35, size: 2, dur: 6.5, delay: 2.1 },
  { x: 55, y: 15, size: 3, dur: 5.9, delay: 0.4 },
  { x: 22, y: 70, size: 2, dur: 7.8, delay: 1.8 },
  { x: 91, y: 55, size: 3, dur: 4.5, delay: 2.9 },
  { x: 48, y: 45, size: 2, dur: 6.2, delay: 1.1 },
]

// ── Visión section ───────────────────────────────────────────────────────────
type VisionWord = { text: string; italic: boolean }
const VISION_WORDS: VisionWord[] = [
  { text: 'Para',        italic: false },
  { text: 'el',          italic: false },
  { text: 'año',         italic: false },
  { text: '2036,',       italic: false },
  { text: 'The',         italic: false },
  { text: 'Big',         italic: false },
  { text: 'Family',      italic: false },
  { text: 'será',        italic: false },
  { text: 'reconocido',  italic: false },
  { text: 'globalmente', italic: false },
  { text: 'como',        italic: false },
  { text: 'un',          italic: false },
  { text: 'referente',   italic: true  },
  { text: 'de',          italic: false },
  { text: 'excelencia',  italic: false },
  { text: 'en',          italic: false },
  { text: 'liderazgo.',  italic: true  },
]
const visionWordV = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 20 } },
}
const visionStaggerV = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04 } },
}

// TEMP LAUNCH: Día de Liderazgo target — 2026-05-16 08:00 Colombia (UTC-5)
const DL_TARGET = new Date('2026-05-16T13:00:00Z')

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      expired: false,
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return t
}

export default function GlobeHero() {
  const wrapRef    = useRef<HTMLDivElement>(null)
  const flagsRef   = useRef<HTMLDivElement>(null)
  const tipRef     = useRef<HTMLDivElement>(null)
  const tipCountryRef  = useRef<HTMLSpanElement>(null)
  const tipStudentsRef = useRef<HTMLSpanElement>(null)
  const coordRef   = useRef<HTMLSpanElement>(null)
  const rendererRef   = useRef<any>(null)
  const initialized   = useRef(false)

  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 100, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 100, damping: 25 })
  const rotateX = useTransform(springY, [-300, 300], [8, -8])
  const rotateY = useTransform(springX, [-300, 300], [-8, 8])

  const prefersReduced    = useReducedMotion()
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const dlCd = useCountdown(DL_TARGET)

  useEffect(() => {
    setBannerDismissed(localStorage.getItem('dlg-banner-dismissed') === '1')
  }, [])

  function handleAboutMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }

  function handleAboutMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    document.querySelectorAll<HTMLElement>('.reveal').forEach(el => {
      const d = +(el.dataset.delay || 0)
      setTimeout(() => el.classList.add('in'), 180 + d)
    })

    function countUp(el: HTMLElement, to: number, dur = 1400) {
      const start = performance.now()
      function tick(t: number) {
        const p = Math.min((t - start) / dur, 1)
        const e = 1 - Math.pow(1 - p, 3)
        el.textContent = String(Math.round(to * e))
        if (p < 1) requestAnimationFrame(tick)
        else el.textContent = String(to)
      }
      requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          countUp(e.target as HTMLElement, +(e.target as HTMLElement).dataset.to!)
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.4 })
    document.querySelectorAll<HTMLElement>('.count').forEach(el => io.observe(el))

    const nav = document.getElementById('nav')
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 10)
    window.addEventListener('scroll', onScroll)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/three@0.160.0/build/three.min.js'
    script.onload = () => { initGlobe().catch(console.error) }
    document.head.appendChild(script)

    let renderer: any
    async function initGlobe() {
      const THREE = (window as any).THREE
      const wrap       = wrapRef.current   as HTMLDivElement
      const flagsLayer = flagsRef.current  as HTMLDivElement
      const tip        = tipRef.current    as HTMLDivElement
      if (!wrap || !flagsLayer || !tip) return

      const isMobile = window.innerWidth < 768

      // ── BUILD EARTH TEXTURE ─────────────────────────────────────────
      async function buildEarthTexture() {
        const W = 2048
        const H = 1024
        const c = document.createElement('canvas')
        c.width = W; c.height = H
        const ctx = c.getContext('2d')!

        // Deep ocean gradient
        const og = ctx.createLinearGradient(0, 0, 0, H)
        og.addColorStop(0,   '#092540')
        og.addColorStop(0.3, '#0d3462')
        og.addColorStop(0.5, '#1a4a7a')
        og.addColorStop(0.7, '#0d3462')
        og.addColorStop(1,   '#092540')
        ctx.fillStyle = og
        ctx.fillRect(0, 0, W, H)

        // Subtle ocean specular shimmer
        for (let i = 0; i < 8000; i++) {
          ctx.fillStyle = `rgba(150,205,255,${Math.random() * 0.02})`
          ctx.fillRect(Math.random() * W, Math.random() * H, Math.random() * 6 + 1, 1)
        }

        const project = (lon: number, lat: number): [number, number] => [
          ((lon + 180) / 360) * W,
          ((90 - lat) / 180) * H,
        ]

        // Land mask (transparent canvas → fill land black → check alpha)
        const maskC = document.createElement('canvas')
        maskC.width = W; maskC.height = H
        const mctx = maskC.getContext('2d')!
        mctx.fillStyle = '#000'

        // Stored feature shapes reused for coastline stroke
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
          const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
          const topo = await res.json()
          const landGeo = topojson.feature(topo as any, (topo as any).objects.land) as any

          const processGeom = (geom: any) => {
            if (!geom) return
            if (geom.type === 'Polygon') {
              fillPolygon(geom.coordinates)
              shapes.push({ type: 'Polygon', coords: geom.coordinates })
            } else if (geom.type === 'MultiPolygon') {
              geom.coordinates.forEach((poly: number[][][]) => {
                fillPolygon(poly)
              })
              shapes.push({ type: 'MultiPolygon', coords: geom.coordinates })
            }
          }

          if (landGeo.type === 'Feature') {
            processGeom(landGeo.geometry)
          } else if (landGeo.type === 'FeatureCollection') {
            landGeo.features.forEach((f: any) => processGeom(f?.geometry))
          }
        } catch {
          FALLBACK_CONTINENTS.forEach(poly => {
            fillPolygon([poly as number[][]])
            shapes.push({ type: 'Polygon', coords: [poly] })
          })
        }

        const mdata = mctx.getImageData(0, 0, W, H).data

        // Noise field for biome variation
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

        // Paint land with latitude-based biome colors
        const step = isMobile ? 3 : 4
        for (let y = 0; y < H; y += step) {
          for (let x = 0; x < W; x += step) {
            if (mdata[(y * W + x) * 4 + 3] < 128) continue  // skip ocean
            const n = noise(x / W, y / H)
            const lat = 90 - (y / H) * 180
            const lon = (x / W) * 360 - 180
            const absLat = Math.abs(lat)
            let r: number, g: number, b: number

            if (absLat > 65) {
              // Polar ice: #e8edf0 tinted blue
              const s = Math.floor(218 + n * 30)
              r = s; g = Math.floor(s + n * 4); b = Math.min(255, s + 14 + Math.floor(n * 8))
            } else if (absLat > 50) {
              // Tundra: grayish green #6a8a5a
              r = Math.floor(84 + n * 34); g = Math.floor(110 + n * 40); b = Math.floor(72 + n * 24)
            } else if (absLat > 30) {
              // Temperate: olive green #4a7a2a
              r = Math.floor(56 + n * 46); g = Math.floor(96 + n * 54); b = Math.floor(30 + n * 28)
            } else if (absLat > 15) {
              // Subtropical — mix sand (desert) / green by longitude
              const desert =
                (lat > 15 && lat < 35 && lon > -18 && lon < 62)   ? 0.76 :  // Sahara / Arabia
                (lat > 20 && lat < 35 && lon > 48  && lon < 100)  ? 0.52 :  // Iranian plateau
                (lat > 15 && lat < 30 && lon > -120 && lon < -60) ? 0.35 :  // N. Mexico
                (lat < -15 && lat > -32 && lon > 13 && lon < 25)  ? 0.60 :  // Namibia
                0.12
              const sr = Math.floor(178 + n * 42), sg = Math.floor(150 + n * 36), sb = Math.floor(86 + n * 26)
              const gr = Math.floor(52 + n * 50),  gg = Math.floor(114 + n * 50), gb = Math.floor(28 + n * 26)
              r = Math.floor(gr * (1 - desert) + sr * desert)
              g = Math.floor(gg * (1 - desert) + sg * desert)
              b = Math.floor(gb * (1 - desert) + sb * desert)
            } else {
              // Tropical jungle: #2d5a1b
              r = Math.floor(36 + n * 46); g = Math.floor(88 + n * 56); b = Math.floor(24 + n * 28)
            }

            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.beginPath()
            ctx.arc(
              x + (Math.random() - .5) * .8,
              y + (Math.random() - .5) * .8,
              1.5 + Math.random() * .6, 0, Math.PI * 2
            )
            ctx.fill()
          }
        }

        // Coastlines
        ctx.save()
        ctx.strokeStyle = 'rgba(255,255,255,0.20)'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'
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

        // Graticule
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.8
        for (let lat = -80; lat <= 80; lat += 15) {
          const [, y] = project(0, lat)
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
        }
        for (let lon = -180; lon <= 180; lon += 15) {
          const [x] = project(lon, 0)
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
        }

        const tex = new THREE.CanvasTexture(c)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 16
        return tex
      }

      // ── SCENE, CAMERA, RENDERER ────────────────────────────────────
      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
      camera.position.set(0, 0, 4.2)

      if (rendererRef.current) {
        rendererRef.current.dispose()
        rendererRef.current = null
      }
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      rendererRef.current = renderer
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
      renderer.setClearColor(0x000000, 0)
      wrap.querySelector('canvas')?.remove()
      wrap.appendChild(renderer.domElement)

      function resize() {
        const w = wrap.clientWidth, h = wrap.clientHeight
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      new ResizeObserver(resize).observe(wrap)
      resize()

      // ── LIGHTS ─────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0x8899cc, 0.45))
      const sun = new THREE.DirectionalLight(0xfff5e0, 1.5)
      sun.position.set(4, 3, 3); scene.add(sun)
      const fill = new THREE.DirectionalLight(0xaaccff, 0.25)
      fill.position.set(-2, -1, 2); scene.add(fill)

      // ── GLOBE ──────────────────────────────────────────────────────
      const R = 1.25
      const earthTex = await buildEarthTexture()
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(R, 64, 64),
        new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.70, metalness: 0.04 })
      )
      scene.add(globe)

      // ── NIGHT-SIDE OVERLAY ─────────────────────────────────────────
      const sunDir = new THREE.Vector3(4, 3, 3).normalize()
      const nightMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uSun: { value: sunDir } },
        vertexShader: `
          varying vec3 vWN;
          void main(){
            vWN = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 uSun;
          varying vec3 vWN;
          void main(){
            float day = dot(normalize(vWN), uSun);
            float a = smoothstep(0.12, -0.55, day) * 0.78;
            gl_FragColor = vec4(0.0, 0.01, 0.06, a);
          }`,
      })
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.001, 32, 32), nightMat))

      // ── ATMOSPHERE ─────────────────────────────────────────────────
      const atmMat = new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, depthWrite: false,
        uniforms: { uC: { value: new THREE.Color('#3a7abf') } },
        vertexShader: `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 vN; uniform vec3 uC; void main(){ float i=pow(0.70-dot(vN,vec3(0.,0.,1.)),2.0); gl_FragColor=vec4(uC,i*0.65);}`,
      })
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.030, 32, 32), atmMat))

      const haloMat = new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, depthWrite: false,
        uniforms: { uC: { value: new THREE.Color('#5599dd') } },
        vertexShader: `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 vN; uniform vec3 uC; void main(){ float i=pow(0.58-dot(vN,vec3(0.,0.,1.)),3.2); gl_FragColor=vec4(uC,i*0.20);}`,
      })
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 32, 32), haloMat))

      // ── PINS ───────────────────────────────────────────────────────
      const pinsGroup = new THREE.Group()
      globe.add(pinsGroup)

      function latLonToVec3(lat: number, lon: number, r: number) {
        const phi   = (90 - lat) * Math.PI / 180
        const theta = lon * Math.PI / 180
        return new THREE.Vector3(
           r * Math.sin(phi) * Math.cos(theta),
           r * Math.cos(phi),
          -r * Math.sin(phi) * Math.sin(theta)
        )
      }

      if (flagsLayer) { flagsLayer.innerHTML = '' }
      const pinData: any[] = []
      countries.forEach(c => {
        const pos = latLonToVec3(c.lat, c.lon, R * 1.005)
        const anchor = new THREE.Object3D()
        anchor.position.copy(pos)
        pinsGroup.add(anchor)

        const flagEl = document.createElement('div')
        flagEl.className = 'flag-pin'
        flagEl.innerHTML = `
          <img class="flag-pin__img" alt="${c.name}" src="https://flagcdn.com/w80/${c.code}.png" />
          <div class="flag-pin__line"></div>
          <div class="flag-pin__dot"></div>
        `
        flagEl.addEventListener('mouseenter', () => {
          const r  = flagsLayer.getBoundingClientRect()
          const fr = flagEl.getBoundingClientRect()
          tip.style.left = (fr.left + fr.width / 2 - r.left) + 'px'
          tip.style.top  = (fr.top - r.top) + 'px'
          if (tipCountryRef.current)  tipCountryRef.current.textContent  = c.name
          if (tipStudentsRef.current) tipStudentsRef.current.textContent = c.students + ' estudiantes'
          tip.classList.add('show')
        })
        flagEl.addEventListener('mouseleave', () => tip.classList.remove('show'))
        flagsLayer.appendChild(flagEl)
        pinData.push({ ...c, anchor, flagEl, worldPos: new THREE.Vector3() })
      })

      // ── ARCS ───────────────────────────────────────────────────────
      const arcGroup = new THREE.Group()
      globe.add(arcGroup)

      interface ArcEntry { staticLine: any; pulseMat: any; midVec: any; speed: number; phase: number }
      const arcEntries: ArcEntry[] = []

      function buildArc(idxA: number, idxB: number, initPhase: number) {
        const cA = countries[idxA], cB = countries[idxB]
        const vA = latLonToVec3(cA.lat, cA.lon, R)
        const vB = latLonToVec3(cB.lat, cB.lon, R)

        // Arc height proportional to great-circle distance
        const dist   = vA.angleTo(vB) / Math.PI
        const height = R * (1.10 + dist * 0.62)
        const mid    = vA.clone().add(vB).normalize().multiplyScalar(height)

        const SEG = 80
        const positions = new Float32Array((SEG + 1) * 3)
        const tValues   = new Float32Array(SEG + 1)
        for (let i = 0; i <= SEG; i++) {
          const t = i / SEG
          const p = new THREE.Vector3()
            .addScaledVector(vA,  (1 - t) * (1 - t))
            .addScaledVector(mid,  2 * (1 - t) * t)
            .addScaledVector(vB,   t * t)
          positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z
          tValues[i] = t
        }

        // Static faint path (pre-computed, never updated)
        const sGeo = new THREE.BufferGeometry()
        sGeo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
        const staticLine = new THREE.Line(sGeo,
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, depthWrite: false })
        )
        arcGroup.add(staticLine)

        // Gradient pulse via ShaderMaterial — only uniforms updated per frame
        const pGeo = new THREE.BufferGeometry()
        pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        pGeo.setAttribute('aT',       new THREE.BufferAttribute(tValues, 1))
        const pulseMat = new THREE.ShaderMaterial({
          transparent: true, depthWrite: false,
          uniforms: {
            uH1:  { value: initPhase },
            uH2:  { value: (initPhase + 0.5) % 1 },
            uLen: { value: 0.22 },
            uVis: { value: 1.0 },
          },
          vertexShader:   PULSE_VERT,
          fragmentShader: PULSE_FRAG,
        })
        arcGroup.add(new THREE.Line(pGeo, pulseMat))

        // Longer arcs rotate slower
        const speed = 0.18 / (0.35 + dist)
        arcEntries.push({ staticLine, pulseMat, midVec: mid, speed, phase: initPhase })
      }

      arcPairs.forEach(([a, b], i) => buildArc(a, b, i / arcPairs.length))

      // ── ANIMATION LOOP ─────────────────────────────────────────────
      globe.rotation.x = 0.3
      // lon=-90 faces camera at rest; −0.2 rad shifts center to lon≈−78° (Colombia / Central America)
      globe.rotation.y = -0.2

      let lastCoordKey = ''
      const clock    = new THREE.Clock()
      const camFwd   = new THREE.Vector3(0, 0, 1)

      function animate() {
        const dt = clock.getDelta()
        globe.rotation.y += 0.084 * dt  // delta-time: consistent on all monitors

        // Arc pulses — only uniform updates (no geometry rebuild)
        arcEntries.forEach(arc => {
          arc.phase = (arc.phase + dt * arc.speed) % 1.0
          arc.pulseMat.uniforms.uH1.value = arc.phase
          arc.pulseMat.uniforms.uH2.value = (arc.phase + 0.5) % 1.0
          const mw  = arc.midVec.clone().applyEuler(globe.rotation)
          const vis = Math.max(0, mw.normalize().dot(camFwd))
          arc.pulseMat.uniforms.uVis.value   = vis * 0.90
          arc.staticLine.material.opacity    = vis * 0.055
        })

        // Pin screen projections — pass 1: compute positions & find best center
        // globe-wrap is 120% of .right, centered; flags-layer is inset:0 on .right.
        // Must offset NDC→pixel conversion by the difference between their origins.
        const wrapRect  = wrap.getBoundingClientRect()
        const layerRect = flagsLayer.getBoundingClientRect()
        const ox = wrapRect.left - layerRect.left
        const oy = wrapRect.top  - layerRect.top
        let bestCenter: any = null, bestScore = -1
        pinData.forEach(p => {
          p.anchor.getWorldPosition(p.worldPos)
          const camDir = new THREE.Vector3().subVectors(camera.position, p.worldPos).normalize()
          p._facing  = camDir.dot(p.worldPos.clone().normalize())
          p._visible = p._facing > 0.15
          const proj = p.worldPos.clone().project(camera)
          p._sx = (proj.x * 0.5 + 0.5) * wrapRect.width  + ox
          p._sy = (-proj.y * 0.5 + 0.5) * wrapRect.height + oy
          const score = p._facing - Math.hypot(proj.x, proj.y) * 0.6
          if (p._visible && score > bestScore) { bestScore = score; bestCenter = p }
        })

        // Pass 2: apply transforms; lift overlapping flags (< 40 px apart) upward
        pinData.forEach((p, i) => {
          let lift = 0
          if (p._visible) {
            pinData.forEach((q, j) => {
              if (i !== j && q._visible && p.students < q.students &&
                  Math.hypot(p._sx - q._sx, p._sy - q._sy) < 40) {
                lift = Math.max(lift, 30)
              }
            })
          }
          p.flagEl.style.transform     = `translate(${p._sx}px,${p._sy - 42 - lift}px) translateX(-50%)`
          p.flagEl.style.opacity       = p._visible ? String(Math.min(1, (p._facing - 0.15) * 4)) : '0'
          p.flagEl.style.pointerEvents = p._visible ? 'auto' : 'none'
        })

        if (bestCenter && bestCenter.name !== lastCoordKey) {
          lastCoordKey = bestCenter.name
          if (coordRef.current) {
            coordRef.current.style.opacity = '0'
            setTimeout(() => {
              if (coordRef.current) {
                coordRef.current.textContent = bestCenter.coordLabel
                coordRef.current.style.opacity = '1'
              }
            }, 180)
          }
        }

        renderer.render(scene, camera)
        rafId = requestAnimationFrame(animate)
      }
      let rafId = requestAnimationFrame(animate)
      setTimeout(() => wrap.classList.add('in'), 200)

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          cancelAnimationFrame(rafId)
        } else {
          clock.getDelta()  // drain accumulated delta so rotation doesn't jump
          rafId = requestAnimationFrame(animate)
        }
      })

      // ── DRAG TO ROTATE ─────────────────────────────────────────────
      let isDown = false, lastX = 0, lastY = 0
      wrap.addEventListener('pointerdown', e => { isDown = true; lastX = e.clientX; lastY = e.clientY; wrap.style.cursor = 'grabbing' })
      window.addEventListener('pointerup',   () => { isDown = false; wrap.style.cursor = 'grab' })
      window.addEventListener('pointermove', e => {
        if (!isDown) return
        const dx = e.clientX - lastX, dy = e.clientY - lastY
        lastX = e.clientX; lastY = e.clientY
        globe.rotation.y += dx * 0.005
        globe.rotation.x  = Math.max(-0.9, Math.min(0.9, globe.rotation.x + dy * 0.005))
      })
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rendererRef.current) {
        const canvas = rendererRef.current.domElement
        if (wrapRef.current?.contains(canvas)) {
          wrapRef.current.removeChild(canvas)
        }
        rendererRef.current.dispose()
        rendererRef.current = null
      }
      initialized.current = false
    }
  }, [])

  return (
    <>
      <style>{`
        :root{--bg:#F5F3EF;--bg-2:#EFECE6;--ink:#0D0D0D;--ink-2:#2D2D2D;--mute:#6B6B6B;--line:rgba(13,13,13,.10);--line-soft:rgba(13,13,13,.06);--accent:#C0392B;--shadow-lg:0 30px 80px -20px rgba(13,13,13,.18),0 10px 30px -10px rgba(13,13,13,.10);}
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);color:var(--ink);font-family:"Inter",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
        body{min-height:100vh;overflow-x:hidden;}
        body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:1;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");opacity:.55;mix-blend-mode:multiply;}
        .nav{position:sticky;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;padding:18px 40px;transition:background .3s ease,border-color .3s ease;border-bottom:1px solid transparent;}
        .nav.scrolled{background:rgba(245,243,239,.78);backdrop-filter:saturate(140%) blur(14px);border-bottom-color:var(--line-soft);}
        .nav__brand{flex:1;display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;}
        .nav__spacer{flex:1;}
        .nav__links{display:flex;gap:34px;font-size:13.5px;color:var(--ink-2);}
        .nav__links a{color:inherit;text-decoration:none;position:relative;padding:4px 0;}
        .nav__links a:hover{color:var(--ink);}
        .nav__links a::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:1px;background:var(--ink);transform:scaleX(0);transform-origin:left;transition:transform .3s ease;}
        .nav__links a:hover::after{transform:scaleX(1);}
        .nav__cta{display:flex;gap:10px;align-items:center;}
        .btn{font-family:"Inter",sans-serif;font-size:13px;font-weight:500;padding:10px 16px;border-radius:999px;border:1px solid transparent;cursor:pointer;transition:all .25s ease;}
        .btn--ghost{background:transparent;color:var(--ink);border-color:var(--line);}
        .btn--ghost:hover{border-color:var(--ink-2);background:rgba(13,13,13,.04);}
        .btn--solid{background:var(--ink);color:#fff;border-color:var(--ink);}
        .btn--solid:hover{background:var(--accent);border-color:var(--accent);transform:translateY(-1px);box-shadow:0 10px 24px -8px rgba(192,57,43,.45);}
        .hero{position:relative;min-height:100vh;padding:120px 40px 140px;display:grid;grid-template-columns:45fr 55fr;gap:40px;align-items:center;overflow:visible;}
        .hero::before{content:"";position:absolute;left:40px;right:40px;top:90px;height:1px;background:var(--line-soft);}
        .meta{position:absolute;left:40px;right:40px;top:100px;display:flex;justify-content:space-between;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);z-index:2;}
        .meta .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);margin-right:8px;vertical-align:middle;position:relative;box-shadow:0 0 8px rgba(192,57,43,.6);animation:blink 1.6s ease-in-out infinite;}
        .meta .dot::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:1.5px solid var(--accent);opacity:.6;animation:pp 2s ease-out infinite;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.55}}
        @keyframes pp{0%{transform:scale(.6);opacity:.8}100%{transform:scale(2.2);opacity:0}}
        .left{position:relative;z-index:3;padding-top:20px;}
        .reveal{opacity:0;transform:translateY(22px);transition:opacity .9s ease,transform .9s ease;}
        .reveal.in{opacity:1;transform:translateY(0);}
        .brand{display:flex;flex-direction:column;align-items:flex-start;gap:14px;margin-bottom:44px;}
        .brand__logo{width:88px;height:88px;display:flex;align-items:center;justify-content:center;}
        .brand__word{font-size:10.5px;letter-spacing:.56em;text-transform:uppercase;color:var(--mute);border-top:1px solid var(--line);padding-top:12px;width:240px;display:flex;justify-content:space-between;align-items:center;}
        .brand__word .word{font-weight:400;letter-spacing:.48em;color:var(--ink-2);}
        h1.headline{font-family:"Satoshi","Inter",sans-serif;font-weight:900;font-size:clamp(40px,4.6vw,68px);line-height:1.02;letter-spacing:-0.035em;color:var(--ink);max-width:620px;}
        h1.headline em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:var(--accent);}
        h1.headline .dot-end{color:var(--accent);}
        .lede{margin-top:26px;max-width:460px;color:var(--ink-2);font-size:16px;line-height:1.65;}
        .cta-row{display:flex;gap:12px;margin-top:34px;align-items:center;}
        .stats{display:grid;grid-template-columns:1fr 1fr 1fr;margin-top:52px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);max-width:560px;}
        .stat{padding:20px 22px;border-right:1px solid var(--line);}
        .stat:last-child{border-right:0;}
        .stat__num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:40px;letter-spacing:-0.03em;color:var(--ink);line-height:1;display:flex;align-items:baseline;gap:2px;}
        .stat__num .plus{font-family:"Instrument Serif",serif;font-weight:400;font-style:italic;color:var(--accent);font-size:28px;}
        .stat__label{margin-top:10px;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--mute);}
        .right{position:relative;height:clamp(560px,80vh,820px);z-index:2;}
        .globe-wrap{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.92);width:120%;height:120%;max-width:900px;max-height:900px;opacity:0;transition:opacity 1.6s ease,transform 1.6s cubic-bezier(.2,.7,.2,1);cursor:grab;}
        .globe-wrap.in{opacity:1;transform:translate(-50%,-50%) scale(1);}
        .globe-wrap canvas{display:block;width:100% !important;height:100% !important;}
        .tip{position:absolute;pointer-events:none;z-index:20;padding:10px 14px 12px;background:rgba(255,255,255,.62);backdrop-filter:blur(14px) saturate(160%);border:1px solid rgba(255,255,255,.9);box-shadow:0 20px 50px -20px rgba(13,13,13,.25);border-radius:10px;font-family:"Inter",sans-serif;opacity:0;transform:translate(-50%,-110%) translateY(6px);transition:opacity .18s ease,transform .18s ease;min-width:170px;}
        .tip.show{opacity:1;transform:translate(-50%,-110%) translateY(0);}
        .tip__country{font-size:13px;font-weight:600;color:var(--ink);}
        .tip__meta{font-size:11px;color:var(--mute);margin-top:4px;display:flex;align-items:center;gap:8px;}
        .tip__meta .sep{width:3px;height:3px;background:var(--mute);border-radius:50%;}
        .tip__dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-right:6px;box-shadow:0 0 10px var(--accent);vertical-align:middle;}
        .orbit{position:absolute;inset:6%;border-radius:50%;border:1px dashed rgba(13,13,13,.08);pointer-events:none;animation:spin 80s linear infinite;}
        .orbit::before{content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:var(--accent);top:6%;left:50%;transform:translateX(-50%);box-shadow:0 0 14px var(--accent);}
        @keyframes spin{to{transform:rotate(360deg)}}
        .annot{position:absolute;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);z-index:4;}
        .annot::before{content:"";display:inline-block;width:30px;height:1px;background:var(--line);vertical-align:middle;margin-right:10px;}
        .flags-layer{position:absolute;inset:0;pointer-events:none;z-index:15;overflow:visible;}
        .flag-pin{position:absolute;left:0;top:0;pointer-events:auto;opacity:0;transition:opacity .35s ease;cursor:pointer;display:flex;flex-direction:column;align-items:center;}
        .flag-pin__img{width:26px;height:26px;border-radius:50%;border:1.5px solid #fff;box-shadow:0 4px 12px -2px rgba(13,13,13,.4);background:#fff;object-fit:cover;display:block;transition:transform .2s ease;}
        .flag-pin:hover .flag-pin__img{transform:scale(1.15);}
        .flag-pin__line{width:1.2px;height:12px;background:linear-gradient(to bottom,rgba(192,57,43,.85),rgba(192,57,43,.55));pointer-events:none;}
        .flag-pin__dot{width:8px;height:8px;border-radius:50%;background:#C0392B;border:1.5px solid #fff;box-shadow:0 0 10px rgba(192,57,43,.7);position:relative;}
        .flag-pin__dot::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:1.5px solid rgba(192,57,43,.6);animation:pinPulse 2s ease-out infinite;}
        @keyframes pinPulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(2.4);opacity:0}}
        .conferencista{position:absolute;left:40px;right:40px;bottom:-60px;z-index:5;display:flex;align-items:center;background:rgba(255,255,255,.55);backdrop-filter:blur(20px) saturate(160%);border:1px solid rgba(255,255,255,.9);border-radius:18px;box-shadow:var(--shadow-lg);overflow:hidden;}
        .conf__person{display:flex;align-items:center;gap:14px;flex:1;padding:16px 20px;}
        .conf__sep{width:1px;align-self:stretch;background:rgba(13,13,13,.09);flex-shrink:0;}
        .conf__avatar{width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#C9C4BA 0%,#8c8a83 60%,#55534d 100%);border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-family:"Instrument Serif",serif;font-size:17px;color:#fff;position:relative;flex-shrink:0;}
        .conf__avatar::after{content:"";position:absolute;width:12px;height:12px;border-radius:50%;background:var(--accent);border:2px solid #fff;right:-2px;bottom:-2px;}
        .conf__text{display:flex;flex-direction:column;}
        .conf__name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:13.5px;letter-spacing:-0.01em;color:var(--ink);}
        .conf__role{font-size:11px;color:var(--mute);margin-top:2px;}
        .conf__badge{font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink);padding:16px 18px;border-left:1px solid rgba(13,13,13,.09);display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.5);flex-shrink:0;}
        .conf__badge .pulse{width:8px;height:8px;border-radius:50%;background:var(--accent);position:relative;box-shadow:0 0 8px rgba(192,57,43,.6);animation:liveBlink 1.6s ease-in-out infinite;}
        .conf__badge .pulse::after{content:"";position:absolute;inset:-5px;border-radius:50%;border:1.5px solid var(--accent);opacity:.7;animation:pp 1.8s ease-out infinite;}
        @keyframes liveBlink{0%,100%{opacity:1}50%{opacity:.55}}
        .scroll-ind{position:absolute;left:50%;bottom:-130px;transform:translateX(-50%);z-index:4;display:flex;flex-direction:column;align-items:center;gap:10px;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--mute);}
        .scroll-ind .bar{width:1px;height:40px;background:linear-gradient(var(--line),transparent);position:relative;overflow:hidden;}
        .scroll-ind .bar::after{content:"";position:absolute;top:0;left:0;right:0;height:10px;background:var(--ink);animation:drop 2.2s ease-in-out infinite;}
        @keyframes drop{0%{transform:translateY(-10px);opacity:0}40%{opacity:1}100%{transform:translateY(40px);opacity:0}}
        .hero-bottom-spacer{height:0;}
        @media(max-width:960px){.hero{grid-template-columns:1fr;padding:110px 24px 120px;}.nav{padding:14px 20px;}.nav__links{display:none;}.right{height:460px;}.conferencista{left:20px;right:20px;flex-direction:column;align-items:stretch;}.conf__person{flex:none;}.conf__sep{width:auto;height:1px;align-self:auto;}.conf__badge{border-left:none;border-top:1px solid rgba(13,13,13,.09);justify-content:center;}.meta{left:20px;right:20px;}}
        /* ── MISIÓN ──────────────────────────────────────────────────────────── */
        .mision{background:#080808;padding:160px 40px;}
        .mision__inner{max-width:900px;margin:0 auto;text-align:center;}
        .mision__eyebrow-pill{display:inline-flex;align-items:center;border:1px solid rgba(192,57,43,0.3);background:rgba(192,57,43,0.08);color:#C0392B;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;border-radius:999px;padding:6px 16px;margin-bottom:40px;}
        .mision__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(52px,7vw,96px);line-height:1.0;letter-spacing:-0.04em;margin-top:0;}
        .mision__title-line{display:block;color:rgba(255,255,255,0.92);}
        .mision__title-line--accent{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .mision__sub{font-family:"Inter",sans-serif;font-size:18px;color:rgba(255,255,255,0.5);line-height:1.7;max-width:600px;margin:28px auto 0;text-align:center;}
        .mision__stats{max-width:1200px;margin:100px auto 0;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,0.06);}
        .mision__stat{padding:48px 32px;border-right:1px solid rgba(255,255,255,0.06);text-align:center;}
        .mision__stat:last-child{border-right:none;}
        .mision__stat-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:72px;color:#fff;line-height:1;display:flex;align-items:baseline;justify-content:center;gap:4px;letter-spacing:-0.04em;}
        .mision__stat-num em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;font-size:48px;}
        .mision__stat-label{font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-top:8px;}
        /* ── VISIÓN ──────────────────────────────────────────────────────────── */
        .vision{background:#0D0D0D;border-top:1px solid rgba(255,255,255,.06);padding:120px 40px;position:relative;overflow:hidden;}
        .vision__watermark{position:absolute;bottom:-20px;right:-10px;font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(120px,15vw,220px);color:rgba(255,255,255,.03);line-height:1;letter-spacing:-.06em;pointer-events:none;user-select:none;z-index:0;}
        .vision__inner{max-width:1200px;margin:0 auto;position:relative;z-index:1;display:flex;flex-direction:column;gap:52px;}
        .vision__row1{display:flex;flex-direction:column;gap:14px;}
        .vision__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#C0392B;}
        .vision__eyebrow-line{height:2px;background:#C0392B;border-radius:999px;transform-origin:left;width:60px;}
        .vision__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(40px,6vw,80px);letter-spacing:-.035em;line-height:1.08;color:#fff;}
        .vision__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .vision__cols{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;}
        .vision__para{font-family:"Inter",sans-serif;font-size:16px;color:rgba(255,255,255,.72);line-height:1.8;border-left:2px solid rgba(192,57,43,.35);padding:4px 0 4px 20px;}
        /* ── BIG LEADER CARD ─────────────────────────────────────────────────── */
        .big-leader{margin-top:80px;position:relative;background:linear-gradient(135deg,rgba(192,57,43,0.12) 0%,rgba(255,255,255,0.02) 50%,rgba(192,57,43,0.06) 100%);border:1px solid rgba(192,57,43,0.25);border-radius:24px;padding:48px;overflow:hidden;cursor:default;transition:border-color 0.4s cubic-bezier(0.16,1,0.3,1),box-shadow 0.4s cubic-bezier(0.16,1,0.3,1);}
        .big-leader:hover{border-color:rgba(192,57,43,0.45);box-shadow:0 0 60px rgba(192,57,43,0.08);}
        .big-leader__glow{position:absolute;top:-60px;left:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(192,57,43,0.2),transparent);pointer-events:none;}
        .big-leader__inner{display:grid;grid-template-columns:45% 55%;gap:48px;position:relative;z-index:1;}
        .big-leader__badge{display:inline-flex;align-items:center;background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);border-radius:999px;padding:6px 14px;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#C0392B;margin-bottom:24px;}
        .big-leader__name-the{font-family:"Inter",sans-serif;font-weight:400;font-size:42px;color:rgba(255,255,255,0.5);display:block;line-height:1.1;}
        .big-leader__name-leader{font-family:"Satoshi",sans-serif;font-weight:900;font-size:64px;color:#fff;letter-spacing:-0.04em;display:block;line-height:1.0;}
        .big-leader__sub{font-family:"Inter",sans-serif;font-size:15px;color:rgba(255,255,255,0.5);line-height:1.6;margin-top:16px;max-width:280px;}
        .big-leader__skills{display:flex;flex-direction:column;justify-content:center;}
        .big-leader__skill{display:flex;gap:14px;align-items:flex-start;padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.06);}
        .big-leader__skill:first-child{padding-top:0;}
        .big-leader__skill:last-child{border-bottom:none;padding-bottom:0;}
        .big-leader__skill-icon{width:36px;height:36px;background:rgba(192,57,43,0.1);border:1px solid rgba(192,57,43,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .big-leader__skill-title{font-family:"Satoshi",sans-serif;font-weight:600;font-size:15px;color:#fff;}
        .big-leader__skill-sub{font-family:"Inter",sans-serif;font-size:13px;color:rgba(255,255,255,0.4);margin-top:3px;line-height:1.5;}
        /* ── NUESTRA HISTORIA ───────────────────────────────────────────────── */
        .historia{position:relative;background:#080808;padding:140px 40px;overflow:hidden;}
        .historia__grain{position:absolute;inset:0;pointer-events:none;z-index:0;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");opacity:0.35;mix-blend-mode:overlay;}
        .historia__radial{position:absolute;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse 90% 60% at 50% -10%,rgba(192,57,43,0.14),transparent 70%);}
        .historia__particle{position:absolute;border-radius:50%;background:rgba(192,57,43,0.4);pointer-events:none;z-index:0;animation:particleFloat linear infinite;}
        @keyframes particleFloat{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-20px);opacity:0.8}}
        .historia__inner{position:relative;z-index:1;max-width:1200px;margin:0 auto;}
        .historia__header{display:grid;grid-template-columns:55% 45%;gap:60px;align-items:center;margin-bottom:80px;}
        .historia__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:20px;}
        .historia__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(44px,6vw,80px);color:#fff;letter-spacing:-0.04em;line-height:1.0;}
        .historia__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .historia__sub{font-family:"Inter",sans-serif;font-size:16px;color:rgba(255,255,255,0.5);line-height:1.65;max-width:420px;}
        .bento{display:grid;grid-template-columns:1.4fr 1fr 1fr;grid-template-rows:auto auto;gap:16px;}
        .bento__cell{position:relative;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 24px 48px rgba(0,0,0,0.4);border-radius:20px;padding:32px;overflow:hidden;will-change:transform;transition:border-color 0.3s ease,box-shadow 0.3s ease;}
        .bento__cell:hover{border-color:rgba(255,255,255,0.14);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 32px 64px rgba(0,0,0,0.5);}
        .bento__cell::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(192,57,43,0.6),transparent);opacity:0;transition:opacity 0.4s ease;}
        .bento__cell:hover::before{opacity:1;}
        .bento__cell--tall{grid-row:1/span 2;grid-column:1;}
        .bento__cell--wide{grid-row:2;grid-column:2/span 2;}
        .bento__year{font-family:"Courier New",monospace;font-size:13px;letter-spacing:0.15em;color:#C0392B;margin-bottom:16px;}
        .bento__title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:rgba(255,255,255,0.92);margin-bottom:12px;line-height:1.25;}
        .bento__desc{font-family:"Inter",sans-serif;font-size:14px;color:rgba(255,255,255,0.45);line-height:1.65;}
        .bento__tag{display:inline-block;margin-top:20px;border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:0.15em;border-radius:999px;padding:4px 12px;}
        /* ── ABOUT DARK ─────────────────────────────────────────────────────── */
        .about-dark{background:#080808;padding:120px 40px;border-top:1px solid rgba(255,255,255,0.06);}
        .about-dark__inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:100px;align-items:center;}
        .about-dark__photo-wrap{position:relative;}
        .about-dark__photo-perspective{perspective:1200px;}
        .about-dark__photo{aspect-ratio:3/4;border-radius:20px;background:linear-gradient(145deg,#1a1a1a 0%,#0d0d0d 100%);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;will-change:transform;}
        .about-dark__photo-dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px);background-size:24px 24px;}
        .about-dark__photo-label{color:rgba(255,255,255,0.15);font-size:12px;font-family:"Inter",sans-serif;letter-spacing:0.2em;text-transform:uppercase;position:relative;z-index:1;}
        .about-dark__badge{position:absolute;top:-16px;right:-16px;background:rgba(192,57,43,0.9);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:12px 16px;z-index:10;}
        .about-dark__badge-num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:#fff;}
        .about-dark__badge-label{font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;}
        .about-dark__text{display:flex;flex-direction:column;}
        .about-dark__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:20px;}
        .about-dark__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(32px,4vw,52px);color:#fff;letter-spacing:-0.03em;line-height:1.1;margin-bottom:24px;}
        .about-dark__para{font-family:"Inter",sans-serif;font-size:16px;color:rgba(255,255,255,0.55);line-height:1.75;max-width:480px;}
        .about-dark__para+.about-dark__para{margin-top:20px;}
        .about-dark__divider{height:1px;background:rgba(255,255,255,0.08);margin:32px 0;}
        .about-dark__stats{display:flex;align-items:center;}
        .about-dark__stat{flex:1;text-align:center;padding:0 16px;}
        .about-dark__stat:first-child{padding-left:0;}
        .about-dark__stat:last-child{padding-right:0;}
        .about-dark__stat-num{font-family:"Satoshi",sans-serif;font-weight:700;font-size:28px;color:#fff;}
        .about-dark__stat-label{font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;letter-spacing:0.05em;}
        .about-dark__stat-sep{width:1px;height:40px;background:rgba(255,255,255,0.08);flex-shrink:0;}
        .about-dark__cta{margin-top:32px;padding:12px 24px;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:999px;font-size:14px;font-family:"Satoshi",sans-serif;font-weight:500;cursor:pointer;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);width:fit-content;}
        .about-dark__cta:hover{background:#C0392B;border-color:#C0392B;}
        /* ── EQUIPO ──────────────────────────────────────────────────────────── */
        .equipo{background:#F5F3EF;border-top:1px solid rgba(13,13,13,.06);padding:120px 40px;}
        .equipo__inner{max-width:1200px;margin:0 auto;}
        .equipo__header{display:grid;grid-template-columns:60% 40%;gap:40px;align-items:end;margin-bottom:80px;}
        .equipo__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#6B6B6B;margin-bottom:20px;}
        .equipo__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(36px,4vw,56px);color:#0D0D0D;letter-spacing:-0.03em;line-height:1.1;}
        .equipo__title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .equipo__desc{font-family:"Inter",sans-serif;font-size:16px;color:#6B6B6B;line-height:1.65;}
        .equipo__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;background:rgba(13,13,13,.06);border:1px solid rgba(13,13,13,.06);border-radius:20px;overflow:hidden;}
        .equipo__card{background:#F5F3EF;padding:40px 36px;display:flex;flex-direction:column;border:1px solid transparent;transition:box-shadow .2s,transform .2s,border-color .2s;}
        .equipo__card:hover{transform:translateY(-4px);box-shadow:0 16px 40px -8px rgba(13,13,13,.18),inset 0 2px 0 #C0392B;border-color:rgba(192,57,43,.3);}
        .equipo__avatar{width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"Satoshi",sans-serif;font-weight:700;font-size:32px;color:#fff;margin-bottom:28px;flex-shrink:0;}
        .equipo__card-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;color:#0D0D0D;letter-spacing:-0.01em;margin-bottom:6px;}
        .equipo__card-role{font-family:"Inter",sans-serif;font-size:14px;color:#C0392B;margin-bottom:0;}
        .equipo__card-bio{font-family:"Inter",sans-serif;font-size:14px;color:#6B6B6B;line-height:1.6;flex:1;}
        .equipo__card-divider{border-top:1px solid var(--line);margin:12px 0;}
        .equipo__tags{display:flex;flex-wrap:wrap;gap:8px;}
        .equipo__tag{font-family:"Inter",sans-serif;font-size:11px;color:#C0392B;background:rgba(192,57,43,.08);border-radius:999px;padding:4px 12px;}
        /* ── DL Banner ── */
        .dl-banner{background:#C0392B;color:#fff;padding:9px 52px 9px 20px;display:flex;align-items:center;justify-content:center;gap:14px;font-size:13px;font-weight:500;position:relative;flex-wrap:wrap;}
        .dl-banner a{color:#fff;font-weight:700;text-decoration:underline;white-space:nowrap;}
        .dl-banner-x{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,.65);font-size:20px;line-height:1;padding:0 4px;transition:color .15s;}
        .dl-banner-x:hover{color:#fff;}
        /* ── DL Landing Section ── */
        .dl-landing{background:#080808;border-top:1px solid rgba(255,255,255,.06);padding:120px 40px;overflow:hidden;position:relative;}
        .dl-landing::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 110%,rgba(192,57,43,.14),transparent 70%);pointer-events:none;}
        .dl-landing__inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;position:relative;z-index:1;}
        .dl-landing__eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#C0392B;margin-bottom:16px;}
        .dl-landing__title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(32px,4vw,52px);color:#fff;letter-spacing:-.03em;line-height:1.1;margin-bottom:14px;}
        .dl-landing__desc{font-family:"Inter",sans-serif;font-size:16px;color:rgba(255,255,255,.52);line-height:1.7;margin-bottom:28px;}
        .dl-landing__btns{display:flex;gap:12px;flex-wrap:wrap;}
        .dl-landing__btn-p{padding:13px 26px;background:#C0392B;color:#fff;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;text-decoration:none;transition:background .2s;white-space:nowrap;}
        .dl-landing__btn-p:hover{background:#a93226;}
        .dl-landing__btn-g{padding:12px 26px;background:transparent;color:rgba(255,255,255,.65);border:1px solid rgba(255,255,255,.18);border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:600;font-size:14px;text-decoration:none;transition:all .2s;white-space:nowrap;}
        .dl-landing__btn-g:hover{border-color:rgba(255,255,255,.45);color:#fff;}
        .dl-cd{display:grid;grid-template-columns:repeat(4,1fr);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden;}
        .dl-cd-unit{padding:22px 10px;text-align:center;border-right:1px solid rgba(255,255,255,.07);}
        .dl-cd-unit:last-child{border-right:none;}
        .dl-cd-num{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(32px,4vw,48px);color:#fff;line-height:1;letter-spacing:-.04em;}
        .dl-cd-label{font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.32);margin-top:8px;}
        @media(max-width:960px){.mision{padding:80px 24px;}.mision__stats{grid-template-columns:1fr 1fr;}.mision__stat{border-right:none;border-bottom:1px solid rgba(255,255,255,0.06);}.vision{padding:80px 24px;}.vision__cols{grid-template-columns:1fr;gap:36px;}.vision__watermark{font-size:80px;}.big-leader__inner{grid-template-columns:1fr;}.historia{padding:80px 24px;}.historia__header{grid-template-columns:1fr;gap:24px;}.bento{grid-template-columns:1fr;}.bento__cell--tall,.bento__cell--wide{grid-row:auto;grid-column:auto;}.about-dark{padding:80px 24px;}.about-dark__inner{grid-template-columns:1fr;gap:48px;}.equipo{padding:100px 24px;}.equipo__header{grid-template-columns:1fr;}.equipo__grid{grid-template-columns:1fr;}.dl-landing{padding:80px 24px;}.dl-landing__inner{grid-template-columns:1fr;gap:48px;}}
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap" />
      <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap" />

      {/* TEMP LAUNCH: Día de Liderazgo event banner — dismissible */}
      {!bannerDismissed && (
        <div className="dl-banner">
          <span>🎯 Día de Liderazgo · La Guajira 2026 — ¿Eres estudiante participante?</span>
          <a href="/submit">Sube tu proyecto aquí →</a>
          <button
            className="dl-banner-x"
            aria-label="Cerrar"
            onClick={() => { setBannerDismissed(true); localStorage.setItem('dlg-banner-dismissed', '1') }}
          >×</button>
        </div>
      )}

      <nav className="nav" id="nav">
        <div className="nav__brand">
          <span aria-hidden="true" style={{ width: 22, height: 22, display: 'inline-block' }}>
            <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="5" r="2.4" fill="#0D0D0D"/><path d="M12 7.5 L20 22 H4 Z" fill="#0D0D0D"/><circle cx="5" cy="8" r="1.6" fill="#6B6B6B"/><circle cx="19" cy="8" r="1.6" fill="#6B6B6B"/></svg>
          </span>
          <span>Big Family</span>
        </div>
        <div className="nav__links">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#about">Países</a>
          <a href="#equipo">Equipo</a>
          <a href="/news">Noticias</a>
          <a href="/dia-de-liderazgo">Día de Liderazgo</a>
        </div>
        {/* TEMP LAUNCH: spacer replaces CTA — remove when CTA is restored and give nav__cta flex:1 instead */}
        <div className="nav__spacer" />
        {/* TEMP LAUNCH: hidden for Friday event — restore by removing this comment block
        <div className="nav__cta">
          <CoordinatorButton />
          <motion.div
            style={{ display: 'inline-flex' }}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <Link href="/login" className="btn btn--solid">Ingresar</Link>
          </motion.div>
        </div>
        */}
      </nav>

      <section className="hero" id="hero">
        <div className="meta">
          <span><span className="dot"></span>Programa activo · Cohorte 2026</span>
          <span ref={coordRef} style={{ transition: 'opacity .3s ease' }}>N 04°42′ · W 74°04′ · Bogotá</span>
        </div>

        <div className="left">
          <div className="brand reveal" data-delay="0">
            <div className="brand__logo">
              <svg viewBox="0 0 24 24" width="88" height="88" aria-label="Big Family" role="img">
                <circle cx="12" cy="5" r="2.4" fill="#0D0D0D"/>
                <path d="M12 7.5 L20 22 H4 Z" fill="#0D0D0D"/>
                <circle cx="5" cy="8" r="1.6" fill="#6B6B6B"/>
                <circle cx="19" cy="8" r="1.6" fill="#6B6B6B"/>
              </svg>
            </div>
            <div className="brand__word">
              <span>Est.</span>
              <span className="word">THE BIG FAMILY</span>
              <span>MMXX</span>
            </div>
          </div>
          <h1 className="headline reveal" data-delay="120">
            Liderazgo juvenil<br/>que <em>transforma</em><br/>comunidades<span className="dot-end">.</span>
          </h1>
          <p className="lede reveal" data-delay="260">
            Un programa global que conecta a una generación decidida a cambiar el rumbo de sus ciudades — con módulos, mentorías y una comunidad que trasciende fronteras.
          </p>
          <div className="cta-row reveal" data-delay="380">
            <Link href="/submit" className="btn btn--solid">Soy estudiante →</Link>
            <button className="btn btn--ghost" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>Conocer el programa</button>
          </div>
          <div className="stats reveal" data-delay="500">
            <div className="stat">
              <div className="stat__num"><span className="count" data-to="100">0</span><span className="plus">+</span></div>
              <div className="stat__label">Estudiantes</div>
            </div>
            <div className="stat">
              <div className="stat__num"><span className="count" data-to="90">0</span></div>
              <div className="stat__label">Colegios</div>
            </div>
            <div className="stat">
              <div className="stat__num"><span className="count" data-to="10">0</span></div>
              <div className="stat__label">Países</div>
            </div>
          </div>
        </div>

        <div className="right">
          <div className="annot" style={{ top: '14%', left: '-2%' }}>45°N · ATLÁNTICO</div>
          <div className="annot" style={{ bottom: '18%', right: '-2%' }}>10°S · CARIBE</div>
          <div className="orbit"></div>
          <div className="globe-wrap" ref={wrapRef}></div>
          <div className="flags-layer" ref={flagsRef}></div>
          <div className="tip" ref={tipRef}>
            <div className="tip__country"><span ref={tipCountryRef}>—</span></div>
            <div className="tip__meta">
              <span className="tip__dot"></span>
              <span ref={tipStudentsRef}>—</span>
              <span className="sep"></span>
              <span>Cohorte activa</span>
            </div>
          </div>
        </div>

        


        <div className="scroll-ind">
          <span>Scroll</span>
          <div className="bar"></div>
        </div>
      </section>

      <div className="hero-bottom-spacer"></div>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 1 — MISIÓN
      ══════════════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="mision">
        <div className="mision__inner">

          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            <span className="mision__eyebrow-pill">NUESTRA MISIÓN</span>
          </motion.div>

          {/* Título en 3 líneas — stagger con blur */}
          <motion.h2
            className="mision__title"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
          >
            {([
              { text: 'Queremos cambiar',   accent: false },
              { text: 'el mundo a través',  accent: false },
              { text: 'del liderazgo.',     accent: true  },
            ] as const).map((line, i) => (
              <motion.span
                key={i}
                className={`mision__title-line${line.accent ? ' mision__title-line--accent' : ''}`}
                variants={{
                  hidden:   { opacity: 0, y: 50, filter: 'blur(8px)' },
                  visible:  { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { type: 'spring', stiffness: 100, damping: 20 } },
                }}
              >{line.text}</motion.span>
            ))}
          </motion.h2>

          {/* Subtítulo */}
          <motion.p
            className="mision__sub"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.5 }}
          >
            Formando individuos capacitados en habilidades intra e interpersonales capaces de generar impacto real y construir comunidades más unidas.
          </motion.p>

        </div>

        {/* Stats — 4 columnas */}
        <motion.div
          className="mision__stats"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {misionStats.map((s) => (
            <motion.div
              key={s.label}
              className="mision__stat"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            >
              <div className="mision__stat-num">
                <CountNumber to={s.to} />{s.suffix && <em>{s.suffix}</em>}
              </div>
              <div className="mision__stat-label">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 2 — VISIÓN
      ══════════════════════════════════════════════════════════════════ */}
      <section className="vision">

        {/* "2036" watermark — fades in very last */}
        <motion.div
          className="vision__watermark"
          aria-hidden="true"
          initial={prefersReduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 3, ease: 'easeOut', delay: 1 }}
        >
          2036
        </motion.div>

        <div className="vision__inner">

          {/* Row 1 — Eyebrow + animated red line */}
          <div className="vision__row1">
            <motion.p
              className="vision__eyebrow"
              initial={prefersReduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              VISIÓN 2036
            </motion.p>
            <motion.div
              className="vision__eyebrow-line"
              initial={prefersReduced ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
            />
          </div>

          {/* Row 2 — Title with word-level stagger */}
          <h2 className="vision__title">
            <motion.span
              style={{ display: 'block' }}
              initial={prefersReduced ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={visionStaggerV}
            >
              {VISION_WORDS.map((word, i) => (
                <motion.span
                  key={i}
                  variants={visionWordV}
                  style={{ display: 'inline-block', marginRight: '0.28em' }}
                >
                  {word.italic ? <em>{word.text}</em> : word.text}
                </motion.span>
              ))}
            </motion.span>
          </h2>

          {/* Row 3 — Two text columns, appear after title stagger completes */}
          <motion.div
            className="vision__cols"
            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.6 }}
          >
            <p className="vision__para">
              Aspiramos a expandir nuestra red de liderazgo escolar para que tenga presencia en más de 50 países, conectando a más de 5.000 estudiantes que generen impacto positivo en sus comunidades.
            </p>
            <p className="vision__para">
              Buscamos que la certificación The Big Leader sea una señal clara y confiable de habilidades reales — que una empresa u organización la vea y entienda inmediatamente el valor de la persona: su capacidad de liderar, trabajar en equipo, tomar decisiones y generar impacto.
            </p>
          </motion.div>

          {/* The Big Leader Card */}
          <motion.div
            className="big-leader"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <div className="big-leader__glow" aria-hidden="true" />
            <div className="big-leader__inner">

              {/* Col izq — identidad */}
              <div>
                <span className="big-leader__badge">CERTIFICACIÓN OFICIAL</span>
                <span className="big-leader__name-the">The Big</span>
                <span className="big-leader__name-leader">Leader</span>
                <p className="big-leader__sub">Más que una certificación — una garantía de preparación.</p>
              </div>

              {/* Col der — habilidades */}
              <div className="big-leader__skills">

                <div className="big-leader__skill">
                  <div className="big-leader__skill-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1L9.8 5.6H15L10.8 8.8L12.4 13.4L8 10.2L3.6 13.4L5.2 8.8L1 5.6H6.2L8 1Z" fill="#C0392B"/>
                    </svg>
                  </div>
                  <div>
                    <div className="big-leader__skill-title">Liderazgo real</div>
                    <div className="big-leader__skill-sub">Capacidad de guiar equipos y tomar decisiones bajo presión</div>
                  </div>
                </div>

                <div className="big-leader__skill">
                  <div className="big-leader__skill-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="4" cy="8" r="2" stroke="#C0392B" strokeWidth="1.5"/>
                      <circle cx="12" cy="4" r="2" stroke="#C0392B" strokeWidth="1.5"/>
                      <circle cx="12" cy="12" r="2" stroke="#C0392B" strokeWidth="1.5"/>
                      <path d="M6 8H10M6 8C8 6.5 10 4 10 4M6 8C8 9.5 10 12 10 12" stroke="#C0392B" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <div className="big-leader__skill-title">Trabajo en equipo</div>
                    <div className="big-leader__skill-sub">Colaboración efectiva en entornos diversos y multiculturales</div>
                  </div>
                </div>

                <div className="big-leader__skill">
                  <div className="big-leader__skill-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M9 2L5 9H8L7 14L11 7H8L9 2Z" fill="#C0392B"/>
                    </svg>
                  </div>
                  <div>
                    <div className="big-leader__skill-title">Impacto medible</div>
                    <div className="big-leader__skill-sub">Iniciativas concretas que transforman comunidades</div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* TEMP HIDDEN: historia — change false to true to restore */}
      {(false as boolean) && (<>
      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 2 — NUESTRA HISTORIA (Bento)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="historia" className="historia">
        <div className="historia__grain" aria-hidden="true" />
        <div className="historia__radial" aria-hidden="true" />
        {particles.map((p, i) => (
          <div
            key={i}
            className="historia__particle"
            aria-hidden="true"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

        <div className="historia__inner">
          {/* Header asimétrico */}
          <div className="historia__header">
            <div>
              {/* EDITAR: eyebrow */}
              <motion.p
                className="historia__eyebrow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              >NUESTRA HISTORIA</motion.p>
              {/* EDITAR: título principal */}
              <motion.h2
                className="historia__title"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
              >
                {(['Cuatro', 'años'] as const).map((w, i) => (
                  <motion.span
                    key={i}
                    variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } } }}
                    style={{ display: 'inline-block', marginRight: '0.22em' }}
                  >{w}</motion.span>
                ))}
                <br />
                <motion.span
                  variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } } }}
                  style={{ display: 'inline-block', marginRight: '0.22em' }}
                >construyendo</motion.span>
                <motion.em
                  variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } } }}
                  style={{ display: 'inline-block' }}
                >líderes</motion.em>
                <motion.span
                  variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } } }}
                  style={{ display: 'inline-block' }}
                >.</motion.span>
              </motion.h2>
            </div>

            {/* EDITAR: subtítulo derecha */}
            <motion.p
              className="historia__sub"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }}
            >[PLACEHOLDER — descripción breve de la historia]</motion.p>
          </div>

          {/* Bento grid */}
          <div className="bento">
            {bentoHitos.map((h, i) => (
              <motion.div
                key={h.year}
                className={`bento__cell${i === 0 ? ' bento__cell--tall' : ''}${i === 3 ? ' bento__cell--wide' : ''}`}
                initial={{ opacity: 0, y: 32, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ y: -4 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.1 }}
              >
                {/* EDITAR: año del hito */}
                <div className="bento__year">{h.year}</div>
                {/* EDITAR: título del hito */}
                <div className="bento__title">{h.title}</div>
                {/* EDITAR: descripción del hito */}
                <p className="bento__desc">{h.desc}</p>
                {/* EDITAR: tag */}
                <span className="bento__tag">{h.tag}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      </>)}

      {/* TEMP: replace with real content when ready */}
      <section style={{ background: '#080808', padding: '80px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 16px' }}>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 18, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>En construcción</p>
          <p style={{ fontFamily: '"Inter",sans-serif', fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,.3)' }}>Próximamente</p>
        </div>
      </section>

      {/* TEMP HIDDEN: about — change false to true to restore */}
      {(false as boolean) && (<>
      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 3 — ABOUT (Parallax 3D)
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="about"
        className="about-dark"
        onMouseMove={handleAboutMouseMove}
        onMouseLeave={handleAboutMouseLeave}
      >
        <div className="about-dark__inner">

          {/* Columna izquierda — foto con parallax 3D */}
          <div className="about-dark__photo-wrap">
            <div className="about-dark__photo-perspective">
              <motion.div
                className="about-dark__photo"
                style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
              >
                <div className="about-dark__photo-dots" />
                {/* EDITAR: reemplazar con <img> cuando haya foto real */}
                <span className="about-dark__photo-label">[FOTO DEL PROGRAMA]</span>
              </motion.div>
            </div>
            {/* Badge flotante */}
            <div className="about-dark__badge">
              {/* EDITAR: número y subtexto del badge */}
              <div className="about-dark__badge-num">11 Países</div>
              <div className="about-dark__badge-label">activos en 2026</div>
            </div>
          </div>

          {/* Columna derecha — texto con stagger */}
          <div className="about-dark__text">
            <motion.p
              className="about-dark__eyebrow"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0 }}
            >SOBRE NOSOTROS</motion.p>

            {/* EDITAR: título about */}
            <motion.h2
              className="about-dark__title"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.08 }}
            >[PLACEHOLDER — TÍTULO ABOUT]</motion.h2>

            {/* EDITAR: párrafo 1 */}
            <motion.p
              className="about-dark__para"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.16 }}
            >[PLACEHOLDER — PÁRRAFO 1]</motion.p>

            {/* EDITAR: párrafo 2 */}
            <motion.p
              className="about-dark__para"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.24 }}
            >[PLACEHOLDER — PÁRRAFO 2]</motion.p>

            <motion.div
              className="about-dark__divider"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.32 }}
            />

            {/* EDITAR: estadísticas */}
            <motion.div
              className="about-dark__stats"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.40 }}
            >
              {aboutStats.flatMap((s, i) => [
                i > 0 ? <div key={`sep-${i}`} className="about-dark__stat-sep" /> : null,
                <div key={i} className="about-dark__stat">
                  {/* EDITAR: número y label */}
                  <div className="about-dark__stat-num">{s.num}</div>
                  <div className="about-dark__stat-label">{s.label}</div>
                </div>,
              ])}
            </motion.div>

            <motion.button
              className="about-dark__cta"
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.48 }}
            >Conocer el programa →</motion.button>
          </div>

        </div>
      </section>
      </>)}

      {/* TEMP: replace with real content when ready */}
      <section style={{ background: '#080808', padding: '80px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 16px' }}>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 18, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>En construcción</p>
          <p style={{ fontFamily: '"Inter",sans-serif', fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,.3)' }}>Próximamente</p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TEMP LAUNCH — DÍA DE LIDERAZGO SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className="dl-landing">
        <div className="dl-landing__inner">

          {/* Left: copy + buttons */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <div className="dl-landing__eyebrow">EVENTO ESPECIAL</div>
            <h2 className="dl-landing__title">Día de Liderazgo<br />La Guajira 2026</h2>
            <p className="dl-landing__desc">
              8 colegios de La Guajira presentan sus proyectos de liderazgo comunitario el 16 de mayo.
            </p>
            <div className="dl-landing__btns">
              <a href="/dia-de-liderazgo" className="dl-landing__btn-g">Ver más →</a>
              <a href="/submit" className="dl-landing__btn-p">Subir mi proyecto →</a>
            </div>
          </motion.div>

          {/* Right: countdown */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.1 }}
          >
            {dlCd.expired ? (
              <p style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 22, color: '#C0392B' }}>¡El evento ha comenzado! 🎉</p>
            ) : (
              <div className="dl-cd">
                {([
                  { val: dlCd.days,    label: 'Días'     },
                  { val: dlCd.hours,   label: 'Horas'    },
                  { val: dlCd.minutes, label: 'Minutos'  },
                  { val: dlCd.seconds, label: 'Segundos' },
                ] as { val: number; label: string }[]).map(({ val, label }) => (
                  <div key={label} className="dl-cd-unit">
                    <div className="dl-cd-num">{String(val).padStart(2, '0')}</div>
                    <div className="dl-cd-label">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN 3 — EQUIPO
      ══════════════════════════════════════════════════════════════════ */}
      <section id="equipo" className="equipo">
        <div className="equipo__inner">

          {/* Header */}
          <motion.div
            className="equipo__header"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div>
              <p className="equipo__eyebrow">EL EQUIPO</p>
              <h2 className="equipo__title">
                Las personas detrás<br />del <em>impacto</em>.
              </h2>
            </div>
            {/* EDITAR AQUÍ — descripción del equipo */}
            <p className="equipo__desc">Un equipo multidisciplinario unido por una misma convicción: que el liderazgo se aprende, se practica y se mide en impacto real.</p>
          </motion.div>

          {/* Grid de cards */}
          <div className="equipo__grid">
            {founders.map((f, i) => (
              <motion.div
                key={f.name}
                className="equipo__card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ type: 'spring', stiffness: 180, damping: 22, delay: i * 0.12 }}
              >
                <div
                  className="equipo__avatar"
                  style={{ background: 'linear-gradient(135deg,#C0392B,#922b21)' }}
                >
                  {f.initials}
                </div>
                <div className="equipo__card-name">{f.name}</div>
                {/* EDITAR AQUÍ — rol */}
                <div className="equipo__card-role">{f.role}</div>
                <div className="equipo__card-divider" />
                {/* EDITAR AQUÍ — bio */}
                <div className="equipo__card-bio">{f.bio}</div>
                <div className="equipo__tags">
                  {/* EDITAR AQUÍ — tags */}
                  {f.tags.map(t => (
                    <span key={t} className="equipo__tag">{t}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>
    </>
  )
}
