# Code Review: Sync Resilience & Account Clarity

**Review Date**: 2026-07-15
**Version**: 0.4.0
**Plan**: `docs/1-plans/F_0.4.0_sync-resilience-and-account-clarity.plan.md`
**Codex loop**: 1 round → APPROVED (no findings)

**Files Reviewed**:

- `src/lib/sync.js`
- `src/lib/sync.test.js`
- `src/context/BrewContext.jsx`
- `src/context/AuthContext.jsx`
- `src/components/SyncErrorChip.jsx`
- `src/components/BackupControls.jsx`
- `src/pages/FeedPage.jsx`
- `docs/ARCHI.md`

---

## Executive Summary

Hardens the outbox sync path (resilient `flushOutbox` with per-entry ordering and idempotent photo upload), surfaces sync failures via a retry chip, forces a Google account chooser, and shows the signed-in email with sign-out. In response to a confirmed incident where an iPhone's 17 newest brews never reached the server. APPROVED with no findings on the first review turn.

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

- [x] 1. Functional requirements — plan-conformant; failure feedback and retry behavior implemented.
- [x] 2. Code quality — clear, scoped changes with appropriate comments and naming.
- [x] 3. Architecture — preserves context-based orchestration and established sync abstractions.
- [x] 4. Offline/sync integrity — per-entry ordering, retryability, cache isolation, and row/photo behavior intact.
- [x] 5. React/PWA — hooks valid; new UI uses theme variables and a 44px touch target.
- [x] 6. Error handling — flush, cleanup, pull, and photo failures degrade gracefully and remain observable.
- [x] 7. Security — OAuth account selection and authorization boundaries correct; no sensitive data exposure.
- [x] 8. Performance — skip-and-continue adds only intended work; no leaks or hot-path regressions.

---

## Verdict

**APPROVED**

Plan conformance complete. Documentation updated, six new sync tests cover the new logic, and the gate reports clean lint, 68 passing tests, and a successful demo smoke check.

Note: the real-session-only UI (account chooser, signed-in-email row, live sync-error chip) was not driven in-browser (requires OAuth / signing out the user's live account); the sync logic is covered by 29 unit tests and the render tree was smoke-verified via the demo path.
