import { useRef } from 'react'
import { compressImage } from '../utils/compressImage'

export default function PhotoPicker({ value, onChange }) {
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressImage(file)
      onChange(dataUrl)
    } catch {
      // compression failed — skip silently
    }
    e.target.value = ''
  }

  if (value) {
    return (
      <div style={{ position: 'relative' }}>
        <img
          src={value}
          alt="preview"
          style={{
            width: '100%',
            height: 180,
            objectFit: 'cover',
            borderRadius: 12,
            display: 'block',
          }}
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            border: 'none', borderRadius: 20, padding: '4px 12px',
            fontSize: 13, cursor: 'pointer',
          }}
        >
          Remove
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        style={{
          width: '100%', padding: 16,
          border: '2px dashed #e8e0d4', borderRadius: 12,
          background: 'transparent', color: '#9b8475',
          fontSize: 15, cursor: 'pointer',
          display: 'block',
        }}
      >
        📷  Add photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </>
  )
}
