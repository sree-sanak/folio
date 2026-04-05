'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';
import { authFetch } from '@/lib/use-auth-fetch';
import type { Holding } from './types';
import { DEMO_HOLDINGS, holdingGradient } from './types';

export type PlaidStatus = 'idle' | 'loading' | 'connected' | 'error';

interface PlaidHookResult {
  status: PlaidStatus;
  holdings: Holding[];
  openLink: () => void;
  isPlaidAvailable: boolean;
  isDemo: boolean;
}

export function usePlaidHoldings(userAccountId?: string): PlaidHookResult {
  const [status, setStatus] = useState<PlaidStatus>('loading');
  const [holdings, setHoldings] = useState<Holding[]>(DEMO_HOLDINGS);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isPlaidAvailable, setIsPlaidAvailable] = useState(false);
  const [isDemo, setIsDemo] = useState(true);

  // Load tokenized holdings from Hedera (user's on-chain balances)
  const fetchHederaHoldings = useCallback(async (): Promise<boolean> => {
    if (!userAccountId) return false;
    try {
      const res = await authFetch(`/api/hedera/holdings?accountId=${encodeURIComponent(userAccountId)}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (data.holdings?.length > 0) {
        setHoldings(data.holdings);
        return true;
      }
    } catch { /* fall through */ }
    return false;
  }, [userAccountId]);

  // Sync holdings to on-chain HTS tokens (fire-and-forget)
  const syncHoldingsToChain = useCallback(async (accountId: string, holdingsToSync: Holding[]) => {
    try {
      await authFetch('/api/holdings/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          holdings: holdingsToSync.map((h) => ({ symbol: h.symbol, shares: h.shares })),
        }),
      });
      // Re-fetch HTS holdings to get updated balances
      await fetchHederaHoldings();
    } catch { /* non-blocking — holdings still show from brokerage/demo */ }
  }, [fetchHederaHoldings]);

  // Initialize: load HTS tokenized equities, then set up Plaid for brokerage linking
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Skip API calls if not authenticated yet (avoids 401 console errors)
      if (!getAuthToken()) {
        setStatus('idle');
        return;
      }

      // Load user's on-chain HTS stock holdings
      const hasHedera = await fetchHederaHoldings();
      if (!hasHedera && !cancelled) {
        setHoldings(DEMO_HOLDINGS);
        // Sync demo holdings to on-chain (fire-and-forget)
        if (userAccountId) {
          syncHoldingsToChain(userAccountId, DEMO_HOLDINGS);
        }
      }

      // Try loading previously-connected brokerage holdings (token persists in DB)
      try {
        const brokerageRes = await authFetch('/api/plaid/holdings');
        if (brokerageRes.ok && !cancelled) {
          const brokerageData = await brokerageRes.json();
          if (brokerageData.holdings?.length > 0) {
            const brokerageHoldings: Holding[] = brokerageData.holdings;
            setHoldings((prev) => {
              const merged = new Map<string, Holding>();
              for (const h of prev) merged.set(h.symbol, { ...h });
              for (const h of brokerageHoldings) {
                const existing = merged.get(h.symbol);
                if (existing) {
                  merged.set(h.symbol, { ...existing, shares: existing.shares + h.shares });
                } else {
                  merged.set(h.symbol, h);
                }
              }
              return Array.from(merged.values());
            });
            setIsDemo(false);
          }
        }
      } catch { /* no previously connected account — that's fine */ }

      // Then check Plaid availability for new connections
      try {
        const res = await authFetch('/api/plaid/create-link-token', {
          method: 'POST',
        });

        if (!res.ok) {
          if (!cancelled) {
            setIsPlaidAvailable(false);
            setStatus('idle');
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setLinkToken(data.link_token);
          setIsPlaidAvailable(true);
          setStatus('idle');
        }
      } catch {
        if (!cancelled) {
          setIsPlaidAvailable(false);
          setStatus('idle');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [fetchHederaHoldings, syncHoldingsToChain, userAccountId]);

  // Fetch brokerage holdings, merge with HTS, and sync to on-chain
  const fetchHoldings = useCallback(async () => {
    try {
      const res = await authFetch('/api/plaid/holdings');
      if (!res.ok) throw new Error('Failed to fetch holdings');
      const data = await res.json();

      const brokerageHoldings: Holding[] = data.holdings.map((h: { symbol: string; name: string; shares: number }) => ({
        symbol: h.symbol,
        name: h.name,
        shares: h.shares,
        icon: h.symbol[0],
        gradient: holdingGradient(h.symbol),
      }));

      if (brokerageHoldings.length > 0) {
        // Merge: start with current HTS holdings, add/combine brokerage holdings
        setHoldings((prev) => {
          const merged = new Map<string, Holding>();
          for (const h of prev) merged.set(h.symbol, { ...h });
          for (const h of brokerageHoldings) {
            const existing = merged.get(h.symbol);
            if (existing) {
              merged.set(h.symbol, { ...existing, shares: existing.shares + h.shares });
            } else {
              merged.set(h.symbol, h);
            }
          }
          const result = Array.from(merged.values());
          // Sync merged totals to on-chain HTS tokens
          if (userAccountId) syncHoldingsToChain(userAccountId, result);
          return result;
        });
        setIsDemo(false);
      }
      setStatus('connected');
    } catch {
      setStatus('error');
    }
  }, [userAccountId, syncHoldingsToChain]);

  // Handle Plaid Link success
  const onSuccess = useCallback(async (publicToken: string) => {
    setStatus('loading');
    try {
      const res = await authFetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken }),
      });

      if (!res.ok) throw new Error('Token exchange failed');

      await fetchHoldings();
    } catch {
      setStatus('error');
      setHoldings(DEMO_HOLDINGS);
    }
  }, [fetchHoldings]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const openLink = useCallback(() => {
    if (ready) open();
  }, [ready, open]);

  return { status, holdings, openLink, isPlaidAvailable, isDemo };
}
