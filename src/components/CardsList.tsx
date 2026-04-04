'use client';

import { useState, useEffect } from 'react';
import { formatUsd } from '@/lib/collar';
import { authFetch } from '@/lib/use-auth-fetch';

interface CardNote {
  id: number;
  amount: number;
  symbol: string;
  status: 'active' | 'repaid' | 'expired';
  cardLastFour?: string;
  createdAt: string;
}

interface CardsListProps {
  onGetCard: () => void;
}

export default function CardsList({ onGetCard }: CardsListProps) {
  const [cards, setCards] = useState<CardNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await authFetch('/api/notes');
        const data = await res.json();
        // Filter to notes that have a card associated
        const cardNotes = (data.notes ?? []).filter((n: CardNote) => n.cardLastFour);
        setCards(cardNotes);
      } catch {
        setCards([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  const statusColors: Record<string, { bg: string; color: string }> = {
    active: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    repaid: { bg: 'rgba(99,102,241,0.12)', color: '#818CF8' },
    expired: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-xl font-semibold">Cards</div>
        <button onClick={onGetCard} className="text-[13px] font-semibold px-4 py-2 rounded-lg cursor-pointer"
          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
          + New Card
        </button>
      </div>

      {loading ? (
        <div role="status" aria-busy="true" aria-label="Loading" className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="card p-5 space-y-4">
              <div className="skeleton h-44 w-full rounded-2xl" />
              <div className="space-y-2">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20">
          {/* Empty state with card icon */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--bg-elevated)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <div className="text-[15px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>No cards yet</div>
          <div className="text-[13px] mb-6" style={{ color: 'var(--text-tertiary)' }}>
            Get a virtual card to spend from your portfolio
          </div>
          <button onClick={onGetCard} className="btn-primary px-8 py-3 text-[14px]">
            Get Your First Card
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cards.map((card) => {
            const colors = statusColors[card.status] ?? statusColors.active;
            const created = new Date(card.createdAt);

            return (
              <div
                key={card.id}
                className="card p-5"
              >
                {/* Mini card visual */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-9 rounded-lg flex items-center justify-end pr-2 text-[10px] font-mono text-white/80"
                    style={{
                      background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  >
                    {card.cardLastFour}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold">
                      Folio Card •••• {card.cardLastFour}
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {card.symbol} · {created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatUsd(card.amount)}
                    </div>
                    <span className="pill" style={{ background: colors.bg, color: colors.color }}>
                      {card.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
