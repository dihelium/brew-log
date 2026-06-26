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
  }
}

/**
 * flushOutbox — replay queued ops in order. Stops on the first failure and
 * leaves the failing op (and the rest) in the outbox for a later retry.
 * Upserts/deletes keyed by the client UUID are idempotent, so retries are safe.
 */
export async function flushOutbox(supabase, cache, userId) {
  const ops = await cache.allOps()
  for (const item of ops) {
    try {
      if (item.op === 'add') {
        let photoPath = item.entry.photo_path ?? null
        const blob = await cache.getPhotoBlob(item.entry.id)
        if (blob) {
          photoPath = `${userId}/${item.entry.id}.jpg`
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(photoPath, blob, { upsert: true, contentType: 'image/jpeg' })
          if (error) throw error
        }
        const { error } = await supabase.from('entries').upsert(toRow(item.entry, userId, photoPath))
        if (error) throw error
      } else if (item.op === 'delete') {
        const { error } = await supabase.from('entries').delete().eq('id', item.entry.id)
        if (error) throw error
        if (item.entry.photo_path) {
          await supabase.storage.from(BUCKET).remove([item.entry.photo_path])
        }
      }
      await cache.removeOp(item.seq)
    } catch (error) {
      return { ok: false, error }
    }
  }
  return { ok: true }
}

/**
 * pullRemote — fetch the user's rows, update the entries cache, and download
 * any photo blobs not already cached. Rows with a pending local delete are
 * skipped so a just-deleted entry doesn't reappear before its delete syncs.
 */
export async function pullRemote(supabase, cache, userId) {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('logged_at', { ascending: false })
  if (error) return { ok: false, error }

  const ops = await cache.allOps()
  const pendingDeletes = new Set(ops.filter(o => o.op === 'delete').map(o => o.entry.id))

  for (const row of data) {
    if (pendingDeletes.has(row.id)) continue
    await cache.putEntry(fromRow(row))
    if (row.photo_path && !(await cache.getPhotoBlob(row.id))) {
      const { data: blob } = await supabase.storage.from(BUCKET).download(row.photo_path)
      if (blob) await cache.putPhotoBlob(row.id, blob)
    }
  }
  return { ok: true, count: data.length }
}
