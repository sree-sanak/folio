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
        {formatUsd(result.amount)} sent to {result.recipientName}
      </div>

      {/* Loan Summary Card */}
      <div className="card p-6 text-left mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-tertiary)' }}>
          Loan Summary
        </div>

        <div className="flex flex-col gap-4">
          {[
            { label: 'Amount', value: formatUsd(result.amount) },
            { label: 'Collateral', value: `${formatShares(result.shares)} ${result.symbol}` },
            { label: 'Interest', value: '0%', accent: true },
            { label: 'Repay by', value: formatDate(expiryDate) },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-[14px]">
              <span style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
              <span className="font-semibold" style={{
                color: row.accent ? 'var(--accent)' : 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div className="text-[12px] mt-5 pt-5 leading-relaxed" style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)' }}>
          Repay {formatUsd(result.amount)} before {formatDate(expiryDate)} to unlock your shares.
          If not repaid, collateral shares will be sold to settle.
        </div>
      </div>

      {/* Transaction ID */}
      <div className="text-[11px] mb-8 font-mono" style={{ color: 'var(--text-tertiary)' }}>
        TX: {result.txId}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button onClick={onViewDetails} className="btn-primary w-full py-4 text-[15px]">
          View Spend Note
        </button>
        <button onClick={onDone} className="btn-secondary w-full py-4 text-[15px]">
          Back to Portfolio
        </button>
      </div>
    </div>
  );
}
