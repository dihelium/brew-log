# my brew log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA in React + Vite for logging coffee and matcha drinks, with localStorage persistence and full offline support via a service worker, deployable to Vercel.

**Architecture:** React Router v6 handles three routes (`/`, `/add`, `/entry/:id`). A `BrewContext` (Context API + useReducer) owns all state and syncs to localStorage on every change. Photos are compressed via Canvas before storage. A hand-written service worker caches the app shell for offline use.

**Tech Stack:** React 18, Vite, React Router v6, Canvas API, localStorage, vanilla CSS, service worker (no Workbox), sharp (devDep for icon generation), Vercel.

**Working directory:** `/Users/bhargavvarshney/Downloads/my-brew-log`

---

## File Map

| File | Responsibility |
|---|---|
| `src/context/BrewContext.jsx` | Entries state, localStorage sync, add/delete actions |
| `src/utils/compressImage.js` | Canvas resize + JPEG encode → data URL |
| `src/components/StarRating.jsx` | Tap-to-rate and display-only star widget |
| `src/components/PhotoPicker.jsx` | File input with preview; calls compressImage |
| `src/components/EntryCard.jsx` | Compact feed row with left photo strip |
| `src/pages/FeedPage.jsx` | Scrollable entry list + FAB |
| `src/pages/AddPage.jsx` | Log-a-drink form |
| `src/pages/DetailPage.jsx` | Photo-first detail view + delete |
| `src/App.jsx` | Router + BrewProvider + route definitions |
| `src/main.jsx` | ReactDOM mount + service worker registration |
| `src/index.css` | CSS variables, resets, base typography |
| `index.html` | Apple PWA meta tags, manifest link |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Service worker (cache-first for assets, SW-fallback for navigation) |
| `public/icon.svg` | Source icon |
| `scripts/generate-icons.mjs` | Converts icon.svg → PNG at 192, 512, 180px using sharp |
| `public/icon-192.png` | Generated — Android/Chrome PWA icon |
| `public/icon-512.png` | Generated — Android/Chrome PWA icon |
| `public/apple-touch-icon.png` | Generated — iOS home screen icon (180×180) |
| `vite.config.js` | Vite config (default, no changes) |
| `vercel.json` | SPA rewrite rule |

---

## Task 1: Initialise git and scaffold Vite project

**Files:**
- Create: `package.json` (via Vite scaffold)
- Create: `.gitignore`
- Modify: `.gitignore` (add `.superpowers/`)

- [ ] **Step 1: Initialise git**

```bash
cd /Users/bhargavvarshney/Downloads/my-brew-log
git init
```

Expected: `Initialized empty Git repository in .../my-brew-log/.git/`

- [ ] **Step 2: Scaffold Vite + React**

```bash
cd /Users/bhargavvarshney/Downloads/my-brew-log
npm create vite@latest . -- --template react
```

When prompted about the non-empty directory, select **"Ignore files and continue"**.

Expected: Vite prints `Done. Now run: npm install`

- [ ] **Step 3: Install dependencies**

```bash
cd /Users/bhargavvarshney/Downloads/my-brew-log
npm install
npm install react-router-dom
npm install -D sharp
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Remove Vite boilerplate files**

```bash
cd /Users/bhargavvarshney/Downloads/my-brew-log
rm -f src/App.css src/assets/react.svg
```

- [ ] **Step 5: Add `.superpowers/` to .gitignore**

Open `.gitignore` and append this line at the end:

```
.superpowers/
```

- [ ] **Step 6: Create src subdirectories**

```bash
mkdir -p src/context src/pages src/components src/utils
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react project"
```

---

## Task 2: Global styles and index.html

**Files:**
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: Write `src/index.css`**

Replace the entire file content with:

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #faf7f2;
  --surface: #ffffff;
  --border: #e8e0d4;
  --text-primary: #3d2b1f;
  --text-secondary: #9b8475;
  --accent-coffee: #c97b3a;
  --accent-matcha: #4a7c59;
}

html, body {
  height: 100%;
  background: var(--bg);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

#root {
  height: 100%;
}

button, input, textarea {
  font-family: inherit;
}
```

- [ ] **Step 2: Update `index.html`**

Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>my brew log</title>

    <!-- PWA -->
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#faf7f2" />

    <!-- iOS Safari PWA -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="brew log" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add src/index.css index.html
git commit -m "style: add global css variables and ios pwa meta tags"
```

---

## Task 3: BrewContext

**Files:**
- Create: `src/context/BrewContext.jsx`

- [ ] **Step 1: Write `src/context/BrewContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useReducer } from 'react'

const BrewContext = createContext(null)

const STORAGE_KEY = 'brew-entries'

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [action.entry, ...state]
    case 'DELETE':
      return state.filter(e => e.id !== action.id)
    default:
      return state
  }
}

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

export function BrewProvider({ children }) {
  const [entries, dispatch] = useReducer(reducer, null, loadFromStorage)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      // localStorage full — silently ignore
    }
  }, [entries])

  function addEntry({ type, name, photo, rating, notes }) {
    dispatch({
      type: 'ADD',
      entry: {
        id: crypto.randomUUID(),
        type,
        name,
        timestamp: Date.now(),
        ...(photo != null && { photo }),
        ...(rating != null && { rating }),
        ...(notes != null && { notes }),
      },
    })
  }

  function deleteEntry(id) {
    dispatch({ type: 'DELETE', id })
  }

  return (
    <BrewContext.Provider value={{ entries, addEntry, deleteEntry }}>
      {children}
    </BrewContext.Provider>
  )
}

export function useBrew() {
  return useContext(BrewContext)
}
```

- [ ] **Step 2: Verify the file was created**

```bash
cat src/context/BrewContext.jsx | head -5
```

Expected: first line is `import { createContext, ...`

- [ ] **Step 3: Commit**

```bash
git add src/context/BrewContext.jsx
git commit -m "feat: add BrewContext with localStorage persistence"
```

---

## Task 4: compressImage utility

**Files:**
- Create: `src/utils/compressImage.js`

- [ ] **Step 1: Write `src/utils/compressImage.js`**

```js
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 800
      let { width, height } = img
      if (width > height) {
        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
      } else {
        if (height > MAX) { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }

    img.onerror = reject
    img.src = objectUrl
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/compressImage.js
git commit -m "feat: add canvas image compression utility"
```

---

## Task 5: StarRating component

**Files:**
- Create: `src/components/StarRating.jsx`

- [ ] **Step 1: Write `src/components/StarRating.jsx`**

```jsx
export default function StarRating({ value = 0, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => onChange?.(n === value ? 0 : n)}
          style={{
            fontSize: 28,
            color: n <= value ? '#c97b3a' : '#d4c4b0',
            cursor: onChange ? 'pointer' : 'default',
            lineHeight: 1,
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}
```

Note: tapping an already-selected star clears the rating (sets to 0) — useful for deselecting.

- [ ] **Step 2: Commit**

```bash
git add src/components/StarRating.jsx
git commit -m "feat: add StarRating component"
```

---

## Task 6: PhotoPicker component

**Files:**
- Create: `src/components/PhotoPicker.jsx`

- [ ] **Step 1: Write `src/components/PhotoPicker.jsx`**

```jsx
import { useRef } from 'react'
import { compressImage } from '../utils/compressImage'

export default function PhotoPicker({ value, onChange }) {
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressImage(file)
      onChange(dataUrl)
    } catch {
      // compression failed — skip silently
    }
    e.target.value = ''
  }

  if (value) {
    return (
      <div style={{ position: 'relative' }}>
        <img
          src={value}
          alt="preview"
          style={{
            width: '100%',
            height: 180,
            objectFit: 'cover',
            borderRadius: 12,
            display: 'block',
          }}
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            border: 'none', borderRadius: 20, padding: '4px 12px',
            fontSize: 13, cursor: 'pointer',
          }}
        >
          Remove
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        style={{
          width: '100%', padding: 16,
          border: '2px dashed #e8e0d4', borderRadius: 12,
          background: 'transparent', color: '#9b8475',
          fontSize: 15, cursor: 'pointer',
          display: 'block',
        }}
      >
        📷  Add photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PhotoPicker.jsx
git commit -m "feat: add PhotoPicker component with canvas compression"
```

---

## Task 7: EntryCard component

**Files:**
- Create: `src/components/EntryCard.jsx`

- [ ] **Step 1: Write `src/components/EntryCard.jsx`**

```jsx
import { useNavigate } from 'react-router-dom'

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = now.toDateString() === d.toDateString()
  const isYesterday = new Date(now - 86400000).toDateString() === d.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const day = isToday ? 'Today' : isYesterday ? 'Yesterday'
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return `${day}, ${time}`
}

export default function EntryCard({ entry }) {
  const navigate = useNavigate()

  const stripBg = entry.type === 'matcha' ? '#d4e8d4' : '#e8ddd4'
  const emoji = entry.type === 'matcha' ? '🍵' : '☕'

  return (
    <div
      onClick={() => navigate(`/entry/${entry.id}`)}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: '1px solid #e8e0d4',
        background: '#fff',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Photo strip */}
      <div
        style={{
          width: 64,
          minHeight: 72,
          flexShrink: 0,
          background: entry.photo ? 'transparent' : stripBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {entry.photo
          ? <img src={entry.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 24 }}>{emoji}</span>
        }
      </div>

      {/* Text body */}
      <div style={{ padding: '10px 14px', flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#3d2b1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.name}
        </div>
        <div style={{ fontSize: 11, color: '#9b8475', marginTop: 2 }}>
          {entry.type} · {formatTime(entry.timestamp)}
        </div>
        {entry.rating > 0 && (
          <div style={{ fontSize: 11, color: '#c97b3a', marginTop: 4 }}>
            {'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EntryCard.jsx
git commit -m "feat: add EntryCard component"
```

---

## Task 8: FeedPage

**Files:**
- Create: `src/pages/FeedPage.jsx`

- [ ] **Step 1: Write `src/pages/FeedPage.jsx`**

```jsx
import { useNavigate } from 'react-router-dom'
import { useBrew } from '../context/BrewContext'
import EntryCard from '../components/EntryCard'

export default function FeedPage() {
  const { entries } = useBrew()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh', background: '#faf7f2', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid #e8e0d4',
        background: '#faf7f2',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#3d2b1f', letterSpacing: '-0.3px' }}>
          my brew log
        </div>
        <div style={{ fontSize: 12, color: '#9b8475', marginTop: 2 }}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 24px', color: '#9b8475' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>☕</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#3d2b1f', marginBottom: 6 }}>
            No brews yet
          </div>
          <div style={{ fontSize: 14 }}>Tap + to log your first drink</div>
        </div>
      ) : (
        <div>
          {entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/add')}
        style={{
          position: 'fixed', bottom: 28, right: 24,
          width: 56, height: 56, borderRadius: '50%',
          background: '#3d2b1f', color: '#fff',
          border: 'none', fontSize: 30, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(61,43,31,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label="Log a drink"
      >
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/FeedPage.jsx
git commit -m "feat: add FeedPage with entry list and FAB"
```

---

## Task 9: AddPage

**Files:**
- Create: `src/pages/AddPage.jsx`

- [ ] **Step 1: Write `src/pages/AddPage.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrew } from '../context/BrewContext'
import StarRating from '../components/StarRating'
import PhotoPicker from '../components/PhotoPicker'

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#9b8475',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 8,
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '13px 14px',
  border: '1px solid #e8e0d4',
  borderRadius: 10,
  background: '#fff',
  color: '#3d2b1f',
  fontSize: 16,
  outline: 'none',
}

export default function AddPage() {
  const navigate = useNavigate()
  const { addEntry } = useBrew()

  const [type, setType] = useState('coffee')
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState(null)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')

  function handleSave() {
    if (!name.trim()) return
    addEntry({
      type,
      name: name.trim(),
      ...(photo && { photo }),
      ...(rating > 0 && { rating }),
      ...(notes.trim() && { notes: notes.trim() }),
    })
    navigate('/')
  }

  const canSave = name.trim().length > 0

  return (
    <div style={{ minHeight: '100dvh', background: '#faf7f2' }}>
      {/* Nav bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 16px 12px',
        borderBottom: '1px solid #e8e0d4',
        background: '#faf7f2',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#9b6b3a', fontSize: 15, cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#3d2b1f' }}>
          Log a drink
        </div>
        <div style={{ width: 52 }} />
      </div>

      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Type toggle */}
        <div>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['coffee', 'matcha'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '11px 0',
                  borderRadius: 24, border: '2px solid',
                  borderColor: type === t ? '#3d2b1f' : '#e8e0d4',
                  background: type === t ? '#3d2b1f' : 'transparent',
                  color: type === t ? '#fff' : '#9b8475',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                }}
              >
                {t === 'coffee' ? '☕' : '🍵'} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={labelStyle} htmlFor="brew-name">Name</label>
          <input
            id="brew-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. oat latte"
            autoComplete="off"
            style={inputStyle}
          />
        </div>

        {/* Photo */}
        <div>
          <label style={labelStyle}>Photo (optional)</label>
          <PhotoPicker value={photo} onChange={setPhoto} />
        </div>

        {/* Rating */}
        <div>
          <label style={labelStyle}>Rating (optional)</label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle} htmlFor="brew-notes">Notes (optional)</label>
          <textarea
            id="brew-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How was it?"
            rows={4}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          style={{
            width: '100%', padding: 16,
            background: canSave ? '#3d2b1f' : '#d4c4b0',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 16, fontWeight: 600,
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AddPage.jsx
git commit -m "feat: add AddPage log-a-drink form"
```

---

## Task 10: DetailPage

**Files:**
- Create: `src/pages/DetailPage.jsx`

- [ ] **Step 1: Write `src/pages/DetailPage.jsx`**

```jsx
import { useNavigate, useParams } from 'react-router-dom'
import { useBrew } from '../context/BrewContext'
import StarRating from '../components/StarRating'

function formatDate(ts) {
  return new Date(ts).toLocaleString([], {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { entries, deleteEntry } = useBrew()

  const entry = entries.find(e => e.id === id)

  if (!entry) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#9b8475' }}>
        <div style={{ marginBottom: 12 }}>Entry not found.</div>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#9b6b3a', fontSize: 15, cursor: 'pointer' }}
        >
          ← Go back
        </button>
      </div>
    )
  }

  function handleDelete() {
    if (window.confirm('Delete this entry? This cannot be undone.')) {
      deleteEntry(id)
      navigate('/')
    }
  }

  const isMatcha = entry.type === 'matcha'
  const heroBg = isMatcha
    ? 'linear-gradient(135deg, #8bba8b, #4a7c59)'
    : 'linear-gradient(135deg, #c8b4a0, #8b6f5a)'

  return (
    <div style={{ minHeight: '100dvh', background: '#faf7f2' }}>
      {/* Nav bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 16px 12px',
        borderBottom: '1px solid #e8e0d4',
        background: '#faf7f2',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#9b6b3a', fontSize: 15, cursor: 'pointer', padding: 0 }}
        >
          ← Feed
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleDelete}
          style={{ background: 'none', border: 'none', color: '#cc4444', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          Delete
        </button>
      </div>

      {/* Photo hero */}
      <div style={{
        width: '100%', height: 220,
        background: entry.photo ? 'transparent' : heroBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {entry.photo
          ? <img src={entry.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 72 }}>{isMatcha ? '🍵' : '☕'}</span>
        }
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Type badge + name + date */}
        <div>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600,
            padding: '3px 10px', borderRadius: 20, marginBottom: 10,
            background: isMatcha ? '#e8f0e4' : '#f0e8e0',
            color: isMatcha ? '#4a7c59' : '#9b6b3a',
          }}>
            {entry.type}
          </span>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3d2b1f', lineHeight: 1.2 }}>
            {entry.name}
          </div>
          <div style={{ fontSize: 13, color: '#9b8475', marginTop: 5 }}>
            {formatDate(entry.timestamp)}
          </div>
        </div>

        {/* Rating */}
        {entry.rating > 0 && <StarRating value={entry.rating} />}

        {/* Notes */}
        {entry.notes && (
          <div style={{
            padding: '14px 16px',
            background: '#fff', borderRadius: 12,
            border: '1px solid #e8e0d4',
            fontSize: 15, color: '#5a4535', lineHeight: 1.65,
          }}>
            {entry.notes}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/DetailPage.jsx
git commit -m "feat: add DetailPage with photo hero and delete"
```

---

## Task 11: App.jsx and main.jsx

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/main.jsx`

- [ ] **Step 1: Replace `src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BrewProvider } from './context/BrewContext'
import FeedPage from './pages/FeedPage'
import AddPage from './pages/AddPage'
import DetailPage from './pages/DetailPage'

export default function App() {
  return (
    <BrewProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/add" element={<AddPage />} />
          <Route path="/entry/:id" element={<DetailPage />} />
        </Routes>
      </BrowserRouter>
    </BrewProvider>
  )
}
```

- [ ] **Step 2: Replace `src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
```

- [ ] **Step 3: Verify dev server starts with no errors**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. Expected: app loads, empty state shows "No brews yet", FAB visible. Stop the server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/main.jsx
git commit -m "feat: wire up router, context, and service worker registration"
```

---

## Task 12: PWA assets

**Files:**
- Create: `public/icon.svg`
- Create: `scripts/generate-icons.mjs`
- Create: `public/icon-192.png` (generated)
- Create: `public/icon-512.png` (generated)
- Create: `public/apple-touch-icon.png` (generated)
- Create: `public/manifest.json`
- Create: `public/sw.js`

- [ ] **Step 1: Create `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#3d2b1f"/>
  <!-- Cup body -->
  <rect x="152" y="210" width="208" height="175" rx="24" fill="#c97b3a"/>
  <!-- Cup handle -->
  <path d="M360 248 h44 a44 44 0 0 1 0 88 h-44" stroke="#c97b3a" stroke-width="26" fill="none" stroke-linecap="round"/>
  <!-- Saucer -->
  <rect x="126" y="400" width="260" height="22" rx="11" fill="#c97b3a"/>
  <!-- Steam left -->
  <path d="M208 170 q14-28 0-52" stroke="#faf7f2" stroke-width="14" fill="none" stroke-linecap="round"/>
  <!-- Steam center -->
  <path d="M256 158 q14-28 0-52" stroke="#faf7f2" stroke-width="14" fill="none" stroke-linecap="round"/>
  <!-- Steam right -->
  <path d="M304 170 q14-28 0-52" stroke="#faf7f2" stroke-width="14" fill="none" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Write `scripts/generate-icons.mjs`**

```js
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svg = readFileSync(join(root, 'public/icon.svg'))

await sharp(svg).resize(192, 192).png().toFile(join(root, 'public/icon-192.png'))
console.log('✓ icon-192.png')

await sharp(svg).resize(512, 512).png().toFile(join(root, 'public/icon-512.png'))
console.log('✓ icon-512.png')

await sharp(svg).resize(180, 180).png().toFile(join(root, 'public/apple-touch-icon.png'))
console.log('✓ apple-touch-icon.png')

console.log('Icons generated.')
```

- [ ] **Step 3: Generate the icons**

```bash
node scripts/generate-icons.mjs
```

Expected output:
```
✓ icon-192.png
✓ icon-512.png
✓ apple-touch-icon.png
Icons generated.
```

Verify:
```bash
ls -lh public/*.png
```

Expected: three PNG files, each between 3–20 KB.

- [ ] **Step 4: Write `public/manifest.json`**

```json
{
  "name": "my brew log",
  "short_name": "brew log",
  "description": "Log your coffee and matcha drinks",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#faf7f2",
  "theme_color": "#faf7f2",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 5: Write `public/sw.js`**

```js
const CACHE_NAME = 'brew-log-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  // Navigation: network-first, fall back to cached index.html for offline SPA
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
          return r
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Assets: cache-first, populate on miss
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
        }
        return r
      })
    })
  )
})
```

- [ ] **Step 6: Commit**

```bash
git add public/
git add scripts/generate-icons.mjs
git commit -m "feat: add PWA manifest, service worker, and icons"
```

---

## Task 13: vercel.json and vite.config.js

**Files:**
- Create: `vercel.json`
- Modify: `vite.config.js` (confirm default is correct)

- [ ] **Step 1: Write `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Confirm `vite.config.js` content**

The file should read:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

If it matches, no change needed. If Vite scaffolded anything different, replace it with the above.

- [ ] **Step 3: Commit**

```bash
git add vercel.json vite.config.js
git commit -m "chore: add vercel.json SPA rewrite and confirm vite config"
```

---

## Task 14: Build and smoke test

**Files:** none created — verification only.

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: no errors, `dist/` folder created.

- [ ] **Step 2: Preview production build**

```bash
npm run preview
```

Open `http://localhost:4173` in a browser. Test the golden path:

1. Home screen loads — shows empty state with ☕ emoji and "No brews yet"
2. Tap `+` FAB — navigates to `/add`
3. Toggle type to Matcha, enter name "ceremonial matcha", add a star rating, add notes, tap Save
4. Returns to feed — entry appears in the list with correct type/name/time
5. Tap the entry — detail view opens with gradient hero, name, badge, stars, notes
6. Tap Delete — confirm dialog appears, entry is removed, redirects to feed
7. Add another entry with a photo: tap `+`, choose photo, confirm preview shows, save
8. Tap that entry — photo hero shows the actual photo
9. Reload the page at `http://localhost:4173` — entries still appear (localStorage persisted)

Stop the server with Ctrl+C.

- [ ] **Step 3: Final commit**

```bash
git add -A
git status
# Verify nothing unexpected is staged
git commit -m "chore: verify production build and smoke test"
```

---

## Deployment to Vercel

After all tasks are complete and smoke tests pass:

**Option A — Vercel CLI (recommended for first deploy):**

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# From the project root
vercel

# Follow the prompts:
# - Set up and deploy? → Y
# - Which scope? → your personal account
# - Link to existing project? → N
# - Project name? → my-brew-log (or accept default)
# - In which directory is your code? → ./
# - Want to modify settings? → N (Vite auto-detected)

# Vercel will deploy and give you a preview URL.
# To deploy to production:
vercel --prod
```

**Option B — GitHub + Vercel dashboard:**
1. Push the repo to GitHub: `git remote add origin <your-repo-url> && git push -u origin main`
2. Go to vercel.com → New Project → Import your repo
3. Framework: Vite (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Click Deploy

**To install as a PWA on iPhone:**
1. Open the Vercel URL in Safari
2. Tap the Share button → "Add to Home Screen"
3. Tap "Add" — the app icon appears on your home screen
4. Open it — runs full-screen, offline-capable after first load
