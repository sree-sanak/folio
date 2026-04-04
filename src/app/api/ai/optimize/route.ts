import { NextRequest, NextResponse } from 'next/server';
import { getStockPrice } from '@/lib/price';
import { optimizeCollar, calculateOptimizedCollar } from '@/lib/ai-collar-optimizer';
import { verifyAuth, unauthorized } from '@/lib/auth';

// AI collar optimization endpoint — returns recommended collar parameters
// without executing the trade. Users can review and approve before spending.
export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

  try {
    const { amount, symbol = 'TSLA', portfolioShares, riskPreference, previousCollars } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const priceData = await getStockPrice(symbol);

    const recommendation = await optimizeCollar({
      symbol,
      stockPrice: priceData.price,
      changePercent: priceData.changePercent,
      spendAmount: amount,
      portfolioShares,
      userRiskPreference: riskPreference,
      previousCollars,
    });

    const collar = calculateOptimizedCollar(amount, priceData.price, recommendation);

    return NextResponse.json({
      recommendation: {
        floorPct: recommendation.floorPct,
        capPct: recommendation.capPct,
        durationMonths: recommendation.durationMonths,
        confidence: recommendation.confidence,
        riskLevel: recommendation.riskLevel,
        reasoning: recommendation.reasoning,
        warnings: recommendation.warnings,
      },
      collar: {
        shares: collar.shares,
        floor: collar.floor,
        cap: collar.cap,
        advance: collar.advance,
        fee: collar.fee,
        expiryDate: collar.expiryDate.toISOString(),
      },
      price: {
        symbol: priceData.symbol,
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
      },
    });
  } catch (error) {
    console.error('AI optimization error:', error);
    return NextResponse.json(
      { error: 'Optimization failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
