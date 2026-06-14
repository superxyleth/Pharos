import type { StrategyQuality } from './types.js';
import { roundMetric } from './metrics.js';

export function analyzeStrategyQuality(code: string): StrategyQuality {
  const normalized = code.toLowerCase();
  const hasTrendFilter = /\bema20\b|\bema50\b|moving\s*average|trend/.test(normalized);
  const hasVolatilityFilter = /\batr14\b|\batr\b|volatility|risk\s*mode/.test(normalized);
  const hasExposureLimit = /exposure|max_exposure|maxexposure|position\s*limit/.test(normalized);
  const hasStopLossOrRiskOff = /stop[_\s-]?loss|risk[_\s-]?off|drawdown|de[-\s]?risk|reduce\s+risk/.test(normalized);
  const usesPrecomputedIndicators = /ctx\s*\.\s*indicators|indicators\s*=/.test(code);
  const notes = [
    hasTrendFilter ? 'Trend filter detected.' : 'No obvious trend filter detected.',
    hasVolatilityFilter ? 'Volatility or ATR filter detected.' : 'No obvious volatility filter detected.',
    hasExposureLimit ? 'Exposure limit detected.' : 'No obvious exposure limit detected.',
    hasStopLossOrRiskOff ? 'Stop-loss or risk-off logic detected.' : 'No obvious stop-loss or risk-off logic detected.',
    usesPrecomputedIndicators ? 'Uses precomputed ctx.indicators.' : 'Does not visibly use precomputed ctx.indicators.',
  ];

  return {
    hasTrendFilter,
    hasVolatilityFilter,
    hasExposureLimit,
    hasStopLossOrRiskOff,
    usesPrecomputedIndicators,
    notes,
  };
}

export function scoreRisk(params: {
  maxDrawdownPct: number;
  exposurePct: number;
  strategyQuality: StrategyQuality;
}): number {
  const drawdownPenalty = Math.min(45, Math.abs(Math.min(params.maxDrawdownPct, 0)) * 0.8);
  const exposurePenalty = Math.min(25, Math.max(params.exposurePct - 50, 0) * 0.5);
  const qualityBonus = [
    params.strategyQuality.hasExposureLimit,
    params.strategyQuality.hasStopLossOrRiskOff,
    params.strategyQuality.hasVolatilityFilter,
  ].filter(Boolean).length * 7;
  return clampScore(75 - drawdownPenalty - exposurePenalty + qualityBonus);
}

export function scoreStability(params: {
  sharpeRatio: number;
  maxDrawdownPct: number;
  totalTrades: number;
}): number {
  const sharpeComponent = Math.max(0, Math.min(30, (params.sharpeRatio + 1) * 12));
  const drawdownComponent = Math.max(0, 35 - Math.abs(Math.min(params.maxDrawdownPct, 0)) * 0.7);
  const activityComponent = params.totalTrades > 0 ? 20 : 5;
  return clampScore(sharpeComponent + drawdownComponent + activityComponent + 10);
}

export function scoreCapitalEfficiency(params: {
  totalReturnPct: number;
  exposurePct: number;
  totalTrades: number;
}): number {
  const returnComponent = Math.max(0, Math.min(45, 25 + params.totalReturnPct * 0.7));
  const exposureComponent = Math.max(0, 30 - Math.max(params.exposurePct - 60, 0) * 0.5);
  const activityComponent = params.totalTrades > 0 ? 15 : 5;
  return clampScore(returnComponent + exposureComponent + activityComponent);
}

function clampScore(value: number): number {
  return roundMetric(Math.max(0, Math.min(100, value)), 2);
}
