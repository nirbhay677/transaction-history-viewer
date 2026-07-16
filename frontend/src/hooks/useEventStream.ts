import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listenForContractEvents,
  type StreamConnectionState,
} from '../stellar/eventListener'
import {
  createRpcServer,
  readMetadata,
  readRegistrySnapshot,
  type DecodedContractEvent,
  type EventStreamConfig,
  type RegistrySnapshot,
  type TransactionMetadataRecord,
} from '../stellar/rpcEvents'

export interface EventStreamState {
  connectionState: StreamConnectionState
  metadata: ReadonlyMap<string, TransactionMetadataRecord>
  registry: RegistrySnapshot | null
  pendingTransactionHashes: ReadonlySet<string>
  lastEvent: DecodedContractEvent | null
  error: string | null
  retryDelayMs: number | null
  markTransactionPending(transactionHash: string): void
  clearTransactionPending(transactionHash: string): void
}

export function useEventStream(config: EventStreamConfig | null): EventStreamState {
  const [connectionState, setConnectionState] =
    useState<StreamConnectionState>('idle')
  const [metadata, setMetadata] = useState(
    () => new Map<string, TransactionMetadataRecord>(),
  )
  const [registry, setRegistry] = useState<RegistrySnapshot | null>(null)
  const [pending, setPending] = useState(() => new Set<string>())
  const [lastEvent, setLastEvent] = useState<DecodedContractEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryDelayMs, setRetryDelayMs] = useState<number | null>(null)

  const markTransactionPending = useCallback((transactionHash: string) => {
    setPending((current) => new Set(current).add(transactionHash.toLowerCase()))
  }, [])

  const clearTransactionPending = useCallback((transactionHash: string) => {
    setPending((current) => {
      const next = new Set(current)
      next.delete(transactionHash.toLowerCase())
      return next
    })
  }, [])

  useEffect(() => {
    if (!config) {
      setConnectionState('idle')
      return
    }

    const controller = new AbortController()
    const server = createRpcServer(config.rpcUrl)

    const refreshRegistry = async () => {
      setRegistry(await readRegistrySnapshot(server, config))
    }

    const processEvent = async (event: DecodedContractEvent) => {
      setLastEvent(event)
      clearTransactionPending(event.txHash)

      if (event.name === 'contract_registered' || event.name === 'contract_status_changed') {
        await refreshRegistry()
        return
      }

      if (!config.ownerAddress || event.owner !== config.ownerAddress) return
      if (!event.transactionHash) return

      if (event.name === 'metadata_deleted') {
        setMetadata((current) => {
          const next = new Map(current)
          next.delete(event.transactionHash!)
          return next
        })
        return
      }

      const record = await readMetadata(
        server,
        config,
        config.ownerAddress,
        event.transactionHash,
      )
      setMetadata((current) => new Map(current).set(event.transactionHash!, record))
    }

    void refreshRegistry().catch((reason: unknown) => {
      setError(toMessage(reason))
    })

    void listenForContractEvents(
      config,
      {
        onEvent: processEvent,
        onStateChange: (state) => {
          setConnectionState(state)
          if (state === 'connected') {
            setError(null)
            setRetryDelayMs(null)
          }
        },
        onError: (streamError, delay) => {
          setError(streamError.message)
          setRetryDelayMs(delay)
        },
      },
      controller.signal,
    )

    return () => controller.abort()
  }, [clearTransactionPending, config])

  return useMemo(
    () => ({
      connectionState,
      metadata,
      registry,
      pendingTransactionHashes: pending,
      lastEvent,
      error,
      retryDelayMs,
      markTransactionPending,
      clearTransactionPending,
    }),
    [
      clearTransactionPending,
      connectionState,
      error,
      lastEvent,
      markTransactionPending,
      metadata,
      pending,
      registry,
      retryDelayMs,
    ],
  )
}

function toMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
