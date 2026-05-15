'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function SubmitLanding() {
  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;min-height:100vh;}
        .sl-page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;text-align:center;}
        .sl-logo{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:40px;}
        .sl-logo-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:#0D0D0D;letter-spacing:.04em;}
        .sl-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(28px,6vw,48px);letter-spacing:-.03em;color:#0D0D0D;line-height:1.1;max-width:520px;margin-bottom:16px;}
        .sl-sub{font-size:16px;color:#6B6B6B;line-height:1.6;max-width:440px;margin-bottom:48px;}
        .sl-buttons{display:flex;flex-direction:column;gap:12px;width:100%;max-width:340px;}
        .sl-btn-primary{display:flex;align-items:center;justify-content:center;min-height:54px;background:#C0392B;color:#fff;border-radius:12px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;text-decoration:none;transition:background .2s,transform .15s;}
        .sl-btn-primary:hover{background:#a93226;transform:translateY(-1px);}
        .sl-btn-ghost{display:flex;align-items:center;justify-content:center;min-height:54px;background:#fff;color:#0D0D0D;border:1.5px solid rgba(13,13,13,.15);border-radius:12px;font-family:"Satoshi",sans-serif;font-weight:600;font-size:15px;text-decoration:none;transition:border-color .2s,transform .15s;}
        .sl-btn-ghost:hover{border-color:#0D0D0D;transform:translateY(-1px);}
        .sl-footer{margin-top:48px;font-size:12px;color:#9a9690;}
      `}</style>

      <div className="sl-page">
        <div className="sl-logo">
          <svg width="40" height="40" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          <span className="sl-logo-name">Big Family</span>
        </div>

        <h1 className="sl-title">Sube tu Proyecto de Liderazgo</h1>
        <p className="sl-sub">Completa el formulario con tu proyecto y envíalo a tu coordinador</p>

        <div className="sl-buttons">
          <Link href="/submit/register" className="sl-btn-primary">Registrarme →</Link>
          <Link href="/submit/login"    className="sl-btn-ghost">Ya tengo cuenta</Link>
        </div>

        <p className="sl-footer">The Big Leader · Big Family © 2026</p>
      </div>
    </>
  )
}
