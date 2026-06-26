# Supabase Backend Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move brew entries and photos from device `localStorage` to a multi-user Supabase backend with Google sign-in, per-user isolation, and offline-capable background sync.

**Architecture:** The browser talks to Supabase only through `@supabase/supabase-js` (public anon key + Row Level Security). A per-user IndexedDB cache (`idb`) is the UI's source of truth for instant/offline reads. Writes apply to the cache and append to an outbox queue; a small sync engine flushes the outbox and pulls remote rows on login, reconnect, and tab focus. Because entries are append/delete only (never edited), replay is idempotent with no conflict resolution.

**Tech Stack:** React 19, Vite 8, `@supabase/supabase-js`, `idb`, Vitest + `fake-indexeddb` for tests.

---

## Design notes (read before starting)

- **Client entry shape (cached in IndexedDB `entries` store):**
  `{ id, type, name, timestamp /* number ms */, rating?, notes?, color?, photo_path /* string|null */, hasPhoto /* bool */ }`.
  The numeric `timestamp` is kept client-side (no churn to FeedPage/EntryCard/DetailPage/streakCalc/DailyCup) and mapped to a `logged_at timestamptz` only at the Supabase boundary.
- **Photos:** kept as `Blob`s in the IndexedDB `photos` store keyed by entry id. The UI entry exposes `photo` = an object URL built from that blob (or `null`). `EntryCard`/`DetailPage` already render `entry.photo` as `<img src>`, so an object URL works with **no change** to them. `PhotoPicker`/`ColorPicker` keep using a data-URL in the AddPage form (for preview + colour extraction) and are **not** changed; conversion data-URL→Blob happens in `BrewContext.addEntry`.
- **Streak:** `calcPhotoStreak` switches from `!!e.photo` to `!!e.hasPhoto` so the count is stable regardless of whether a remote photo blob has downloaded yet.
- **Never** put the Postgres connection string in client code. Only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are used.

---

## Task 1: Dependencies, test tooling, env scaffolding, Supabase client

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `src/lib/supabase.js`

- [ ] **Step 1: Install dependencies**

```bash
npm install @supabase/supabase-js idb
npm install -D vitest fake-indexeddb
```

- [ ] **Step 2: Add a test script to `package.json`**

In the `"scripts"` block, add the `test` line:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run"
}
```

- [ ] **Step 3: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
```

- [ ] **Step 4: Create `.env.example`**

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-KEY
```

- [ ] **Step 5: Ensure `.env` is gitignored**

Confirm `.gitignore` contains a line `.env` (add it if missing). Do NOT commit a real `.env`.

```
.env
```

- [ ] **Step 6: Create `src/lib/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surface a clear message instead of a cryptic network error later.
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill it in.')
}

export const supabase = createClient(url, anonKey)
```

- [ ] **Step 7: Verify the build still works**

Run: `npm run build`
Expected: build succeeds (the console.error only fires at runtime without env vars).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.js .env.example .gitignore src/lib/supabase.js
git commit -m "chore: add supabase client, idb, and vitest tooling"
```

---

## Task 2: External setup documentation (manual dashboard work)

This task produces instructions the human runs in the Supabase and Google Cloud dashboards. No app code.

**Files:**
- Create: `docs/superpowers/supabase-setup.md`

- [ ] **Step 1: Create `docs/superpowers/supabase-setup.md`**

````markdown
# Supabase setup (manual, one-time)

## 1. Create the `entries` table + RLS

Supabase dashboard → SQL Editor → run:

```sql
create table public.entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text,
  name text not null,
  rating int,
  notes text,
  color text,
  photo_path text,
  logged_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.entries enable row level security;

create policy "own entries" on public.entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index entries_user_logged_idx
  on public.entries (user_id, logged_at desc);
```

## 2. Create the private photo bucket + policies

Dashboard → Storage → New bucket → name `brew-photos`, **uncheck** "Public bucket".
Then SQL Editor → run:

```sql
create policy "own photos read" on storage.objects
  for select using (
    bucket_id = 'brew-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own photos insert" on storage.objects
  for insert with check (
    bucket_id = 'brew-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own photos delete" on storage.objects
  for delete using (
    bucket_id = 'brew-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

## 3. Google OAuth

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application.
2. Authorized redirect URI: `https://YOUR-PROJECT-ref.supabase.co/auth/v1/callback`
   (find the exact value in Supabase → Authentication → Providers → Google).
3. Copy the Client ID and Client Secret.
4. Supabase → Authentication → Providers → Google → enable, paste Client ID + Secret, save.
5. Supabase → Authentication → URL Configuration → add your app's origin
   (e.g. `http://localhost:5173` for dev) to the allowed redirect URLs.

## 4. Local env

Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL` — Supabase → Project Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` — same page → Project API keys → `anon` `public`

## 5. Rotate the leaked Postgres password

The Postgres connection string was shared in plaintext. Supabase → Project Settings →
Database → reset the database password.
````

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/supabase-setup.md
git commit -m "docs: supabase + google oauth setup instructions"
```

---

## Task 3: Photo codec (data-URL ↔ Blob)

Pure functions used to convert the AddPage data-URL into a storable Blob and back (for backup export). Node-friendly (no `FileReader`) so they're unit-testable.

**Files:**
- Create: `src/lib/photoCodec.js`
- Test: `src/lib/photoCodec.test.js`

- [ ] **Step 1: Write the failing test**

`src/lib/photoCodec.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { dataUrlToBlob, blobToDataUrl } from './photoCodec'

// 1x1 transparent PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

describe('photoCodec', () => {
  it('dataUrlToBlob produces a Blob with the right mime type', () => {
    const blob = dataUrlToBlob(PNG)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('roundtrips data-url -> blob -> data-url', async () => {
    const blob = dataUrlToBlob(PNG)
    const back = await blobToDataUrl(blob)
    expect(back).toBe(PNG)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/photoCodec.test.js`
Expected: FAIL — cannot import from `./photoCodec`.

- [ ] **Step 3: Implement `src/lib/photoCodec.js`**

```js
/**
 * dataUrlToBlob — converts a base64 data URL (e.g. from canvas.toDataURL)
 * into a Blob suitable for IndexedDB storage and Supabase upload.
 */
export function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',')
  const mime = head.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * blobToDataUrl — converts a Blob back into a base64 data URL.
 * Avoids FileReader so it runs in Node (tests) as well as the browser.
 */
export async function blobToDataUrl(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
  const b64 = btoa(bin)
  return `data:${blob.type || 'image/jpeg'};base64,${b64}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/photoCodec.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/photoCodec.js src/lib/photoCodec.test.js
git commit -m "feat: add data-url <-> blob photo codec"
```

---

## Task 4: IndexedDB cache (per-user)

Per-user IndexedDB wrapper with three stores: `entries`, `photos`, `outbox`.

**Files:**
- Create: `src/lib/cache.js`
- Test: `src/lib/cache.test.js`

- [ ] **Step 1: Write the failing test**

`src/lib/cache.test.js`:

```js
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { createCache } from './cache'

describe('cache', () => {
  it('stores and retrieves entries', async () => {
    const c = await createCache('user-1')
    await c.putEntry({ id: 'a', name: 'Flat white', timestamp: 1 })
    expect(await c.getEntry('a')).toMatchObject({ id: 'a', name: 'Flat white' })
    expect(await c.allEntries()).toHaveLength(1)
    await c.removeEntry('a')
    expect(await c.allEntries()).toHaveLength(0)
  })

  it('stores and retrieves photo blobs', async () => {
    const c = await createCache('user-2')
    const blob = new Blob(['hi'], { type: 'image/jpeg' })
    await c.putPhotoBlob('a', blob)
    const got = await c.getPhotoBlob('a')
    expect(await got.text()).toBe('hi')
    await c.removePhotoBlob('a')
    expect(await c.getPhotoBlob('a')).toBeUndefined()
  })

  it('enqueues outbox ops in insertion order and removes by seq', async () => {
    const c = await createCache('user-3')
    await c.enqueue('add', { id: 'a' })
    await c.enqueue('delete', { id: 'b' })
    const ops = await c.allOps()
    expect(ops.map(o => o.op)).toEqual(['add', 'delete'])
    await c.removeOp(ops[0].seq)
    expect((await c.allOps()).map(o => o.op)).toEqual(['delete'])
  })

  it('namespaces by user id', async () => {
    const a = await createCache('alice')
    const b = await createCache('bob')
    await a.putEntry({ id: 'x', name: 'A', timestamp: 1 })
    expect(await b.allEntries()).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/cache.test.js`
Expected: FAIL — cannot import from `./cache`.

- [ ] **Step 3: Implement `src/lib/cache.js`**

```js
import { openDB } from 'idb'

/**
 * createCache — opens a per-user IndexedDB database and returns an async
 * accessor object. Three stores:
 *   entries — keyPath 'id'        (cached row objects)
 *   photos  — key = entry id      (Blob values)
 *   outbox  — keyPath 'seq' auto  (pending { seq, op, entry } items, ordered)
 */
export async function createCache(userId) {
  const db = await openDB(`brew-log-${userId}`, 1, {
    upgrade(db) {
      db.createObjectStore('entries', { keyPath: 'id' })
      db.createObjectStore('photos')
      db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true })
    },
  })

  return {
    allEntries: () => db.getAll('entries'),
    getEntry: (id) => db.get('entries', id),
    putEntry: (entry) => db.put('entries', entry),
    removeEntry: (id) => db.delete('entries', id),

    getPhotoBlob: (id) => db.get('photos', id),
    putPhotoBlob: (id, blob) => db.put('photos', blob, id),
    removePhotoBlob: (id) => db.delete('photos', id),

    enqueue: (op, entry) => db.add('outbox', { op, entry }),
    allOps: () => db.getAll('outbox'),       // returned in 'seq' key order
    removeOp: (seq) => db.delete('outbox', seq),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/cache.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cache.js src/lib/cache.test.js
git commit -m "feat: add per-user indexeddb cache with outbox"
```

---

## Task 5: Sync engine (outbox flush + remote pull)

`flushOutbox` replays queued ops to Supabase; `pullRemote` fetches rows and downloads missing photos. Both take an injected `supabase` and `cache` so they're testable with fakes. `toRow`/`fromRow` map between client and DB shapes and are exported for testing.

**Files:**
- Create: `src/lib/sync.js`
- Test: `src/lib/sync.test.js`

- [ ] **Step 1: Write the failing test**

`src/lib/sync.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { flushOutbox, pullRemote, toRow, fromRow } from './sync'

// Minimal in-memory cache implementing the methods sync uses.
function memCache() {
  const entries = new Map(), photos = new Map(), outbox = []
  let seq = 1
  return {
    _entries: entries, _photos: photos, _outbox: outbox,
    allEntries: async () => [...entries.values()],
    getEntry: async (id) => entries.get(id),
    putEntry: async (e) => { entries.set(e.id, e) },
    removeEntry: async (id) => { entries.delete(id) },
    getPhotoBlob: async (id) => photos.get(id),
    putPhotoBlob: async (id, b) => { photos.set(id, b) },
    removePhotoBlob: async (id) => { photos.delete(id) },
    enqueue: async (op, entry) => { outbox.push({ seq: seq++, op, entry }) },
    allOps: async () => [...outbox],
    removeOp: async (s) => {
      const i = outbox.findIndex(o => o.seq === s)
      if (i >= 0) outbox.splice(i, 1)
    },
  }
}

function okSupabase(rows = []) {
  return {
    _uploads: [], _upserts: [], _deletes: [],
    from() {
      return {
        upsert: async (row) => { fakeSb._upserts.push(row); return { error: null } },
        select() { return { order: async () => ({ data: rows, error: null }) } },
        delete() { return { eq: async (_c, id) => { fakeSb._deletes.push(id); return { error: null } } } },
      }
    },
    storage: {
      from() {
        return {
          upload: async (path, blob) => { fakeSb._uploads.push({ path, blob }); return { error: null } },
          remove: async () => ({ error: null }),
          download: async () => ({ data: new Blob(['img'], { type: 'image/jpeg' }), error: null }),
        }
      },
    },
  }
}
let fakeSb

describe('toRow/fromRow', () => {
  it('maps timestamp <-> logged_at', () => {
    const entry = { id: 'a', type: 'coffee', name: 'X', timestamp: 1000, rating: 4 }
    const row = toRow(entry, 'u1', 'u1/a.jpg')
    expect(row).toMatchObject({ id: 'a', user_id: 'u1', name: 'X', photo_path: 'u1/a.jpg', rating: 4 })
    expect(row.logged_at).toBe(new Date(1000).toISOString())
    const back = fromRow(row)
    expect(back.timestamp).toBe(1000)
    expect(back.hasPhoto).toBe(true)
  })
})

describe('flushOutbox', () => {
  it('uploads photo, upserts row, and clears the op', async () => {
    fakeSb = okSupabase()
    const c = memCache()
    await c.putPhotoBlob('a', new Blob(['x'], { type: 'image/jpeg' }))
    await c.enqueue('add', { id: 'a', name: 'X', timestamp: 1, hasPhoto: true })
    const res = await flushOutbox(fakeSb, c, 'u1')
    expect(res.ok).toBe(true)
    expect(fakeSb._uploads).toHaveLength(1)
    expect(fakeSb._upserts[0]).toMatchObject({ id: 'a', photo_path: 'u1/a.jpg' })
    expect(await c.allOps()).toHaveLength(0)
  })

  it('retains the op on failure', async () => {
    fakeSb = okSupabase()
    fakeSb.from = () => ({ upsert: async () => ({ error: { message: 'boom' } }) })
    const c = memCache()
    await c.enqueue('add', { id: 'a', name: 'X', timestamp: 1, hasPhoto: false })
    const res = await flushOutbox(fakeSb, c, 'u1')
    expect(res.ok).toBe(false)
    expect(await c.allOps()).toHaveLength(1)
  })
})

describe('pullRemote', () => {
  it('caches rows and downloads missing photos', async () => {
    fakeSb = okSupabase([
      { id: 'a', name: 'X', logged_at: new Date(1).toISOString(), photo_path: 'u1/a.jpg' },
    ])
    const c = memCache()
    const res = await pullRemote(fakeSb, c, 'u1')
    expect(res.ok).toBe(true)
    expect(await c.getEntry('a')).toMatchObject({ id: 'a', hasPhoto: true })
    expect(await c.getPhotoBlob('a')).toBeInstanceOf(Blob)
  })

  it('skips rows pending local deletion', async () => {
    fakeSb = okSupabase([
      { id: 'a', name: 'X', logged_at: new Date(1).toISOString(), photo_path: null },
    ])
    const c = memCache()
    await c.enqueue('delete', { id: 'a', photo_path: null })
    await pullRemote(fakeSb, c, 'u1')
    expect(await c.getEntry('a')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/sync.test.js`
Expected: FAIL — cannot import from `./sync`.

- [ ] **Step 3: Implement `src/lib/sync.js`**

```js
const BUCKET = 'brew-photos'

/**
 * toRow — client entry -> Supabase row. Maps numeric `timestamp` to `logged_at`.
 */
export function toRow(entry, userId, photoPath) {
  return {
    id: entry.id,
    user_id: userId,
    type: entry.type ?? null,
    name: entry.name,
    rating: entry.rating ?? null,
    notes: entry.notes ?? null,
    color: entry.color ?? null,
    photo_path: photoPath ?? null,
    logged_at: new Date(entry.timestamp).toISOString(),
  }
}

/**
 * fromRow — Supabase row -> client entry. Maps `logged_at` back to `timestamp`
 * and derives `hasPhoto` from `photo_path`.
 */
export function fromRow(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    timestamp: new Date(row.logged_at).getTime(),
    photo_path: row.photo_path ?? null,
    hasPhoto: !!row.photo_path,
    ...(row.rating != null && { rating: row.rating }),
    ...(row.notes != null && { notes: row.notes }),
    ...(row.color != null && { color: row.color }),
  }
}

/**
 * flushOutbox — replay queued ops in order. Stops on the first failure and
 * leaves the failing op (and the rest) in the outbox for a later retry.
 * Upserts/deletes keyed by the client UUID are idempotent, so retries are safe.
 */
export async function flushOutbox(supabase, cache, userId) {
  const ops = await cache.allOps()
  for (const item of ops) {
    try {
      if (item.op === 'add') {
        let photoPath = item.entry.photo_path ?? null
        const blob = await cache.getPhotoBlob(item.entry.id)
        if (blob) {
          photoPath = `${userId}/${item.entry.id}.jpg`
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(photoPath, blob, { upsert: true, contentType: 'image/jpeg' })
          if (error) throw error
        }
        const { error } = await supabase.from('entries').upsert(toRow(item.entry, userId, photoPath))
        if (error) throw error
      } else if (item.op === 'delete') {
        const { error } = await supabase.from('entries').delete().eq('id', item.entry.id)
        if (error) throw error
        if (item.entry.photo_path) {
          await supabase.storage.from(BUCKET).remove([item.entry.photo_path])
        }
      }
      await cache.removeOp(item.seq)
    } catch (error) {
      return { ok: false, error }
    }
  }
  return { ok: true }
}

/**
 * pullRemote — fetch the user's rows, update the entries cache, and download
 * any photo blobs not already cached. Rows with a pending local delete are
 * skipped so a just-deleted entry doesn't reappear before its delete syncs.
 */
export async function pullRemote(supabase, cache, userId) {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('logged_at', { ascending: false })
  if (error) return { ok: false, error }

  const ops = await cache.allOps()
  const pendingDeletes = new Set(ops.filter(o => o.op === 'delete').map(o => o.entry.id))

  for (const row of data) {
    if (pendingDeletes.has(row.id)) continue
    await cache.putEntry(fromRow(row))
    if (row.photo_path && !(await cache.getPhotoBlob(row.id))) {
      const { data: blob } = await supabase.storage.from(BUCKET).download(row.photo_path)
      if (blob) await cache.putPhotoBlob(row.id, blob)
    }
  }
  return { ok: true, count: data.length }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/sync.test.js`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sync.js src/lib/sync.test.js
git commit -m "feat: add outbox flush + remote pull sync engine"
```

---

## Task 6: Streak uses `hasPhoto`

Make the photo streak stable regardless of sync/download state.

**Files:**
- Modify: `src/utils/streakCalc.js:38` (the `allPhotographed` line)
- Test: `src/utils/streakCalc.test.js`

- [ ] **Step 1: Write the failing test**

`src/utils/streakCalc.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { calcPhotoStreak } from './streakCalc'

describe('calcPhotoStreak', () => {
  it('counts today when every entry hasPhoto', () => {
    const now = Date.now()
    expect(calcPhotoStreak([{ timestamp: now, hasPhoto: true }])).toBe(1)
  })

  it('breaks when a coffee day has an entry without a photo', () => {
    const now = Date.now()
    expect(calcPhotoStreak([
      { timestamp: now, hasPhoto: true },
      { timestamp: now, hasPhoto: false },
    ])).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/utils/streakCalc.test.js`
Expected: FAIL — current code checks `!!e.photo`, not `e.hasPhoto`.

- [ ] **Step 3: Update `src/utils/streakCalc.js`**

Change the `allPhotographed` line from:

```js
    const allPhotographed = dayEntries.every(e => !!e.photo)
```

to:

```js
    const allPhotographed = dayEntries.every(e => !!e.hasPhoto)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/utils/streakCalc.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/streakCalc.js src/utils/streakCalc.test.js
git commit -m "feat: streak uses hasPhoto flag, stable across sync"
```

---

## Task 7: Auth context

**Files:**
- Create: `src/context/AuthContext.jsx`

- [ ] **Step 1: Create `src/context/AuthContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/context/AuthContext.jsx
git commit -m "feat: add Google auth context"
```

---

## Task 8: Login page + App auth gating

**Files:**
- Create: `src/pages/LoginPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/pages/LoginPage.jsx`**

```jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState('')

  async function handleSignIn() {
    setError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(e?.message || 'Sign-in failed. Please try again.')
    }
  }

  return (
    <div className="feed-page" style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>☕</div>
      <h1 className="feed-page__heading" style={{ margin: 0 }}>my brew log</h1>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14, maxWidth: 260 }}>
        Sign in to sync your brews across devices.
      </p>
      <button
        type="button"
        onClick={handleSignIn}
        style={{
          padding: '12px 20px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-secondary)',
          fontSize: 15,
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
        }}
      >
        Continue with Google
      </button>
      {error && (
        <p style={{ color: 'var(--accent-coffee)', fontSize: 13, fontFamily: 'var(--font-body)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BrewProvider } from './context/BrewContext'
import FeedPage from './pages/FeedPage'
import AddPage from './pages/AddPage'
import DetailPage from './pages/DetailPage'
import LoginPage from './pages/LoginPage'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<FeedPage />} />
        <Route path="/add" element={
          <>
            <FeedPage />
            <AddPage />
          </>
        } />
        <Route path="/entry/:id" element={<DetailPage />} />
      </Routes>
    </AnimatePresence>
  )
}

function Gate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="feed-page" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        ☕
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <BrewProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </BrewProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoginPage.jsx src/App.jsx
git commit -m "feat: add login page and auth gating"
```

---

## Task 9: Rewire BrewContext to cache + outbox + sync

Replaces the `localStorage` reducer with the IndexedDB cache + sync engine, keeping the same public surface (`entries`, `addEntry`, `deleteEntry`, `importEntries`) plus a new `exportEntries` for photo-aware backups. `entries` items expose `photo` as an object URL and carry `hasPhoto`.

**Files:**
- Modify (full rewrite): `src/context/BrewContext.jsx`

- [ ] **Step 1: Replace `src/context/BrewContext.jsx` entirely**

```jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { createCache } from '../lib/cache'
import { dataUrlToBlob, blobToDataUrl } from '../lib/photoCodec'
import { flushOutbox, pullRemote } from '../lib/sync'

const BrewContext = createContext(null)

function isValidEntry(e) {
  return (
    e &&
    typeof e === 'object' &&
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.timestamp === 'number'
  )
}

export function BrewProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [entries, setEntries] = useState([])
  const cacheRef = useRef(null)
  const urlsRef = useRef(new Map())   // entry id -> object URL
  const syncingRef = useRef(false)

  // Build the UI entry list from cached rows, attaching object URLs for photos.
  async function hydrate(cache) {
    const rows = await cache.allEntries()
    rows.sort((a, b) => b.timestamp - a.timestamp)
    const urls = urlsRef.current
    const ui = []
    for (const row of rows) {
      let photo = urls.get(row.id) ?? null
      if (!photo && row.hasPhoto) {
        const blob = await cache.getPhotoBlob(row.id)
        if (blob) {
          photo = URL.createObjectURL(blob)
          urls.set(row.id, photo)
        }
      }
      ui.push({ ...row, photo })
    }
    setEntries(ui)
  }

  async function runSync() {
    const cache = cacheRef.current
    if (!cache || !userId || syncingRef.current) return
    syncingRef.current = true
    try {
      await flushOutbox(supabase, cache, userId)
      await pullRemote(supabase, cache, userId)
      await hydrate(cache)
    } finally {
      syncingRef.current = false
    }
  }

  // Open the cache and load whenever the signed-in user changes.
  useEffect(() => {
    let cancelled = false
    for (const url of urlsRef.current.values()) URL.revokeObjectURL(url)
    urlsRef.current = new Map()
    cacheRef.current = null
    setEntries([])

    if (!userId) return
    createCache(userId).then(async cache => {
      if (cancelled) return
      cacheRef.current = cache
      await hydrate(cache)
      runSync()
    })
    return () => { cancelled = true }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync on reconnect and tab focus.
  useEffect(() => {
    function onWake() { runSync() }
    window.addEventListener('online', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      window.removeEventListener('online', onWake)
      window.removeEventListener('focus', onWake)
    }
  }) // eslint-disable-line react-hooks/exhaustive-deps

  async function addEntry({ type, name, photo, rating, notes, color }) {
    const cache = cacheRef.current
    if (!cache) return
    const id = crypto.randomUUID()
    const entry = {
      id,
      type,
      name,
      timestamp: Date.now(),
      photo_path: null,
      hasPhoto: false,
      ...(rating != null && { rating }),
      ...(notes != null && { notes }),
      ...(color != null && { color }),
    }
    let objectUrl = null
    if (photo) {
      const blob = dataUrlToBlob(photo)
      await cache.putPhotoBlob(id, blob)
      entry.hasPhoto = true
      objectUrl = URL.createObjectURL(blob)
      urlsRef.current.set(id, objectUrl)
    }
    await cache.putEntry(entry)
    await cache.enqueue('add', entry)
    setEntries(prev => [{ ...entry, photo: objectUrl }, ...prev])
    runSync()
  }

  async function deleteEntry(id) {
    const cache = cacheRef.current
    if (!cache) return
    const existing = await cache.getEntry(id)
    await cache.removeEntry(id)
    await cache.removePhotoBlob(id)
    const url = urlsRef.current.get(id)
    if (url) { URL.revokeObjectURL(url); urlsRef.current.delete(id) }
    await cache.enqueue('delete', { id, photo_path: existing?.photo_path ?? null })
    setEntries(prev => prev.filter(e => e.id !== id))
    runSync()
  }

  // Merge a parsed backup. Existing ids are never overwritten. Embedded photo
  // data-URLs are stored as blobs through the normal add path.
  async function importEntries(raw) {
    const cache = cacheRef.current
    if (!cache) return { total: 0, valid: 0, added: 0 }
    const list = Array.isArray(raw) ? raw : []
    const valid = list.filter(isValidEntry)
    const existing = new Set((await cache.allEntries()).map(e => e.id))
    let added = 0
    for (const r of valid) {
      if (existing.has(r.id)) continue
      const entry = {
        id: r.id,
        type: r.type,
        name: r.name,
        timestamp: r.timestamp,
        photo_path: null,
        hasPhoto: false,
        ...(r.rating != null && { rating: r.rating }),
        ...(r.notes != null && { notes: r.notes }),
        ...(r.color != null && { color: r.color }),
      }
      if (r.photo) {
        const blob = dataUrlToBlob(r.photo)
        await cache.putPhotoBlob(entry.id, blob)
        entry.hasPhoto = true
      }
      await cache.putEntry(entry)
      await cache.enqueue('add', entry)
      added++
    }
    await hydrate(cache)
    runSync()
    return { total: list.length, valid: valid.length, added }
  }

  // Build a backup array with photos re-encoded as data-URLs.
  async function exportEntries() {
    const cache = cacheRef.current
    if (!cache) return []
    const rows = await cache.allEntries()
    rows.sort((a, b) => b.timestamp - a.timestamp)
    const out = []
    for (const row of rows) {
      const e = {
        id: row.id,
        type: row.type,
        name: row.name,
        timestamp: row.timestamp,
        ...(row.rating != null && { rating: row.rating }),
        ...(row.notes != null && { notes: row.notes }),
        ...(row.color != null && { color: row.color }),
      }
      if (row.hasPhoto) {
        const blob = await cache.getPhotoBlob(row.id)
        if (blob) e.photo = await blobToDataUrl(blob)
      }
      out.push(e)
    }
    return out
  }

  return (
    <BrewContext.Provider value={{ entries, addEntry, deleteEntry, importEntries, exportEntries }}>
      {children}
    </BrewContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBrew() {
  return useContext(BrewContext)
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/context/BrewContext.jsx
git commit -m "feat: back BrewContext with indexeddb cache + supabase sync"
```

---

## Task 10: Photo-aware backup export + sign-out control

`BackupControls` now exports via the async `exportEntries()` (so photos are included) and gains a "Sign out" button.

**Files:**
- Modify: `src/components/BackupControls.jsx`

- [ ] **Step 1: Update imports and hook usage**

Change the top of `src/components/BackupControls.jsx` from:

```js
import { useRef, useState } from 'react'
import { useBrew } from '../context/BrewContext'
```

to:

```js
import { useRef, useState } from 'react'
import { useBrew } from '../context/BrewContext'
import { useAuth } from '../context/AuthContext'
```

And change:

```js
  const { entries, importEntries } = useBrew()
  const fileRef = useRef(null)
  const [status, setStatus] = useState('')
```

to:

```js
  const { entries, importEntries, exportEntries } = useBrew()
  const { signOut } = useAuth()
  const fileRef = useRef(null)
  const [status, setStatus] = useState('')
```

- [ ] **Step 2: Make export use `exportEntries()`**

Change the first two lines of `handleExport` from:

```js
  async function handleExport() {
    const json = JSON.stringify(entries, null, 2)
```

to:

```js
  async function handleExport() {
    const data = await exportEntries()
    const json = JSON.stringify(data, null, 2)
```

- [ ] **Step 3: Add a Sign-out button**

Immediately before the closing `</div>` of the component's outer wrapper (after the `{status && (…)}` block), add:

```jsx
      <button
        type="button"
        onClick={signOut}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '10px 12px',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/BackupControls.jsx
git commit -m "feat: photo-aware backup export and sign-out button"
```

---

## Task 11: Full verification (manual + automated)

**Prerequisite:** Task 2 dashboard setup is done and `.env` is filled in.

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: all tests in `photoCodec`, `cache`, `sync`, `streakCalc` PASS.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Manual end-to-end**

Run: `npm run dev`, open the local URL, then verify:
1. Login page appears; "Continue with Google" completes sign-in and the feed loads.
2. Add a brew with a photo → it appears instantly; the colour picker still works.
3. In Supabase dashboard: a row exists in `entries` and an object exists under `brew-photos/<your-uid>/`.
4. DevTools → Network → Offline. Add another brew and delete one. UI updates instantly.
5. Go back Online (and/or refocus the tab). The queued add/delete sync to Supabase (verify in dashboard).
6. Open the app in a second browser/profile, sign in as the same user → both brews and their photos appear.
7. Streak chip counts only days where every entry hasPhoto.
8. Backup → Export produces a JSON file whose entries include `photo` data-URLs; Import of it on a fresh account restores entries with images.
9. Sign out returns to the login page.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: verify supabase migration — sync, offline, auth, backup"
```

---

## Self-review notes (already reconciled)

- **Spec coverage:** entries table + RLS (Task 2), private bucket + policies (Task 2), Google OAuth (Tasks 2, 7, 8), anon-key client/env (Task 1), IndexedDB cache (Task 4), outbox sync engine with triggers (Tasks 5, 9), per-user namespacing (Task 4), photo blob flow + private-download rendering (Tasks 3, 5, 9), refactored BrewContext/App/BackupControls (Tasks 9, 8, 10), LoginPage (Task 8), offline add/delete (Tasks 9, 11), retained backup (Task 10), testing (Tasks 3–6, 11). Realtime intentionally omitted (YAGNI, per spec non-goals).
- **Type consistency:** cache methods (`allEntries/getEntry/putEntry/removeEntry/getPhotoBlob/putPhotoBlob/removePhotoBlob/enqueue/allOps/removeOp`) are used identically in `sync.js`, the in-memory test fake, and `BrewContext`. `toRow`/`fromRow` names match across `sync.js` and its test. Client entry fields (`timestamp`, `photo_path`, `hasPhoto`, `photo`) are consistent across cache, sync, context, streak, and existing UI components.
