import { runBacktestMatrix } from '../src/strategy/backtest.ts';
import { deterministicStrategyTemplate } from '../src/strategy/generation.ts';

const code = deterministicStrategyTemplate('smoke test DCA strategy');
const results = runBacktestMatrix({ code, symbol: 'PHRS', initialCapital: 1000 });

if (results.length !== 7) {
  throw new Error(`Expected 7 matrix periods, got ${results.length}`);
}
for (const result of results) {
  if (!Number.isFinite(result.totalReturnPct)) {
    throw new Error(`Invalid return for ${result.period}`);
  }
  if (!result.winRateBasis || !Number.isFinite(result.unrealizedPnl) || !Number.isFinite(result.exposurePct)) {
    throw new Error(`Missing risk/exposure fields for ${result.period}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  periods: results.map((result) => ({
    period: result.period,
    totalReturnPct: result.totalReturnPct,
    maxDrawdownPct: result.maxDrawdownPct,
    totalTrades: result.totalTrades,
  })),
}, null, 2));
