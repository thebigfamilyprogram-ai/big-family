'use client'

import dynamic from 'next/dynamic'

const GlobeHero = dynamic(() => import('@/components/GlobeHero'), {
  ssr: false,
  loading: () => <div className="globe-skeleton" />,
})

export default function Home() {
  return <GlobeHero />
}
