import { NextRequest, NextResponse } from 'next/server';
import { getUser, registerUser } from '@/lib/user-registry';
import { getTokenIdForSymbol } from '@/lib/token-registry';
import { verifyAuth, unauthorized } from '@/lib/auth';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY
);

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

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

      // Token association and funding are best-effort — don't block registration
      try {
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
      } catch (tokenError) {
        console.error('Token setup failed (account still created):', tokenError);
      }
    }

    // Always persist the user row — even if token setup failed above
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
