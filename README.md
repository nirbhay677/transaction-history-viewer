# Transaction History Viewer

A Stellar Journey to Mastery Level 3 project built with Soroban smart contracts and React.

## Features

- Transaction metadata management
- Inter-contract communication
- Real-time event streaming
- Responsive frontend
- Error handling
- Loading states
- GitHub Actions CI/CD
- Smart contract tests

---

## Technology Stack

- React
- TypeScript
- Vite
- Rust
- Soroban SDK
- Stellar RPC

---

## Project Structure

```
contracts/
frontend/
.github/
README.md
```

---

## Smart Contracts

### Metadata Contract
- Save metadata
- Update metadata
- Delete metadata
- Emit events

### Registry Contract
- Register contracts
- Pause/Resume contracts
- Verify active status

---

## Event Streaming

The frontend automatically listens for:

- metadata_saved
- metadata_updated
- metadata_deleted
- contract_registered
- contract_status_changed

and updates the UI in real time.

---

## Running Locally

Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/transaction-history-viewer.git
```

Install frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file:

```env
VITE_STELLAR_RPC_URL=
VITE_STELLAR_NETWORK_PASSPHRASE=
VITE_METADATA_CONTRACT_ID=
VITE_REGISTRY_CONTRACT_ID=
VITE_STELLAR_OWNER_ADDRESS=
```

---

## Smart Contract Tests

```bash
cargo test
```

---

## Frontend Build

```bash
npm run build
```

---

## Live Demo

Vercel:

## Contract Addresses

Metadata Contract

```
CCP6ARFXQ4NLPE5BR6R377W4YOOAO4UOLFSDYEJLQ6GS5R2BG2GYYKPD
```

Registry Contract

```
CAY6YHM74AWVYLOTPHQHQWVLSJXXCFX5QY4G4ZMOCQLHMMTP7LFPITGW
```

---

## Example Transaction Hashes

Save Metadata

```
7fd93c95aead09d4e8926cac36b468ac3b20c01bb278a8710969a5e156e324d1
```

Update Metadata

```
9a5995775037164fc637f8a718fabe6937c6b12103a3f7ec77a396f4fd8e1280
```

Delete Metadata

```
ead5289bcee97eb881e166ac54b75e66db468361bbac617cd7b976d4051f98da
```

Pause Contract

```
b04cc1eba5343450881bf4001b7b68f522c5c89d7d2f6eb132d4526d1b0ec9f7
```

---

## Screenshots

- Desktop UI
- Mobile UI
- GitHub Actions
- Test Results

---

## Demo Video

Add your YouTube video link here.

---

## Author

Navin Kumar

Stellar Journey to Mastery Level 3
