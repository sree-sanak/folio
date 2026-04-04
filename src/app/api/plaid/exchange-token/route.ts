import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, isPlaidConfigured, setAccessToken } from '@/lib/plaid';

export async function POST(req: NextRequest) {
  if (!isPlaidConfigured) {
    return NextResponse.json(
      { error: 'plaid_not_configured' },
      { status: 501 }
    );
  }

  try {
    const body = await req.json();
    const { public_token, userId = 'demo-user' } = body;

    if (!public_token) {
      return NextResponse.json(
        { error: 'Missing public_token' },
        { status: 400 }
      );
    }

    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    await setAccessToken(userId, response.data.access_token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Plaid token exchange error:', error);
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
