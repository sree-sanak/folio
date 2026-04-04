import { NextRequest, NextResponse } from 'next/server';
import { getUser, registerUser } from '@/lib/user-registry';
import { getTokenIdForSymbol } from '@/lib/token-registry';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY
);

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await getUser(email);
    if (existing) {
      return NextResponse.json({ user: existing });
    }

    let hederaAccountId = `0.0.${Date.now()}`; // Demo fallback

    if (hederaConfigured) {
      const { createAccount, associateTokens, transferToken } = await import('@/lib/hedera');
      const { accountId, privateKey } = await createAccount();
      hederaAccountId = accountId;

      // Associate all platform tokens with the new account (needs account owner's key)
      const tokenIds = ['TSLA', 'AAPL']
        .map(getTokenIdForSymbol)
        .filter(Boolean) as string[];

      const usdcId = process.env.USDC_TEST_TOKEN_ID;
      const noteId = process.env.SPEND_NOTE_TOKEN_ID;
      if (usdcId) tokenIds.push(usdcId);
      if (noteId) tokenIds.push(noteId);

      if (tokenIds.length > 0) {
        await associateTokens(hederaAccountId, tokenIds, privateKey);
      }

      // Fund new account with USDC from treasury (demo: 500 USDC)
      if (usdcId) {
        const operatorId = process.env.HEDERA_OPERATOR_ID!;
        const fundAmount = 500_000_000; // 500 USDC (6 decimals)
        await transferToken(usdcId, operatorId, hederaAccountId, fundAmount);
      }
    }

    const user = await registerUser(email, name || '', hederaAccountId);

    return NextResponse.json({ user, created: true });
  } catch (error) {
    console.error('User registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
