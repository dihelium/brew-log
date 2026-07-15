# my-brew-log Architecture Documentation

## 1. How to Read This Document

This is the architectural single source of truth for my-brew-log, read at the start of every TRIP task. It describes what exists today — not an idealized design. Update it per `ARCHI-rules.md` after any architectural change.

## 2. Overview

my-brew-log is an **offline-first PWA** for logging coffee/matcha/tea intake, designed to be installed on an iPhone home screen. Entries (name, type, rating, notes, photo, extracted color) are stored locally in IndexedDB and synced to Supabase when online. A layered "daily cup" visualization, photo streaks, and switchable themes make up the personality of the app.

- **Project type**: Web Frontend (React SPA / PWA) with a Supabase backend-as-a-service
- **Current version**: 0.2.0 (`package.json`)
- **Deployment**: Vercel (static SPA with rewrite-to-index), service worker for offline

## 3. Technology Stack

| Layer | Technology |
| --- | --- |
| UI | React 19, JSX (no TypeScript) |
| Build | Vite 8 (`npm run dev/build/preview`) |
| Routing | react-router-dom 7 (`BrowserRouter`) |
| Animation | framer-motion 12 (page transitions, bottom sheet) |
| Backend | Supabase (Google OAuth, Postgres `entries` table, Storage bucket `brew-photos`) |
| Local persistence | IndexedDB via `idb` 8 (per-user DB `brew-log-<userId>`) |
| Testing | Vitest 4, node environment, `src/**/*.test.js`, `fake-indexeddb` for cache tests |
| Lint | ESLint 10 flat config + react-hooks + react-refresh plugins |
| Icons/assets | `sharp` build script (`scripts/generate-icons.mjs`), PWA manifest + `sw.js` in `public/` |

## 4. Project Structure

```
src/
├── main.jsx              # Entry: applies stored theme pre-render, registers/unregisters SW
├── App.jsx               # Providers (Auth, Brew) + AnimatePresence routes
├── index.css             # Global styles, theme CSS variable blocks
├── pages/
│   ├── FeedPage.jsx      # "/" — DailyCup, streak chip, entry list, calendar link
│   ├── AddPage.jsx       # "/add" — new entry form, photo + color picker
│   ├── DetailPage.jsx    # "/entry/:id" — inline per-field editing
│   ├── CalendarPage.jsx  # "/calendar" — month grid (brew-day dots), day list + day mug
│   └── LoginPage.jsx     # Google OAuth sign-in
├── components/           # DailyCup, EntryCard, StarRating, PhotoPicker, ColorPicker, ThemePicker, BackupControls, LocationField
├── context/
│   ├── AuthContext.jsx   # Supabase session state, signInWithGoogle/signOut
│   └── BrewContext.jsx   # Entry CRUD, cache + sync orchestration
├── lib/
│   ├── supabase.js       # Client from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
│   ├── cache.js          # IndexedDB: entries / photos (Blobs) / outbox stores
│   ├── sync.js           # toRow/fromRow mapping, partial updates, flushOutbox, pullRemote
│   ├── photoCodec.js     # dataURL <-> Blob (Node-compatible for tests)
│   └── theme.js          # Five-theme table, persistence (localStorage brewlog:theme), DOM application
└── utils/                # compressImage, extractColor, recentLocations, streakCalc, dropSound, brewTypes, calendar, datetimeLocal
```

## 5. Core Architecture Principles

- **Offline-first**: all reads/writes hit IndexedDB first; the UI never blocks on the network.
- **Outbox pattern**: mutations append `{ seq, op, entry }` to an ordered `outbox` store; `flushOutbox` replays `add`, whitelisted partial `update`, and `delete` operations against Supabase when connectivity/auth allows, while `pullRemote` reconciles remote rows back into the cache. The `update` op carries a canonical patch over a fixed set of editable client fields (`name`, `type`, `rating`, `notes`, `timestamp`, `location`), normalized by `normalizePatch` and mapped symmetrically by `toPatchRow`/`applyPatch` — it never touches photo storage or `photo_path`. Pending update patches are overlaid on pulled rows, and a sync requested during an active pass queues one follow-up pass, so edits made mid-sync are neither reverted nor stranded. A row deleted on another device wins over a local edit (delete-wins): the `update` matches zero rows, the op is dropped, and the next pull prunes the local entry.
- **Per-user isolation**: IndexedDB database name is `brew-log-<userId>`; switching accounts switches databases.
- **Context over state libraries**: `AuthContext` and `BrewContext` are the only global state; no Redux/Zustand.
- **Plain JS + JSDoc**: no TypeScript; validation is runtime (`isValidEntry`).

## 6. Data Model

Client entry shape (see `isValidEntry` in `BrewContext.jsx` and `toRow`/`fromRow` in `sync.js`):

```js
{
  id: string,          // uuid
  name: string,
  type: string|null,   // coffee / matcha / tea
  rating: number|null,
  notes: string|null,
  color: string|null,  // hex extracted from photo
  location?: string,   // free-text place label; absent when unset
  timestamp: number,   // ms epoch; maps to logged_at ISO column
  hasPhoto: boolean,   // derived from photo_path on the row
}
```

`locationMeta` is reserved for a future structured map location (`{ lat, lng, placeId?, provider? }`) and is not implemented yet.

Supabase: `entries` table keyed by `id` with `user_id`, photos in Storage bucket `brew-photos` referenced by `photo_path`.

## 7. Data Flow

```mermaid
flowchart LR
  UI[Pages/Components] --> BC[BrewContext]
  BC --> Cache[(IndexedDB\nentries/photos/outbox)]
  BC -->|flushOutbox / pullRemote| SB[(Supabase\nentries + brew-photos)]
  Auth[AuthContext] -->|user id| BC
  SB -->|Google OAuth session| Auth
```

Add-entry path: AddPage → compressImage + extractColor → `addEntry` (BrewContext) → cache put + outbox append → background flush to Supabase (row upsert + photo Blob upload).

## 8. Configuration

- `.env` / `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public anon key only — no secrets in the client).
- `vercel.json`: SPA rewrite of all routes to `index.html`.
- Themes: `src/lib/theme.js` table (id, swatches, optional Google Fonts href), persisted under `localStorage['brewlog:theme']`, applied before first paint in `main.jsx`.

## 9. Error Handling Strategy

- Missing Supabase env vars log a clear console error instead of failing cryptically.
- Sync failures leave items in the outbox for retry; the UI keeps working from cache.
- Entry validation (`isValidEntry`) guards against malformed cached/remote data.

## 10. Testing Strategy

- **Framework**: Vitest, `environment: 'node'`, files matching `src/**/*.test.js`.
- **Covered**: pure/lib logic — `cache.js` (via `fake-indexeddb`), `sync.js`, `photoCodec.js`, `theme.js`, `utils/streakCalc.js`.
- **Not covered**: React components/pages (no jsdom/RTL setup), service worker, OAuth flow.
- Commands: `npm test` (vitest run), `npx vitest run <pattern>` for a subset.

## 11. Performance Considerations

- Photos are compressed client-side (`compressImage`) before caching/upload.
- Theme applied pre-render to avoid palette flash; fonts lazy-loaded per theme.
- Service worker caches the built app for offline start (`public/sw.js`); dev mode actively unregisters SWs to avoid stale-module traps.

## 12. Deployment

- `npm run build` → `dist/`, deployed to Vercel (`.vercel/` project linked).
- PWA installability via `public/manifest.json` + icons generated by `scripts/generate-icons.mjs`.
- Git: `main` is the default branch; feature branches (`feat/*`) merge back fast-forward.

## 13. Conclusion

A deliberately small offline-first React PWA: two contexts, an IndexedDB outbox, and Supabase as the sync target. The riskiest areas for any change are the sync/outbox ordering, per-user cache isolation, and photo blob handling — treat those as the critical paths in planning and review.
