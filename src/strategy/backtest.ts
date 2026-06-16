import type { BacktestResult, Candle, PositionState, StrategyContext, StrategyQuality, Trade } from './types.js';
import { compileStrategy, normalizeDecision } from './sandbox.js';
import { createSampleCandles, intervalForPeriod } from './sampleData.js';
import type { PeriodInterval } from './sampleData.js';
import { runBenchmarkSet } from './benchmarks.js';
import { precomputeIndicators } from './indicators.js';
import { loadPreferredMarketCandles } from './marketData.js';
import type { MarketDataset } from './marketData.js';
import { maxDrawdownPct, roundMetric, sharpeRatio, totalReturnPct, winRatePct } from './metrics.js';
import { analyzeStrategyQuality, scoreCapitalEfficiency, scoreRisk, scoreStability } from './quality.js';

export const MATRIX_PERIODS = ['1D', '1W', '1M', '6M', '1Y', '2Y', '3Y'] as const;

export function runBacktest(params: {
  code: string;
  candles?: Candle[];
  symbol?: string;
  period?: string;
  initialCapital?: number;
  feeBps?: number;
  slippageBps?: number;
}): BacktestResult {
  const period = params.period ?? '1M';
  const interval = intervalForPeriod(period);
  const prepared = prepareCandles(params.candles, interval, {
    period,
    symbol: params.symbol,
  });
  const candles = prepared.candles;
  if (candles.length < 10) {
    throw new Error('At least 10 candles are required for backtesting.');
  }

  const evaluator = compileStrategy(params.code);
  const indicators = precomputeIndicators(candles);
  const strategyQuality = analyzeStrategyQuality(params.code);
  const initialCapital = params.initialCapital ?? inferInitialCapital(params.code) ?? 1000;
  const feeRate = (params.feeBps ?? 25) / 10_000;
  const slippageRate = (params.slippageBps ?? 10) / 10_000;
  const position: PositionState = {
    baseAmount: 0,
    quoteBalance: initialCapital,
    avgEntryPrice: 0,
    realizedPnl: 0,
  };
  const state: Record<string, unknown> = {};
  const trades: Trade[] = [];
  const equityValues: number[] = [];
  const equityTimes: number[] = [];
  let entrySignalCount = 0;
  let exitSignalCount = 0;
  let blockedSignalCount = 0;

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    const price = candle.close;
    const equity = position.quoteBalance + position.baseAmount * price;
    const ctx: StrategyContext = {
      candle,
      candles: candles.slice(0, index + 1),
      indicators: indicators[index],
      index,
      state,
      position: { ...position },
      initialCapital,
      equity,
    };
    const decision = normalizeDecision(evaluator(ctx));
    if (decision.statePatch) Object.assign(state, decision.statePatch);

    if (decision.action === 'BUY') {
      entrySignalCount += 1;
    }
    if (decision.action === 'SELL') {
      exitSignalCount += 1;
    }

    if (decision.action === 'BUY' && position.quoteBalance > 0) {
      const requested = decision.amountUsd ?? (decision.fraction ? equity * decision.fraction : position.quoteBalance * 0.25);
      const spend = Math.max(0, Math.min(requested, position.quoteBalance));
      if (spend > 0) {
        const executionPrice = price * (1 + slippageRate);
        const netSpend = spend * (1 - feeRate);
        const baseAmount = netSpend / executionPrice;
        const previousCost = position.avgEntryPrice * position.baseAmount;
        position.quoteBalance -= spend;
        position.avgEntryPrice = (previousCost + spend) / (position.baseAmount + baseAmount);
        position.baseAmount += baseAmount;
        trades.push(makeTrade(index, candle.time, 'BUY', executionPrice, spend, baseAmount, decision.reason, position, price));
      } else {
        blockedSignalCount += 1;
      }
    } else if (decision.action === 'BUY') {
      blockedSignalCount += 1;
    }

    if (decision.action === 'SELL' && position.baseAmount > 0) {
      const fraction = decision.fraction ? Math.max(0, Math.min(decision.fraction, 1)) : 1;
      const baseAmount = position.baseAmount * fraction;
      const executionPrice = price * (1 - slippageRate);
      const gross = baseAmount * executionPrice;
      const proceeds = gross * (1 - feeRate);
      const costBasis = position.avgEntryPrice * baseAmount;
      position.baseAmount -= baseAmount;
      position.quoteBalance += proceeds;
      position.realizedPnl += proceeds - costBasis;
      if (position.baseAmount <= 1e-12) {
        position.baseAmount = 0;
        position.avgEntryPrice = 0;
      }
      trades.push(makeTrade(index, candle.time, 'SELL', executionPrice, proceeds - costBasis, baseAmount, decision.reason, position, price));
    } else if (decision.action === 'SELL') {
      blockedSignalCount += 1;
    }

    equityValues.push(position.quoteBalance + position.baseAmount * price);
    equityTimes.push(candle.time);
  }

  const finalPrice = candles[candles.length - 1].close;
  const finalEquity = position.quoteBalance + position.baseAmount * finalPrice;
  const openPositionValue = position.baseAmount * finalPrice;
  const openPositionCost = position.avgEntryPrice * position.baseAmount;
  const unrealizedPnl = openPositionValue - openPositionCost;
  const drawdown = maxDrawdownPct(equityValues);
  const returnPct = roundMetric(totalReturnPct(initialCapital, finalEquity));
  const drawdownPct = roundMetric(drawdown.maxDrawdownPct);
  const sharpe = roundMetric(sharpeRatio(equityValues));
  const exposurePct = roundMetric(finalEquity > 0 ? (openPositionValue / finalEquity) * 100 : 0);
  const noTradeReason = explainNoTrades({
    totalTrades: trades.length,
    entrySignalCount,
    exitSignalCount,
    blockedSignalCount,
    strategyQuality,
  });
  const tradeActivityScore = scoreTradeActivity({ totalTrades: trades.length, candleCount: candles.length });
  const equityCurve = equityValues.map((equity, index) => ({
    time: equityTimes[index],
    equity: roundMetric(equity),
    drawdownPct: roundMetric(drawdown.curve[index]),
  }));
  const benchmarks = runBenchmarkSet({
    candles,
    initialCapital,
    strategyReturnPct: returnPct,
    feeRate,
    slippageRate,
  });

  return {
    success: true,
    symbol: params.symbol ?? 'PHAROS-SAMPLE',
    period,
    timeframe: interval.bar,
    coverage: prepared.coverage,
    candleSource: prepared.source,
    startTime: candles[0].time,
    endTime: candles[candles.length - 1].time,
    dataQuality: prepared.dataQuality,
    candleCount: candles.length,
    initialCapital: roundMetric(initialCapital),
    finalEquity: roundMetric(finalEquity),
    totalReturnPct: returnPct,
    winRatePct: roundMetric(winRatePct(trades)),
    winRateBasis: 'Closed SELL trades with positive realized PnL only; unrealized PnL is reflected in finalEquity, drawdown, and open position fields.',
    maxDrawdownPct: drawdownPct,
    sharpeRatio: sharpe,
    totalTrades: trades.length,
    realizedPnl: roundMetric(position.realizedPnl),
    unrealizedPnl: roundMetric(unrealizedPnl),
    openPositionValue: roundMetric(openPositionValue),
    openPositionCost: roundMetric(openPositionCost),
    exposurePct,
    noTradeReason,
    tradeActivityScore,
    entrySignalCount,
    blockedSignalCount,
    riskScore: scoreRisk({ maxDrawdownPct: drawdownPct, exposurePct, strategyQuality }),
    stabilityScore: scoreStability({ sharpeRatio: sharpe, maxDrawdownPct: drawdownPct, totalTrades: trades.length }),
    capitalEfficiencyScore: scoreCapitalEfficiency({ totalReturnPct: returnPct, exposurePct, totalTrades: trades.length }),
    strategyQuality,
    benchmarks,
    trades,
    equityCurve,
  };
}

export function runBacktestMatrix(params: {
  code: string;
  candles?: Candle[];
  symbol?: string;
  initialCapital?: number;
}) {
  return MATRIX_PERIODS.map((period) => {
    return runBacktest({
      ...params,
      period,
    });
  });
}

function makeTrade(
  index: number,
  time: number,
  action: 'BUY' | 'SELL',
  price: number,
  amountUsd: number,
  baseAmount: number,
  reason: string | undefined,
  position: PositionState,
  markPrice: number,
): Trade {
  return {
    index,
    time,
    action,
    price: roundMetric(price),
    amountUsd: roundMetric(amountUsd),
    baseAmount: roundMetric(baseAmount, 8),
    reason: reason ?? action,
    equity: roundMetric(position.quoteBalance + position.baseAmount * markPrice),
  };
}

function normalizeCandles(candles: Candle[]): Candle[] {
  return candles
    .filter((candle) => Number.isFinite(candle.close) && candle.close > 0)
    .map((candle) => ({
      time: Number(candle.time),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume ?? 0),
    }));
}

function prepareCandles(
  candles: Candle[] | undefined,
  interval: PeriodInterval,
  context: { period: string; symbol?: string },
): { candles: Candle[]; source: string; coverage: string; dataQuality: ReturnType<typeof buildDataQuality> } {
  if (!candles?.length) {
    const marketData = loadPreferredMarketCandles(context.symbol);
    if (marketData?.candles.length) {
      return prepareProvidedCandles(marketData.candles, interval, {
        source: 'local-market-dataset',
        dataSource: marketData.dataset.dataSource ?? marketData.dataset.source ?? marketData.dataset.datasetId,
        originalSource: 'local-market-dataset',
        dataset: marketData.dataset,
        period: context.period,
      });
    }

    const synthetic = normalizeCandles(createSampleCandles(interval));
    return {
      candles: synthetic,
      source: 'synthetic-full-period-adaptive-timeframe',
      coverage: interval.coverage,
      dataQuality: buildDataQuality({
        candles: synthetic,
        interval,
        source: 'deterministic-sample',
        originalCandleCount: synthetic.length,
        resampled: false,
        coverageComplete: true,
        period: context.period,
      }),
    };
  }

  return prepareProvidedCandles(candles, interval, {
    source: 'provided-candles',
    dataSource: 'provided-candles',
    originalSource: 'provided-candles',
    period: context.period,
  });
}

function prepareProvidedCandles(
  candles: Candle[],
  interval: PeriodInterval,
  context: {
    source: string;
    dataSource: string;
    originalSource: string;
    period: string;
    dataset?: MarketDataset;
  },
): { candles: Candle[]; source: string; coverage: string; dataQuality: ReturnType<typeof buildDataQuality> } {
  const normalized = normalizeCandles(candles);
  if (normalized.length <= interval.limit) {
    return {
      candles: normalized,
      source: context.source === 'local-market-dataset' ? 'local-market-dataset-input-span' : 'provided-input-span',
      coverage: 'provided-input-span',
      dataQuality: buildDataQuality({
        candles: normalized,
        interval,
        source: context.dataSource,
        originalCandleCount: normalized.length,
        resampled: false,
        coverageComplete: hasFullTargetCoverage(normalized, interval),
        dataset: context.dataset,
        period: context.period,
      }),
    };
  }

  const resampled = resampleFullCoverage(normalized, interval.limit);
  return {
    candles: resampled,
    source: context.source === 'local-market-dataset' ? 'local-market-dataset-resampled-input-span' : 'provided-resampled-input-span',
    coverage: 'provided-input-span',
    dataQuality: buildDataQuality({
      candles: resampled,
      interval,
      source: context.dataSource,
      originalCandleCount: normalized.length,
      resampled: true,
      coverageComplete: hasFullTargetCoverage(normalized, interval),
      dataset: context.dataset,
      period: context.period,
    }),
  };
}

function resampleFullCoverage(candles: Candle[], limit: number): Candle[] {
  const normalized = normalizeCandles(candles);
  if (normalized.length <= limit) return normalized;

  const bucketSize = Math.ceil(normalized.length / limit);
  const resampled: Candle[] = [];

  for (let index = 0; index < normalized.length; index += bucketSize) {
    const bucket = normalized.slice(index, index + bucketSize);
    if (!bucket.length) continue;
    const first = bucket[0];
    const last = bucket[bucket.length - 1];
    resampled.push({
      time: last.time,
      open: first.open,
      high: roundMetric(Math.max(...bucket.map((candle) => candle.high))),
      low: roundMetric(Math.min(...bucket.map((candle) => candle.low))),
      close: last.close,
      volume: roundMetric(bucket.reduce((sum, candle) => sum + candle.volume, 0)),
    });
  }

  return resampled.slice(0, limit);
}

function buildDataQuality(params: {
  candles: Candle[];
  interval: PeriodInterval;
  source: string;
  originalCandleCount: number;
  resampled: boolean;
  coverageComplete: boolean;
  period: string;
  dataset?: MarketDataset;
}) {
  const startTime = params.candles[0]?.time ?? 0;
  const endTime = params.candles.at(-1)?.time ?? startTime;
  const expectedCandles = expectedCandleCount(startTime, endTime, params.interval.stepMs);
  const observed = params.candles.length;
  const deterministicSample = params.source === 'deterministic-sample';
  const marketEvidence = params.dataset ? Boolean(params.dataset.marketEvidence) : !deterministicSample;
  const purpose: 'workflow_validation' | 'user_provided_research' = deterministicSample ? 'workflow_validation' : 'user_provided_research';
  const coverageNote = params.coverageComplete
    ? 'Dataset covers the requested period at the selected adaptive timeframe.'
    : `Dataset does not cover the full ${params.period} request; the backtest uses only the real candles currently available and does not synthesize missing history.`;
  return {
    source: params.source,
    dataSource: params.source,
    purpose,
    marketEvidence,
    notMarketEvidence: !marketEvidence,
    coverageComplete: params.coverageComplete,
    resampled: params.resampled,
    originalCandleCount: params.originalCandleCount,
    resampledCandleCount: observed,
    missingCandles: Math.max(0, expectedCandles - observed),
    startTime,
    endTime,
    datasetId: params.dataset?.datasetId,
    datasetPath: params.dataset?.path,
    exchange: params.dataset?.exchange,
    market: params.dataset?.market,
    pair: params.dataset?.pair,
    interval: params.dataset?.interval,
    preferredForBacktest: params.dataset?.preferredForBacktest,
    requestedPeriod: params.period,
    coverageNote,
    limitations: params.dataset?.limitations,
  };
}

function hasFullTargetCoverage(candles: Candle[], interval: PeriodInterval): boolean {
  if (candles.length < 2) return false;
  const span = candles.at(-1)!.time - candles[0].time;
  const expectedSpan = (interval.limit - 1) * interval.stepMs;
  return span >= expectedSpan * 0.98;
}

function expectedCandleCount(startTime: number, endTime: number, stepMs: number): number {
  if (!startTime || !endTime || endTime < startTime || stepMs <= 0) return 0;
  return Math.floor((endTime - startTime) / stepMs) + 1;
}

function scoreTradeActivity(params: { totalTrades: number; candleCount: number }): number {
  if (params.totalTrades <= 0 || params.candleCount <= 0) return 0;
  return Math.min(100, roundMetric((params.totalTrades / params.candleCount) * 250));
}

function explainNoTrades(params: {
  totalTrades: number;
  entrySignalCount: number;
  exitSignalCount: number;
  blockedSignalCount: number;
  strategyQuality: StrategyQuality;
}): string | null {
  if (params.totalTrades > 0) return null;
  if (params.entrySignalCount === 0 && params.exitSignalCount === 0) {
    const strictFilters = [
      params.strategyQuality.hasTrendFilter ? 'trend filter' : '',
      params.strategyQuality.hasVolatilityFilter ? 'volatility filter' : '',
      params.strategyQuality.hasExposureLimit ? 'exposure limit' : '',
      params.strategyQuality.hasStopLossOrRiskOff ? 'risk-off logic' : '',
    ].filter(Boolean);
    return strictFilters.length
      ? `No executable trades: the strategy emitted only HOLD decisions. Entry conditions may be too strict for this sample path because it uses ${strictFilters.join(', ')}.`
      : 'No executable trades: the strategy emitted only HOLD decisions and did not produce entry signals for this sample path.';
  }
  if (params.entrySignalCount > 0 && params.blockedSignalCount > 0) {
    return 'No executable trades: entry signals were emitted but blocked by quote balance, zero spend, exposure, or execution constraints.';
  }
  if (params.exitSignalCount > 0 && params.entrySignalCount === 0) {
    return 'No executable trades: exit signals were emitted without an open position, and no entry signal occurred first.';
  }
  return 'No executable trades: strategy signals did not pass sandbox execution constraints for this data span.';
}

function inferInitialCapital(code: string): number | null {
  const match = code.match(/\bTOTAL_CAPITAL_U\s*=\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
