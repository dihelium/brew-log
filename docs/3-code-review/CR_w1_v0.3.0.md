# Code Review: Demo Mode (No-Sign-In Reviewer Experience)

**Review Date**: 2026-07-15  
**Version**: 0.3.0  
**Files Reviewed**:

- `docs/ARCHI.md`
- `src/context/AuthContext.jsx`
- `src/context/BrewContext.jsx`
- `src/lib/cache.js`
- `src/lib/cache.test.js`
- `src/pages/FeedPage.jsx`
- `src/pages/LoginPage.jsx`

**Plan**: `docs/1-plans/F_0.3.0_demo-mode.plan.md`

---

## Executive Summary

This change adds a local-only, pre-seeded demo experience without Google authentication or Supabase synchronization. One Major error-recovery defect was found during the initial review and addressed in the subsequent iteration.

APPROVED

---

## Changes Overview

The implementation introduces a persisted synthetic demo user, an isolated `brew-log-demo` IndexedDB cache, seed data with lazily loaded photos, and a hard sync gate for demo sessions. It also adds demo entry and exit controls, graceful cold-offline feedback, cache-clearing support, tests for seed/cache behavior, and corresponding architecture documentation.

---

## Findings

### Critical Issues

None.

### Major Issues

**Cold-offline retry reused a cached failed module import** — `src/lib/demo.js:47`.

The original retry called `seedDemoCache` again in the same document, but a failed dynamic module fetch remains cached in that document’s module map. The retry therefore could not recover after connectivity returned.

**Disposition: addressed.** Retry now creates a new document through `window.location.reload()` at `src/pages/FeedPage.jsx:64`. The obsolete context retry was removed from the provider API at `src/context/BrewContext.jsx:268`, and the corrected behavior is documented at `docs/1-plans/F_0.3.0_demo-mode.plan.md:186`.

### Minor Issues

None.

### Suggestions

None.

---

## Checklist

- [x] 1. Functional Requirements — passed
- [x] 2. Code Quality — passed
- [x] 3. Architectural Compliance — passed
- [x] 4. Offline-First & Sync Integrity — passed
- [x] 5. React & PWA Practices — passed
- [x] 6. Error Handling — passed after the retry correction
- [x] 7. Security — passed
- [x] 8. Performance — passed; demo photo data remains in a separate lazy chunk

---

## Verdict

**APPROVED**

The only review finding was resolved without override or deferred work. Reported lint and all 62 tests passed, and the production build succeeded with `demoData` emitted as a separate lazy-loaded chunk.

Note: live in-browser click-through of the demo UI was skipped (an active real Google session was present and sign-out was declined); the seed/timestamp/cache logic is covered by unit tests and the UI wiring by static review.
