'use client';

import { useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { authFetch } from '@/lib/use-auth-fetch';

export interface FolioUser {
  email: string;
  name: string;
  hederaAccountId: string;
}

export function useUserRegistration() {
  const { user } = useDynamicContext();
  const [folioUser, setFolioUser] = useState<FolioUser | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    async function register() {
      setRegistering(true);
      try {
        const res = await authFetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user!.email,
            name: user!.firstName || '',
          }),
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setFolioUser(data.user);
        }
      } catch {
        // Registration failed — user can still use demo mode
      } finally {
        if (!cancelled) setRegistering(false);
      }
    }

    register();
    return () => { cancelled = true; };
  }, [user?.email]);

  return { folioUser, registering };
}
