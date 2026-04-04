// Lithic API client — virtual card issuing
// Sandbox: one POST creates a card with PAN, CVV, expiry
// Docs: https://docs.lithic.com

const LITHIC_SANDBOX_URL = 'https://sandbox.lithic.com/v1';
const LITHIC_PROD_URL = 'https://api.lithic.com/v1';

export interface VirtualCard {
  token: string;
  pan: string;
  cvv: string;
  expMonth: string;
  expYear: string;
  lastFour: string;
  state: string;
  spendLimit: number;
  created: string;
}

export interface CardResult {
  success: boolean;
  card?: VirtualCard;
  error?: string;
}

const isMockMode = process.env.LITHIC_MOCK === 'true';
const apiKey = process.env.LITHIC_API_KEY || '';
const baseUrl = process.env.LITHIC_ENV === 'production' ? LITHIC_PROD_URL : LITHIC_SANDBOX_URL;

function headers(): Record<string, string> {
  return {
    'Authorization': apiKey,
    'Content-Type': 'application/json',
  };
}

function mockCard(amountCents: number): CardResult {
  const ts = Date.now().toString();
  const mockPan = `4000 0012 ${ts.slice(-4)} ${ts.slice(-8, -4)}`;
  return {
    success: true,
    card: {
      token: `mock-card-${ts}`,
      pan: mockPan.replace(/ /g, ''),
      cvv: '123',
      expMonth: '12',
      expYear: '2030',
      lastFour: ts.slice(-4),
      state: 'OPEN',
      spendLimit: amountCents,
      created: new Date().toISOString(),
    },
  };
}

// Issue a virtual card with a spend limit matching the advance amount
export async function issueVirtualCard(amountCents: number): Promise<CardResult> {
  if (isMockMode) {
    return mockCard(amountCents);
  }

  try {
    const res = await fetch(`${baseUrl}/cards`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        type: 'SINGLE_USE',
        spend_limit: amountCents,
        spend_limit_duration: 'TRANSACTION',
        memo: `Folio advance — $${(amountCents / 100).toFixed(2)}`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Lithic card creation failed: ${res.status} ${JSON.stringify(err)}`);
    }

    const data = await res.json();

    return {
      success: true,
      card: {
        token: data.token,
        pan: data.pan,
        cvv: data.cvv,
        expMonth: data.exp_month,
        expYear: data.exp_year,
        lastFour: data.last_four,
        state: data.state,
        spendLimit: data.spend_limit,
        created: data.created,
      },
    };
  } catch (error) {
    console.error('Lithic card creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Lithic error',
    };
  }
}

// Retrieve card details (PAN, CVV) by token — sandbox only
export async function getCardDetails(cardToken: string): Promise<CardResult> {
  if (isMockMode) {
    return mockCard(0);
  }

  try {
    const res = await fetch(`${baseUrl}/cards/${cardToken}`, {
      headers: headers(),
    });

    if (!res.ok) {
      throw new Error(`Lithic card fetch failed: ${res.status}`);
    }

    const data = await res.json();

    return {
      success: true,
      card: {
        token: data.token,
        pan: data.pan,
        cvv: data.cvv,
        expMonth: data.exp_month,
        expYear: data.exp_year,
        lastFour: data.last_four,
        state: data.state,
        spendLimit: data.spend_limit,
        created: data.created,
      },
    };
  } catch (error) {
    console.error('Lithic card fetch failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Lithic error',
    };
  }
}
