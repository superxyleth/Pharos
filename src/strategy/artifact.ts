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
      timeframe: result.timeframe,
      coverage: result.coverage,
      candleSource: result.candleSource,
      startTime: result.startTime,
      endTime: result.endTime,
      dataQuality: result.dataQuality,
      candleCount: result.candleCount,
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
      riskScore: result.riskScore,
      stabilityScore: result.stabilityScore,
      capitalEfficiencyScore: result.capitalEfficiencyScore,
      strategyQuality: result.strategyQuality,
    })),
    safety: {
      researchOnly: true,
      liveTrading: { enabled: false },
      broadcastTransactions: false,
      onChainWrites: false,
      privateKeyExposure: false,
    },
    riskNotice: [
      'This artifact is for Phase 1 strategy research, backtesting, and simulation.',
      'It does not authorize live trading.',
      'Any on-chain write operation must require explicit user confirmation.',
    ],
    usage: {
      evaluateSignature: 'exports.evaluate(ctx)',
      requiredContext: ['candle', 'candles', 'indicators', 'index', 'state', 'position', 'initialCapital', 'equity'],
      expectedDecision: "{ action: 'BUY'|'SELL'|'HOLD', amountUsd?, fraction?, reason?, statePatch? }",
    },
  };
}
