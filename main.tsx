import { createRoot } from 'react-dom/client'
import App from './App'
import '../index.css'
import { validateEnv } from './lib/env'
import { ErrorBoundary } from './components/ErrorBoundary'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Missing #root element')

if (!validateEnv()) {
  rootEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#05070a;color:#fff;font-family:sans-serif;"><div style="text-align:center;"><h2>Configuration Error</h2><p>Missing required environment variables. Please check your .env file.</p></div></div>'
} else {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

