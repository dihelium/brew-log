import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { createCache } from '../lib/cache'
import { seedDemoCache } from '../lib/demo'
import { dataUrlToBlob, blobToDataUrl } from '../lib/photoCodec'
import { applyPatch, flushOutbox, normalizePatch, pullRemote } from '../lib/sync'

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
  const { user, isDemo } = useAuth()
  const userId = user?.id ?? null

  const [entries, setEntries] = useState([])
  const [demoSeedError, setDemoSeedError] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const cacheRef = useRef(null)
  const urlsRef = useRef(new Map())   // entry id -> object URL
  const syncingRef = useRef(false)
  const syncQueuedRef = useRef(false)

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
    // Revoke object URLs for entries no longer in the cache (e.g. pruned by a
    // remote delete) so they don't leak.
    const liveIds = new Set(rows.map(r => r.id))
    for (const [id, url] of urls) {
      if (!liveIds.has(id)) {
        URL.revokeObjectURL(url)
        urls.delete(id)
      }
    }
    setEntries(ui)
  }

  async function runSync() {
    const cache = cacheRef.current
    if (!cache || !userId || isDemo) return
    // A call during an active pass queues one follow-up pass, so a mutation
    // enqueued after flushOutbox snapshotted the outbox still syncs promptly.
    if (syncingRef.current) {
      syncQueuedRef.current = true
      return
    }
    syncingRef.current = true
    try {
      do {
        syncQueuedRef.current = false
        let flushResult = null
        let pullResult = null
        let passFailed = false

        try {
          flushResult = await flushOutbox(supabase, cache, userId)
        } catch {
          passFailed = true
        }

        try {
          pullResult = await pullRemote(supabase, cache)
        } catch {
          passFailed = true
        }

        if (
          !flushResult ||
          !pullResult ||
          !flushResult.ok ||
          !pullResult.ok ||
          pullResult.photoFailed
        ) {
          passFailed = true
        }
        setSyncError(passFailed)
        await hydrate(cache)
      } while (syncQueuedRef.current)
    } catch {
      setSyncError(true)
    } finally {
      syncingRef.current = false
    }
  }

  function retrySync() {
    return runSync()
  }

  // Open the cache and load whenever the signed-in user changes.
  useEffect(() => {
    let cancelled = false
    for (const url of urlsRef.current.values()) URL.revokeObjectURL(url)
    urlsRef.current = new Map()
    cacheRef.current = null
    // Intentional reset when the signed-in user changes, so one account's
    // entries never flash while the next account's cache loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries([])
    setSyncError(false)
    setDemoSeedError(false)

    if (!userId) return
    createCache(userId).then(async cache => {
      if (cancelled) return
      cacheRef.current = cache

      if (isDemo && userId === 'demo') {
        try {
          await seedDemoCache(cache, Date.now())
        } catch {
          if (!cancelled) setDemoSeedError(true)
          return
        }
        if (cancelled) return
        await hydrate(cache)
        return
      }

      await hydrate(cache)
      runSync()
    })
    return () => { cancelled = true }
  }, [userId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync on reconnect and tab focus.
  useEffect(() => {
    function onWake() { runSync() }
    window.addEventListener('online', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      window.removeEventListener('online', onWake)
      window.removeEventListener('focus', onWake)
    }
  })

  async function addEntry({ type, name, photo, rating, notes, color, location }) {
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
      ...(location != null && { location }),
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

  // Cleared optional fields stay absent in the cache and become null in the
  // remote row through the update outbox operation.
  async function updateEntry(id, patch) {
    const cache = cacheRef.current
    if (!cache) return
    const normalized = normalizePatch(patch)
    if (Object.keys(normalized).length === 0) return
    const existing = await cache.getEntry(id)
    if (!existing) return

    const nextEntry = applyPatch(existing, normalized)

    await cache.putEntry(nextEntry)
    await cache.enqueue('update', { id, patch: normalized })
    setEntries(prev => prev
      .map(entry => entry.id === id ? applyPatch(entry, normalized) : entry)
      .sort((a, b) => b.timestamp - a.timestamp))
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
    await cache.enqueue('delete', {
      id,
      photo_path: existing?.photo_path ?? null,
      hasPhoto: !!existing?.hasPhoto,
    })
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
        ...(r.location != null && { location: r.location }),
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
        ...(row.location != null && { location: row.location }),
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
    <BrewContext.Provider value={{
      entries,
      addEntry,
      updateEntry,
      deleteEntry,
      importEntries,
      exportEntries,
      demoSeedError,
      syncError,
      retrySync,
    }}>
      {children}
    </BrewContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBrew() {
  return useContext(BrewContext)
}
