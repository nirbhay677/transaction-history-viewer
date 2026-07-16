import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EventStreamProvider } from './context/EventStreamContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EventStreamProvider>
      <App />
    </EventStreamProvider>
  </StrictMode>,
)
