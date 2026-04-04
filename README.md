# Folio — Prime Broker in Your Pocket

> Goldman Sachs for everyone at 0%

![Screenshot placeholder — add demo screenshot here](https://via.placeholder.com/800x450/0f1117/10B981?text=Folio+Demo)

## What it does

- **Spend against your stock portfolio without selling** — tap to pay with your Tesla shares as collateral, keep your position
- **Every purchase is backed by a collar (bounded risk)** — the platform hedges your collateral with a zero-cost options collar, so it can lend at 0% interest with no liquidation risk ever
- **Each spend mints a "Spend Note" NFT** — a micro structured product on Hedera showing your collar band, advance amount, and expiry date
- **No minimums, no margin calls, no liquidation risk** — Goldman Sachs requires $1M+, charges 2–4% interest, and can liquidate you; Folio requires nothing, charges 0%, and liquidation is mathematically impossible

## Architecture

```
User (Dynamic wallet)
      │
      ▼
Next.js Frontend
      │
      ▼
API Routes (/api/spend, /api/price, /api/balance)
      │           │
      ▼           ▼
Hedera HTS    Yahoo Finance
(tokens +     (live stock
 NFT mints)    prices)
      │
      ▼
Pinata IPFS
(Spend Note metadata)
```

## Quick Start

```bash
git clone <repo>
cd folio
cp .env.example .env.local
# Fill in HEDERA_OPERATOR_ID, HEDERA_OPERATOR_KEY, NEXT_PUBLIC_DYNAMIC_ENV_ID, PINATA_API_KEY
npm install
npm run setup     # Creates tokens on Hedera testnet
npm run dev       # http://localhost:3000
```

## Tech Stack

- **Next.js 16** — App Router, TypeScript, Tailwind CSS
- **Hedera HTS** — Fungible tokens (MOCK-TSLA, MOCK-AAPL, USDC-TEST) + NFT Spend Notes
- **Dynamic** — Embedded wallets, email/social login
- **Yahoo Finance** — Real-time stock prices
- **Pinata** — IPFS metadata storage for Spend Note NFTs

## Sponsor Integrations

### Hedera

- Creates and manages mock equity tokens (MOCK-TSLA, MOCK-AAPL) and USDC-TEST via HTS
- Mints Spend Note NFTs with on-chain metadata pointing to IPFS
- No Solidity — pure Hedera SDK (eligible for "No Solidity Allowed" bounty)

### Dynamic

- Embedded wallet creation (email/social login, no MetaMask required)
- Powers the "sign in to spend" auth flow

## How the Collar Works

When you spend $50 against $225 TSLA:

- Platform locks ~0.222 TSLA shares as collateral
- Floor = $213.75 (5% below) — platform's downside protection
- Cap = $258.75 (15% above) — user's upside limit during loan
- Platform advances $50 USDC at 0% interest
- At expiry, user repays $50 and gets their shares back

The put option (bought) protects against downside. The call option (sold) caps upside but pays for the put. Net premium to the user: ~$0. Because the collar bounds the downside, the platform can never lose money on the loan — that's why it's 0%.

## Team

Solo build — ETHGlobal Cannes 2026, 36 hours.

## Built at

ETHGlobal Cannes 2026 — solo build, 36 hours
