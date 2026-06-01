import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import mugPhoto from '../assets/mug.png'

const FALLBACK  = '#c97b3a'
const MAX_BREWS = 3
const CUP_TOP   = 132
const CUP_BOT   = 348
const CUP_H     = 216   // CUP_BOT - CUP_TOP

function wave(y, amp, reps = 5, period = 160) {
  let d = `M ${-reps * period},${y}`
  for (let i = 0; i < reps * 2; i++) {
    const x = -reps * period + i * period
    d += ` C ${x + period * 0.25},${y - amp} ${x + period * 0.75},${y + amp} ${x + period},${y}`
  }
  d += ` L ${reps * period},${y + 20} L ${-reps * period},${y + 20} Z`
  return d
}

export default function DailyCup({ todayEntries = [], streak = 0 }) {
  const [showPhoto, setShowPhoto] = useState(false)

  const filled = todayEntries.length > 0
  const n      = Math.min(todayEntries.length, MAX_BREWS)

  // Reset to cross-section view whenever brew count changes
  useEffect(() => { setShowPhoto(false) }, [todayEntries.length])

  // Fill geometry
  const fillH  = n === 0 ? 0 : Math.round((n / MAX_BREWS) * CUP_H)
  const fillY  = CUP_BOT - fillH
  const bandH  = n > 0 ? fillH / n : 0

  // Colour bands — index 0 = oldest (bottom), index n-1 = newest (top)
  const bands = todayEntries.slice(0, n).map((entry, i) => ({
    color: entry.color || FALLBACK,
    y:     Math.round(CUP_BOT - (i + 1) * bandH),
    h:     Math.round(bandH) + 2,   // +2 to prevent sub-pixel gaps
  }))

  const topColor = filled ? (todayEntries[n - 1].color || FALLBACK) : FALLBACK

  function handleTap() {
    if (filled) setShowPhoto(p => !p)
  }

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      padding:        '24px 0 20px',
    }}>

      {/* Steam — State A only, when filled */}
      {filled && !showPhoto && (
        <div style={{
          display:   'flex',
          gap:       8,
          marginBottom: 4,
        }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width:        3,
                height:       14,
                borderRadius: 2,
                background:   'var(--text-muted)',
                opacity:      0.45,
                animation:    `steamRise 1.6s ease-in-out ${i * 0.35}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Mug stage — fixed size, layers stacked absolutely */}
      <div
        onClick={handleTap}
        style={{
          position:   'relative',
          width:      200,
          height:     200,
          background: 'white',
          cursor:     filled ? 'pointer' : 'default',
        }}
      >

        {/* ── Layer A: SVG outline + liquid fill ── */}
        <svg
          viewBox="0 0 400 400"
          width="200"
          height="200"
          style={{
            position: 'absolute',
            inset:    0,
            overflow: 'visible',
            opacity:  showPhoto ? 0 : 1,
            transition: 'opacity 0.22s ease',
            zIndex:   1,
          }}
        >
          <defs>
            <clipPath id="mug-interior-clip">
              <path d="M 127 132 L 323 132 L 323 312 Q 322 338 298 343 Q 225 348 152 343 Q 128 338 127 312 Z"/>
            </clipPath>
          </defs>

          {/* Liquid fill — spring-in when n changes */}
          {filled && (
            <g
              key={n}
              clipPath="url(#mug-interior-clip)"
              style={{
                animation: 'springIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }}
            >
              {/* Colour bands */}
              {bands.map((band, i) => (
                <rect
                  key={i}
                  x={0}
                  y={band.y}
                  width={400}
                  height={band.h}
                  fill={band.color}
                />
              ))}

              {/* Wave 1 — top drink colour, rides the surface */}
              <path
                d={wave(fillY, 8)}
                fill={topColor}
                style={{ animation: 'waveSlide 2.4s linear infinite' }}
              />

              {/* Wave 2 — white shimmer, reverse direction */}
              <path
                d={wave(fillY + 3, 5)}
                fill="rgba(255,255,255,0.18)"
                style={{ animation: 'waveSlide 3.6s linear infinite reverse' }}
              />
            </g>
          )}

          {/* Mug outline — always on top of fill, stroke only */}
          {/* Rim */}
          <ellipse
            cx="225" cy="107" rx="102" ry="21"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="2.5"
          />
          {/* Body */}
          <path
            d="M 123 107 L 124 315 Q 125 340 150 345 Q 225 350 300 345 Q 325 340 326 315 L 327 107"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Handle */}
          <path
            d="M 123 137 C 20 148, 20 285, 123 274"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {/* ── Layer B: mug photo ── */}
        <img
          src={mugPhoto}
          alt="mug"
          draggable={false}
          style={{
            position:     'absolute',
            inset:        0,
            width:        '100%',
            height:       '100%',
            objectFit:    'contain',
            mixBlendMode: 'multiply',
            opacity:      showPhoto ? 1 : 0,
            transition:   'opacity 0.22s ease',
            zIndex:       2,
            userSelect:   'none',
          }}
        />
      </div>

      {/* State hint — only when filled */}
      {filled && (
        <p style={{
          fontSize:   10,
          color:      'var(--text-muted)',
          marginTop:  4,
          fontFamily: 'var(--font-body)',
          fontStyle:  'italic',
          minHeight:  14,
        }}>
          {showPhoto ? 'tap to see inside' : 'tap to see outside'}
        </p>
      )}

      {/* Brew count label */}
      <p style={{
        fontSize:   12,
        color:      'var(--text-muted)',
        marginTop:  filled ? 2 : 8,
        fontFamily: 'var(--font-body)',
      }}>
        {filled
          ? todayEntries.length === 1
            ? "today's brew"
            : `${todayEntries.length} brews today`
          : 'nothing logged yet today'
        }
      </p>

      {/* Streak chip — unchanged */}
      {streak > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          style={{
            marginTop:   8,
            display:     'inline-flex',
            alignItems:  'center',
            gap:         5,
            background:  'var(--surface)',
            border:      '1px solid var(--border)',
            borderRadius: 99,
            padding:     '4px 12px',
            fontSize:    12,
            color:       'var(--text-secondary)',
            fontFamily:  'var(--font-body)',
          }}
        >
          <span style={{ fontSize: 13 }}>📸</span>
          <span>{streak} {streak === 1 ? 'day' : 'days'} logged</span>
        </motion.div>
      )}
    </div>
  )
}
