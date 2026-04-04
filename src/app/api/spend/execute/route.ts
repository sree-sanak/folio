import { NextRequest, NextResponse } from 'next/server';
import { getStockPrice } from '@/lib/price';
import { addNote } from '@/lib/spend-notes';
import { issueVirtualCard } from '@/lib/lithic';
import { getTokenIdForSymbol } from '@/lib/token-registry';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { optimizeCollar, calculateOptimizedCollar } from '@/lib/ai-collar-optimizer';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY
);

const dynamicServerConfigured = !!(
  process.env.DYNAMIC_ENVIRONMENT_ID &&
  process.env.DYNAMIC_API_TOKEN &&
  process.env.DYNAMIC_SERVER_WALLET_ID
);

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

  try {
    const {
      signedCollateralTxBytes,
      amount,
      symbol = 'TSLA',
      durationMonths,  // optional — AI will recommend if not provided
      issueCard = false,
      recipientAccountId,
      userAccountId,
      portfolioShares,
      riskPreference,
      previousCollars,
    } = await req.json();

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
      const { submitSignedTransaction, transferToken, mintSpendNoteWithIpfs, transferNft, getOperatorId, submitAuditMessage, getTokenBalances } = await import('@/lib/hedera');
      const operatorId = getOperatorId().toString();
      const usdcTokenId = process.env.USDC_TEST_TOKEN_ID!;
      const noteTokenId = process.env.SPEND_NOTE_TOKEN_ID!;

      // Pre-flight: verify treasury has enough USDC before proceeding
      const treasuryBalances = await getTokenBalances(operatorId);
      const treasuryUsdc = treasuryBalances.get(usdcTokenId) ?? 0;
      if (treasuryUsdc < collar.advanceHts) {
        return NextResponse.json(
          { error: 'Treasury has insufficient USDC balance. Please try a smaller amount or try again later.' },
          { status: 503 }
        );
      }

      // Submit client-signed collateral lock (server adds operator co-signature)
      if (signedCollateralTxBytes) {
        const bytes = Uint8Array.from(Buffer.from(signedCollateralTxBytes, 'base64'));
        txId = await submitSignedTransaction(bytes);
      }

      // Transfer USDC advance (operator-only, no user signature needed)
      const advanceTarget = recipientAccountId || userAccountId;
      await transferToken(usdcTokenId, operatorId, advanceTarget, collar.advanceHts);

      // Mint spend note NFT and transfer to user (operator-only)
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

    // EVM settlement via Dynamic server wallet (cross-chain USDC disbursement)
    let evmTxHash: string | undefined;
    let evmWalletAddress: string | undefined;

    if (dynamicServerConfigured) {
      try {
        const { getUser } = await import('@/lib/user-registry');
        const userRecord = await getUser(auth.email);
        if (userRecord?.evmWalletAddress) {
          evmWalletAddress = userRecord.evmWalletAddress;
          const { serverWalletSignTransaction } = await import('@/lib/dynamic-server');
          // Sign EVM USDC transfer from platform treasury to user's embedded wallet
          evmTxHash = await serverWalletSignTransaction(
            process.env.DYNAMIC_SERVER_WALLET_ID!,
            {
              to: userRecord.evmWalletAddress,
              value: '0',
              data: '0x', // In production: encode ERC-20 transfer call
              chainId: 84532, // Base Sepolia
            }
          );
        }
      } catch (evmErr) {
        // EVM settlement is non-blocking — Hedera collateral is the primary flow
        console.error('EVM settlement failed (non-blocking):', evmErr);
      }
    }

    // Issue virtual card via Lithic
    let cardPan: string | undefined;
    let cardCvv: string | undefined;
    let cardExpMonth: string | undefined;
    let cardExpYear: string | undefined;
    let cardToken: string | undefined;
    let cardLastFour: string | undefined;

    let cardState: string | undefined;
    let cardSpendLimit: number | undefined;

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
        cardState = result.card.state;
        cardSpendLimit = result.card.spendLimit;
      }
    }

    const note = await addNote({
      symbol,
      serial: hederaConfigured ? 1 : Date.now(),
      recipient: recipientAccountId || userAccountId || 'unknown',
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
      userAccountId: userAccountId || '',
      recipientAccountId: recipientAccountId || undefined,
      cardToken,
      cardLastFour,
      cardState: (cardState as 'OPEN' | 'PAUSED' | 'CLOSED') || undefined,
      cardSpendLimit,
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
      evm: evmTxHash ? {
        txHash: evmTxHash,
        walletAddress: evmWalletAddress,
        chain: 'Base Sepolia',
        chainId: 84532,
      } : undefined,
    });
  } catch (error) {
    console.error('Spend execute error:', error);
    return NextResponse.json(
      { error: 'Spend transaction failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
