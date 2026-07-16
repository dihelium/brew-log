import { useState, useEffect, useRef } from 'react'
import { extractDominantColor, buildPickerCanvas, sampleCanvasAt } from '../utils/extractColor'

export default function ColorPicker({ photoDataUrl, color, onChange, autoExtract = true }) {
  const [picking, setPicking] = useState(false)
  const [magnifier, setMagnifier] = useState(null)
  const pickerRef = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)

  useEffect(() => {
    if (!photoDataUrl || !autoExtract) return
    extractDominantColor(photoDataUrl).then(onChange)
  }, [photoDataUrl, autoExtract, onChange])

  async function startPicking() {
    const result = await buildPickerCanvas(photoDataUrl)
    if (!result) return
    canvasRef.current = result.canvas
    ctxRef.current = result.ctx
    setPicking(true)
    setMagnifier(null)
  }

  function handlePointerMove(e) {
    e.preventDefault()
    if (!ctxRef.current || !canvasRef.current || !pickerRef.current) return
    const touch = e.touches ? e.touches[0] : e
    const sampled = sampleCanvasAt(
      ctxRef.current,
      canvasRef.current,
      pickerRef.current,
      touch.clientX,
      touch.clientY,
    )
    const rect = pickerRef.current.getBoundingClientRect()
    setMagnifier({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
      color: sampled,
    })
  }

  function handlePointerUp(e) {
    e.preventDefault()
    if (!ctxRef.current || !canvasRef.current || !pickerRef.current) return
    const touch = e.changedTouches ? e.changedTouches[0] : e
    const sampled = sampleCanvasAt(
      ctxRef.current,
      canvasRef.current,
      pickerRef.current,
      touch.clientX,
      touch.clientY,
    )
    onChange(sampled)
    setPicking(false)
    setMagnifier(null)
  }

  if (!photoDataUrl) return null

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: color || '#c97b3a',
          border: '2px solid var(--border-strong)',
          flexShrink: 0,
        }} />
        <span style={{
          flex: 1,
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
          Drink colour
        </span>
        <button
          type="button"
          onClick={startPicking}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 12,
            color: 'var(--accent-coffee)',
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            padding: '4px 0',
            fontWeight: 500,
          }}
        >
          Pick from photo
        </button>
      </div>

      {picking && (
        <div style={{ marginTop: 8, position: 'relative', userSelect: 'none' }}>
          <p style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
            marginBottom: 6,
            textAlign: 'center',
          }}>
            Touch the photo to pick a colour
          </p>
          <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <img
              ref={pickerRef}
              src={photoDataUrl}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                display: 'block',
                cursor: 'crosshair',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                touchAction: 'none',
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />

            {magnifier && (
              <div
                style={{
                  position: 'absolute',
                  left: magnifier.x - 26,
                  top: magnifier.y - 56,
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: magnifier.color,
                  border: '3px solid white',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.28)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => { setPicking(false); setMagnifier(null) }}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '10px',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
