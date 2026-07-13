import { describe, it, expect } from 'vitest'
import { THEMES, DEFAULT_THEME, normalizeThemeId, getStoredTheme, applyTheme } from './theme'

function makeStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    data,
  }
}

function makeDoc() {
  const byId = {}
  function makeElement() {
    const el = {
      attrs: {},
      setAttribute(k, v) { this.attrs[k] = String(v) },
      getAttribute(k) { return k in this.attrs ? this.attrs[k] : null },
      remove() { delete byId[el.id] },
    }
    return el
  }
  const meta = makeElement()
  meta.setAttribute('content', '#faf7f2')
  return {
    documentElement: { dataset: {} },
    head: { appendChild(el) { byId[el.id] = el } },
    querySelector: (sel) => (sel === 'meta[name="theme-color"]' ? meta : null),
    getElementById: (id) => byId[id] ?? null,
    createElement: () => makeElement(),
    meta,
  }
}

describe('THEMES table', () => {
  it('has the five approved themes with unique ids', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['cream', 'matcha', 'dark-roast', 'reading-nook', 'berry'])
  })

  it('every theme has label, swatch colors, and themeColor', () => {
    for (const t of THEMES) {
      expect(t.label).toBeTruthy()
      expect(t.swatch.bg).toMatch(/^#[0-9a-f]{6}$/i)
      expect(t.swatch.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(t.themeColor).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('non-default themes declare a Google Fonts stylesheet, cream does not', () => {
    for (const t of THEMES) {
      if (t.id === DEFAULT_THEME) expect(t.fontsHref).toBeNull()
      else expect(t.fontsHref).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?/)
    }
  })
})

describe('normalizeThemeId', () => {
  it('passes through known ids', () => {
    expect(normalizeThemeId('dark-roast')).toBe('dark-roast')
  })

  it('falls back to the default for unknown or missing values', () => {
    expect(normalizeThemeId('neon')).toBe(DEFAULT_THEME)
    expect(normalizeThemeId(null)).toBe(DEFAULT_THEME)
    expect(normalizeThemeId(undefined)).toBe(DEFAULT_THEME)
  })
})

describe('getStoredTheme', () => {
  it('returns the stored theme when valid', () => {
    expect(getStoredTheme(makeStorage({ 'brewlog:theme': 'berry' }))).toBe('berry')
  })

  it('falls back to default for garbage or empty storage', () => {
    expect(getStoredTheme(makeStorage({ 'brewlog:theme': 'nope' }))).toBe(DEFAULT_THEME)
    expect(getStoredTheme(makeStorage())).toBe(DEFAULT_THEME)
  })

  it('survives a storage that throws', () => {
    const broken = { getItem() { throw new Error('denied') } }
    expect(getStoredTheme(broken)).toBe(DEFAULT_THEME)
  })
})

describe('applyTheme', () => {
  it('sets data-theme on the document element and persists the choice', () => {
    const doc = makeDoc()
    const storage = makeStorage()
    expect(applyTheme('matcha', { doc, storage })).toBe('matcha')
    expect(doc.documentElement.dataset.theme).toBe('matcha')
    expect(storage.data['brewlog:theme']).toBe('matcha')
  })

  it('normalizes unknown ids to the default', () => {
    const doc = makeDoc()
    expect(applyTheme('bogus', { doc, storage: makeStorage() })).toBe(DEFAULT_THEME)
    expect(doc.documentElement.dataset.theme).toBe(DEFAULT_THEME)
  })

  it('updates the theme-color meta tag', () => {
    const doc = makeDoc()
    applyTheme('dark-roast', { doc, storage: makeStorage() })
    expect(doc.meta.getAttribute('content')).toBe('#171009')
  })

  it('injects a fonts link for non-default themes and removes it for cream', () => {
    const doc = makeDoc()
    const storage = makeStorage()
    applyTheme('berry', { doc, storage })
    const link = doc.getElementById('theme-fonts')
    expect(link).not.toBeNull()
    expect(link.getAttribute('href')).toContain('Young+Serif')
    applyTheme('cream', { doc, storage })
    expect(doc.getElementById('theme-fonts')).toBeNull()
  })

  it('does not throw when storage setItem fails', () => {
    const doc = makeDoc()
    const storage = { getItem: () => null, setItem() { throw new Error('quota') } }
    expect(() => applyTheme('matcha', { doc, storage })).not.toThrow()
    expect(doc.documentElement.dataset.theme).toBe('matcha')
  })
})
