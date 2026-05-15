'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'auto'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', setTheme: () => {} })

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'auto') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.remove('light', 'dark')
    root.classList.add(dark ? 'dark' : 'light')
  } else {
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem('bf-theme') as Theme | null
    const initial = stored ?? 'light'
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  useEffect(() => {
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('auto')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('bf-theme', t)
    applyTheme(t)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
