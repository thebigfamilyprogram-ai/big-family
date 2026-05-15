'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type ActivePage = 'dashboard' | 'leadership-path' | 'global-map' | 'projects' | 'team-hub' | 'settings'

interface Props {
  activePage: ActivePage
  userName?: string
  userInitial?: string
}

const NAV_ITEMS: { label: string; page: ActivePage; href: string; icon: React.ReactNode }[] = [
  {
    label: 'Dashboard', page: 'dashboard', href: '/dashboard',
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="2" fill="currentColor"/><rect x="10" y="1" width="7" height="7" rx="2" fill="currentColor" opacity=".5"/><rect x="1" y="10" width="7" height="7" rx="2" fill="currentColor" opacity=".5"/><rect x="10" y="10" width="7" height="7" rx="2" fill="currentColor" opacity=".5"/></svg>,
  },
  {
    label: 'Leadership Path', page: 'leadership-path', href: '/dashboard/leadership-path',
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L11.5 7H16L12.2 10.2L13.6 15.2L9 12.3L4.4 15.2L5.8 10.2L2 7H6.5L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  },
  {
    label: 'Global Map', page: 'global-map', href: '/dashboard/global-map',
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1.5 9h15M9 1.5c-2.5 2-4 4.5-4 7.5s1.5 5.5 4 7.5M9 1.5c2.5 2 4 4.5 4 7.5s-1.5 5.5-4 7.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    label: 'Proyectos', page: 'projects', href: '/dashboard/projects',
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 5.5C2 4.4 2.9 3.5 4 3.5H7.5L9 5.5H14C15.1 5.5 16 6.4 16 7.5V13C16 14.1 15.1 15 14 15H4C2.9 15 2 14.1 2 13V5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  },
  {
    label: 'Team Hub', page: 'team-hub', href: '/dashboard/team-hub',
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    label: 'Settings', page: 'settings', href: '/dashboard/settings',
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
]

const BF_LOGO = (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <circle cx="12" cy="5" r="2.4" fill="#C0392B"/>
    <path d="M12 7.5 L20 22 H4 Z" fill="var(--ink)"/>
    <circle cx="5" cy="8" r="1.6" fill="var(--mute)"/>
    <circle cx="19" cy="8" r="1.6" fill="var(--mute)"/>
  </svg>
)

export default function DashboardSidebar({ activePage, userName = '…', userInitial = 'L' }: Props) {
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
        .sidebar{background:var(--card-bg);border-right:1px solid var(--line);display:flex;flex-direction:column;padding:28px 16px 24px;position:sticky;top:0;height:100vh;overflow-y:auto;transition:background .2s,border-color .2s;}
        .sb-logo{font-family:"Satoshi",sans-serif;font-weight:900;font-size:15px;letter-spacing:.12em;color:var(--ink);padding:0 8px;margin-bottom:32px;display:flex;align-items:center;gap:9px;transition:color .2s;}
        .sb-nav{display:flex;flex-direction:column;gap:3px;flex:1;}
        .sb-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;font-size:13.5px;font-weight:500;color:var(--mute);cursor:pointer;transition:all .18s;text-decoration:none;border:none;background:none;width:100%;text-align:left;}
        .sb-item:hover{background:var(--line);color:var(--ink);}
        .sb-item.sb-active{background:#C0392B;color:#fff;}
        .sb-divider{height:1px;background:var(--line-soft);margin:16px 8px;transition:background .2s;}
        .sb-btn-new{width:100%;padding:12px;background:#C0392B;color:#fff;border:none;border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;letter-spacing:.04em;cursor:pointer;transition:background .2s;margin-top:20px;}
        .sb-btn-new:hover{background:#a93226;}
        .sb-user{display:flex;align-items:center;gap:10px;padding:12px 8px 0;}
        .sb-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#C0392B 0%,#8B1A1A 100%);color:#fff;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .sb-user-info{min-width:0;}
        .sb-user-name{font-size:12.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .2s;}
        .sb-user-role{font-size:10.5px;color:var(--mute);margin-top:1px;transition:color .2s;}
        .sb-links{display:flex;gap:12px;padding:12px 8px 0;font-size:11.5px;}
        .sb-links a,.sb-links button{color:var(--mute);text-decoration:none;background:none;border:none;cursor:pointer;font-size:11.5px;padding:0;transition:color .15s;}
        .sb-links a:hover,.sb-links button:hover{color:#C0392B;}
      `}</style>

      <aside className="sidebar" style={{ width: 260, minWidth: 260, flexShrink: 0 }}>
        <div className="sb-logo">
          {BF_LOGO}
          BIG FAMILY
        </div>

        <nav className="sb-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.page}
              className={`sb-item ${activePage === item.page ? 'sb-active' : ''}`}
              onClick={() => router.push(item.href)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sb-divider" />

        <button className="sb-btn-new">+ New Initiative</button>

        <div className="sb-divider" />

        <div className="sb-user">
          <div className="sb-avatar">{userInitial}</div>
          <div className="sb-user-info">
            <div className="sb-user-name">{userName}</div>
            <div className="sb-user-role">YOUTH LEADER · Level 04</div>
          </div>
        </div>

        <div className="sb-links">
          <a href="#">Support</a>
          <span style={{ color: 'var(--line)' }}>·</span>
          <button onClick={handleLogout}>Log Out</button>
        </div>
      </aside>
    </>
  )
}
