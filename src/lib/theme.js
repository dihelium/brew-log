const STORAGE_KEY = 'brewlog:theme'

export const DEFAULT_THEME = 'cream'

export const THEMES = [
  {
    id: 'cream',
    label: 'Café Cream',
    swatch: { bg: '#faf7f2', accent: '#c97b3a' },
    themeColor: '#faf7f2',
    fontsHref: null,
  },
  {
    id: 'matcha',
    label: 'Matcha Garden',
    swatch: { bg: '#e7eeda', accent: '#5d8a4e' },
    themeColor: '#e7eeda',
    fontsHref: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
  },
  {
    id: 'dark-roast',
    label: 'Dark Roast',
    swatch: { bg: '#171009', accent: '#d0904f' },
    themeColor: '#171009',
    fontsHref: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Outfit:wght@400;500;600&display=swap',
  },
  {
    id: 'reading-nook',
    label: 'Reading Nook',
    swatch: { bg: '#efe3c8', accent: '#8c3b2e' },
    themeColor: '#efe3c8',
    fontsHref: 'https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:wght@400;700&family=Lora:wght@400;500;600&display=swap',
  },
  {
    id: 'berry',
    label: 'Berry Hibiscus',
    swatch: { bg: '#fdf3f5', accent: '#c04a6e' },
    themeColor: '#fdf3f5',
    fontsHref: 'https://fonts.googleapis.com/css2?family=Young+Serif&family=Nunito+Sans:wght@400;600;700&display=swap',
  },
]

export function normalizeThemeId(id) {
  return THEMES.some((t) => t.id === id) ? id : DEFAULT_THEME
}

export function getStoredTheme(storage = defaultStorage()) {
  let raw = null
  try {
    raw = storage?.getItem(STORAGE_KEY)
  } catch {
    // storage unavailable (private mode etc.) — use default
  }
  return normalizeThemeId(raw)
}

export function applyTheme(id, { doc = document, storage = defaultStorage() } = {}) {
  const theme = THEMES.find((t) => t.id === normalizeThemeId(id))

  doc.documentElement.dataset.theme = theme.id

  const meta = doc.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme.themeColor)

  let link = doc.getElementById('theme-fonts')
  if (theme.fontsHref) {
    if (!link) {
      link = doc.createElement('link')
      link.id = 'theme-fonts'
      link.setAttribute('rel', 'stylesheet')
      doc.head.appendChild(link)
    }
    if (link.getAttribute('href') !== theme.fontsHref) {
      link.setAttribute('href', theme.fontsHref)
    }
  } else if (link) {
    link.remove()
  }

  try {
    storage?.setItem(STORAGE_KEY, theme.id)
  } catch {
    // persisting is best-effort
  }

  return theme.id
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
