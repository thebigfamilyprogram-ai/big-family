'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppSidebarProps {
  role: 'student' | 'coordinator' | 'admin'
  width?: number
  userName?: string
  userInitial?: string
  schoolName?: string
  activeTab?: string
  onTabChange?: (tab: string) => void
  unreadAnnouncements?: number
}

type NavItem = {
  label: string
  icon: React.ReactNode
  badge?: number
  href?: string
  tab?: string
}

type Section = { key: string; label: string; items: NavItem[] }

// ── Nav definitions per role ──────────────────────────────────────────────────

function getNav(role: 'student' | 'coordinator' | 'admin', unread: number): Section[] {
  if (role === 'student') return [
    {
      key: 'principal', label: 'Principal', items: [
        { label: 'Dashboard',       href: '/dashboard',                 icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" opacity=".5"/><rect x="1" y="9" width="6" height="6" rx="1.5" opacity=".5"/><rect x="9" y="9" width="6" height="6" rx="1.5" opacity=".5"/></svg> },
        { label: 'Leadership Path', href: '/dashboard/leadership-path', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5L8 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
        { label: 'Global Map',      href: '/dashboard/global-map',      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M1.5 8h13M8 1.5c-2 1.8-3.5 4-3.5 6.5s1.5 4.7 3.5 6.5M8 1.5c2 1.8 3.5 4 3.5 6.5s-1.5 4.7-3.5 6.5" stroke="currentColor" strokeWidth="1.4"/></svg> },
        { label: 'Proyectos',       href: '/dashboard/projects',        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5C2 4 2.9 3 4 3h3l1.5 2H13c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V5Z" stroke="currentColor" strokeWidth="1.4"/></svg> },
        { label: 'Team Hub',        href: '/dashboard/team-hub',        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
        { label: 'Mis Metas',       href: '/dashboard/goals',           icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4" opacity=".5"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg> },
        { label: 'Calendario',      href: '/dashboard/calendar',        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 7h12M5.5 1v3M10.5 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
        { label: 'Configuración',   href: '/dashboard/settings',        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
      ],
    },
    {
      key: 'comunidad', label: 'Comunidad', items: [
        { label: 'Anuncios',  href: '/dashboard/announcements', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14 5v6l-6 3.5L2 11V5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>, badge: unread || undefined },
        { label: 'Feed',      href: '/dashboard/feed',          icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h9M2 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
        { label: 'Historias', href: '/success-stories',         icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.6 4.4H14l-3.6 2.6 1.4 4.4L8 11l-3.8 2.4 1.4-4.4L2 6.4h4.4L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
      ],
    },
  ]

  if (role === 'coordinator') return [
    {
      key: 'principal', label: 'Principal', items: [
        { label: 'Dashboard', href: '/coordinator',          icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" opacity=".5"/><rect x="1" y="9" width="6" height="6" rx="1.5" opacity=".5"/><rect x="9" y="9" width="6" height="6" rx="1.5" opacity=".5"/></svg> },
        { label: 'Proyectos', href: '/coordinator/projects', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
        { label: 'Módulos',   href: '/coordinator/modules',  icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14 5v6L8 14.5 2 11V5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
      ],
    },
    {
      key: 'comunidad', label: 'Comunidad', items: [
        { label: 'Feed',      href: '/coordinator/feed',            icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="13" r="1" fill="currentColor"/><path d="M2 9C5.5 9 7 11 7 14M2 5c5 0 9 4 9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
        { label: 'Historias', href: '/coordinator/success-stories', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.6 4.4H14l-3.6 2.6 1.4 4.4L8 11l-3.8 2.4 1.4-4.4L2 6.4h4.4L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
        { label: 'Anuncios',  href: '/coordinator/announcements',   icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 6h10l1 5H2L3 6z" stroke="currentColor" strokeWidth="1.4"/><path d="M6 11v2M10 11v2M5 6V4a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
      ],
    },
    {
      key: 'gestion', label: 'Gestión', items: [
        { label: 'Estudiantes',   href: '/coordinator',          icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
        { label: 'Calendario',    href: '/coordinator/calendar', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 7h12M5.5 1v3M10.5 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
        { label: 'Reportes',      href: '/coordinator/report',   icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
        { label: 'Configuración', href: '/coordinator/settings', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
      ],
    },
  ]

  // admin
  return [
    {
      key: 'panel', label: 'Panel', items: [
        { label: 'Estadísticas', tab: 'stats',       icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/></svg> },
        { label: 'Usuarios',     tab: 'users',       icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M11 7c1.1 0 2 .9 2 2M13 9c1.1 0 2 .9 2 2v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
        { label: 'Proyectos',    tab: 'projects',    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5C2 4 2.9 3 4 3h3l1.5 2H13c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V5Z" stroke="currentColor" strokeWidth="1.4"/></svg> },
        { label: 'Evaluaciones', tab: 'evaluations', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M6 5l1.5 1.5L10 4M6 9l1.5 1.5L10 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        { label: 'Metas',        tab: 'goals',       icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4" opacity=".5"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg> },
      ],
    },
  ]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppSidebar({
  role,
  width = 260,
  userName = '…',
  userInitial = 'U',
  schoolName,
  activeTab,
  onTabChange,
  unreadAnnouncements = 0,
}: AppSidebarProps) {
  const router      = useRouter()
  const pathname    = usePathname()
  const { theme, setTheme } = useTheme()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const sections = getNav(role, unreadAnnouncements)
  const defaultOpen = Object.fromEntries(sections.map(s => [s.key, true]))
  const [openSec, setOpenSec] = useState<Record<string, boolean>>(defaultOpen)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = Object.fromEntries(
      sections.map(s => {
        const v = localStorage.getItem(`app-sb-${role}-${s.key}`)
        return [s.key, v === null ? true : v === 'open']
      })
    )
    setOpenSec(stored)
  }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSection(key: string) {
    setOpenSec(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(`app-sb-${role}-${key}`, next[key] ? 'open' : 'closed')
      return next
    })
  }

  function isActive(item: NavItem): boolean {
    if (item.tab !== undefined) return activeTab === item.tab
    if (!item.href) return false
    // Exact match for root dashboard routes to prevent false positives
    if (item.href === '/dashboard' || item.href === '/coordinator') return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  function handleItemClick(item: NavItem) {
    if (item.tab !== undefined) {
      onTabChange?.(item.tab)
    } else if (item.href) {
      router.push(item.href)
    }
    setDrawerOpen(false)
  }

  async function handleLogout() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  const roleLabel =
    role === 'student' ? 'Estudiante' :
    role === 'coordinator' ? 'Coordinador' : 'Administrador'

  const multiSection = sections.length > 1

  return (
    <>
      <style>{`
        .app-sb{width:${width}px;min-width:${width}px;height:100vh;position:sticky;top:0;display:flex;flex-direction:column;background:var(--card-bg);border-right:1px solid var(--card-border,rgba(13,13,13,.07));overflow-y:auto;overflow-x:hidden;z-index:20;flex-shrink:0;font-family:"Satoshi",sans-serif;}
        .app-sb__brand{display:flex;align-items:center;gap:10px;padding:20px 16px 16px;font-weight:700;font-size:15px;color:var(--ink);border-bottom:1px solid var(--card-border,rgba(13,13,13,.07));flex-shrink:0;}
        .app-sb__school{font-size:11px;font-weight:500;color:var(--mute);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .app-sb__nav{flex:1;padding:8px;display:flex;flex-direction:column;gap:1px;overflow-y:auto;}
        .app-sb__section{display:flex;flex-direction:column;}
        .app-sb__section-hd{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;cursor:pointer;border-radius:6px;user-select:none;margin-top:8px;transition:background .15s;}
        .app-sb__section-hd:hover{background:var(--bg-2);}
        .app-sb__section:first-child .app-sb__section-hd{margin-top:2px;}
        .app-sb__section-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);}
        .app-sb__items{overflow:hidden;transition:max-height .25s ease;display:flex;flex-direction:column;gap:1px;}
        .app-sb__item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;border:none;border-left:2px solid transparent;background:none;cursor:pointer;width:100%;text-align:left;font-family:"Satoshi",sans-serif;font-size:13px;color:var(--mute);transition:color .15s,background .15s,border-left-color .15s;}
        .app-sb__item:hover{color:var(--ink);background:var(--bg-2);}
        .app-sb__item--active{color:var(--ink);background:rgba(192,57,43,.08);border-left-color:var(--accent,#C0392B);font-weight:600;}
        .app-sb__item span{flex:1;text-align:left;}
        .app-sb__badge{background:var(--accent,#C0392B);color:#fff;border-radius:999px;font-size:9.5px;font-weight:700;min-width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;flex-shrink:0;}
        .app-sb__new{margin:10px 0 4px;padding:11px 12px;background:rgba(192,57,43,.07);color:var(--accent,#C0392B);border:1px solid rgba(192,57,43,.18);border-radius:10px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:12.5px;cursor:pointer;transition:background .2s,color .2s,border-color .2s;text-align:left;width:100%;}
        .app-sb__new:hover{background:var(--accent,#C0392B);color:#fff;border-color:var(--accent,#C0392B);}
        .app-sb__bottom{padding:12px 8px;border-top:1px solid var(--card-border,rgba(13,13,13,.07));display:flex;flex-direction:column;gap:6px;flex-shrink:0;}
        .app-sb__user{display:flex;align-items:center;gap:10px;padding:4px 6px;}
        .app-sb__avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#C0392B,#922b21);color:#fff;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .app-sb__username{font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .app-sb__role-label{font-size:10px;color:var(--mute);letter-spacing:.06em;text-transform:uppercase;margin-top:1px;}
        .app-sb__links{display:flex;align-items:center;gap:6px;padding:0 6px;flex-wrap:wrap;}
        .app-sb__links button,.app-sb__links a{font-size:11.5px;color:var(--mute);background:none;border:none;cursor:pointer;padding:0;transition:color .15s;font-family:inherit;text-decoration:none;}
        .app-sb__links button:hover,.app-sb__links a:hover{color:var(--accent,#C0392B);}
        .app-sb__links span{color:var(--mute);opacity:.4;}
        .app-hamburger{display:none;position:fixed;top:14px;left:14px;z-index:50;width:44px;height:44px;border-radius:10px;background:var(--card-bg);border:1px solid var(--card-border,rgba(13,13,13,.07));align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.1);}
        .app-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:30;backdrop-filter:blur(2px);}
        @media(max-width:768px){
          .app-hamburger{display:flex;}
          .app-sb{position:fixed;top:0;left:0;height:100vh;z-index:40;transform:translateX(-100%);transition:transform .25s ease;box-shadow:4px 0 20px rgba(0,0,0,.12);}
          .app-sb.open{transform:translateX(0);}
          .app-overlay.open{display:block;}
        }
      `}</style>

      {/* Mobile hamburger */}
      <button className="app-hamburger" aria-label="Abrir menú" onClick={() => setDrawerOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2 4.5h14M2 9h14M2 13.5h14"/>
        </svg>
      </button>

      {/* Mobile overlay */}
      <div className={`app-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />

      <aside className={`app-sb${drawerOpen ? ' open' : ''}`}>
        {/* Brand */}
        <div className="app-sb__brand">
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="5" r="2.4" fill="var(--accent,#C0392B)"/>
            <path d="M12 7.5 L20 22 H4 Z" fill="var(--ink,#0D0D0D)"/>
          </svg>
          <div>
            <div>Big Family</div>
            {schoolName && <div className="app-sb__school">{schoolName}</div>}
          </div>
        </div>

        {/* Nav */}
        <nav className="app-sb__nav">
          {sections.map(section => (
            <div key={section.key} className="app-sb__section">
              {multiSection && (
                <div className="app-sb__section-hd" onClick={() => toggleSection(section.key)}>
                  <span className="app-sb__section-label">{section.label}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                    style={{ flexShrink: 0, transition: 'transform .2s', transform: openSec[section.key] !== false ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                  >
                    <path d="M2 4l4 4 4-4"/>
                  </svg>
                </div>
              )}
              <div
                className="app-sb__items"
                style={{ maxHeight: openSec[section.key] !== false ? `${section.items.length * 44}px` : '0px' }}
              >
                {section.items.map((item, idx) => (
                  <button
                    key={idx}
                    className={`app-sb__item${isActive(item) ? ' app-sb__item--active' : ''}`}
                    onClick={() => handleItemClick(item)}
                    type="button"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {!!item.badge && (
                      <span className="app-sb__badge">{item.badge > 9 ? '9+' : item.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {role === 'student' && (
            <button className="app-sb__new" onClick={() => { router.push('/dashboard/projects/new'); setDrawerOpen(false) }}>
              + Nuevo Proyecto
            </button>
          )}
        </nav>

        {/* Bottom */}
        <div className="app-sb__bottom">
          <div className="app-sb__user">
            <div className="app-sb__avatar">{userInitial}</div>
            <div style={{ minWidth: 0 }}>
              <div className="app-sb__username">{userName}</div>
              <div className="app-sb__role-label">{roleLabel}</div>
            </div>
          </div>
          <div className="app-sb__links">
            <button onClick={handleLogout}>Cerrar sesión</button>
            <span>·</span>
            <button
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              style={{ minWidth: 40, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark'
                ? <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 1.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/></svg>
                : <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>
              }
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
