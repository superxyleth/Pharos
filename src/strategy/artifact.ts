import { createHash } from 'node:crypto';
import type { BacktestResult } from './types.js';
import { validateStrategyCode } from './validate.js';

export function exportStrategyArtifact(params: {
  name: string;
  description: string;
  code: string;
  symbol?: string;
  chain?: string;
  backtests?: BacktestResult[];
  includeCode?: boolean;
}) {
  const validation = validateStrategyCode(params.code);
  const codeHash = `sha256:${createHash('sha256').update(params.code).digest('hex')}`;
  const artifactId = `pharos-${createHash('sha256').update(`${params.name}:${codeHash}`).digest('hex').slice(0, 16)}`;
  return {
    schemaVersion: 'pharos.quant.skill.artifact.v1',
    artifactId,
    name: params.name,
    description: params.description,
    target: {
      chain: params.chain ?? 'pharos-atlantic-testnet',
      symbol: params.symbol ?? 'PHRS',
    },
    codeHash,
    ...(params.includeCode === false ? {} : { code: params.code }),
    validation,
    detailMode: params.includeCode === false ? 'summary' : 'full',
    backtestSummary: (params.backtests ?? []).map((result) => ({
      period: result.period,
      totalReturnPct: result.totalReturnPct,
      winRatePct: result.winRatePct,
      winRateBasis: result.winRateBasis,
      maxDrawdownPct: result.maxDrawdownPct,
      sharpeRatio: result.sharpeRatio,
      totalTrades: result.totalTrades,
      realizedPnl: result.realizedPnl,
      unrealizedPnl: result.unrealizedPnl,
      openPositionValue: result.openPositionValue,
      exposurePct: result.exposurePct,
    })),
    riskNotice: [
      'This artifact is for Phase 1 strategy research, backtesting, and simulation.',
      'It does not authorize live trading.',
      'Any on-chain write operation must require explicit user confirmation.',
    ],
    usage: {
      evaluateSignature: 'exports.evaluate(ctx)',
      requiredContext: ['candle', 'candles', 'index', 'state', 'position', 'initialCapital', 'equity'],
      expectedDecision: "{ action: 'BUY'|'SELL'|'HOLD', amountUsd?, fraction?, reason?, statePatch? }",
    },
  };
}
