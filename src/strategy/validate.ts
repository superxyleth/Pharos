import type { ValidationResult } from './types.js';

const BLOCKED_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\brequire\s*\(/, message: 'require() is not allowed inside strategy code.' },
  { pattern: /\bimport\s+/, message: 'import is not allowed inside strategy code.' },
  { pattern: /\bprocess\b/, message: 'process access is not allowed inside strategy code.' },
  { pattern: /\bfs\b|node:fs/, message: 'filesystem access is not allowed inside strategy code.' },
  { pattern: /\bchild_process\b/, message: 'child_process access is not allowed inside strategy code.' },
  { pattern: /\bfetch\s*\(/, message: 'network fetch is not allowed inside strategy code.' },
  { pattern: /\bXMLHttpRequest\b/, message: 'network access is not allowed inside strategy code.' },
  { pattern: /\beval\s*\(/, message: 'eval() is not allowed inside strategy code.' },
  { pattern: /\bFunction\s*\(/, message: 'Function constructor is not allowed inside strategy code.' },
];

const PERFORMANCE_WARNING_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /ctx\s*\.\s*candles\s*\.\s*(map|filter|reduce|forEach|slice)\s*\(/,
    message: 'Strategy scans ctx.candles inside evaluate(ctx). Prefer ctx.indicators or statePatch to keep full-period matrix backtests efficient.',
  },
  {
    pattern: /for\s*\([^)]*ctx\s*\.\s*candles\s*\.\s*length/,
    message: 'Strategy loops over full ctx.candles inside evaluate(ctx). Prefer precomputed ctx.indicators for EMA/RSI/ATR-style signals.',
  },
  {
    pattern: /while\s*\([^)]*ctx\s*\.\s*candles\s*\.\s*length/,
    message: 'Strategy uses a while loop over ctx.candles. This can slow full-period backtests and should usually be moved into statePatch or ctx.indicators.',
  },
];

export function validateStrategyCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = code.trim();

  if (!trimmed) {
    errors.push('Strategy code is empty.');
  }
  if (!/exports\s*\.\s*evaluate\s*=/.test(trimmed)) {
    errors.push('Strategy code must assign exports.evaluate = function(ctx) { ... }.');
  }
  for (const blocked of BLOCKED_PATTERNS) {
    if (blocked.pattern.test(trimmed)) errors.push(blocked.message);
  }
  if (!/BUY|SELL|HOLD|buy|sell|hold/.test(trimmed)) {
    warnings.push('Strategy code does not visibly return BUY, SELL, or HOLD.');
  }
  for (const warning of PERFORMANCE_WARNING_PATTERNS) {
    if (warning.pattern.test(trimmed)) warnings.push(warning.message);
  }
  if (trimmed.length > 20_000) {
    errors.push('Strategy code is too large. Keep it under 20,000 characters.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
