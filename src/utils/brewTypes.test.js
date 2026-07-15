import { describe, it, expect } from 'vitest'
import { BREW_TYPES, brewTypeEmoji, brewTypeLabel } from './brewTypes'

describe('brew types', () => {
  it('keeps the picker types in order', () => {
    expect(BREW_TYPES.map(type => type.id)).toEqual(['coffee', 'matcha', 'tea'])
  })

  it('returns labels for known types and sensible fallbacks', () => {
    expect(brewTypeLabel('tea')).toBe('Tea')
    expect(brewTypeLabel('chocolate')).toBe('Chocolate')
    expect(brewTypeLabel(null)).toBe('Brew')
    expect(brewTypeLabel('')).toBe('Brew')
  })

  it('returns the type emoji and defaults to coffee', () => {
    expect(brewTypeEmoji('tea')).toBe('🫖')
    expect(brewTypeEmoji('legacy')).toBe('☕')
    expect(brewTypeEmoji(null)).toBe('☕')
  })
})
