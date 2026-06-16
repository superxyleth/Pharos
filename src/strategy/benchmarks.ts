import { precomputeIndicators } from './indicators.js';
import { maxDrawdownPct, roundMetric, totalReturnPct } from './metrics.js';
import type { BenchmarkResult, BenchmarkSummary, Candle } from './types.js';

export function runBenchmarkSet(params: {
  candles: Candle[];
  initialCapital: number;
  strategyReturnPct: number;
  feeRate: number;
  slippageRate: number;
}): BenchmarkSummary {
  const buyAndHold = runBuyAndHold(params);
  const emaTrendBaseline = runSignalBaseline({
    ...params,
    id: 'ema-trend-baseline',
    name: 'EMA Trend Baseline',
    description: 'Fully enters when EMA20 is above EMA50 and exits when the trend filter turns off.',
    shouldHold: (index, indicators) => {
      const item = indicators[index];
      return Number(item.ema20) > Number(item.ema50);
    },
  });
  const rsiMeanReversionBaseline = runSignalBaseline({
    ...params,
    id: 'rsi-mean-reversion-baseline',
    name: 'RSI Mean Reversion Baseline',
    description: 'Fully enters below RSI 35 and exits above RSI 60.',
    shouldHold: (index, indicators, currentlyHolding) => {
      const rsi = indicators[index].rsi14;
      if (!Number.isFinite(rsi)) return currentlyHolding;
      if (Number(rsi) < 35) return true;
      if (Number(rsi) > 60) return false;
      return currentlyHolding;
    },
  });
  const baselines = [buyAndHold, emaTrendBaseline, rsiMeanReversionBaseline];
  const best = baselines.reduce((current, candidate) => (
    candidate.totalReturnPct > current.totalReturnPct ? candidate : current
  ));

  return {
    buyAndHold,
    emaTrendBaseline,
    rsiMeanReversionBaseline,
    comparison: {
      strategyReturnPct: params.strategyReturnPct,
      buyAndHoldReturnPct: buyAndHold.totalReturnPct,
      bestBaselineId: best.id,
      bestBaselineReturnPct: best.totalReturnPct,
      strategyVsBuyAndHoldPct: roundMetric(params.strategyReturnPct - buyAndHold.totalReturnPct),
      strategyVsBestBaselinePct: roundMetric(params.strategyReturnPct - best.totalReturnPct),
      note: 'Baselines are research comparators only; they do not imply live execution or trading authorization.',
    },
  };
}

function runBuyAndHold(params: {
  candles: Candle[];
  initialCapital: number;
  feeRate: number;
  slippageRate: number;
}): BenchmarkResult {
  const firstPrice = params.candles[0].close * (1 + params.slippageRate);
  const lastPrice = params.candles.at(-1)!.close;
  const baseAmount = (params.initialCapital * (1 - params.feeRate)) / firstPrice;
  const equityValues = params.candles.map((candle) => baseAmount * candle.close);
  return summarizeBenchmark({
    id: 'buy-and-hold',
    name: 'Buy And Hold',
    description: 'Deploys the initial capital at the first candle and holds through the period.',
    initialCapital: params.initialCapital,
    finalEquity: baseAmount * lastPrice,
    equityValues,
    exposurePct: 100,
    totalTrades: 1,
  });
}

function runSignalBaseline(params: {
  candles: Candle[];
  initialCapital: number;
  feeRate: number;
  slippageRate: number;
  id: BenchmarkResult['id'];
  name: string;
  description: string;
  shouldHold: (
    index: number,
    indicators: ReturnType<typeof precomputeIndicators>,
    currentlyHolding: boolean,
  ) => boolean;
}): BenchmarkResult {
  const indicators = precomputeIndicators(params.candles);
  let quoteBalance = params.initialCapital;
  let baseAmount = 0;
  let totalTrades = 0;
  const equityValues: number[] = [];

  for (let index = 0; index < params.candles.length; index += 1) {
    const candle = params.candles[index];
    const targetHolding = params.shouldHold(index, indicators, baseAmount > 0);
    if (targetHolding && baseAmount <= 0 && quoteBalance > 0) {
      const executionPrice = candle.close * (1 + params.slippageRate);
      baseAmount = (quoteBalance * (1 - params.feeRate)) / executionPrice;
      quoteBalance = 0;
      totalTrades += 1;
    } else if (!targetHolding && baseAmount > 0) {
      const executionPrice = candle.close * (1 - params.slippageRate);
      quoteBalance = baseAmount * executionPrice * (1 - params.feeRate);
      baseAmount = 0;
      totalTrades += 1;
    }
    equityValues.push(quoteBalance + baseAmount * candle.close);
  }

  const finalPrice = params.candles.at(-1)!.close;
  const finalEquity = quoteBalance + baseAmount * finalPrice;
  return summarizeBenchmark({
    id: params.id,
    name: params.name,
    description: params.description,
    initialCapital: params.initialCapital,
    finalEquity,
    equityValues,
    exposurePct: finalEquity > 0 ? ((baseAmount * finalPrice) / finalEquity) * 100 : 0,
    totalTrades,
  });
}

function summarizeBenchmark(params: {
  id: BenchmarkResult['id'];
  name: string;
  description: string;
  initialCapital: number;
  finalEquity: number;
  equityValues: number[];
  exposurePct: number;
  totalTrades: number;
}): BenchmarkResult {
  return {
    id: params.id,
    name: params.name,
    description: params.description,
    finalEquity: roundMetric(params.finalEquity),
    totalReturnPct: roundMetric(totalReturnPct(params.initialCapital, params.finalEquity)),
    maxDrawdownPct: roundMetric(maxDrawdownPct(params.equityValues).maxDrawdownPct),
    exposurePct: roundMetric(params.exposurePct),
    totalTrades: params.totalTrades,
  };
}
