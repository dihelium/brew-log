const CACHE_NAME = 'brew-log-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
          return r
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
        }
        return r
      })
    })
  )
})
