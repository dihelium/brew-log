export const BREW_TYPES = [
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'matcha', label: 'Matcha', emoji: '🍵' },
  { id: 'tea', label: 'Tea', emoji: '🫖' },
]

export function brewTypeLabel(type) {
  const known = BREW_TYPES.find(brewType => brewType.id === type)
  if (known) return known.label
  if (typeof type === 'string' && type.length > 0) {
    return type[0].toUpperCase() + type.slice(1)
  }
  return 'Brew'
}

export function brewTypeEmoji(type) {
  return BREW_TYPES.find(brewType => brewType.id === type)?.emoji ?? '☕'
}
