import { motion } from 'framer-motion'

const FALLBACK = '#c97b3a'
const MAX_BREWS = 3
const CUP_TOP = 20
const CUP_BOT = 96
const CUP_H = CUP_BOT - CUP_TOP  // 76

/**
 * buildWavePath
 * Returns an SVG path string for a sine-like wave that fills downward from y.
 * The path is 4 periods wide (192px for period=48), allowing translateX(-50%)
 * to loop seamlessly — 2 periods shift = identical wave shape.
 */
function buildWavePath(y, amplitude = 6, period = 48, reps = 4) {
  let d = `M 0,${y}`
  for (let i = 0; i < reps; i++) {
    const x0 = i * period
    d += ` C ${x0 + 12},${y - amplitude} ${x0 + 36},${y + amplitude} ${x0 + period},${y}`
  }
  d += ` L ${reps * period},200 L 0,200 Z`
  return d
}

export default function DailyCup({ todayEntries = [], streak = 0 }) {
  const filled = todayEntries.length > 0
  const n = Math.min(todayEntries.length, MAX_BREWS)

  // Fill level: proportional to number of brews (max MAX_BREWS)
  const fillH = n === 0 ? 0 : Math.round((n / MAX_BREWS) * CUP_H)
  const fillY = CUP_BOT - fillH   // y-coordinate of the liquid surface

  // Colour bands — oldest drink (index 0) at bottom, newest at top
  const bands = todayEntries.slice(0, n).map((entry, i) => {
    const yBottom = Math.round(CUP_BOT - (i / n) * fillH)
    const yTop    = Math.round(CUP_BOT - ((i + 1) / n) * fillH)
    return { color: entry.color || FALLBACK, y: yTop, h: yBottom - yTop }
  })

  const topColor = filled ? (todayEntries[n - 1].color || FALLBACK) : FALLBACK

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 0 20px',
    }}>
      {/* Cup SVG */}
      <div style={{ position: 'relative', width: 96, height: 116 }}>
        {/* Steam — only when filled */}
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

          {/* Liquid fill — springs in when entry count changes */}
          {filled && (
            <motion.g
              key={n}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            >
              <g clipPath="url(#cup-interior-clip)">
                {/* Colour bands — one rect per drink */}
                {bands.map((band, i) => (
                  <rect
                    key={i}
                    x={0}
                    y={band.y}
                    width={96}
                    height={band.h}
                    fill={band.color}
                  />
                ))}

                {/* Wave 1 — top drink colour, rides the liquid surface */}
                <path
                  d={buildWavePath(fillY)}
                  fill={topColor}
                  style={{ animation: 'waveSlide 2.4s linear infinite' }}
                />

                {/* Wave 2 — lighter shimmer, runs in reverse for depth */}
                <path
                  d={buildWavePath(fillY + 2)}
                  fill="rgba(255,255,255,0.18)"
                  style={{ animation: 'waveSlide 3.6s linear infinite reverse' }}
                />
              </g>
            </motion.g>
          )}

          {/* Cup outline — always on top */}
          {/* Rim */}
          <rect
            x="10" y="14" width="76" height="9" rx="4.5"
            fill={filled ? 'var(--surface-raised)' : 'var(--surface)'}
            stroke="var(--border-strong)"
            strokeWidth="1.5"
          />
          {/* Body */}
          <path
            d="M 14 20 L 19 96 Q 48 108 77 96 L 82 20 Z"
            fill={filled ? 'none' : 'var(--surface)'}
            stroke="var(--border-strong)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Handle */}
          <path
            d="M 82 36 Q 100 36 100 58 Q 100 80 82 80"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Label */}
      <p style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        marginTop: 8,
        fontFamily: 'var(--font-body)',
      }}>
        {filled
          ? todayEntries.length === 1
            ? "today's brew"
            : `${todayEntries.length} brews today`
          : 'nothing logged yet today'
        }
      </p>

      {/* Streak chip — only shown when streak > 0 */}
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
