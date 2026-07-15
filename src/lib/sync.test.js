import { describe, it, expect } from 'vitest'
import {
  applyPatch,
  flushOutbox,
  fromRow,
  normalizePatch,
  pullRemote,
  toPatchRow,
  toRow,
} from './sync'

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

function okSupabase(rows = [], behavior = {}) {
  const sb = {
    _uploads: [], _upserts: [], _updates: [], _deletes: [], _removes: [],
    from: null,
    storage: { from: null },
  }

  function errorFor(value, args) {
    return typeof value === 'function' ? value(...args) : value ?? null
  }

  sb.from = () => ({
    upsert: async (row) => {
      sb._upserts.push(row)
      return { error: errorFor(behavior.upsertError, [row]) }
    },
    update(row) {
      return {
        eq: async (_column, id) => {
          sb._updates.push({ id, row })
          return { error: errorFor(behavior.updateError, [id, row]) }
        },
      }
    },
    select() { return { order: async () => ({ data: rows, error: null }) } },
    delete() {
      return {
        eq: async (_column, id) => {
          sb._deletes.push(id)
          return { error: errorFor(behavior.deleteError, [id]) }
        },
      }
    },
  })

  sb.storage.from = () => ({
    upload: async (path, blob, options) => {
      sb._uploads.push({ path, blob, options })
      return { error: errorFor(behavior.uploadError, [path, blob, options, sb._uploads.length]) }
    },
    remove: async (paths) => {
      sb._removes.push(...paths)
      return { error: errorFor(behavior.removeError, [paths]) }
    },
    download: async (path) => ({
      data: behavior.downloadError ? null : new Blob(['img'], { type: 'image/jpeg' }),
      error: errorFor(behavior.downloadError, [path]),
    }),
  })

  return sb
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
    expect(toPatchRow({ photo_path: 'x' })).toEqual({})
    expect(toPatchRow()).toEqual({})
  })

  it('maps all editable fields to their remote columns', () => {
    expect(toPatchRow({
      name: 'Tea',
      type: 'tea',
      rating: 5,
      notes: 'bright',
      location: 'office',
      timestamp: 1000,
    })).toEqual({
      name: 'Tea',
      type: 'tea',
      rating: 5,
      notes: 'bright',
      location: 'office',
      logged_at: new Date(1000).toISOString(),
    })
  })

  it('maps rating and nullable fields for clearing', () => {
    expect(toPatchRow({ type: null, rating: null, notes: null, location: null }))
      .toEqual({ type: null, rating: null, notes: null, location: null })
  })
})

describe('normalizePatch', () => {
  it('trims editable strings and keeps canonical values', () => {
    expect(normalizePatch({
      name: '  Tea  ',
      type: 'tea',
      rating: '4',
      notes: '  floral  ',
      location: '  office  ',
      timestamp: 1000,
      unknown: 'drop me',
    })).toEqual({
      name: 'Tea',
      type: 'tea',
      rating: 4,
      notes: 'floral',
      location: 'office',
      timestamp: 1000,
    })
  })

  it('drops empty names, invalid timestamps, and unknown fields', () => {
    expect(normalizePatch({
      name: '   ',
      rating: 0,
      notes: '',
      location: '',
      timestamp: Infinity,
      photo_path: 'ignored',
    })).toEqual({ rating: null, notes: null, location: null })
    expect(normalizePatch({ name: null })).toEqual({})
    expect(normalizePatch({ rating: '0' })).toEqual({ rating: null })
  })
})

describe('applyPatch', () => {
  it('sets, clears, and leaves entries untouched to mirror toPatchRow', () => {
    expect(applyPatch({ id: 'a', location: 'old' }, { location: 'new' }).location).toBe('new')
    expect('location' in applyPatch({ id: 'a', location: 'old' }, { location: null })).toBe(false)
    expect(applyPatch({ id: 'a', location: 'old' })).toEqual({ id: 'a', location: 'old' })
  })

  it('updates and clears the expanded editable fields', () => {
    const entry = {
      id: 'a', name: 'Old', type: 'coffee', rating: 3, notes: 'old',
      location: 'home', timestamp: 1,
    }
    expect(applyPatch(entry, {
      name: 'New', type: 'tea', rating: 5, notes: 'new', location: null, timestamp: 2,
    })).toEqual({ id: 'a', name: 'New', type: 'tea', rating: 5, notes: 'new', timestamp: 2 })
    expect(applyPatch(entry, { type: null, rating: null, notes: null })).toEqual({
      id: 'a', name: 'Old', type: null, location: 'home', timestamp: 1,
    })
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
    expect(fakeSb._uploads[0].options).toMatchObject({ upsert: false })
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
    expect(res).toMatchObject({ flushed: 0, failed: 1, cleanupFailed: 0 })
    expect(await c.allOps()).toHaveLength(1)
  })

  it('continues with another entry when one entry fails', async () => {
    fakeSb = okSupabase([], {
      updateError: (id) => id === 'a' ? { message: 'A failed' } : null,
    })
    const c = memCache()
    await c.enqueue('update', { id: 'a', patch: { name: 'A' } })
    await c.enqueue('update', { id: 'b', patch: { name: 'B' } })

    const res = await flushOutbox(fakeSb, c, 'u1')

    expect(res).toMatchObject({ ok: false, flushed: 1, failed: 1, cleanupFailed: 0 })
    expect(fakeSb._updates.map(update => update.id)).toEqual(['a', 'b'])
    expect((await c.allOps()).map(op => op.entry.id)).toEqual(['a'])
  })

  it('blocks later operations for a failed entry while flushing another entry', async () => {
    fakeSb = okSupabase([], {
      upsertError: (row) => row.id === 'a' ? { message: 'A failed' } : null,
    })
    const c = memCache()
    await c.enqueue('add', { id: 'a', name: 'A', timestamp: 1, hasPhoto: false })
    await c.enqueue('update', { id: 'a', patch: { name: 'A updated' } })
    await c.enqueue('add', { id: 'b', name: 'B', timestamp: 2, hasPhoto: false })

    const res = await flushOutbox(fakeSb, c, 'u1')

    expect(res).toMatchObject({ ok: false, flushed: 1, failed: 1, cleanupFailed: 0 })
    expect(fakeSb._upserts.map(row => row.id)).toEqual(['a', 'b'])
    expect(fakeSb._updates).toHaveLength(0)
    expect((await c.allOps()).map(op => op.entry.id)).toEqual(['a', 'a'])
  })

  it('flushes every operation and returns a clean summary when all succeed', async () => {
    fakeSb = okSupabase()
    const c = memCache()
    await c.enqueue('add', { id: 'a', name: 'A', timestamp: 1, hasPhoto: false })
    await c.enqueue('update', { id: 'a', patch: { name: 'A updated' } })
    await c.enqueue('delete', { id: 'b', photo_path: null, hasPhoto: false })

    const res = await flushOutbox(fakeSb, c, 'u1')

    expect(res).toEqual({ ok: true, flushed: 3, failed: 0, cleanupFailed: 0, error: null })
    expect(await c.allOps()).toHaveLength(0)
  })

  it('retries an add safely after upload success and row failure', async () => {
    let upsertCalls = 0
    fakeSb = okSupabase([], {
      uploadError: (_path, _blob, _options, call) => call === 1
        ? null
        : { statusCode: 409, message: 'The resource already exists' },
      upsertError: () => {
        upsertCalls++
        return upsertCalls === 1 ? { message: 'row failed' } : null
      },
    })
    const c = memCache()
    await c.putPhotoBlob('a', new Blob(['x'], { type: 'image/jpeg' }))
    await c.enqueue('add', { id: 'a', name: 'A', timestamp: 1, hasPhoto: true })

    const first = await flushOutbox(fakeSb, c, 'u1')
    const second = await flushOutbox(fakeSb, c, 'u1')

    expect(first).toMatchObject({ ok: false, failed: 1 })
    expect(second).toEqual({ ok: true, flushed: 1, failed: 0, cleanupFailed: 0, error: null })
    expect(fakeSb._uploads[0].options).toMatchObject({ upsert: false })
    expect(fakeSb._uploads).toHaveLength(2)
    expect(fakeSb._upserts).toHaveLength(2)
    expect(await c.allOps()).toHaveLength(0)
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

  it('drops an update for a remotely deleted row and the following pull prunes local state', async () => {
    fakeSb = okSupabase([])
    const c = memCache()
    await c.putEntry({ id: 'gone', name: 'Old', timestamp: 1, hasPhoto: false })
    await c.enqueue('update', { id: 'gone', patch: { name: 'New' } })

    const flushed = await flushOutbox(fakeSb, c, 'u1')
    expect(flushed.ok).toBe(true)
    expect(await c.allOps()).toHaveLength(0)

    await pullRemote(fakeSb, c)
    expect(await c.getEntry('gone')).toBeUndefined()
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

  it('removes a delete op even when photo cleanup fails and reports the cleanup', async () => {
    fakeSb = okSupabase([], {
      removeError: { status: 500, message: 'storage unavailable' },
    })
    const c = memCache()
    await c.enqueue('delete', { id: 'a', photo_path: 'u1/a.jpg', hasPhoto: true })

    const res = await flushOutbox(fakeSb, c, 'u1')

    expect(res).toMatchObject({ ok: false, flushed: 1, failed: 0, cleanupFailed: 1 })
    expect(res.error).toMatchObject({ message: 'storage unavailable' })
    expect(await c.allOps()).toHaveLength(0)
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

  it('caches the row and reports a soft failure when a photo download fails', async () => {
    fakeSb = okSupabase([
      { id: 'a', name: 'X', logged_at: new Date(1).toISOString(), photo_path: 'u1/a.jpg' },
    ], {
      downloadError: { status: 500, message: 'download failed' },
    })
    const c = memCache()

    const res = await pullRemote(fakeSb, c)

    expect(res).toMatchObject({ ok: true, count: 1, photoFailed: true })
    expect(await c.getEntry('a')).toMatchObject({ id: 'a', hasPhoto: true })
    expect(await c.getPhotoBlob('a')).toBeUndefined()
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
