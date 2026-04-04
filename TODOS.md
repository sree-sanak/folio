# TODOS

## Stretch: Chainlink CRE Integration (P2, M)
**What:** Add Chainlink CRE as third sponsor integration. CRE workflow pulls price feed, calculates collar parameters, triggers HTS payment on Hedera.
**Why:** Unlocks $4K Chainlink bounty. Raises prize ceiling from $15K to $19K. Decentralized price feed is more credible than Tradier API.
**Risk:** CRE SDK learning curve. May conflict with Hedera "No Solidity" bounty ($3K). Net gain could be only $1K if disqualified.
**When:** Only attempt if core demo is solid by hour 24. Do not sacrifice demo quality for this.
**Effort:** Human ~6 hours / CC ~1 hour
**Depends on:** Core demo complete and stable.

## Post-Hackathon: Encrypt Plaid Tokens at Rest (P2, M)
**What:** Add encryption for Plaid access tokens stored in `plaid_tokens` table. Add token rotation.
**Why:** Access tokens are bearer credentials to brokerage accounts. Currently stored as plaintext in Supabase. Must be encrypted at rest for production.
**Risk:** Low. Main decision is encryption approach (application-level vs database-level).
**Effort:** Human ~2 hours / CC ~10 min
**Depends on:** Plaid production access approved.
**Note:** Persistent storage (Supabase `plaid_tokens` table) and per-user isolation (keyed by auth email) were completed in v0.2.3.0.

## Post-Hackathon: AI Bubble Multiple Advice Types (P3, M)
**What:** Expand the AI bubble component to surface multiple advice types beyond repayment nudges: collar status updates, market move alerts, spending suggestions.
**Why:** The bubble is built as a global container but only surfaces repayment nudges during the hackathon. Multiple advice types make the AI agent feel real and useful.
**Effort:** Human ~4 hours / CC ~30 min
**Depends on:** Repayment bubble shipping first.

## Post-Hackathon: Server-Side Spend Locking (P3, S)
**What:** Add per-user mutex/lock in the spend API route to prevent concurrent spend requests from double-locking the same TSLA shares.
**Why:** Client-side button disabling prevents casual double-clicks but two browser tabs can still race. In production with real money, this is a must.
**Effort:** Human ~2 hours / CC ~10 min
**Depends on:** Core spend flow working.
