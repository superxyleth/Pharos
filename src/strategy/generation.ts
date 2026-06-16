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
Use conservative risk controls and clear reasons.
For WBTC/WETH proxy research, prefer trend-following strategies that keep a core position during confirmed uptrends, use partial profit-taking instead of full small-profit exits, and protect downside with hard stops plus trailing stops.`;

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
    `Target symbol: ${params.symbol ?? 'WBTC'}`,
    `Initial capital: ${params.initialCapital ?? 1000}`,
    `User strategy request: ${params.description}`,
    '',
    'Generate robust strategy code with configurable constants at the top.',
    'Use ctx.indicators instead of recalculating EMA, RSI, or ATR from ctx.candles.',
    'Optimize for multi-period backtest return without promising profit: use EMA trend confirmation, RSI ceilings/pullbacks, ATR risk gating, exposure caps, partial exits, and trailing stops.',
    'Avoid tiny full-position take-profit rules that exit winners too early on WBTC/WETH trend proxies.',
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

export function deterministicStrategyTemplate(description: string, params: { symbol?: string } = {}): string {
  const symbol = (params.symbol ?? '').toUpperCase();
  if (symbol === 'WBTC' || symbol === 'WETH') {
    return optimizedTrendTemplate(description, symbol);
  }
  return guardedDcaTemplate(description);
}

function optimizedTrendTemplate(description: string, symbol: 'WBTC' | 'WETH'): string {
  return `// Generated fallback strategy: ${description.replace(/\s+/g, ' ').slice(0, 120)}
// ${symbol} trend-following proxy template optimized for multi-period research backtests.
var TARGET_EXPOSURE_PCT = 0.82;
var ADD_EXPOSURE_STEP_PCT = 0.35;
var MAX_EXPOSURE_PCT = 0.86;
var HARD_STOP_LOSS_PCT = 0.10;
var TRAILING_STOP_PCT = 0.12;
var ATR_RISK_PCT = 0.065;
var RSI_OVERHEAT = 82;
var RSI_PULLBACK_MAX = 72;
var COOLDOWN_BARS = 6;
var WARMUP_BARS = 18;
var MIN_ORDER_USD = 25;

exports.evaluate = function(ctx) {
  var state = ctx.state || {};
  var price = ctx.candle.close;
  var avg = ctx.position.avgEntryPrice || 0;
  var indicators = ctx.indicators || {};
  var ema20 = Number(indicators.ema20 || price);
  var ema50 = Number(indicators.ema50 || price);
  var rsi14 = Number(indicators.rsi14 || 50);
  var atr14 = Number(indicators.atr14 || 0);
  var lastTradeIndex = Number(state.lastTradeIndex || -999999);
  var peakPrice = Math.max(Number(state.peakPrice || 0), price);
  var exposure = ctx.equity > 0 ? (ctx.position.baseAmount * price) / ctx.equity : 0;
  var volatilityPct = price > 0 ? atr14 / price : 0;
  var primaryTrend = ema20 >= ema50 && price >= ema50 * 0.99;
  var momentumTrend = price >= ema20 && rsi14 <= RSI_OVERHEAT;
  var entryOk = ctx.index >= WARMUP_BARS && (primaryTrend || momentumTrend) && volatilityPct <= ATR_RISK_PCT && rsi14 <= RSI_PULLBACK_MAX;
  var cooledDown = ctx.index - lastTradeIndex >= COOLDOWN_BARS;
  var weakTrend = ema20 < ema50 && price < ema50 * 0.985;
  var trailBroken = ctx.position.baseAmount > 0 && peakPrice > 0 && price <= peakPrice * (1 - TRAILING_STOP_PCT) && weakTrend;

  if (ctx.position.baseAmount > 0 && avg > 0 && (price <= avg * (1 - HARD_STOP_LOSS_PCT) || trailBroken)) {
    return {
      action: 'SELL',
      fraction: 1,
      reason: '${symbol} trend proxy risk-off exit using hard stop or weak-trend trailing stop.',
      statePatch: { lastTradeIndex: ctx.index, peakPrice: price, riskMode: true }
    };
  }

  if (ctx.position.baseAmount > 0 && avg > 0 && price >= avg * 1.22 && rsi14 >= RSI_OVERHEAT && exposure > 0.35) {
    return {
      action: 'SELL',
      fraction: 0.2,
      reason: '${symbol} trend proxy partial profit lock while keeping core exposure.',
      statePatch: { lastTradeIndex: ctx.index, peakPrice: peakPrice, riskMode: false }
    };
  }

  if (
    entryOk &&
    cooledDown &&
    exposure < MAX_EXPOSURE_PCT &&
    ctx.position.quoteBalance >= MIN_ORDER_USD &&
    !state.riskMode
  ) {
    var targetSpend = Math.max(0, (TARGET_EXPOSURE_PCT - exposure) * ctx.equity);
    var stepSpend = ADD_EXPOSURE_STEP_PCT * ctx.equity;
    var amountUsd = Math.min(Math.max(MIN_ORDER_USD, Math.min(targetSpend, stepSpend)), ctx.position.quoteBalance);
    if (amountUsd >= MIN_ORDER_USD) {
      return {
        action: 'BUY',
        amountUsd: amountUsd,
        reason: '${symbol} trend-following entry/add using EMA trend, RSI ceiling, ATR guard, cooldown, and exposure cap.',
        statePatch: { lastTradeIndex: ctx.index, peakPrice: peakPrice, riskMode: false }
      };
    }
  }

  return {
    action: 'HOLD',
    reason: '${symbol} trend proxy holds while trend and downside controls are monitored.',
    statePatch: { peakPrice: peakPrice, riskMode: state.riskMode && primaryTrend && rsi14 < 62 ? false : state.riskMode }
  };
};`;
}

function guardedDcaTemplate(description: string): string {
  return `// Generated fallback strategy: ${description.replace(/\s+/g, ' ').slice(0, 120)}
var TOTAL_CAPITAL_U = 1000;
var BASE_BUY_AMOUNT_U = 30;
var MAX_BUY_COUNT = 10;
var TAKE_PROFIT_PCT = 0.018;
var STOP_LOSS_PCT = 0.08;
var RSI_BUY_BELOW = 55;
var RSI_RISK_OFF_ABOVE = 72;
var MAX_EXPOSURE_PCT = 0.45;
var COOLDOWN_BARS = 6;
var ATR_RISK_PCT = 0.04;
var PROBE_ENTRY_AFTER_BARS = 20;

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
  var firstProbeOk = buys === 0 && ctx.index >= PROBE_ENTRY_AFTER_BARS && price >= ema50 * 0.98;
  var entrySignal = rsi14 <= RSI_BUY_BELOW || firstProbeOk;

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
    entrySignal
  ) {
    var volatilityScale = Math.max(0.35, 1 - volatilityPct / ATR_RISK_PCT);
    var amountUsd = Math.min(BASE_BUY_AMOUNT_U * volatilityScale, ctx.position.quoteBalance);
    return {
      action: 'BUY',
      amountUsd: amountUsd,
      reason: firstProbeOk && rsi14 > RSI_BUY_BELOW
        ? 'Small research probe buy after warmup using EMA trend, ATR volatility, cooldown, and exposure guard.'
        : 'Risk-controlled DCA buy using precomputed RSI, EMA trend, ATR volatility, cooldown, and exposure guard.',
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
