import { useMemo, type PropsWithChildren } from 'react'
import { useEventStream } from '../hooks/useEventStream'
import type { EventStreamConfig } from '../stellar/rpcEvents'
import { useFreighterWalletContext } from '../wallet/useFreighterWalletContext'
import { EventStreamContext } from './useEventStreamContext'

export function EventStreamProvider({ children }: PropsWithChildren) {
  const wallet = useFreighterWalletContext()
  const { config: baseConfig, error } = useMemo(readConfiguration, [])
  const config = useMemo(
    () =>
      baseConfig
        ? { ...baseConfig, ownerAddress: wallet.address ?? undefined }
        : null,
    [baseConfig, wallet.address],
  )
  console.debug('[EventStreamContext] Event stream configuration', {
    configured: Boolean(config),
    rpcUrl: config?.rpcUrl ?? null,
    metadataContractId: config?.metadataContractId ?? null,
    registryContractId: config?.registryContractId ?? null,
    ownerAddress: config?.ownerAddress ?? null,
    startLedger: config?.startLedger ?? null,
    configurationError: error,
  })
  const stream = useEventStream(config)

  return (
    <EventStreamContext.Provider
      value={{ ...stream, config, configurationError: error }}
    >
      {children}
    </EventStreamContext.Provider>
  )
}

function readConfiguration(): {
  config: EventStreamConfig | null
  error: string | null
} {
  const rpcUrl = import.meta.env.VITE_STELLAR_RPC_URL?.trim()
  const networkPassphrase = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE?.trim()
  const metadataContractId = import.meta.env.VITE_METADATA_CONTRACT_ID?.trim()
  const registryContractId = import.meta.env.VITE_REGISTRY_CONTRACT_ID?.trim()

  if (!rpcUrl || !networkPassphrase || !metadataContractId || !registryContractId) {
    return {
      config: null,
      error:
        'Set VITE_STELLAR_RPC_URL, VITE_STELLAR_NETWORK_PASSPHRASE, VITE_METADATA_CONTRACT_ID, and VITE_REGISTRY_CONTRACT_ID.',
    }
  }

  const startLedgerValue = import.meta.env.VITE_EVENT_START_LEDGER?.trim()
  const startLedger = startLedgerValue ? Number(startLedgerValue) : undefined
  if (startLedger !== undefined && (!Number.isInteger(startLedger) || startLedger < 1)) {
    return { config: null, error: 'VITE_EVENT_START_LEDGER must be a positive integer.' }
  }

  return {
    config: {
      rpcUrl,
      networkPassphrase,
      metadataContractId,
      registryContractId,
      startLedger,
    },
    error: null,
  }
}
