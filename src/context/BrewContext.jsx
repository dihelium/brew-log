import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { createCache } from '../lib/cache'
import { dataUrlToBlob, blobToDataUrl } from '../lib/photoCodec'
import { flushOutbox, pullRemote } from '../lib/sync'

const BrewContext = createContext(null)

function isValidEntry(e) {
  return (
    e &&
    typeof e === 'object' &&
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.timestamp === 'number'
  )
}

export function BrewProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [entries, setEntries] = useState([])
  const cacheRef = useRef(null)
  const urlsRef = useRef(new Map())   // entry id -> object URL
  const syncingRef = useRef(false)

  // Build the UI entry list from cached rows, attaching object URLs for photos.
  async function hydrate(cache) {
    const rows = await cache.allEntries()
    rows.sort((a, b) => b.timestamp - a.timestamp)
    const urls = urlsRef.current
    const ui = []
    for (const row of rows) {
      let photo = urls.get(row.id) ?? null
      if (!photo && row.hasPhoto) {
        const blob = await cache.getPhotoBlob(row.id)
        if (blob) {
          photo = URL.createObjectURL(blob)
          urls.set(row.id, photo)
        }
      }
      ui.push({ ...row, photo })
    }
    setEntries(ui)
  }

  async function runSync() {
    const cache = cacheRef.current
    if (!cache || !userId || syncingRef.current) return
    syncingRef.current = true
    try {
      await flushOutbox(supabase, cache, userId)
      await pullRemote(supabase, cache, userId)
      await hydrate(cache)
    } finally {
      syncingRef.current = false
    }
  }

  // Open the cache and load whenever the signed-in user changes.
  useEffect(() => {
    let cancelled = false
    for (const url of urlsRef.current.values()) URL.revokeObjectURL(url)
    urlsRef.current = new Map()
    cacheRef.current = null
    setEntries([])

    if (!userId) return
    createCache(userId).then(async cache => {
      if (cancelled) return
      cacheRef.current = cache
      await hydrate(cache)
      runSync()
    })
    return () => { cancelled = true }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync on reconnect and tab focus.
  useEffect(() => {
    function onWake() { runSync() }
    window.addEventListener('online', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      window.removeEventListener('online', onWake)
      window.removeEventListener('focus', onWake)
    }
  }) // eslint-disable-line react-hooks/exhaustive-deps

  async function addEntry({ type, name, photo, rating, notes, color }) {
    const cache = cacheRef.current
    if (!cache) return
    const id = crypto.randomUUID()
    const entry = {
      id,
      type,
      name,
      timestamp: Date.now(),
      photo_path: null,
      hasPhoto: false,
      ...(rating != null && { rating }),
      ...(notes != null && { notes }),
      ...(color != null && { color }),
    }
    let objectUrl = null
    if (photo) {
      const blob = dataUrlToBlob(photo)
      await cache.putPhotoBlob(id, blob)
      entry.hasPhoto = true
      objectUrl = URL.createObjectURL(blob)
      urlsRef.current.set(id, objectUrl)
    }
    await cache.putEntry(entry)
    await cache.enqueue('add', entry)
    setEntries(prev => [{ ...entry, photo: objectUrl }, ...prev])
    runSync()
  }

  async function deleteEntry(id) {
    const cache = cacheRef.current
    if (!cache) return
    const existing = await cache.getEntry(id)
    await cache.removeEntry(id)
    await cache.removePhotoBlob(id)
    const url = urlsRef.current.get(id)
    if (url) { URL.revokeObjectURL(url); urlsRef.current.delete(id) }
    await cache.enqueue('delete', { id, photo_path: existing?.photo_path ?? null })
    setEntries(prev => prev.filter(e => e.id !== id))
    runSync()
  }

  // Merge a parsed backup. Existing ids are never overwritten. Embedded photo
  // data-URLs are stored as blobs through the normal add path.
  async function importEntries(raw) {
    const cache = cacheRef.current
    if (!cache) return { total: 0, valid: 0, added: 0 }
    const list = Array.isArray(raw) ? raw : []
    const valid = list.filter(isValidEntry)
    const existing = new Set((await cache.allEntries()).map(e => e.id))
    let added = 0
    for (const r of valid) {
      if (existing.has(r.id)) continue
      const entry = {
        id: r.id,
        type: r.type,
        name: r.name,
        timestamp: r.timestamp,
        photo_path: null,
        hasPhoto: false,
        ...(r.rating != null && { rating: r.rating }),
        ...(r.notes != null && { notes: r.notes }),
        ...(r.color != null && { color: r.color }),
      }
      if (r.photo) {
        const blob = dataUrlToBlob(r.photo)
        await cache.putPhotoBlob(entry.id, blob)
        entry.hasPhoto = true
      }
      await cache.putEntry(entry)
      await cache.enqueue('add', entry)
      added++
    }
    await hydrate(cache)
    runSync()
    return { total: list.length, valid: valid.length, added }
  }

  // Build a backup array with photos re-encoded as data-URLs.
  async function exportEntries() {
    const cache = cacheRef.current
    if (!cache) return []
    const rows = await cache.allEntries()
    rows.sort((a, b) => b.timestamp - a.timestamp)
    const out = []
    for (const row of rows) {
      const e = {
        id: row.id,
        type: row.type,
        name: row.name,
        timestamp: row.timestamp,
        ...(row.rating != null && { rating: row.rating }),
        ...(row.notes != null && { notes: row.notes }),
        ...(row.color != null && { color: row.color }),
      }
      if (row.hasPhoto) {
        const blob = await cache.getPhotoBlob(row.id)
        if (blob) e.photo = await blobToDataUrl(blob)
      }
      out.push(e)
    }
    return out
  }

  return (
    <BrewContext.Provider value={{ entries, addEntry, deleteEntry, importEntries, exportEntries }}>
      {children}
    </BrewContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBrew() {
  return useContext(BrewContext)
}
