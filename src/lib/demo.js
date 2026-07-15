import { dataUrlToBlob } from './photoCodec'

const DEMO_STEP_MS = 2 * 60 * 60 * 1000

/**
 * Return three ascending timestamps on the same local calendar day as now.
 * The newest timestamp is now; earlier timestamps are clamped to midnight.
 */
export function demoTimestamps(now) {
  const current = new Date(now)
  const startOfDay = new Date(current)
  startOfDay.setHours(0, 0, 0, 0)

  const nowMs = current.getTime()
  const startOfDayMs = startOfDay.getTime()
  return [
    Math.max(startOfDayMs, nowMs - DEMO_STEP_MS * 2),
    Math.max(startOfDayMs, nowMs - DEMO_STEP_MS),
    nowMs,
  ]
}

/**
 * Build cached rows and retain each source photo for IndexedDB blob storage.
 * The photo field is stripped before a row is written to the entries store.
 */
export function buildDemoEntries(specs, now) {
  const timestamps = demoTimestamps(now)
  return specs.map((spec, index) => ({
    id: spec.id,
    type: spec.type,
    name: spec.name,
    timestamp: timestamps[index],
    photo_path: null,
    hasPhoto: true,
    rating: spec.rating,
    color: spec.color,
    photo: spec.photo,
  }))
}

/**
 * Clear and reseed the isolated demo cache. The photo module is lazy-loaded
 * so its base64 payload is excluded from the main application bundle.
 */
export async function seedDemoCache(cache, now) {
  const { DEMO_SPECS } = await import('./demoData.js')
  const entries = buildDemoEntries(DEMO_SPECS, now)

  await cache.clear()
  for (const { photo, ...row } of entries) {
    await cache.putPhotoBlob(row.id, dataUrlToBlob(photo))
    await cache.putEntry(row)
  }
}
