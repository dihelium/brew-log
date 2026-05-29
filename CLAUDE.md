# my brew log — feature spec: layered cup + photo streak + colour picker

> **Read this fully before touching any file.**
> This spec builds on top of the existing redesign (DM fonts, Framer Motion, bottom sheet).
> That redesign must be complete before starting these tasks.
> Work through tasks in order. Commit after every task.

---

## What we are building

Three linked features:

1. **Layered daily cup** — a cup SVG sits at the top of FeedPage showing today's coffees as stacked colour bands. One coffee = full cup in that coffee's colour. Two coffees = the first coffee fills the bottom half, the second sits on top. Three = three equal bands. The cup is always shown; it appears as an empty outline until today's first log.

2. **Colour picker** — when a photo is added in AddPage, the dominant colour is auto-extracted from the centre of the image using Canvas. This becomes the entry's `color` field. The user can override by tapping "Pick from photo", which activates an eyedropper mode: touching anywhere on the photo image shows a circular magnifier with the sampled colour; releasing locks it in. Identical UX to the Instagram Stories colour dropper.

3. **Photo streak** — counts consecutive "coffee days" (calendar days that have at least one entry) where every entry for that day has a photo. Days with no entries are transparent and do not break the streak. The streak breaks the moment any coffee day has an entry without a photo. A single chip on FeedPage shows the count.

---

## New files to create

| File | Purpose |
|---|---|
| `src/utils/extractColor.js` | Canvas-based dominant colour + point-sample functions |
| `src/utils/streakCalc.js` | Photo streak calculation from entries array |
| `src/components/DailyCup.jsx` | Layered cup SVG + today's label + streak chip |
| `src/components/ColorPicker.jsx` | Auto-extract + eyedropper UI rendered below photo in AddPage |

## Existing files to modify

| File | Change |
|---|---|
| `src/context/BrewContext.jsx` | Add `color` field to entry schema in `addEntry` |
| `src/pages/AddPage.jsx` | Import `ColorPicker`, add `color` state, pass to `addEntry` |
| `src/pages/FeedPage.jsx` | Import `DailyCup`, render it between header and entry list |

---

## Task 1 — `src/utils/extractColor.js`

Create this file in full:

```js
/**
 * extractDominantColor
 * Samples the centre 50% of an image (where the drink usually is),
 * averages non-near-black / non-near-white pixels, returns a hex string.
 * Falls back to '#c97b3a' (coffee brown) if sampling fails.
 */
export function extractDominantColor(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      try {
        const SIZE = 60
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        // Draw only the centre 50% of the image
        const sx = img.width * 0.25
        const sy = img.height * 0.25
        const sw = img.width * 0.5
        const sh = img.height * 0.5
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SIZE, SIZE)
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2]
          const brightness = (pr + pg + pb) / 3
          // Skip near-black (<40) and near-white (>210)
          if (brightness >= 40 && brightness <= 210) {
            r += pr; g += pg; b += pb; count++
          }
        }
        if (count === 0) { resolve('#c97b3a'); return }
        resolve(toHex(Math.round(r / count), Math.round(g / count), Math.round(b / count)))
      } catch {
        resolve('#c97b3a')
      }
    }
    img.onerror = () => resolve('#c97b3a')
    img.src = dataUrl
  })
}

/**
 * buildPickerCanvas
 * Draws a dataUrl image onto an offscreen canvas and returns { canvas, ctx }.
 * Call once when eyedropper mode starts; then use sampleCanvasAt for each move.
 */
export function buildPickerCanvas(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve({ canvas, ctx })
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

/**
 * sampleCanvasAt
 * Synchronously samples a pixel from a pre-built canvas.
 * imgEl: the <img> DOM element shown to the user (for bounding rect math).
 * clientX/clientY: pointer position.
 * Returns a hex colour string.
 */
export function sampleCanvasAt(ctx, canvas, imgEl, clientX, clientY) {
  try {
    const rect = imgEl.getBoundingClientRect()
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const x = Math.floor(relX * (canvas.width - 1))
    const y = Math.floor(relY * (canvas.height - 1))
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
    return toHex(r, g, b)
  } catch {
    return '#c97b3a'
  }
}

function toHex(r, g, b) {
  return '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')
}
```

- [ ] Create `src/utils/extractColor.js` with the code above
- [ ] Commit: `feat: add canvas colour extraction and eyedropper utilities`

---

## Task 2 — `src/utils/streakCalc.js`

```js
/**
 * calcPhotoStreak
 * Returns the number of consecutive "coffee days" (going back from today)
 * where every entry for that day has a photo.
 *
 * Rules:
 * - A day with no entries is transparent — does not break or increment the streak.
 * - A day with entries where ALL have photos → streak++, continue.
 * - A day with entries where ANY lacks a photo → streak broken, stop.
 */
export function calcPhotoStreak(entries) {
  if (!entries || entries.length === 0) return 0

  // Group entries by calendar date string (e.g. "Mon May 27 2026")
  const byDate = {}
  for (const e of entries) {
    const key = new Date(e.timestamp).toDateString()
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(e)
  }

  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  for (let i = 0; i < 366; i++) {
    const key = cursor.toDateString()
    const dayEntries = byDate[key]

    if (!dayEntries) {
      // No coffee this day — transparent
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    const allPhotographed = dayEntries.every(e => !!e.photo)
    if (allPhotographed) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break // coffee day with unlogged photo — streak ends
    }
  }

  return streak
}
```

- [ ] Create `src/utils/streakCalc.js` with the code above
- [ ] Commit: `feat: add photo streak calculator`

---

## Task 3 — `src/components/DailyCup.jsx`

This component renders on FeedPage. It receives `todayEntries` (array of today's entries in chronological order, oldest first) and `streak` (number from `calcPhotoStreak`).

The cup SVG uses a `<clipPath>` to clip a filled rect to the cup interior. The fill is a CSS `linear-gradient` applied via `style` on a `<foreignObject>` div — this works in modern Safari/Chrome. The gradient direction is bottom-to-top so the first (oldest) coffee sits at the bottom.

When `todayEntries` is empty, the cup renders as an outline only (ghost state). When filled, a gentle steam CSS animation plays above the rim.

```jsx
import { motion } from 'framer-motion'

const FALLBACK = '#c97b3a'

function buildGradient(entries) {
  if (entries.length === 0) return null
  if (entries.length === 1) return entries[0].color || FALLBACK
  const n = entries.length
  const stops = entries.map((e, i) => {
    const color = e.color || FALLBACK
    const from = Math.round((i / n) * 100)
    const to = Math.round(((i + 1) / n) * 100)
    return `${color} ${from}% ${to}%`
  })
  return `linear-gradient(to top, ${stops.join(', ')})`
}

export default function DailyCup({ todayEntries = [], streak = 0 }) {
  const filled = todayEntries.length > 0
  const gradient = buildGradient(todayEntries)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 0 20px',
    }}>
      {/* Cup SVG */}
      <div style={{ position: 'relative', width: 96, height: 116 }}>
        {/* Steam — only when filled */}
        {filled && (
          <div style={{
            position: 'absolute',
            top: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
          }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: 14,
                  borderRadius: 2,
                  background: 'var(--text-muted)',
                  opacity: 0.45,
                  animation: `steamRise 1.6s ease-in-out ${i * 0.35}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        <svg
          viewBox="0 0 96 110"
          width="96"
          height="110"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* Clip path matches the cup interior exactly */}
            <clipPath id="cup-interior-clip">
              <path d="M 14 20 L 19 96 Q 48 108 77 96 L 82 20 Z" />
            </clipPath>
          </defs>

          {/* Liquid fill — foreignObject lets us use CSS gradient */}
          {filled && (
            <foreignObject
              x="14" y="20" width="68" height="76"
              clipPathUnits="userSpaceOnUse"
              style={{ clipPath: 'url(#cup-interior-clip)' }}
            >
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  width: '100%',
                  height: '100%',
                  background: gradient,
                }}
              />
            </foreignObject>
          )}

          {/* Cup outline — always visible */}
          {/* Rim */}
          <rect
            x="10" y="14" width="76" height="9" rx="4.5"
            fill={filled ? 'var(--surface-raised)' : 'var(--surface)'}
            stroke="var(--border-strong)"
            strokeWidth="1.5"
          />
          {/* Body */}
          <path
            d="M 14 20 L 19 96 Q 48 108 77 96 L 82 20 Z"
            fill={filled ? 'none' : 'var(--surface)'}
            stroke="var(--border-strong)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Handle */}
          <path
            d="M 82 36 Q 100 36 100 58 Q 100 80 82 80"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Label */}
      <p style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        marginTop: 8,
        fontFamily: 'var(--font-body)',
      }}>
        {filled
          ? todayEntries.length === 1
            ? 'today\'s brew'
            : `${todayEntries.length} brews today`
          : 'nothing logged yet today'
        }
      </p>

      {/* Streak chip — only shown when streak > 0 */}
      {streak > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          style={{
            marginTop: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 99,
            padding: '4px 12px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span style={{ fontSize: 13 }}>📸</span>
          <span>
            {streak} {streak === 1 ? 'day' : 'days'} logged
          </span>
        </motion.div>
      )}
    </div>
  )
}
```

Also add this CSS keyframe to `src/index.css`:

```css
@keyframes steamRise {
  0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.45; }
  50%       { transform: translateY(-7px) scaleY(1.15); opacity: 0.15; }
}
```

- [ ] Create `src/components/DailyCup.jsx` with the code above
- [ ] Add `@keyframes steamRise` to `src/index.css`
- [ ] Commit: `feat: add DailyCup component with layered gradient and streak chip`

---

## Task 4 — `src/components/ColorPicker.jsx`

This component is rendered in AddPage immediately below the photo preview (only when a photo exists). It shows the auto-extracted colour swatch, a label, and a "Pick from photo" button. Pressing that button enters eyedropper mode: the photo is displayed again with pointer events active; moving a finger shows a circular magnifier near the touch point; releasing sets the colour.

The component receives:
- `photoDataUrl` — the compressed photo string from AddPage state
- `color` — current hex colour string
- `onChange(hex)` — called when colour changes (both auto-extract result and manual picks)

Auto-extraction runs once when `photoDataUrl` first appears (via `useEffect`).

```jsx
import { useState, useEffect, useRef } from 'react'
import { extractDominantColor, buildPickerCanvas, sampleCanvasAt } from '../utils/extractColor'

export default function ColorPicker({ photoDataUrl, color, onChange }) {
  const [picking, setPicking] = useState(false)
  const [magnifier, setMagnifier] = useState(null) // { x, y, color }
  const pickerRef = useRef(null)   // <img> element in eyedropper mode
  const canvasRef = useRef(null)   // { canvas, ctx } built on pick start
  const ctxRef = useRef(null)

  // Auto-extract dominant colour whenever the photo changes
  useEffect(() => {
    if (!photoDataUrl) return
    extractDominantColor(photoDataUrl).then(onChange)
  }, [photoDataUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  async function startPicking() {
    const result = await buildPickerCanvas(photoDataUrl)
    if (!result) return
    canvasRef.current = result.canvas
    ctxRef.current = result.ctx
    setPicking(true)
    setMagnifier(null)
  }

  function handlePointerMove(e) {
    e.preventDefault()
    if (!ctxRef.current || !canvasRef.current || !pickerRef.current) return
    const touch = e.touches ? e.touches[0] : e
    const sampled = sampleCanvasAt(
      ctxRef.current,
      canvasRef.current,
      pickerRef.current,
      touch.clientX,
      touch.clientY,
    )
    const rect = pickerRef.current.getBoundingClientRect()
    setMagnifier({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
      color: sampled,
    })
  }

  function handlePointerUp(e) {
    e.preventDefault()
    if (!ctxRef.current || !canvasRef.current || !pickerRef.current) return
    const touch = e.changedTouches ? e.changedTouches[0] : e
    const sampled = sampleCanvasAt(
      ctxRef.current,
      canvasRef.current,
      pickerRef.current,
      touch.clientX,
      touch.clientY,
    )
    onChange(sampled)
    setPicking(false)
    setMagnifier(null)
  }

  if (!photoDataUrl) return null

  return (
    <div style={{ marginTop: 12 }}>
      {/* Swatch row — always visible */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
      }}>
        {/* Colour swatch */}
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: color || '#c97b3a',
          border: '2px solid var(--border-strong)',
          flexShrink: 0,
        }} />
        <span style={{
          flex: 1,
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
          Drink colour
        </span>
        <button
          type="button"
          onClick={startPicking}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 12,
            color: 'var(--accent-coffee)',
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            padding: '4px 0',
            fontWeight: 500,
          }}
        >
          Pick from photo
        </button>
      </div>

      {/* Eyedropper overlay — shown when picking=true */}
      {picking && (
        <div style={{ marginTop: 8, position: 'relative', userSelect: 'none' }}>
          <p style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
            marginBottom: 6,
            textAlign: 'center',
          }}>
            Touch the photo to pick a colour
          </p>
          <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {/* The photo with pointer events */}
            <img
              ref={pickerRef}
              src={photoDataUrl}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                display: 'block',
                cursor: 'crosshair',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                touchAction: 'none',
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />

            {/* Magnifier circle — follows finger */}
            {magnifier && (
              <div
                style={{
                  position: 'absolute',
                  left: magnifier.x - 26,
                  top: magnifier.y - 56,     // above the finger
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: magnifier.color,
                  border: '3px solid white',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.28)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>

          {/* Cancel */}
          <button
            type="button"
            onClick={() => { setPicking(false); setMagnifier(null) }}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '10px',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] Create `src/components/ColorPicker.jsx` with the code above
- [ ] Commit: `feat: add ColorPicker with auto-extract and eyedropper`

---

## Task 5 — Update `src/context/BrewContext.jsx`

Add `color` to the entry object created in `addEntry`. The field is optional — if not passed, it is omitted (existing entries without a color field will still render fine; components fall back to `'#c97b3a'`).

Find the `addEntry` function in `BrewContext.jsx`. It currently looks like:

```js
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
```

Replace it with:

```js
function addEntry({ type, name, photo, rating, notes, color }) {
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
      ...(color != null && { color }),
    },
  })
}
```

- [ ] Make the above change to `src/context/BrewContext.jsx`
- [ ] Commit: `feat: add color field to BrewContext entry schema`

---

## Task 6 — Update `src/pages/AddPage.jsx`

Three changes:
1. Add `color` state (default `'#c97b3a'`)
2. Import and render `<ColorPicker>` immediately after `<PhotoPicker>` in the form
3. Pass `color` to `addEntry`

**Import additions** at top of file — add:
```js
import ColorPicker from '../components/ColorPicker'
```

**State addition** inside the component, alongside existing state declarations:
```js
const [color, setColor] = useState('#c97b3a')
```

**In `handleSave`** — update the `addEntry` call to include color:
```js
addEntry({
  type,
  name: name.trim(),
  ...(photo && { photo }),
  ...(rating > 0 && { rating }),
  ...(notes.trim() && { notes: notes.trim() }),
  color,
})
```

**In the JSX**, immediately after the `<PhotoPicker>` closing tag (inside the Photo `<div>` section), add:
```jsx
<ColorPicker
  photoDataUrl={photo}
  color={color}
  onChange={setColor}
/>
```

`ColorPicker` returns `null` when `photoDataUrl` is falsy, so it only appears after a photo is selected. No conditional wrapping needed here.

- [ ] Apply the three changes above to `src/pages/AddPage.jsx`
- [ ] Commit: `feat: integrate ColorPicker into AddPage`

---

## Task 7 — Update `src/pages/FeedPage.jsx`

Two additions: import and render `<DailyCup>` between the page header and the entry list.

**Import additions** at top of file:
```js
import DailyCup from '../components/DailyCup'
import { calcPhotoStreak } from '../utils/streakCalc'
```

**Derived values** inside the component, before the return statement:
```js
const todayStr = new Date().toDateString()
const todayEntries = [...entries]
  .filter(e => new Date(e.timestamp).toDateString() === todayStr)
  .sort((a, b) => a.timestamp - b.timestamp) // oldest first = bottom of cup

const streak = calcPhotoStreak(entries)
```

**In the JSX**, place `<DailyCup>` after the sticky header `<div>` and before the empty-state check / entry list. The FeedPage currently has a structure like:

```jsx
<div style={{ minHeight: '100dvh', ... }}>
  {/* Header */}
  <div style={{ ... }}>...</div>

  {/* Empty state / entry list */}
  ...
```

Insert `<DailyCup>` between the header and the empty-state block:

```jsx
<DailyCup todayEntries={todayEntries} streak={streak} />
```

Add a visual separator between DailyCup and the entry list — a thin border or padding. The simplest approach: add `borderTop: '1px solid var(--border)'` to the outer div that wraps the entry list (the one that holds the mapped `<EntryCard>` components).

- [ ] Apply the above changes to `src/pages/FeedPage.jsx`
- [ ] Commit: `feat: add DailyCup and photo streak to FeedPage`

---

## Task 8 — Smoke test

- [ ] Run `npm run dev`
- [ ] Verify:
  1. FeedPage shows the empty cup outline above the entry list
  2. Tap `+` → bottom sheet opens
  3. Add name + photo → ColorPicker swatch appears below photo with auto-extracted colour
  4. Tap "Pick from photo" → eyedropper mode activates, magnifier follows finger, releasing locks colour
  5. Tap "Log it" → returns to feed, cup fills with the entry's colour, steam animates
  6. Add a second entry with a different photo → cup shows two colour bands (first coffee on bottom, second on top)
  7. Streak chip shows "📸 1 day logged" after the first day is complete
  8. Entries without a photo do not increment the streak (test: delete photo before saving)
- [ ] Run `npm run build` — no errors
- [ ] Commit: `chore: smoke test verified — layered cup, colour picker, photo streak`

---

## Task 9 — Dynamic wave fill for DailyCup

> **All prior tasks (1–8) are complete. Start here.**
> Only two files change: `src/components/DailyCup.jsx` and `src/index.css`.

### What this task does

Replaces the static flat-topped liquid fill with:
1. **Proportional fill level** — 1 brew = bottom ⅓, 2 brews = bottom ⅔, 3 brews = full. Currently 1 brew fills to the brim.
2. **Animated wave surface** — two overlapping sine-wave SVG paths at the liquid surface, CSS-animated horizontally in an infinite loop.
3. **Fill-rise animation** — when a new entry is logged, the fill springs upward via Framer Motion.
4. **Layered colour bands unchanged** — each drink keeps its own extracted colour as a distinct horizontal band, oldest at bottom, newest at top. This logic is preserved exactly; only the rendering technique changes.

---

### Cup geometry constants (do not change these — they match the existing SVG paths)

```
viewBox: "0 0 96 110"
Cup interior path: "M 14 20 L 19 96 Q 48 108 77 96 L 82 20 Z"

CUP_TOP = 20    ← y-coordinate of the interior top rim
CUP_BOT = 96    ← y-coordinate of the interior bottom
CUP_H   = 76    ← CUP_BOT − CUP_TOP
MAX_BREWS = 3
FALLBACK = '#c97b3a'
```

---

### Step 1 — Add `@keyframes waveSlide` to `src/index.css`

Add this block **after** the existing `@keyframes steamRise` rule at the top of the file:

```css
@keyframes waveSlide {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

---

### Step 2 — Rewrite `src/components/DailyCup.jsx`

Replace the entire file with the following. Read each section carefully before writing.

```jsx
import { motion } from 'framer-motion'

const FALLBACK = '#c97b3a'
const MAX_BREWS = 3
const CUP_TOP = 20
const CUP_BOT = 96
const CUP_H = CUP_BOT - CUP_TOP  // 76

/**
 * buildWavePath
 * Returns an SVG path string for a sine-like wave that fills downward from y.
 * The path is 4 periods wide (192px for period=48), allowing translateX(-50%)
 * to loop seamlessly — 2 periods shift = identical wave shape.
 */
function buildWavePath(y, amplitude = 6, period = 48, reps = 4) {
  let d = `M 0,${y}`
  for (let i = 0; i < reps; i++) {
    const x0 = i * period
    d += ` C ${x0 + 12},${y - amplitude} ${x0 + 36},${y + amplitude} ${x0 + period},${y}`
  }
  d += ` L ${reps * period},200 L 0,200 Z`
  return d
}

export default function DailyCup({ todayEntries = [], streak = 0 }) {
  const filled = todayEntries.length > 0
  const n = Math.min(todayEntries.length, MAX_BREWS)

  // Fill level: proportional to number of brews (max MAX_BREWS)
  const fillH = n === 0 ? 0 : Math.round((n / MAX_BREWS) * CUP_H)
  const fillY = CUP_BOT - fillH   // y-coordinate of the liquid surface

  // Colour bands — oldest drink (index 0) at bottom, newest at top
  const bands = todayEntries.slice(0, n).map((entry, i) => {
    const yBottom = Math.round(CUP_BOT - (i / n) * fillH)
    const yTop    = Math.round(CUP_BOT - ((i + 1) / n) * fillH)
    return { color: entry.color || FALLBACK, y: yTop, h: yBottom - yTop }
  })

  const topColor = filled ? (todayEntries[n - 1].color || FALLBACK) : FALLBACK

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 0 20px',
    }}>
      {/* Cup SVG */}
      <div style={{ position: 'relative', width: 96, height: 116 }}>
        {/* Steam — only when filled */}
        {filled && (
          <div style={{
            position: 'absolute',
            top: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
          }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: 14,
                  borderRadius: 2,
                  background: 'var(--text-muted)',
                  opacity: 0.45,
                  animation: `steamRise 1.6s ease-in-out ${i * 0.35}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        <svg
          viewBox="0 0 96 110"
          width="96"
          height="110"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <clipPath id="cup-interior-clip">
              <path d="M 14 20 L 19 96 Q 48 108 77 96 L 82 20 Z" />
            </clipPath>
          </defs>

          {/* Liquid fill — springs in when entry count changes */}
          {filled && (
            <motion.g
              key={n}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            >
              <g clipPath="url(#cup-interior-clip)">
                {/* Colour bands — one rect per drink */}
                {bands.map((band, i) => (
                  <rect
                    key={i}
                    x={0}
                    y={band.y}
                    width={96}
                    height={band.h}
                    fill={band.color}
                  />
                ))}

                {/* Wave 1 — top drink colour, rides the liquid surface */}
                <path
                  d={buildWavePath(fillY)}
                  fill={topColor}
                  style={{ animation: 'waveSlide 2.4s linear infinite' }}
                />

                {/* Wave 2 — lighter shimmer, runs in reverse for depth */}
                <path
                  d={buildWavePath(fillY + 2)}
                  fill="rgba(255,255,255,0.18)"
                  style={{ animation: 'waveSlide 3.6s linear infinite reverse' }}
                />
              </g>
            </motion.g>
          )}

          {/* Cup outline — always on top */}
          {/* Rim */}
          <rect
            x="10" y="14" width="76" height="9" rx="4.5"
            fill={filled ? 'var(--surface-raised)' : 'var(--surface)'}
            stroke="var(--border-strong)"
            strokeWidth="1.5"
          />
          {/* Body */}
          <path
            d="M 14 20 L 19 96 Q 48 108 77 96 L 82 20 Z"
            fill={filled ? 'none' : 'var(--surface)'}
            stroke="var(--border-strong)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Handle */}
          <path
            d="M 82 36 Q 100 36 100 58 Q 100 80 82 80"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Label */}
      <p style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        marginTop: 8,
        fontFamily: 'var(--font-body)',
      }}>
        {filled
          ? todayEntries.length === 1
            ? "today's brew"
            : `${todayEntries.length} brews today`
          : 'nothing logged yet today'
        }
      </p>

      {/* Streak chip — only shown when streak > 0 */}
      {streak > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          style={{
            marginTop: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 99,
            padding: '4px 12px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span style={{ fontSize: 13 }}>📸</span>
          <span>
            {streak} {streak === 1 ? 'day' : 'days'} logged
          </span>
        </motion.div>
      )}
    </div>
  )
}
```

---

### Checklist

- [ ] Add `@keyframes waveSlide` to `src/index.css` (after `steamRise`)
- [ ] Replace `src/components/DailyCup.jsx` with the code above
- [ ] Run `npm run dev` and verify:
  1. Empty cup shows outline only (no fill, no wave)
  2. Log 1 brew → cup fills bottom ⅓ with that drink's extracted colour, wave animates at the surface
  3. Log 2 brews → cup fills bottom ⅔, two distinct colour bands visible, wave uses newest drink's colour
  4. Log 3 brews → cup is full, three distinct colour bands visible, wave at rim
  5. Steam appears when filled
  6. Streak chip still shows when streak > 0
- [ ] Run `npm run build` — no errors
- [ ] Commit: `feat: dynamic wave fill — proportional bands + animated surface`