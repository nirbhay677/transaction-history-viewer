import { describe, expect, it, vi } from 'vitest'
import type { DecodedContractEvent } from './rpcEvents'
import {
  applyMetadataResolution,
  resolveMetadataEvent,
} from './metadataEvent'

const TRANSACTION_HASH = 'ab'.repeat(32)

describe.each(['metadata_saved', 'metadata_updated'] as const)(
  '%s replay after deletion',
  (name) => {
    it('removes the stale record and resolves without a stream failure', async () => {
      const readRecord = vi.fn().mockRejectedValue(
        new Error(
          'HostError: Error(Contract, #2) Diagnostic Event: metadata missing',
        ),
      )

      const resolution = await resolveMetadataEvent(createEvent(name), readRecord)
      expect(resolution).toEqual({
        kind: 'remove',
        transactionHash: TRANSACTION_HASH,
      })

      const existingRecord = {
        note: 'obsolete',
        favorite: false,
        tags: [],
        createdAt: 1n,
        updatedAt: 1n,
      }
      const metadata = applyMetadataResolution(
        new Map([[TRANSACTION_HASH, existingRecord]]),
        resolution,
      )
      expect(metadata.has(TRANSACTION_HASH)).toBe(false)
      expect(readRecord).toHaveBeenCalledOnce()
    })
  },
)

it('preserves unexpected read errors for the listener retry path', async () => {
  const failure = new Error('RPC connection closed')

  await expect(
    resolveMetadataEvent(createEvent('metadata_saved'), async () => {
      throw failure
    }),
  ).rejects.toBe(failure)
})

function createEvent(
  name: 'metadata_saved' | 'metadata_updated',
): DecodedContractEvent {
  return {
    id: `event-${name}`,
    name,
    contractId: 'C'.repeat(56),
    ledger: 1,
    ledgerClosedAt: '2026-01-01T00:00:00Z',
    txHash: 'cd'.repeat(32),
    owner: 'G'.repeat(56),
    transactionHash: TRANSACTION_HASH,
  }
}
