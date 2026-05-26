import { motion } from 'framer-motion'

export default function StarRating({ value = 0, onChange, readOnly = false }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <motion.button
          key={i}
          whileTap={readOnly ? undefined : { scale: 1.35 }}
          transition={{ duration: 0.12 }}
          onClick={() => !readOnly && onChange(i + 1)}
          style={{
            fontSize: readOnly ? '18px' : '24px',
            color: i < value ? 'var(--accent-coffee)' : 'var(--border-strong)',
            background: 'none',
            border: 'none',
            cursor: readOnly ? 'default' : 'pointer',
            padding: '2px',
            lineHeight: 1,
          }}
        >
          {i < value ? '★' : '☆'}
        </motion.button>
      ))}
    </div>
  )
}
