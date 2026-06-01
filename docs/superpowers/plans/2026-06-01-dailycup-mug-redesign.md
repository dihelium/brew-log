# DailyCup Mug Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the geometric SVG mug in `DailyCup.jsx` with a two-state illustrated mug — an SVG silhouette cross-section view (liquid fill visible) that toggles on tap to reveal the actual mug photo.

**Architecture:** `DailyCup.jsx` is fully rewritten. A single `useState(false)` controls `showPhoto`. The mug stage is a fixed-size `position:relative` div containing two absolutely-positioned layers: Layer A (SVG outline + clipPath fill), Layer B (mug photo). `src/index.css` gets one new keyframe (`springIn`). No other files change.

**Tech Stack:** React 18, Framer Motion (streak chip only), CSS keyframe animations, SVG clipPath, `mix-blend-mode: multiply`

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/components/DailyCup.jsx` | Full rewrite |
| Modify | `src/index.css` | Add `@keyframes springIn` after existing `waveSlide` block |
| None | `src/assets/mug.png` | Already in place — do not touch |
| None | `src/pages/FeedPage.jsx` | Props unchanged — do not touch |

---

## Task 1 — Add `@keyframes springIn` to `src/index.css`

**Files:**
- Modify: `src/index.css` (lines 6–9, after `waveSlide` block)

- [ ] **Step 1: Open `src/index.css`. Find this exact block (lines 6–9):**

```css
@keyframes waveSlide {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

- [ ] **Step 2: Insert the following block immediately after it (after the closing `}`):**

```css
@keyframes springIn {
  0%   { transform: translateY(10px); opacity: 0; }
  65%  { transform: translateY(-2px); opacity: 1; }
  100% { transform: translateY(0);    opacity: 1; }
}
```

The file should now have `steamRise`, `waveSlide`, `springIn` as the first three keyframe blocks in that order.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add springIn keyframe for mug fill animation"
```

---

## Task 2 — Rewrite `src/components/DailyCup.jsx`

**Files:**
- Modify: `src/components/DailyCup.jsx` (full replacement)

### Background — what the component does

**State A (default):** An SVG mug outline (stroke only, transparent body) with liquid fill inside a `<clipPath>`. The fill is 1–3 colour band `<rect>`s rising from the bottom, topped by two animated wave paths. Steam wisps show above the rim when at least one brew is logged. Tapping the mug toggles to State B.

**State B:** The `mug.png` photo displayed at the same position/size, with `mix-blend-mode: multiply` to dissolve its white background on the cream app surface. Tapping returns to State A.

**SVG coordinate system:** `viewBox="0 0 400 400"`. All path coordinates below are in this space.

### Constants (copy exactly)

```js
const FALLBACK  = '#c97b3a'
const MAX_BREWS = 3
const CUP_TOP   = 132   // top y of interior clip path
const CUP_BOT   = 348   // bottom y of interior clip path
const CUP_H     = 216   // CUP_BOT - CUP_TOP
```

### SVG paths (copy exactly — do not alter any coordinate)

**Rim ellipse:**
```
cx="225" cy="107" rx="102" ry="21"
```

**Body outline** (open path — no `Z`, which would draw a horizontal line across the top):
```
M 123 107 L 124 315 Q 125 340 150 345 Q 225 350 300 345 Q 325 340 326 315 L 327 107
```

**Handle outer arc:**
```
M 123 137 C 20 148, 20 285, 123 274
```

**Interior clip path** (liquid fills inside this region — body only, inset ~4 units from walls):
```
M 127 132 L 323 132 L 323 312 Q 322 338 298 343 Q 225 348 152 343 Q 128 338 127 312 Z
```

### Wave helper function

```js
function wave(y, amp, reps = 5, period = 160) {
  let d = `M ${-reps * period},${y}`
  for (let i = 0; i < reps * 2; i++) {
    const x = -reps * period + i * period
    d += ` C ${x + period * 0.25},${y - amp} ${x + period * 0.75},${y + amp} ${x + period},${y}`
  }
  d += ` L ${reps * period},${y + 20} L ${-reps * period},${y + 20} Z`
  return d
}
```

- [ ] **Step 1: Replace the entire contents of `src/components/DailyCup.jsx` with the following:**

```jsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import mugPhoto from '../assets/mug.png'

const FALLBACK  = '#c97b3a'
const MAX_BREWS = 3
const CUP_TOP   = 132
const CUP_BOT   = 348
const CUP_H     = 216   // CUP_BOT - CUP_TOP

function wave(y, amp, reps = 5, period = 160) {
  let d = `M ${-reps * period},${y}`
  for (let i = 0; i < reps * 2; i++) {
    const x = -reps * period + i * period
    d += ` C ${x + period * 0.25},${y - amp} ${x + period * 0.75},${y + amp} ${x + period},${y}`
  }
  d += ` L ${reps * period},${y + 20} L ${-reps * period},${y + 20} Z`
  return d
}

export default function DailyCup({ todayEntries = [], streak = 0 }) {
  const [showPhoto, setShowPhoto] = useState(false)

  const filled = todayEntries.length > 0
  const n      = Math.min(todayEntries.length, MAX_BREWS)

  // Reset to cross-section view whenever brew count changes
  useEffect(() => { setShowPhoto(false) }, [todayEntries.length])

  // Fill geometry
  const fillH  = n === 0 ? 0 : Math.round((n / MAX_BREWS) * CUP_H)
  const fillY  = CUP_BOT - fillH
  const bandH  = n > 0 ? fillH / n : 0

  // Colour bands — index 0 = oldest (bottom), index n-1 = newest (top)
  const bands = todayEntries.slice(0, n).map((entry, i) => ({
    color: entry.color || FALLBACK,
    y:     Math.round(CUP_BOT - (i + 1) * bandH),
    h:     Math.round(bandH) + 2,   // +2 to prevent sub-pixel gaps
  }))

  const topColor = filled ? (todayEntries[n - 1].color || FALLBACK) : FALLBACK

  function handleTap() {
    if (filled) setShowPhoto(p => !p)
  }

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      padding:        '24px 0 20px',
    }}>

      {/* Steam — State A only, when filled */}
      {filled && !showPhoto && (
        <div style={{
          display:   'flex',
          gap:       8,
          marginBottom: 4,
        }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width:        3,
                height:       14,
                borderRadius: 2,
                background:   'var(--text-muted)',
                opacity:      0.45,
                animation:    `steamRise 1.6s ease-in-out ${i * 0.35}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Mug stage — fixed size, layers stacked absolutely */}
      <div
        onClick={handleTap}
        style={{
          position: 'relative',
          width:    200,
          height:   200,
          cursor:   filled ? 'pointer' : 'default',
        }}
      >

        {/* ── Layer A: SVG outline + liquid fill ── */}
        <svg
          viewBox="0 0 400 400"
          width="200"
          height="200"
          style={{
            position: 'absolute',
            inset:    0,
            overflow: 'visible',
            opacity:  showPhoto ? 0 : 1,
            transition: 'opacity 0.22s ease',
            zIndex:   2,
          }}
        >
          <defs>
            <clipPath id="mug-interior-clip">
              <path d="M 127 132 L 323 132 L 323 312 Q 322 338 298 343 Q 225 348 152 343 Q 128 338 127 312 Z"/>
            </clipPath>
          </defs>

          {/* Liquid fill — spring-in when n changes */}
          {filled && (
            <g
              key={n}
              clipPath="url(#mug-interior-clip)"
              style={{
                animation: 'springIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }}
            >
              {/* Colour bands */}
              {bands.map((band, i) => (
                <rect
                  key={i}
                  x={0}
                  y={band.y}
                  width={400}
                  height={band.h}
                  fill={band.color}
                />
              ))}

              {/* Wave 1 — top drink colour, rides the surface */}
              <path
                d={wave(fillY, 8)}
                fill={topColor}
                style={{ animation: 'waveSlide 2.4s linear infinite' }}
              />

              {/* Wave 2 — white shimmer, reverse direction */}
              <path
                d={wave(fillY + 3, 5)}
                fill="rgba(255,255,255,0.18)"
                style={{ animation: 'waveSlide 3.6s linear infinite reverse' }}
              />
            </g>
          )}

          {/* Mug outline — always on top of fill, stroke only */}
          {/* Rim */}
          <ellipse
            cx="225" cy="107" rx="102" ry="21"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="2.5"
          />
          {/* Body */}
          <path
            d="M 123 107 L 124 315 Q 125 340 150 345 Q 225 350 300 345 Q 325 340 326 315 L 327 107"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Handle */}
          <path
            d="M 123 137 C 20 148, 20 285, 123 274"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {/* ── Layer B: mug photo ── */}
        <img
          src={mugPhoto}
          alt="mug"
          draggable={false}
          style={{
            position:     'absolute',
            inset:        0,
            width:        '100%',
            height:       '100%',
            objectFit:    'contain',
            mixBlendMode: 'multiply',
            opacity:      showPhoto ? 1 : 0,
            transition:   'opacity 0.22s ease',
            zIndex:       1,
            userSelect:   'none',
          }}
        />
      </div>

      {/* State hint — only when filled */}
      {filled && (
        <p style={{
          fontSize:   10,
          color:      'var(--text-muted)',
          marginTop:  4,
          fontFamily: 'var(--font-body)',
          fontStyle:  'italic',
          minHeight:  14,
        }}>
          {showPhoto ? 'tap to see inside' : 'tap to see outside'}
        </p>
      )}

      {/* Brew count label */}
      <p style={{
        fontSize:   12,
        color:      'var(--text-muted)',
        marginTop:  filled ? 2 : 8,
        fontFamily: 'var(--font-body)',
      }}>
        {filled
          ? todayEntries.length === 1
            ? "today's brew"
            : `${todayEntries.length} brews today`
          : 'nothing logged yet today'
        }
      </p>

      {/* Streak chip — unchanged */}
      {streak > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          style={{
            marginTop:   8,
            display:     'inline-flex',
            alignItems:  'center',
            gap:         5,
            background:  'var(--surface)',
            border:      '1px solid var(--border)',
            borderRadius: 99,
            padding:     '4px 12px',
            fontSize:    12,
            color:       'var(--text-secondary)',
            fontFamily:  'var(--font-body)',
          }}
        >
          <span style={{ fontSize: 13 }}>📸</span>
          <span>{streak} {streak === 1 ? 'day' : 'days'} logged</span>
        </motion.div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the file saved correctly — check imports at the top:**

The file must start with exactly these three import lines:
```js
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import mugPhoto from '../assets/mug.png'
```

- [ ] **Step 3: Run the dev server and open the app**

```bash
npm run dev
```

Open `http://localhost:5173` (or whichever port Vite reports).

- [ ] **Step 4: Manual smoke test — verify all of the following:**

1. **Empty state:** Feed shows the mug outline (rim ellipse + body + handle, warm grey strokes). No fill, no steam, no state hint. Label reads "nothing logged yet today". Tapping the mug does nothing.

2. **1 brew logged:** Mug fills to bottom ⅓ with the brew's extracted colour. Wave animates at the fill surface. Steam wisps appear above rim. Label reads "today's brew". State hint reads "tap to see outside".

3. **Tap to State B:** Photo of the Starry Night mug fades in (0.22s). SVG fades out. State hint reads "tap to see inside". Steam disappears.

4. **Tap back to State A:** SVG fades back in. Steam reappears. Fill and wave still animating.

5. **2 brews:** Fill rises to ⅔. Two distinct colour bands visible (oldest at bottom). Wave uses newest brew's colour.

6. **3 brews:** Fill is full (to y=132). Three colour bands. Wave at top of clip region.

7. **Brew count change resets view:** While in State B (photo showing), log a new brew — should snap back to State A (cross-section) automatically.

8. **Streak chip:** Shows "📸 N days logged" when streak > 0.

- [ ] **Step 5: Run production build to confirm no errors**

```bash
npm run build
```

Expected: `dist/` folder created, no TypeScript/ESLint errors, no missing import warnings.

- [ ] **Step 6: Commit**

```bash
git add src/components/DailyCup.jsx
git commit -m "feat: replace geometric mug with two-state illustrated mug (cross-section + photo toggle)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Two-state toggle (State A / State B) → Task 2, `showPhoto` state + `handleTap`
  - SVG paths (rim, body, handle, clip) → Task 2, copied verbatim from spec
  - Fill logic (CUP_TOP=132, CUP_BOT=348, CUP_H=216) → Task 2 constants
  - Colour bands (oldest bottom, newest top) → Task 2 `bands` array
  - Wave animation → Task 2 `wave()` helper + two `<path>` elements
  - Spring-in on count change → Task 2, `key={n}` on `<g>` + `springIn` animation
  - Steam (State A only, when filled) → Task 2, conditional on `!showPhoto`
  - `mix-blend-mode: multiply` on photo → Task 2, Layer B `<img>` style
  - Reset to State A on brew count change → Task 2, `useEffect` on `todayEntries.length`
  - Streak chip unchanged → Task 2, copied exactly from existing component
  - `springIn` keyframe → Task 1, added to `src/index.css`
  - No changes to FeedPage / BrewContext / other files → confirmed

- [x] **Placeholder scan:** No TBDs, no "implement later", all code blocks are complete.

- [x] **Type consistency:** `todayEntries`, `streak`, `filled`, `n`, `bands`, `topColor`, `showPhoto` used consistently throughout. `wave()` called identically in both wave paths.

- [x] **`key={n}` on fill `<g>`:** This is the mechanism that re-triggers the `springIn` CSS animation — React unmounts and remounts the `<g>` element when `n` changes, causing the animation to restart from scratch. This is intentional and correct.

- [x] **`clipPath id` uniqueness:** `id="mug-interior-clip"` — if multiple `DailyCup` instances render simultaneously (they won't in this app — only one on FeedPage), SVG clipPath IDs would collide. Not a problem here; no fix needed.
