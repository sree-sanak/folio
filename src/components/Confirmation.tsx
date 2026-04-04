'use client';

import type { SpendResult } from '@/app/page';
import { formatUsd, formatShares, formatDate } from '@/lib/collar';

interface ConfirmationProps {
  result: SpendResult;
  onViewDetails: () => void;
  onDone: () => void;
}

export default function Confirmation({ result, onViewDetails, onDone }: ConfirmationProps) {
  const expiryDate = new Date(result.expiryDate);

  return (
    <div className="text-center pt-10">
      {/* Success Icon */}
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: 'var(--accent-muted)', boxShadow: '0 0 40px rgba(16,185,129,0.15)' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <div className="text-[26px] font-bold mb-2">Sent!</div>
      <div className="text-[15px] mb-10" style={{ color: 'var(--text-secondary)' }}>
        {formatUsd(result.amount)} sent to {result.recipientAccountId || 'your portfolio'}
      </div>

      {/* Advance Summary Card */}
      <div className="card p-6 text-left mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-tertiary)' }}>
          Advance Summary
        </div>

        <div className="flex flex-col gap-4">
          {[
            { label: 'Amount', value: formatUsd(result.amount) },
            ...(result.recipientAccountId ? [{ label: 'Recipient', value: result.recipientAccountId, mono: true }] : []),
            { label: 'Collateral', value: `${formatShares(result.shares)} ${result.symbol}` },
            { label: 'Interest', value: '0%', accent: true },
            { label: 'Repay by', value: formatDate(expiryDate) },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-[14px]">
              <span style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
              <span className={`font-semibold ${('mono' in row && row.mono) ? 'font-mono text-[12px]' : ''}`} style={{
                color: ('accent' in row && row.accent) ? 'var(--accent)' : 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div className="text-[12px] mt-5 pt-5 leading-relaxed" style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)' }}>
          Settle {formatUsd(result.amount)} before {formatDate(expiryDate)} to unlock your shares.
          If not settled, collateral shares will be sold to cover the balance.
        </div>
      </div>

      {/* AI Insights */}
      {result.ai && (
        <div className="card p-5 text-left mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                <path d="M16 14a4 4 0 0 0-8 0v3a4 4 0 0 0 8 0v-3z" />
                <line x1="12" y1="8" x2="12" y2="14" />
              </svg>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              AI Collar Analysis
            </div>
            <div className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full" style={{
              background: result.ai.confidence > 0.7 ? 'var(--accent-muted)' : 'var(--bg-elevated)',
              color: result.ai.confidence > 0.7 ? 'var(--accent)' : 'var(--text-tertiary)',
            }}>
              {Math.round(result.ai.confidence * 100)}% confidence
            </div>
          </div>
          <div className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
            {result.ai.reasoning}
          </div>
          {result.ai.warnings.length > 0 && (
            <div className="space-y-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              {result.ai.warnings.map((w, i) => (
                <div key={i} className="text-[12px] flex items-start gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  <span style={{ color: '#F59E0B' }}>!</span> {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction ID */}
      <div className="text-[11px] mb-8 font-mono" style={{ color: 'var(--text-tertiary)' }}>
        <a
          href={`https://hashscan.io/testnet/transaction/${result.txId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Verify on Hedera Testnet
        </a>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button onClick={onViewDetails} className="btn-primary w-full py-4 text-[15px]">
          View Transaction
        </button>
        <button onClick={onDone} className="btn-secondary w-full py-4 text-[15px]">
          Back to Portfolio
        </button>
      </div>
    </div>
  );
}
