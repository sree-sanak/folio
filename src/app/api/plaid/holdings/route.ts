import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, isPlaidConfigured, getAccessToken } from '@/lib/plaid';
import { holdingGradient } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!isPlaidConfigured) {
    return NextResponse.json(
      { error: 'plaid_not_configured' },
      { status: 501 }
    );
  }

  const userId = req.nextUrl.searchParams.get('userId') || 'demo-user';
  const accessToken = getAccessToken(userId);

  if (!accessToken) {
    return NextResponse.json(
      { error: 'not_connected' },
      { status: 401 }
    );
  }

  try {
    const response = await plaidClient.investmentsHoldingsGet({
      access_token: accessToken,
    });

    const { holdings, securities } = response.data;

    // Build security lookup by security_id
    const securityMap = new Map(
      securities.map((s) => [s.security_id, s])
    );

    // Map to our Holding shape, filtering to equities with ticker symbols
    const mapped = holdings
      .map((h) => {
        const security = securityMap.get(h.security_id);
        if (!security?.ticker_symbol) return null;
        return {
          symbol: security.ticker_symbol,
          name: security.name || security.ticker_symbol,
          shares: h.quantity,
          icon: security.ticker_symbol[0],
          gradient: holdingGradient(security.ticker_symbol),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ holdings: mapped });
  } catch (error) {
    console.error('Plaid holdings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}
