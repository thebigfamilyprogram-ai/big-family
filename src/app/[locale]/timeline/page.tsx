'use client'

export const dynamic = 'force-dynamic'

import TimelineSection from '@/components/TimelineSection'
import Link from 'next/link'

export default function TimelinePage() {
  return (
    <>
      <style>{`
                *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Satoshi",sans-serif;min-height:100vh;color:var(--ink);}
        .tl-page-nav{position:sticky;top:0;z-index:30;background:rgba(245,243,239,.88);backdrop-filter:saturate(150%) blur(16px);border-bottom:1px solid rgba(13,13,13,.08);height:62px;display:flex;align-items:center;padding:0 40px;gap:24px;}
        .tl-page-brand{display:flex;align-items:center;gap:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;color:var(--ink,#0D0D0D);}
        .tl-page-main{max-width:1000px;margin:0 auto;padding:72px 40px 100px;}
        .tl-page-eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#C0392B;margin-bottom:16px;}
        .tl-page-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(40px,7vw,72px);letter-spacing:-.04em;line-height:1;color:var(--ink,#0D0D0D);margin-bottom:16px;}
        .tl-page-title em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;color:#C0392B;}
        .tl-page-sub{font-size:17px;color:#6B6B6B;line-height:1.6;max-width:520px;margin-bottom:72px;}
        @media(max-width:600px){.tl-page-nav{padding:0 20px;}.tl-page-main{padding:48px 20px 80px;}}
      `}</style>

      {/* Nav */}
      <nav className="tl-page-nav">
        <Link className="tl-page-brand" href="/">
          <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          Big Family
        </Link>
      </nav>

      <main className="tl-page-main">
        <p className="tl-page-eyebrow">Nuestra Historia</p>
        <h1 className="tl-page-title">Cuatro años<br />construyendo <em>líderes</em>.</h1>
        <p className="tl-page-sub">
          Cada hito en nuestra historia es el resultado de jóvenes que decidieron actuar,
          aprender y transformar sus comunidades.
        </p>

        <TimelineSection theme="light" />
      </main>
    </>
  )
}
