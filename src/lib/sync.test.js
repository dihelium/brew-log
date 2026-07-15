import { describe, it, expect } from 'vitest'
import { flushOutbox, pullRemote, toRow, fromRow, toPatchRow, applyPatch } from './sync'

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
    _uploads: [], _upserts: [], _updates: [], _deletes: [], _removes: [],
    from() {
      return {
        upsert: async (row) => { fakeSb._upserts.push(row); return { error: null } },
        update(row) { return { eq: async (_c, id) => { fakeSb._updates.push({ id, row }); return { error: null } } } },
        select() { return { order: async () => ({ data: rows, error: null }) } },
        delete() { return { eq: async (_c, id) => { fakeSb._deletes.push(id); return { error: null } } } },
      }
    },
    storage: {
      from() {
        return {
          upload: async (path, blob) => { fakeSb._uploads.push({ path, blob }); return { error: null } },
          remove: async (paths) => { fakeSb._removes.push(...paths); return { error: null } },
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

describe('location mapping', () => {
  it('round-trips location through toRow/fromRow', () => {
    const row = toRow({ id: 'a', name: 'X', timestamp: 1000, location: 'home' }, 'u1', null)
    expect(row.location).toBe('home')
    expect(fromRow(row).location).toBe('home')
  })

  it('omits location from the entry when the row has none', () => {
    const row = toRow({ id: 'a', name: 'X', timestamp: 1000 }, 'u1', null)
    expect(row.location).toBeNull()
    expect('location' in fromRow(row)).toBe(false)
  })
})

describe('toPatchRow', () => {
  it('maps location and clears empty values to null', () => {
    expect(toPatchRow({ location: 'office' })).toEqual({ location: 'office' })
    expect(toPatchRow({ location: '' })).toEqual({ location: null })
    expect(toPatchRow({ location: null })).toEqual({ location: null })
  })

  it('ignores unknown keys', () => {
    expect(toPatchRow({ photo_path: 'x', name: 'Y' })).toEqual({})
    expect(toPatchRow()).toEqual({})
  })
})

describe('applyPatch', () => {
  it('sets, clears, and leaves entries untouched to mirror toPatchRow', () => {
    expect(applyPatch({ id: 'a', location: 'old' }, { location: 'new' }).location).toBe('new')
    expect('location' in applyPatch({ id: 'a', location: 'old' }, { location: null })).toBe(false)
    expect(applyPatch({ id: 'a', location: 'old' })).toEqual({ id: 'a', location: 'old' })
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

  it('replays an update as a partial row update without touching storage', async () => {
    fakeSb = okSupabase()
    const c = memCache()
    // Cached blob present: the update op must still never upload or write photo_path.
    await c.putPhotoBlob('a', new Blob(['x'], { type: 'image/jpeg' }))
    await c.enqueue('update', { id: 'a', patch: { location: 'home' } })
    const res = await flushOutbox(fakeSb, c, 'u1')
    expect(res.ok).toBe(true)
    expect(fakeSb._updates).toEqual([{ id: 'a', row: { location: 'home' } }])
    expect(fakeSb._uploads).toHaveLength(0)
    expect(fakeSb._upserts).toHaveLength(0)
    expect(await c.allOps()).toHaveLength(0)
  })

  it('retains an update op when the row update fails', async () => {
    fakeSb = okSupabase()
    fakeSb.from = () => ({ update: () => ({ eq: async () => ({ error: { message: 'boom' } }) }) })
    const c = memCache()
    await c.enqueue('update', { id: 'a', patch: { location: 'home' } })
    const res = await flushOutbox(fakeSb, c, 'u1')
    expect(res.ok).toBe(false)
    expect(await c.allOps()).toHaveLength(1)
  })

  it('removes the deterministic photo path on delete when only hasPhoto is known', async () => {
    fakeSb = okSupabase()
    const c = memCache()
    // photo_path never synced back, but the entry is known to have a photo.
    await c.enqueue('delete', { id: 'a', photo_path: null, hasPhoto: true })
    const res = await flushOutbox(fakeSb, c, 'u1')
    expect(res.ok).toBe(true)
    expect(fakeSb._removes).toContain('u1/a.jpg')
  })

  it('does not remove any object when the deleted entry had no photo', async () => {
    fakeSb = okSupabase()
    const c = memCache()
    await c.enqueue('delete', { id: 'a', photo_path: null, hasPhoto: false })
    await flushOutbox(fakeSb, c, 'u1')
    expect(fakeSb._removes).toHaveLength(0)
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

  it('prunes local entries deleted on another device', async () => {
    fakeSb = okSupabase([]) // server has no rows
    const c = memCache()
    await c.putEntry({ id: 'gone', name: 'X', timestamp: 1, hasPhoto: false })
    await c.putPhotoBlob('gone', new Blob(['x'], { type: 'image/jpeg' }))
    await pullRemote(fakeSb, c)
    expect(await c.getEntry('gone')).toBeUndefined()
    expect(await c.getPhotoBlob('gone')).toBeUndefined()
  })

  it('overlays pending update patches so stale rows do not revert edits', async () => {
    fakeSb = okSupabase([
      { id: 'a', name: 'X', logged_at: new Date(1).toISOString(), photo_path: null, location: 'old place' },
    ])
    const c = memCache()
    await c.putEntry({ id: 'a', name: 'X', timestamp: 1, hasPhoto: false, location: 'new place' })
    await c.enqueue('update', { id: 'a', patch: { location: 'new place' } })
    await pullRemote(fakeSb, c)
    expect((await c.getEntry('a')).location).toBe('new place')
  })

  it('keeps un-synced local creates absent from the server', async () => {
    fakeSb = okSupabase([]) // server has no rows yet
    const c = memCache()
    await c.putEntry({ id: 'new', name: 'X', timestamp: 1, hasPhoto: false })
    await c.enqueue('add', { id: 'new', name: 'X', timestamp: 1 })
    await pullRemote(fakeSb, c)
    expect(await c.getEntry('new')).toMatchObject({ id: 'new' })
  })
})
