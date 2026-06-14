export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategyIndicators {
  ema20?: number;
  ema50?: number;
  rsi14?: number;
  atr14?: number;
  previousClose?: number;
}

export interface BacktestDataQuality {
  source: string;
  coverageComplete: boolean;
  resampled: boolean;
  originalCandleCount: number;
  resampledCandleCount: number;
  missingCandles: number;
  startTime: number;
  endTime: number;
}

export interface StrategyQuality {
  hasTrendFilter: boolean;
  hasVolatilityFilter: boolean;
  hasExposureLimit: boolean;
  hasStopLossOrRiskOff: boolean;
  usesPrecomputedIndicators: boolean;
  notes: string[];
}

export type StrategyAction = 'BUY' | 'SELL' | 'HOLD';

export interface StrategyDecision {
  action: StrategyAction;
  amountUsd?: number;
  fraction?: number;
  reason?: string;
  signalKey?: string;
  statePatch?: Record<string, unknown>;
}

export interface PositionState {
  baseAmount: number;
  quoteBalance: number;
  avgEntryPrice: number;
  realizedPnl: number;
}

export interface StrategyContext {
  candle: Candle;
  candles: Candle[];
  indicators: StrategyIndicators;
  index: number;
  state: Record<string, unknown>;
  position: PositionState;
  initialCapital: number;
  equity: number;
}

export interface Trade {
  index: number;
  time: number;
  action: 'BUY' | 'SELL';
  price: number;
  amountUsd: number;
  baseAmount: number;
  reason: string;
  equity: number;
}

export interface BacktestResult {
  success: true;
  symbol: string;
  period: string;
  timeframe: string;
  coverage: string;
  candleSource: string;
  startTime: number;
  endTime: number;
  dataQuality: BacktestDataQuality;
  candleCount: number;
  initialCapital: number;
  finalEquity: number;
  totalReturnPct: number;
  winRatePct: number;
  winRateBasis: string;
  maxDrawdownPct: number;
  sharpeRatio: number;
  totalTrades: number;
  realizedPnl: number;
  unrealizedPnl: number;
  openPositionValue: number;
  openPositionCost: number;
  exposurePct: number;
  noTradeReason: string | null;
  tradeActivityScore: number;
  entrySignalCount: number;
  blockedSignalCount: number;
  riskScore: number;
  stabilityScore: number;
  capitalEfficiencyScore: number;
  strategyQuality: StrategyQuality;
  trades: Trade[];
  equityCurve: Array<{ time: number; equity: number; drawdownPct: number }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
