import {
  createRpcServer,
  decodeContractEvent,
  getEventPage,
  getInitialLedger,
  type DecodedContractEvent,
  type EventStreamConfig,
} from './rpcEvents'

export type StreamConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'retrying'
  | 'stopped'

export interface EventListenerCallbacks {
  onEvent(event: DecodedContractEvent): Promise<void> | void
  onStateChange(state: StreamConnectionState): void
  onError(error: Error, retryDelayMs: number): void
}

const MAX_SEEN_EVENT_IDS = 5_000

export async function listenForContractEvents(
  config: EventStreamConfig,
  callbacks: EventListenerCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const server = createRpcServer(config.rpcUrl)
  const seenIds = new Set<string>()
  const seenOrder: string[] = []
  const pollInterval = config.pollIntervalMs ?? 3_000
  const maxBackoff = config.maxBackoffMs ?? 30_000
  let cursor: string | undefined
  let startLedger = config.startLedger
  let failures = 0

  callbacks.onStateChange('connecting')

  while (!signal.aborted) {
    try {
      startLedger ??= await getInitialLedger(server)
      const page = await getEventPage(server, config, cursor, startLedger)

      for (const rawEvent of page.events) {
        if (seenIds.has(rawEvent.id)) continue
        rememberEvent(rawEvent.id, seenIds, seenOrder)

        const event = decodeContractEvent(rawEvent)
        if (event) await callbacks.onEvent(event)
      }

      cursor = page.cursor
      failures = 0
      callbacks.onStateChange('connected')
      await abortableDelay(pollInterval, signal)
    } catch (reason) {
      if (signal.aborted) break

      failures += 1
      const retryDelay = Math.min(1_000 * 2 ** (failures - 1), maxBackoff)
      callbacks.onStateChange('retrying')
      callbacks.onError(toError(reason), retryDelay)
      await abortableDelay(retryDelay, signal)
    }
  }

  callbacks.onStateChange('stopped')
}

function rememberEvent(id: string, seen: Set<string>, order: string[]): void {
  seen.add(id)
  order.push(id)

  if (order.length > MAX_SEEN_EVENT_IDS) {
    const oldest = order.shift()
    if (oldest) seen.delete(oldest)
  }
}

function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }

    const timeout = window.setTimeout(resolve, milliseconds)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout)
        resolve()
      },
      { once: true },
    )
  })
}

function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason))
}
