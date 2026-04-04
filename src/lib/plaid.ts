// Plaid client singleton + in-memory token store

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export const isPlaidConfigured = !!(
  process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET
);

// In-memory access token store (hackathon — matches store.ts pattern)
// In production, use encrypted database storage
const accessTokens = new Map<string, string>();

export function setAccessToken(userId: string, token: string): void {
  accessTokens.set(userId, token);
}

export function getAccessToken(userId: string): string | undefined {
  return accessTokens.get(userId);
}

export function hasAccessToken(userId: string): boolean {
  return accessTokens.has(userId);
}
