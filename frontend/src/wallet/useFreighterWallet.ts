import { useCallback, useState } from 'react'
import {
  getNetwork,
  isConnected,
  requestAccess,
} from '@stellar/freighter-api'
import { Networks } from '@stellar/stellar-sdk'

export type WalletConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'wrong-network'
  | 'error'

export interface FreighterWalletState {
  address: string | null
  status: WalletConnectionStatus
  error: string | null
  connect(): Promise<void>
}

export function useFreighterWallet(): FreighterWalletState {
  const [address, setAddress] = useState<string | null>(null)
  const [status, setStatus] =
    useState<WalletConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    setStatus('connecting')
    setError(null)

    try {
      const extension = await isConnected()
      if (extension.error || !extension.isConnected) {
        throw new Error(
          extension.error?.message ??
            'Freighter is not available. Install or unlock the Freighter browser extension.',
        )
      }

      const access = await requestAccess()
      if (access.error || !access.address) {
        throw new Error(access.error?.message ?? 'Freighter access was not granted.')
      }

      const network = await getNetwork()
      if (network.error) throw new Error(network.error.message)
      if (
        network.network !== 'TESTNET' ||
        network.networkPassphrase !== Networks.TESTNET
      ) {
        setAddress(null)
        setStatus('wrong-network')
        setError('Switch Freighter to Stellar Testnet, then connect again.')
        return
      }

      setAddress(access.address)
      setStatus('connected')
    } catch (reason) {
      setAddress(null)
      setStatus('error')
      setError(toMessage(reason))
    }
  }, [])

  return { address, status, error, connect }
}

export async function assertFreighterTestnet(): Promise<void> {
  const network = await getNetwork()
  if (network.error) throw new Error(network.error.message)
  if (
    network.network !== 'TESTNET' ||
    network.networkPassphrase !== Networks.TESTNET
  ) {
    throw new Error('Freighter is not connected to Stellar Testnet.')
  }
}

function toMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
