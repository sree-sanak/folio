// Stock price fetcher — Yahoo Finance with hardcoded fallback

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  source: 'live' | 'cached' | 'fallback';
}

// Hardcoded fallback prices — stale, only used when Yahoo is unreachable
const FALLBACK_PRICES: Record<string, PriceData> = {
  TSLA: {
    symbol: 'TSLA',
    price: 225.0,
    change: 0,
    changePercent: 0,
    lastUpdated: '2025-01-01T00:00:00Z',
    source: 'fallback',
  },
  AAPL: {
    symbol: 'AAPL',
    price: 178.5,
    change: 0,
    changePercent: 0,
    lastUpdated: '2025-01-01T00:00:00Z',
    source: 'fallback',
  },
};

// Cache to avoid hammering the API
let priceCache: Record<string, PriceData> = {};
let lastFetch = 0;
const CACHE_TTL = 30_000; // 30 seconds

export async function getStockPrice(symbol: string): Promise<PriceData> {
  const now = Date.now();

  // Return cached if fresh
  if (priceCache[symbol] && now - lastFetch < CACHE_TTL) {
    return { ...priceCache[symbol], source: 'cached' };
  }

  try {
    // Dynamic import to avoid issues in browser bundles
    const yahooFinance = await import('yahoo-finance2');
    const YF = yahooFinance.default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yf = new (YF as any)({ suppressNotices: ['yahooSurvey'] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yf.quote(symbol);

    const data: PriceData = {
      symbol,
      price: quote.regularMarketPrice ?? FALLBACK_PRICES[symbol]?.price ?? 0,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      lastUpdated: new Date().toISOString(),
      source: 'live',
    };

    priceCache[symbol] = data;
    lastFetch = now;
    return data;
  } catch (error) {
    console.error(`[price] Yahoo Finance failed for ${symbol}:`, error instanceof Error ? error.message : error);
    // Fallback to cached (stale) or hardcoded
    if (priceCache[symbol]) return { ...priceCache[symbol], source: 'cached' };
    console.warn(`[price] Using hardcoded fallback for ${symbol} — prices are NOT live`);
    return FALLBACK_PRICES[symbol] ?? { symbol, price: 0, change: 0, changePercent: 0, lastUpdated: '2025-01-01T00:00:00Z', source: 'fallback' };
  }
}

export async function getAllPrices(
  symbols: string[] = ['TSLA', 'AAPL']
): Promise<Record<string, PriceData>> {
  const results = await Promise.allSettled(
    symbols.map((s) => getStockPrice(s))
  );

  const prices: Record<string, PriceData> = {};
  symbols.forEach((symbol, i) => {
    const result = results[i];
    if (result.status === 'fulfilled') {
      prices[symbol] = result.value;
    } else if (FALLBACK_PRICES[symbol]) {
      prices[symbol] = FALLBACK_PRICES[symbol];
    }
    // If no fallback exists, symbol is simply omitted
  });

  return prices;
}
