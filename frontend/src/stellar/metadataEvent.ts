import type {
  DecodedContractEvent,
  TransactionMetadataRecord,
} from './rpcEvents'

export type MetadataEventResolution =
  | { kind: 'remove'; transactionHash: string }
  | {
      kind: 'upsert'
      transactionHash: string
      record: TransactionMetadataRecord
    }

export async function resolveMetadataEvent(
  event: DecodedContractEvent,
  readRecord: () => Promise<TransactionMetadataRecord>,
): Promise<MetadataEventResolution> {
  if (!event.transactionHash) {
    throw new Error('Metadata event is missing its transaction hash.')
  }

  if (event.name === 'metadata_deleted') {
    return { kind: 'remove', transactionHash: event.transactionHash }
  }

  try {
    return {
      kind: 'upsert',
      transactionHash: event.transactionHash,
      record: await readRecord(),
    }
  } catch (reason) {
    if (!isMetadataNotFoundError(reason)) throw reason

    // A historical save/update can outlive the record it originally created.
    // Its later delete event is authoritative, so replay treats it as absent.
    return { kind: 'remove', transactionHash: event.transactionHash }
  }
}

export function isMetadataNotFoundError(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason)
  return /error\s*\(\s*contract\s*,\s*#?2\s*\)/i.test(message)
}

export function applyMetadataResolution(
  current: ReadonlyMap<string, TransactionMetadataRecord>,
  resolution: MetadataEventResolution,
): Map<string, TransactionMetadataRecord> {
  const next = new Map(current)
  if (resolution.kind === 'remove') {
    next.delete(resolution.transactionHash)
  } else {
    next.set(resolution.transactionHash, resolution.record)
  }
  return next
}
