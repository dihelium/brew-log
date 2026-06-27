import { openDB } from 'idb'

/**
 * createCache — opens a per-user IndexedDB database and returns an async
 * accessor object. Three stores:
 *   entries — keyPath 'id'        (cached row objects)
 *   photos  — key = entry id      (Blob values)
 *   outbox  — keyPath 'seq' auto  (pending { seq, op, entry } items, ordered)
 */
export async function createCache(userId) {
  const db = await openDB(`brew-log-${userId}`, 1, {
    upgrade(db) {
      db.createObjectStore('entries', { keyPath: 'id' })
      db.createObjectStore('photos')
      db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true })
    },
  })

  return {
    allEntries: () => db.getAll('entries'),
    getEntry: (id) => db.get('entries', id),
    putEntry: (entry) => db.put('entries', entry),
    removeEntry: (id) => db.delete('entries', id),

    getPhotoBlob: (id) => db.get('photos', id),
    putPhotoBlob: (id, blob) => db.put('photos', blob, id),
    removePhotoBlob: (id) => db.delete('photos', id),

    enqueue: (op, entry) => db.add('outbox', { op, entry }),
    allOps: () => db.getAll('outbox'),       // returned in 'seq' key order
    removeOp: (seq) => db.delete('outbox', seq),
  }
}
