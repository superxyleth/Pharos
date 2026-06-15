export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  symbol: string;
  chain: string;
  code: string;
  tags: string[];
}

export const strategyPresets: StrategyPreset[] = [
  {
    id: 'pros-dca-guarded',
    name: 'PROS Guarded DCA',
    description: 'Hourly PROS DCA with trend filter, cooldown, exposure cap, and risk-off exits.',
    symbol: 'PROS',
    chain: 'pharos-atlantic-testnet',
    tags: ['dca', 'pros', 'okx', 'trend-filter', 'risk-managed'],
    code: `// PROS guarded DCA preset
var TOTAL_CAPITAL_U = 1000;
var BASE_BUY_AMOUNT_U = 25;
var MAX_BUY_COUNT = 30;
var TAKE_PROFIT_PCT = 0.025;
var STOP_LOSS_PCT = 0.07;
var RSI_BUY_BELOW = 48;
var RSI_RISK_OFF_ABOVE = 70;
var MAX_EXPOSURE_PCT = 0.6;
var COOLDOWN_BARS = 12;
var ATR_RISK_PCT = 0.05;
var PROBE_ENTRY_AFTER_BARS = 24;

exports.evaluate = function(ctx) {
  var state = ctx.state || {};
  var buys = Number(state.buys || 0);
  var lastBuyIndex = Number(state.lastBuyIndex || -999999);
  var price = ctx.candle.close;
  var avg = ctx.position.avgEntryPrice || 0;
  var indicators = ctx.indicators || {};
  var rsi14 = Number(indicators.rsi14 || 50);
  var ema20 = Number(indicators.ema20 || price);
  var ema50 = Number(indicators.ema50 || price);
  var atr14 = Number(indicators.atr14 || 0);
  var exposure = ctx.equity > 0 ? (ctx.position.baseAmount * price) / ctx.equity : 0;
  var trendOk = ema20 >= ema50 || price >= ema20;
  var volatilityPct = price > 0 ? atr14 / price : 0;
  var volatilityOk = volatilityPct <= ATR_RISK_PCT;
  var cooledDown = ctx.index - lastBuyIndex >= COOLDOWN_BARS;
  var firstProbeOk = buys === 0 && ctx.index >= PROBE_ENTRY_AFTER_BARS && price >= ema50 * 0.985;
  var entrySignal = rsi14 <= RSI_BUY_BELOW || firstProbeOk;

  if (ctx.position.baseAmount > 0 && avg > 0 && (price <= avg * (1 - STOP_LOSS_PCT) || (!trendOk && rsi14 >= RSI_RISK_OFF_ABOVE))) {
    return {
      action: 'SELL',
      fraction: 1,
      reason: 'Risk-off exit triggered by stop-loss, weak trend, or overheated RSI.',
      statePatch: { buys: 0, lastBuyIndex: ctx.index, riskMode: true }
    };
  }

  if (ctx.position.baseAmount > 0 && avg > 0 && price >= avg * (1 + TAKE_PROFIT_PCT)) {
    return {
      action: 'SELL',
      fraction: 0.5,
      reason: 'Partial take-profit above average entry.',
      statePatch: { riskMode: false, lastBuyIndex: ctx.index }
    };
  }

  if (
    buys < MAX_BUY_COUNT &&
    cooledDown &&
    ctx.position.quoteBalance >= BASE_BUY_AMOUNT_U &&
    exposure < MAX_EXPOSURE_PCT &&
    trendOk &&
    volatilityOk &&
    entrySignal &&
    !state.riskMode
  ) {
    var volatilityScale = Math.max(0.4, 1 - volatilityPct / ATR_RISK_PCT);
    var amountUsd = Math.min(BASE_BUY_AMOUNT_U * volatilityScale, ctx.position.quoteBalance);
    return {
      action: 'BUY',
      amountUsd: amountUsd,
      reason: firstProbeOk && rsi14 > RSI_BUY_BELOW
        ? 'Small research probe buy after warmup.'
        : 'Guarded DCA buy using trend, RSI, ATR, cooldown, and exposure limits.',
      statePatch: { buys: buys + 1, lastBuyIndex: ctx.index, riskMode: false }
    };
  }

  return {
    action: 'HOLD',
    reason: 'No entry or exit condition met under guarded DCA rules.',
    statePatch: { riskMode: state.riskMode && trendOk && rsi14 < 60 ? false : state.riskMode }
  };
};`,
  },
];

export function listStrategyPresets() {
  return strategyPresets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    symbol: preset.symbol,
    chain: preset.chain,
    tags: preset.tags,
  }));
}

export function getStrategyPreset(id: string): StrategyPreset | null {
  return strategyPresets.find((preset) => preset.id === id) ?? null;
}
