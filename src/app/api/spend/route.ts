import { NextRequest, NextResponse } from 'next/server';
import { getStockPrice } from '@/lib/price';
import { addNote } from '@/lib/store';
import { issueVirtualCard } from '@/lib/lithic';
import { getTokenIdForSymbol } from '@/lib/token-registry';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { optimizeCollar, calculateOptimizedCollar } from '@/lib/ai-collar-optimizer';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY
);

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

  try {
    const body = await req.json();
    const {
      amount,
      symbol = 'TSLA',
      durationMonths,  // optional — AI will recommend if not provided
      issueCard = false,
      recipientAccountId,
      userAccountId,
      portfolioShares,
      riskPreference,
      previousCollars,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!userAccountId) {
      return NextResponse.json({ error: 'userAccountId required' }, { status: 400 });
    }

    // Fetch stock price
    const priceData = await getStockPrice(symbol);

    // AI-optimized collar parameters
    const recommendation = await optimizeCollar({
      symbol,
      stockPrice: priceData.price,
      changePercent: priceData.changePercent,
      spendAmount: amount,
      portfolioShares,
      userRiskPreference: riskPreference,
      previousCollars,
    });

    // If user explicitly set duration, override AI recommendation
    if (durationMonths) {
      recommendation.durationMonths = durationMonths;
    }

    const collar = calculateOptimizedCollar(amount, priceData.price, recommendation);

    let txId = 'demo-tx-' + Date.now();

    const stockTokenId = getTokenIdForSymbol(symbol);
    if (hederaConfigured && stockTokenId) {
      const { transferToken, mintSpendNoteWithIpfs, transferNft, getOperatorId, submitAuditMessage } = await import('@/lib/hedera');
      const operatorId = getOperatorId().toString();
      const usdcTokenId = process.env.USDC_TEST_TOKEN_ID!;
      const noteTokenId = process.env.SPEND_NOTE_TOKEN_ID!;

      // Lock sender's collateral: sender → operator
      txId = await transferToken(stockTokenId, userAccountId, operatorId, collar.sharesHts);
      // Transfer USDC advance to recipient (P2P) or back to sender (card)
      const advanceTarget = recipientAccountId || userAccountId;
      await transferToken(usdcTokenId, operatorId, advanceTarget, collar.advanceHts);

      const now = new Date().toISOString();
      const { serial } = await mintSpendNoteWithIpfs({
        name: `Spend Note #${Date.now()}`,
        asset: `MOCK-${symbol}`,
        shares_collared: collar.sharesHts,
        stock_price_at_spend: Math.floor(priceData.price * 1e6),
        collar_floor: Math.floor(collar.floor * 1e6),
        collar_cap: Math.floor(collar.cap * 1e6),
        advance_usdc: collar.advanceHts,
        platform_spread: 0,
        created_at: now,
        expires_at: collar.expiryDate.toISOString(),
        status: 'active',
      });
      await transferNft(noteTokenId, serial, operatorId, userAccountId);

      // Log to HCS audit trail (non-blocking)
      const auditTopicId = process.env.AUDIT_TOPIC_ID;
      if (auditTopicId) {
        submitAuditMessage(auditTopicId, {
          type: 'SPEND_NOTE_CREATED',
          serial,
          txId,
          symbol,
          amount,
          collar: {
            floorPct: collar.floorPct,
            capPct: collar.capPct,
            floor: collar.floor,
            cap: collar.cap,
            durationMonths: collar.durationMonths,
          },
          ai: {
            confidence: recommendation.confidence,
            riskLevel: recommendation.riskLevel,
            reasoning: recommendation.reasoning,
          },
          userAccountId,
          recipientAccountId: advanceTarget,
          timestamp: now,
        }).catch((e: unknown) => console.error('HCS audit log failed:', e));
      }
    }

    // Issue virtual card via Lithic
    let cardPan: string | undefined;
    let cardCvv: string | undefined;
    let cardExpMonth: string | undefined;
    let cardExpYear: string | undefined;
    let cardToken: string | undefined;
    let cardLastFour: string | undefined;

    if (issueCard) {
      const amountCents = Math.round(amount * 100);
      const result = await issueVirtualCard(amountCents);
      if (result.success && result.card) {
        cardPan = result.card.pan;
        cardCvv = result.card.cvv;
        cardExpMonth = result.card.expMonth;
        cardExpYear = result.card.expYear;
        cardToken = result.card.token;
        cardLastFour = result.card.lastFour;
      } else {
        console.error('Lithic card issuance failed after collar:', result.error);
      }
    }

    const note = addNote({
      symbol,
      serial: hederaConfigured ? 1 : Date.now(),
      recipient: recipientAccountId || userAccountId || 'demo-user',
      recipientName: recipientAccountId || 'Virtual Card',
      amount: collar.advance,
      shares: collar.shares,
      sharesHts: collar.sharesHts,
      stockPrice: priceData.price,
      floor: collar.floor,
      cap: collar.cap,
      durationMonths: collar.durationMonths,
      expiryDate: collar.expiryDate.toISOString(),
      status: 'active',
      txId,
      createdAt: new Date().toISOString(),
      userAccountId: userAccountId || 'demo-user',
      recipientAccountId: recipientAccountId || undefined,
      cardToken,
      cardLastFour,
    });

    return NextResponse.json({
      success: true,
      note,
      collar: {
        shares: collar.shares,
        floor: collar.floor,
        cap: collar.cap,
        advance: collar.advance,
        fee: collar.fee,
        expiryDate: collar.expiryDate.toISOString(),
        floorPct: collar.floorPct,
        capPct: collar.capPct,
      },
      ai: {
        confidence: recommendation.confidence,
        riskLevel: recommendation.riskLevel,
        reasoning: recommendation.reasoning,
        warnings: recommendation.warnings,
      },
      txId,
      card: cardPan ? {
        pan: cardPan,
        cvv: cardCvv,
        expMonth: cardExpMonth,
        expYear: cardExpYear,
        lastFour: cardLastFour,
        token: cardToken,
      } : undefined,
    });
  } catch (error) {
    console.error('Spend error:', error);
    return NextResponse.json(
      {
        error: 'Spend transaction failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
