import { useNavigate } from 'react-router-dom'

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = now.toDateString() === d.toDateString()
  const isYesterday = new Date(now - 86400000).toDateString() === d.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const day = isToday ? 'Today' : isYesterday ? 'Yesterday'
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return `${day}, ${time}`
}

export default function EntryCard({ entry }) {
  const navigate = useNavigate()

  const stripBg = entry.type === 'matcha' ? '#d4e8d4' : '#e8ddd4'
  const emoji = entry.type === 'matcha' ? '🍵' : '☕'

  return (
    <div
      onClick={() => navigate(`/entry/${entry.id}`)}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: '1px solid #e8e0d4',
        background: '#fff',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Photo strip */}
      <div
        style={{
          width: 64,
          minHeight: 72,
          flexShrink: 0,
          background: entry.photo ? 'transparent' : stripBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {entry.photo
          ? <img src={entry.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 24 }}>{emoji}</span>
        }
      </div>

      {/* Text body */}
      <div style={{ padding: '10px 14px', flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#3d2b1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.name}
        </div>
        <div style={{ fontSize: 11, color: '#9b8475', marginTop: 2 }}>
          {entry.type} · {formatTime(entry.timestamp)}
        </div>
        {entry.rating > 0 && (
          <div style={{ fontSize: 11, color: '#c97b3a', marginTop: 4 }}>
            {'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}
          </div>
        )}
      </div>
    </div>
  )
}
