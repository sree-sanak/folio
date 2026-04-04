'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  hasKeypair,
  generateKeypair,
  getStoredPublicKey,
  signTransaction as keystoreSign,
  exportKey,
  importKey,
  validateImportedKey,
  clearKeypair,
} from './hedera-keystore';

export function useHederaKey() {
  const [hasKey, setHasKey] = useState(false);
  const [publicKeyDer, setPublicKeyDer] = useState<string | null>(null);

  useEffect(() => {
    setHasKey(hasKeypair());
    setPublicKeyDer(getStoredPublicKey());
  }, []);

  const generateKey = useCallback(async () => {
    const { publicKeyDer: pub } = await generateKeypair();
    setHasKey(true);
    setPublicKeyDer(pub);
    return pub;
  }, []);

  const signTransaction = useCallback(async (txBytesBase64: string): Promise<string> => {
    const txBytes = Uint8Array.from(atob(txBytesBase64), (c) => c.charCodeAt(0));
    const signedBytes = await keystoreSign(txBytes);
    // Convert back to base64
    let binary = '';
    for (let i = 0; i < signedBytes.length; i++) {
      binary += String.fromCharCode(signedBytes[i]);
    }
    return btoa(binary);
  }, []);

  const doExportKey = useCallback(() => exportKey(), []);

  const doImportKey = useCallback(async (der: string) => {
    importKey(der);
    const pub = await validateImportedKey();
    setHasKey(true);
    setPublicKeyDer(pub);
    return pub;
  }, []);

  const doClearKey = useCallback(() => {
    clearKeypair();
    setHasKey(false);
    setPublicKeyDer(null);
  }, []);

  return {
    hasKey,
    publicKeyDer,
    generateKey,
    signTransaction,
    exportKey: doExportKey,
    importKey: doImportKey,
    clearKey: doClearKey,
  };
}
