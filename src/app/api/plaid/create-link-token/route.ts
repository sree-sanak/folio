import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, isPlaidConfigured } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';

export async function POST(req: NextRequest) {
  if (!isPlaidConfigured) {
    return NextResponse.json(
      { error: 'plaid_not_configured' },
      { status: 501 }
    );
  }

  try {
    const body = await req.json();
    const userId = body.userId || 'demo-user';

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Folio',
      products: [Products.Investments],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Plaid link token error:', error);
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
