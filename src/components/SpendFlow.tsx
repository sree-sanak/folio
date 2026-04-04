'use client';

import { useState } from 'react';
import type { PriceData, SpendResult } from '@/app/page';
import type { Holding } from '@/lib/types';
import { calculateCollar, formatShares, formatUsd, formatDate } from '@/lib/collar';
import CollarGraph from '@/components/CollarGraph';

interface SpendFlowProps {
  selectedHolding: Holding;
  prices: Record<string, PriceData>;
  onBack: () => void;
  onComplete: (result: SpendResult) => void;
}

export default function SpendFlow({ selectedHolding, prices, onBack, onComplete }: SpendFlowProps) {
  const [amount, setAmount] = useState('50');
  const [sending, setSending] = useState(false);
  const [expandHow, setExpandHow] = useState(false);

  const durationMonths = 1; // Fixed for portfolio advance

  const { symbol, name: stockName, shares: totalShares, icon: stockIcon, gradient: stockGradient } = selectedHolding;

  const priceLoaded = prices[symbol] !== undefined;
  const stockPrice = prices[symbol]?.price ?? 0;
  const val = parseFloat(amount) || 0;
  const maxSpend = totalShares * stockPrice;
  const collar = calculateCollar(val, stockPrice || 225, durationMonths);

  const handleSend = async () => {
    if (val <= 0 || val > maxSpend) return;
    setSending(true);

    try {
      const res = await fetch('/api/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: val,
          symbol,
          durationMonths,
          issueCard: true,
          userAccountId: 'demo-user',
        }),
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();

      onComplete({
        symbol,
        amount: val,
        shares: collar.shares,
        durationMonths,
        expiryDate: collar.expiryDate.toISOString(),
        noteId: data.note.id,
        txId: data.txId,
        card: data.card,
      });
    } catch {
      onComplete({
        symbol,
        amount: val,
        shares: collar.shares,
        durationMonths,
        expiryDate: collar.expiryDate.toISOString(),
        noteId: Date.now(),
        txId: 'demo-tx-' + Date.now(),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg cursor-pointer transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-lg font-semibold">Get Card</div>
      </div>

      {/* Amount Input */}
      <div>
        <div className="flex items-center justify-center gap-1 mb-2">
          <span className="text-3xl font-light" style={{ color: 'var(--text-tertiary)' }}>$</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="text-5xl font-bold text-center bg-transparent border-none outline-none w-48"
            style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', caretColor: 'var(--accent)' }}
            inputMode="decimal"
          />
        </div>
        <div className="text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
          Available: up to <strong style={{ color: 'var(--text-secondary)' }}>
            ${maxSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </strong> from {stockName}
        </div>
      </div>

      {/* Paying From */}
      <div className="card flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: stockGradient }}>{stockIcon}</div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold">{stockName}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Paying from</div>
        </div>
        <div className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: priceLoaded ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          {priceLoaded ? `$${stockPrice.toFixed(2)}` : '···'}
        </div>
      </div>

      {/* Advance Details */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Spend from your portfolio</div>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Amount', value: formatUsd(val), color: 'var(--accent)' },
            { label: 'Interest', value: '0%', color: 'var(--accent)' },
            { label: 'Fees', value: '$0', color: 'var(--accent)' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <div className="text-[10px] mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                {stat.label}
              </div>
              <div className="text-[18px] font-bold" style={{ color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Collateral */}
        <div className="flex justify-between py-4 text-[13px]" style={{ borderTop: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Collateral</span>
          <span className="font-medium" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatShares(collar.shares)} {symbol} ({formatUsd(collar.collateralValue)})
          </span>
        </div>

        {/* Protection Note */}
        <div className="text-[12px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Your shares are protected with a zero-cost collar
          until <strong style={{ color: 'var(--text-secondary)' }}>{formatDate(collar.expiryDate)}</strong>.
          Settle anytime to unlock your shares.
        </div>

        {/* How does this work? */}
        <div>
          <button
            onClick={() => setExpandHow(!expandHow)}
            className="flex items-center gap-2 text-[13px] font-medium cursor-pointer transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ transform: expandHow ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            How does this work?
          </button>
          {expandHow && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
              <CollarGraph price={stockPrice || 225} floor={collar.floor} cap={collar.cap} stockName={stockName} />
              <div className="text-[13px] mt-4 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                This is a 0% portfolio advance backed by your {stockName} shares. We hold a small portion as
                collateral and protect it with a zero-cost options collar (the green zone above). You get a
                virtual card instantly. Settle anytime and your shares are released. If not settled, shares are
                sold to cover the balance.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleSend}
        disabled={!priceLoaded || val <= 0 || val > maxSpend || sending}
        className="btn-primary w-full py-4 text-[15px]"
      >
        {sending ? 'Issuing card...' : `Get Card · ${formatUsd(val)}`}
      </button>
    </div>
  );
}
