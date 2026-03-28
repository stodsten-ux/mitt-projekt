'use client'

import { useState, useEffect } from 'react'
import { getSavedTheme, saveTheme, THEMES } from '../lib/theme'

export default function ThemeToggle() {
  const [theme, setTheme] = useState(THEMES.SYSTEM)

  useEffect(() => {
    setTheme(getSavedTheme())
  }, [])

  function toggle() {
    const isDark =
      theme === THEMES.DARK ||
      (theme === THEMES.SYSTEM && window.matchMedia('(prefers-color-scheme: dark)').matches)
    const next = isDark ? THEMES.LIGHT : THEMES.DARK
    saveTheme(next)
    setTheme(next)
  }

  const isDark =
    theme === THEMES.DARK ||
    (theme === THEMES.SYSTEM && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Byt till ljust läge' : 'Byt till mörkt läge'}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '6px', lineHeight: 1, color: 'var(--text-muted)' }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
