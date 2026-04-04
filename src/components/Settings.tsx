'use client';

import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import type { PlaidStatus } from '@/lib/use-plaid-holdings';

interface SettingsProps {
  plaidStatus: PlaidStatus;
  isPlaidAvailable: boolean;
  isDemo: boolean;
  onConnectBrokerage: () => void;
}

export default function Settings({
  plaidStatus,
  isPlaidAvailable,
  isDemo,
  onConnectBrokerage,
}: SettingsProps) {
  const [mounted, setMounted] = useState(false);
  const { user, handleLogOut } = useDynamicContext();

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = mounted ? (user?.email ?? user?.firstName ?? 'Demo User') : 'Demo User';
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Settings
        </div>
        <div className="text-[28px] font-bold tracking-tight leading-none">
          Account
        </div>
      </div>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Profile
        </div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            {initial}
          </div>
          <div>
            <div className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
            <div className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Testnet</div>
          </div>
        </div>
      </div>

      {/* Brokerage Connection */}
      <div className="card p-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Brokerage
        </div>

        {!isDemo ? (
          /* Connected state */
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.1)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--positive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Brokerage Connected</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Showing your real positions
              </div>
            </div>
          </div>
        ) : isPlaidAvailable ? (
          /* Plaid available but not connected */
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(251,191,36,0.1)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Demo Mode</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Connect your brokerage to see real holdings
                </div>
              </div>
            </div>
            <button
              onClick={onConnectBrokerage}
              disabled={plaidStatus === 'loading'}
              className="btn-primary w-full py-3.5 text-[14px] font-semibold"
            >
              {plaidStatus === 'loading' ? 'Connecting...' : 'Connect Brokerage'}
            </button>
          </div>
        ) : (
          /* Plaid not available */
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.1)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--negative)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Demo Mode</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Brokerage integration unavailable — check Plaid configuration
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tokenized Assets */}
      <div className="card p-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Tokenized Assets
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>HTS Fungible Tokens</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Equities tokenized via Hedera Token Service
            </div>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
            <span className="text-[13px] font-medium">MOCK-TSLA</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24' }}>Testnet</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
            <span className="text-[13px] font-medium">MOCK-AAPL</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24' }}>Testnet</span>
          </div>
        </div>
        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[12px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            Swarm Compatible
          </div>
          <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            Token architecture uses the same HTS standard as Swarm&apos;s regulated tokenized securities (TSLA, AAPL, NVDA, MSFT). Production migration requires swapping token IDs and adding Swarm KYC onboarding.
          </div>
        </div>
      </div>

      {/* Network */}
      <div className="card p-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Network
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Hedera Testnet</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>All transactions settle on testnet</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            Testnet
          </div>
        </div>
      </div>

      {/* Log Out */}
      <button
        onClick={handleLogOut}
        className="w-full py-4 text-[15px] font-semibold rounded-2xl transition-colors"
        style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--negative)' }}
      >
        Log Out
      </button>
    </div>
  );
}
