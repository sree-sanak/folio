import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/user-registry';

const hederaConfigured = !!(
  process.env.HEDERA_OPERATOR_ID &&
  process.env.HEDERA_OPERATOR_KEY
);

export async function POST(req: NextRequest) {
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

    const { submitSignedTransaction, transferToken } = await import('@/lib/hedera');

    // Decode base64 → Uint8Array
    const bytes = Uint8Array.from(Buffer.from(signedTxBytes, 'base64'));

    // Submit the client-signed token association (server adds operator co-signature)
    await submitSignedTransaction(bytes);

    // Fund with USDC from treasury (operator-only, no user signature needed)
    const usdcId = process.env.USDC_TEST_TOKEN_ID;
    if (usdcId) {
      const operatorId = process.env.HEDERA_OPERATOR_ID!;
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
