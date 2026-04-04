'use client';

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { useEffect, useState } from 'react';

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID ?? 'placeholder',
        walletConnectors: [EthereumWalletConnectors],
        appName: 'Folio',
        appLogoUrl: '',
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
