# Code Review: Distinct Default Colours for Demo Latte and Cappuccino

**Review Date**: 2026-07-16
**Version**: 0.5.1
**Plan**: no plan — unplanned cosmetic fix
**Codex loop**: skipped — trivial change

**Files Reviewed**:

- `scripts/extract-demo-photos.mjs`
- `src/lib/demoData.js`

---

## Executive Summary

The two demo coffee brews both carried `#c97b3a` — the app's coffee accent fallback (`--accent-coffee`, `src/index.css:32`) — because their source backup entries had no custom colour, leaving them visually identical. The fix adds an optional per-brew `color` override in the demo-data generator and regenerates `src/lib/demoData.js`, giving the Orange Spiced Cappuccino a warmer orange (`#d9772b`) and the Vanilla Latte a lighter beige (`#c99a6c`). APPROVED with observations.

---

## Changes Overview

`scripts/extract-demo-photos.mjs` gains an optional `color` field per selection entry, applied as `color: color ?? source.color ?? null` so an explicit override wins over the backup value. `src/lib/demoData.js` (a generated file) was regenerated from `brew-log-backup-2026-06-20.json`; only the two `color` lines changed — the base64 photo payloads are byte-identical. No runtime, schema, sync, or component code was touched.

---

## Findings

### Critical Issues

None.

### Major Issues

None.

### Minor Issues

None.

### Suggestions

- The chosen hexes were selected for clear visual separation (orange vs. beige) rather than sampled from the photos; the values are easy to nudge from the generator's `selections` list if the reviewer wants a different shade after seeing them in demo mode.

---

## Checklist

- [x] 1. Functional Requirements — passed (two demo coffees now render distinct colours)
- [x] 2. Code Quality — passed (override kept in the generator; generated file not hand-edited)
- [x] 3. Architectural Compliance — passed (ARCHI §4 description of `demoData.js` unchanged and still accurate)
- [x] 4. Offline-First & Sync Integrity — passed (no schema/outbox/cache/mapping changes; demo seed only)
- [x] 5. React & PWA Practices — passed (no component changes)
- [x] 6. Error Handling — passed (generator's existing photo-presence guard retained)
- [x] 7. Security — passed
- [x] 8. Performance — passed (photo payloads byte-identical; no chunk-size change)

---

## Verdict

**APPROVED with observations**

Cosmetic seed-data fix with no runtime-logic impact. Lint passed, the Vite build passed, and all 71 tests passed. The generated `src/lib/demoData.js` diff is limited to the two intended colour lines. Codex review was skipped as trivial; final visual confirmation of the exact shades in demo mode is left to the reviewer (`npm run dev` → "Explore the demo").
