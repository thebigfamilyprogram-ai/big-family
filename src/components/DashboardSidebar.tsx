'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { m, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/contexts/ThemeContext'

type ActivePage =
  | 'dashboard' | 'leadership-path' | 'global-map'
  | 'projects' | 'team-hub' | 'goals' | 'calendar' | 'settings'
  | 'announcements' | 'feed' | 'stories'

interface Props {
  activePage: ActivePage
  userName?: string
  userInitial?: string
  unreadAnnouncements?: number
}

const PRIMARY_NAV: { label: string; page: ActivePage; href: string; icon: React.ReactNode }[] = [
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
    label: 'Mis Metas', page: 'goals', href: '/dashboard/goals',
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="9" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.5" opacity=".5"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/></svg>,
  },
  {
    label: 'Calendario', page: 'calendar', href: '/dashboard/calendar',
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 7h14M6 1v4M12 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
]

// Comunidad sub-items (collapsible group)
const COMUNIDAD_NAV: { label: string; page: ActivePage; href: string; icon: React.ReactNode }[] = [
  {
    label: 'Anuncios', page: 'announcements', href: '/dashboard/announcements',
    icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L16 5v8l-7 3.5L2 13V5L9 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  },
  {
    label: 'Feed', page: 'feed', href: '/dashboard/feed',
    icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M2 4h14M2 9h10M2 14h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    label: 'Historias', page: 'stories', href: '/success-stories',
    icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2l1.8 4.9H16l-4.1 3 1.5 4.9L9 12l-4.4 2.8 1.5-4.9L2 6.9h5.2L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  },
]

const COMUNIDAD_PAGES: ActivePage[] = ['announcements', 'feed', 'stories']

const BF_LOGO = (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <circle cx="12" cy="5" r="2.4" fill="#C0392B"/>
    <path d="M12 7.5 L20 22 H4 Z" fill="var(--ink)"/>
    <circle cx="5" cy="8" r="1.6" fill="var(--mute)"/>
    <circle cx="19" cy="8" r="1.6" fill="var(--mute)"/>
  </svg>
)

const SETTINGS_ITEM = {
  label: 'Settings', page: 'settings' as ActivePage, href: '/dashboard/settings',
  icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
}

export default function DashboardSidebar({ activePage, userName = '…', userInitial = 'L', unreadAnnouncements = 0 }: Props) {
  const router        = useRouter()
  const supabaseRef   = useRef<ReturnType<typeof createClient> | null>(null)
  const isComunidadActive = COMUNIDAD_PAGES.includes(activePage)
  const [comunidadOpen, setComunidadOpen] = useState(isComunidadActive)
  const { theme, setTheme } = useTheme()

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
        .sb-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;font-size:13.5px;font-weight:500;color:var(--mute);cursor:pointer;transition:all .18s;text-decoration:none;border:none;background:none;width:100%;text-align:left;position:relative;}
        .sb-item:hover{background:var(--line);color:var(--ink);}
        .sb-item.sb-active{background:#C0392B;color:#fff;}
        .sb-item.sb-sub{padding-left:20px;font-size:13px;}
        .sb-divider{height:1px;background:var(--line-soft);margin:12px 8px;transition:background .2s;}
        .sb-group-btn{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;font-size:13.5px;font-weight:500;color:var(--mute);cursor:pointer;transition:all .18s;border:none;background:none;width:100%;text-align:left;}
        .sb-group-btn:hover{background:var(--line);color:var(--ink);}
        .sb-group-btn.sb-group-active{color:var(--ink);}
        .sb-group-label{flex:1;text-align:left;}
        .sb-group-arrow{transition:transform .2s;flex-shrink:0;}
        .sb-group-arrow.open{transform:rotate(180deg);}
        .sb-sub-list{display:flex;flex-direction:column;gap:2px;overflow:hidden;}
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
        .sb-badge{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:#C0392B;color:#fff;border-radius:999px;font-size:9.5px;font-weight:700;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 4px;line-height:1;}
        .sb-item.sb-active .sb-badge{background:#fff;color:#C0392B;}
      `}</style>

      <aside className="sidebar" style={{ width: 260, minWidth: 260, flexShrink: 0 }}>
        <div className="sb-logo">
          {BF_LOGO}
          BIG FAMILY
        </div>

        <nav className="sb-nav">
          {/* Primary nav items */}
          {PRIMARY_NAV.map(item => (
            <button
              key={item.page}
              className={`sb-item ${activePage === item.page ? 'sb-active' : ''}`}
              onClick={() => router.push(item.href)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          {/* Comunidad collapsible group */}
          <div style={{ marginTop: 4 }}>
            <button
              className={`sb-group-btn ${isComunidadActive ? 'sb-group-active' : ''}`}
              onClick={() => setComunidadOpen(o => !o)}
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9a6 6 0 1 0 12 0A6 6 0 0 0 3 9Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="sb-group-label">Comunidad</span>
              {unreadAnnouncements > 0 && !comunidadOpen && (
                <span style={{ background: '#C0392B', color: '#fff', borderRadius: 999, fontSize: 9.5, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>
                  {unreadAnnouncements > 9 ? '9+' : unreadAnnouncements}
                </span>
              )}
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                className={`sb-group-arrow ${comunidadOpen ? 'open' : ''}`}
              >
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <AnimatePresence initial={false}>
              {comunidadOpen && (
                <m.div
                  key="comunidad"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="sb-sub-list" style={{ paddingTop: 2 }}>
                    {COMUNIDAD_NAV.map(item => (
                      <button
                        key={item.page}
                        className={`sb-item sb-sub ${activePage === item.page ? 'sb-active' : ''}`}
                        onClick={() => router.push(item.href)}
                      >
                        {item.icon}
                        {item.label}
                        {item.page === 'announcements' && unreadAnnouncements > 0 && (
                          <span className="sb-badge">{unreadAnnouncements > 9 ? '9+' : unreadAnnouncements}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Settings at bottom */}
          <button
            className={`sb-item ${activePage === 'settings' ? 'sb-active' : ''}`}
            onClick={() => router.push(SETTINGS_ITEM.href)}
          >
            {SETTINGS_ITEM.icon}
            {SETTINGS_ITEM.label}
          </button>
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
          <span style={{ color: 'var(--line)' }}>·</span>
          <button
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', transition: 'color .15s', padding: 0, borderRadius: 8 }}
          >
            {theme === 'dark'
              ? <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11A5.5 5.5 0 0 1 8 2.5zM8 4a4 4 0 1 0 0 8A4 4 0 0 0 8 4z"/></svg>
              : <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>
            }
          </button>
        </div>
      </aside>
    </>
  )
}
