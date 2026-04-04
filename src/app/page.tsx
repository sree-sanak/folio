'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Portfolio from '@/components/Portfolio';
import SpendFlow from '@/components/SpendFlow';
import Confirmation from '@/components/Confirmation';
import NotesList from '@/components/NotesList';
import NoteDetail from '@/components/NoteDetail';

export type Screen = 'portfolio' | 'spend' | 'confirm' | 'notes' | 'note-detail';

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface SpendResult {
  amount: number;
  shares: number;
  recipientName: string;
  durationMonths: number;
  expiryDate: string;
  noteId: number;
  txId: string;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('portfolio');
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [lastSpend, setLastSpend] = useState<SpendResult | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const navMap: Record<Screen, string> = {
    portfolio: 'portfolio',
    spend: 'spend',
    confirm: 'spend',
    notes: 'notes',
    'note-detail': 'notes',
  };

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/price');
      const data = await res.json();
      setPrices(data);
    } catch {
      setPrices({
        TSLA: { symbol: 'TSLA', price: 225, change: 3.45, changePercent: 1.56, lastUpdated: new Date().toISOString() },
        AAPL: { symbol: 'AAPL', price: 178.5, change: -1.2, changePercent: -0.67, lastUpdated: new Date().toISOString() },
      });
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const handleSpendComplete = (result: SpendResult) => {
    setLastSpend(result);
    setScreen('confirm');
  };

  const handleViewNote = (noteId: number) => {
    setSelectedNoteId(noteId);
    setScreen('note-detail');
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={navMap[screen]} onNavigate={(s) => setScreen(s as Screen)} />

      <main className="flex-1 flex justify-center pb-20 md:pb-0 main-gradient">
        <div className="w-full max-w-[480px] px-5 md:px-6 py-6 md:py-8">
          {screen === 'portfolio' && (
            <Portfolio prices={prices} onSpend={() => setScreen('spend')} onViewNotes={() => setScreen('notes')} />
          )}
          {screen === 'spend' && (
            <SpendFlow
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
  );
}
