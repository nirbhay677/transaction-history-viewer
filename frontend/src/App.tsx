import { useState } from 'react'
import './App.css'
import {
  MetadataActionForm,
  type MetadataFormDraft,
} from './components/MetadataActionForm'
import { useEventStreamContext } from './context/useEventStreamContext'
import { useContractActions } from './hooks/useContractActions'
import { useFreighterWalletContext } from './wallet/useFreighterWalletContext'

const EMPTY_DRAFT: MetadataFormDraft = {
  key: 0,
  action: 'save',
  transactionHash: '',
  note: '',
  tags: '',
  favorite: false,
}

function App() {
  const wallet = useFreighterWalletContext()
  const stream = useEventStreamContext()
  const actions = useContractActions(
    stream.config,
    wallet.address,
    stream.markTransactionPending,
    stream.clearTransactionPending,
  )
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const records = Array.from(stream.metadata.entries())
  const pendingCount = stream.pendingTransactionHashes.size

  const editRecord = (
    transactionHash: string,
    metadata: (typeof records)[number][1],
  ) => {
    setDraft({
      key: Date.now(),
      action: 'update',
      transactionHash,
      note: metadata.note ?? '',
      tags: metadata.tags.join(', '),
      favorite: metadata.favorite,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteRecord = async (transactionHash: string) => {
    await actions.execute({
      action: 'delete',
      transactionHash,
      note: '',
      tags: '',
      favorite: false,
    })
  }

  return (
    <main className="shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Stellar Journey to Mastery &middot; Level 3</p>
          <h1>Transaction History Viewer</h1>
          <p className="subtitle">Live Soroban metadata with Freighter signing</p>
        </div>
        <div className="wallet-area">
          <button
            type="button"
            className="wallet-button"
            onClick={() => void wallet.connect()}
            disabled={wallet.status === 'connecting'}
          >
            {wallet.address
              ? shorten(wallet.address, 6, 4)
              : wallet.status === 'connecting'
                ? 'Connecting...'
                : 'Connect Freighter'}
          </button>
          {wallet.address && <small>Testnet connected</small>}
        </div>
      </header>

      {wallet.error && (
        <section className="notice error" role="alert">
          <strong>Wallet connection</strong>
          <span>{wallet.error}</span>
        </section>
      )}

      {stream.configurationError && (
        <section className="notice warning" role="alert">
          <strong>Event stream not configured</strong>
          <span>{stream.configurationError}</span>
        </section>
      )}

      <MetadataActionForm
        connected={wallet.status === 'connected'}
        actionState={actions}
        draft={draft}
        onSubmit={actions.execute}
      />

      {pendingCount > 0 && (
        <section className="notice pending" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <strong>
            {pendingCount} transaction{pendingCount === 1 ? '' : 's'} pending
          </strong>
          <span>Waiting for Stellar confirmation...</span>
        </section>
      )}

      <section className="grid" aria-label="Event stream status">
        <article className="card">
          <span className="label">Connection</span>
          <strong className={`status ${stream.connectionState}`}>
            {stream.connectionState}
          </strong>
          {stream.retryDelayMs && (
            <small>Retrying in {Math.ceil(stream.retryDelayMs / 1000)} seconds</small>
          )}
        </article>

        <article className="card">
          <span className="label">Registry status</span>
          <strong>{stream.registry?.status ?? 'Unknown'}</strong>
          <small className="truncate">
            {stream.registry?.defaultContractId ?? 'No default contract loaded'}
          </small>
        </article>

        <article className="card">
          <span className="label">Synchronized records</span>
          <strong>{records.length}</strong>
          <small>
            {wallet.address
              ? `Owner ${shorten(wallet.address, 6, 4)}`
              : 'Connect a wallet to load owner records'}
          </small>
        </article>
      </section>

      {stream.error && (
        <section className="notice error" role="alert">
          <strong>Stream error</strong>
          <span>{stream.error}</span>
        </section>
      )}

      <section className="records">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Owner metadata</p>
            <h2>Live records</h2>
          </div>
          {stream.lastEvent && <span>Ledger {stream.lastEvent.ledger}</span>}
        </div>

        {records.length === 0 ? (
          <p className="empty">
            {wallet.address
              ? 'No metadata events have been processed for this address.'
              : 'Connect Freighter to synchronize owner metadata.'}
          </p>
        ) : (
          <ul>
            {records.map(([transactionHash, metadata]) => (
              <li key={transactionHash}>
                <code>{transactionHash}</code>
                <div className="badges">
                  {metadata.favorite && <span>Favorite</span>}
                  {metadata.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <p>{metadata.note ?? 'No personal note'}</p>
                <div className="record-actions">
                  <button type="button" onClick={() => editRecord(transactionHash, metadata)}>
                    Update
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => void deleteRecord(transactionHash)}
                    disabled={actions.isBusy}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function shorten(value: string, start: number, end: number): string {
  return `${value.slice(0, start)}...${value.slice(-end)}`
}

export default App
