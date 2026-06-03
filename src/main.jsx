import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
