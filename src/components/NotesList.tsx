'use client';

import { useState, useEffect } from 'react';
import { formatUsd, formatDate } from '@/lib/collar';
import { authFetch } from '@/lib/use-auth-fetch';

interface SpendNote {
  id: number;
  amount: number;
  shares: number;
  recipientName: string;
  status: 'active' | 'repaid' | 'expired';
  expiryDate: string;
  createdAt: string;
}

interface NotesListProps {
  onSelectNote: (noteId: number) => void;
}

export default function NotesList({ onSelectNote }: NotesListProps) {
  const [notes, setNotes] = useState<SpendNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await authFetch('/api/notes');
        const data = await res.json();
        setNotes(data.notes ?? []);
      } catch {
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const statusColors: Record<string, { bg: string; color: string }> = {
    active: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    repaid: { bg: 'rgba(99,102,241,0.12)', color: '#818CF8' },
    expired: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  };

  return (
    <div>
      <div className="text-xl font-semibold mb-6">Transactions</div>

      {loading ? (
        <div className="text-center py-20 text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          Loading...
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--bg-elevated)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="text-[15px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>No transactions yet</div>
          <div className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            Send a payment to create your first transaction
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => {
            const expiry = new Date(note.expiryDate);
            const colors = statusColors[note.status] ?? statusColors.active;

            return (
              <button
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className="card flex items-center gap-4 p-5 text-left cursor-pointer w-full"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                  {note.recipientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold">{note.recipientName}</div>
                  <div className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    Due {formatDate(expiry)}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatUsd(note.amount)}
                  </div>
                  <span className="pill" style={{ background: colors.bg, color: colors.color }}>
                    {note.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
