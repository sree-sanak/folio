// Chainlink CollarOracle integration — reads collar params from on-chain oracle
// The CRE workflow writes these params; Folio's frontend reads them.

import { createPublicClient, http, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';

const COLLAR_ORACLE_ABI = parseAbi([
  'function getCollar(string symbol) external view returns (tuple(uint256 price, uint256 floor, uint256 cap, uint256 volatility, uint256 updatedAt))',
  'function getLatestPrice(string symbol) external view returns (int256, uint256)',
]);

export interface ChainlinkCollar {
  symbol: string;
  price: number;
  floor: number;
  cap: number;
  volatility: number; // basis points
  updatedAt: Date;
  source: 'chainlink';
}

const COLLAR_ORACLE_ADDRESS = process.env.COLLAR_ORACLE_ADDRESS;
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

function getClient() {
  return createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC),
  });
}

/**
 * Read collar parameters from the on-chain CollarOracle contract.
 * Returns null if the oracle is not configured or has no data.
 */
export async function getChainlinkCollar(symbol: string): Promise<ChainlinkCollar | null> {
  if (!COLLAR_ORACLE_ADDRESS) return null;

  try {
    const client = getClient();
    const result = await client.readContract({
      address: COLLAR_ORACLE_ADDRESS as `0x${string}`,
      abi: COLLAR_ORACLE_ABI,
      functionName: 'getCollar',
      args: [symbol],
    });

    const [price, floor, cap, volatility, updatedAt] = result as [bigint, bigint, bigint, bigint, bigint];

    // Skip if no data (price = 0 means never written)
    if (price === 0n) return null;

    return {
      symbol,
      price: Number(price) / 1e8,
      floor: Number(floor) / 1e8,
      cap: Number(cap) / 1e8,
      volatility: Number(volatility),
      updatedAt: new Date(Number(updatedAt) * 1000),
      source: 'chainlink',
    };
  } catch (error) {
    console.error(`[chainlink] Failed to read collar for ${symbol}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Read collars for multiple assets.
 */
export async function getChainlinkCollars(symbols: string[]): Promise<Record<string, ChainlinkCollar>> {
  const results: Record<string, ChainlinkCollar> = {};

  const collars = await Promise.allSettled(
    symbols.map((s) => getChainlinkCollar(s))
  );

  symbols.forEach((symbol, i) => {
    const result = collars[i];
    if (result.status === 'fulfilled' && result.value) {
      results[symbol] = result.value;
    }
  });

  return results;
}
