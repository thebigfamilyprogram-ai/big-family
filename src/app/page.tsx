'use client'

import dynamic from 'next/dynamic'

const GlobeHero = dynamic(() => import('@/components/GlobeHero'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '100vh', background: '#F5F3EF' }} />,
})

export default function Home() {
  return <GlobeHero />
}
