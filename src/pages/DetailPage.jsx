import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useBrew } from '../context/BrewContext'
import StarRating from '../components/StarRating'
import LocationField from '../components/LocationField'
import { recentLocations } from '../utils/recentLocations'

function formatDate(ts) {
  return new Date(ts).toLocaleString([], {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { entries, deleteEntry, updateEntry } = useBrew()
  const [confirming, setConfirming] = useState(false)
  const [editingLocation, setEditingLocation] = useState(false)
  const [locationDraft, setLocationDraft] = useState('')
  const suggestions = useMemo(() => recentLocations(entries), [entries])

  const entry = entries.find(e => e.id === id)

  if (!entry) {
    return (
      <motion.div
        className="feed-page"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: 12 }}>Entry not found.</div>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-coffee)', fontSize: 15, cursor: 'pointer' }}
          >
            ← Go back
          </button>
        </div>
      </motion.div>
    )
  }

  function handleDelete() {
    deleteEntry(id)
    navigate('/')
  }

  function beginLocationEdit() {
    setLocationDraft(entry.location ?? '')
    setEditingLocation(true)
  }

  async function handleLocationSave() {
    await updateEntry(id, { location: locationDraft.trim() })
    setEditingLocation(false)
  }

  const isMatcha = entry.type === 'matcha'

  return (
    <motion.div
      className="detail-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Hero */}
      <div
        className="detail-hero"
        style={{ background: entry.photo ? 'transparent' : (isMatcha ? 'var(--accent-matcha)' : 'var(--accent-coffee)') }}
      >
        {entry.photo
          ? <img src={entry.photo} alt="" />
          : null
        }
        <div className="detail-hero__scrim" />
        <div className="detail-hero__text">
          <h1 className="detail-hero__name">{entry.name}</h1>
          <span className="entry-card__badge" data-type={entry.type}>
            {entry.type === 'coffee' ? 'Coffee' : 'Matcha'}
          </span>
        </div>
        <button
          className="detail-hero__back"
          onClick={() => navigate('/')}
          aria-label="Go back"
        >
          ←
        </button>
      </div>

      {/* Body */}
      <div className="detail-body">
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          {formatDate(entry.timestamp)}
        </div>

        {editingLocation ? (
          <div className="detail-location-edit">
            <LocationField
              value={locationDraft}
              onChange={setLocationDraft}
              suggestions={suggestions}
            />
            <div className="detail-location-actions">
              <button
                type="button"
                className="detail-location-save"
                onClick={handleLocationSave}
              >
                Save
              </button>
              <button
                type="button"
                className="detail-location-cancel"
                onClick={() => setEditingLocation(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="detail-location-row"
            data-empty={!entry.location}
            onClick={beginLocationEdit}
          >
            {entry.location ? `📍 ${entry.location}` : 'Add location'}
          </button>
        )}

        {entry.rating > 0 && (
          <div style={{ marginBottom: 16 }}>
            <StarRating value={entry.rating} readOnly />
          </div>
        )}

        {entry.notes && (
          <div className="detail-notes">
            {entry.notes}
          </div>
        )}

        {/* Delete */}
        {!confirming ? (
          <button
            className="detail-delete-btn"
            onClick={() => setConfirming(true)}
          >
            Delete brew
          </button>
        ) : (
          <div className="detail-confirm">
            <p className="detail-confirm__text">Gone forever. (We won't judge.)</p>
            <div className="detail-confirm__actions">
              <button
                className="detail-confirm__yes"
                onClick={handleDelete}
              >
                Yes, delete
              </button>
              <button
                className="detail-confirm__no"
                onClick={() => setConfirming(false)}
              >
                Keep it
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
