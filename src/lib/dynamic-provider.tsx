'use client';

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID ?? '',
        walletConnectors: [EthereumWalletConnectors],
        appName: 'Folio',
        appLogoUrl: '',
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
