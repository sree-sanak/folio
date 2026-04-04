'use client';

import { useState, useEffect, useRef } from 'react';
import type { PriceData, SpendResult } from '@/app/page';
import type { Holding } from '@/lib/types';
import { calculateCollar, formatShares, formatUsd, formatDate } from '@/lib/collar';
import { authFetch } from '@/lib/use-auth-fetch';
import CollarGraph from '@/components/CollarGraph';
import { useHederaKey } from '@/lib/use-hedera-key';

export type SpendMode = 'send' | 'card';

interface SpendFlowProps {
  mode: SpendMode;
  selectedHolding: Holding;
  holdings: Holding[];
  prices: Record<string, PriceData>;
  currentUserAccountId?: string;
  onBack: () => void;
  onComplete: (result: SpendResult) => void;
}

export default function SpendFlow({ mode, selectedHolding, holdings, prices, currentUserAccountId, onBack, onComplete }: SpendFlowProps) {
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'preparing' | 'signing' | 'submitting'>('idle');
  const [sendError, setSendError] = useState('');
  const { signTransaction } = useHederaKey();
  const [expandHow, setExpandHow] = useState(false);
  const [currentHolding, setCurrentHolding] = useState<Holding>(selectedHolding);
  const [showPicker, setShowPicker] = useState(false);
  const [recipientInput, setRecipientInput] = useState('');
  const [recipientAccountId, setRecipientAccountId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'found' | 'not-found' | 'self'>('idle');
  const verifyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [durationMonths, setDurationMonths] = useState(1);

  // AI collar optimizer state
  const [aiCollar, setAiCollar] = useState<{ floorPct: number; capPct: number; durationMonths: number; confidence: number; reasoning: string; riskLevel: string; warnings: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const hasRecipient = mode === 'card' || !!recipientAccountId;
  const resolvedRecipientId = recipientAccountId;

  // Verify recipient email as they type
  useEffect(() => {
    if (mode !== 'send' || recipientAccountId) return;
    clearTimeout(verifyTimeout.current);
    const input = recipientInput.trim();

    if (!input || !input.includes('@')) {
      setVerifyStatus('idle');
      return;
    }

    setVerifyStatus('checking');
    verifyTimeout.current = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/users/search?q=${encodeURIComponent(input)}`);
        const data = await res.json();
        const users: { email: string; name: string; hederaAccountId: string }[] = data.users || [];

        // Filter out self and find exact email match
        const match = users.find(
          (u) => u.email.toLowerCase() === input.toLowerCase() && u.hederaAccountId !== currentUserAccountId
        );

        if (match) {
          setRecipientAccountId(match.hederaAccountId);
          setRecipientName(match.name || match.email);
          setVerifyStatus('found');
        } else {
          // Check if they tried their own email
          const self = users.find(
            (u) => u.email.toLowerCase() === input.toLowerCase() && u.hederaAccountId === currentUserAccountId
          );
          setVerifyStatus(self ? 'self' : 'not-found');
        }
      } catch {
        setVerifyStatus('not-found');
      }
    }, 500);
    return () => clearTimeout(verifyTimeout.current);
  }, [recipientInput, mode, recipientAccountId, currentUserAccountId]);

  // Debounced AI collar optimization — non-blocking enhancement
  useEffect(() => {
    const val = parseFloat(amount) || 0;
    if (!val || !currentHolding.symbol) {
      setAiCollar(null);
      return;
    }

    setAiLoading(true);
    setAiCollar(null);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await authFetch('/api/ai/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: currentHolding.symbol, amount: val, durationMonths }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.recommendation) {
            setAiCollar(data.recommendation);
          }
        }
      } catch {
        // Silent degradation — AI optimization is non-blocking
      } finally {
        setAiLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setAiLoading(false);
    };
  }, [amount, currentHolding.symbol, durationMonths]);

  const spendableHoldings = holdings.filter((h) => h.shares > 0);

  const { symbol, name: stockName, shares: totalShares, icon: stockIcon, gradient: stockGradient } = currentHolding;

  const priceLoaded = prices[symbol] !== undefined;
  const stockPrice = prices[symbol]?.price ?? 0;
  const val = parseFloat(amount) || 0;
  const maxSpend = totalShares * stockPrice;
  const collar = calculateCollar(val, stockPrice || 225, durationMonths);

  // Prefer AI-optimized collar values when available, fall back to static
  const effectiveFloor = aiCollar ? (stockPrice || 225) * (1 - aiCollar.floorPct) : collar.floor;
  const effectiveCap = aiCollar ? (stockPrice || 225) * (1 + aiCollar.capPct) : collar.cap;

  const handleSend = async () => {
    if (val <= 0 || val > maxSpend) return;
    setSending(true);
    setSendError('');

    try {
      // Step 1: Prepare — server builds unsigned collateral lock transaction
      setSendStatus('preparing');
      const prepRes = await authFetch('/api/spend/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: val,
          symbol,
          durationMonths,
          userAccountId: currentUserAccountId || '',
        }),
      });

      if (!prepRes.ok) {
        const err = await prepRes.json().catch(() => ({}));
        throw new Error(err.details || err.error || 'Failed to prepare transaction');
      }

      const prepData = await prepRes.json();
      let signedCollateralTxBytes: string | undefined;

      // Step 2: Sign — client signs the collateral lock with their private key
      if (prepData.needsSignature && prepData.collateralLockTxBytes) {
        setSendStatus('signing');
        signedCollateralTxBytes = await signTransaction(prepData.collateralLockTxBytes);
      }

      // Step 3: Execute — server co-signs, submits, and does the rest
      setSendStatus('submitting');
      const execRes = await authFetch('/api/spend/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedCollateralTxBytes,
          amount: val,
          symbol,
          durationMonths,
          issueCard: mode === 'card',
          recipientAccountId: mode === 'send' ? resolvedRecipientId : undefined,
          recipientName: mode === 'send' ? (recipientName || undefined) : undefined,
          recipientEmail: mode === 'send' ? (recipientInput.trim() || undefined) : undefined,
          userAccountId: currentUserAccountId || '',
        }),
      });

      if (!execRes.ok) {
        const err = await execRes.json().catch(() => ({}));
        throw new Error(err.details || err.error || 'Transaction failed');
      }

      const data = await execRes.json();

      onComplete({
        symbol,
        amount: val,
        shares: collar.shares,
        durationMonths,
        expiryDate: collar.expiryDate.toISOString(),
        noteId: data.note.id,
        txId: data.txId,
        card: data.card,
        recipientName: mode === 'send' ? (recipientName || resolvedRecipientId) : undefined,
        recipientAccountId: mode === 'send' ? resolvedRecipientId : undefined,
        ai: data.ai,
      });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
      setSendStatus('idle');
    }
  };

  return (
    <div className="space-y-8">
      {/* Shimmer animation uses global @keyframes shimmer from globals.css */}
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg cursor-pointer transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-lg font-semibold">{mode === 'send' ? 'Send Payment' : 'Load Card'}</div>
      </div>

      {/* Recipient (send mode only) */}
      {mode === 'send' && (
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Send to
          </div>

          {recipientAccountId ? (
            /* Verified recipient */
            <div className="card flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(16,185,129,0.1)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--positive)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold truncate">{recipientName || recipientInput}</div>
                <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                  Verified recipient
                </div>
              </div>
              <button onClick={() => {
                setRecipientAccountId('');
                setRecipientName('');
                setRecipientInput('');
                setVerifyStatus('idle');
              }} className="p-2 rounded-lg cursor-pointer transition-colors flex-shrink-0"
                style={{ color: 'var(--text-tertiary)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            /* Input with inline verification */
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--bg-elevated)' }}>
                  {verifyStatus === 'checking' ? (
                    <div className="w-4 h-4 border-2 rounded-full animate-spin"
                      style={{ borderColor: 'var(--text-tertiary)', borderTopColor: 'transparent' }} />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={recipientInput}
                    onChange={(e) => {
                      setRecipientInput(e.target.value);
                      setRecipientAccountId('');
                      setRecipientName('');
                      setVerifyStatus('idle');
                    }}
                    placeholder="name@example.com"
                    className="w-full bg-transparent border-none outline-none text-[15px] font-semibold"
                    style={{ color: 'var(--text-primary)', caretColor: 'var(--accent)' }}
                  />
                  <div className="text-[11px] mt-0.5" style={{
                    color: verifyStatus === 'self' ? 'var(--negative)'
                      : verifyStatus === 'not-found' ? 'var(--negative)'
                      : 'var(--text-tertiary)'
                  }}>
                    {verifyStatus === 'checking' && 'Verifying...'}
                    {verifyStatus === 'self' && "You can't send to yourself"}
                    {verifyStatus === 'not-found' && 'No user found with that email'}
                    {verifyStatus === 'idle' && 'Enter their email address'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Amount Input */}
      <div>
        <div className="flex items-center justify-center gap-1 mb-2">
          <span className="text-3xl font-light" style={{ color: 'var(--text-tertiary)' }}>$</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, '');
              // Prevent multiple decimal points
              const parts = val.split('.');
              setAmount(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val);
            }}
            placeholder="0"
            className="text-5xl font-bold text-center bg-transparent border-none outline-none w-48 placeholder:text-[var(--text-tertiary)]"
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

      {/* Paying From — tappable asset picker */}
      <div className="relative">
        <button
          onClick={() => spendableHoldings.length > 1 && setShowPicker(!showPicker)}
          className="card flex items-center gap-4 p-4 w-full text-left cursor-pointer transition-colors"
          style={{ border: showPicker ? '1px solid var(--accent)' : undefined }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: stockGradient }}>{stockIcon}</div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold">{stockName}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Paying from</div>
          </div>
          <div className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: priceLoaded ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {priceLoaded ? `$${maxSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '···'}
          </div>
          {spendableHoldings.length > 1 && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"
              style={{ transform: showPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </button>

        {showPicker && (
          <div className="card mt-1 overflow-hidden" style={{ position: 'absolute', left: 0, right: 0, zIndex: 10 }}>
            {spendableHoldings
              .filter((h) => h.symbol !== currentHolding.symbol)
              .map((h) => {
                const hp = prices[h.symbol];
                return (
                  <button
                    key={h.symbol}
                    onClick={() => { setCurrentHolding(h); setShowPicker(false); }}
                    className="flex items-center gap-4 p-4 w-full text-left cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: h.gradient }}>{h.icon}</div>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold">{h.name}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {h.shares} shares
                      </div>
                    </div>
                    <div className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: hp ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {hp ? `$${(h.shares * hp.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '···'}
                    </div>
                  </button>
                );
              })}
          </div>
        )}
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
          <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>0% interest loan from your portfolio</div>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: mode === 'send' ? 'They get' : 'Amount', value: formatUsd(val), color: 'var(--accent)' },
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

        {/* Duration Picker */}
        <div>
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
          {aiCollar && aiCollar.durationMonths !== durationMonths && (
            <p style={{ color: '#71717A', fontSize: '12px', marginTop: '4px' }}>
              AI suggests {aiCollar.durationMonths} month{aiCollar.durationMonths > 1 ? 's' : ''} (lower volatility risk)
            </p>
          )}
        </div>

        {/* Collateral */}
        <div aria-live="polite">
          <div className="flex justify-between py-4 text-[13px]" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Collateral</span>
            <span className="font-medium" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatShares(collar.shares)} {symbol} ({formatUsd(collar.collateralValue)})
            </span>
          </div>
        </div>

        {/* Protection Range */}
        {val > 0 && (
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Your Protection
              </span>
              {aiLoading && (
                <div className="h-3 w-16 rounded ml-auto" style={{ background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--border) 50%, var(--bg-elevated) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>If {symbol} drops</div>
                <div className="text-[15px] font-semibold" style={{ color: '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                  Protected below ${effectiveFloor.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>If {symbol} rises</div>
                <div className="text-[15px] font-semibold" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                  Capped at ${effectiveCap.toFixed(2)}
                </div>
              </div>
            </div>
            {aiCollar && aiCollar.warnings.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                {aiCollar.warnings.map((w, i) => (
                  <div key={i} className="text-[12px] flex items-start gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    <span style={{ color: '#F59E0B' }}>!</span> {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Repayment Note */}
        <div className="text-[12px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Repay <strong style={{ color: 'var(--text-secondary)' }}>by {formatDate(collar.expiryDate)}</strong> to
          unlock your shares. If not repaid, shares are sold to settle.
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
            <div className="mt-5 pt-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
              <CollarGraph price={stockPrice || 225} floor={effectiveFloor} cap={effectiveCap} stockName={stockName} />
              <div className="text-[13px] leading-relaxed space-y-3" style={{ color: 'var(--text-tertiary)' }}>
                <p>
                  <strong style={{ color: 'var(--text-secondary)' }}>Borrow at 0% interest.</strong>{' '}
                  We hold {formatShares(collar.shares)} of your {stockName} shares as collateral.
                </p>
                <p>
                  <strong style={{ color: 'var(--text-secondary)' }}>You&apos;re protected.</strong>{' '}
                  If {stockName} drops below ${effectiveFloor.toFixed(0)}, we absorb the loss. If it rises
                  above ${effectiveCap.toFixed(0)}, you give up gains beyond that. The upside limit is
                  what makes the 0% interest possible.
                </p>
                <p>
                  <strong style={{ color: 'var(--text-secondary)' }}>Repay anytime</strong> before {formatDate(collar.expiryDate)} and
                  your shares are released. If not, they&apos;re sold to cover the balance.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {sendError && (
        <div className="text-center text-[13px] px-4 py-2 rounded-lg" style={{ color: 'var(--negative)', background: 'var(--bg-elevated)' }}>
          {sendError}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleSend}
        disabled={!priceLoaded || val <= 0 || val > maxSpend || sending || !hasRecipient}
        className="btn-primary w-full py-4 text-[15px]"
      >
        {sending
          ? (sendStatus === 'preparing' ? 'Preparing...'
            : sendStatus === 'signing' ? 'Signing...'
            : sendStatus === 'submitting' ? 'Submitting...'
            : 'Processing...')
          : (mode === 'send' ? `Send ${formatUsd(val)}` : `Get Card · ${formatUsd(val)} at 0%`)}
      </button>
    </div>
  );
}
