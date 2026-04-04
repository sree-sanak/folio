/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Portfolio from '../Portfolio';
import type { Holding } from '@/lib/types';

const mockHoldings: Holding[] = [
  { symbol: 'AAPL', name: 'Apple', shares: 10, icon: 'A', gradient: 'linear-gradient(135deg, #555, #333)' },
  { symbol: 'NFLX', name: 'Netflix', shares: 5, icon: 'N', gradient: 'linear-gradient(135deg, #E50914, #B20710)' },
];

const mockPrices = {
  AAPL: { symbol: 'AAPL', price: 180, change: 2, changePercent: 1.1, lastUpdated: '', source: 'live' as const },
  NFLX: { symbol: 'NFLX', price: 600, change: -5, changePercent: -0.8, lastUpdated: '', source: 'live' as const },
};

const defaultProps = {
  holdings: mockHoldings,
  cryptoHoldings: [],
  prices: mockPrices,
  plaidStatus: 'connected' as const,
  isPlaidAvailable: true,
  isDemo: false,
  onConnectBrokerage: jest.fn(),
  onSpendFromHolding: jest.fn(),
  onSpend: jest.fn(),
  onViewNotes: jest.fn(),
};

describe('Portfolio', () => {
  it('renders holdings list when connected', () => {
    render(<Portfolio {...defaultProps} />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('renders "Connect Brokerage" when idle with plaid available and demo holdings', () => {
    render(
      <Portfolio
        {...defaultProps}
        plaidStatus="idle"
        isPlaidAvailable={true}
        isDemo={true}
      />
    );
    expect(screen.getByText('Connect Brokerage')).toBeInTheDocument();
  });

  it('renders demo holdings when plaid not available', () => {
    render(
      <Portfolio
        {...defaultProps}
        plaidStatus="idle"
        isPlaidAvailable={false}
      />
    );
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('calls onConnectBrokerage when connect button clicked', () => {
    const onConnect = jest.fn();
    render(
      <Portfolio
        {...defaultProps}
        plaidStatus="idle"
        isPlaidAvailable={true}
        isDemo={true}
        onConnectBrokerage={onConnect}
      />
    );
    fireEvent.click(screen.getByText('Connect Brokerage'));
    expect(onConnect).toHaveBeenCalled();
  });

  it('calls onSpendFromHolding when a holding with shares is clicked', () => {
    const onSpendFrom = jest.fn();
    render(<Portfolio {...defaultProps} onSpendFromHolding={onSpendFrom} />);
    fireEvent.click(screen.getByText('Apple'));
    expect(onSpendFrom).toHaveBeenCalledWith(mockHoldings[0]);
  });

  it('calculates total portfolio value', () => {
    // 10 * 180 + 5 * 600 = 4800
    // Appears in both header and "Available to Spend" card
    render(<Portfolio {...defaultProps} />);
    expect(screen.getAllByText('$4,800.00')).toHaveLength(2);
  });
});
