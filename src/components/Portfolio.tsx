'use client';

import type { PriceData } from '@/app/page';
import type { Holding } from '@/lib/types';
import type { PlaidStatus } from '@/lib/use-plaid-holdings';

interface PortfolioProps {
  holdings: Holding[];
  prices: Record<string, PriceData>;
  plaidStatus: PlaidStatus;
  isPlaidAvailable: boolean;
  onConnectBrokerage: () => void;
  onSpendFromHolding: (holding: Holding) => void;
  onSpend: () => void;
  onViewNotes: () => void;
}

export default function Portfolio({
  holdings,
  prices,
  plaidStatus,
  isPlaidAvailable,
  onConnectBrokerage,
  onSpendFromHolding,
  onSpend,
  onViewNotes,
}: PortfolioProps) {
  const totalValue = holdings.reduce((sum, h) => {
    const price = prices[h.symbol]?.price ?? 0;
    return sum + h.shares * price;
  }, 0);

  const totalChange = holdings.reduce((sum, h) => {
    const change = prices[h.symbol]?.change ?? 0;
    return sum + h.shares * change;
  }, 0);

  const isPositive = totalChange >= 0;
  const hasHoldings = holdings.some((h) => h.shares > 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Total Portfolio
        </div>
        <div className="text-[44px] font-bold tracking-tight leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
          ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm font-semibold px-2.5 py-1 rounded-lg"
            style={{
              color: isPositive ? 'var(--positive)' : 'var(--negative)',
              background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            }}>
            {isPositive ? '+' : ''}{totalChange.toFixed(2)}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>today</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button onClick={onSpend} disabled={!hasHoldings} className="btn-primary flex-1 py-4 text-[15px]">
          Send Payment
        </button>
        <button onClick={onViewNotes} className="btn-secondary flex-1 py-4 text-[15px]">
          Spend Notes
        </button>
      </div>

      {/* Connect Brokerage or Holdings */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Holdings
        </div>

        {plaidStatus === 'idle' && isPlaidAvailable && !hasHoldings ? (
          /* Connect Brokerage Card */
          <button
            onClick={onConnectBrokerage}
            className="w-full card p-6 text-left cursor-pointer transition-all"
            style={{ border: '1.5px dashed rgba(255,255,255,0.12)' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-muted)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div>
                <div className="text-[15px] font-semibold">Connect Brokerage</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Link your account to see real positions
                </div>
              </div>
            </div>
          </button>
        ) : plaidStatus === 'loading' ? (
          <div className="card p-6 text-center">
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading holdings...</div>
          </div>
        ) : (
          /* Holdings List */
          <div className="space-y-3">
            {holdings.map((h) => {
              const price = prices[h.symbol]?.price ?? 0;
              const change = prices[h.symbol]?.changePercent ?? 0;
              const value = h.shares * price;
              const isUp = change >= 0;

              return (
                <button
                  key={h.symbol}
                  onClick={() => h.shares > 0 && onSpendFromHolding(h)}
                  className="w-full card flex items-center gap-4 p-5 text-left transition-all"
                  style={{ cursor: h.shares > 0 ? 'pointer' : 'default' }}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: h.gradient }}>
                    {h.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold">{h.name}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {h.shares} share{h.shares !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs font-medium mt-1" style={{ color: isUp ? 'var(--positive)' : 'var(--negative)' }}>
                      {isUp ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Available to Spend */}
      {hasHoldings && (
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.04]"
            style={{ background: 'var(--accent)', filter: 'blur(40px)', transform: 'translate(30%, -30%)' }} />
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Available to Spend
          </div>
          <div className="text-[30px] font-bold" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[13px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
            Spend directly from your portfolio
          </div>
        </div>
      )}
    </div>
  );
}
