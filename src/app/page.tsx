'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Portfolio from '@/components/Portfolio';
import StockDetail from '@/components/StockDetail';
import SpendFlow, { type SpendMode } from '@/components/SpendFlow';
import Confirmation from '@/components/Confirmation';
import CardResult from '@/components/CardResult';
import CardsList from '@/components/CardsList';
import NotesList from '@/components/NotesList';
import NoteDetail from '@/components/NoteDetail';
import Settings from '@/components/Settings';
import { AuthGuard } from '@/components/auth/auth-guard';
import { usePlaidHoldings } from '@/lib/use-plaid-holdings';
import { useUserRegistration } from '@/lib/use-user-registration';
import { authFetch } from '@/lib/use-auth-fetch';
import type { Holding } from '@/lib/types';

export type Screen = 'portfolio' | 'stock-detail' | 'spend' | 'confirm' | 'card-result' | 'cards' | 'notes' | 'note-detail' | 'settings';

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface SpendResult {
  symbol: string;
  amount: number;
  shares: number;
  durationMonths: number;
  expiryDate: string;
  noteId: number;
  txId: string;
  // Virtual card fields (present when card is issued)
  card?: {
    pan: string;
    cvv: string;
    expMonth: string;
    expYear: string;
    lastFour: string;
    token: string;
  };
  // P2P fields (present when send flow is used)
  recipientName?: string; // Hedera account ID of recipient
  recipientAccountId?: string;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('portfolio');
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [lastSpend, setLastSpend] = useState<SpendResult | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [spendMode, setSpendMode] = useState<SpendMode>('send');

  const { status: plaidStatus, holdings, openLink, isPlaidAvailable, isDemo } = usePlaidHoldings();
  const { folioUser } = useUserRegistration(); // Auto-creates Hedera account on first login
  const [cryptoHoldings, setCryptoHoldings] = useState<Holding[]>([]);

  const navMap: Record<Screen, string> = {
    portfolio: 'portfolio',
    'stock-detail': 'portfolio',
    spend: 'spend',
    confirm: 'spend',
    'card-result': 'cards',
    cards: 'cards',
    notes: 'notes',
    'note-detail': 'notes',
    settings: 'settings',
  };

  const fetchPrices = useCallback(async () => {
    try {
      // Build symbols list from holdings
      const symbols = holdings
        .filter((h) => h.shares > 0)
        .map((h) => h.symbol);
      // Always include TSLA and AAPL for fallback display
      const allSymbols = [...new Set(['TSLA', 'AAPL', ...symbols])];
      const query = allSymbols.length > 0 ? `?symbols=${allSymbols.join(',')}` : '';

      const res = await fetch(`/api/price${query}`);
      const data = await res.json();
      setPrices(data);
    } catch {
      setPrices({
        TSLA: { symbol: 'TSLA', price: 225, change: 3.45, changePercent: 1.56, lastUpdated: new Date().toISOString() },
        AAPL: { symbol: 'AAPL', price: 178.5, change: -1.2, changePercent: -0.67, lastUpdated: new Date().toISOString() },
      });
    }
  }, [holdings]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Fetch user's on-chain token balances (USDC, stocks, etc.)
  useEffect(() => {
    if (!folioUser?.hederaAccountId) return;
    let cancelled = false;

    async function fetchCryptoBalances() {
      try {
        const res = await authFetch(`/api/users/balances?accountId=${folioUser!.hederaAccountId}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setCryptoHoldings(data.holdings || []);
        }
      } catch { /* ignore */ }
    }

    fetchCryptoBalances();
    const interval = setInterval(fetchCryptoBalances, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [folioUser]);

  const handleViewHolding = (holding: Holding) => {
    setSelectedHolding(holding);
    setScreen('stock-detail');
  };

  const handleSpendFromHolding = (holding: Holding, mode: SpendMode = 'send') => {
    setSelectedHolding(holding);
    setSpendMode(mode);
    setScreen('spend');
  };

  const handleSpendComplete = (result: SpendResult) => {
    setLastSpend(result);
    setScreen(result.card ? 'card-result' : 'confirm');
  };

  const handleViewNote = (noteId: number) => {
    setSelectedNoteId(noteId);
    setScreen('note-detail');
  };

  return (
    <AuthGuard>
    <div className="flex min-h-screen">
      <Sidebar activeTab={navMap[screen]} onNavigate={(s) => setScreen(s as Screen)} />

      <main className="flex-1 flex justify-center pb-20 md:pb-0 main-gradient">
        <div className="w-full max-w-[420px] px-6 py-10">
          {screen === 'portfolio' && (
            <Portfolio
              holdings={holdings}
              cryptoHoldings={cryptoHoldings}
              prices={prices}
              plaidStatus={plaidStatus}
              isPlaidAvailable={isPlaidAvailable}
              isDemo={isDemo}
              onConnectBrokerage={openLink}
              onSpendFromHolding={handleViewHolding}
              onSpend={() => {
                const first = holdings.find((h) => h.shares > 0);
                if (first) handleSpendFromHolding(first);
                else setScreen('spend');
              }}
              onViewNotes={() => setScreen('notes')}
            />
          )}
          {screen === 'stock-detail' && selectedHolding && (
            <StockDetail
              holding={selectedHolding}
              price={prices[selectedHolding.symbol]}
              totalPortfolioValue={
                holdings.reduce((sum, h) => sum + h.shares * (prices[h.symbol]?.price ?? 0), 0)
                + cryptoHoldings.reduce((sum, h) => sum + (h.symbol === 'USDC' ? h.shares : 0), 0)
              }
              onBack={() => setScreen('portfolio')}
              onSpend={() => handleSpendFromHolding(selectedHolding)}
            />
          )}
          {screen === 'spend' && (
            <SpendFlow
              mode={spendMode}
              selectedHolding={selectedHolding || holdings.find((h) => h.shares > 0) || holdings[0]}
              holdings={holdings}
              prices={prices}
              currentUserAccountId={folioUser?.hederaAccountId}
              onBack={() => spendMode === 'card' ? setScreen('cards') : setScreen('portfolio')}
              onComplete={handleSpendComplete}
            />
          )}
          {screen === 'confirm' && lastSpend && (
            <Confirmation
              result={lastSpend}
              onViewDetails={() => {
                setSelectedNoteId(lastSpend.noteId);
                setScreen('note-detail');
              }}
              onDone={() => setScreen('portfolio')}
            />
          )}
          {screen === 'card-result' && lastSpend && (
            <CardResult
              result={lastSpend}
              onViewNote={() => {
                setSelectedNoteId(lastSpend.noteId);
                setScreen('note-detail');
              }}
              onViewCards={() => setScreen('cards')}
              onDone={() => setScreen('portfolio')}
            />
          )}
          {screen === 'cards' && (
            <CardsList onGetCard={() => {
              const first = holdings.find((h) => h.shares > 0);
              if (first) handleSpendFromHolding(first, 'card');
              else { setSpendMode('card'); setScreen('spend'); }
            }} />
          )}
          {screen === 'notes' && (
            <NotesList onSelectNote={handleViewNote} />
          )}
          {screen === 'note-detail' && selectedNoteId && (
            <NoteDetail noteId={selectedNoteId} onBack={() => setScreen('notes')} />
          )}
          {screen === 'settings' && (
            <Settings
              plaidStatus={plaidStatus}
              isPlaidAvailable={isPlaidAvailable}
              isDemo={isDemo}
              onConnectBrokerage={openLink}
            />
          )}
        </div>
      </main>

      <BottomNav activeTab={navMap[screen]} onNavigate={(s) => setScreen(s as Screen)} />
    </div>
    </AuthGuard>
  );
}
