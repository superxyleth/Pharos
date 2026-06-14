import type { Candle } from './types.js';

const INTERVAL_MS: Record<string, number> = {
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1H': 60 * 60_000,
  '4H': 4 * 60 * 60_000,
  '1D': 24 * 60 * 60_000,
  '1W': 7 * 24 * 60 * 60_000,
};

export interface PeriodInterval {
  bar: string;
  limit: number;
  coverage: string;
  stepMs: number;
}

export function intervalForPeriod(period: string): PeriodInterval {
  switch (period) {
    case '1D':
      return withStep({ bar: '5m', limit: 288, coverage: 'full-period' });
    case '1W':
      return withStep({ bar: '15m', limit: 672, coverage: 'full-period' });
    case '1M':
      return withStep({ bar: '1H', limit: 720, coverage: 'full-period' });
    case '6M':
      return withStep({ bar: '4H', limit: 1080, coverage: 'full-period' });
    case '1Y':
      return withStep({ bar: '1D', limit: 365, coverage: 'full-period' });
    case '2Y':
      return withStep({ bar: '1D', limit: 730, coverage: 'full-period' });
    case '3Y':
      return withStep({ bar: '1D', limit: 1095, coverage: 'full-period' });
    default:
      return withStep({ bar: '1H', limit: 720, coverage: 'full-period' });
  }
}

export function intervalMsForBar(bar: string): number {
  return INTERVAL_MS[bar] ?? INTERVAL_MS['1H'];
}

export function createSampleCandles(params: {
  limit: number;
  bar?: string;
  startPrice?: number;
  startTime?: number;
}): Candle[] {
  const limit = Math.max(20, Math.min(params.limit, 30_000));
  const stepMs = intervalMsForBar(params.bar ?? '1H');
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

function withStep(interval: Omit<PeriodInterval, 'stepMs'>): PeriodInterval {
  return {
    ...interval,
    stepMs: intervalMsForBar(interval.bar),
  };
}
