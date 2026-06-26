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
