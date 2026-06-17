'use client'

import dynamic from 'next/dynamic'

const Globe3DCanvas = dynamic(
  () => import('@/components/Globe/Globe3DCanvas'),
  { ssr: false },
)

export default function Globe3DHero() {
  return (
    <div className="globe3d-hero" style={{ position: 'relative', width: '100%', overflow: 'visible' }}>
      {/* padding-bottom trick: creates definite height = width (1:1) in normal flow */}
      <div className="globe3d-spacer" style={{ paddingBottom: '100%' }} />
      {/* canvas fills the aspect-ratio box absolutely — has definite dimensions */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <Globe3DCanvas />
      </div>
      <style>{`
        @media (max-width: 960px) {
          .globe3d-hero  { height: 280px; }
          .globe3d-spacer { display: none; }
        }
      `}</style>
    </div>
  )
}
