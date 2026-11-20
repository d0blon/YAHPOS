'use client'

import * as React from 'react'

type Theme = 'light' | 'dark'

type ThemeProviderProps = {
  children: React.ReactNode
  attribute?: 'class'
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
}

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

function temporarilyDisableTransitions() {
  const style = document.createElement('style')
  style.setAttribute('data-disable-theme-transitions', 'true')
  style.appendChild(
    document.createTextNode(
      `*{transition:none !important;animation:none !important}`
    )
  )
  document.head.appendChild(style)
  requestAnimationFrame(() => {
    style.remove()
  })
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  enableSystem = false,
  disableTransitionOnChange = false,
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)

  /* eslint-disable react-hooks/set-state-in-effect -- Sincronización post-hidratación: localStorage/system solo existen en cliente; SSR renderiza defaultTheme y el efecto alinea estado + clase del DOM. */
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored)
        applyThemeClass(stored)
        return
      }
    } catch {}

    if (enableSystem) {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
      const initial: Theme = prefersDark ? 'dark' : 'light'
      setThemeState(initial)
      applyThemeClass(initial)
      return
    }

    applyThemeClass(defaultTheme)
  }, [defaultTheme, enableSystem, storageKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  const setTheme = React.useCallback(
    (next: Theme) => {
      setThemeState(next)
      if (disableTransitionOnChange) temporarilyDisableTransitions()
      applyThemeClass(next)
      try {
        window.localStorage.setItem(storageKey, next)
      } catch {}
    },
    [disableTransitionOnChange, storageKey]
  )

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

