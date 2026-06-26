/**
 * dataUrlToBlob — converts a base64 data URL (e.g. from canvas.toDataURL)
 * into a Blob suitable for IndexedDB storage and Supabase upload.
 */
export function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',')
  const mime = head.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * blobToDataUrl — converts a Blob back into a base64 data URL.
 * Avoids FileReader so it runs in Node (tests) as well as the browser.
 */
export async function blobToDataUrl(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
  const b64 = btoa(bin)
  return `data:${blob.type || 'image/jpeg'};base64,${b64}`
}
