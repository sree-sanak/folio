import { NextRequest, NextResponse } from 'next/server';
import { getChainlinkCollars } from '@/lib/chainlink';

export async function GET(req: NextRequest) {
  try {
    const symbolsParam = req.nextUrl.searchParams.get('symbols');
    const symbols = symbolsParam
      ? symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      : ['ETH', 'BTC'];

    const collars = await getChainlinkCollars(symbols);
    return NextResponse.json(collars);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch Chainlink collars' },
      { status: 500 }
    );
  }
}
