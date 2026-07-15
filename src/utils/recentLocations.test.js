import { describe, it, expect } from 'vitest'
import { recentLocations } from './recentLocations'

describe('recentLocations', () => {
  it('returns unique locations in entry order', () => {
    const entries = [
      { location: 'home' },
      { location: 'office' },
      { location: 'home' },
      { location: 'Blue Tokai' },
    ]
    expect(recentLocations(entries)).toEqual(['home', 'office', 'Blue Tokai'])
  })

  it('dedupes case-insensitively keeping the first-seen spelling', () => {
    const entries = [{ location: 'Home' }, { location: 'home' }, { location: 'HOME' }]
    expect(recentLocations(entries)).toEqual(['Home'])
  })

  it('skips entries without a usable location', () => {
    const entries = [
      { location: '  ' },
      { name: 'no location' },
      { location: 42 },
      { location: 'café' },
    ]
    expect(recentLocations(entries)).toEqual(['café'])
  })

  it('respects the limit', () => {
    const entries = ['a', 'b', 'c', 'd', 'e', 'f'].map(l => ({ location: l }))
    expect(recentLocations(entries)).toHaveLength(5)
    expect(recentLocations(entries, 2)).toEqual(['a', 'b'])
    expect(recentLocations(entries, 0)).toEqual([])
  })

  it('returns an empty list for no entries', () => {
    expect(recentLocations([])).toEqual([])
  })
})
