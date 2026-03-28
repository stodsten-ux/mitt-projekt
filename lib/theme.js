export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  if (theme === THEMES.DARK) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else if (theme === THEMES.LIGHT) {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export function getSavedTheme() {
  if (typeof localStorage === 'undefined') return THEMES.SYSTEM
  return localStorage.getItem('theme') || THEMES.SYSTEM
}

export function saveTheme(theme) {
  localStorage.setItem('theme', theme)
  applyTheme(theme)
}
