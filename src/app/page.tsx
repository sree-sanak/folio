'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Portfolio from '@/components/Portfolio';
import SpendFlow from '@/components/SpendFlow';
import Confirmation from '@/components/Confirmation';
import CardResult from '@/components/CardResult';
import CardsList from '@/components/CardsList';
import NotesList from '@/components/NotesList';
import NoteDetail from '@/components/NoteDetail';
import { AuthGuard } from '@/components/auth/auth-guard';
import { usePlaidHoldings } from '@/lib/use-plaid-holdings';
import type { Holding } from '@/lib/types';

export type Screen = 'portfolio' | 'spend' | 'confirm' | 'card-result' | 'cards' | 'notes' | 'note-detail';

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
  recipientName?: string;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('portfolio');
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [lastSpend, setLastSpend] = useState<SpendResult | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  const { status: plaidStatus, holdings, openLink, isPlaidAvailable } = usePlaidHoldings();

  const navMap: Record<Screen, string> = {
    portfolio: 'portfolio',
    spend: 'spend',
    confirm: 'spend',
    'card-result': 'spend',
    cards: 'cards',
    notes: 'notes',
    'note-detail': 'notes',
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

  const handleSpendFromHolding = (holding: Holding) => {
    setSelectedHolding(holding);
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
              prices={prices}
              plaidStatus={plaidStatus}
              isPlaidAvailable={isPlaidAvailable}
              onConnectBrokerage={openLink}
              onSpendFromHolding={handleSpendFromHolding}
              onSpend={() => {
                // Default: spend from first holding with shares
                const first = holdings.find((h) => h.shares > 0);
                if (first) handleSpendFromHolding(first);
                else setScreen('spend');
              }}
              onViewNotes={() => setScreen('notes')}
            />
          )}
          {screen === 'spend' && (
            <SpendFlow
              selectedHolding={selectedHolding || holdings.find((h) => h.shares > 0) || holdings[0]}
              prices={prices}
              onBack={() => setScreen('portfolio')}
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
              if (first) handleSpendFromHolding(first);
              else setScreen('spend');
            }} />
          )}
          {screen === 'notes' && (
            <NotesList onSelectNote={handleViewNote} />
          )}
          {screen === 'note-detail' && selectedNoteId && (
            <NoteDetail noteId={selectedNoteId} onBack={() => setScreen('notes')} />
          )}
        </div>
      </main>

      <BottomNav activeTab={navMap[screen]} onNavigate={(s) => setScreen(s as Screen)} />
    </div>
    </AuthGuard>
  );
}
