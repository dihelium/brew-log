# my brew log — Design Spec
_2026-05-25_

## Overview

A mobile-first PWA for logging coffee and matcha drinks. No backend, no login — everything lives on-device in localStorage. Deployable to Vercel. Primary usage: iPhone Safari, installed to home screen.

---

## Stack

- **React + Vite** — project scaffold
- **React Router v6** — client-side routing
- **Context API** — global state (no external state lib)
- **localStorage** — persistence
- **Canvas API** — photo compression before storage
- **Vercel** — deployment target

---

## Routes

| Route | View |
|---|---|
| `/` | Feed — scrollable entry list, newest first, FAB to add |
| `/add` | Add entry form (full-screen) |
| `/entry/:id` | Detail view (photo-first) |

React Router v6 with a BrowserRouter. `vercel.json` rewrites all paths to `index.html` for SPA routing.

---

## Data Model

```ts
interface BrewEntry {
  id: string;           // crypto.randomUUID()
  type: 'coffee' | 'matcha';
  name: string;         // e.g. "oat latte"
  timestamp: number;    // Date.now() at save time
  photo?: string;       // base64 data URL, canvas-compressed JPEG
  rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}
```

Stored as a JSON array at `localStorage["brew-entries"]`. Photos compressed to max 800px wide, JPEG quality 0.7 — targets ~100KB per photo. iOS Safari localStorage cap is ~5MB, yielding ~40–50 photos before saturation.

---

## State & Context

`BrewContext` wraps the entire app and provides:

- `entries: BrewEntry[]` — sorted newest-first on read
- `addEntry(entry: Omit<BrewEntry, 'id' | 'timestamp'>): void`
- `deleteEntry(id: string): void`

A `useEffect` syncs `entries` to localStorage on every state change. Initial state is loaded from localStorage on mount.

---

## File Structure

```
my-brew-log/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png   (180×180)
├── src/
│   ├── main.jsx               ← mounts app, registers SW
│   ├── App.jsx                ← Router + BrewContext provider + routes
│   ├── index.css              ← global styles, CSS variables
│   ├── context/
│   │   └── BrewContext.jsx
│   ├── pages/
│   │   ├── FeedPage.jsx       ← entry list + FAB
│   │   ├── AddPage.jsx        ← log form
│   │   └── DetailPage.jsx     ← photo-first detail + delete
│   ├── components/
│   │   ├── EntryCard.jsx      ← compact row (left photo strip)
│   │   ├── StarRating.jsx     ← tap-to-rate / display-only mode
│   │   └── PhotoPicker.jsx    ← file input (camera + library)
│   └── utils/
│       └── compressImage.js   ← canvas resize + JPEG encode → data URL
├── index.html                 ← Apple PWA meta tags, manifest link
├── vite.config.js
├── vercel.json
└── package.json
```

---

## Component Specs

### FeedPage
- Renders a scrollable list of `EntryCard` components, sorted newest-first
- FAB (floating action button, bottom-right) navigates to `/add`
- Empty state: warm illustrated message prompting first log
- Header: "my brew log" + entry count

### EntryCard
- Layout: left photo strip (64px wide) + text body
- Photo strip: shows compressed thumbnail if photo exists, else a type emoji (☕ or 🍵)
- Body: drink name (bold), type + formatted timestamp (subdued), star rating
- Full row is tappable → navigates to `/entry/:id`

### AddPage
- Back button (top-left) → `/`
- Fields in order:
  1. Type toggle: Coffee | Matcha (pill selector)
  2. Name text input (required, placeholder: "e.g. oat latte")
  3. PhotoPicker (optional)
  4. StarRating (optional, 1–5)
  5. Notes textarea (optional)
- Save button (bottom, full-width) — disabled until name is non-empty
- On save: `addEntry(...)` → navigate to `/`

### DetailPage
- Nav bar: "← Feed" back button (left), "Delete" (right, red)
- Photo hero: full-width, 220px tall — shows photo if present, else gradient with type emoji
- Below hero: drink name, type badge, formatted timestamp
- Star rating display
- Notes block (only rendered if notes exist)
- Delete: `window.confirm()` → `deleteEntry(id)` → navigate to `/`

### StarRating
- Props: `value`, `onChange` (optional — omit for display-only)
- Renders 5 stars, tappable when `onChange` provided
- Warm amber color (`#c97b3a`) for filled stars

### PhotoPicker
- `<input type="file" accept="image/*">` — iOS pops native Camera/Library/Files sheet
- On file select: runs `compressImage(file)` → stores data URL in local state → displays preview
- Shows preview thumbnail + "Remove" button if photo selected

### compressImage(file) → Promise\<string\>
- Draws image to offscreen `<canvas>`, scales to max 800px on longest side
- Encodes as `image/jpeg` at quality 0.7
- Returns data URL

---

## Design System

| Token | Value |
|---|---|
| Background | `#faf7f2` (warm cream) |
| Surface (cards) | `#ffffff` |
| Border | `#e8e0d4` |
| Text primary | `#3d2b1f` (dark brown) |
| Text secondary | `#9b8475` |
| Coffee accent | `#c97b3a` (amber) |
| Matcha accent | `#4a7c59` (muted green) |
| Star color | `#c97b3a` |
| Font | System font stack (`-apple-system, BlinkMacSystemFont, ...`) |

Border radius: 12px cards, 8px inputs, 20px pill badges. No drop shadows except subtle on FAB.

---

## PWA Setup

### manifest.json
```json
{
  "name": "my brew log",
  "short_name": "brew log",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#faf7f2",
  "theme_color": "#faf7f2",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### index.html meta tags (iOS-specific)
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="brew log">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### Service Worker (`public/sw.js`)
- Strategy: cache-first for app shell (HTML, JS, CSS, icons)
- Install event: pre-caches all shell assets
- Fetch event: returns cache hit, falls back to network
- Registered in `main.jsx` on `load` event

---

## Vercel Deployment

`vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

No build plugin needed — Vite's default output (`dist/`) is auto-detected by Vercel.

---

## Constraints & Decisions

- **No TypeScript** — plain JSX throughout, keeps the build simple
- **No UI library** — all styles hand-written in CSS (inline + index.css)
- **No test suite** — out of scope for this version
- **Photo storage limit** — no enforcement; app silently degrades if localStorage is full (write fails). A future version could warn the user.
- **Delete is permanent** — no undo. Confirm dialog is the only guard.
- **Offline** — service worker caches the full app shell. Works offline after first load.
