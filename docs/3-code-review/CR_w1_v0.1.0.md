# Code Review: Location per Brew

**Review Date**: 2026-07-15  
**Version**: 0.1.0  
**Files Reviewed**:

- `CLAUDE.md`
- `docs/superpowers/supabase-setup.md`
- `src/components/EntryCard.jsx`
- `src/context/BrewContext.jsx`
- `src/index.css`
- `src/lib/sync.js`
- `src/lib/sync.test.js`
- `src/pages/AddPage.jsx`
- `src/pages/DetailPage.jsx`

**Plan**: `docs/1-plans/F_0.1.0_location-per-brew.plan.md`

---

## Executive Summary

The change adds an optional free-text location to brew entries, including creation, display, inline editing, backup round-tripping, recent-location suggestions, and offline Supabase synchronization. The sync race found during the initial review was addressed; the database migration remains an explicitly accepted release-time responsibility.

APPROVED with observations

---

## Changes Overview

Location is mapped symmetrically between client entries and Supabase rows and is updated through a whitelisted partial-update outbox operation that never touches photo storage. The UI exposes location on the add form, feed cards, and detail page, with recent-location suggestions and inline editing. Follow-up synchronization and pending-patch overlays preserve local edits when sync operations overlap or fail.

---

## Findings

### Critical Issues

None.

### Major Issues

#### Overlapping syncs could revert and delay location updates

**Location**: `src/context/BrewContext.jsx:59`, `src/lib/sync.js:129`, `src/lib/sync.js:148`  
**Disposition**: Addressed.

The initial implementation discarded `runSync()` calls made during an active pass. An update enqueued after `flushOutbox()` took its snapshot could consequently be overwritten by a stale remote pull and remain queued until another focus or online event.

The final implementation records overlapping requests through `syncQueuedRef` and repeats the sync pass at `src/context/BrewContext.jsx:28` and `src/context/BrewContext.jsx:62-75`. It also combines and reapplies pending update patches during pulls at `src/lib/sync.js:132-150`. Patch behavior and stale-row preservation are covered at `src/lib/sync.test.js:89-94` and `src/lib/sync.test.js:195-204`.

#### Supabase location migration not yet applied

**Location**: `src/lib/sync.js:15`, `docs/1-plans/F_0.1.0_location-per-brew.plan.md:100-101`, `docs/1-plans/F_0.1.0_location-per-brew.plan.md:158-169`  
**Disposition**: Accepted with override; open release-time action.

The client now sends the `location` column on entry upserts, so the nullable column must exist before the client ships. The implementer clarified that production schema changes are manual dashboard actions owned by the requester during TRIP-3 release, not changes that can be committed in this implementation.

The required deployment order remains documented at `docs/1-plans/F_0.1.0_location-per-brew.plan.md:100-101`, the fresh-install schema includes the column at `docs/superpowers/supabase-setup.md:16`, and the migration and changelog entries remain explicit release to-dos at `docs/1-plans/F_0.1.0_location-per-brew.plan.md:158` and `docs/1-plans/F_0.1.0_location-per-brew.plan.md:169`.

### Minor Issues

None.

### Suggestions

None.

---

## Checklist

- [ ] 1. Functional Requirements — Passed with caveat: apply the documented Supabase migration before client release.
- [x] 2. Code Quality — Passed.
- [x] 3. Architectural Compliance — Passed.
- [x] 4. Offline-First & Sync Integrity — Passed; ordering, retryability, pending-patch overlays, and per-user isolation are preserved.
- [x] 5. React & PWA Practices — Passed.
- [x] 6. Error Handling — Passed; pending edits survive stale pulls and failed operations remain retryable.
- [x] 7. Security — Passed.
- [x] 8. Performance — Passed.

---

## Verdict

**APPROVED with observations**

The requester accepted the unapplied schema migration and changelog entry as release-time responsibilities governed by the plan’s column-before-client deployment order. The implementation finding was resolved, no new issues were introduced, and the supplied gate results were clean: lint passed with one pre-existing warning, 22 tests passed, and the production build passed.

