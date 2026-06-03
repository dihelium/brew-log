/**
 * playDrop
 * Plays a short water-drop "plop" when a brew is logged.
 *
 * Sound: "water drop" (Plop) by florianreichelt — Freesound #683102,
 * licensed Creative Commons 0 (public domain). https://freesound.org/s/683102/
 * Original plop kept at its natural pitch and attack, with an added
 * reverb tail so it rings out ~1.8x longer. Bundled as src/assets/drop.mp3.
 *
 * Decoded once into an AudioBuffer for low-latency, overlap-safe playback.
 * Falls back to an HTMLAudioElement if Web Audio is unavailable.
 * Call from a user-gesture handler (e.g. a tap) so the context can resume.
 */
import dropUrl from '../assets/drop.mp3'

let ctx
let bufferPromise

function getCtx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function loadBuffer(ac) {
  if (!bufferPromise) {
    bufferPromise = fetch(dropUrl)
      .then(r => r.arrayBuffer())
      .then(ab => ac.decodeAudioData(ab))
      .catch(() => null)
  }
  return bufferPromise
}

export function playDrop() {
  const ac = getCtx()

  // Fallback: no Web Audio support → plain HTMLAudioElement.
  if (!ac) {
    try {
      const a = new Audio(dropUrl)
      a.volume = 0.9
      a.play().catch(() => {})
    } catch { /* no audio available */ }
    return
  }

  loadBuffer(ac).then(buffer => {
    if (!buffer) return
    const src = ac.createBufferSource()
    src.buffer = buffer
    const gain = ac.createGain()
    gain.gain.value = 0.9
    src.connect(gain).connect(ac.destination)
    src.start()
  })
}
