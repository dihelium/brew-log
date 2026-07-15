/**
 * Return the most recently used unique locations from newest-first entries.
 * Matching is case-insensitive while the first-seen spelling is preserved.
 */
export function recentLocations(entries, limit = 5) {
  if (limit <= 0) return []

  const seen = new Set()
  const locations = []
  for (const entry of entries) {
    const location = typeof entry.location === 'string' ? entry.location.trim() : ''
    if (!location) continue

    const key = location.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    locations.push(location)
    if (locations.length === limit) break
  }
  return locations
}
