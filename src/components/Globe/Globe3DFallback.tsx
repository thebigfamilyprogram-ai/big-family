'use client'

export default function Globe3DFallback() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #1E3A5F 0%, #0D0D0D 100%)',
        border: '1px solid rgba(192,57,43,0.3)',
        boxShadow: '0 0 60px 20px rgba(192,57,43,0.12), 0 0 120px 40px rgba(30,58,95,0.15)',
        animation: 'globe3d-pulse 3s ease-in-out infinite',
      }} />
      <style>{`
        @keyframes globe3d-pulse {
          0%,100% { box-shadow:0 0 60px 20px rgba(192,57,43,.12),0 0 120px 40px rgba(30,58,95,.15); }
          50%      { box-shadow:0 0 80px 30px rgba(192,57,43,.20),0 0 160px 60px rgba(30,58,95,.25); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
