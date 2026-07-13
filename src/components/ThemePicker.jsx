import { useState } from 'react'
import { THEMES, applyTheme, getStoredTheme } from '../lib/theme'

export default function ThemePicker() {
  const [active, setActive] = useState(getStoredTheme)

  function select(id) {
    setActive(applyTheme(id))
  }

  return (
    <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <p style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)',
        marginBottom: 12,
        textAlign: 'center',
      }}>
        Theme
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => select(t.id)}
            aria-label={t.label}
            aria-pressed={t.id === active}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              width: 58,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: t.swatch.bg,
              border: '1px solid var(--border-strong)',
              boxShadow: t.id === active
                ? '0 0 0 2px var(--bg), 0 0 0 4px var(--accent-primary)'
                : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: t.swatch.accent,
              }} />
            </span>
            <span style={{
              fontSize: 10,
              lineHeight: 1.2,
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              color: t.id === active ? 'var(--text-secondary)' : 'var(--text-muted)',
            }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
