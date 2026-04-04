import { NextRequest, NextResponse } from 'next/server';
import { getStockPrice } from '@/lib/price';
import { optimizeCollar, calculateOptimizedCollar } from '@/lib/ai-collar-optimizer';
import { verifyAuth, unauthorized } from '@/lib/auth';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY
);

// AI collar optimization endpoint — uses Hedera Agent Kit for agentic balance
// verification, then returns recommended collar parameters for user approval.
export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

  try {
    const { amount, symbol = 'TSLA', portfolioShares, riskPreference, previousCollars } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const priceData = await getStockPrice(symbol);

    // Agentic pre-flight: use Hedera Agent Kit to verify treasury can fund this
    let agentInsight: { feasible: boolean; treasuryBalance?: string; agentResponse?: string } = { feasible: true };
    if (hederaConfigured && process.env.MINIMAX_API_KEY) {
      try {
        const { runAgent } = await import('@/lib/hedera-agent');
        const usdcId = process.env.USDC_TEST_TOKEN_ID;
        const operatorId = process.env.HEDERA_OPERATOR_ID;
        const advanceHts = Math.floor(amount * 1e6);

        const result = await runAgent(
          `Check the token balances for treasury account ${operatorId}. ` +
          `I need to verify it has at least ${advanceHts} units (${amount} USDC with 6 decimals) ` +
          `of token ${usdcId} to fund a $${amount} advance against ${symbol} shares. ` +
          `Reply with whether the treasury can fund this, and the current USDC balance.`
        );
        agentInsight = {
          feasible: !result.text.toLowerCase().includes('insufficient'),
          agentResponse: result.text,
        };
      } catch (agentErr) {
        // Agent check is non-blocking �� log and continue with regular flow
        console.warn('[ai-agent] Agentic pre-flight failed, continuing:', agentErr instanceof Error ? agentErr.message : agentErr);
      }
    }

    const recommendation = await optimizeCollar({
      symbol,
      stockPrice: priceData.price,
      changePercent: priceData.changePercent,
      spendAmount: amount,
      portfolioShares,
      userRiskPreference: riskPreference,
      previousCollars,
    });

    // Add agent warning if treasury might not cover the advance
    if (!agentInsight.feasible) {
      recommendation.warnings = [
        ...(recommendation.warnings || []),
        'AI agent detected treasury may have insufficient USDC for this advance',
      ];
    }

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
      agent: agentInsight.agentResponse ? {
        response: agentInsight.agentResponse,
        feasible: agentInsight.feasible,
      } : undefined,
    });
  } catch (error) {
    console.error('AI optimization error:', error);
    return NextResponse.json(
      { error: 'Optimization failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
