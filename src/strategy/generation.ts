import { completeText } from '../openai.js';
import { validateStrategyCode } from './validate.js';

const SYSTEM_PROMPT = `You generate safe JavaScript quant strategies for a Pharos MCP Skill.
Return only executable JavaScript code.
The code must define exports.evaluate = function(ctx) { ... }.
ctx contains candle, candles, indicators, index, state, position, initialCapital, and equity.
ctx.indicators provides precomputed ema20, ema50, rsi14, atr14, and previousClose for efficient full-period adaptive-timeframe backtests.
Return { action: 'BUY'|'SELL'|'HOLD', amountUsd, fraction, reason, statePatch }.
Do not use imports, require, process, fs, child_process, eval, Function, fetch, or network access.
Do not scan the full ctx.candles array inside evaluate(ctx). Use ctx.indicators and statePatch for RSI, EMA, ATR, drawdown, and grid state.
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
    'Use ctx.indicators instead of recalculating EMA, RSI, or ATR from ctx.candles.',
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
var BASE_BUY_AMOUNT_U = 35;
var MAX_BUY_COUNT = 8;
var TAKE_PROFIT_PCT = 0.025;
var STOP_LOSS_PCT = 0.08;
var RSI_BUY_BELOW = 42;
var RSI_RISK_OFF_ABOVE = 72;
var MAX_EXPOSURE_PCT = 0.5;
var COOLDOWN_BARS = 3;
var ATR_RISK_PCT = 0.035;

exports.evaluate = function(ctx) {
  var state = ctx.state || {};
  var buys = Number(state.buys || 0);
  var lastBuyIndex = Number(state.lastBuyIndex || -999999);
  var riskMode = Boolean(state.riskMode || false);
  var price = ctx.candle.close;
  var avg = ctx.position.avgEntryPrice || 0;
  var indicators = ctx.indicators || {};
  var rsi14 = Number(indicators.rsi14 || 50);
  var ema20 = Number(indicators.ema20 || price);
  var ema50 = Number(indicators.ema50 || price);
  var atr14 = Number(indicators.atr14 || 0);
  var exposure = ctx.equity > 0 ? (ctx.position.baseAmount * price) / ctx.equity : 0;
  var trendOk = ema20 >= ema50 || price > ema20;
  var volatilityPct = price > 0 ? atr14 / price : 0;
  var volatilityOk = volatilityPct <= ATR_RISK_PCT;
  var cooledDown = ctx.index - lastBuyIndex >= COOLDOWN_BARS;

  if (ctx.position.baseAmount > 0 && avg > 0 && (price <= avg * (1 - STOP_LOSS_PCT) || (!trendOk && rsi14 >= RSI_RISK_OFF_ABOVE))) {
    return {
      action: 'SELL',
      fraction: 1,
      reason: 'Risk-off exit triggered by stop-loss, weak trend, or overheated RSI.',
      statePatch: { buys: 0, riskMode: true, lastBuyIndex: ctx.index }
    };
  }

  if (ctx.position.baseAmount > 0 && avg > 0 && price >= avg * (1 + TAKE_PROFIT_PCT)) {
    return {
      action: 'SELL',
      fraction: 1,
      reason: 'Take profit above average entry by configured threshold.',
      statePatch: { buys: 0, riskMode: false, lastBuyIndex: ctx.index }
    };
  }

  if (
    buys < MAX_BUY_COUNT &&
    cooledDown &&
    ctx.position.quoteBalance >= BASE_BUY_AMOUNT_U &&
    exposure < MAX_EXPOSURE_PCT &&
    trendOk &&
    volatilityOk &&
    !riskMode &&
    rsi14 <= RSI_BUY_BELOW
  ) {
    var volatilityScale = Math.max(0.35, 1 - volatilityPct / ATR_RISK_PCT);
    var amountUsd = Math.min(BASE_BUY_AMOUNT_U * volatilityScale, ctx.position.quoteBalance);
    return {
      action: 'BUY',
      amountUsd: amountUsd,
      reason: 'Risk-controlled DCA buy using precomputed RSI, EMA trend, ATR volatility, cooldown, and exposure guard.',
      statePatch: { buys: buys + 1, lastBuyIndex: ctx.index }
    };
  }

  return {
    action: 'HOLD',
    reason: 'No entry or exit condition met under trend, volatility, cooldown, and exposure controls.',
    statePatch: { riskMode: riskMode && trendOk && rsi14 < 60 ? false : riskMode }
  };
};`;
}

function stripMarkdownFence(text: string): string {
  const match = text.match(/```(?:javascript|js|typescript|ts)?\s*([\s\S]*?)```/i);
  return (match ? match[1] : text).trim();
}
