'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { Link } from 'next-view-transitions'
import { usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { m, AnimatePresence, useScroll } from 'framer-motion'
import { useTheme } from '@/contexts/ThemeContext'

const NAV_LINKS = [
  { href: '/historia',    label: 'Historia'     },
  { href: '/#impacto',   label: 'Impacto'      },
  { href: '/metodologia', label: 'Metodología'  },
  { href: '/red',         label: 'Nuestra Red'  },
  { href: '/equipo',      label: 'Equipo'       },
  { href: '/news',        label: 'Noticias'     },
]

const LOCALES = [
  { code: 'es', label: 'Español',   short: 'ES', dir: 'ltr'  as const },
  { code: 'en', label: 'English',   short: 'EN', dir: 'ltr'  as const },
  { code: 'fr', label: 'Français',  short: 'FR', dir: 'ltr'  as const },
  { code: 'pt', label: 'Português', short: 'PT', dir: 'ltr'  as const },
  { code: 'ar', label: 'العربية',   short: 'AR', dir: 'rtl'  as const },
]

const LanguageSelector = memo(function LanguageSelector() {
  const pathname      = usePathname()
  const currentLocale = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function changeLocale(newLocale: string) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    const locales = ['en', 'fr', 'pt', 'ar']
    let cleanPath = pathname
    for (const locale of locales) {
      if (pathname.startsWith(`/${locale}`)) {
        cleanPath = pathname.slice(`/${locale}`.length) || '/'
        break
      }
    }
    const newPath = newLocale === 'es' ? cleanPath : `/${newLocale}${cleanPath}`
    window.location.href = newPath
    setOpen(false)
  }

  return (
    <div className="lang-sel" ref={ref}>
      <button
        className="lang-sel__btn"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {currentLocale.toUpperCase()}
        <svg
          width="10" height="7" viewBox="0 0 10 7" aria-hidden="true"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <path d="M1 1L5 5.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            className="lang-sel__drop"
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            {LOCALES.map(lang => (
              <button
                key={lang.code}
                className={`lang-sel__opt${lang.code === currentLocale ? ' lang-sel__opt--active' : ''}`}
                onClick={() => changeLocale(lang.code)}
                role="option"
                aria-selected={lang.code === currentLocale}
                dir={lang.dir}
              >
                {lang.label}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
})

const ThemeToggleBtn = memo(function ThemeToggleBtn() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  function toggle() { setTheme(isDark ? 'light' : 'dark') }
  return (
    <button
      className="pill-nav__theme-btn"
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <m.svg key="sun" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <circle cx="8" cy="8" r="3.2" fill="currentColor"/>
            <path d="M8 1.5V2.8M8 13.2V14.5M1.5 8H2.8M13.2 8H14.5M3.5 3.5L4.4 4.4M11.6 11.6L12.5 12.5M12.5 3.5L11.6 4.4M4.4 11.6L3.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </m.svg>
        ) : (
          <m.svg key="moon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            initial={{ opacity: 0, scale: 0.5, rotate: 30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: -30 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <path d="M13.5 10.2A6 6 0 1 1 5.8 2.5 4.5 4.5 0 0 0 13.5 10.2Z" fill="currentColor"/>
          </m.svg>
        )}
      </AnimatePresence>
    </button>
  )
})

const ThemeDrawerRow = memo(function ThemeDrawerRow() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  function toggle() { setTheme(isDark ? 'light' : 'dark') }
  return (
    <button
      className="pill-nav-drawer__theme-row"
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <m.svg key="sun" width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <circle cx="8" cy="8" r="3.2" fill="currentColor"/>
            <path d="M8 1.5V2.8M8 13.2V14.5M1.5 8H2.8M13.2 8H14.5M3.5 3.5L4.4 4.4M11.6 11.6L12.5 12.5M12.5 3.5L11.6 4.4M4.4 11.6L3.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </m.svg>
        ) : (
          <m.svg key="moon" width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            initial={{ opacity: 0, scale: 0.5, rotate: 30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: -30 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <path d="M13.5 10.2A6 6 0 1 1 5.8 2.5 4.5 4.5 0 0 0 13.5 10.2Z" fill="currentColor"/>
          </m.svg>
        )}
      </AnimatePresence>
      <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  )
})

export default function PublicNavbar() {
  const t = useTranslations()

  const navLabels: Record<string, string> = {
    '/historia':    t('nav.historia'),
    '/#impacto':   t('nav.impacto'),
    '/metodologia': t('nav.metodologia'),
    '/red':         t('nav.nuestraRed'),
    '/equipo':      t('nav.equipo'),
    '/news':        t('nav.noticias'),
  }

  const pathname  = usePathname()
  const cleanPath = pathname.replace(/^\/(es|en|fr|pt|ar)/, '') || '/'

  const [navScrolled,   setNavScrolled]   = useState(false)
  const [navMounted,    setNavMounted]    = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const { scrollY } = useScroll()

  function handleNavLinkClick(e: React.MouseEvent, href: string) {
    if (href === '/#impacto') {
      const el = document.getElementById('impacto')
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
    }
    setMobileNavOpen(false)
  }

  useEffect(() => { setNavMounted(true) }, [])

  useEffect(() => {
    const unsub = scrollY.on('change', v => setNavScrolled(v > 80))
    return unsub
  }, [scrollY])

  // Only 'impacto' is always in the DOM on the landing — no-op on other pages
  useEffect(() => {
    const el = document.getElementById('impacto')
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActiveSection('impacto') },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <style>{`
        .pill-nav-wrap{position:fixed;top:0;left:0;right:0;z-index:100;pointer-events:none;display:flex;justify-content:center;padding:16px 20px;}
        .pill-nav{pointer-events:all;display:flex;align-items:center;background:rgba(245,243,239,0.85);backdrop-filter:blur(12px) saturate(180%);border:1px solid var(--line);border-radius:999px;padding:6px 6px 6px 16px;transition:background 0.3s cubic-bezier(0.22,1,0.36,1),box-shadow 0.3s cubic-bezier(0.22,1,0.36,1);box-shadow:var(--shadow-raised);}
        .pill-nav--scrolled{background:var(--bg-2,rgba(239,236,230,0.96));box-shadow:0 8px 32px rgba(13,13,13,.12),0 2px 8px rgba(13,13,13,.06);}
        .pill-nav__brand{display:flex;align-items:center;gap:8px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:var(--ink);text-decoration:none;margin-right:20px;flex-shrink:0;}
        .pill-nav__links{display:flex;gap:2px;align-items:center;}
        .pill-nav__link{font-family:"Satoshi",sans-serif;font-size:13.5px;color:var(--ink-2);text-decoration:none;padding:7px 12px;border-radius:999px;background:none;border:none;cursor:pointer;transition:color 0.2s cubic-bezier(0.22,1,0.36,1),background 0.2s cubic-bezier(0.22,1,0.36,1);}
        .pill-nav__link:hover{color:var(--ink);background:rgba(13,13,13,0.06);}
        .pill-nav__link--active{color:var(--ink);background:rgba(13,13,13,0.07);}
        .pill-nav__cta{margin-left:8px;padding:8px 16px;background:var(--ink);color:var(--bg,#F5F3EF);font-family:"Satoshi",sans-serif;font-size:13px;font-weight:600;border-radius:999px;text-decoration:none;border:none;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;transition:background 0.2s cubic-bezier(0.22,1,0.36,1);}
        .pill-nav__cta:hover{background:var(--accent,#C0392B);}
        .pill-nav__cta:active{transform:scale(0.97);}
        .pill-nav__cta-arrow{display:inline-block;transition:transform 0.2s cubic-bezier(0.22,1,0.36,1);}
        .pill-nav__cta:hover .pill-nav__cta-arrow{transform:translateX(3px);}
        .pill-nav__hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:var(--ink);margin-left:6px;border-radius:999px;transition:background 0.15s;}
        .pill-nav__hamburger:hover{background:rgba(13,13,13,0.06);}
        @media(max-width:760px){.pill-nav__links{display:none;}.pill-nav__hamburger{display:flex;align-items:center;justify-content:center;}}
        .pill-nav-overlay{position:fixed;inset:0;background:rgba(13,13,13,0.5);z-index:99;}
        .pill-nav-drawer{position:fixed;top:0;left:0;right:0;z-index:100;background:var(--bg,#F5F3EF);border-bottom:1px solid var(--line);padding:72px 24px 28px;display:flex;flex-direction:column;gap:4px;}
        .pill-nav-drawer__link{display:block;width:100%;font-family:"Satoshi",sans-serif;font-size:18px;font-weight:500;color:var(--ink);text-decoration:none;text-align:left;background:none;border:none;cursor:pointer;padding:12px 0;border-bottom:1px solid rgba(13,13,13,0.06);}
        .pill-nav-drawer__link--active{color:#C0392B;}
        .pill-nav-drawer__cta{margin-top:16px;padding:14px 24px;background:var(--ink);color:var(--bg,#F5F3EF);font-family:"Satoshi",sans-serif;font-size:15px;font-weight:600;border-radius:999px;text-decoration:none;text-align:center;}
        .lang-sel{position:relative;margin:0 4px;}
        .lang-sel__btn{font-family:"Satoshi",sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;color:var(--ink-2);background:none;border:1px solid var(--line);border-radius:999px;padding:5px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:color 0.2s cubic-bezier(0.22,1,0.36,1),background 0.2s cubic-bezier(0.22,1,0.36,1);}
        .lang-sel__btn:hover{color:var(--ink);background:rgba(13,13,13,0.06);}
        .lang-sel__drop{position:absolute;top:calc(100% + 8px);right:0;min-width:130px;background:var(--card-bg,#fff);border:1px solid var(--card-border,rgba(13,13,13,0.08));border-radius:12px;box-shadow:var(--shadow-raised,0 4px 16px rgba(13,13,13,0.08));overflow:hidden;z-index:200;display:flex;flex-direction:column;}
        .lang-sel__opt{width:100%;background:none;border:none;padding:9px 16px;font-family:"Satoshi",sans-serif;font-size:13.5px;color:var(--ink);text-align:left;cursor:pointer;transition:background 0.15s cubic-bezier(0.22,1,0.36,1);}
        .lang-sel__opt:hover{background:rgba(13,13,13,0.05);}
        .lang-sel__opt--active{color:var(--accent,#C0392B);font-weight:600;}
        .lang-sel__opt[dir="rtl"]{text-align:right;}
        @media(max-width:760px){.lang-sel{display:none;}}
        .pill-nav__theme-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:none;border:1px solid var(--line);color:var(--ink-2);cursor:pointer;margin:0 4px;flex-shrink:0;overflow:hidden;transition:background 0.2s cubic-bezier(0.22,1,0.36,1),color 0.2s,border-color 0.2s;}
        .pill-nav__theme-btn:hover{background:rgba(13,13,13,0.06);color:var(--ink);}
        .pill-nav__theme-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}
        .pill-nav-drawer__theme-row{display:flex;align-items:center;gap:12px;width:100%;background:none;border:none;border-top:1px solid rgba(13,13,13,0.06);cursor:pointer;padding:14px 0;font-family:"Satoshi",sans-serif;font-size:16px;font-weight:500;color:var(--ink);text-align:left;margin-top:4px;}
        .pill-nav-drawer__theme-row:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px;}
        html.dark .pill-nav{background:rgba(13,13,13,0.88);border-color:rgba(255,255,255,0.08);}
        html.dark .pill-nav--scrolled{background:rgba(17,17,17,0.96);box-shadow:0 8px 32px rgba(0,0,0,0.4),0 2px 8px rgba(0,0,0,0.2);}
        html.dark .pill-nav__theme-btn:hover{background:rgba(255,255,255,0.08);color:var(--ink);}
        html.dark .pill-nav-drawer{background:var(--bg);}
        html.dark .pill-nav-drawer__theme-row{border-color:rgba(255,255,255,0.06);}
      `}</style>

      {/* Floating Pill Nav */}
      <AnimatePresence>
        {navMounted && (
          <m.div
            className="pill-nav-wrap"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.3 }}
          >
            <nav dir="ltr" className={`pill-nav${navScrolled ? ' pill-nav--scrolled' : ''}`}>
              <Link href="/" className="pill-nav__brand">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <circle cx="12" cy="5" r="2.4" fill="currentColor"/>
                  <path d="M12 7.5 L20 22 H4 Z" fill="currentColor"/>
                </svg>
                Big Family
              </Link>
              <div className="pill-nav__links">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`pill-nav__link${
                      (link.href === '/#impacto' ? activeSection === 'impacto' : cleanPath === link.href)
                        ? ' pill-nav__link--active' : ''
                    }`}
                    onClick={e => handleNavLinkClick(e, link.href)}
                  >
                    {navLabels[link.href] ?? link.label}
                  </Link>
                ))}
              </div>
              <LanguageSelector />
              <ThemeToggleBtn />
              <Link href="/login" className="pill-nav__cta">
                {t('nav.ingresar')} <span className="pill-nav__cta-arrow" aria-hidden="true">→</span>
              </Link>
              <button
                className="pill-nav__hamburger"
                aria-label={mobileNavOpen ? t('nav.menuClose') : t('nav.menuOpen')}
                onClick={() => setMobileNavOpen(o => !o)}
              >
                <AnimatePresence mode="wait">
                  {mobileNavOpen ? (
                    <m.svg
                      key="x"
                      width="20" height="20" viewBox="0 0 20 20" fill="none"
                      initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </m.svg>
                  ) : (
                    <m.svg
                      key="menu"
                      width="20" height="20" viewBox="0 0 20 20" fill="none"
                      initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </m.svg>
                  )}
                </AnimatePresence>
              </button>
            </nav>
          </m.div>
        )}
      </AnimatePresence>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <m.div
              className="pill-nav-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <m.div
              className="pill-nav-drawer"
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`pill-nav-drawer__link${
                    (link.href === '/#impacto' ? activeSection === 'impacto' : cleanPath === link.href)
                      ? ' pill-nav-drawer__link--active' : ''
                  }`}
                  onClick={e => handleNavLinkClick(e, link.href)}
                >
                  {navLabels[link.href] ?? link.label}
                </Link>
              ))}
              <Link href="/login" className="pill-nav-drawer__cta">{t('nav.ingresar')} →</Link>
              <ThemeDrawerRow />
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
