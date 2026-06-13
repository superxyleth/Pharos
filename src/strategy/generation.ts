import { completeText } from '../openai.js';
import { validateStrategyCode } from './validate.js';

const SYSTEM_PROMPT = `You generate safe JavaScript quant strategies for a Pharos MCP Skill.
Return only executable JavaScript code.
The code must define exports.evaluate = function(ctx) { ... }.
ctx contains candle, candles, index, state, position, initialCapital, and equity.
Return { action: 'BUY'|'SELL'|'HOLD', amountUsd, fraction, reason, statePatch }.
Do not use imports, require, process, fs, child_process, eval, Function, fetch, or network access.
Use conservative risk controls and clear reasons.`;

export async function generateStrategyCode(params: {
  description: string;
  symbol?: string;
  chain?: string;
  initialCapital?: number;
}): Promise<{
  success: true;
  code: string;
  validation: ReturnType<typeof validateStrategyCode>;
  modelHint: string;
}> {
  const user = [
    `Target chain: ${params.chain ?? 'pharos-atlantic-testnet'}`,
    `Target symbol: ${params.symbol ?? 'PHRS'}`,
    `Initial capital: ${params.initialCapital ?? 1000}`,
    `User strategy request: ${params.description}`,
    '',
    'Generate robust strategy code with configurable constants at the top.',
  ].join('\n');

  const raw = await completeText({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 1600,
    temperature: 0.1,
  });
  const code = stripMarkdownFence(raw);
  const validation = validateStrategyCode(code);
  return {
    success: true,
    code,
    validation,
    modelHint: 'OpenAI-compatible chat completion via configured OPENAI_BASE_URL/OPENAI_MODEL.',
  };
}

export function deterministicStrategyTemplate(description: string): string {
  return `// Generated fallback strategy: ${description.replace(/\s+/g, ' ').slice(0, 120)}
var TOTAL_CAPITAL_U = 1000;
var BUY_AMOUNT_U = 50;
var MAX_BUY_COUNT = 10;
var TAKE_PROFIT_PCT = 0.02;

exports.evaluate = function(ctx) {
  var state = ctx.state || {};
  var buys = Number(state.buys || 0);
  var lastBuyIndex = Number(state.lastBuyIndex || -999999);
  var price = ctx.candle.close;
  var avg = ctx.position.avgEntryPrice || 0;

  if (ctx.position.baseAmount > 0 && avg > 0 && price >= avg * (1 + TAKE_PROFIT_PCT)) {
    return {
      action: 'SELL',
      fraction: 1,
      reason: 'Take profit above average entry by configured threshold.',
      statePatch: { buys: 0, lastBuyIndex: ctx.index }
    };
  }

  if (buys < MAX_BUY_COUNT && ctx.index - lastBuyIndex >= 1 && ctx.position.quoteBalance >= BUY_AMOUNT_U) {
    return {
      action: 'BUY',
      amountUsd: BUY_AMOUNT_U,
      reason: 'Scheduled DCA buy while max buy count is not reached.',
      statePatch: { buys: buys + 1, lastBuyIndex: ctx.index }
    };
  }

  return { action: 'HOLD', reason: 'No entry or exit condition met.' };
};`;
}

function stripMarkdownFence(text: string): string {
  const match = text.match(/```(?:javascript|js|typescript|ts)?\s*([\s\S]*?)```/i);
  return (match ? match[1] : text).trim();
}
