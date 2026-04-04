import { NextRequest, NextResponse } from 'next/server';
import { calculateCollar } from '@/lib/collar';
import { getStockPrice } from '@/lib/price';
import { addNote } from '@/lib/store';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY &&
  process.env.MOCK_TSLA_TOKEN_ID
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      amount,
      durationMonths = 1,
      recipientName = 'Someone',
      userAccountId,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const priceData = await getStockPrice('TSLA');
    const collar = calculateCollar(amount, priceData.price, durationMonths);

    let txId = 'demo-tx-' + Date.now();

    if (hederaConfigured) {
      // Real Hedera flow
      const { transferToken, mintSpendNoteWithIpfs, transferNft, getOperatorId } = await import('@/lib/hedera');
      const operatorId = getOperatorId().toString();
      const tslaTokenId = process.env.MOCK_TSLA_TOKEN_ID!;
      const usdcTokenId = process.env.USDC_TEST_TOKEN_ID!;
      const noteTokenId = process.env.SPEND_NOTE_TOKEN_ID!;

      txId = await transferToken(tslaTokenId, userAccountId, operatorId, collar.sharesHts);
      await transferToken(usdcTokenId, operatorId, userAccountId, collar.advanceHts);

      const now = new Date().toISOString();
      const { serial } = await mintSpendNoteWithIpfs({
        name: `Spend Note #${Date.now()}`,
        asset: 'MOCK-TSLA',
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
    }

    const note = addNote({
      serial: hederaConfigured ? 1 : Date.now(),
      recipient: userAccountId || 'demo-user',
      recipientName,
      amount: collar.advance,
      shares: collar.shares,
      sharesHts: collar.sharesHts,
      stockPrice: priceData.price,
      floor: collar.floor,
      cap: collar.cap,
      durationMonths,
      expiryDate: collar.expiryDate.toISOString(),
      status: 'active',
      txId,
      createdAt: new Date().toISOString(),
      userAccountId: userAccountId || 'demo-user',
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
      },
      txId,
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
