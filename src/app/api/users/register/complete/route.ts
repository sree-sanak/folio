import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/user-registry';
import { getTokenIdForSymbol } from '@/lib/token-registry';
import { DEMO_HOLDINGS } from '@/lib/types';
import { verifyAuth, unauthorized } from '@/lib/auth';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY
);

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

  try {
    const { email, signedTxBytes } = await req.json();

    if (!email || !signedTxBytes) {
      return NextResponse.json(
        { error: 'email and signedTxBytes required' },
        { status: 400 }
      );
    }

    const user = await getUser(email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!hederaConfigured) {
      return NextResponse.json({ success: true, user });
    }

    const { submitSignedTransaction, transferToken, mintFungibleToken, grantKyc, unfreezeAccount, getOperatorId } = await import('@/lib/hedera');

    // Decode base64 → Uint8Array
    const bytes = Uint8Array.from(Buffer.from(signedTxBytes, 'base64'));

    // Submit the client-signed token association (server adds operator co-signature)
    await submitSignedTransaction(bytes);

    // Grant KYC and unfreeze for stock tokens (they have freezeDefault=true + KYC key)
    const stockSymbols = ['TSLA', 'AAPL'];
    for (const symbol of stockSymbols) {
      const tokenId = getTokenIdForSymbol(symbol);
      if (tokenId) {
        await grantKyc(tokenId, user.hederaAccountId);
        await unfreezeAccount(tokenId, user.hederaAccountId);
      }
    }

    // Mint demo stock tokens to the user's account so on-chain balance matches UI
    // In production, this step is replaced by Swarm's regulated tokenization
    const operatorId = getOperatorId().toString();
    const HTS_DECIMALS = 6;
    for (const holding of DEMO_HOLDINGS) {
      const tokenId = getTokenIdForSymbol(holding.symbol);
      if (tokenId) {
        const amount = Math.floor(holding.shares * 10 ** HTS_DECIMALS);
        try {
          await mintFungibleToken(tokenId, amount);
          await transferToken(tokenId, operatorId, user.hederaAccountId, amount);
          console.log(`[register] Minted ${holding.shares} ${holding.symbol} to ${user.hederaAccountId}`);
        } catch (err) {
          console.error(`[register] Failed to mint ${holding.symbol}:`, err);
        }
      }
    }

    // Fund with USDC from treasury (operator-only, no user signature needed)
    const usdcId = process.env.USDC_TEST_TOKEN_ID;
    if (usdcId) {
      const fundAmount = 500_000_000; // 500 USDC (6 decimals)
      await transferToken(usdcId, operatorId, user.hederaAccountId, fundAmount);
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Registration complete error:', error);
    return NextResponse.json(
      { error: 'Token association failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
