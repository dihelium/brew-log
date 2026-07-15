export default function LocationField({ value, onChange, suggestions = [] }) {
  const visibleSuggestions = suggestions.filter(location => location !== value)

  return (
    <div className="location-field">
      <label className="sheet__label" htmlFor="brew-location">Location (optional)</label>
      <input
        id="brew-location"
        className="sheet__input"
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="e.g. home, Blue Tokai Khan Market"
        autoComplete="off"
      />
      {visibleSuggestions.length > 0 && (
        <div className="location-field__suggestions" aria-label="Recent locations">
          {visibleSuggestions.map(location => (
            <button
              key={location}
              type="button"
              className="location-field__chip"
              onClick={() => onChange(location)}
            >
              {location}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
