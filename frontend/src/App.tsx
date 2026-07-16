import './App.css'
import { useEventStreamContext } from './context/useEventStreamContext'

function App() {
  const stream = useEventStreamContext()
  const records = Array.from(stream.metadata.entries())
  const pendingCount = stream.pendingTransactionHashes.size

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">Stellar Journey to Mastery · Level 3</p>
        <h1>Transaction History Viewer</h1>
        <p className="subtitle">Live Soroban metadata events via Stellar RPC polling</p>
      </header>

      {stream.configurationError && (
        <section className="notice warning" role="alert">
          <strong>Event stream not configured</strong>
          <span>{stream.configurationError}</span>
        </section>
      )}

      {pendingCount > 0 && (
        <section className="notice pending" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <strong>
            {pendingCount} transaction{pendingCount === 1 ? '' : 's'} pending
          </strong>
          <span>Waiting for confirmation events…</span>
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
          <small>Refreshed from authoritative contract reads</small>
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
          <p className="empty">No metadata events have been processed in this session.</p>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
