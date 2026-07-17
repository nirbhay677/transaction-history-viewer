# Transaction History Viewer

A Stellar Journey to Mastery Level 3 project built with Soroban smart contracts and React.

## Features

- Transaction metadata management
- Inter-contract communication
- Real-time event streaming
- Freighter wallet authorization and transaction signing
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
- Freighter API

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

Install the [Freighter browser extension](https://www.freighter.app/), create or
import an account, and switch its network to **Testnet**. Fund that Testnet
account with test XLM through [Stellar Laboratory](https://lab.stellar.org/account/create)
so it can pay transaction fees. Test XLM has no monetary value.

Install frontend dependencies and start Vite:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite and select **Connect Freighter**. Approve the
site access request. The connected Testnet address becomes the `owner` for
`save_metadata`, `update_metadata`, and `delete_metadata`; Freighter requests a
signature for every write.

---

## Environment Variables

Create a `.env` file:

```env
VITE_STELLAR_RPC_URL=
VITE_STELLAR_NETWORK_PASSPHRASE=
VITE_METADATA_CONTRACT_ID=
VITE_REGISTRY_CONTRACT_ID=
```

Use these deployed Testnet values:

```env
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_METADATA_CONTRACT_ID=CCP6ARFXQ4NLPE5BR6R377W4YOOAO4UOLFSDYEJLQ6GS5R2BG2GYYKPD
VITE_REGISTRY_CONTRACT_ID=CAY6YHM74AWVYLOTPHQHQWVLSJXXCFX5QY4G4ZMOCQLHMMTP7LFPITGW
```

Do not put private keys or seed phrases in `.env`. Freighter keeps signing
credentials in the extension and returns only signed transaction envelopes.

If the app reports the wrong network, select Testnet in Freighter and reconnect.
If it reports that the account was not found, fund the account with test XLM
before retrying.

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

Vercel:https://transaction-history-viewer.vercel.app/

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
## Latest Freighter Wallet Transaction

Action: Save Metadata

Transaction Hash:

```text
c93f5e5e4fbb7db9e3c37d4ec2a3515cbd3c43d1833de4f5bc8c70157c44f65a
```

## Screenshots

### Desktop UI-
<img width="741" height="833" alt="Screenshot 2026-07-18 003349" src="https://github.com/user-attachments/assets/5c57ae18-0350-4ea6-95cf-b4a68cbaaac6" />

## Mobile UI-
<img width="1170" height="4938" alt="transaction-history-viewer vercel app_(iPhone 12 Pro)" src="https://github.com/user-attachments/assets/2831acbd-f18b-40d6-8d86-3b5f65eb89c6" />

- GitHub Actions
- Test Results-<img width="1072" height="243" alt="Screenshot 2026-07-17 024300" src="https://github.com/user-attachments/assets/f7f222ac-6bfd-42fc-a961-43eba83f8f11" />


---

## Demo Video

Add your YouTube video link here.


Freighter wallet integration enabled.
