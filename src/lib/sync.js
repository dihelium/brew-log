const BUCKET = 'brew-photos'

/**
 * toRow — client entry -> Supabase row. Maps numeric `timestamp` to `logged_at`.
 */
export function toRow(entry, userId, photoPath) {
  return {
    id: entry.id,
    user_id: userId,
    type: entry.type ?? null,
    name: entry.name,
    rating: entry.rating ?? null,
    notes: entry.notes ?? null,
    color: entry.color ?? null,
    location: entry.location ?? null,
    photo_path: photoPath ?? null,
    logged_at: new Date(entry.timestamp).toISOString(),
  }
}

/**
 * fromRow — Supabase row -> client entry. Maps `logged_at` back to `timestamp`
 * and derives `hasPhoto` from `photo_path`.
 */
export function fromRow(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    timestamp: new Date(row.logged_at).getTime(),
    photo_path: row.photo_path ?? null,
    hasPhoto: !!row.photo_path,
    ...(row.rating != null && { rating: row.rating }),
    ...(row.notes != null && { notes: row.notes }),
    ...(row.color != null && { color: row.color }),
    ...(row.location != null && { location: row.location }),
  }
}

/**
 * normalizePatch — produce a canonical patch for the supported editable
 * client fields. Unknown fields and invalid values are dropped.
 */
export function normalizePatch(patch = {}) {
  const normalized = {}
  if (!patch || typeof patch !== 'object') return normalized

  if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
    const name = String(patch.name ?? '').trim()
    if (name) normalized.name = name
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'type')) {
    normalized.type = patch.type
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'rating')) {
    const rating = Number(patch.rating)
    if (!patch.rating || rating === 0) {
      normalized.rating = null
    } else if (Number.isFinite(rating) && rating >= 1 && rating <= 5) normalized.rating = rating
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'notes')) {
    const notes = typeof patch.notes === 'string' ? patch.notes.trim() : ''
    normalized.notes = notes || null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'location')) {
    const location = typeof patch.location === 'string' ? patch.location.trim() : ''
    normalized.location = location || null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'color')) {
    const color = String(patch.color ?? '').trim()
    if (/^#[0-9a-fA-F]{6}$/.test(color)) normalized.color = color
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'timestamp') && Number.isFinite(patch.timestamp)) {
    normalized.timestamp = patch.timestamp
  }
  return normalized
}

/**
 * toPatchRow — map canonical client patch fields to Supabase columns.
 * Empty nullable values clear their columns; absent keys never touch a column.
 */
export function toPatchRow(patch = {}) {
  const row = {}
  if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
    row.name = patch.name
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'type')) {
    row.type = patch.type
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'rating')) {
    row.rating = patch.rating ?? null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'notes')) {
    row.notes = patch.notes || null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'location')) {
    row.location = patch.location || null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'color')) {
    row.color = patch.color
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'timestamp')) {
    row.logged_at = new Date(patch.timestamp).toISOString()
  }
  return row
}

/**
 * applyPatch — overlay a pending update patch on a client entry, mirroring
 * toPatchRow: cleared values remove the optional field instead of nulling it.
 */
export function applyPatch(entry, patch = {}) {
  const next = { ...entry }
  if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
    next.name = patch.name
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'type')) {
    next.type = patch.type ?? null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'rating')) {
    if (patch.rating) next.rating = patch.rating
    else delete next.rating
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'notes')) {
    if (patch.notes) next.notes = patch.notes
    else delete next.notes
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'location')) {
    if (patch.location) next.location = patch.location
    else delete next.location
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'color')) {
    next.color = patch.color
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'timestamp')) {
    next.timestamp = patch.timestamp
  }
  return next
}

function isDuplicateUploadError(error) {
  const status = Number(error?.statusCode ?? error?.status)
  const message = [error?.message, error?.error]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return status === 409 || message.includes('already exists') || message.includes('duplicate')
}

/**
 * flushOutbox — replay queued ops in seq order. A failed op blocks only later
 * ops for the same entry during this pass, so unrelated entries can continue.
 * Failed ops remain queued for a later retry.
 */
export async function flushOutbox(supabase, cache, userId) {
  const ops = await cache.allOps()
  const blockedIds = new Set()
  let flushed = 0
  let failed = 0
  let cleanupFailed = 0
  let firstError = null

  function recordError(error) {
    if (!firstError) firstError = error
  }

  for (const item of ops) {
    const id = item.entry?.id
    if (blockedIds.has(id)) continue

    try {
      if (item.op === 'add') {
        let photoPath = item.entry.photo_path ?? null
        const blob = await cache.getPhotoBlob(item.entry.id)
        if (blob) {
          photoPath = `${userId}/${item.entry.id}.jpg`
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(photoPath, blob, { upsert: false, contentType: 'image/jpeg' })
          if (error && !isDuplicateUploadError(error)) throw error
        }
        const { error } = await supabase.from('entries').upsert(toRow(item.entry, userId, photoPath))
        if (error) throw error
      } else if (item.op === 'update') {
        const { error } = await supabase
          .from('entries')
          .update(toPatchRow(item.entry.patch))
          .eq('id', item.entry.id)
        if (error) throw error
      } else if (item.op === 'delete') {
        const { error } = await supabase.from('entries').delete().eq('id', item.entry.id)
        if (error) throw error
        // Use the stored path, or reconstruct the deterministic one when the
        // entry was deleted before its photo_path was ever synced back. This
        // covers the offline add-then-delete case so no storage object leaks.
        const path = item.entry.photo_path
          || (item.entry.hasPhoto ? `${userId}/${item.entry.id}.jpg` : null)
        if (path) {
          try {
            const { error: removeError } = await supabase.storage.from(BUCKET).remove([path])
            if (removeError) {
              cleanupFailed++
              recordError(removeError)
              console.error('Failed to remove brew photo after deleting entry', removeError)
            }
          } catch (removeError) {
            cleanupFailed++
            recordError(removeError)
            console.error('Failed to remove brew photo after deleting entry', removeError)
          }
        }
      }
      await cache.removeOp(item.seq)
      flushed++
    } catch (error) {
      blockedIds.add(id)
      failed++
      recordError(error)
    }
  }
  return {
    ok: failed === 0 && cleanupFailed === 0,
    flushed,
    failed,
    cleanupFailed,
    error: firstError,
  }
}

/**
 * pullRemote — fetch the user's rows, update the entries cache, and download
 * any photo blobs not already cached. Rows with a pending local delete are
 * skipped so a just-deleted entry doesn't reappear before its delete syncs,
 * and pending update patches are overlaid so an edit enqueued during a sync
 * pass isn't reverted by the stale remote row.
 * Local entries absent from the server (deleted on another device) are pruned,
 * unless they're still waiting to upload locally (pending add).
 * RLS scopes the query to the signed-in user, so no userId argument is needed.
 */
export async function pullRemote(supabase, cache) {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('logged_at', { ascending: false })
  if (error) return { ok: false, error }

  const ops = await cache.allOps()
  const pendingDeletes = new Set(ops.filter(o => o.op === 'delete').map(o => o.entry.id))
  const pendingAdds = new Set(ops.filter(o => o.op === 'add').map(o => o.entry.id))
  const pendingPatches = new Map()
  for (const o of ops) {
    if (o.op !== 'update') continue
    pendingPatches.set(o.entry.id, { ...pendingPatches.get(o.entry.id), ...o.entry.patch })
  }
  const serverIds = new Set(data.map(r => r.id))
  let photoFailed = false

  // Prune entries that were deleted on another device. Keep un-synced local
  // creates (pending add) so they aren't lost before they reach the server.
  for (const local of await cache.allEntries()) {
    if (!serverIds.has(local.id) && !pendingAdds.has(local.id)) {
      await cache.removeEntry(local.id)
      await cache.removePhotoBlob(local.id)
    }
  }

  for (const row of data) {
    if (pendingDeletes.has(row.id)) continue
    await cache.putEntry(applyPatch(fromRow(row), pendingPatches.get(row.id)))
    if (row.photo_path && !(await cache.getPhotoBlob(row.id))) {
      try {
        const { data: blob, error: downloadError } = await supabase.storage
          .from(BUCKET)
          .download(row.photo_path)
        if (downloadError) {
          photoFailed = true
          console.error('Failed to download brew photo', downloadError)
        } else if (blob) {
          await cache.putPhotoBlob(row.id, blob)
        }
      } catch (downloadError) {
        photoFailed = true
        console.error('Failed to download brew photo', downloadError)
      }
    }
  }
  return { ok: true, count: data.length, photoFailed }
}
