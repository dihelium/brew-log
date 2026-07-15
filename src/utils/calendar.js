export function dayKey(ts) {
  return new Date(ts).toDateString()
}

export function buildMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = firstDay.getDay()
  const weekCount = Math.ceil((leadingBlanks + daysInMonth) / 7)
  const cells = []

  for (let index = 0; index < weekCount * 7; index++) {
    const day = index - leadingBlanks + 1
    if (day < 1 || day > daysInMonth) {
      cells.push({ date: null, inMonth: false })
    } else {
      cells.push({ date: new Date(year, month, day), inMonth: true })
    }
  }

  const weeks = []
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }
  return weeks
}

export function brewDaysInMonth(entries, year, month) {
  const days = new Set()
  for (const entry of entries) {
    const date = new Date(entry.timestamp)
    if (
      Number.isFinite(date.getTime())
      && date.getFullYear() === year
      && date.getMonth() === month
    ) {
      days.add(date.getDate())
    }
  }
  return days
}

export function entriesForDay(entries, date) {
  const selectedDay = dayKey(date.getTime())
  return entries
    .filter(entry => dayKey(entry.timestamp) === selectedDay)
    .sort((a, b) => a.timestamp - b.timestamp)
}
