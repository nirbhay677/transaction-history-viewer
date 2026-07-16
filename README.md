# Transaction History Viewer

Transaction History Viewer is a Stellar Journey to Mastery Level 3 project. It will provide a clear, reliable interface for exploring transaction history on the Stellar network.

> **Project status:** Initial repository setup. Application features and Soroban smart contracts have not been implemented yet.

## Repository structure

```text
transaction-history-viewer/
|-- .github/
|   `-- workflows/       # Future CI/CD workflows
|-- contracts/           # Future Soroban smart contracts (currently empty)
|-- docs/                # Project documentation
|-- frontend/            # React and TypeScript application powered by Vite
|-- .gitignore
`-- README.md
```

## Technology foundation

- React 19
- TypeScript
- Vite
- Oxlint
- Soroban contracts (planned)

## Prerequisites

Install the following before working with the frontend:

- [Node.js](https://nodejs.org/) (a current LTS release is recommended)
- npm (included with Node.js)
- Git

Confirm that Node.js and npm are available:

```bash
node --version
npm --version
```

## Local setup

From the repository root, install the frontend dependencies:

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Vite will print the local development URL in the terminal.

## Available frontend scripts

Run these commands from the `frontend` directory:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server with hot reload |
| `npm run build` | Type-check and create a production build |
| `npm run lint` | Run Oxlint against the frontend source |
| `npm run preview` | Preview the production build locally |

## Development workflow

1. Create a focused branch for each change.
2. Keep commits small and descriptive.
3. Run linting and a production build before opening a pull request.
4. Document architectural decisions and setup changes in `docs/`.
5. Add CI/CD definitions to `.github/workflows/` when automation is introduced.

## Security

Never commit private keys, seed phrases, API credentials, or populated environment files. Commit an `.env.example` containing placeholder values when environment configuration is introduced.

## Roadmap

- Design and implement the transaction-history frontend.
- Integrate with the Stellar network.
- Add Soroban smart contracts if required by later project stages.
- Add automated tests and CI/CD workflows.

## License

No license has been selected yet.
