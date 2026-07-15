import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, getStoredTheme } from './lib/theme'

// Apply the saved theme before the first render so the app never
// paints in the wrong palette.
applyTheme(getStoredTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Production: register the offline service worker.
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
    // When an updated worker takes control, the page is now served by the new
    // worker (which no longer caches Supabase reads). Trigger one resync via the
    // existing wake path so fresh data loads immediately — without a reload that
    // would discard an in-progress add/edit draft held only in React state.
    let resynced = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (resynced) return
      resynced = true
      window.dispatchEvent(new Event('online'))
    })
  } else {
    // Dev: a previously-registered SW serves stale cached modules on reload
    // (cache-first), hiding code changes. Unregister it and clear its caches.
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister())
    })
    if (window.caches) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
    }
  }
}
