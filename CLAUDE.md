# my-brew-log

Offline-first PWA for logging coffee/matcha/tea. React 19 + Vite, IndexedDB outbox → Supabase sync, installed as a home-screen app on iPhone.

## Read first

- **`docs/ARCHI.md`** — architecture single source of truth (structure, data model, sync design, critical paths). Read it before planning or changing anything.
- **`docs/ARCHI-rules.md`** — when and how to update ARCHI.md after a change.

## Workflow

This project uses the TRIP workflow (`.claude/skills/`): `/TRIP-1-plan` → `/TRIP-2-implement` → `/TRIP-3-release`. Plans live in `docs/1-plans/`, changelogs in `docs/2-changelog/`, code reviews in `docs/3-code-review/`, testing docs in `docs/4-unit-tests/`.

## Commands

```bash
npm run dev      # Vite dev server
npm run lint     # ESLint (flat config)
npm test         # Vitest, node env, src/**/*.test.js
npm run build    # production build
```

## Conventions

- Plain JS + JSDoc, no TypeScript. Runtime validation (`isValidEntry`).
- New UI uses theme CSS variables from `src/lib/theme.js` — never hardcoded colors.
- Entry schema changes must be optional fields, kept symmetric in `toRow`/`fromRow` (`src/lib/sync.js`), and backward compatible with cached entries.
- Keep new logic in `src/lib/` or `src/utils/` as pure, node-testable functions; components have no test harness.
- Historical plans/specs from the previous workflow are archived in `docs/superpowers/` — reference only.
