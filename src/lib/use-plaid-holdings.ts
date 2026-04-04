'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import type { Holding } from './types';
import { DEMO_HOLDINGS, holdingGradient } from './types';

export type PlaidStatus = 'idle' | 'loading' | 'connected' | 'error';

interface PlaidHookResult {
  status: PlaidStatus;
  holdings: Holding[];
  openLink: () => void;
  isPlaidAvailable: boolean;
}

export function usePlaidHoldings(): PlaidHookResult {
  const [status, setStatus] = useState<PlaidStatus>('loading');
  const [holdings, setHoldings] = useState<Holding[]>(DEMO_HOLDINGS);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isPlaidAvailable, setIsPlaidAvailable] = useState(false);

  // Fetch link token on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'demo-user' }),
        });

        if (!res.ok) {
          const data = await res.json();
          if (data.error === 'plaid_not_configured') {
            if (!cancelled) {
              setIsPlaidAvailable(false);
              setHoldings(DEMO_HOLDINGS);
              setStatus('idle');
            }
            return;
          }
          throw new Error(data.error);
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
          setHoldings(DEMO_HOLDINGS);
          setStatus('idle');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // Fetch holdings after connection
  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch('/api/plaid/holdings?userId=demo-user');
      if (!res.ok) throw new Error('Failed to fetch holdings');
      const data = await res.json();

      const mapped: Holding[] = data.holdings.map((h: { symbol: string; name: string; shares: number }) => ({
        symbol: h.symbol,
        name: h.name,
        shares: h.shares,
        icon: h.symbol[0],
        gradient: holdingGradient(h.symbol),
      }));

      setHoldings(mapped.length > 0 ? mapped : DEMO_HOLDINGS);
      setStatus('connected');
    } catch {
      setStatus('error');
    }
  }, []);

  // Handle Plaid Link success
  const onSuccess = useCallback(async (publicToken: string) => {
    setStatus('loading');
    try {
      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken, userId: 'demo-user' }),
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

  return { status, holdings, openLink, isPlaidAvailable };
}
