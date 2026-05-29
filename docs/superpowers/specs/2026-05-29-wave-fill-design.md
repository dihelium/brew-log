---
name: wave-fill-design
description: Dynamic Waterllama-style wave fill for DailyCup — layered colour bands + animated wave surface + proportional fill level
metadata:
  type: project
---

# Dynamic wave fill for DailyCup

**Date:** 2026-05-29  
**Status:** Approved — ready for implementation

## What we're building

Replace the static flat-top liquid fill in `DailyCup` with:

1. **Proportional fill level** — 1 brew fills the bottom ⅓, 2 brews ⅔, 3 brews full (currently 1 brew fills to the brim).
2. **Animated wave surface** — two overlapping sine-wave SVG paths at the liquid surface, CSS-animated with `translateX`, running continuously on the GPU compositor thread.
3. **Fill-rise animation** — when a new entry is logged, the fill group springs upward via Framer Motion.
4. **Layered colour bands preserved** — each drink keeps its own extracted colour as a distinct horizontal band (oldest at bottom, newest at top). No mixing, no averaging. This already works in the app; we are not changing the band logic, only the rendering technique.

## Design decisions

- **Remove `foreignObject`** — replaced with plain SVG `<rect>` elements per band, all clipped by the existing `cup-interior-clip`. This is necessary so the wave `<path>` can sit in the same SVG layer stack above the band rects.
- **Wave colour** — the wave path uses the newest drink's colour (`todayEntries[n-1].color`), so it blends naturally with the top band. A second lighter wave layer runs in reverse for depth.
- **Max 3 brews per day** — hardcoded as `MAX_BREWS = 3`. If more than 3 entries exist, all are shown as equal bands within the full cup height (the proportional capping only affects fill level, not band count).
- **`buildGradient()` deleted** — no longer needed.
- **Battery cost** — wave runs via CSS `transform: translateX` on the GPU compositor thread, ~1% CPU, ~0.05%/hr battery overhead.

## Cup geometry reference

```
viewBox: "0 0 96 110"
Cup interior path: "M 14 20 L 19 96 Q 48 108 77 96 L 82 20 Z"
  CUP_TOP = 20   (y of interior top rim)
  CUP_BOT = 96   (y of interior bottom)
  CUP_H   = 76   (total interior height in SVG units)
```

## Fill level math

```js
const MAX_BREWS = 3
const CUP_TOP = 20
const CUP_BOT = 96
const CUP_H   = 76   // CUP_BOT - CUP_TOP

const n     = Math.min(todayEntries.length, MAX_BREWS)
const fillH = n === 0 ? 0 : Math.round((n / MAX_BREWS) * CUP_H)
const fillY = CUP_BOT - fillH   // y-coordinate of liquid surface
```

## Colour band math

`todayEntries` is sorted oldest-first (bottom of cup = index 0).

```js
const bands = todayEntries.slice(0, n).map((entry, i) => {
  const yBottom = Math.round(CUP_BOT - (i / n) * fillH)
  const yTop    = Math.round(CUP_BOT - ((i + 1) / n) * fillH)
  return { color: entry.color || FALLBACK, y: yTop, h: yBottom - yTop }
})
// bands[0] = oldest drink = bottom band
// bands[n-1] = newest drink = top band (wave sits here)
```

## Wave path generation

```js
function buildWavePath(y, amplitude = 6, period = 48, reps = 4) {
  // Creates a sine-like wave 2× the viewBox width (192px).
  // translateX(-50%) = -96px = exactly 2 periods → seamless loop.
  let d = `M 0,${y}`
  for (let i = 0; i < reps; i++) {
    const x0 = i * period
    d += ` C ${x0 + 12},${y - amplitude} ${x0 + 36},${y + amplitude} ${x0 + period},${y}`
  }
  d += ` L ${reps * period},200 L 0,200 Z`
  return d
}
```

## CSS keyframe (add to index.css)

```css
@keyframes waveSlide {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

## Fill group JSX structure

```jsx
{filled && (
  <motion.g
    key={n}
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 280, damping: 20 }}
  >
    {/* Colour bands — clipped to cup interior */}
    <g clipPath="url(#cup-interior-clip)">
      {bands.map((band, i) => (
        <rect key={i} x={0} y={band.y} width={96} height={band.h} fill={band.color} />
      ))}

      {/* Wave 1 — top drink colour */}
      <path
        d={buildWavePath(fillY)}
        fill={bands[n - 1].color}
        style={{ animation: 'waveSlide 2.4s linear infinite' }}
      />

      {/* Wave 2 — shimmer layer */}
      <path
        d={buildWavePath(fillY + 2)}
        fill="rgba(255,255,255,0.18)"
        style={{ animation: 'waveSlide 3.6s linear infinite reverse' }}
      />
    </g>
  </motion.g>
)}
```

## Files changed

| File | Change |
|---|---|
| `src/components/DailyCup.jsx` | Remove `buildGradient`, remove `foreignObject`, add fill math + band calculation + wave path builder + `motion.g` fill group |
| `src/index.css` | Add `@keyframes waveSlide` |

No other files change.
