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
    setMetadata(new Map())
    setLastEvent(null)
    setPending(new Set())

    const refreshRegistry = async () => {
      const snapshot = await readRegistrySnapshot(server, config)
      console.debug('[useEventStream] Registry state refreshed', snapshot)
      setRegistry(snapshot)
    }

    const processEvent = async (event: DecodedContractEvent) => {
      console.debug('[useEventStream] Filter candidate', {
        eventId: event.id,
        topicName: event.name,
        actualContractId: event.contractId,
        metadataContractId: config.metadataContractId,
        registryContractId: config.registryContractId,
        eventOwner: event.owner ?? null,
        configuredOwner: config.ownerAddress ?? null,
      })

      const expectedContractId = event.name.startsWith('metadata_')
        ? config.metadataContractId
        : config.registryContractId
      if (event.contractId !== expectedContractId) {
        console.debug('[useEventStream] Discarded event: contract ID mismatch', {
          eventId: event.id,
          actualContractId: event.contractId,
          expectedContractId,
        })
        return
      }

      setLastEvent(event)
      clearTransactionPending(event.txHash)

      if (event.name === 'contract_registered' || event.name === 'contract_status_changed') {
        console.debug('[useEventStream] Registry event accepted', {
          eventId: event.id,
          topicName: event.name,
        })
        await refreshRegistry()
        return
      }

      if (!config.ownerAddress) {
        console.debug('[useEventStream] Discarded metadata event: owner is not configured', {
          eventId: event.id,
        })
        return
      }
      if (event.owner !== config.ownerAddress) {
        console.debug('[useEventStream] Discarded metadata event: owner mismatch', {
          eventId: event.id,
          eventOwner: event.owner ?? null,
          configuredOwner: config.ownerAddress,
        })
        return
      }
      if (!event.transactionHash) {
        console.debug('[useEventStream] Discarded metadata event: transaction hash missing', {
          eventId: event.id,
        })
        return
      }

      if (event.name === 'metadata_deleted') {
        console.debug('[useEventStream] Metadata delete event accepted', {
          eventId: event.id,
          transactionHash: event.transactionHash,
        })
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
      console.debug('[useEventStream] Metadata save/update event accepted', {
        eventId: event.id,
        topicName: event.name,
        transactionHash: event.transactionHash,
        record,
      })
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
