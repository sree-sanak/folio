import { NextRequest, NextResponse } from 'next/server';
import { getTokenRegistry } from '@/lib/token-registry';
import { verifyAuth, unauthorized } from '@/lib/auth';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY
);

// POST /api/holdings/sync — reconcile brokerage holdings to on-chain HTS tokens
//
// When a user connects Plaid or has demo holdings, this endpoint ensures their
// Hedera account holds the corresponding HTS stock tokens. Mints any deficit
// from treasury so on-chain balance matches what the user sees.
//
// Testnet only — in production, tokenized securities come from Swarm.

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

  if (!hederaConfigured) {
    return NextResponse.json({ synced: false, reason: 'hedera_not_configured' });
  }

  try {
    const { accountId, holdings } = await req.json() as {
      accountId: string;
      holdings: { symbol: string; shares: number }[];
    };

    if (!accountId || !holdings?.length) {
      return NextResponse.json({ error: 'accountId and holdings required' }, { status: 400 });
    }

    const { getTokenBalances, mintFungibleToken, transferToken, getOperatorId } = await import('@/lib/hedera');
    const operatorId = getOperatorId().toString();
    const userBalances = await getTokenBalances(accountId);
    const registry = getTokenRegistry();
    const HTS_DECIMALS = 6;

    const results: { symbol: string; minted: number; transferred: number }[] = [];

    for (const holding of holdings) {
      const entry = registry.find(
        (t) => t.symbol === holding.symbol && t.type === 'stock'
      );
      if (!entry) continue;

      const tokenId = entry.tokenId;
      const targetAmount = Math.floor(holding.shares * 10 ** HTS_DECIMALS);
      const currentBalance = userBalances.get(tokenId) ?? 0;

      if (currentBalance >= targetAmount) continue; // already has enough

      const deficit = targetAmount - currentBalance;
      try {
        await mintFungibleToken(tokenId, deficit);
        await transferToken(tokenId, operatorId, accountId, deficit);
        results.push({ symbol: holding.symbol, minted: deficit, transferred: deficit });
        console.log(`[sync] Minted ${deficit} ${holding.symbol} (${holding.shares} shares) to ${accountId}`);
      } catch (err) {
        console.error(`[sync] Failed to mint ${holding.symbol}:`, err);
      }
    }

    return NextResponse.json({ synced: true, results });
  } catch (error) {
    console.error('Holdings sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
