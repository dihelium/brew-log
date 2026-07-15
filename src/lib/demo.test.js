import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { demoTimestamps, buildDemoEntries, seedDemoCache } from './demo'
import { createCache } from './cache'

const SPECS = [
  { id: 'demo-brew-0', type: 'coffee', name: 'A', color: '#111111', rating: 4, photo: 'data:image/jpeg;base64,AAAA' },
  { id: 'demo-brew-1', type: 'coffee', name: 'B', color: '#222222', rating: 5, photo: 'data:image/jpeg;base64,BBBB' },
  { id: 'demo-brew-2', type: 'matcha', name: 'C', color: '#333333', rating: 4, photo: 'data:image/jpeg;base64,CCCC' },
]

function startOfDay(ms) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

describe('demoTimestamps', () => {
  it('midday: returns three nondecreasing same-day timestamps, all <= now', () => {
    const now = new Date('2026-07-15T13:00:00').getTime()
    const ts = demoTimestamps(now)
    expect(ts).toHaveLength(3)
    expect(ts[0]).toBeLessThanOrEqual(ts[1])
    expect(ts[1]).toBeLessThanOrEqual(ts[2])
    for (const t of ts) {
      expect(t).toBeLessThanOrEqual(now)
      expect(new Date(t).toDateString()).toBe(new Date(now).toDateString())
    }
    expect(ts[2]).toBe(now) // newest anchored at now
  })

  it('early morning: clamps earlier times to start-of-day, never future or previous day', () => {
    const now = new Date('2026-07-15T00:30:00').getTime()
    const sod = startOfDay(now)
    const ts = demoTimestamps(now)
    expect(ts[0]).toBeLessThanOrEqual(ts[1])
    expect(ts[1]).toBeLessThanOrEqual(ts[2])
    for (const t of ts) {
      expect(t).toBeGreaterThanOrEqual(sod)
      expect(t).toBeLessThanOrEqual(now)
      expect(new Date(t).toDateString()).toBe(new Date(now).toDateString())
    }
  })
})

describe('buildDemoEntries', () => {
  it('maps specs to cached rows with types coffee/coffee/matcha and ascending timestamps', () => {
    const now = new Date('2026-07-15T13:00:00').getTime()
    const rows = buildDemoEntries(SPECS, now)
    expect(rows.map(r => r.type)).toEqual(['coffee', 'coffee', 'matcha'])
    expect(rows.map(r => r.id)).toEqual(['demo-brew-0', 'demo-brew-1', 'demo-brew-2'])
    for (const r of rows) {
      expect(r.hasPhoto).toBe(true)
      expect(r.photo_path).toBeNull()
      expect(typeof r.photo).toBe('string') // retained for blob storage
    }
    expect(rows[0].timestamp).toBeLessThanOrEqual(rows[1].timestamp)
    expect(rows[1].timestamp).toBeLessThanOrEqual(rows[2].timestamp)
    expect(rows[0].color).toBe('#111111')
    expect(rows[2].rating).toBe(4)
  })
})

describe('seedDemoCache', () => {
  it('clears prior data then seeds three entries + photos, without enqueuing outbox ops', async () => {
    const cache = await createCache('demo-seed-test')
    await cache.putEntry({ id: 'stale', name: 'Old', timestamp: 1 })
    await cache.enqueue('add', { id: 'stale' })

    await seedDemoCache(cache, new Date('2026-07-15T13:00:00').getTime())

    const rows = await cache.allEntries()
    expect(rows).toHaveLength(3)
    expect(rows.find(r => r.id === 'stale')).toBeUndefined()
    // photo field is stripped from persisted rows; blob lives in photos store
    for (const r of rows) {
      expect(r).not.toHaveProperty('photo')
      expect(await cache.getPhotoBlob(r.id)).toBeDefined()
    }
    // seeded rows never enter the outbox
    expect(await cache.allOps()).toHaveLength(0)
  })
})
