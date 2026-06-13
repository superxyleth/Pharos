import type { Candle, PositionState, StrategyContext } from './types.js';
import { compileStrategy, normalizeDecision } from './sandbox.js';

export function simulateStrategy(params: {
  code: string;
  candles: Candle[];
  initialCapital?: number;
  state?: Record<string, unknown>;
  position?: PositionState;
}) {
  const evaluator = compileStrategy(params.code);
  const state = { ...(params.state ?? {}) };
  const position = params.position ?? {
    baseAmount: 0,
    quoteBalance: params.initialCapital ?? 1000,
    avgEntryPrice: 0,
    realizedPnl: 0,
  };
  const decisions = params.candles.map((candle, index) => {
    const equity = position.quoteBalance + position.baseAmount * candle.close;
    const ctx: StrategyContext = {
      candle,
      candles: params.candles.slice(0, index + 1),
      index,
      state,
      position: { ...position },
      initialCapital: params.initialCapital ?? 1000,
      equity,
    };
    const decision = normalizeDecision(evaluator(ctx));
    if (decision.statePatch) Object.assign(state, decision.statePatch);
    return { time: candle.time, close: candle.close, decision };
  });
  return {
    success: true,
    decisions,
    finalState: state,
    note: 'Simulation evaluates decisions only; it does not broadcast transactions.',
  };
}
