/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpendFlow from '../SpendFlow';
import type { Holding } from '@/lib/types';

const appleHolding: Holding = {
  symbol: 'AAPL',
  name: 'Apple',
  shares: 10,
  icon: 'A',
  gradient: 'linear-gradient(135deg, #555, #333)',
};

const mockPrices = {
  AAPL: { symbol: 'AAPL', price: 180, change: 2, changePercent: 1.1, lastUpdated: '' },
};

const defaultProps = {
  selectedHolding: appleHolding,
  prices: mockPrices,
  onBack: jest.fn(),
  onComplete: jest.fn(),
};

describe('SpendFlow', () => {
  it('displays selected stock name', () => {
    render(<SpendFlow {...defaultProps} />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('displays selected stock price', () => {
    render(<SpendFlow {...defaultProps} />);
    expect(screen.getByText('$180.00')).toBeInTheDocument();
  });

  it('shows correct max spend from selected holding', () => {
    // 10 shares * $180 = $1800
    render(<SpendFlow {...defaultProps} />);
    expect(screen.getByText(/\$1,800/)).toBeInTheDocument();
  });

  it('shows stock symbol in collateral line', () => {
    render(<SpendFlow {...defaultProps} />);
    // Collar for $50 at $180 = 0.278 shares AAPL
    expect(screen.getByText(/AAPL/)).toBeInTheDocument();
  });

  it('does not show hardcoded Tesla references', () => {
    const { container } = render(<SpendFlow {...defaultProps} />);
    // No literal "Tesla" text (only "Apple" from selected holding)
    const textContent = container.textContent || '';
    expect(textContent).not.toContain('Tesla');
  });
});
