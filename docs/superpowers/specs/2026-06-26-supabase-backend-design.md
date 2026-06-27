# my brew log — Supabase backend migration

> Design spec. Migrates the app from single-user `localStorage` to a multi-user
> Supabase backend with Google sign-in, per-user data isolation, photo storage,
> and offline-capable background sync.

---

## Goal

Move brew entries and photos off the device's `localStorage` and into Supabase,
so multiple users can each keep a private brew log that syncs across their
devices. The app must remain usable offline: reads come from a local cache and
writes (add / delete) queue up and sync when a connection returns.

## Decisions (from brainstorming)

- **Multiple users**, each with a private log → real auth + Row Level Security.
- **Google OAuth** sign-in (room to add other providers later).
- **Offline-capable**: local cache + outbox sync queue. Approach A (hand-rolled),
  chosen because the data model is **append-only** (entries are added or deleted,
  never edited), which eliminates conflict resolution.
- **Fresh start** — no migration of existing `localStorage` data.
- Photos go to **Supabase Storage** (no separate S3 service needed).

## Non-goals (YAGNI for v1)

- Realtime push between devices (sync triggers are enough; realtime is a future add).
- Editing existing entries (data stays append/delete only).
- Migrating old `localStorage` entries.

---

## Security note

The Postgres connection string (`postgresql://…@db.…supabase.co:5432/postgres`)
is a **direct database credential** and must never appear in frontend code — a
React app ships to the browser where anyone could read it. The browser talks to
Supabase only through the **Supabase JS client** using the public **anon key**,
with **Row Level Security** enforcing per-user access. The shared password should
be rotated.

---

## Part 1 — Supabase backend

### `entries` table (Postgres)

| column | type | notes |
|---|---|---|
| `id` | `uuid` PK | client-generated (keeps offline-created IDs stable) |
| `user_id` | `uuid` → `auth.users` | not null, set from session |
| `type` | `text` | |
| `name` | `text` | not null |
| `rating` | `int` | nullable |
| `notes` | `text` | nullable |
| `color` | `text` | nullable |
| `photo_path` | `text` | nullable — Storage path `{user_id}/{id}.jpg` |
| `logged_at` | `timestamptz` | replaces old numeric `timestamp`; drives feed ordering |
| `created_at` | `timestamptz` | server default `now()` |

### Row Level Security

RLS **enabled** on `entries`. A single policy permits `select / insert / update /
delete` only when `auth.uid() = user_id`. This is what makes the public anon key
safe.

### Storage

A **private** bucket `brew-photos`. Objects live at `{user_id}/{entry_id}.jpg`.
A storage RLS policy restricts each user to their own `{user_id}/…` folder.
Because the bucket is private, the UI never renders from a public URL; the sync
engine downloads each photo blob (via short-lived signed URLs) into the local
cache, and the UI always renders photos from that cache. Keeps photos private
and makes offline display uniform.

### Auth

Google OAuth. Create a Google OAuth client in Google Cloud Console; paste its
client ID/secret into Supabase Auth → Providers → Google. The client calls
`supabase.auth.signInWithOAuth({ provider: 'google' })`; Supabase manages the
redirect and session.

### Secrets / config

App uses only `VITE_SUPABASE_URL` and the public **anon key**. Add `.env`
(gitignored) plus a committed `.env.example`. The Postgres string is never used
by the frontend.

---

## Part 2 — Client architecture

### New dependencies

- `@supabase/supabase-js`
- `idb` (~1KB IndexedDB helper — needed because photo blobs exceed
  `localStorage` limits and IndexedDB stores `Blob`s natively).

### New files

- **`src/lib/supabase.js`** — creates the Supabase client from env vars.
- **`src/context/AuthContext.jsx`** — exposes `user`, `signInWithGoogle()`,
  `signOut()`, and session loading state; listens to `onAuthStateChange`.
- **`src/lib/cache.js`** — IndexedDB wrapper (via `idb`), **namespaced per user
  id** so two accounts on one device stay isolated. Three stores:
  - `entries` — cached row objects
  - `photos` — `Blob`s keyed by entry id
  - `outbox` — pending `{ op: 'add' | 'delete', entry }` items
- **`src/lib/sync.js`** — the sync engine:
  - `flushOutbox()` — replays queued ops in order. `add`: upload photo blob to
    Storage, then insert the row with its `photo_path`. `delete`: delete row +
    object. UUIDs make replay idempotent, so retries are always safe.
  - `pullRemote()` — fetches the user's rows, updates the `entries` cache, and
    downloads any missing photo blobs into the `photos` cache.
  - Triggers: on login, on `window` `online`, and on tab focus.
  - Backoff: failed ops stay in the outbox and retry; nothing is lost.
- **`src/pages/LoginPage.jsx`** — a single "Continue with Google" screen matching
  the existing visual style; surfaces auth errors.

### Refactored files

- **`src/context/BrewContext.jsx`** — keeps the same `entries` / `addEntry` /
  `deleteEntry` / `importEntries` surface the UI already uses. Now hydrates from
  the IndexedDB cache; every write applies to the cache + appends to the outbox +
  kicks the sync engine. `importEntries` routes through the same add path.
- **`src/App.jsx`** — wrapped in `AuthProvider`. No session → `LoginPage`; else
  the existing routes inside `BrewProvider` (scoped to the user).
- **`src/components/PhotoPicker.jsx` / `src/pages/AddPage.jsx`** — compress the
  photo to a `Blob`, store it in the `photos` cache, reference it by entry id
  (instead of stashing a base64 string).
- **`src/components/EntryCard.jsx` / `src/pages/DetailPage.jsx`** — change only in
  how they obtain the image source: render via `URL.createObjectURL` from the
  cached blob (revoking object URLs on unmount).

### Data flow

**Add (online or offline):**
1. AddPage builds entry `{ id: uuid, ...fields, logged_at }`, compresses photo → `Blob`.
2. `BrewContext` writes the entry to `entries` cache, the blob to `photos` cache,
   and an `add` op to `outbox`; UI updates instantly.
3. Sync engine (if online): uploads blob → `brew-photos/{uid}/{id}.jpg`, inserts
   row with `photo_path`, removes the op from the outbox.

**Delete:** remove from `entries`/`photos` cache, enqueue `delete` op; sync engine
deletes row + object.

**Pull (login / reconnect / focus):** fetch rows for the user, reconcile the
`entries` cache, download any photos missing from the `photos` cache.

### Error & empty states

- Subtle "offline — will sync" indicator when the outbox is non-empty and the
  device is offline.
- Login errors shown on `LoginPage`.
- Upload/insert failures leave the op in the outbox for retry; cached data is
  never lost.

---

## Testing

- **Unit:** `sync.js` outbox-replay + dedup against a mocked Supabase client.
- **Manual end-to-end:** sign in with Google → go offline in devtools → add and
  delete entries → return online → confirm rows + photos appear in Supabase and a
  second device sees the same data.
- `npm run build` clean.

---

## External setup checklist (manual, outside the codebase)

1. In Supabase: run the `entries` table + RLS migration, create the private
   `brew-photos` bucket + storage policy.
2. In Google Cloud Console: create an OAuth client; add Supabase callback URL.
3. In Supabase Auth → Providers → Google: paste client ID/secret.
4. Locally: create `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. **Rotate** the Postgres password that was shared in plaintext.
