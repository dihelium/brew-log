# Theme Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a five-theme (colors + fonts) switcher to the brew-log PWA, persisted in localStorage, applied before first paint.

**Architecture:** Café Cream stays as the `:root` CSS-variable defaults; the other four themes are `:root[data-theme="<id>"]` override blocks in `src/index.css`. A small `src/lib/theme.js` module owns the theme table, persistence, and DOM application (data-theme attribute, Google Fonts `<link>` swap, `<meta name="theme-color">`). A `ThemePicker` component on the feed page lets the user switch.

**Tech Stack:** React 19, Vite, vitest (node environment — DOM/storage are injected into `applyTheme` so it's testable without jsdom), CSS custom properties, Google Fonts.

**Spec:** `docs/superpowers/specs/2026-07-13-theme-switcher.md`

**Branch:** create `feat/theme-switcher` off the current `feat/supabase-backend` before Task 1: `git checkout -b feat/theme-switcher`

---

### Task 1: Theme module (`src/lib/theme.js`) — TDD

**Files:**
- Create: `src/lib/theme.test.js`
- Create: `src/lib/theme.js`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/theme.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/theme.test.js`
Expected: FAIL — cannot resolve `./theme`

- [ ] **Step 3: Implement `src/lib/theme.js`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/theme.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.js src/lib/theme.test.js
git commit -m "feat: add theme module with five-theme table, persistence, and DOM application"
```

---

### Task 2: CSS — themeable variables + four theme blocks

**Files:**
- Modify: `src/index.css` (`:root` block ~line 23; badges ~lines 140–148; FAB ~lines 176–193; type toggle + save button ~lines 292–312)
- Modify: `src/components/StarRating.jsx:14`

No unit tests (pure CSS); verified by lint/build in this task and visually in Task 4.

- [ ] **Step 1: Extend `:root` with the new variables**

In `src/index.css`, add inside the existing `:root { ... }` block, after `--accent-matcha-dark: #365c42;`:

```css
  --accent-primary: var(--accent-coffee);
  --badge-coffee-bg: #fdf0e0;
  --badge-matcha-bg: #e8f4ec;
  --on-accent: #ffffff;
  --shadow-fab: 0 4px 16px rgba(201,123,58,0.35);
```

- [ ] **Step 2: Replace hardcoded values with the new variables**

In `src/index.css`:

`.entry-card__badge[data-type="coffee"]`: `background: #fdf0e0;` → `background: var(--badge-coffee-bg);`
`.entry-card__badge[data-type="matcha"]`: `background: #e8f4ec;` → `background: var(--badge-matcha-bg);`

`.feed-page__fab`:
- `background: var(--accent-coffee);` → `background: var(--accent-primary);`
- `color: white;` → `color: var(--on-accent);`
- `box-shadow: 0 4px 16px rgba(201,123,58,0.35);` → `box-shadow: var(--shadow-fab);`

`.sheet__type-btn[data-active="true"]`:
- `border-color: var(--accent-coffee);` → `border-color: var(--accent-primary);`
- `background: var(--accent-coffee);` → `background: var(--accent-primary);`
- `color: #fff;` → `color: var(--on-accent);`

`.sheet__save-btn`:
- `background: var(--accent-coffee);` → `background: var(--accent-primary);`
- `color: white;` → `color: var(--on-accent);`

In `src/components/StarRating.jsx` line 14:
`color: i < value ? 'var(--accent-coffee)' : 'var(--border-strong)',` → `color: i < value ? 'var(--accent-primary)' : 'var(--border-strong)',`

- [ ] **Step 3: Add the four theme override blocks**

Append directly after the `:root { ... }` block in `src/index.css`:

```css
:root[data-theme='matcha'] {
  --bg: #e7eeda;
  --surface: #d9e3c6;
  --surface-raised: #f6f9ee;
  --border: #c6d4b0;
  --border-strong: #a4ba8e;
  --text-primary: #22392b;
  --text-secondary: #58705d;
  --text-muted: #93a893;
  --accent-coffee: #8a6d4a;
  --accent-coffee-dark: #6d5438;
  --accent-matcha: #5d8a4e;
  --accent-matcha-dark: #42663a;
  --accent-primary: var(--accent-matcha);
  --badge-coffee-bg: #efe7db;
  --badge-matcha-bg: #e2eed9;
  --on-accent: #ffffff;
  --shadow-card: 0 1px 3px rgba(34,57,43,0.06), 0 4px 12px rgba(34,57,43,0.05);
  --shadow-fab: 0 4px 16px rgba(93,138,78,0.35);
  --font-display: 'Shippori Mincho', Georgia, serif;
  --font-body: 'Zen Kaku Gothic New', -apple-system, sans-serif;
}

:root[data-theme='dark-roast'] {
  color-scheme: dark;
  --bg: #171009;
  --surface: #241a10;
  --surface-raised: #2b2015;
  --border: #3c2e1e;
  --border-strong: #56422c;
  --text-primary: #efe4d3;
  --text-secondary: #bfa989;
  --text-muted: #85704f;
  --accent-coffee: #d0904f;
  --accent-coffee-dark: #e8b078;
  --accent-matcha: #7ba05e;
  --accent-matcha-dark: #a3c487;
  --badge-coffee-bg: #3d2c17;
  --badge-matcha-bg: #26311b;
  --on-accent: #1c130a;
  --danger: #e2604f;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 4px 14px rgba(0,0,0,0.3);
  --shadow-fab: 0 4px 18px rgba(208,144,79,0.4);
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Outfit', -apple-system, sans-serif;
}

:root[data-theme='reading-nook'] {
  --bg: #efe3c8;
  --surface: #e3d3ae;
  --surface-raised: #f9f1dd;
  --border: #d2bd93;
  --border-strong: #b5996e;
  --text-primary: #2f2a24;
  --text-secondary: #6b5f4e;
  --text-muted: #a08f74;
  --accent-coffee: #8c3b2e;
  --accent-coffee-dark: #6e2d23;
  --accent-matcha: #56633c;
  --accent-matcha-dark: #3f4a2c;
  --badge-coffee-bg: #f3e0d8;
  --badge-matcha-bg: #e7e9d8;
  --on-accent: #fdf9ef;
  --shadow-card: 0 1px 3px rgba(47,42,36,0.07), 0 4px 12px rgba(47,42,36,0.05);
  --shadow-fab: 0 4px 16px rgba(140,59,46,0.32);
  --font-display: 'Libre Caslon Text', Georgia, serif;
  --font-body: 'Lora', Georgia, serif;
}

:root[data-theme='berry'] {
  --bg: #fdf3f5;
  --surface: #f7e3e9;
  --surface-raised: #fffbfc;
  --border: #f0d2dc;
  --border-strong: #dcaebe;
  --text-primary: #43263a;
  --text-secondary: #7d5570;
  --text-muted: #b592a8;
  --accent-coffee: #c04a6e;
  --accent-coffee-dark: #9c3355;
  --accent-matcha: #56845f;
  --accent-matcha-dark: #3e6446;
  --badge-coffee-bg: #f9e2ea;
  --badge-matcha-bg: #e4f0e5;
  --on-accent: #ffffff;
  --shadow-card: 0 1px 3px rgba(67,38,58,0.06), 0 4px 12px rgba(67,38,58,0.05);
  --shadow-fab: 0 4px 16px rgba(192,74,110,0.35);
  --font-display: 'Young Serif', serif;
  --font-body: 'Nunito Sans', -apple-system, sans-serif;
}
```

Note: `--accent-primary` is inherited from `:root` as `var(--accent-coffee)`, which re-resolves per theme — only Matcha overrides it to the green accent (green-led theme, matching the approved preview).

- [ ] **Step 4: Verify nothing broke**

Run: `npm run lint && npm run build`
Expected: both succeed

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/StarRating.jsx
git commit -m "feat: add four theme CSS variable blocks and make accent surfaces themeable"
```

---

### Task 3: Boot application + ThemePicker UI

**Files:**
- Modify: `src/main.jsx` (add theme bootstrap before render)
- Create: `src/components/ThemePicker.jsx`
- Modify: `src/pages/FeedPage.jsx` (render picker above `<BackupControls />`, ~line 45)

- [ ] **Step 1: Apply the stored theme before React renders**

In `src/main.jsx`, add immediately after the existing imports (before any render call):

```js
import { applyTheme, getStoredTheme } from './lib/theme'

applyTheme(getStoredTheme())
```

- [ ] **Step 2: Create `src/components/ThemePicker.jsx`**

Follows the inline-style + section conventions of `BackupControls.jsx`:

```jsx
import { useState } from 'react'
import { THEMES, applyTheme, getStoredTheme } from '../lib/theme'

export default function ThemePicker() {
  const [active, setActive] = useState(getStoredTheme)

  function select(id) {
    setActive(applyTheme(id))
  }

  return (
    <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <p style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)',
        marginBottom: 12,
        textAlign: 'center',
      }}>
        Theme
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => select(t.id)}
            aria-label={t.label}
            aria-pressed={t.id === active}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              width: 58,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: t.swatch.bg,
              border: '1px solid var(--border-strong)',
              boxShadow: t.id === active
                ? '0 0 0 2px var(--bg), 0 0 0 4px var(--accent-primary)'
                : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: t.swatch.accent,
              }} />
            </span>
            <span style={{
              fontSize: 10,
              lineHeight: 1.2,
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              color: t.id === active ? 'var(--text-secondary)' : 'var(--text-muted)',
            }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Render it on the feed page**

In `src/pages/FeedPage.jsx`, add the import next to the `BackupControls` import:

```js
import ThemePicker from '../components/ThemePicker'
```

and render it directly above `<BackupControls />`:

```jsx
      <ThemePicker />
      <BackupControls />
```

- [ ] **Step 4: Verify**

Run: `npm test && npm run lint && npm run build`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/main.jsx src/components/ThemePicker.jsx src/pages/FeedPage.jsx
git commit -m "feat: add theme picker UI and apply stored theme at boot"
```

---

### Task 4: End-to-end verification

**Files:** none (verification only; fix-ups committed if found)

- [ ] **Step 1: Run the app**

Run: `npm run dev` (background), open `http://localhost:5173` in the browser.

- [ ] **Step 2: Exercise the feature**

- Feed page shows the "Theme" section with five swatches above "Backup"; Café Cream active by default.
- Tap each theme: background, cards, badges, FAB, and fonts all change; active ring moves.
- On Matcha Garden the FAB and save button are green; on all others they use the theme's coffee-side accent.
- Open the add sheet (+): type toggle, save button, star rating follow the theme.
- Reload the page on a non-default theme: it paints in that theme with no cream flash, and `<meta name="theme-color">` matches the theme background (check via devtools).
- Switch back to Café Cream: `#theme-fonts` link is removed from `<head>`.

- [ ] **Step 3: Commit spec + plan docs**

```bash
git add docs/superpowers/specs/2026-07-13-theme-switcher.md docs/superpowers/plans/2026-07-13-theme-switcher.md
git commit -m "docs: theme switcher spec and implementation plan"
```
