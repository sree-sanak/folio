'use client';

import { useState, useEffect } from 'react';
import { formatUsd, formatShares, formatDate } from '@/lib/collar';

interface SpendNote {
  id: number;
  symbol: string;
  amount: number;
  shares: number;
  floor: number;
  cap: number;
  recipientName: string;
  status: 'active' | 'repaid' | 'expired';
  durationMonths: number;
  expiryDate: string;
  createdAt: string;
  txId: string;
}

interface NoteDetailProps {
  noteId: number;
  onBack: () => void;
}

export default function NoteDetail({ noteId, onBack }: NoteDetailProps) {
  const [note, setNote] = useState<SpendNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [repaying, setRepaying] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const res = await fetch('/api/notes');
        const data = await res.json();
        const found = (data.notes ?? []).find((n: SpendNote) => n.id === noteId);
        setNote(found ?? null);
      } catch {
        setNote(null);
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [noteId]);

  const handleRepay = async () => {
    if (!note) return;
    setRepaying(true);
    try {
      await fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: note.id, status: 'repaid' }),
      });
      setNote({ ...note, status: 'repaid' });
    } catch {
      setNote({ ...note, status: 'repaid' });
    } finally {
      setRepaying(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        Loading...
      </div>
    );
  }

  if (!note) {
    return (
      <div>
        <button onClick={onBack} className="p-2 rounded-lg mb-6 cursor-pointer"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center py-20 text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
          Note not found
        </div>
      </div>
    );
  }

  const expiry = new Date(note.expiryDate);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const isUrgent = daysLeft <= 7 && note.status === 'active';

  const statusColors: Record<string, string> = {
    active: 'var(--accent)',
    repaid: '#818CF8',
    expired: '#EF4444',
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
        <div className="text-lg font-semibold">Spend Note #{note.id}</div>
      </div>

      {/* Recipient + Amount */}
      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          {note.recipientName.charAt(0)}
        </div>
        <div>
          <div className="text-[16px] font-semibold">{note.recipientName}</div>
          <div className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="text-[40px] font-bold mb-8" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatUsd(note.amount)}
      </div>

      {/* Urgency Banner */}
      {isUrgent && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-6"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-[13px] font-semibold" style={{ color: '#F59E0B' }}>
            {daysLeft === 0 ? 'Expires today!' : `${daysLeft} day${daysLeft > 1 ? 's' : ''} until expiry`}
          </span>
        </div>
      )}

      {/* Loan Details */}
      <div className="card p-6 mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-tertiary)' }}>
          Loan Details
        </div>

        <div className="flex flex-col gap-4">
          {[
            { label: 'Status', value: note.status.charAt(0).toUpperCase() + note.status.slice(1), color: statusColors[note.status] },
            { label: 'Collateral', value: `${formatShares(note.shares)} ${note.symbol || 'TSLA'}` },
            { label: 'Interest', value: '0%', color: 'var(--accent)' },
            { label: 'Protection', value: `${formatUsd(note.floor)} floor / ${formatUsd(note.cap)} cap` },
            { label: 'Duration', value: `${note.durationMonths} month${note.durationMonths > 1 ? 's' : ''}` },
            { label: 'Repay by', value: formatDate(expiry) },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-[14px]">
              <span style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
              <span className="font-semibold" style={{
                color: row.color ?? 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div className="text-[12px] mt-5 pt-5 leading-relaxed" style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)' }}>
          {note.status === 'repaid'
            ? 'Loan repaid. Your shares have been unlocked and returned.'
            : note.status === 'expired'
            ? 'Loan expired. Collateral shares were sold to settle the balance.'
            : `Repay ${formatUsd(note.amount)} before ${formatDate(expiry)} to unlock your shares.`}
        </div>
      </div>

      {/* TX ID */}
      <div className="text-[11px] mb-8 font-mono px-1" style={{ color: 'var(--text-tertiary)' }}>
        TX: {note.txId}
      </div>

      {/* Repay Button */}
      {note.status === 'active' && (
        <button
          onClick={handleRepay}
          disabled={repaying}
          className="btn-primary w-full py-4.5 text-[15px]"
        >
          {repaying ? 'Processing...' : `Repay ${formatUsd(note.amount)} & Unlock Shares`}
        </button>
      )}
    </div>
  );
}
