import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useBrew } from '../context/BrewContext'
import EntryCard from '../components/EntryCard'
import DailyCup from '../components/DailyCup'
import BackupControls from '../components/BackupControls'
import DemoBanner from '../components/DemoBanner'
import ThemePicker from '../components/ThemePicker'
import { useAuth } from '../context/AuthContext'
import { calcPhotoStreak } from '../utils/streakCalc'

export default function FeedPage() {
  const { entries, demoSeedError } = useBrew()
  const { isDemo } = useAuth()
  const navigate = useNavigate()

  const todayStr = new Date().toDateString()
  const todayEntries = [...entries]
    .filter(e => new Date(e.timestamp).toDateString() === todayStr)
    .sort((a, b) => a.timestamp - b.timestamp)

  const streak = calcPhotoStreak(entries)

  return (
    <motion.div
      className="feed-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {isDemo && <DemoBanner />}

      <div className="feed-page__heading-row">
        <span aria-hidden="true" />
        <h1 className="feed-page__heading">my brew log</h1>
        <button
          type="button"
          className="feed-page__calendar-btn"
          onClick={() => navigate('/calendar')}
          aria-label="Open calendar"
        >
          🗓
        </button>
      </div>

      {demoSeedError ? (
        <div style={{
          padding: '60px 24px',
          textAlign: 'center',
        }}>
          <p style={{
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
          }}>
            Couldn't load the demo — reconnect and retry
          </p>
          <button
            type="button"
            // Reload rather than re-import: a failed dynamic import is cached in
            // the document's module map, so an in-page retry would refetch the
            // cached rejection. Reloading re-enters demo (localStorage flag) and
            // refetches demoData.js fresh once back online.
            onClick={() => window.location.reload()}
            style={{
              minHeight: 44,
              marginTop: 16,
              padding: '10px 18px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <DailyCup todayEntries={todayEntries} streak={streak} />

          {entries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">☕</div>
              <p className="empty-state__heading">No brews yet.</p>
              <p className="empty-state__sub">Your future self will thank you for starting.</p>
            </div>
          ) : (
            <div className="feed-page__list" style={{ borderTop: '1px solid var(--border)' }}>
              {entries.map((entry, i) => (
                <EntryCard key={entry.id} entry={entry} index={i} />
              ))}
            </div>
          )}
        </>
      )}

      <ThemePicker />
      <BackupControls />

      <motion.button
        className="feed-page__fab"
        whileTap={{ scale: 0.93 }}
        onClick={() => navigate('/add')}
        aria-label="Log a drink"
      >
        +
      </motion.button>
    </motion.div>
  )
}
