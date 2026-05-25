import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrew } from '../context/BrewContext'
import StarRating from '../components/StarRating'
import PhotoPicker from '../components/PhotoPicker'

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#9b8475',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 8,
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '13px 14px',
  border: '1px solid #e8e0d4',
  borderRadius: 10,
  background: '#fff',
  color: '#3d2b1f',
  fontSize: 16,
  outline: 'none',
}

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
    <div style={{ minHeight: '100dvh', background: '#faf7f2' }}>
      {/* Nav bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 16px 12px',
        borderBottom: '1px solid #e8e0d4',
        background: '#faf7f2',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#9b6b3a', fontSize: 15, cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#3d2b1f' }}>
          Log a drink
        </div>
        <div style={{ width: 52 }} />
      </div>

      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Type toggle */}
        <div>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['coffee', 'matcha'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '11px 0',
                  borderRadius: 24, border: '2px solid',
                  borderColor: type === t ? '#3d2b1f' : '#e8e0d4',
                  background: type === t ? '#3d2b1f' : 'transparent',
                  color: type === t ? '#fff' : '#9b8475',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                }}
              >
                {t === 'coffee' ? '☕' : '🍵'} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={labelStyle} htmlFor="brew-name">Name</label>
          <input
            id="brew-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. oat latte"
            autoComplete="off"
            style={inputStyle}
          />
        </div>

        {/* Photo */}
        <div>
          <label style={labelStyle}>Photo (optional)</label>
          <PhotoPicker value={photo} onChange={setPhoto} />
        </div>

        {/* Rating */}
        <div>
          <label style={labelStyle}>Rating (optional)</label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle} htmlFor="brew-notes">Notes (optional)</label>
          <textarea
            id="brew-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How was it?"
            rows={4}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          style={{
            width: '100%', padding: 16,
            background: canSave ? '#3d2b1f' : '#d4c4b0',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 16, fontWeight: 600,
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}
