import { NextRequest, NextResponse } from 'next/server';
import { calculateCollar } from '@/lib/collar';
import { getStockPrice } from '@/lib/price';
import { getTokenIdForSymbol } from '@/lib/token-registry';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY
);

export async function POST(req: NextRequest) {
  try {
    const {
      amount,
      symbol = 'TSLA',
      durationMonths = 1,
      userAccountId,
    } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!userAccountId) {
      return NextResponse.json({ error: 'userAccountId required' }, { status: 400 });
    }

    const priceData = await getStockPrice(symbol);
    const collar = calculateCollar(amount, priceData.price, durationMonths);

    let collateralLockTxBytes: string | undefined;

    const stockTokenId = getTokenIdForSymbol(symbol);
    if (hederaConfigured && stockTokenId) {
      const { prepareCollateralLock } = await import('@/lib/hedera');
      const txBytes = await prepareCollateralLock(
        stockTokenId,
        userAccountId,
        collar.sharesHts
      );
      collateralLockTxBytes = Buffer.from(txBytes).toString('base64');
    }

    return NextResponse.json({
      collar: {
        shares: collar.shares,
        sharesHts: collar.sharesHts,
        floor: collar.floor,
        cap: collar.cap,
        advance: collar.advance,
        advanceHts: collar.advanceHts,
        fee: collar.fee,
        expiryDate: collar.expiryDate.toISOString(),
      },
      collateralLockTxBytes,
      needsSignature: !!collateralLockTxBytes,
    });
  } catch (error) {
    console.error('Spend prepare error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare spend', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
