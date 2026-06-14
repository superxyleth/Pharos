import type { Candle, StrategyIndicators } from './types.js';
import { roundMetric } from './metrics.js';

export function precomputeIndicators(candles: Candle[]): StrategyIndicators[] {
  const ema20 = computeEma(candles, 20);
  const ema50 = computeEma(candles, 50);
  const rsi14 = computeRsi(candles, 14);
  const atr14 = computeAtr(candles, 14);

  return candles.map((candle, index) => ({
    ema20: ema20[index],
    ema50: ema50[index],
    rsi14: rsi14[index],
    atr14: atr14[index],
    previousClose: index > 0 ? roundMetric(candles[index - 1].close) : undefined,
  }));
}

function computeEma(candles: Candle[], period: number): Array<number | undefined> {
  const values: Array<number | undefined> = [];
  const multiplier = 2 / (period + 1);
  let ema: number | undefined;

  for (let index = 0; index < candles.length; index += 1) {
    const close = candles[index].close;
    ema = ema === undefined ? close : (close - ema) * multiplier + ema;
    values.push(index + 1 >= period ? roundMetric(ema) : undefined);
  }

  return values;
}

function computeRsi(candles: Candle[], period: number): Array<number | undefined> {
  const values: Array<number | undefined> = new Array(candles.length).fill(undefined);
  let avgGain = 0;
  let avgLoss = 0;

  for (let index = 1; index < candles.length; index += 1) {
    const change = candles[index].close - candles[index - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (index <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (index === period) {
        avgGain /= period;
        avgLoss /= period;
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (index >= period) {
      const rs = avgLoss === 0 ? Number.POSITIVE_INFINITY : avgGain / avgLoss;
      values[index] = roundMetric(100 - 100 / (1 + rs));
    }
  }

  return values;
}

function computeAtr(candles: Candle[], period: number): Array<number | undefined> {
  const values: Array<number | undefined> = new Array(candles.length).fill(undefined);
  let atr = 0;

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    const previousClose = index > 0 ? candles[index - 1].close : candle.close;
    const trueRange = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    );

    if (index < period) {
      atr += trueRange;
      if (index === period - 1) {
        atr /= period;
        values[index] = roundMetric(atr);
      }
    } else {
      atr = (atr * (period - 1) + trueRange) / period;
      values[index] = roundMetric(atr);
    }
  }

  return values;
}
