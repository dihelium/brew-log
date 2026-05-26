import { motion } from 'framer-motion'

const FALLBACK = '#c97b3a'

function buildGradient(entries) {
  if (entries.length === 0) return null
  if (entries.length === 1) return entries[0].color || FALLBACK
  const n = entries.length
  const stops = entries.map((e, i) => {
    const color = e.color || FALLBACK
    const from = Math.round((i / n) * 100)
    const to = Math.round(((i + 1) / n) * 100)
    return `${color} ${from}% ${to}%`
  })
  return `linear-gradient(to top, ${stops.join(', ')})`
}

export default function DailyCup({ todayEntries = [], streak = 0 }) {
  const filled = todayEntries.length > 0
  const gradient = buildGradient(todayEntries)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 0 20px',
    }}>
      <div style={{ position: 'relative', width: 96, height: 116 }}>
        {filled && (
          <div style={{
            position: 'absolute',
            top: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
          }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: 14,
                  borderRadius: 2,
                  background: 'var(--text-muted)',
                  opacity: 0.45,
                  animation: `steamRise 1.6s ease-in-out ${i * 0.35}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        <svg
          viewBox="0 0 96 110"
          width="96"
          height="110"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <clipPath id="cup-interior-clip">
              <path d="M 14 20 L 19 96 Q 48 108 77 96 L 82 20 Z" />
            </clipPath>
          </defs>

          {filled && (
            <foreignObject
              x="14" y="20" width="68" height="76"
              clipPathUnits="userSpaceOnUse"
              style={{ clipPath: 'url(#cup-interior-clip)' }}
            >
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  width: '100%',
                  height: '100%',
                  background: gradient,
                }}
              />
            </foreignObject>
          )}

          <rect
            x="10" y="14" width="76" height="9" rx="4.5"
            fill={filled ? 'var(--surface-raised)' : 'var(--surface)'}
            stroke="var(--border-strong)"
            strokeWidth="1.5"
          />
          <path
            d="M 14 20 L 19 96 Q 48 108 77 96 L 82 20 Z"
            fill={filled ? 'none' : 'var(--surface)'}
            stroke="var(--border-strong)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M 82 36 Q 100 36 100 58 Q 100 80 82 80"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <p style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        marginTop: 8,
        fontFamily: 'var(--font-body)',
      }}>
        {filled
          ? todayEntries.length === 1
            ? 'today\'s brew'
            : `${todayEntries.length} brews today`
          : 'nothing logged yet today'
        }
      </p>

      {streak > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          style={{
            marginTop: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 99,
            padding: '4px 12px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span style={{ fontSize: 13 }}>📸</span>
          <span>
            {streak} {streak === 1 ? 'day' : 'days'} logged
          </span>
        </motion.div>
      )}
    </div>
  )
}
