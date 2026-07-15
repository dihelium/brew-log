# Code Review: Editable Brews + Calendar View

**Review Date**: 2026-07-15  
**Version**: 0.2.0  
**Files Reviewed**:

- `src/App.jsx`
- `src/components/DailyCup.jsx`
- `src/components/EntryCard.jsx`
- `src/context/BrewContext.jsx`
- `src/index.css`
- `src/lib/sync.js`
- `src/lib/sync.test.js`
- `src/pages/AddPage.jsx`
- `src/pages/CalendarPage.jsx`
- `src/pages/DetailPage.jsx`
- `src/pages/FeedPage.jsx`
- `src/utils/brewTypes.js` + `src/utils/brewTypes.test.js`
- `src/utils/calendar.js` + `src/utils/calendar.test.js`
- `src/utils/datetimeLocal.js` + `src/utils/datetimeLocal.test.js`

**Plan**: `docs/1-plans/F_0.2.0_editable-brews-and-calendar.plan.md`

---

## Executive Summary

The change makes an existing brew's date & time, rating, notes, name, and type editable inline on the Detail page (matching the established tap-to-edit location pattern), adds a `tea` brew type across the type picker, cards, hero, and all five themes, and introduces a non-default `/calendar` route with a month grid (brew-day dots) that shows the selected day's brew list and its "daily cup" mug. Editing reuses the whitelisted partial-update outbox operation with a widened, symmetric patch set; no entry-schema, IndexedDB, or Supabase migration was required.

APPROVED

---

## Changes Overview

The update/outbox patch path was generalized from location-only to a fixed set of editable client fields (`name`, `type`, `rating`, `notes`, `timestamp`, `location`) via a new `normalizePatch` plus widened `toPatchRow`/`applyPatch`, all kept symmetric and mapped to columns that already exist in `toRow`. `updateEntry` re-sorts the feed by descending timestamp after applying a patch so re-dated entries reposition correctly, including offline. Brew-type metadata is centralized in a pure `brewTypes` util and drives `AddPage`, `EntryCard`, and `DetailPage`; `tea` accent/badge variables were added to every theme block. The calendar view is built from pure `calendar` (month matrix, brew-day set, per-day filter) and `datetimeLocal` conversion utilities, and reuses the `DailyCup` component with an optional `historical` caption prop so its "today" wording stays correct on the Feed.

---

## Findings

### Critical Issues

None.

### Major Issues

None.

### Minor Issues

None.

### Suggestions

None.

---

## Checklist

- [x] 1. Functional Requirements — Passed; editable fields, tea support, calendar navigation/grid/day views, and historical mug captions conform to the plan.
- [x] 2. Code Quality — Passed; shared metadata and calendar/date logic isolated in pure, node-testable utilities.
- [x] 3. Architectural Compliance — Passed; existing context, routing, cache, and sync patterns preserved.
- [x] 4. Offline-First & Sync Integrity — Passed; patch symmetry, outbox ordering, retry behavior, pending-patch overlays, timestamp re-sorting, per-user isolation, and photo handling remain intact.
- [x] 5. React & PWA Practices — Passed; hooks and dependencies are sound, new controls meet mobile-sizing and theme-variable requirements, service-worker logic untouched.
- [x] 6. Error Handling — Passed; sync failures remain retryable and local-first behavior degrades gracefully.
- [x] 7. Security — Passed; authentication and Supabase RLS boundaries unchanged; update fields explicitly whitelisted.
- [x] 8. Performance — Passed; calendar operations are linear over expected entry volumes, no new photo or resource-management overhead.

---

## Verdict

**APPROVED**

Codex converged with no findings on the first review turn. The remotely-deleted-row (delete-wins) conflict is pinned by a regression test, and the update field set is explicitly whitelisted. The supplied gate results were clean: lint passed with one pre-existing `ColorPicker.jsx` warning, the production build passed (with the pre-existing chunk-size warning), and 31 affected tests passed with new coverage across `brewTypes`, `calendar`, `datetimeLocal`, and the widened `sync` patch path. A live in-browser smoke of the sync path could not run in the implementation sandbox (`EPERM`) and is left to the requester as an optional real-device pass; the sync path is otherwise covered by behavioral `fake-indexeddb` tests.
