import { useEffect, useState, type FormEvent } from 'react'
import type { ContractActionState } from '../hooks/useContractActions'
import type {
  MetadataAction,
  MetadataActionInput,
} from '../stellar/contractActions'

export interface MetadataFormDraft extends MetadataActionInput {
  key: number
}

interface MetadataActionFormProps {
  connected: boolean
  actionState: ContractActionState
  draft: MetadataFormDraft
  onSubmit(input: MetadataActionInput): Promise<boolean>
}

export function MetadataActionForm({
  connected,
  actionState,
  draft,
  onSubmit,
}: MetadataActionFormProps) {
  const { reset } = actionState
  const [action, setAction] = useState<MetadataAction>('save')
  const [transactionHash, setTransactionHash] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    setAction(draft.action)
    setTransactionHash(draft.transactionHash)
    setNote(draft.note)
    setTags(draft.tags)
    setFavorite(draft.favorite)
    reset()
  }, [draft, reset])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const succeeded = await onSubmit({
      action,
      transactionHash: transactionHash.trim(),
      note,
      tags,
      favorite,
    })

    if (succeeded && action === 'save') {
      setTransactionHash('')
      setNote('')
      setTags('')
      setFavorite(false)
    }
  }

  return (
    <section className="action-panel" aria-labelledby="metadata-action-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Freighter contract action</p>
          <h2 id="metadata-action-heading">Manage transaction metadata</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <label>
          Action
          <select
            value={action}
            onChange={(event) => setAction(event.target.value as MetadataAction)}
            disabled={actionState.isBusy}
          >
            <option value="save">Save metadata</option>
            <option value="update">Update metadata</option>
            <option value="delete">Delete metadata</option>
          </select>
        </label>

        <label className="form-wide">
          64-character transaction hash
          <input
            value={transactionHash}
            onChange={(event) => setTransactionHash(event.target.value)}
            placeholder="64 hexadecimal characters"
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            disabled={actionState.isBusy}
          />
        </label>

        <label className="form-wide">
          Optional note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="A personal note stored publicly on Stellar"
            rows={3}
            disabled={action === 'delete' || actionState.isBusy}
          />
        </label>

        <label>
          Comma-separated tags
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="tax, personal"
            disabled={action === 'delete' || actionState.isBusy}
          />
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(event) => setFavorite(event.target.checked)}
            disabled={action === 'delete' || actionState.isBusy}
          />
          Favorite
        </label>

        <div className="form-actions form-wide">
          <button
            type="submit"
            className="primary-button"
            disabled={!connected || actionState.isBusy}
          >
            {actionState.isBusy ? 'Processing...' : `${capitalize(action)} metadata`}
          </button>
          {!connected && <small>Connect Freighter on Testnet to continue.</small>}
        </div>
      </form>

      {actionState.message && (
        <div
          className={`action-message ${actionState.phase}`}
          role={actionState.phase === 'failure' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <strong>{phaseTitle(actionState.phase)}</strong>
          <span>{actionState.message}</span>
          {actionState.transactionHash && (
            <code>{shorten(actionState.transactionHash, 10, 8)}</code>
          )}
        </div>
      )}
    </section>
  )
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function phaseTitle(phase: ContractActionState['phase']): string {
  const titles: Record<ContractActionState['phase'], string> = {
    idle: 'Ready',
    preparing: 'Preparing',
    signing: 'Signature required',
    submitting: 'Submitting',
    pending: 'Pending',
    success: 'Success',
    rejected: 'Request rejected',
    failure: 'Transaction failed',
    timeout: 'Confirmation timeout',
  }
  return titles[phase]
}

function shorten(value: string, start: number, end: number): string {
  return `${value.slice(0, start)}...${value.slice(-end)}`
}
