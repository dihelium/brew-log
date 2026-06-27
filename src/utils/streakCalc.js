export function calcPhotoStreak(entries) {
  if (!entries || entries.length === 0) return 0

  const byDate = {}
  for (const e of entries) {
    const key = new Date(e.timestamp).toDateString()
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(e)
  }

  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  for (let i = 0; i < 366; i++) {
    const key = cursor.toDateString()
    const dayEntries = byDate[key]

    if (!dayEntries) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    const allPhotographed = dayEntries.every(e => !!e.hasPhoto)
    if (allPhotographed) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
