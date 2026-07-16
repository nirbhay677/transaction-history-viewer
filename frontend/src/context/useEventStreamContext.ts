import { createContext, useContext } from 'react'
import type { EventStreamState } from '../hooks/useEventStream'

export interface EventStreamContextValue extends EventStreamState {
  configurationError: string | null
}

export const EventStreamContext = createContext<EventStreamContextValue | null>(null)

export function useEventStreamContext(): EventStreamContextValue {
  const context = useContext(EventStreamContext)
  if (!context) {
    throw new Error('useEventStreamContext must be used inside EventStreamProvider')
  }
  return context
}
