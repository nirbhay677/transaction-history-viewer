import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  type xdr,
} from '@stellar/stellar-sdk'

export const EVENT_NAMES = [
  'metadata_saved',
  'metadata_updated',
  'metadata_deleted',
  'contract_registered',
  'contract_status_changed',
] as const

export type SupportedEventName = (typeof EVENT_NAMES)[number]

export interface EventStreamConfig {
  rpcUrl: string
  networkPassphrase: string
  metadataContractId: string
  registryContractId: string
  ownerAddress?: string
  startLedger?: number
  pollIntervalMs?: number
  maxBackoffMs?: number
}

export interface DecodedContractEvent {
  id: string
  name: SupportedEventName
  contractId: string
  ledger: number
  ledgerClosedAt: string
  txHash: string
  owner?: string
  transactionHash?: string
}

export interface TransactionMetadataRecord {
  note: string | null
  favorite: boolean
  tags: string[]
  createdAt: bigint
  updatedAt: bigint
}

export type RegistryStatus = 'Active' | 'Paused'

export interface RegistrySnapshot {
  defaultContractId: string
  status: RegistryStatus
}

const READ_SOURCE_ACCOUNT =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'

export function createRpcServer(rpcUrl: string): rpc.Server {
  return new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith('http://') })
}

export async function getInitialLedger(server: rpc.Server): Promise<number> {
  return (await server.getLatestLedger()).sequence
}

export async function getEventPage(
  server: rpc.Server,
  config: EventStreamConfig,
  cursor: string | undefined,
  startLedger: number,
): Promise<rpc.Api.GetEventsResponse> {
  const filters: rpc.Api.EventFilter[] = [
    {
      type: 'contract',
      contractIds: [config.metadataContractId],
      topics: [
        ['metadata_saved'],
        ['metadata_updated'],
        ['metadata_deleted'],
      ].map(encodeTopic),
    },
    {
      type: 'contract',
      contractIds: [config.registryContractId],
      topics: [
        ['contract_registered'],
        ['contract_status_changed'],
      ].map(encodeTopic),
    },
  ]

  return cursor
    ? server.getEvents({ filters, cursor, limit: 200 })
    : server.getEvents({ filters, startLedger, limit: 200 })
}

export function decodeContractEvent(
  event: rpc.Api.EventResponse,
): DecodedContractEvent | null {
  const name = nativeString(event.topic[0])
  if (!isSupportedEvent(name) || !event.contractId) {
    return null
  }

  const contractId = event.contractId.contractId()
  const owner = isMetadataEvent(name) ? nativeAddress(event.topic[1]) : undefined
  const transactionHash = isMetadataEvent(name)
    ? nativeBytes(event.topic[2])
    : undefined

  if (isMetadataEvent(name) && (!owner || !transactionHash)) {
    return null
  }

  return {
    id: event.id,
    name,
    contractId,
    ledger: event.ledger,
    ledgerClosedAt: event.ledgerClosedAt,
    txHash: event.txHash,
    owner,
    transactionHash,
  }
}

export async function readMetadata(
  server: rpc.Server,
  config: EventStreamConfig,
  owner: string,
  transactionHash: string,
): Promise<TransactionMetadataRecord> {
  const value = await simulateRead(server, config, config.metadataContractId, 'get_metadata', [
    new Address(owner).toScVal(),
    nativeToScVal(hexToBytes(transactionHash)),
  ])
  const native = scValToNative(value) as Record<string, unknown>

  return {
    note: typeof native.note === 'string' ? native.note : null,
    favorite: Boolean(native.favorite),
    tags: Array.isArray(native.tags) ? native.tags.map(String) : [],
    createdAt: BigInt(native.created_at as bigint | number | string),
    updatedAt: BigInt(native.updated_at as bigint | number | string),
  }
}

export async function readRegistrySnapshot(
  server: rpc.Server,
  config: EventStreamConfig,
): Promise<RegistrySnapshot> {
  const [defaultValue, statusValue] = await Promise.all([
    simulateRead(
      server,
      config,
      config.registryContractId,
      'get_default_contract',
      [],
    ),
    simulateRead(server, config, config.registryContractId, 'get_status', [
      new Address(config.metadataContractId).toScVal(),
    ]),
  ])

  return {
    defaultContractId: String(scValToNative(defaultValue)),
    status: normalizeStatus(scValToNative(statusValue)),
  }
}

async function simulateRead(
  server: rpc.Server,
  config: EventStreamConfig,
  contractId: string,
  method: string,
  params: xdr.ScVal[],
): Promise<xdr.ScVal> {
  const transaction = new TransactionBuilder(
    new Account(READ_SOURCE_ACCOUNT, '0'),
    {
      fee: BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    },
  )
    .addOperation(new Contract(contractId).call(method, ...params))
    .setTimeout(30)
    .build()
  const simulation = await server.simulateTransaction(transaction)

  if (!rpc.Api.isSimulationSuccess(simulation) || !simulation.result) {
    const message = rpc.Api.isSimulationError(simulation)
      ? simulation.error
      : 'Contract read returned no result'
    throw new Error(message)
  }

  return simulation.result.retval
}

function encodeTopic(parts: string[]): string[] {
  return parts.map((part) => nativeToScVal(part, { type: 'symbol' }).toXDR('base64'))
}

function nativeString(value: xdr.ScVal | undefined): string | undefined {
  if (!value) return undefined
  const native = scValToNative(value)
  return typeof native === 'string' ? native : undefined
}

function nativeAddress(value: xdr.ScVal | undefined): string | undefined {
  if (!value) return undefined
  const native = scValToNative(value)
  return native instanceof Address ? native.toString() : String(native)
}

function nativeBytes(value: xdr.ScVal | undefined): string | undefined {
  if (!value) return undefined
  const native = scValToNative(value)
  return native instanceof Uint8Array
    ? Array.from(native, (byte) => byte.toString(16).padStart(2, '0')).join('')
    : undefined
}

function hexToBytes(value: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error('Transaction hash must contain exactly 64 hexadecimal characters')
  }
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
}

function normalizeStatus(value: unknown): RegistryStatus {
  if (value === 'Active' || value === 'Paused') return value
  if (Array.isArray(value) && (value[0] === 'Active' || value[0] === 'Paused')) {
    return value[0]
  }
  if (typeof value === 'object' && value !== null) {
    if ('Active' in value) return 'Active'
    if ('Paused' in value) return 'Paused'
  }
  throw new Error('Registry returned an unsupported contract status')
}

function isSupportedEvent(value: string | undefined): value is SupportedEventName {
  return EVENT_NAMES.some((name) => name === value)
}

function isMetadataEvent(name: SupportedEventName): boolean {
  return name.startsWith('metadata_')
}
