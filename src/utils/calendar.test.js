import { describe, it, expect } from 'vitest'
import { buildMonthMatrix, brewDaysInMonth, entriesForDay } from './calendar'

describe('calendar', () => {
  it('builds seven-column month weeks with leading and trailing blanks', () => {
    const matrix = buildMonthMatrix(2024, 1)

    expect(matrix).toHaveLength(5)
    expect(matrix.every(week => week.length === 7)).toBe(true)
    expect(matrix[0].slice(0, 4).every(cell => cell.date === null)).toBe(true)
    expect(matrix[0][4].date.getDate()).toBe(1)
    expect(matrix.at(-1).slice(-2).every(cell => cell.date === null)).toBe(true)
  })

  it('marks only days with entries in the requested month', () => {
    const entries = [
      { timestamp: new Date(2024, 1, 1, 9).getTime() },
      { timestamp: new Date(2024, 1, 1, 17).getTime() },
      { timestamp: new Date(2024, 1, 29, 10).getTime() },
      { timestamp: new Date(2024, 2, 1, 10).getTime() },
    ]

    expect(brewDaysInMonth(entries, 2024, 1)).toEqual(new Set([1, 29]))
  })

  it('filters a day and sorts entries from oldest to newest', () => {
    const early = { id: 'early', timestamp: new Date(2024, 1, 10, 8).getTime() }
    const late = { id: 'late', timestamp: new Date(2024, 1, 10, 18).getTime() }
    const other = { id: 'other', timestamp: new Date(2024, 1, 11, 8).getTime() }

    expect(entriesForDay([late, other, early], new Date(2024, 1, 10))).toEqual([early, late])
  })
})
