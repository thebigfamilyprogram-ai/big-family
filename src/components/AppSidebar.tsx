'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { m, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import { useTheme } from '@/contexts/ThemeContext'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppSidebarProps {
  role: 'student' | 'coordinator' | 'admin'
  roleLabelOverride?: string
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
  badgeText?: string
  badgeColor?: string
  href?: string
  tab?: string
  external?: boolean  // opens in new tab
}

type Section = { key: string; label: string; items: NavItem[] }

// ── Icon library — all outlined, strokeWidth 1.4 ─────────────────────────────

const I = {
  dashboard: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" opacity=".45"/><rect x="2" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" opacity=".45"/><rect x="9" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" opacity=".45"/></svg>,
  star:      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5L8 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  globe:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M1.5 8h13M8 1.5c-2 1.8-3.5 4-3.5 6.5s1.5 4.7 3.5 6.5M8 1.5c2 1.8 3.5 4 3.5 6.5s-1.5 4.7-3.5 6.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
  folder:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5C2 4 2.9 3 4 3h3l1.5 2H13c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V5Z" stroke="currentColor" strokeWidth="1.4"/></svg>,
  users:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  target:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4" opacity=".5"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>,
  calendar:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 7h12M5.5 1v3M10.5 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  settings:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  bell:      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14 5v6l-6 3.5L2 11V5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  feed:      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h9M2 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  stories:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.6 4.4H14l-3.6 2.6 1.4 4.4L8 11l-3.8 2.4 1.4-4.4L2 6.4h4.4L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  doc:       <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  hexagon:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14 5v6L8 14.5 2 11V5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  rss:       <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="13" r="1" fill="currentColor"/><path d="M2 9C5.5 9 7 11 7 14M2 5c5 0 9 4 9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  news:      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  announce:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 6h10l1 5H2L3 6z" stroke="currentColor" strokeWidth="1.4"/><path d="M6 11v2M10 11v2M5 6V4a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  report:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  checklist: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M6 5l1.5 1.5L10 4M6 9l1.5 1.5L10 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  barChart:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 13V8M6 13V4M10 13V6M14 13V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  key:       <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9 8h5M12 7v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  building:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M6 14V9h4v5M2 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  compass:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 2v1M8 13v1M2 8h1M13 8h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M10.5 5.5L9 9l-3.5 1.5L7 7l3.5-1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  portcard:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="5.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8.5 7h4M8.5 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  moon:      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

// ── Nav definitions per role ──────────────────────────────────────────────────

// Kashi "Nuevo" badge expires 30 days from launch (2026-06-03)
const KASHI_NEW_UNTIL = new Date('2026-07-03').getTime()
const kashiIsNew = Date.now() < KASHI_NEW_UNTIL

function getNav(
  role: 'student' | 'coordinator' | 'admin',
  unread: number,
  ventureCompleted?: boolean | null,
  portfolioUsername?: string | null,
  portfolioPublic?: boolean | null,
): Section[] {
  if (role === 'student') return [
    {
      key: 'principal', label: 'Principal', items: [
        { label: 'Dashboard',       href: '/dashboard',                 icon: I.dashboard },
        { label: 'Leadership Path', href: '/dashboard/leadership-path', icon: I.star      },
        { label: 'Global Map',      href: '/dashboard/global-map',      icon: I.globe     },
        { label: 'Proyectos',       href: '/dashboard/projects',        icon: I.folder    },
        { label: 'Team Hub',        href: '/dashboard/team-hub',        icon: I.users     },
        { label: 'Mis Metas',       href: '/dashboard/goals',           icon: I.target    },
        {
          label: 'Kashi',
          href: '/dashboard/kashi',
          icon: I.moon,
          ...(kashiIsNew ? { badgeText: 'Nuevo', badgeColor: 'var(--accent-teal,#0F7B6C)' } : {}),
        },
        {
          label: 'Great Venture',
          href: '/dashboard/great-venture',
          icon: I.compass,
          ...(ventureCompleted === true
            ? { badgeText: '✓', badgeColor: '#22c55e' }
            : ventureCompleted === false
              ? { badgeText: 'Pendiente', badgeColor: 'var(--accent-amber,#D4821A)' }
              : {}),
        },
        {
          label: 'Mi Portafolio',
          href: portfolioUsername ? `/p/${portfolioUsername}` : '/dashboard/settings',
          icon: I.portcard,
          external: !!portfolioUsername,
          ...(portfolioUsername
            ? portfolioPublic === true
              ? { badgeText: 'Público', badgeColor: 'var(--accent-teal,#0F7B6C)' }
              : { badgeText: 'Privado', badgeColor: 'var(--mute,#6B6B6B)' }
            : { badgeText: 'Configurar', badgeColor: 'var(--accent-amber,#D4821A)' }
          ),
        },
        { label: 'Calendario',      href: '/dashboard/calendar',        icon: I.calendar  },
        { label: 'Configuración',   href: '/dashboard/settings',        icon: I.settings  },
      ],
    },
    {
      key: 'comunidad', label: 'Comunidad', items: [
        { label: 'Anuncios',  href: '/dashboard/announcements', icon: I.bell,    badge: unread || undefined },
        { label: 'Feed',      href: '/dashboard/feed',          icon: I.feed     },
        { label: 'Historias', href: '/success-stories',         icon: I.stories  },
      ],
    },
  ]

  if (role === 'coordinator') return [
    {
      key: 'principal', label: 'Principal', items: [
        { label: 'Dashboard', href: '/coordinator',          icon: I.dashboard },
        { label: 'Proyectos', href: '/coordinator/projects', icon: I.doc       },
        { label: 'Módulos',   href: '/coordinator/modules',  icon: I.hexagon   },
      ],
    },
    {
      key: 'comunidad', label: 'Comunidad', items: [
        { label: 'Feed',      href: '/coordinator/feed',            icon: I.rss      },
        { label: 'Noticias',  href: '/coordinator/news',            icon: I.news     },
        { label: 'Historias', href: '/coordinator/success-stories', icon: I.stories  },
        { label: 'Anuncios',  href: '/coordinator/announcements',   icon: I.announce },
      ],
    },
    {
      key: 'gestion', label: 'Gestión', items: [
        { label: 'Datos',         href: '/coordinator/datos',    icon: I.barChart },
        { label: 'Calendario',    href: '/coordinator/calendar', icon: I.calendar },
        { label: 'Reportes',      href: '/coordinator/report',   icon: I.report   },
        { label: 'Configuración', href: '/coordinator/settings', icon: I.settings },
      ],
    },
  ]

  // admin
  return [
    {
      key: 'panel', label: 'Panel', items: [
        { label: 'Estadísticas', tab: 'stats',       icon: I.dashboard  },
        { label: 'Usuarios',     tab: 'users',       icon: I.users      },
        { label: 'Proyectos',    tab: 'projects',    icon: I.folder     },
        { label: 'Evaluaciones', tab: 'evaluations', icon: I.checklist  },
        { label: 'Metas',        tab: 'goals',       icon: I.target     },
        { label: 'Códigos',      tab: 'codes',       icon: I.key        },
        { label: 'Colegios',     tab: 'schools',     icon: I.building   },
      ],
    },
    {
      key: 'analitica', label: 'Analítica', items: [
        { label: 'Datos', href: '/admin/datos', icon: I.barChart },
      ],
    },
  ]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppSidebar({
  role,
  roleLabelOverride,
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
  const [drawerOpen,        setDrawerOpen]        = useState(false)
  const [ventureCompleted,  setVentureCompleted]  = useState<boolean | null>(null)
  const [portfolioUsername, setPortfolioUsername] = useState<string | null>(null)
  const [portfolioPublic,   setPortfolioPublic]   = useState<boolean | null>(null)

  // Load venture + portfolio status for students (single effect, parallel queries)
  useEffect(() => {
    if (role !== 'student') return
    async function checkStudentData() {
      // MOCK_MODE: use mock data directly, skip Supabase
      if (MOCK_MODE) {
        setVentureCompleted(true)
        setPortfolioUsername(MOCK.currentUser.username)
        setPortfolioPublic(MOCK.currentUser.portfolio_public)
        return
      }

      if (!supabaseRef.current) supabaseRef.current = createClient()
      const sb = supabaseRef.current
      if (!sb) return
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const [{ data: gv }, { data: prof }] = await Promise.all([
        sb.from('great_ventures').select('meta_nucleo, planes').eq('user_id', user.id).maybeSingle(),
        sb.from('profiles').select('username, portfolio_public').eq('id', user.id).maybeSingle(),
      ])

      const hasContent = !!(gv?.meta_nucleo?.trim()) && Array.isArray(gv?.planes) && (gv.planes as unknown[]).length > 0
      setVentureCompleted(gv ? hasContent : false)

      if (prof) {
        setPortfolioUsername((prof as { username?: string | null }).username ?? null)
        setPortfolioPublic((prof as { portfolio_public?: boolean | null }).portfolio_public ?? null)
      }
    }
    checkStudentData()
  }, [role])

  const sections    = getNav(role, unreadAnnouncements, ventureCompleted, portfolioUsername, portfolioPublic)
  const defaultOpen = Object.fromEntries(sections.map(s => [s.key, true]))

  // useEffect reads localStorage to avoid SSR/client hydration mismatch
  const [openSec, setOpenSec] = useState<Record<string, boolean>>(defaultOpen)
  useEffect(() => {
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
    if (item.href === '/dashboard' || item.href === '/coordinator') return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  function handleItemClick(item: NavItem) {
    if (item.tab !== undefined) {
      onTabChange?.(item.tab)
    } else if (item.href) {
      if (item.external) {
        window.open(item.href, '_blank', 'noreferrer')
      } else {
        router.push(item.href)
      }
    }
    setDrawerOpen(false)
  }

  async function handleLogout() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  const roleLabel = roleLabelOverride ?? (
    role === 'student' ? 'Estudiante' :
    role === 'coordinator' ? 'Coordinador' : 'Administrador'
  )

  const multiSection = sections.length > 1

  return (
    <>
      <style>{`
        /* ── Sidebar shell ─────────────────────────────────────────────── */
        .app-sb {
          width: ${width}px; min-width: ${width}px; height: 100dvh;
          position: sticky; top: 0;
          display: flex; flex-direction: column;
          background: var(--card-bg);
          border-right: 1px solid var(--line-strong, rgba(13,13,13,.12));
          overflow: hidden;
          z-index: 20; flex-shrink: 0;
          font-family: "Satoshi", sans-serif;
        }
        /* ── Brand ────────────────────────────────────────────────────── */
        .app-sb__brand {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 16px 16px;
          font-weight: 700; font-size: 15px; color: var(--ink);
          border-bottom: 1px solid var(--line, rgba(13,13,13,.10));
          flex-shrink: 0;
        }
        .app-sb__school {
          font-size: 11px; font-weight: 500; color: var(--mute);
          margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        /* ── Nav (scrollable, bottom stays fixed) ─────────────────────── */
        .app-sb__nav {
          flex: 1; padding: 8px;
          display: flex; flex-direction: column; gap: 1px;
          overflow-y: auto; min-height: 0;
        }
        /* ── Section ─────────────────────────────────────────────────── */
        .app-sb__section { display: flex; flex-direction: column; }
        .app-sb__section-hd {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 8px 4px;
          background: none; border: none; width: 100%; text-align: left;
          cursor: pointer; border-radius: 6px; user-select: none; margin-top: 10px;
          font-family: "Satoshi", sans-serif;
          transition: background .15s cubic-bezier(0.22,1,0.36,1);
        }
        .app-sb__section-hd:hover  { background: rgba(13,13,13,.05); }
        .app-sb__section-hd:focus-visible { outline: 2px solid var(--accent,#C0392B); outline-offset: 2px; border-radius: 6px; }
        .app-sb__section:first-child .app-sb__section-hd { margin-top: 4px; }
        .app-sb__section-label {
          font-size: 11px; font-weight: 700; letter-spacing: .14em;
          text-transform: uppercase; color: var(--mute);
        }
        .app-sb__items { display: flex; flex-direction: column; gap: 1px; }
        /* ── Nav item ────────────────────────────────────────────────── */
        .app-sb__item {
          position: relative; display: flex; align-items: center; gap: 9px;
          padding: 8px 10px; border-radius: 8px;
          border: none; background: none; cursor: pointer;
          width: 100%; text-align: left;
          font-family: "Satoshi", sans-serif; font-size: 12.5px; color: var(--mute);
          transition: color .18s cubic-bezier(0.22,1,0.36,1), background .18s cubic-bezier(0.22,1,0.36,1);
          min-height: 36px;
        }
        .app-sb__item:hover        { color: var(--ink); background: rgba(13,13,13,.05); }
        .app-sb__item:active       { transform: scale(0.98); }
        .app-sb__item:focus-visible { outline: 2px solid var(--accent,#C0392B); outline-offset: 2px; border-radius: 8px; }
        .app-sb__item--active      { color: var(--accent,#C0392B); background: rgba(192,57,43,.08); font-weight: 600; }
        .app-sb__item span         { flex: 1; text-align: left; }
        /* ── Badge ───────────────────────────────────────────────────── */
        .app-sb__badge {
          background: var(--accent,#C0392B); color: #fff; border-radius: 999px;
          font-size: 9.5px; font-weight: 700; font-variant-numeric: tabular-nums;
          min-width: 16px; height: 16px;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0 4px; flex-shrink: 0;
        }
        /* ── New project CTA ─────────────────────────────────────────── */
        .app-sb__new {
          margin: 10px 0 4px; padding: 11px 12px;
          background: rgba(192,57,43,.07); color: var(--accent,#C0392B);
          border: 1px solid rgba(192,57,43,.18); border-radius: 10px;
          font-family: "Satoshi", sans-serif; font-weight: 700; font-size: 12.5px;
          cursor: pointer; text-align: left; width: 100%;
          transition: background .18s cubic-bezier(0.22,1,0.36,1),
                      color .18s cubic-bezier(0.22,1,0.36,1),
                      border-color .18s cubic-bezier(0.22,1,0.36,1);
        }
        .app-sb__new:hover  { background: var(--accent,#C0392B); color: #fff; border-color: var(--accent,#C0392B); }
        .app-sb__new:active { transform: scale(0.98); }
        /* ── Bottom user strip ───────────────────────────────────────── */
        .app-sb__bottom {
          padding: 12px 8px;
          border-top: 1px solid var(--card-border, rgba(13,13,13,.07));
          display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;
        }
        .app-sb__user   { display: flex; align-items: center; gap: 10px; padding: 4px 6px; }
        .app-sb__avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, var(--accent,#C0392B), #922b21);
          color: #fff; font-family: "Satoshi", sans-serif;
          font-weight: 700; font-size: 13px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .app-sb__username   { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .app-sb__role-label { font-size: 10px; color: var(--mute); letter-spacing: .06em; text-transform: uppercase; margin-top: 1px; }
        .app-sb__links { display: flex; align-items: center; gap: 6px; padding: 0 6px; flex-wrap: wrap; }
        .app-sb__links button, .app-sb__links a {
          font-size: 11.5px; color: var(--mute); background: none; border: none;
          cursor: pointer; padding: 0; font-family: inherit; text-decoration: none;
          transition: color .15s cubic-bezier(0.22,1,0.36,1);
        }
        .app-sb__links button:hover, .app-sb__links a:hover { color: var(--accent,#C0392B); }
        .app-sb__links button:focus-visible, .app-sb__links a:focus-visible { outline: 2px solid var(--accent,#C0392B); outline-offset: 2px; border-radius: 3px; }
        .app-sb__links span { color: var(--mute); opacity: .4; }
        /* ── Hamburger ───────────────────────────────────────────────── */
        .app-hamburger {
          display: none; position: fixed; top: 14px; left: 14px; z-index: 50;
          width: 44px; height: 44px; border-radius: 10px;
          background: var(--card-bg); border: 1px solid var(--card-border, rgba(13,13,13,.07));
          align-items: center; justify-content: center;
          cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.1);
        }
        /* ── Overlay — FM controls mount/unmount, CSS only styles ────── */
        .app-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.3);
          z-index: 30; backdrop-filter: blur(2px);
        }
        /* ── Mobile ──────────────────────────────────────────────────── */
        @media (max-width: 768px) {
          .app-hamburger { display: flex; }
          .app-sb {
            position: fixed; top: 0; left: 0; height: 100vh; z-index: 40;
            transform: translateX(-100%);
            transition: transform .32s cubic-bezier(0.34,1.12,0.64,1);
            box-shadow: 4px 0 20px rgba(0,0,0,.12);
          }
          .app-sb.open { transform: translateX(0); }
        }
      `}</style>

      {/* Mobile hamburger */}
      <button className="app-hamburger" aria-label="Abrir menú" onClick={() => setDrawerOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2 4.5h14M2 9h14M2 13.5h14"/>
        </svg>
      </button>

      {/* Mobile overlay — AnimatePresence fade (no display:none hack) */}
      <AnimatePresence>
        {drawerOpen && (
          <m.div
            className="app-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

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

        {/* Nav — scrolls independently, bottom strip stays fixed */}
        <nav className="app-sb__nav">
          {sections.map(section => (
            <div key={section.key} className="app-sb__section">

              {/* Section header — now a <button> with aria-expanded */}
              {multiSection && (
                <button
                  type="button"
                  className="app-sb__section-hd"
                  aria-expanded={openSec[section.key] !== false}
                  onClick={() => toggleSection(section.key)}
                >
                  <span className="app-sb__section-label">{section.label}</span>
                  {/* Chevron — spring-animated via FM */}
                  <m.svg
                    width="12" height="12" viewBox="0 0 12 12"
                    fill="none" stroke="currentColor" strokeWidth="1.5"
                    style={{ flexShrink: 0 }}
                    animate={{ rotate: openSec[section.key] !== false ? 0 : -90 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                  >
                    <path d="M2 4l4 4 4-4"/>
                  </m.svg>
                </button>
              )}

              {/* Items — opacity-only collapse (no height animation) + stagger enter */}
              <AnimatePresence initial={false}>
                {openSec[section.key] !== false && (
                  <m.div
                    className="app-sb__items"
                    key={section.key + '-items'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {section.items.map((item, idx) => {
                      const active = isActive(item)
                      return (
                        <m.button
                          key={idx}
                          type="button"
                          className={`app-sb__item${active ? ' app-sb__item--active' : ''}`}
                          onClick={() => handleItemClick(item)}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            type: 'spring', stiffness: 280, damping: 26,
                            delay: idx * 0.035,
                          }}
                        >
                          {active && (
                            <m.span
                              layoutId="sidebar-indicator"
                              style={{
                                position: 'absolute', left: 0, top: 4, bottom: 4,
                                width: 2, borderRadius: 999,
                                background: 'var(--accent,#C0392B)',
                              }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          )}
                          {item.icon}
                          <span>{item.label}</span>
                          {!!item.badge && (
                            <span className="app-sb__badge">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                          {item.badgeText && (
                            <span style={{
                              padding: '1px 6px', borderRadius: 999,
                              fontSize: 10, fontWeight: 700, fontFamily: '"Satoshi",sans-serif',
                              background: `${item.badgeColor ?? 'var(--mute)'}22`,
                              color: item.badgeColor ?? 'var(--mute)',
                              border: `1px solid ${item.badgeColor ?? 'var(--mute)'}44`,
                              marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap',
                            }}>
                              {item.badgeText}
                            </span>
                          )}
                        </m.button>
                      )
                    })}
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {role === 'student' && (
            <button
              className="app-sb__new"
              onClick={() => { router.push('/dashboard/projects/new'); setDrawerOpen(false) }}
            >
              + Nuevo Proyecto
            </button>
          )}
        </nav>

        {/* Bottom strip — stays pinned, never scrolls */}
        <div className="app-sb__bottom">
          <div className="app-sb__user">
            {userInitial
              ? <div className="app-sb__avatar">{userInitial}</div>
              : <div className="app-sb__avatar" style={{ background: 'var(--bg-2)', animation: 'shimmer 1.4s ease infinite', backgroundSize: '400% 100%' }} />
            }
            <div style={{ minWidth: 0 }}>
              {userName
                ? <div className="app-sb__username">{userName}</div>
                : <div style={{ height: 14, width: 100, borderRadius: 6, background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
              }
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
