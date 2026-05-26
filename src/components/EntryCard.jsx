import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import StarRating from './StarRating'

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

export default function EntryCard({ entry, index = 0 }) {
  const navigate = useNavigate()

  return (
    <motion.div
      className="entry-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
      onClick={() => navigate(`/entry/${entry.id}`)}
    >
      <div className="entry-card__photo">
        {entry.photo
          ? <img src={entry.photo} alt="" />
          : <div className="entry-card__photo-placeholder" data-type={entry.type} />
        }
      </div>
      <div className="entry-card__body">
        <p className="entry-card__name">{entry.name}</p>
        <div className="entry-card__meta">
          <span className="entry-card__badge" data-type={entry.type}>
            {entry.type === 'coffee' ? 'Coffee' : 'Matcha'}
          </span>
          <span className="entry-card__time">{formatTime(entry.timestamp)}</span>
        </div>
        {entry.rating && <StarRating value={entry.rating} readOnly />}
      </div>
    </motion.div>
  )
}
