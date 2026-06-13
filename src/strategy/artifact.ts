import type { BacktestResult } from './types.js';
import { validateStrategyCode } from './validate.js';

export function exportStrategyArtifact(params: {
  name: string;
  description: string;
  code: string;
  symbol?: string;
  chain?: string;
  backtests?: BacktestResult[];
}) {
  const validation = validateStrategyCode(params.code);
  return {
    schemaVersion: 'pharos.quant.skill.artifact.v1',
    name: params.name,
    description: params.description,
    target: {
      chain: params.chain ?? 'pharos-atlantic-testnet',
      symbol: params.symbol ?? 'PHRS',
    },
    code: params.code,
    validation,
    backtestSummary: (params.backtests ?? []).map((result) => ({
      period: result.period,
      totalReturnPct: result.totalReturnPct,
      winRatePct: result.winRatePct,
      maxDrawdownPct: result.maxDrawdownPct,
      sharpeRatio: result.sharpeRatio,
      totalTrades: result.totalTrades,
    })),
    riskNotice: [
      'This artifact is for strategy research and agent composition.',
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
