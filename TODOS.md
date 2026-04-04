# TODOS

## Stretch: Chainlink CRE Integration (P2, M)
**What:** Add Chainlink CRE as third sponsor integration. CRE workflow pulls price feed, calculates collar parameters, triggers HTS payment on Hedera.
**Why:** Unlocks $4K Chainlink bounty. Raises prize ceiling from $15K to $19K. Decentralized price feed is more credible than Tradier API.
**Risk:** CRE SDK learning curve. May conflict with Hedera "No Solidity" bounty ($3K). Net gain could be only $1K if disqualified.
**When:** Only attempt if core demo is solid by hour 24. Do not sacrifice demo quality for this.
**Effort:** Human ~6 hours / CC ~1 hour
**Depends on:** Core demo complete and stable.

## Post-Hackathon: Persistent Plaid Token Storage (P2, M)
**What:** Replace in-memory Plaid access token store with encrypted database storage (e.g., Supabase, Postgres). Add token rotation and per-user isolation.
**Why:** Current in-memory store loses all Plaid connections on server restart. In production with real users, this means everyone has to re-link their brokerage every deploy. Also, access tokens are bearer credentials to brokerage accounts — they must be encrypted at rest.
**Risk:** Low. Standard database CRUD. Main decision is encryption approach (application-level vs database-level).
**Effort:** Human ~4 hours / CC ~20 min
**Depends on:** Plaid production access approved. Database setup.

## Post-Hackathon: Server-Side Spend Locking (P3, S)
**What:** Add per-user mutex/lock in the spend API route to prevent concurrent spend requests from double-locking the same TSLA shares.
**Why:** Client-side button disabling prevents casual double-clicks but two browser tabs can still race. In production with real money, this is a must.
**Effort:** Human ~2 hours / CC ~10 min
**Depends on:** Core spend flow working.
