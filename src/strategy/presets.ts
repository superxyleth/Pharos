export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  symbol: string;
  chain: string;
  code: string;
  tags: string[];
}

function wrappedTrendProxyCode(asset: 'WBTC' | 'WETH', proxyPair: 'BTCUSDT' | 'ETHUSDT') {
  return `// ${asset} trend proxy preset using ${proxyPair} 1H market candles
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
      reason: '${asset} proxy risk-off exit using hard stop or weak-trend trailing stop.',
      statePatch: { lastTradeIndex: ctx.index, peakPrice: price, riskMode: true }
    };
  }

  if (ctx.position.baseAmount > 0 && avg > 0 && price >= avg * 1.22 && rsi14 >= RSI_OVERHEAT && exposure > 0.35) {
    return {
      action: 'SELL',
      fraction: 0.2,
      reason: '${asset} proxy partial profit lock while keeping core exposure.',
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
        reason: '${asset} proxy trend-following entry/add using EMA trend, RSI ceiling, ATR guard, cooldown, and exposure cap.',
        statePatch: { lastTradeIndex: ctx.index, peakPrice: peakPrice, riskMode: false }
      };
    }
  }

  return {
    action: 'HOLD',
    reason: '${asset} proxy holds while trend and downside controls are monitored.',
    statePatch: { peakPrice: peakPrice, riskMode: state.riskMode && primaryTrend && rsi14 < 62 ? false : state.riskMode }
  };
};`;
}

export const strategyPresets: StrategyPreset[] = [
  {
    id: 'wbtc-trend-proxy',
    name: 'WBTC Trend Proxy',
    description: 'WBTC research strategy using BTCUSDT three-year 1H proxy candles with EMA trend, RSI, ATR, cooldown, and exposure guards.',
    symbol: 'WBTC',
    chain: 'pharos-atlantic-testnet',
    tags: ['wbtc', 'btc-proxy', 'binance', 'trend-filter', 'risk-managed'],
    code: wrappedTrendProxyCode('WBTC', 'BTCUSDT'),
  },
  {
    id: 'weth-trend-proxy',
    name: 'WETH Trend Proxy',
    description: 'WETH research strategy using ETHUSDT three-year 1H proxy candles with EMA trend, RSI, ATR, cooldown, and exposure guards.',
    symbol: 'WETH',
    chain: 'pharos-atlantic-testnet',
    tags: ['weth', 'eth-proxy', 'binance', 'trend-filter', 'risk-managed'],
    code: wrappedTrendProxyCode('WETH', 'ETHUSDT'),
  },
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
