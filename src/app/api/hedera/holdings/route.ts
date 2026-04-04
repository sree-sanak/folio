import { NextResponse } from 'next/server';
import { holdingGradient } from '@/lib/types';
import { getTokenRegistry } from '@/lib/token-registry';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY
);

export async function GET() {
  if (!hederaConfigured) {
    return NextResponse.json({ holdings: [], source: 'not_configured' });
  }

  try {
    const { getTokenBalances, getOperatorId } = await import('@/lib/hedera');
    const operatorId = getOperatorId().toString();
    const balances = await getTokenBalances(operatorId);
    const registry = getTokenRegistry();

    // Build lookup: tokenId -> registry entry
    const tokenMap = new Map(registry.map((t) => [t.tokenId, t]));

    const holdings = Array.from(balances.entries())
      .filter(([tokenId]) => {
        const entry = tokenMap.get(tokenId);
        return entry && entry.type !== 'crypto'; // Crypto shown separately from user's own account
      })
      .map(([tokenId, rawBalance]) => {
        const entry = tokenMap.get(tokenId)!;
        const shares = Math.floor(rawBalance / 10 ** entry.decimals);
        return {
          symbol: entry.symbol,
          name: entry.name,
          shares,
          icon: entry.symbol[0],
          gradient: holdingGradient(entry.symbol),
          provider: entry.provider,
        };
      })
      .filter((h) => h.shares > 0);

    return NextResponse.json({ holdings, source: 'hedera' });
  } catch (error) {
    console.error('Hedera holdings error:', error);
    return NextResponse.json({ holdings: [], source: 'error' });
  }
}
