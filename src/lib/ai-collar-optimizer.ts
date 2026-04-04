// AI Collar Optimizer — structures zero-cost equity collars using real market data
//
// Pulls options chain implied volatility + historical volatility from Yahoo Finance,
// then uses an LLM to optimize collar parameters. Falls back to a math-only approach
// when no API key is configured.
//
// This is the core of the AI & Agentic Payments bounty — an AI agent that
// autonomously structures financial products on Hedera.

import { z } from 'zod';
import { getStockPrice } from './price';
import { getVolatilityData } from './volatility';

// ── Types ────────────────────────────────────────────────────────────────

export const CollarRecommendationSchema = z.object({
  floorPct: z.number().min(0.01).max(0.30).describe('Downside protection percentage (e.g. 0.08 = 8%)'),
  capPct: z.number().min(0.05).max(0.50).describe('Upside cap percentage (e.g. 0.20 = 20%)'),
  durationMonths: z.number().min(1).max(6).describe('Recommended collar duration in months'),
  confidence: z.number().min(0).max(1).describe('Agent confidence in this recommendation (0-1)'),
  reasoning: z.string().describe('Brief explanation of why these parameters were chosen'),
  riskLevel: z.enum(['conservative', 'moderate', 'aggressive']).describe('Assessed risk level of this collar'),
  warnings: z.array(z.string()).describe('Any warnings or caveats for the user'),
});

export type CollarRecommendation = z.infer<typeof CollarRecommendationSchema>;

export interface OptimizationContext {
  symbol: string;
  stockPrice: number;
  changePercent: number;
  spendAmount: number;
  portfolioShares?: number;
  userRiskPreference?: 'conservative' | 'moderate' | 'aggressive';
  previousCollars?: number;
}

// ── Optimizer ────────────────────────────────────────────────────────────

export async function optimizeCollar(
  context: OptimizationContext
): Promise<CollarRecommendation> {
  // Always fetch real volatility data
  const volData = await getVolatilityData(context.symbol);

  // Try AI-enhanced optimization if API key is available
  if (process.env.MINIMAX_API_KEY) {
    try {
      return await aiOptimize(context, volData);
    } catch (error) {
      console.error('AI optimizer failed, using quantitative fallback:', error);
    }
  }

  // Quantitative fallback using real market data (no LLM needed)
  return quantitativeOptimize(context, volData);
}

// AI-enhanced: feeds real vol data to the LLM for nuanced optimization
async function aiOptimize(
  context: OptimizationContext,
  volData: Awaited<ReturnType<typeof getVolatilityData>>
): Promise<CollarRecommendation> {
  const { generateText, Output } = await import('ai');
  const { createOpenAICompatible } = await import('@ai-sdk/openai-compatible');

  const minimax = createOpenAICompatible({
    name: 'minimax',
    baseURL: 'https://api.minimax.io/v1',
    apiKey: process.env.MINIMAX_API_KEY,
  });

  const { symbol, stockPrice, changePercent, spendAmount, portfolioShares, userRiskPreference, previousCollars } = context;
  const spendToPrice = spendAmount / stockPrice;
  const portfolioUtilization = portfolioShares ? spendToPrice / portfolioShares : undefined;

  const iv = volData.impliedVolatility;
  const hv = volData.historicalVolatility;
  const chain = volData.optionsChain;

  const prompt = `You are a quantitative finance AI agent that structures zero-cost equity collars on Hedera Token Service.

MARKET DATA (real, from Yahoo Finance):
- Stock: ${symbol} at $${stockPrice.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}% today)
- ATM Implied Volatility: ${iv.avgAtm != null ? `${(iv.avgAtm * 100).toFixed(1)}%` : 'unavailable'}
  - Call IV: ${iv.atmCall != null ? `${(iv.atmCall * 100).toFixed(1)}%` : 'n/a'}
  - Put IV: ${iv.atmPut != null ? `${(iv.atmPut * 100).toFixed(1)}%` : 'n/a'}
  - IV Skew (put-call): ${iv.skew != null ? `${(iv.skew * 100).toFixed(1)}pp` : 'n/a'}
- Historical Volatility: 30d=${hv.vol30d != null ? `${(hv.vol30d * 100).toFixed(1)}%` : 'n/a'}, 60d=${hv.vol60d != null ? `${(hv.vol60d * 100).toFixed(1)}%` : 'n/a'}
- Options Chain: nearest expiry=${chain.nearestExpiry ?? 'n/a'}, put/call ratio=${chain.putCallRatio != null ? chain.putCallRatio.toFixed(2) : 'n/a'}
  - ATM strike: $${chain.atmStrike?.toFixed(2) ?? 'n/a'}
  - Call bid/ask: $${chain.atmCallBid?.toFixed(2) ?? 'n/a'} / $${chain.atmCallAsk?.toFixed(2) ?? 'n/a'}
  - Put bid/ask: $${chain.atmPutBid?.toFixed(2) ?? 'n/a'} / $${chain.atmPutAsk?.toFixed(2) ?? 'n/a'}

USER REQUEST:
- Spend amount: $${spendAmount.toFixed(2)}
- Shares to collar: ${spendToPrice.toFixed(4)}
${portfolioShares !== undefined ? `- Total holdings: ${portfolioShares} shares (${((portfolioUtilization ?? 0) * 100).toFixed(1)}% utilization)` : '- Portfolio size: unknown'}
${userRiskPreference ? `- Risk preference: ${userRiskPreference}` : '- Risk preference: not specified'}
${previousCollars !== undefined ? `- Active collars: ${previousCollars}` : ''}

COLLAR MECHANICS:
- Floor = price * (1 - floorPct). Platform absorbs below floor.
- Cap = price * (1 + capPct). User forfeits above cap.
- Zero-cost: no fee. The cap IS the cost.
- A proper collar floor should be ~1 standard deviation of expected move for the duration.
- Use IV (not just HV) — the market's forward-looking estimate of risk is better than backward-looking.
- If IV > HV, market expects more vol ahead — widen the floor.
- If put/call ratio > 1.0, bearish sentiment — be more conservative.
- If IV skew is high (puts expensive), downside fear is elevated — widen the floor.

QUANTITATIVE APPROACH:
1. Use ATM IV to estimate expected move: expected_move = price * IV * sqrt(duration/252)
2. Floor should cover ~1.0-1.5x the expected move (depending on risk preference)
3. Cap should be set so the collar is zero-cost: typically 1.2-2.0x the floor width
4. Adjust for portfolio concentration, market sentiment, and user preference

Return optimized parameters with your reasoning.`;

  const { output } = await generateText({
    model: minimax('MiniMax-M1'),
    output: Output.object({ schema: CollarRecommendationSchema }),
    prompt,
  });

  if (!output) {
    return quantitativeOptimize(context, volData);
  }

  return {
    ...output,
    floorPct: Math.max(0.03, Math.min(0.25, output.floorPct)),
    capPct: Math.max(0.05, Math.min(0.40, output.capPct)),
    durationMonths: Math.max(1, Math.min(6, output.durationMonths)),
  };
}

// ── Quantitative fallback (no LLM, just math) ───────────────────────────

function quantitativeOptimize(
  context: OptimizationContext,
  volData: Awaited<ReturnType<typeof getVolatilityData>>
): CollarRecommendation {
  const { changePercent, spendAmount, portfolioShares, userRiskPreference, previousCollars } = context;

  // Use the best volatility estimate available
  const iv = volData.impliedVolatility.avgAtm;
  const hv30 = volData.historicalVolatility.vol30d;
  const hv60 = volData.historicalVolatility.vol60d;
  const annualizedVol = iv ?? hv30 ?? hv60 ?? 0.35; // default 35% if nothing available

  // Expected 1-month move: vol * sqrt(21/252)
  const monthlyVol = annualizedVol * Math.sqrt(21 / 252);

  // Floor: cover ~1.2x expected monthly move (1 standard deviation buffer)
  let floorMultiple = 1.2;
  if (userRiskPreference === 'conservative') floorMultiple = 1.5;
  if (userRiskPreference === 'aggressive') floorMultiple = 1.0;

  // Adjust for market conditions
  if (changePercent < -3) floorMultiple += 0.3;  // bad day — widen
  if (volData.optionsChain.putCallRatio && volData.optionsChain.putCallRatio > 1.2) {
    floorMultiple += 0.2; // bearish sentiment
  }
  if (volData.impliedVolatility.skew && volData.impliedVolatility.skew > 0.05) {
    floorMultiple += 0.1; // elevated put skew
  }

  // Portfolio concentration adjustment
  if (portfolioShares) {
    const utilization = spendAmount / (portfolioShares * (volData.currentPrice || 225));
    if (utilization > 0.3) floorMultiple += 0.2;
    if (utilization > 0.5) floorMultiple += 0.3;
  }

  // Multiple active collars = more conservative
  if (previousCollars && previousCollars > 2) floorMultiple += 0.2;

  let floorPct = monthlyVol * floorMultiple;
  // Cap is typically 1.5-2x the floor (zero-cost collar ratio)
  let capPct = floorPct * 1.8;

  // Clamp to reasonable bounds
  floorPct = Math.max(0.03, Math.min(0.25, floorPct));
  capPct = Math.max(0.05, Math.min(0.40, capPct));

  // Duration: default 1 month
  let durationMonths = 1;
  if (spendAmount > 2000) durationMonths = 2;
  if (spendAmount > 5000) durationMonths = 3;

  // Determine risk level
  let riskLevel: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
  if (floorPct > 0.12) riskLevel = 'conservative';
  if (floorPct < 0.06) riskLevel = 'aggressive';

  const dataSource = iv != null ? 'implied volatility' : hv30 != null ? '30-day historical volatility' : 'default volatility estimate';
  const warnings: string[] = [];
  if (iv == null && hv30 == null) warnings.push('No real volatility data available — using 35% default');
  if (volData.optionsChain.putCallRatio && volData.optionsChain.putCallRatio > 1.5) {
    warnings.push('Elevated put/call ratio signals bearish sentiment');
  }

  return {
    floorPct,
    capPct,
    durationMonths,
    confidence: iv != null ? 0.85 : hv30 != null ? 0.70 : 0.50,
    reasoning: `Quantitative model using ${dataSource}. Annual vol: ${(annualizedVol * 100).toFixed(1)}%, monthly expected move: ${(monthlyVol * 100).toFixed(1)}%. Floor set at ${floorMultiple.toFixed(1)}x expected move. Cap at 1.8x floor for zero-cost structure.`,
    riskLevel,
    warnings,
  };
}

// ── Enhanced collar calculation using AI recommendations ─────────────

export interface OptimizedCollarResult {
  shares: number;
  sharesHts: number;
  floor: number;
  cap: number;
  collateralValue: number;
  advance: number;
  advanceHts: number;
  fee: number;
  expiryDate: Date;
  durationMonths: number;
  recommendation: CollarRecommendation;
  floorPct: number;
  capPct: number;
}

function getThirdFriday(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const day = first.getDay();
  const firstFriday = day <= 5 ? 5 - day + 1 : 5 + 7 - day + 1;
  return new Date(year, month, firstFriday + 14);
}

function getExpiryDate(months: number): Date {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + months, 1);
  return getThirdFriday(target.getFullYear(), target.getMonth());
}

const HTS_DECIMALS = 6;

export function calculateOptimizedCollar(
  spendAmount: number,
  stockPrice: number,
  recommendation: CollarRecommendation
): OptimizedCollarResult {
  const shares = spendAmount / stockPrice;
  const sharesHts = Math.floor(shares * 10 ** HTS_DECIMALS);
  const floor = stockPrice * (1 - recommendation.floorPct);
  const cap = stockPrice * (1 + recommendation.capPct);
  const collateralValue = shares * stockPrice;
  const advance = spendAmount;
  const advanceHts = Math.floor(advance * 10 ** HTS_DECIMALS);
  const expiryDate = getExpiryDate(recommendation.durationMonths);

  return {
    shares,
    sharesHts,
    floor,
    cap,
    collateralValue,
    advance,
    advanceHts,
    fee: 0,
    expiryDate,
    durationMonths: recommendation.durationMonths,
    recommendation,
    floorPct: recommendation.floorPct,
    capPct: recommendation.capPct,
  };
}

// ── Full optimization flow (fetch price + optimize + calculate) ──────

export async function getOptimizedCollar(
  spendAmount: number,
  symbol: string = 'TSLA',
  portfolioShares?: number,
  userRiskPreference?: 'conservative' | 'moderate' | 'aggressive',
  previousCollars?: number
): Promise<OptimizedCollarResult> {
  const priceData = await getStockPrice(symbol);

  const recommendation = await optimizeCollar({
    symbol,
    stockPrice: priceData.price,
    changePercent: priceData.changePercent,
    spendAmount,
    portfolioShares,
    userRiskPreference,
    previousCollars,
  });

  return calculateOptimizedCollar(spendAmount, priceData.price, recommendation);
}
