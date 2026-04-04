'use client';

import { useState } from 'react';
import type { PriceData, SpendResult } from '@/app/page';
import { calculateCollar, formatShares, formatUsd, formatDate } from '@/lib/collar';
import CollarGraph from '@/components/CollarGraph';

interface SpendFlowProps {
  prices: Record<string, PriceData>;
  onBack: () => void;
  onComplete: (result: SpendResult) => void;
}

export default function SpendFlow({ prices, onBack, onComplete }: SpendFlowProps) {
  const [amount, setAmount] = useState('50');
  const [durationMonths, setDurationMonths] = useState(1);
  const [recipientSelected, setRecipientSelected] = useState(true);
  const [sending, setSending] = useState(false);
  const [expandHow, setExpandHow] = useState(false);

  const priceLoaded = prices.TSLA !== undefined;
  const tslaPrice = prices.TSLA?.price ?? 225;
  const val = parseFloat(amount) || 0;
  const maxSpend = 44 * tslaPrice;
  const collar = calculateCollar(val, tslaPrice, durationMonths);

  const handleSend = async () => {
    if (val <= 0 || val > maxSpend) return;
    setSending(true);

    try {
      const res = await fetch('/api/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: val,
          durationMonths,
          recipientName: 'Alex Chen',
          userAccountId: 'demo-user',
        }),
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();

      onComplete({
        amount: val,
        shares: collar.shares,
        recipientName: 'Alex Chen',
        durationMonths,
        expiryDate: collar.expiryDate.toISOString(),
        noteId: data.note.id,
        txId: data.txId,
      });
    } catch {
      onComplete({
        amount: val,
        shares: collar.shares,
        recipientName: 'Alex Chen',
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
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-lg cursor-pointer transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-lg font-semibold">Send Payment</div>
      </div>

      {/* Recipient */}
      {!recipientSelected ? (
        <div className="text-center py-8 mb-6">
          <button
            onClick={() => setRecipientSelected(true)}
            className="w-[76px] h-[76px] rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer transition-all"
            style={{ background: 'var(--bg-elevated)', border: '2px dashed rgba(255,255,255,0.1)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" /><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
            </svg>
          </button>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Scan QR or tap to choose recipient</div>
        </div>
      ) : (
        <div className="card flex items-center gap-4 p-4 mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>A</div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">Alex Chen</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>@alexchen</div>
          </div>
          <button onClick={() => setRecipientSelected(false)}
            className="p-2 rounded-lg cursor-pointer transition-colors"
            style={{ color: 'var(--text-tertiary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Amount Input */}
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
      <div className="text-center text-[13px] mb-8" style={{ color: 'var(--text-tertiary)' }}>
        Available: up to <strong style={{ color: 'var(--text-secondary)' }}>
          ${maxSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </strong> from Tesla
      </div>

      {/* Paying From */}
      <div className="card flex items-center gap-4 p-4 mb-5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #E31937, #B91C3A)' }}>T</div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold">Tesla</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Paying from</div>
        </div>
        <div className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: priceLoaded ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          {priceLoaded ? `$${tslaPrice.toFixed(2)}` : '···'}
        </div>
      </div>

      {/* Loan Disclosure */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Pay later with your portfolio</div>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'They get', value: formatUsd(val), color: 'var(--accent)' },
            { label: 'Interest', value: '0%', color: 'var(--accent)' },
            { label: 'Fees', value: '$0', color: 'var(--accent)' },
          ].map((stat) => (
            <div key={stat.label} className="p-3.5 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <div className="text-[10px] mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                {stat.label}
              </div>
              <div className="text-[18px] font-bold" style={{ color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Duration Picker */}
        <div className="mb-5">
          <div className="text-[11px] mb-3 uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Repay within
          </div>
          <div className="flex gap-2.5">
            {[1, 2, 3].map((m) => {
              const active = durationMonths === m;
              return (
                <button
                  key={m}
                  onClick={() => setDurationMonths(m)}
                  className="flex-1 py-3.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer"
                  style={{
                    background: active ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${active ? 'var(--accent)' : 'transparent'}`,
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    boxShadow: active ? '0 0 12px rgba(16,185,129,0.15)' : 'none',
                  }}
                >
                  {m} month{m > 1 ? 's' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Collateral */}
        <div className="flex justify-between py-3.5 text-[13px]" style={{ borderTop: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Collateral</span>
          <span className="font-medium" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatShares(collar.shares)} TSLA ({formatUsd(collar.collateralValue)})
          </span>
        </div>

        {/* Expiry Note */}
        <div className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Repay <strong style={{ color: 'var(--text-secondary)' }}>by {formatDate(collar.expiryDate)}</strong> to
          unlock shares. If not repaid, shares are sold to settle.
        </div>

        {/* How does this work? */}
        <button
          onClick={() => setExpandHow(!expandHow)}
          className="flex items-center gap-2 mt-5 text-[13px] font-medium cursor-pointer transition-colors"
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
            <CollarGraph price={tslaPrice} floor={collar.floor} cap={collar.cap} />
            <div className="text-[13px] mt-4 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              This is a 0% interest loan backed by your Tesla shares. We hold a small portion as collateral
              and protect it with a zero-cost options collar (the green zone above). The recipient gets paid
              instantly. Repay anytime before the due date and your shares are released. If you don&apos;t repay,
              the shares are sold to cover the balance.
            </div>
          </div>
        )}
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={!priceLoaded || val <= 0 || val > maxSpend || sending || !recipientSelected}
        className="btn-primary w-full py-4.5 text-[15px]"
      >
        {sending ? 'Sending...' : `Send ${formatUsd(val)}`}
      </button>
    </div>
  );
}
