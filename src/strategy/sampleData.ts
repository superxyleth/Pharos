import type { Candle } from './types.js';

const INTERVAL_MS: Record<string, number> = {
  '5m': 5 * 60_000,
  '1H': 60 * 60_000,
  '1D': 24 * 60 * 60_000,
  '1W': 7 * 24 * 60 * 60_000,
};

export function intervalForPeriod(period: string): { bar: string; limit: number } {
  switch (period) {
    case '1D':
      return { bar: '5m', limit: 288 };
    case '1W':
      return { bar: '1H', limit: 168 };
    case '1M':
      return { bar: '1H', limit: 720 };
    case '6M':
      return { bar: '1H', limit: 4320 };
    case '1Y':
      return { bar: '1H', limit: 8760 };
    case '2Y':
      return { bar: '1H', limit: 17520 };
    case '3Y':
      return { bar: '1H', limit: 26280 };
    default:
      return { bar: '1H', limit: 720 };
  }
}

export function createSampleCandles(params: {
  limit: number;
  bar?: string;
  startPrice?: number;
  startTime?: number;
}): Candle[] {
  const limit = Math.max(20, Math.min(params.limit, 30_000));
  const stepMs = INTERVAL_MS[params.bar ?? '1H'] ?? INTERVAL_MS['1H'];
  const startTime = params.startTime ?? Date.UTC(2025, 0, 1);
  let price = params.startPrice ?? 100;
  const candles: Candle[] = [];

  for (let i = 0; i < limit; i += 1) {
    const trend = Math.sin(i / 37) * 0.012 + Math.cos(i / 111) * 0.006;
    const cycle = Math.sin(i / 9) * 0.004;
    const drift = 0.00008;
    const change = drift + trend + cycle;
    const open = price;
    const close = Math.max(0.01, open * (1 + change));
    const high = Math.max(open, close) * (1 + 0.002 + Math.abs(Math.sin(i)) * 0.004);
    const low = Math.min(open, close) * (1 - 0.002 - Math.abs(Math.cos(i)) * 0.004);
    const volume = 10_000 + Math.abs(Math.sin(i / 13)) * 40_000;
    candles.push({
      time: startTime + i * stepMs,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: round(volume),
    });
    price = close;
  }

  return candles;
}

function round(value: number): number {
  return Number(value.toFixed(8));
}
