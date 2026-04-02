const GLOBAL_THEME_KEY = 'dribble-theme'
const VALID_THEMES = new Set(['dark', 'light'])

function isValidTheme(theme) {
  return VALID_THEMES.has(theme)
}

export function readThemePreference(legacyKey = '') {
  if (typeof window === 'undefined') return 'dark'

  const globalTheme = window.localStorage.getItem(GLOBAL_THEME_KEY)
  if (isValidTheme(globalTheme)) {
    return globalTheme
  }

  if (legacyKey) {
    const legacyTheme = window.localStorage.getItem(legacyKey)
    if (isValidTheme(legacyTheme)) {
      window.localStorage.setItem(GLOBAL_THEME_KEY, legacyTheme)
      return legacyTheme
    }
  }

  return 'dark'
}

export function writeThemePreference(theme, legacyKey = '') {
  if (typeof window === 'undefined' || !isValidTheme(theme)) return

  window.localStorage.setItem(GLOBAL_THEME_KEY, theme)

  if (legacyKey) {
    window.localStorage.setItem(legacyKey, theme)
  }
}
