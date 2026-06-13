export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
  candleCount: number;
  initialCapital: number;
  finalEquity: number;
  totalReturnPct: number;
  winRatePct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  totalTrades: number;
  trades: Trade[];
  equityCurve: Array<{ time: number; equity: number; drawdownPct: number }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
