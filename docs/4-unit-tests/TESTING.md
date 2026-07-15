# Testing Guidelines

## Test Framework

Vitest 4, configured in `vitest.config.js` with `environment: 'node'` (no jsdom). `fake-indexeddb` provides IndexedDB in tests.

## Running Tests

```bash
# All tests
npm test

# A specific file or directory
npx vitest run src/lib/sync.test.js
npx vitest run src/utils

# Coverage (requires one-time: npm i -D @vitest/coverage-v8)
npx vitest run --coverage
```

## Test Organization

Tests are colocated with their source as `<module>.test.js`, matched by `src/**/*.test.js`. Currently covered: `src/lib/cache.js`, `src/lib/sync.js`, `src/lib/photoCodec.js`, `src/lib/theme.js`, `src/utils/streakCalc.js`.

## Writing Tests

- Test observable behavior: inputs → outputs / persisted effects (e.g., outbox contents), never internal wiring.
- Keep new logic in `src/lib/` or `src/utils/` as pure, browser-API-light functions so it is testable in the node environment (see `photoCodec.js` for the pattern: avoids `FileReader` so it runs in Node).
- Use `fake-indexeddb` for anything touching the cache; create a fresh per-user DB per test.
- React components/pages are not unit-tested (no jsdom/RTL harness); verify them manually via `npm run dev` and note anything risky in the coverage-debt ledger.

## Coverage Requirements

Not defined — no thresholds configured. Risky uncovered paths go in `docs/4-unit-tests/COVERAGE-DEBT.md` (`path | why hard | escape plan`).
