export default function StarRating({ value = 0, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => onChange?.(n === value ? 0 : n)}
          style={{
            fontSize: 28,
            color: n <= value ? '#c97b3a' : '#d4c4b0',
            cursor: onChange ? 'pointer' : 'default',
            lineHeight: 1,
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}
