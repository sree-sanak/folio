'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatUsd, formatShares } from '@/lib/collar';
import { authFetch } from '@/lib/use-auth-fetch';
import type { PriceData } from '@/app/page';

export interface ActiveNote {
  id: number;
  symbol: string;
  amount: number;
  shares: number;
  floor: number;
  cap: number;
  expiryDate: string;
  status: string;
}

interface AiBubbleProps {
  activeNotes: ActiveNote[];
  prices: Record<string, PriceData>;
  onRepaySuccess: () => void;
}

function getSuggestion(note: ActiveNote, prices: Record<string, PriceData>): string {
  const price = prices[note.symbol];
  const expiry = new Date(note.expiryDate);
  const daysLeft = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  // Near expiry (highest priority)
  if (daysLeft <= 7) {
    return daysLeft === 0
      ? `Your advance expires today! Settle now to keep your ${formatShares(note.shares)} ${note.symbol} shares.`
      : `${daysLeft} day${daysLeft > 1 ? 's' : ''} until your advance expires. Settle now to keep your shares.`;
  }

  if (price) {
    // Stock approaching cap
    if (price.price >= note.cap * 0.95) {
      return `${note.symbol} approaching your collar cap (${formatUsd(note.cap)}). Settle now before gains are capped.`;
    }
    // Stock is up today
    if (price.changePercent > 0) {
      return `${note.symbol} up ${price.changePercent.toFixed(1)}% today. Settle your advance to keep the upside.`;
    }
  }

  // Default: reference collateral shares
  return `Settle ${formatUsd(note.amount)} to unlock your ${formatShares(note.shares)} ${note.symbol} shares.`;
}

function getMostUrgentNote(notes: ActiveNote[]): ActiveNote | null {
  const active = notes.filter((n) => n.status === 'active');
  if (active.length === 0) return null;
  return active.sort((a, b) => {
    const dateCompare = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    return b.amount - a.amount; // bigger debt first on tie
  })[0];
}

export default function AiBubble({ activeNotes, prices, onRepaySuccess }: AiBubbleProps) {
  const [showSpeech, setShowSpeech] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);

  const note = getMostUrgentNote(activeNotes);

  // Dismissal with sessionStorage timestamp
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const stored = sessionStorage.getItem('aiBubbleDismissedAt');
    if (stored) {
      const elapsed = Date.now() - parseInt(stored, 10);
      if (elapsed < 600000) { // 10 minutes
        setDismissed(true);
        return;
      }
      sessionStorage.removeItem('aiBubbleDismissedAt');
    }
    setDismissed(false);
  }, []);

  // Entrance animation: delay 1s after notes load
  useEffect(() => {
    if (!note || dismissed) {
      setBubbleVisible(false);
      return;
    }
    const timer = setTimeout(() => setBubbleVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [note, dismissed]);

  // Auto-show speech bubble 200ms after dot appears
  useEffect(() => {
    if (!bubbleVisible) return;
    const timer = setTimeout(() => setShowSpeech(true), 200);
    return () => clearTimeout(timer);
  }, [bubbleVisible]);

  const handleDismissSpeech = useCallback(() => {
    setShowSpeech(false);
    setDismissed(true);
    sessionStorage.setItem('aiBubbleDismissedAt', Date.now().toString());
  }, []);

  const handleSettle = async () => {
    if (!note) return;
    setSettling(true);
    setError(null);
    try {
      const res = await authFetch('/api/spend/repay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: note.id }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setShowSheet(false);
          setSuccess(false);
          onRepaySuccess();
        }, 2000);
      } else {
        setError('Settlement failed. Try again.');
        setTimeout(() => setError(null), 5000);
      }
    } catch {
      setError('Settlement failed. Try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSettling(false);
    }
  };

  if (!note || !bubbleVisible) return null;

  const suggestion = getSuggestion(note, prices);

  return (
    <>
      {/* Emerald dot */}
      <div className="fixed z-40 bottom-20 right-4 md:bottom-4"
        style={{ transition: 'opacity 400ms ease-out, transform 400ms ease-out' }}>
        {/* Speech bubble */}
        {showSpeech && !showSheet && (
          <div
            className="absolute bottom-14 right-0 mb-2 cursor-pointer"
            style={{ maxWidth: 260 }}
            onClick={() => { setShowSheet(true); setShowSpeech(false); }}
          >
            <div className="p-3 rounded-xl text-[13px] leading-relaxed"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.15)',
                color: 'var(--text-primary)',
              }}>
              {suggestion}
            </div>
            {/* Arrow */}
            <div className="absolute -bottom-1.5 right-4 w-3 h-3 rotate-45"
              style={{ background: 'rgba(16,185,129,0.08)', borderRight: '1px solid rgba(16,185,129,0.15)', borderBottom: '1px solid rgba(16,185,129,0.15)' }} />
          </div>
        )}

        {/* Dot button */}
        <button
          onClick={() => showSpeech ? handleDismissSpeech() : setShowSpeech(true)}
          aria-label="AI assistant"
          className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
          style={{
            background: '#10B981',
            boxShadow: '0 2px 12px rgba(16,185,129,0.3)',
            animation: 'pulse 2s infinite',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6z" />
          </svg>
        </button>
      </div>

      {/* Bottom Sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSheet(false); }}>
          {/* Backdrop */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />

          {/* Sheet */}
          <div
            className="relative w-full md:max-w-[480px] px-6 pb-8 pt-3"
            style={{
              background: '#161618',
              borderRadius: '16px 16px 0 0',
              animation: 'slideUp 250ms ease-out',
            }}
            role="dialog"
            aria-label="Settle advance"
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'rgba(255,255,255,0.12)' }} />

            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <div className="text-[20px] font-bold" style={{ color: '#10B981' }}>Shares Unlocked!</div>
                <div className="text-[13px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  {formatShares(note.shares)} {note.symbol} shares returned to your portfolio
                </div>
              </div>
            ) : (
              <>
                <div className="text-[13px] leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {suggestion}
                </div>

                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Settlement amount</span>
                  <span className="text-[24px] font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatUsd(note.amount)}</span>
                </div>
                <div className="flex justify-between mb-6">
                  <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Shares to unlock</span>
                  <span className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatShares(note.shares)} {note.symbol}
                  </span>
                </div>

                {error && (
                  <div className="text-[13px] mb-4 text-center" style={{ color: 'var(--negative)' }}>{error}</div>
                )}

                <button
                  onClick={handleSettle}
                  disabled={settling}
                  className="btn-primary w-full py-4 text-[15px]"
                >
                  {settling ? 'Settling...' : 'Settle Now'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
