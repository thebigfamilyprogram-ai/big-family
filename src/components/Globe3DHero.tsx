'use client'

import dynamic from 'next/dynamic'

// Globe3DCanvas is client-only (OffscreenCanvas + Web Worker)
// It self-detects OffscreenCanvas support in useEffect and is a no-op if unsupported
const Globe3DCanvas = dynamic(
  () => import('@/components/Globe/Globe3DCanvas'),
  { ssr: false },
)

export default function Globe3DHero() {
  return (
    <div
      className="globe3d-hero"
      style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'visible' }}
    >
      <Globe3DCanvas />
      <style>{`
        @media (max-width: 960px) {
          .globe3d-hero { aspect-ratio: unset; height: 280px; }
        }
      `}</style>
    </div>
  )
}
