import { createHash } from 'node:crypto';
import { getStaticPharosIntegrationSummary } from '../pharos.js';
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
  pharosIntegrationSummary?: ReturnType<typeof getStaticPharosIntegrationSummary>;
}) {
  const validation = validateStrategyCode(params.code);
  const codeHash = `sha256:${createHash('sha256').update(params.code).digest('hex')}`;
  const artifactId = `pharos-${createHash('sha256').update(`${params.name}:${codeHash}`).digest('hex').slice(0, 16)}`;
  const backtests = params.backtests ?? [];
  const safetySummary = {
    phase1Safe: true,
    researchOnly: true,
    liveTradingEnabled: false,
    broadcastTransactions: false,
    onChainWrites: false,
    privateKeyExposure: false,
  };
  return {
    schemaVersion: 'pharos.quant.skill.artifact.v1',
    artifactId,
    name: params.name,
    description: params.description,
    target: {
      chain: params.chain ?? 'pharos-atlantic-testnet',
      symbol: params.symbol ?? 'PHRS',
    },
    chainContext: params.pharosIntegrationSummary ?? getStaticPharosIntegrationSummary(),
    codeHash,
    ...(params.includeCode === false ? {} : { code: params.code }),
    validation,
    detailMode: params.includeCode === false ? 'summary' : 'full',
    dataSourceSummary: summarizeDataSource(backtests),
    backtestSummary: backtests.map((result) => ({
      period: result.period,
      timeframe: result.timeframe,
      coverage: result.coverage,
      candleSource: result.candleSource,
      dataSource: result.dataQuality.dataSource,
      dataSourcePurpose: result.dataQuality.purpose,
      marketEvidence: result.dataQuality.marketEvidence,
      notMarketEvidence: result.dataQuality.notMarketEvidence,
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
      noTradeReason: result.noTradeReason,
      tradeActivityScore: result.tradeActivityScore,
      entrySignalCount: result.entrySignalCount,
      blockedSignalCount: result.blockedSignalCount,
      riskScore: result.riskScore,
      stabilityScore: result.stabilityScore,
      capitalEfficiencyScore: result.capitalEfficiencyScore,
      strategyQuality: result.strategyQuality,
      benchmarks: result.benchmarks,
    })),
    safetySummary,
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

function summarizeDataSource(backtests: BacktestResult[]) {
  if (!backtests.length) {
    return {
      sources: [],
      type: 'not-provided',
      purpose: 'not-provided',
      marketEvidence: false,
      notMarketEvidence: true,
      note: 'No backtest data was attached to this artifact.',
    };
  }
  const sources = [...new Set(backtests.map((result) => result.dataQuality.dataSource))];
  const marketEvidence = backtests.some((result) => result.dataQuality.marketEvidence);
  const deterministicOnly = backtests.every((result) => result.dataQuality.notMarketEvidence);
  return {
    sources,
    type: deterministicOnly ? 'deterministic-sample' : sources.join(','),
    purpose: deterministicOnly ? 'workflow_validation' : 'user_provided_research',
    marketEvidence,
    notMarketEvidence: !marketEvidence,
    note: deterministicOnly
      ? 'Backtests use deterministic sample candles to validate the Agent workflow and risk diagnostics; they are not market evidence.'
      : 'Backtests include caller-provided candles. Validate data provenance before treating results as market evidence.',
  };
}
