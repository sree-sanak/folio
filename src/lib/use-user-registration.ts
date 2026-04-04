'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDynamicContext, useUserWallets } from '@dynamic-labs/sdk-react-core';
import { authFetch } from '@/lib/use-auth-fetch';
import { useHederaKey } from './use-hedera-key';

export interface FolioUser {
  email: string;
  name: string;
  hederaAccountId: string;
  publicKey?: string;
}

type RegistrationStatus =
  | 'idle'
  | 'generating-key'
  | 'needs-passphrase'
  | 'creating-account'
  | 'signing-association'
  | 'completing'
  | 'encrypting-key'
  | 'recovering-key'
  | 'done'
  | 'error';

export function useUserRegistration() {
  const { user } = useDynamicContext();
  const userWallets = useUserWallets();
  const { hasKey, publicKeyDer, generateKey, signTransaction, encryptAndStore, recoverKey } = useHederaKey();
  const [folioUser, setFolioUser] = useState<FolioUser | null>(null);
  const [status, setStatus] = useState<RegistrationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Called by UI when user submits passphrase for new registration
  const submitPassphrase = useCallback(async (passphrase: string) => {
    if (!user?.email) return;
    setNeedsPassphrase(false);

    try {
      // Generate keypair
      setStatus('generating-key');
      const pubKey = await generateKey();

      // Register with server
      setStatus('creating-account');
      const res = await authFetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.firstName || '',
          publicKey: pubKey,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.details || err.error || 'Registration failed');
      }

      const data = await res.json();

      // Sign token association if needed
      if (data.needsTokenAssociation) {
        setStatus('signing-association');
        const signedTxBytes = await signTransaction(data.tokenAssocTxBytes);

        setStatus('completing');
        const completeRes = await authFetch('/api/users/register/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, signedTxBytes }),
        });

        if (!completeRes.ok) {
          const err = await completeRes.json().catch(() => ({}));
          throw new Error(err.details || err.error || 'Token association failed');
        }
      }

      // Encrypt key and store in Supabase
      setStatus('encrypting-key');
      await encryptAndStore(user.email, passphrase);

      setFolioUser(data.user);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setStatus('error');
    }
  }, [user, generateKey, signTransaction, encryptAndStore]);

  // Called by UI when user submits passphrase for key recovery
  const submitRecoveryPassphrase = useCallback(async (passphrase: string) => {
    if (!user?.email) return;
    setNeedsRecovery(false);

    try {
      setStatus('recovering-key');
      await recoverKey(user.email, passphrase);
      setStatus('idle');
    } catch {
      setError('Wrong passphrase. Please try again.');
      setNeedsRecovery(true);
      setStatus('error');
    }
  }, [user, recoverKey]);

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    async function register() {
      try {
        // If we already have a key locally, try normal registration
        let pubKey = publicKeyDer;
        if (hasKey && pubKey) {
          setStatus('creating-account');
          const res = await authFetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user!.email,
              name: user!.firstName || '',
              publicKey: pubKey,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.details || err.error || 'Registration failed');
          }

          const data = await res.json();
          if (cancelled) return;

          if (!data.needsTokenAssociation) {
            setFolioUser(data.user);
            setStatus('done');
            return;
          }

          setStatus('signing-association');
          const signedTxBytes = await signTransaction(data.tokenAssocTxBytes);
          if (cancelled) return;

          setStatus('completing');
          const completeRes = await authFetch('/api/users/register/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user!.email, signedTxBytes }),
          });

          if (!completeRes.ok) {
            const err = await completeRes.json().catch(() => ({}));
            throw new Error(err.details || err.error || 'Token association failed');
          }

          if (cancelled) return;
          setFolioUser(data.user);
          setStatus('done');
          return;
        }

        // No local key — check if user exists with an encrypted key backup
        const keyRes = await authFetch(`/api/users/key?email=${encodeURIComponent(user!.email!)}`);
        const keyData = await keyRes.json().catch(() => ({}));
        if (cancelled) return;

        if (keyData.hasEncryptedKey) {
          setNeedsRecovery(true);
          setStatus('needs-passphrase');
          return;
        }

        // New user — needs passphrase to encrypt key
        setIsNewUser(true);
        setNeedsPassphrase(true);
        setStatus('needs-passphrase');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Registration failed');
          setStatus('error');
        }
      }
    }

    register();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Store EVM embedded wallet address when available (runs once per address)
  const [storedEvmAddress, setStoredEvmAddress] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.email || status !== 'done') return;
    const embeddedWallet = userWallets.find(
      (w) => w.connector?.isEmbeddedWallet === true
    );
    if (!embeddedWallet?.address || embeddedWallet.address === storedEvmAddress) return;

    setStoredEvmAddress(embeddedWallet.address);
    authFetch('/api/users/evm-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evmAddress: embeddedWallet.address }),
    }).catch((err) => console.error('Failed to store EVM wallet:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, status, userWallets]);

  return {
    folioUser,
    registering: status !== 'idle' && status !== 'done' && status !== 'error' && status !== 'needs-passphrase',
    status,
    error,
    needsPassphrase,
    needsRecovery,
    isNewUser,
    submitPassphrase,
    submitRecoveryPassphrase,
  };
}
