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
