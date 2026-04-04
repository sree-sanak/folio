describe('plaid token store', () => {
  // Fresh import per test to reset module state
  let setAccessToken: (userId: string, token: string) => void;
  let getAccessToken: (userId: string) => string | undefined;
  let hasAccessToken: (userId: string) => boolean;

  beforeEach(() => {
    jest.resetModules();
    // Dynamic import to get fresh store per test
    const plaid = require('../plaid');
    setAccessToken = plaid.setAccessToken;
    getAccessToken = plaid.getAccessToken;
    hasAccessToken = plaid.hasAccessToken;
  });

  it('stores and retrieves access token', () => {
    setAccessToken('user-1', 'token-abc');
    expect(getAccessToken('user-1')).toBe('token-abc');
  });

  it('returns undefined for unknown user', () => {
    expect(getAccessToken('unknown')).toBeUndefined();
  });

  it('hasAccessToken returns true for stored user', () => {
    setAccessToken('user-1', 'token-abc');
    expect(hasAccessToken('user-1')).toBe(true);
  });

  it('hasAccessToken returns false for unknown user', () => {
    expect(hasAccessToken('unknown')).toBe(false);
  });

  it('overwrites existing token', () => {
    setAccessToken('user-1', 'old-token');
    setAccessToken('user-1', 'new-token');
    expect(getAccessToken('user-1')).toBe('new-token');
  });
});

// Mock the plaid npm package to avoid import errors
jest.mock('plaid', () => ({
  Configuration: jest.fn().mockImplementation(() => ({})),
  PlaidApi: jest.fn().mockImplementation(() => ({})),
  PlaidEnvironments: { sandbox: 'https://sandbox.plaid.com' },
}));

describe('isPlaidConfigured', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true when both env vars set', () => {
    process.env = { ...originalEnv, PLAID_CLIENT_ID: 'id', PLAID_SECRET: 'secret' };
    const { isPlaidConfigured } = require('../plaid');
    expect(isPlaidConfigured).toBe(true);
  });

  it('returns false when client ID missing', () => {
    process.env = { ...originalEnv, PLAID_SECRET: 'secret' };
    delete process.env.PLAID_CLIENT_ID;
    const { isPlaidConfigured } = require('../plaid');
    expect(isPlaidConfigured).toBe(false);
  });

  it('returns false when secret missing', () => {
    process.env = { ...originalEnv, PLAID_CLIENT_ID: 'id' };
    delete process.env.PLAID_SECRET;
    const { isPlaidConfigured } = require('../plaid');
    expect(isPlaidConfigured).toBe(false);
  });
});
