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
  const [showDetails, setShowDetails] = useState(false);

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
          <div className="skeleton h-6 w-32 rounded" />
        </div>
        <div className="flex flex-col items-center mb-8">
          <div className="skeleton h-10 w-40 rounded mb-2" />
          <div className="skeleton h-4 w-24 rounded" />
        </div>
        <div className="skeleton h-56 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-3 gap-3">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
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
  const remainingBalance = note.amount;
  const created = new Date(note.createdAt);
  const expiry = new Date(note.expiryDate);

  return (
    <div>
      {/* Header — minimal */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg cursor-pointer transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-[15px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          •••• {note.cardLastFour}
        </div>
        {!isActive && (
          <span className="pill ml-auto" style={{
            background: note.status === 'repaid' ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.12)',
            color: note.status === 'repaid' ? '#818CF8' : '#EF4444',
          }}>
            {note.status === 'repaid' ? 'Settled' : 'Expired'}
          </span>
        )}
      </div>

      {/* Balance — the hero */}
      <div className="text-center mb-8">
        <div className="text-[44px] font-bold tracking-tight" style={{
          color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}>
          {formatUsd(remainingBalance)}
        </div>
        <div className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {cardFrozen ? 'Card frozen' : isActive ? 'Available balance' : `${note.status === 'repaid' ? 'Settled' : 'Expired'}`}
        </div>
      </div>

      {/* Card Visual */}
      <div
        className="rounded-2xl p-5 text-left mx-auto mb-6 relative overflow-hidden flex flex-col justify-between"
        style={{
          background: cardFrozen
            ? 'linear-gradient(135deg, #1E1E21 0%, #2A2A2E 40%, #1E1E21 100%)'
            : 'linear-gradient(135deg, #0C0C0E 0%, #161618 40%, #1E1E21 100%)',
          maxWidth: 360,
          aspectRatio: '1.586',
          border: '1px solid var(--border)',
          boxShadow: cardFrozen
            ? '0 4px 20px rgba(0,0,0,0.2)'
            : '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(16,185,129,0.06)',
          opacity: cardFrozen ? 0.6 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Shine */}
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
            <div className="text-[15px] font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>Folio</div>
          </div>
          <div className="text-[13px] font-bold italic tracking-wider" style={{ color: 'rgba(245,245,247,0.35)' }}>VISA</div>
        </div>

        {/* Chip */}
        <div className="relative mt-3">
          <div className="w-9 h-6 rounded" style={{
            background: 'linear-gradient(135deg, #C9A84C, #F0D78C, #C9A84C)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
          }} />
        </div>

        {/* Card Number */}
        <div className="relative mt-3">
          <div className="text-[18px] font-mono font-medium tracking-[0.14em]"
            style={{ color: 'var(--text-primary)' }}>
            •••• •••• •••• {note.cardLastFour}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative flex justify-between items-end mt-auto">
          <div className="text-[13px] font-mono" style={{ color: 'rgba(245,245,247,0.5)' }}>
            {note.symbol}
          </div>
        </div>
      </div>

      {/* Quick Actions — Apple Card style */}
      {isActive && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={handleFreeze}
            disabled={freezing}
            className="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-colors"
            style={{ background: 'var(--bg-elevated)' }}
          >
            {cardFrozen ? (
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-muted)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.1)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--negative)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 5-5 5 5 0 0 1 5 5v4" />
                </svg>
              </div>
            )}
            <span className="text-[12px] font-medium" style={{
              color: cardFrozen ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
              {freezing ? '...' : cardFrozen ? 'Unfreeze' : 'Freeze'}
            </span>
          </button>

          <button
            onClick={onBack}
            className="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-colors"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-surface)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              All Cards
            </span>
          </button>
        </div>
      )}

      {/* Card Stats — simple, no lending jargon */}
      <div className="card p-5 mb-4">
        <div className="flex flex-col gap-3.5">
          <div className="flex justify-between text-[13px]">
            <span style={{ color: 'var(--text-tertiary)' }}>Backed by</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{note.symbol}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span style={{ color: 'var(--text-tertiary)' }}>Loaded</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span style={{ color: 'var(--text-tertiary)' }}>Interest</span>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>0%</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span style={{ color: 'var(--text-tertiary)' }}>Monthly fee</span>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>$0</span>
          </div>
        </div>
      </div>

      {/* Settle reminder — soft, not aggressive */}
      {isActive && (
        <div className="card p-4 mb-4" style={{ borderColor: 'rgba(245,158,11,0.15)' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(245,158,11,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Settle by {expiry.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </div>
              <div className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Pay back to unlock your {note.symbol} shares.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expandable details — tuck the lending mechanics away */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 w-full py-3 text-[13px] font-medium cursor-pointer"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ transform: showDetails ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        How it works
      </button>

      {showDetails && (
        <div className="card p-5 mb-4">
          <div className="text-[12px] leading-relaxed mb-4" style={{ color: 'var(--text-tertiary)' }}>
            {isActive
              ? `Your card is backed by ${note.shares.toFixed(2)} shares of ${note.symbol}. We protect these shares with a zero-cost collar so your downside is limited. Pay back anytime to release your shares.`
              : `This card was backed by ${note.shares.toFixed(2)} shares of ${note.symbol}, protected with a zero-cost collar.`}
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              { label: 'Shares held', value: `${note.shares.toFixed(4)} ${note.symbol}` },
              { label: 'Price at load', value: formatUsd(note.stockPrice) },
              { label: 'Protected range', value: `${formatUsd(note.floor)} – ${formatUsd(note.cap)}` },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-[12px]">
                <span style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
                <span className="font-medium" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
