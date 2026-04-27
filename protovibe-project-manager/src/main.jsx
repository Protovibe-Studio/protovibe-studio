import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// The project manager updates its own files via download-newest-version.sh.
// While that runs, Vite's HMR client triggers full-reload (both for file
// changes and on ws-reconnect after our restart) — and the new bundle isn't
// ready yet, so the page goes blank. Stubbing programmatic reload kills both
// triggers. Cmd+R / browser refresh do NOT go through this API, so manual
// reload still works. The update modal forces a fresh load via
// location.assign(location.href) when the user clicks "Reload now".
try {
  Object.defineProperty(window.location, 'reload', {
    value: () => {},
    configurable: true,
    writable: true,
  })
} catch {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
