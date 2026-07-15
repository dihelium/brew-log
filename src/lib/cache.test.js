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

  it('clear() empties entries, photos, and outbox', async () => {
    const c = await createCache('user-clear')
    await c.putEntry({ id: 'a', name: 'A', timestamp: 1 })
    await c.putPhotoBlob('a', new Blob(['x'], { type: 'image/jpeg' }))
    await c.enqueue('add', { id: 'a' })

    await c.clear()

    expect(await c.allEntries()).toHaveLength(0)
    expect(await c.getPhotoBlob('a')).toBeUndefined()
    expect(await c.allOps()).toHaveLength(0)
  })
})
