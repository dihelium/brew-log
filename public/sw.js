const CACHE_NAME = 'brew-log-v2'

const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL))
  )
  self.skipWaiting()
})

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

  // Never let the service worker cache Supabase requests. A cache-first hit
  // here once served a stale entries response indefinitely, hiding new server
  // data. Let the browser fetch them directly so reads are always fresh.
  // (Same-origin app assets and Google Fonts keep their cache-first behavior.)
  if (new URL(e.request.url).hostname.endsWith('.supabase.co')) return

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
