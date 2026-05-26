import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useBrew } from '../context/BrewContext'
import StarRating from '../components/StarRating'
import PhotoPicker from '../components/PhotoPicker'

export default function AddPage() {
  const navigate = useNavigate()
  const { addEntry } = useBrew()

  const [type, setType] = useState('coffee')
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState(null)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')

  function handleSave() {
    if (!name.trim()) return
    addEntry({
      type,
      name: name.trim(),
      ...(photo && { photo }),
      ...(rating > 0 && { rating }),
      ...(notes.trim() && { notes: notes.trim() }),
    })
    navigate('/')
  }

  const canSave = name.trim().length > 0

  return (
    <>
      <motion.div
        className="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => navigate('/')}
      />
      <motion.div
        className="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="sheet__handle" />
        <h2 className="sheet__heading">What did you make today?</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Type toggle */}
          <div>
            <label className="sheet__label">Type</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['coffee', 'matcha'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className="sheet__type-btn"
                  data-active={type === t}
                >
                  {t === 'coffee' ? '☕' : '🍵'} {t === 'coffee' ? 'Coffee' : 'Matcha'}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="sheet__label" htmlFor="brew-name">Name</label>
            <input
              id="brew-name"
              className="sheet__input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. oat flat white, ceremonial matcha"
              autoComplete="off"
            />
          </div>

          {/* Photo */}
          <div>
            <label className="sheet__label">Photo (optional)</label>
            <PhotoPicker value={photo} onChange={setPhoto} />
          </div>

          {/* Rating */}
          <div>
            <label className="sheet__label">Rating (optional)</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Notes */}
          <div>
            <label className="sheet__label" htmlFor="brew-notes">Notes (optional)</label>
            <textarea
              id="brew-notes"
              className="sheet__input sheet__textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Tasting notes, how you brewed it, anything…"
              rows={4}
            />
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="sheet__save-btn"
          >
            Log it
          </button>
        </div>
      </motion.div>
    </>
  )
}
