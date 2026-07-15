import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useBrew } from '../context/BrewContext'
import StarRating from '../components/StarRating'
import LocationField from '../components/LocationField'
import { recentLocations } from '../utils/recentLocations'
import { BREW_TYPES, brewTypeLabel } from '../utils/brewTypes'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../utils/datetimeLocal'

function formatDate(ts) {
  return new Date(ts).toLocaleString([], {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function EditActions({ onSave, onCancel, saveDisabled = false }) {
  return (
    <div className="detail-edit-actions">
      <button
        type="button"
        className="detail-location-save"
        onClick={onSave}
        disabled={saveDisabled}
      >
        Save
      </button>
      <button
        type="button"
        className="detail-location-cancel"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  )
}

function handleKeyboardActivation(event, action) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  }
}

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { entries, deleteEntry, updateEntry } = useBrew()
  const [confirming, setConfirming] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [typeDraft, setTypeDraft] = useState('coffee')
  const [dateDraft, setDateDraft] = useState('')
  const [ratingDraft, setRatingDraft] = useState(0)
  const [notesDraft, setNotesDraft] = useState('')
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

  function beginHeaderEdit() {
    setNameDraft(entry.name)
    setTypeDraft(entry.type ?? 'coffee')
    setEditingField('header')
  }

  async function handleHeaderSave() {
    if (!nameDraft.trim()) return
    await updateEntry(id, { name: nameDraft, type: typeDraft })
    setEditingField(null)
  }

  function beginDateEdit() {
    setDateDraft(toDatetimeLocalValue(entry.timestamp))
    setEditingField('date')
  }

  async function handleDateSave() {
    const timestamp = fromDatetimeLocalValue(dateDraft)
    if (!Number.isFinite(timestamp)) return
    await updateEntry(id, { timestamp })
    setEditingField(null)
  }

  function beginRatingEdit() {
    setRatingDraft(entry.rating ?? 0)
    setEditingField('rating')
  }

  async function handleRatingSave() {
    await updateEntry(id, { rating: ratingDraft })
    setEditingField(null)
  }

  function beginNotesEdit() {
    setNotesDraft(entry.notes ?? '')
    setEditingField('notes')
  }

  async function handleNotesSave() {
    await updateEntry(id, { notes: notesDraft })
    setEditingField(null)
  }

  function beginLocationEdit() {
    setLocationDraft(entry.location ?? '')
    setEditingField('location')
  }

  async function handleLocationSave() {
    await updateEntry(id, { location: locationDraft })
    setEditingField(null)
  }

  const heroAccents = {
    coffee: 'var(--accent-coffee)',
    matcha: 'var(--accent-matcha)',
    tea: 'var(--accent-tea)',
  }

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
        style={{ background: entry.photo ? 'transparent' : (heroAccents[entry.type] ?? 'var(--accent-coffee)') }}
      >
        {entry.photo
          ? <img src={entry.photo} alt="" />
          : null
        }
        <div className="detail-hero__scrim" />
        <div className="detail-hero__text">
          <button
            type="button"
            className="detail-hero__edit"
            onClick={beginHeaderEdit}
            aria-label="Edit name and type"
          >
            <h1 className="detail-hero__name">{entry.name}</h1>
            <span className="entry-card__badge" data-type={entry.type}>
              {brewTypeLabel(entry.type)}
            </span>
          </button>
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
        {editingField === 'date' ? (
          <div className="detail-edit-row">
            <label className="sheet__label" htmlFor="detail-date">Date & time</label>
            <input
              id="detail-date"
              className="sheet__input"
              type="datetime-local"
              value={dateDraft}
              onChange={event => setDateDraft(event.target.value)}
            />
            <EditActions
              onSave={handleDateSave}
              onCancel={() => setEditingField(null)}
              saveDisabled={!Number.isFinite(fromDatetimeLocalValue(dateDraft))}
            />
          </div>
        ) : (
          <button
            type="button"
            className="detail-date-row"
            onClick={beginDateEdit}
          >
            {formatDate(entry.timestamp)}
          </button>
        )}

        {editingField === 'header' && (
          <div className="detail-edit-row detail-edit-row--header">
            <label className="sheet__label" htmlFor="detail-brew-name">Name</label>
            <input
              id="detail-brew-name"
              className="sheet__input"
              type="text"
              value={nameDraft}
              onChange={event => setNameDraft(event.target.value)}
              autoComplete="off"
            />
            <span className="sheet__label">Type</span>
            <div className="detail-edit-type">
              {BREW_TYPES.map(({ id: typeId, label, emoji }) => (
                <button
                  key={typeId}
                  type="button"
                  onClick={() => setTypeDraft(typeId)}
                  className="sheet__type-btn"
                  data-active={typeDraft === typeId}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
            <EditActions
              onSave={handleHeaderSave}
              onCancel={() => setEditingField(null)}
              saveDisabled={!nameDraft.trim()}
            />
          </div>
        )}

        {editingField === 'location' ? (
          <div className="detail-location-edit">
            <LocationField
              value={locationDraft}
              onChange={setLocationDraft}
              suggestions={suggestions}
            />
            <EditActions
              onSave={handleLocationSave}
              onCancel={() => setEditingField(null)}
            />
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

        {editingField === 'rating' ? (
          <div className="detail-edit-row">
            <div className="detail-rating-editor">
              <StarRating value={ratingDraft} onChange={setRatingDraft} />
              <button
                type="button"
                className="detail-edit-clear"
                onClick={() => setRatingDraft(0)}
              >
                Clear
              </button>
            </div>
            <EditActions
              onSave={handleRatingSave}
              onCancel={() => setEditingField(null)}
            />
          </div>
        ) : (
          <div
            className="detail-rating-row"
            data-empty={!(entry.rating > 0)}
            onClick={beginRatingEdit}
            onKeyDown={event => handleKeyboardActivation(event, beginRatingEdit)}
            role="button"
            tabIndex={0}
            aria-label={entry.rating > 0 ? 'Edit rating' : 'Add rating'}
          >
            {entry.rating > 0 ? <StarRating value={entry.rating} readOnly /> : 'Add rating'}
          </div>
        )}

        {editingField === 'notes' ? (
          <div className="detail-edit-row">
            <label className="sheet__label" htmlFor="detail-notes">Notes</label>
            <textarea
              id="detail-notes"
              className="sheet__input sheet__textarea"
              value={notesDraft}
              onChange={event => setNotesDraft(event.target.value)}
              rows={4}
            />
            <EditActions
              onSave={handleNotesSave}
              onCancel={() => setEditingField(null)}
            />
          </div>
        ) : (
          <button
            type="button"
            className="detail-notes"
            data-empty={!entry.notes}
            onClick={beginNotesEdit}
          >
            {entry.notes || 'Add notes'}
          </button>
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
