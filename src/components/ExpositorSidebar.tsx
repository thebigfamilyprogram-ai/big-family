'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Props {
  activePage: 'modules'
  userName?:  string
  userInitial?: string
}

const BF_LOGO = (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <circle cx="12" cy="5" r="2.4" fill="#C0392B"/>
    <path d="M12 7.5 L20 22 H4 Z" fill="var(--ink)"/>
    <circle cx="5" cy="8" r="1.6" fill="var(--mute)"/>
    <circle cx="19" cy="8" r="1.6" fill="var(--mute)"/>
  </svg>
)

export default function ExpositorSidebar({ activePage, userName = '…', userInitial = 'E' }: Props) {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  async function handleLogout() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <style>{`
        .xsb{background:var(--card-bg);border-right:1px solid var(--line);display:flex;flex-direction:column;padding:28px 16px 24px;position:sticky;top:0;height:100vh;overflow-y:auto;width:260px;min-width:260px;flex-shrink:0;transition:background .2s,border-color .2s;}
        .xsb-logo{font-family:"Satoshi",sans-serif;font-weight:900;font-size:15px;letter-spacing:.12em;color:var(--ink);padding:0 8px;margin-bottom:8px;display:flex;align-items:center;gap:9px;}
        .xsb-role{font-size:10.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#C0392B;padding:0 8px;margin-bottom:24px;}
        .xsb-nav{display:flex;flex-direction:column;gap:3px;flex:1;}
        .xsb-section{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mute);padding:4px 12px;margin-top:16px;margin-bottom:4px;}
        .xsb-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;font-size:13.5px;font-weight:500;color:var(--mute);cursor:pointer;transition:all .18s;border:none;background:none;width:100%;text-align:left;}
        .xsb-item:hover{background:var(--line);color:var(--ink);}
        .xsb-item.xsb-active{background:#C0392B;color:#fff;}
        .xsb-divider{height:1px;background:var(--line);margin:16px 8px;}
        .xsb-btn-new{width:100%;padding:12px;background:#C0392B;color:#fff;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;letter-spacing:.04em;cursor:pointer;transition:background .2s;margin-top:4px;}
        .xsb-btn-new:hover{background:#a93226;}
        .xsb-user{display:flex;align-items:center;gap:10px;padding:12px 8px 0;}
        .xsb-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#C0392B 0%,#8B1A1A 100%);color:#fff;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .xsb-user-name{font-size:12.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .xsb-user-role{font-size:10.5px;color:var(--mute);margin-top:1px;}
        .xsb-links{display:flex;gap:12px;padding:12px 8px 0;font-size:11.5px;}
        .xsb-links button{color:var(--mute);background:none;border:none;cursor:pointer;font-size:11.5px;padding:0;transition:color .15s;}
        .xsb-links button:hover{color:#C0392B;}
      `}</style>

      <aside className="xsb">
        <div className="xsb-logo">
          {BF_LOGO}
          BIG FAMILY
        </div>
        <div className="xsb-role">Expositor</div>

        <nav className="xsb-nav">
          <div className="xsb-section">Contenido</div>

          <button
            className={`xsb-item${activePage === 'modules' ? ' xsb-active' : ''}`}
            onClick={() => router.push('/expositor')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 6h8M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Mis módulos
          </button>

          <div className="xsb-section">Acceso</div>

          <button
            className="xsb-item"
            onClick={() => router.push('/dashboard')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="7" height="7" rx="2" fill="currentColor"/>
              <rect x="10" y="1" width="7" height="7" rx="2" fill="currentColor" opacity=".5"/>
              <rect x="1" y="10" width="7" height="7" rx="2" fill="currentColor" opacity=".5"/>
              <rect x="10" y="10" width="7" height="7" rx="2" fill="currentColor" opacity=".5"/>
            </svg>
            Dashboard estudiante
          </button>

          <div className="xsb-divider" />

          <button className="xsb-btn-new" onClick={() => router.push('/expositor/modules/new')}>
            + Nuevo módulo
          </button>
        </nav>

        <div className="xsb-divider" />

        <div className="xsb-user">
          <div className="xsb-avatar">{userInitial}</div>
          <div style={{ minWidth: 0 }}>
            <div className="xsb-user-name">{userName}</div>
            <div className="xsb-user-role">Expositor</div>
          </div>
        </div>

        <div className="xsb-links">
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>
    </>
  )
}
