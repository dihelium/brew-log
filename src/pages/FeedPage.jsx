import { useNavigate } from 'react-router-dom'
import { useBrew } from '../context/BrewContext'
import EntryCard from '../components/EntryCard'

export default function FeedPage() {
  const { entries } = useBrew()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh', background: '#faf7f2', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid #e8e0d4',
        background: '#faf7f2',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#3d2b1f', letterSpacing: '-0.3px' }}>
          my brew log
        </div>
        <div style={{ fontSize: 12, color: '#9b8475', marginTop: 2 }}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 24px', color: '#9b8475' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>☕</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#3d2b1f', marginBottom: 6 }}>
            No brews yet
          </div>
          <div style={{ fontSize: 14 }}>Tap + to log your first drink</div>
        </div>
      ) : (
        <div>
          {entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/add')}
        style={{
          position: 'fixed', bottom: 28, right: 24,
          width: 56, height: 56, borderRadius: '50%',
          background: '#3d2b1f', color: '#fff',
          border: 'none', fontSize: 30, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(61,43,31,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label="Log a drink"
      >
        +
      </button>
    </div>
  )
}
