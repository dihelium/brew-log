# Code Review: Service Worker: Stop Caching Supabase Reads

**Review Date**: 2026-07-16
**Version**: 0.4.1
**Plan**: `docs/1-plans/F_0.4.1_sw-no-cache-supabase.plan.md`
**Codex loop**: 2 rounds → APPROVED

**Files Reviewed**:

- `public/sw.js`
- `src/main.jsx`
- `docs/ARCHI.md`

---

## Executive Summary

The change prevents the service worker from caching Supabase reads, purges the poisoned v1 cache, and triggers a one-time resync when the updated worker takes control. All implementation requirements and review gates are satisfied. APPROVED.

---

## Changes Overview

`public/sw.js` advances the cache to `brew-log-v2` and bypasses cache handling for `*.supabase.co` requests. `src/main.jsx` triggers one resync through the existing `online` wake path after `controllerchange`, avoiding a page reload and draft loss. `docs/ARCHI.md` records the updated caching and rollout behavior.

---

## Findings

### Critical Issues

None.

### Major Issues

- **Build gate not verified in initial review** — `.claude/skills/TRIP-review/checklist.md:107`, plan line 220. The initial gate summary omitted the required build result. **Disposition: addressed.** The implementer reran `npm run build` successfully; the emitted artifact contains the v2 cache name at `dist/sw.js:1` and the Supabase bypass at `dist/sw.js:34`.

### Minor Issues

None.

### Suggestions

None.

---

## Checklist

- [x] 1. Functional Requirements — passed
- [x] 2. Code Quality — passed
- [x] 3. Architectural Compliance — passed (`docs/ARCHI.md` updated)
- [x] 4. Offline-First & Sync Integrity — passed (no schema/outbox/cache/mapping changes)
- [x] 5. React & PWA Practices — passed (bypass precedes cache handling; guarded takeover resync)
- [x] 6. Error Handling — passed
- [x] 7. Security — passed (authenticated Supabase responses no longer enter the SW cache)
- [x] 8. Performance — passed (only intended Supabase reads return to network)

---

## Verdict

**APPROVED**

The sole review finding was resolved by supplying the clean build result required by the approval gate. Lint passed with one pre-existing warning, the Vite build passed, and all 68 tests passed. Automated SW/registration coverage is intentionally absent (no browser harness, ARCHI §10); post-deploy manual acceptance (Cache Storage shows `brew-log-v2`, the DIAG pull returns the current server row count without "Bypass for network", newest brews appear) remains the documented verification path.
