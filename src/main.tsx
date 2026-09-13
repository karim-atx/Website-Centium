import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Registers the service worker that receives push notifications (src/sw.ts).
//
// BEFORE RENDER RATHER THAN AFTER, because registration is asynchronous and
// non-blocking either way: the browser fetches and installs the worker off the
// main thread, so starting it here costs the first paint nothing and means a
// tab opened and closed quickly still ends up with a worker installed.
//
// NOT AWAITED, AND FAILURE IS NOT FATAL. A worker cannot register over plain
// HTTP on a non-localhost origin, in some private-browsing modes, or where the
// user has blocked site data — and none of that should stop the app loading,
// because nothing in the app depends on it today. Settings' notification row
// feature-detects independently rather than reading anything set here, so a
// failure there shows up as "push isn't available" rather than as silence.
//
// immediate: the worker calls clients.claim(), so it controls this page as
// soon as it activates instead of from the next navigation.
registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('[pwa] Service worker registration failed:', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
