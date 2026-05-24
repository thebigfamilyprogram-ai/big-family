'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

type NavItem = { label: string; href: string; icon: React.ReactNode }

const PRINCIPAL: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/coordinator',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" opacity=".5"/><rect x="1" y="9" width="6" height="6" rx="1.5" opacity=".5"/><rect x="9" y="9" width="6" height="6" rx="1.5" opacity=".5"/></svg>,
  },
  {
    label: 'Proyectos',
    href: '/coordinator/projects',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="10" rx="2"/><path d="M5 7h6M5 10h4"/></svg>,
  },
  {
    label: 'Módulos',
    href: '/coordinator/modules',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z"/></svg>,
  },
]

const COMUNIDAD: NavItem[] = [
  {
    label: 'Feed',
    href: '/dashboard/feed',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="3" cy="13" r="1"/><path d="M2 8.5C5.5 8.5 7.5 10.5 7.5 14"/><path d="M2 4C7 4 12 9 12 14"/></svg>,
  },
  {
    label: 'Historias',
    href: '/coordinator/success-stories',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2l1.8 3.6 4 .6-2.9 2.8.7 4L8 11l-3.6 1.9.7-4L2.2 6.2l4-.6L8 2z"/></svg>,
  },
  {
    label: 'Anuncios',
    href: '/coordinator/announcements',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h10l1 5H2L3 6z"/><path d="M6 11v2M10 11v2"/><path d="M5 6V4a3 3 0 0 1 6 0v2"/></svg>,
  },
]

const GESTION: NavItem[] = [
  {
    label: 'Estudiantes',
    href: '/coordinator',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="2.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>,
  },
  {
    label: 'Calendario',
    href: '/coordinator/calendar',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1v3M11 1v3M2 7h12"/></svg>,
  },
  {
    label: 'Reportes',
    href: '/coordinator/report',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="1" width="10" height="14" rx="2"/><path d="M6 5h4M6 8h4M6 11h2"/></svg>,
  },
  {
    label: 'Configuración',
    href: '/dashboard/settings',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/></svg>,
  },
]

const SECTIONS = [
  { key: 'principal', label: 'Principal', items: PRINCIPAL },
  { key: 'comunidad', label: 'Comunidad', items: COMUNIDAD },
  { key: 'gestion',   label: 'Gestión',   items: GESTION },
]

interface Props {
  userName?: string
  userInitial?: string
  schoolName?: string
}

export default function CoordinatorSidebar({ userName = '…', userInitial = 'C', schoolName = 'Mi Colegio' }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const getInitialOpen = (key: string) => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(`coord-sb-${key}`)
    return stored === null ? true : stored === 'open'
  }

  const [open, setOpen] = useState<Record<string, boolean>>({
    principal: true,
    comunidad: true,
    gestion:   true,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setOpen({
      principal: getInitialOpen('principal'),
      comunidad: getInitialOpen('comunidad'),
      gestion:   getInitialOpen('gestion'),
    })
  }, [])

  function toggleSection(key: string) {
    setOpen(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(`coord-sb-${key}`, next[key] ? 'open' : 'closed')
      return next
    })
  }

  function isActive(href: string) {
    if (href === '/coordinator') return pathname === '/coordinator'
    return pathname.startsWith(href)
  }

  return (
    <>
      <style>{`
        .coord-sb{width:220px;min-width:220px;height:100vh;position:sticky;top:0;display:flex;flex-direction:column;background:var(--card-bg);border-right:1px solid var(--card-border);overflow-y:auto;overflow-x:hidden;z-index:20;flex-shrink:0;}
        .coord-sb__brand{display:flex;align-items:center;gap:10px;padding:20px 16px 16px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:var(--ink);border-bottom:1px solid var(--card-border);flex-shrink:0;}
        .coord-sb__school{font-size:11px;font-weight:600;color:var(--mute);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .coord-sb__nav{flex:1;padding:8px 8px;display:flex;flex-direction:column;gap:2px;}
        .coord-sb__section-header{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;cursor:pointer;border-radius:6px;transition:background .15s;user-select:none;margin-top:8px;}
        .coord-sb__section-header:first-of-type{margin-top:0;}
        .coord-sb__section-header:hover{background:var(--bg-2);}
        .coord-sb__section-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);}
        .coord-sb__section-arrow{color:var(--mute);transition:transform .25s;flex-shrink:0;}
        .coord-sb__section-items{overflow:hidden;transition:max-height .25s ease;display:flex;flex-direction:column;gap:1px;}
        .coord-sb__item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;border:none;background:none;cursor:pointer;width:100%;text-align:left;font-family:"Satoshi",sans-serif;font-size:13px;color:var(--mute);transition:color .15s,background .15s;border-left:2px solid transparent;}
        .coord-sb__item:hover{color:var(--ink);background:var(--bg-2);}
        .coord-sb__item.active{color:var(--ink);background:rgba(192,57,43,.08);border-left-color:#C0392B;font-weight:600;}
        .coord-sb__bottom{padding:12px 8px;border-top:1px solid var(--card-border);display:flex;flex-direction:column;gap:8px;flex-shrink:0;}
        .coord-sb__user{display:flex;align-items:center;gap:10px;padding:6px 8px;}
        .coord-sb__avatar{width:32px;height:32px;border-radius:50%;background:rgba(192,57,43,.15);color:#C0392B;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .coord-sb__username{font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .coord-sb__role{font-size:10.5px;color:var(--mute);letter-spacing:.08em;text-transform:uppercase;}
        .coord-sb__links{display:flex;align-items:center;gap:8px;padding:0 8px;flex-wrap:wrap;}
        .coord-sb__links a,.coord-sb__links button{font-size:11.5px;color:var(--mute);background:none;border:none;cursor:pointer;padding:0;transition:color .15s;font-family:inherit;}
        .coord-sb__links a:hover,.coord-sb__links button:hover{color:#C0392B;}
        .coord-sb__sep{color:var(--line);}
        /* Hamburger */
        .coord-hamburger{display:none;position:fixed;top:14px;left:14px;z-index:50;width:44px;height:44px;border-radius:10px;background:var(--card-bg);border:1px solid var(--card-border);align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.1);}
        .coord-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:30;backdrop-filter:blur(2px);}
        @media(max-width:768px){
          .coord-hamburger{display:flex;}
          .coord-sb{position:fixed;top:0;left:0;height:100vh;z-index:40;transform:translateX(-100%);transition:transform .25s ease;box-shadow:4px 0 20px rgba(0,0,0,.12);}
          .coord-sb.open{transform:translateX(0);}
          .coord-overlay.open{display:block;}
        }
      `}</style>

      {/* Mobile hamburger */}
      <button
        className="coord-hamburger"
        aria-label="Abrir menú"
        onClick={() => setDrawerOpen(true)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2 4.5h14M2 9h14M2 13.5h14"/>
        </svg>
      </button>

      {/* Mobile overlay */}
      <div
        className={`coord-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      <aside className={`coord-sb ${drawerOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="coord-sb__brand">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="rgba(192,57,43,.12)"/>
            <path d="M14 6L17 12H22L18 15.5L19.5 21.5L14 18L8.5 21.5L10 15.5L6 12H11L14 6Z" fill="#C0392B"/>
          </svg>
          <div>
            <div>Big Family</div>
            <div className="coord-sb__school">{schoolName}</div>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="coord-sb__nav">
          {SECTIONS.map(section => (
            <div key={section.key}>
              <div
                className="coord-sb__section-header"
                onClick={() => toggleSection(section.key)}
              >
                <span className="coord-sb__section-label">{section.label}</span>
                <svg
                  className="coord-sb__section-arrow"
                  width="12" height="12" viewBox="0 0 12 12"
                  fill="none" stroke="currentColor" strokeWidth="1.5"
                  style={{ transform: open[section.key] ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                >
                  <path d="M2 4l4 4 4-4"/>
                </svg>
              </div>
              <div
                className="coord-sb__section-items"
                style={{ maxHeight: open[section.key] ? `${section.items.length * 48}px` : '0px' }}
              >
                {section.items.map(item => (
                  <button
                    key={item.href + item.label}
                    className={`coord-sb__item ${isActive(item.href) ? 'active' : ''}`}
                    onClick={() => { router.push(item.href); setDrawerOpen(false) }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="coord-sb__bottom">
          <div className="coord-sb__user">
            <div className="coord-sb__avatar">{userInitial}</div>
            <div>
              <div className="coord-sb__username">{userName}</div>
              <div className="coord-sb__role">Coordinador</div>
            </div>
          </div>
          <div className="coord-sb__links">
            <a href="#">Soporte</a>
            <span className="coord-sb__sep">·</span>
            <button
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark'
                ? <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12a4 4 0 1 0 0-8A4 4 0 0 0 8 12zm0 1.5A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 0 11zM8 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V1.75A.75.75 0 0 1 8 1zm0 12a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13z"/></svg>
                : <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>
              }
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
