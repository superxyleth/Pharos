import type { Trade } from './types.js';

export function totalReturnPct(initialCapital: number, finalEquity: number): number {
  return initialCapital > 0 ? ((finalEquity - initialCapital) / initialCapital) * 100 : 0;
}

export function maxDrawdownPct(equityValues: number[]): { maxDrawdownPct: number; curve: number[] } {
  let peak = equityValues[0] ?? 0;
  let maxDrawdown = 0;
  const curve = equityValues.map((equity) => {
    peak = Math.max(peak, equity);
    const drawdown = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
    return drawdown;
  });
  return { maxDrawdownPct: maxDrawdown, curve };
}

export function sharpeRatio(equityValues: number[]): number {
  if (equityValues.length < 3) return 0;
  const returns: number[] = [];
  for (let i = 1; i < equityValues.length; i += 1) {
    const prev = equityValues[i - 1];
    const current = equityValues[i];
    if (prev > 0) returns.push((current - prev) / prev);
  }
  if (returns.length < 2) return 0;
  const avg = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  return std > 0 ? (avg / std) * Math.sqrt(365) : 0;
}

export function winRatePct(trades: Trade[]): number {
  const sells = trades.filter((trade) => trade.action === 'SELL');
  if (sells.length === 0) return 0;
  const wins = sells.filter((trade) => trade.amountUsd > 0);
  return (wins.length / sells.length) * 100;
}

export function roundMetric(value: number, digits = 4): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}
