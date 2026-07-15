import { describe, it, expect } from 'vitest'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from './datetimeLocal'

describe('datetimeLocal', () => {
  it('round-trips a local date and time', () => {
    const timestamp = new Date(2024, 5, 15, 13, 45).getTime()
    const value = toDatetimeLocalValue(timestamp)

    expect(value).toBe('2024-06-15T13:45')
    expect(fromDatetimeLocalValue(value)).toBe(timestamp)
  })

  it('returns empty or NaN for invalid input', () => {
    expect(toDatetimeLocalValue(NaN)).toBe('')
    expect(toDatetimeLocalValue(Infinity)).toBe('')
    expect(fromDatetimeLocalValue('')).toBeNaN()
    expect(fromDatetimeLocalValue('not-a-date')).toBeNaN()
  })
})
