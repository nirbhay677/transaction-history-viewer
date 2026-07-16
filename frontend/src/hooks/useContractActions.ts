import { useCallback, useState } from 'react'
import {
  ConfirmationTimeoutError,
  WalletRejectedError,
  submitMetadataAction,
  type ContractActionPhase,
  type MetadataActionInput,
} from '../stellar/contractActions'
import type { EventStreamConfig } from '../stellar/rpcEvents'

export interface ContractActionState {
  phase: ContractActionPhase
  message: string | null
  transactionHash: string | null
  isBusy: boolean
  execute(input: MetadataActionInput): Promise<boolean>
  reset(): void
}

export function useContractActions(
  config: EventStreamConfig | null,
  owner: string | null,
  markPending: (hash: string) => void,
  clearPending: (hash: string) => void,
): ContractActionState {
  const [phase, setPhase] = useState<ContractActionPhase>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  const execute = useCallback(
    async (input: MetadataActionInput) => {
      if (!config || !owner) {
        setPhase('failure')
        setMessage('Connect Freighter on Testnet before submitting metadata.')
        return false
      }

      let submittedHash: string | null = null
      setTransactionHash(null)

      try {
        const result = await submitMetadataAction(config, owner, input, {
          onPhase: (nextPhase, nextMessage) => {
            setPhase(nextPhase)
            setMessage(nextMessage)
          },
          onSubmitted: (hash) => {
            submittedHash = hash
            setTransactionHash(hash)
            markPending(hash)
          },
        })
        clearPending(result.hash)
        return true
      } catch (reason) {
        if (submittedHash) clearPending(submittedHash)

        if (reason instanceof WalletRejectedError) {
          setPhase('rejected')
          setMessage('Signature request was rejected or cancelled in Freighter.')
        } else if (reason instanceof ConfirmationTimeoutError) {
          setPhase('timeout')
          setMessage(reason.message)
        } else {
          setPhase('failure')
          setMessage(friendlyError(reason))
        }
        return false
      }
    },
    [clearPending, config, markPending, owner],
  )

  const reset = useCallback(() => {
    setPhase('idle')
    setMessage(null)
    setTransactionHash(null)
  }, [])

  return {
    phase,
    message,
    transactionHash,
    isBusy: ['preparing', 'signing', 'submitting', 'pending'].includes(phase),
    execute,
    reset,
  }
}

function friendlyError(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : String(reason)
  if (/rejected|declined|cancel/i.test(message)) {
    return 'Signature request was rejected or cancelled in Freighter.'
  }
  if (/account.*not found|404/i.test(message)) {
    return 'The connected Testnet account was not found. Fund it with test XLM first.'
  }
  return message || 'The transaction could not be completed.'
}
