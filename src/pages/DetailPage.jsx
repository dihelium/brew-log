import { useNavigate, useParams } from 'react-router-dom'
import { useBrew } from '../context/BrewContext'
import StarRating from '../components/StarRating'

function formatDate(ts) {
  return new Date(ts).toLocaleString([], {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { entries, deleteEntry } = useBrew()

  const entry = entries.find(e => e.id === id)

  if (!entry) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#9b8475' }}>
        <div style={{ marginBottom: 12 }}>Entry not found.</div>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#9b6b3a', fontSize: 15, cursor: 'pointer' }}
        >
          ← Go back
        </button>
      </div>
    )
  }

  function handleDelete() {
    if (window.confirm('Delete this entry? This cannot be undone.')) {
      deleteEntry(id)
      navigate('/')
    }
  }

  const isMatcha = entry.type === 'matcha'
  const heroBg = isMatcha
    ? 'linear-gradient(135deg, #8bba8b, #4a7c59)'
    : 'linear-gradient(135deg, #c8b4a0, #8b6f5a)'

  return (
    <div style={{ minHeight: '100dvh', background: '#faf7f2' }}>
      {/* Nav bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 16px 12px',
        borderBottom: '1px solid #e8e0d4',
        background: '#faf7f2',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#9b6b3a', fontSize: 15, cursor: 'pointer', padding: 0 }}
        >
          ← Feed
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleDelete}
          style={{ background: 'none', border: 'none', color: '#cc4444', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          Delete
        </button>
      </div>

      {/* Photo hero */}
      <div style={{
        width: '100%', height: 220,
        background: entry.photo ? 'transparent' : heroBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {entry.photo
          ? <img src={entry.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 72 }}>{isMatcha ? '🍵' : '☕'}</span>
        }
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Type badge + name + date */}
        <div>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600,
            padding: '3px 10px', borderRadius: 20, marginBottom: 10,
            background: isMatcha ? '#e8f0e4' : '#f0e8e0',
            color: isMatcha ? '#4a7c59' : '#9b6b3a',
          }}>
            {entry.type}
          </span>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3d2b1f', lineHeight: 1.2 }}>
            {entry.name}
          </div>
          <div style={{ fontSize: 13, color: '#9b8475', marginTop: 5 }}>
            {formatDate(entry.timestamp)}
          </div>
        </div>

        {/* Rating */}
        {entry.rating > 0 && <StarRating value={entry.rating} />}

        {/* Notes */}
        {entry.notes && (
          <div style={{
            padding: '14px 16px',
            background: '#fff', borderRadius: 12,
            border: '1px solid #e8e0d4',
            fontSize: 15, color: '#5a4535', lineHeight: 1.65,
          }}>
            {entry.notes}
          </div>
        )}
      </div>
    </div>
  )
}
