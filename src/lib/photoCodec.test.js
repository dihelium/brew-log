import { describe, it, expect } from 'vitest'
import { dataUrlToBlob, blobToDataUrl } from './photoCodec'

// 1x1 transparent PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

describe('photoCodec', () => {
  it('dataUrlToBlob produces a Blob with the right mime type', () => {
    const blob = dataUrlToBlob(PNG)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('roundtrips data-url -> blob -> data-url', async () => {
    const blob = dataUrlToBlob(PNG)
    const back = await blobToDataUrl(blob)
    expect(back).toBe(PNG)
  })
})
