function pad(value) {
  return String(value).padStart(2, '0')
}

export function toDatetimeLocalValue(ts) {
  if (!Number.isFinite(ts)) return ''
  const date = new Date(ts)
  if (!Number.isFinite(date.getTime())) return ''

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T')
}

export function fromDatetimeLocalValue(value) {
  if (typeof value !== 'string' || !value) return NaN
  return new Date(value).getTime()
}
