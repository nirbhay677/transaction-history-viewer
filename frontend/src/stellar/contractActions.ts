import { signTransaction } from '@stellar/freighter-api'
import {
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  xdr,
} from '@stellar/stellar-sdk'
import type { EventStreamConfig } from './rpcEvents'
import { assertFreighterTestnet } from '../wallet/useFreighterWallet'

export type MetadataAction = 'save' | 'update' | 'delete'
export type ContractActionPhase =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'submitting'
  | 'pending'
  | 'success'
  | 'rejected'
  | 'failure'
  | 'timeout'

export interface MetadataActionInput {
  action: MetadataAction
  transactionHash: string
  note: string
  tags: string
  favorite: boolean
}

export interface ContractActionResult {
  hash: string
}

export interface ContractActionCallbacks {
  onPhase(phase: ContractActionPhase, message: string): void
  onSubmitted(hash: string): void
}

const CONFIRMATION_ATTEMPTS = 30
const CONFIRMATION_DELAY_MS = 1_000

export async function submitMetadataAction(
  config: EventStreamConfig,
  owner: string,
  input: MetadataActionInput,
  callbacks: ContractActionCallbacks,
): Promise<ContractActionResult> {
  validateInput(input)
  callbacks.onPhase('preparing', 'Preparing and simulating the Soroban transaction...')
  await assertFreighterTestnet()

  const server = new rpc.Server(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith('http://'),
  })
  const account = await server.getAccount(owner)
  const contract = new Contract(config.metadataContractId)
  const ownerValue = new Address(owner).toScVal()
  const transactionHashValue = nativeToScVal(hexToBytes(input.transactionHash))
  const args = [ownerValue, transactionHashValue]

  if (input.action !== 'delete') {
    args.push(metadataInputToScVal(input))
  }

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call(`${input.action}_metadata`, ...args))
    .setTimeout(60)
    .build()
  const prepared = await server.prepareTransaction(transaction)

  callbacks.onPhase('signing', 'Confirm the transaction in Freighter...')
  const signed = await signTransaction(prepared.toXDR(), {
    address: owner,
    networkPassphrase: config.networkPassphrase,
  })
  if (signed.error || !signed.signedTxXdr) {
    throw new WalletRejectedError(
      signed.error?.message ?? 'The transaction was not signed.',
    )
  }

  callbacks.onPhase('submitting', 'Submitting the signed transaction to Testnet...')
  const signedTransaction = TransactionBuilder.fromXDR(
    signed.signedTxXdr,
    config.networkPassphrase,
  )
  const submission = await server.sendTransaction(signedTransaction)
  if (submission.status !== 'PENDING' && submission.status !== 'DUPLICATE') {
    throw new Error(friendlySubmissionError(submission.status))
  }

  callbacks.onSubmitted(submission.hash)
  callbacks.onPhase('pending', 'Transaction submitted. Waiting for confirmation...')

  for (let attempt = 0; attempt < CONFIRMATION_ATTEMPTS; attempt += 1) {
    const result = await server.getTransaction(submission.hash)
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      callbacks.onPhase('success', 'Transaction confirmed successfully.')
      return { hash: submission.hash }
    }
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('The contract transaction failed on Stellar Testnet.')
    }
    await delay(CONFIRMATION_DELAY_MS)
  }

  throw new ConfirmationTimeoutError(
    'Confirmation timed out. Check the transaction hash in Stellar Expert.',
  )
}

export class WalletRejectedError extends Error {}
export class ConfirmationTimeoutError extends Error {}

function metadataInputToScVal(input: MetadataActionInput): xdr.ScVal {
  const tags = parseTags(input.tags)
  const note = input.note.trim()

  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: nativeToScVal('favorite', { type: 'symbol' }),
      val: nativeToScVal(input.favorite),
    }),
    new xdr.ScMapEntry({
      key: nativeToScVal('note', { type: 'symbol' }),
      val: note ? nativeToScVal(note, { type: 'string' }) : xdr.ScVal.scvVoid(),
    }),
    new xdr.ScMapEntry({
      key: nativeToScVal('tags', { type: 'symbol' }),
      val: xdr.ScVal.scvVec(
        tags.map((tag) => nativeToScVal(tag, { type: 'string' })),
      ),
    }),
  ])
}

function validateInput(input: MetadataActionInput): void {
  if (!/^[0-9a-fA-F]{64}$/.test(input.transactionHash.trim())) {
    throw new Error('Transaction hash must be exactly 64 hexadecimal characters.')
  }
  if (input.action === 'delete') return

  const note = input.note.trim()
  const tags = parseTags(input.tags)
  if (new TextEncoder().encode(note).length > 512) {
    throw new Error('Note must be 512 bytes or fewer.')
  }
  if (tags.length > 10) throw new Error('Use no more than 10 tags.')
  if (tags.some((tag) => new TextEncoder().encode(tag).length > 32)) {
    throw new Error('Each tag must be 32 bytes or fewer.')
  }
  if (new Set(tags).size !== tags.length) {
    throw new Error('Tags must not contain duplicates.')
  }
  if (!note && !input.favorite && tags.length === 0) {
    throw new Error('Add a note, favorite the transaction, or provide a tag.')
  }
}

function parseTags(value: string): string[] {
  if (!value.trim()) return []
  const tags = value.split(',').map((tag) => tag.trim())
  if (tags.some((tag) => !tag)) throw new Error('Tags cannot be empty.')
  return tags
}

function hexToBytes(value: string): Uint8Array {
  return Uint8Array.from(value.trim().match(/.{2}/g) ?? [], (byte) =>
    Number.parseInt(byte, 16),
  )
}

function friendlySubmissionError(status: rpc.Api.SendTransactionStatus): string {
  if (status === 'TRY_AGAIN_LATER') {
    return 'Stellar RPC is busy. Please wait a moment and try again.'
  }
  return 'Stellar RPC rejected the transaction before submission.'
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}
