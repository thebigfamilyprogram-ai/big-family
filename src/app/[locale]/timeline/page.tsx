'use client'

export const dynamic = 'force-dynamic'

import TimelineSection from '@/components/TimelineSection'
import { useTranslations } from 'next-intl'
import PublicNavbar from '@/components/PublicNavbar'

export default function TimelinePage() {
  const t = useTranslations('timeline')
  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Satoshi",sans-serif;min-height:100vh;color:var(--ink);}
        .tl-page-main{max-width:1000px;margin:0 auto;padding:72px 40px 100px;}
        .tl-page-eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#C0392B;margin-bottom:16px;}
        .tl-page-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(40px,7vw,72px);letter-spacing:-.04em;line-height:1;color:var(--ink,#0D0D0D);margin-bottom:16px;}
        .tl-page-title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .tl-page-sub{font-size:17px;color:#6B6B6B;line-height:1.6;max-width:520px;margin-bottom:72px;}
        @media(max-width:600px){.tl-page-main{padding:48px 20px 80px;}}
      `}</style>

      <PublicNavbar />

      <main className="tl-page-main">
        <p className="tl-page-eyebrow">{t('title')}</p>
        <h1 className="tl-page-title">{t('pageTitle')}</h1>
        <p className="tl-page-sub">{t('pageIntro')}</p>

        <TimelineSection theme="light" />
      </main>
    </>
  )
}
