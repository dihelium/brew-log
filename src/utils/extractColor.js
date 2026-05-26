export function extractDominantColor(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      try {
        const SIZE = 60
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        const sx = img.width * 0.25
        const sy = img.height * 0.25
        const sw = img.width * 0.5
        const sh = img.height * 0.5
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SIZE, SIZE)
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2]
          const brightness = (pr + pg + pb) / 3
          if (brightness >= 40 && brightness <= 210) {
            r += pr; g += pg; b += pb; count++
          }
        }
        if (count === 0) { resolve('#c97b3a'); return }
        resolve(toHex(Math.round(r / count), Math.round(g / count), Math.round(b / count)))
      } catch {
        resolve('#c97b3a')
      }
    }
    img.onerror = () => resolve('#c97b3a')
    img.src = dataUrl
  })
}

export function buildPickerCanvas(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve({ canvas, ctx })
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

export function sampleCanvasAt(ctx, canvas, imgEl, clientX, clientY) {
  try {
    const rect = imgEl.getBoundingClientRect()
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const x = Math.floor(relX * (canvas.width - 1))
    const y = Math.floor(relY * (canvas.height - 1))
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
    return toHex(r, g, b)
  } catch {
    return '#c97b3a'
  }
}

function toHex(r, g, b) {
  return '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')
}
