'use client';

import { useState, useEffect } from 'react';
import { formatUsd } from '@/lib/collar';
import { authFetch } from '@/lib/use-auth-fetch';

interface CardDetailProps {
  noteId: number;
  onBack: () => void;
}

interface CardNote {
  id: number;
  amount: number;
  symbol: string;
  status: 'active' | 'repaid' | 'expired';
  cardLastFour?: string;
  cardToken?: string;
  cardState?: 'OPEN' | 'PAUSED' | 'CLOSED';
  cardSpendLimit?: number;
  createdAt: string;
  expiryDate: string;
  floor: number;
  cap: number;
  stockPrice: number;
  shares: number;
  durationMonths: number;
}

export default function CardDetail({ noteId, onBack }: CardDetailProps) {
  const [note, setNote] = useState<CardNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezing, setFreezing] = useState(false);
  const [cardFrozen, setCardFrozen] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const res = await authFetch(`/api/notes/${noteId}`);
        const data = await res.json();
        if (data.note) {
          setNote(data.note);
          setCardFrozen(data.note.cardState === 'PAUSED');
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [noteId]);

  const handleFreeze = async () => {
    if (!note?.cardToken) return;
    setFreezing(true);
    try {
      const res = await authFetch('/api/cards/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardToken: note.cardToken, freeze: !cardFrozen }),
      });
      const data = await res.json();
      if (data.success) {
        setCardFrozen(!cardFrozen);
      }
    } catch {
      // ignore
    } finally {
      setFreezing(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="p-2 rounded-lg cursor-pointer"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="skeleton h-6 w-40 rounded" />
        </div>
        <div className="skeleton h-56 w-full rounded-2xl mb-6" />
        <div className="card p-5 space-y-4">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton h-4 w-24 rounded" />
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="text-center py-20">
        <div className="text-[15px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Card not found</div>
        <button onClick={onBack} className="btn-primary px-8 py-3 text-[14px] mt-4">Go Back</button>
      </div>
    );
  }

  const isActive = note.status === 'active';
  const expiry = new Date(note.expiryDate);
  const remainingBalance = note.amount; // In production, subtract total spent
  const spendLimitDisplay = note.cardSpendLimit
    ? formatUsd(note.cardSpendLimit / 100)
    : formatUsd(note.amount);

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
        <div className="text-lg font-semibold">Card Details</div>
      </div>

      {/* Full Card Visual */}
      <div
        className="rounded-2xl p-6 text-left mx-auto mb-8 relative overflow-hidden flex flex-col justify-between"
        style={{
          background: cardFrozen
            ? 'linear-gradient(135deg, #1E1E21 0%, #2A2A2E 40%, #1E1E21 100%)'
            : 'linear-gradient(135deg, #0C0C0E 0%, #161618 40%, #1E1E21 100%)',
          maxWidth: 380,
          aspectRatio: '1.586',
          border: '1px solid var(--border)',
          boxShadow: cardFrozen
            ? '0 8px 32px rgba(0,0,0,0.2)'
            : '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(16,185,129,0.06)',
          opacity: cardFrozen ? 0.7 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Card shine */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)' }} />

        {/* Frozen overlay */}
        {cardFrozen && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-[12px] font-semibold" style={{ color: '#A1A1AA' }}>Frozen</span>
            </div>
          </div>
        )}

        {/* Top row */}
        <div className="relative flex justify-between items-start">
          <div>
            <div className="text-[16px] font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>Folio</div>
            <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Prepaid Card</div>
          </div>
          <div className="text-[14px] font-bold italic tracking-wider" style={{ color: 'rgba(245,245,247,0.4)' }}>VISA</div>
        </div>

        {/* Chip */}
        <div className="relative mt-4">
          <div className="w-10 h-7 rounded-md" style={{
            background: 'linear-gradient(135deg, #C9A84C, #F0D78C, #C9A84C)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
          }} />
        </div>

        {/* Card Number */}
        <div className="relative mt-4 text-left">
          <div className="text-[20px] font-mono font-medium tracking-[0.15em]"
            style={{ color: 'var(--text-primary)' }}>
            {'•••• •••• •••• '}{note.cardLastFour}
          </div>
        </div>

        {/* Bottom row */}
        <div className="relative flex justify-between items-end mt-4">
          <div className="flex gap-6">
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Status</div>
              <div className="text-[14px] font-mono" style={{
                color: cardFrozen ? 'var(--negative)' : isActive ? 'var(--accent)' : 'var(--text-tertiary)',
              }}>
                {cardFrozen ? 'Frozen' : isActive ? 'Active' : note.status}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Source</div>
              <div className="text-[14px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{note.symbol}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Balance</div>
            <div className="text-[18px] font-bold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatUsd(remainingBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {isActive && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleFreeze}
            disabled={freezing}
            className="card flex items-center justify-center gap-2.5 p-4 cursor-pointer transition-colors"
            style={{
              border: cardFrozen ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {cardFrozen ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
                  {freezing ? 'Unfreezing...' : 'Unfreeze'}
                </span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--negative)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 5-5 5 5 0 0 1 5 5v4" />
                </svg>
                <span className="text-[13px] font-semibold" style={{ color: 'var(--negative)' }}>
                  {freezing ? 'Freezing...' : 'Freeze Card'}
                </span>
              </>
            )}
          </button>

          <button
            onClick={onBack}
            className="card flex items-center justify-center gap-2.5 p-4 cursor-pointer transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>All Cards</span>
          </button>
        </div>
      )}

      {/* Card Info */}
      <div className="card p-5 mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Card Info
        </div>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Spend Limit', value: spendLimitDisplay },
            { label: 'Remaining', value: formatUsd(remainingBalance), accent: true },
            { label: 'Collateral', value: `${note.shares.toFixed(4)} ${note.symbol}` },
            { label: 'Interest', value: '0%', accent: true },
            { label: 'Fees', value: '$0', accent: true },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-[13px]">
              <span style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
              <span className="font-semibold" style={{
                color: row.accent ? 'var(--accent)' : 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Collar Details */}
      <div className="card p-5 mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Protection Range
        </div>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Price at Issue', value: formatUsd(note.stockPrice) },
            { label: 'Floor', value: formatUsd(note.floor) },
            { label: 'Cap', value: formatUsd(note.cap) },
            { label: 'Duration', value: `${note.durationMonths} month${note.durationMonths > 1 ? 's' : ''}` },
            { label: 'Settle by', value: expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-[13px]">
              <span style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
              <span className="font-semibold" style={{
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Settle info */}
      <div className="text-[12px] text-center leading-relaxed mt-6" style={{ color: 'var(--text-tertiary)' }}>
        Settle by {expiry.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to unlock your {note.symbol} shares.
      </div>
    </div>
  );
}
