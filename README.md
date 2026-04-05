# Folio — 0% Interest Credit Line Backed by Your Stocks

> Robinhood let everyone trade stocks. Folio lets everyone borrow against them — at 0% interest.

https://github.com/user-attachments/assets/636b3a70-c231-438c-a583-81e847c3d33c

## The Problem

Americans have $30 trillion in brokerage accounts they can't spend. If you need cash, you either:

1. **Sell your shares** — lose 20-37% to capital gains taxes, permanently exit your position
2. **Take a margin loan** — pay 7-12% interest, risk margin calls and liquidation, need $500K+ at most brokerages

Both options are terrible for a 28-year-old with $40K in Tesla who needs $500 for a dental bill.

## What Folio Does

**Folio gives you a 0% loan against your stock portfolio so you can spend your investments without selling them.**

- **0% interest, always** — no spread, no hidden fees
- **No minimums** — borrow against $100 or $100,000 in stocks
- **No liquidation risk** — mathematically impossible, your downside is bounded
- **No selling, no taxes** — your shares stay yours

The only trade-off: your upside is temporarily capped while the loan is open (typically ~115% for 30 days). For someone spending $50 on groceries, that's invisible.

## How It Works (for judges)

When you spend $50 against $225 TSLA:

1. Folio locks ~0.222 TSLA shares as collateral
2. A protection range is set: floor at $213.75 (downside protected), ceiling at $258.75 (upside limited)
3. You receive $50 USDC at 0% interest
4. At expiry, repay $50 and get your shares back — or the shares settle the balance automatically

The financial structure that makes 0% possible: a zero-cost options hedge that offsets borrowing cost by temporarily limiting upside. The premium from selling the upside pays for the downside protection. Net cost to the user: $0.

## The Market

Fidelity, Schwab, and Morgan Stanley all offer securities-backed lines of credit (SBLOCs). Every single one requires $500K+ in assets and charges 7-9% interest. Folio does the same thing for anyone, at 0%, from their phone.

## Architecture

```
User (email login via Dynamic)
      |
      v
Next.js Frontend (Tailwind, App Router)
      |
      v
API Routes (/api/spend, /api/price, /api/balance)
      |               |                |
      v               v                v
Hedera HTS      Yahoo Finance    Chainlink Oracle
(tokens +       (live stock      (on-chain price +
 NFT mints)      prices)          volatility data)
      |
      v
Pinata IPFS
(Spend Note metadata)
```

## Tech Stack

- **Next.js 16** — App Router, TypeScript, Tailwind CSS
- **Hedera HTS** — Fungible tokens (MOCK-TSLA, MOCK-AAPL, USDC-TEST) + NFT Spend Notes
- **Chainlink** — Primary price source via CollarOracle on Base Sepolia (direct Price Feeds + CRE Data Streams + DoltHub IV)
- **Dynamic** — Email-only authentication (no wallet UX)
- **Yahoo Finance** — Stock price fallback when Chainlink data is stale or unavailable
- **Pinata** — IPFS metadata storage for Spend Note NFTs
- **Vercel AI SDK** — AI-optimized protection parameters using real market volatility

## Sponsor Integrations

### Hedera

- Creates and manages mock equity tokens (MOCK-TSLA, MOCK-AAPL) and USDC-TEST via HTS
- Mints Spend Note NFTs with on-chain metadata pointing to IPFS
- No Solidity — pure Hedera SDK

### Chainlink

- CollarOracle smart contract on Base Sepolia stores DON-verified price and volatility data
- Direct Price Feed reads via `getLatestPrice` for live pricing independent of the CRE workflow
- CRE workflow reads Chainlink Data Streams (real-time prices) and DoltHub (options implied volatility)
- Folio reads on-chain price + collar parameters (floor/cap/volatility) as its primary data source

### Dynamic

- Email-only authentication (OTP) — no wallets, no MetaMask, no crypto UX
- Powers the "sign in to spend" auth flow

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

## Team

Solo build — ETHGlobal Cannes 2026, 36 hours.
