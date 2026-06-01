# DailyCup Mug Redesign — Design Spec
**Date:** 2026-06-01  
**Status:** Approved  
**Implementer:** Deepseek V4 Flash via Opencode Go

---

## Overview

Replace the current geometric SVG mug in `DailyCup.jsx` with a two-state illustrated mug that uses a real photo (`src/assets/mug.png` — Van Gogh Starry Night mug, 1024×1024 PNG, white background) as the "exterior" view, and a pixel-accurate SVG silhouette trace as the "cross-section" (liquid-fill) view.

---

## Two Visual States

### State A — Default (cross-section / X-ray)
- An SVG outline of the mug: **stroke only, no fill on the body** — the mug interior is transparent
- Liquid fill (colour bands + animated wave) renders inside the mug silhouette via `<clipPath>`
- Steam wisps animate above the rim when at least 1 brew is logged
- This is the state shown on the feed at all times when not tapped

### State B — Exterior (tap to reveal)
- The actual `mug.png` photo is shown at the same size and position as the SVG
- `mix-blend-mode: multiply` removes the white background on the app's cream surface
- No liquid visible — this is the "outside of the mug" view
- Tapping again returns to State A

**Tap rule:** tapping only toggles when `todayEntries.length > 0`. An empty mug is not tappable.

---

## SVG Geometry

All coordinates are in `viewBox="0 0 400 400"` space. Derived from a pixel-accurate trace of the 1024×1024 mug PNG by Claude Opus 4.8, confirmed visually by the user.

```
Rim ellipse:
  <ellipse cx="225" cy="107" rx="102" ry="21"/>

Body outline (open path — no Z, no horizontal top line):
  <path d="M 123 107 L 124 315 Q 125 340 150 345 Q 225 350 300 345 Q 325 340 326 315 L 327 107"/>

Handle outer arc:
  <path d="M 123 137 C 20 148, 20 285, 123 274"/>

Interior clip path (liquid fill clips here — body only, inset ~4 units):
  <path d="M 127 132 L 323 132 L 323 312 Q 322 338 298 343 Q 225 348 152 343 Q 128 338 127 312 Z"/>
```

**Do NOT include** the handle inner arc or close the body path with `Z`.

---

## Fill Logic

Constants derived from the interior clip path:
```js
const CUP_TOP  = 132   // y of clip top
const CUP_BOT  = 348   // y of clip bottom  
const CUP_H    = 216   // CUP_BOT - CUP_TOP
const MAX_BREWS = 3
const FALLBACK  = '#c97b3a'
```

Fill height per brew count:
- 0 brews → no fill, `fillGroup` opacity 0
- 1 brew  → `fillH = 72`  (⅓ of CUP_H), `fillY = 276`
- 2 brews → `fillH = 144` (⅔ of CUP_H), `fillY = 204`
- 3 brews → `fillH = 216` (full),         `fillY = 132`

Colour bands (oldest brew = bottom, newest = top):
- Each band is a `<rect>` with `y = CUP_BOT - (i+1) * bandH`, `height = bandH + 2` (overlap to avoid gaps)
- Colour = `entry.color || FALLBACK`
- Up to 3 bands, one per brew

Wave paths (4-period seamless loop, clips to interior):
- Wave 1: `fill = topColor`, `animation: waveSlide 2.4s linear infinite`
- Wave 2: `fill = rgba(255,255,255,0.18)`, `animation: waveSlide 3.6s linear infinite reverse`
- Wave period = 160 SVG units, amplitude = 8 (wave1) / 5 (wave2)

Spring-in animation on fill group when brew count changes (re-triggers by removing/re-adding CSS animation):
```css
@keyframes springIn {
  0%   { transform: translateY(10px); opacity: 0; }
  65%  { transform: translateY(-2px); opacity: 1; }
  100% { transform: translateY(0);   opacity: 1; }
}
/* applied as: animation: springIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards */
```

---

## Steam

3 thin rects above the rim, visible only in **State A** when `filled === true`:
- Positioned above cy=107 (rim top), centred on cx=225
- `animation: steamRise 1.6s ease-in-out Xs infinite` with staggered delays 0s / 0.35s / 0.7s
- `steamRise` keyframe already exists in `src/index.css` — do not add it again

---

## Mug Photo Display (State B)

```jsx
<img
  src={mugPhoto}  // imported: import mugPhoto from '../assets/mug.png'
  style={{
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    mixBlendMode: 'multiply',
    opacity: showPhoto ? 1 : 0,
    transition: 'opacity 0.22s ease',
    zIndex: 1,
  }}
  alt="mug"
  draggable={false}
/>
```

The SVG layer sits at `zIndex: 2` on top of the photo layer. When `showPhoto` is true, SVG opacity → 0, photo opacity → 1.

---

## Component Props (unchanged from current)

```ts
DailyCup({ todayEntries: Entry[], streak: number })
```

`Entry` shape: `{ id, type, name, timestamp, color?, photo?, rating?, notes? }`

---

## State

One new piece of local state:
```js
const [showPhoto, setShowPhoto] = useState(false)
```

Toggle handler:
```js
function handleTap() {
  if (todayEntries.length > 0) setShowPhoto(p => !p)
}
```

Reset to State A when brew count changes (add to effect or derived logic):
```js
// Reset to cross-section view whenever entry count changes
useEffect(() => { setShowPhoto(false) }, [todayEntries.length])
```

---

## Files Changed

| File | Change |
|---|---|
| `src/components/DailyCup.jsx` | Full rewrite — see implementation plan |
| `src/index.css` | Add `@keyframes springIn` (waveSlide and steamRise already present) |
| `src/assets/mug.png` | Already in place — no change |

**No changes** to: `FeedPage.jsx`, `BrewContext.jsx`, `AddPage.jsx`, `ColorPicker.jsx`, `streakCalc.js`, `extractColor.js`

---

## What Is Preserved From Current DailyCup

- `buildGradient` / colour band logic (adapted to rect-based fill)
- `steamRise` animation refs
- `waveSlide` animation refs  
- Streak chip (markup and Framer Motion animation unchanged)
- Label text ("today's brew" / "N brews today" / "nothing logged yet today")
- All props (`todayEntries`, `streak`)
- Outer layout div (flex column, centre-aligned, padding)

---

## What Is Replaced

- The entire SVG mug geometry (old trapezoid/handle paths → Opus-traced paths)
- `foreignObject` + CSS gradient fill → `<rect>` bands clipped via `<clipPath>`
- `buildGradient()` function → removed (not needed with rect-band approach)
- `buildWavePath()` function → replaced with inline `wave()` helper
- No `motion.g` wrapper for fill (spring handled via CSS animation instead)
