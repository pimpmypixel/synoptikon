import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotiaStreamProvider } from '@motiadev/stream-client-react'
import { ToastProvider } from './components/ui/toast'
import './index.css'
import App from './App.tsx'

// Use current hostname for WebSocket connection (works with IP addresses)
const wsHost = window.location.hostname || 'localhost'
const wsAddress = `ws://${wsHost}:3001`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotiaStreamProvider address={wsAddress}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </MotiaStreamProvider>
  </StrictMode>,
)
