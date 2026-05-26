import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useBrew } from '../context/BrewContext'
import EntryCard from '../components/EntryCard'

export default function FeedPage() {
  const { entries } = useBrew()
  const navigate = useNavigate()

  return (
    <motion.div
      className="feed-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <h1 className="feed-page__heading">my brew log</h1>

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">☕</div>
          <p className="empty-state__heading">No brews yet.</p>
          <p className="empty-state__sub">Your future self will thank you for starting.</p>
        </div>
      ) : (
        <div className="feed-page__list">
          {entries.map((entry, i) => (
            <EntryCard key={entry.id} entry={entry} index={i} />
          ))}
        </div>
      )}

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
