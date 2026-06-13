import vm from 'node:vm';
import type { StrategyContext, StrategyDecision } from './types.js';
import { validateStrategyCode } from './validate.js';

export type Evaluator = (ctx: StrategyContext) => unknown;

export function compileStrategy(code: string): Evaluator {
  const validation = validateStrategyCode(code);
  if (!validation.valid) {
    throw new Error(`Invalid strategy code: ${validation.errors.join(' ')}`);
  }

  const sandbox: Record<string, unknown> = {
    exports: {},
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Date,
    JSON,
  };
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  const script = new vm.Script(`${code}\n;exports.evaluate;`);
  const evaluator = script.runInContext(context, { timeout: 1000 }) as Evaluator;
  if (typeof evaluator !== 'function') {
    throw new Error('Strategy did not export an evaluate function.');
  }
  return evaluator;
}

export function normalizeDecision(value: unknown): StrategyDecision {
  if (typeof value === 'string') {
    const action = normalizeAction(value);
    return { action, reason: `Strategy returned ${action}.` };
  }
  if (!value || typeof value !== 'object') {
    return { action: 'HOLD', reason: 'Strategy returned no actionable decision.' };
  }
  const row = value as Record<string, unknown>;
  const action = normalizeAction(String(row.action ?? row.signal ?? 'HOLD'));
  return {
    action,
    amountUsd: typeof row.amountUsd === 'number' && Number.isFinite(row.amountUsd) ? row.amountUsd : undefined,
    fraction: typeof row.fraction === 'number' && Number.isFinite(row.fraction) ? row.fraction : undefined,
    reason: typeof row.reason === 'string' ? row.reason : `Strategy returned ${action}.`,
    signalKey: typeof row.signalKey === 'string' ? row.signalKey : undefined,
    statePatch: row.statePatch && typeof row.statePatch === 'object' ? row.statePatch as Record<string, unknown> : undefined,
  };
}

function normalizeAction(action: string): StrategyDecision['action'] {
  const upper = action.trim().toUpperCase();
  if (upper === 'BUY' || upper === 'SELL') return upper;
  return 'HOLD';
}
