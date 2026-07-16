import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EventStreamProvider } from './context/EventStreamContext.tsx'
import { FreighterWalletProvider } from './wallet/FreighterWalletContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FreighterWalletProvider>
      <EventStreamProvider>
        <App />
      </EventStreamProvider>
    </FreighterWalletProvider>
  </StrictMode>,
)
