---
name: TRIP-test
description: Write/run tests following project standards (deep test authoring)
disable-model-invocation: true
argument-hint: "component or feature to test"
---

# Testing Mode

You are now in **testing mode** for **my-brew-log**.

This skill is the **deep test-authoring reference**: the `TRIP-2-implement` testing gate points here for heavy authoring work and full guidance. Invoke it standalone for test backfill or coverage work outside an implementation session.

## Prerequisites - Read First

Before testing, you MUST read:

1. @docs/ARCHI.md - Understand system architecture
2. @docs/4-unit-tests/TESTING.md - Testing guidelines

## Your Task

Test: $ARGUMENTS

---

## Testing Guidelines

### Scope

- Only run tests for relevant files that changed (not the whole project)
- Focus on the new feature/fix/refactor

### Commands

```bash
# Run all tests
npm test

# Run specific test file(s)
npx vitest run src/lib/sync.test.js
npx vitest run src/utils

# With coverage (requires one-time: npm i -D @vitest/coverage-v8)
npx vitest run --coverage
```

### Test Structure

Tests are colocated with their source as `<module>.test.js` (matched by `src/**/*.test.js`). Vitest runs in the **node** environment — no jsdom — so only pure modules are unit-tested: `src/lib/` (cache via `fake-indexeddb`, sync, photoCodec, theme) and `src/utils/` (streakCalc). React components/pages have no test harness; their behavior is verified manually via `npm run dev`.

### Testing Priorities

**Unit Tests** (Vitest, node env):

- Sync mapping (`toRow`/`fromRow` round-trips, null field handling)
- Cache/outbox behavior (`cache.js` with `fake-indexeddb`: ordering, per-user DBs)
- Pure utils (streak calculation date logic, photo codec round-trips, theme table)
- Keep new logic in `lib/`/`utils/` as pure functions so it lands in this tier

**Manual Integration** (no automated E2E):

- Offline add → outbox flush → row + photo appear in Supabase
- Sign-out/sign-in cache isolation
- PWA behavior on iPhone (installed app, offline start, theme persistence)

**What to Test**:

- Round-trip symmetry (entry → row → entry)
- Entries missing optional fields (photo, rating, notes, color)
- Date boundaries in streak logic (gap days, today with/without entries, DST)
- Failure paths: sync errors leave outbox intact, malformed cached entries rejected

---

## Hard-to-Test Code

Seam ladder, cheapest first: **exported pure helper → injectable client/adapter → module mock → integration/emulator test**. Take the first rung that works; refactor for a seam only if the refactor is smaller than the feature you're shipping — otherwise it's coverage debt. Before refactoring legacy code, pin it with characterization tests (assert current behavior as-is, then refactor safely).

Uncovered risky paths: one line each in `docs/4-unit-tests/COVERAGE-DEBT.md` (`path | why hard | escape plan`). Delete a ledger line in the same change that gives its path meaningful coverage.

---

## Post-Testing Summary

After completing tests, create a summary file:

**File**: `docs/4-unit-tests/wa_vx.y.z_test.md`
(a = project week, x.y.z = version)

**Content**:

```markdown
# Test Summary - Week a, V. x.y.z

## What Was Tested

[List of tested components/functions]

## Test Results

- Total tests: X
- Passed: X
- Failed: X
- Coverage: X%

## Key Findings

[Any issues discovered, edge cases found, etc.]

## Notes

[Additional context or recommendations]
```
