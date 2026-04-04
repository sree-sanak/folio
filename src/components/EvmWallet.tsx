'use client';

import { useState } from 'react';
import { useUserWallets } from '@dynamic-labs/sdk-react-core';

export default function EvmWallet() {
  const userWallets = useUserWallets();
  const [copied, setCopied] = useState(false);

  const embeddedWallet = userWallets.find(
    (wallet) => wallet.connector?.isEmbeddedWallet === true
  );

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCopy = async () => {
    if (!embeddedWallet?.address) return;
    await navigator.clipboard.writeText(embeddedWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!embeddedWallet) {
    return (
      <div className="card p-6">
        <div
          className="text-[11px] font-semibold uppercase tracking-wider mb-4"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Wallet
        </div>
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.1)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Loading wallet...
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Setting up your embedded wallet
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div
        className="text-[11px] font-semibold uppercase tracking-wider mb-4"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Wallet
      </div>
      <div className="flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.1)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {truncateAddress(embeddedWallet.address)}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
              style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'transparent' }}
              title={copied ? 'Copied!' : 'Copy address'}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
              Base Sepolia
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
