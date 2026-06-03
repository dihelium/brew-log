/**
 * playDrop
 * Synthesizes a short "water drop into a bucket" sound with the Web Audio API.
 * No audio asset required. Safe to call from a user-gesture handler (e.g. a tap);
 * the AudioContext is lazily created and resumed on first use.
 *
 * The sound has two parts:
 *  1. A sine "bloop" whose pitch sweeps downward — the body of the drop.
 *  2. A brief band-passed noise burst — the surface splash/plink.
 */
let ctx

function getCtx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function playDrop() {
  const ac = getCtx()
  if (!ac) return
  const now = ac.currentTime

  // Master gain — overall volume + safety fade so nothing clicks.
  const master = ac.createGain()
  master.gain.value = 0.5
  master.connect(ac.destination)

  // 1. Pitch-dropping sine "bloop"
  const osc = ac.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(760, now)
  osc.frequency.exponentialRampToValueAtTime(170, now + 0.16)

  const oscGain = ac.createGain()
  oscGain.gain.setValueAtTime(0.0001, now)
  oscGain.gain.exponentialRampToValueAtTime(0.9, now + 0.006)
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26)

  osc.connect(oscGain).connect(master)
  osc.start(now)
  osc.stop(now + 0.3)

  // 2. Short band-passed noise splash at the moment of impact
  const dur = 0.09
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const ch = buffer.getChannelData(0)
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1)

  const noise = ac.createBufferSource()
  noise.buffer = buffer

  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2200
  bp.Q.value = 0.8

  const noiseGain = ac.createGain()
  noiseGain.gain.setValueAtTime(0.0001, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.25, now + 0.004)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur)

  noise.connect(bp).connect(noiseGain).connect(master)
  noise.start(now)
  noise.stop(now + dur)
}
