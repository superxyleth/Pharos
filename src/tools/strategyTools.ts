import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { textResult, errorResult } from '../mcpResponse.js';
import { adviseStrategy } from '../strategy/advisor.js';
import { exportStrategyArtifact } from '../strategy/artifact.js';
import { runBacktest, runBacktestMatrix } from '../strategy/backtest.js';
import { deterministicStrategyTemplate, generateStrategyCode } from '../strategy/generation.js';
import { createSampleCandles } from '../strategy/sampleData.js';
import { simulateStrategy } from '../strategy/simulator.js';
import type { BacktestResult } from '../strategy/types.js';
import { validateStrategyCode } from '../strategy/validate.js';

const candleSchema = z.object({
  time: z.number().describe('Unix timestamp in milliseconds.'),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().default(0),
});

const backtestResultSchema = z.object({
  success: z.literal(true),
  symbol: z.string(),
  period: z.string(),
  timeframe: z.string().optional(),
  coverage: z.string().optional(),
  candleSource: z.string().optional(),
  dataSource: z.string().optional(),
  dataSourcePurpose: z.string().optional(),
  marketEvidence: z.boolean().optional(),
  notMarketEvidence: z.boolean().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  dataQuality: z.record(z.string(), z.unknown()).optional(),
  candleCount: z.number(),
  initialCapital: z.number(),
  finalEquity: z.number(),
  totalReturnPct: z.number(),
  winRatePct: z.number(),
  winRateBasis: z.string().optional(),
  maxDrawdownPct: z.number(),
  sharpeRatio: z.number(),
  totalTrades: z.number(),
  realizedPnl: z.number().optional(),
  unrealizedPnl: z.number().optional(),
  openPositionValue: z.number().optional(),
  openPositionCost: z.number().optional(),
  exposurePct: z.number().optional(),
  noTradeReason: z.string().nullable().optional(),
  tradeActivityScore: z.number().optional(),
  entrySignalCount: z.number().optional(),
  blockedSignalCount: z.number().optional(),
  riskScore: z.number().optional(),
  stabilityScore: z.number().optional(),
  capitalEfficiencyScore: z.number().optional(),
  strategyQuality: z.record(z.string(), z.unknown()).optional(),
  trades: z.array(z.any()).optional(),
  equityCurve: z.array(z.any()).optional(),
});

const backtestMatrixSchema = z.object({
  success: z.literal(true),
  periods: z.array(backtestResultSchema).optional(),
  results: z.array(backtestResultSchema).optional(),
});

const backtestInputSchema = z.union([
  z.array(backtestResultSchema).min(1),
  backtestMatrixSchema,
]);

export function registerStrategyTools(server: McpServer) {
  server.registerTool(
    'strategy_generate',
    {
      description: 'Generate sandboxed executable JavaScript strategy code from a natural-language quant idea.',
      inputSchema: {
        description: z.string().min(1).describe('Natural-language strategy idea, e.g. DCA 0.05U hourly and sell 2% above average entry.'),
        symbol: z.string().optional().describe('Target symbol, default PHRS.'),
        chain: z.string().optional().describe('Target chain, default pharos-atlantic-testnet.'),
        initialCapital: z.number().positive().optional().describe('Research capital used in generated constants.'),
        allowFallback: z.boolean().optional().describe('When true, return a deterministic template if OpenAI is unavailable.'),
      },
    },
    async ({ description, symbol, chain, initialCapital, allowFallback = true }) => {
      try {
        return textResult(await generateStrategyCode({ description, symbol, chain, initialCapital }));
      } catch (error) {
        if (!allowFallback) {
          return errorResult(error instanceof Error ? error.message : String(error));
        }
        const code = deterministicStrategyTemplate(description);
        return textResult({
          success: true,
          fallback: true,
          code,
          validation: validateStrategyCode(code),
          providerError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  server.registerTool(
    'strategy_validate',
    {
      description: 'Validate strategy code for the Pharos quant sandbox contract and blocked unsafe APIs.',
      inputSchema: {
        code: z.string().min(1).describe('JavaScript strategy code that should export evaluate(ctx).'),
      },
    },
    async ({ code }) => textResult({ success: true, validation: validateStrategyCode(code) }),
  );

  server.registerTool(
    'strategy_backtest',
    {
      description: 'Run a single-period sandbox backtest and return return, win rate, drawdown, Sharpe, trades, and equity curve.',
      inputSchema: {
        code: z.string().min(1).describe('JavaScript strategy code with exports.evaluate(ctx).'),
        candles: z.array(candleSchema).optional().describe('Optional OHLCV candles. If omitted, deterministic sample candles are used.'),
        symbol: z.string().optional().describe('Display symbol for the result, default PHAROS-SAMPLE.'),
        period: z.enum(['1D', '1W', '1M', '6M', '1Y', '2Y', '3Y']).optional().describe('Backtest period label.'),
        initialCapital: z.number().positive().optional().describe('Initial quote capital.'),
        feeBps: z.number().min(0).max(500).optional().describe('Fee basis points, default 25.'),
        slippageBps: z.number().min(0).max(500).optional().describe('Slippage basis points, default 10.'),
        includeDetails: z.boolean().optional().describe('Return full trades and equity curve. Defaults to false to keep MCP responses compact.'),
      },
    },
    async ({ code, candles, symbol, period, initialCapital, feeBps, slippageBps, includeDetails = false }) => {
      try {
        const result = runBacktest({ code, candles, symbol, period, initialCapital, feeBps, slippageBps });
        return textResult(includeDetails ? result : summarizeBacktest(result));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'strategy_backtest_matrix',
    {
      description: 'Run the closed-loop multi-period backtest matrix: 1D, 1W, 1M, 6M, 1Y, 2Y, and 3Y.',
      inputSchema: {
        code: z.string().min(1).describe('JavaScript strategy code with exports.evaluate(ctx).'),
        candles: z.array(candleSchema).optional().describe('Optional OHLCV candles injected by another data Skill or client.'),
        symbol: z.string().optional().describe('Display symbol for the result.'),
        initialCapital: z.number().positive().optional().describe('Initial quote capital.'),
        includeDetails: z.boolean().optional().describe('Return full period results. Defaults to false to keep MCP responses compact.'),
      },
    },
    async ({ code, candles, symbol, initialCapital, includeDetails = false }) => {
      try {
        const results = runBacktestMatrix({ code, candles, symbol, initialCapital });
        return textResult({
          success: true,
          dataSourceSummary: summarizeDataSource(results),
          periods: results.map(summarizeBacktest),
          ...(includeDetails ? { results } : {}),
        });
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'strategy_advise',
    {
      description: 'Review strategy code and backtest results, then provide risk-aware optimization advice.',
      inputSchema: {
        code: z.string().min(1).describe('Strategy code under review.'),
        results: backtestInputSchema.describe('Backtest result array, or the full object returned by strategy_backtest_matrix.'),
        question: z.string().optional().describe('Specific reviewer question.'),
      },
    },
    async ({ code, results, question }) => {
      try {
        return textResult(await adviseStrategy({ code, results: normalizeBacktestResults(results), question }));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'strategy_simulate',
    {
      description: 'Evaluate strategy decisions over one or more candles without executing trades or broadcasting transactions.',
      inputSchema: {
        code: z.string().min(1).describe('Strategy code with exports.evaluate(ctx).'),
        candles: z.array(candleSchema).optional().describe('Candles to simulate. If omitted, 30 deterministic sample candles are used.'),
        initialCapital: z.number().positive().optional().describe('Initial quote capital for context.'),
        state: z.record(z.string(), z.unknown()).optional().describe('Optional strategy state.'),
      },
    },
    async ({ code, candles, initialCapital, state }) => {
      try {
        return textResult(simulateStrategy({
          code,
          candles: candles?.length ? candles : createSampleCandles({ limit: 30 }),
          initialCapital,
          state,
        }));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'strategy_export_artifact',
    {
      description: 'Export a reusable Phase 1 strategy artifact with code, validation, backtest summary, risk notes, and usage contract.',
      inputSchema: {
        name: z.string().min(1).describe('Artifact name.'),
        description: z.string().min(1).describe('Strategy description.'),
        code: z.string().min(1).describe('Strategy code.'),
        symbol: z.string().optional().describe('Target symbol.'),
        chain: z.string().optional().describe('Target chain.'),
        backtests: backtestInputSchema.optional().describe('Optional backtest array, or the full object returned by strategy_backtest_matrix.'),
        includeCode: z.boolean().optional().describe('When false, return artifactId and codeHash without embedding full strategy code. Defaults to true.'),
      },
    },
    async ({ name, description, code, symbol, chain, backtests, includeCode = true }) => {
      try {
        return textResult({
          success: true,
          artifact: exportStrategyArtifact({
            name,
            description,
            code,
            symbol,
            chain,
            backtests: normalizeBacktestResults(backtests),
            includeCode,
          }),
        });
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    },
  );
}

function summarizeBacktest(result: ReturnType<typeof runBacktest>) {
  return {
    success: result.success,
    symbol: result.symbol,
    period: result.period,
    timeframe: result.timeframe,
    coverage: result.coverage,
    candleSource: result.candleSource,
    dataSource: result.dataQuality.dataSource,
    dataSourcePurpose: result.dataQuality.purpose,
    marketEvidence: result.dataQuality.marketEvidence,
    notMarketEvidence: result.dataQuality.notMarketEvidence,
    startTime: result.startTime,
    endTime: result.endTime,
    dataQuality: result.dataQuality,
    candleCount: result.candleCount,
    initialCapital: result.initialCapital,
    finalEquity: result.finalEquity,
    totalReturnPct: result.totalReturnPct,
    winRatePct: result.winRatePct,
    winRateBasis: result.winRateBasis,
    maxDrawdownPct: result.maxDrawdownPct,
    sharpeRatio: result.sharpeRatio,
    totalTrades: result.totalTrades,
    realizedPnl: result.realizedPnl,
    unrealizedPnl: result.unrealizedPnl,
    openPositionValue: result.openPositionValue,
    openPositionCost: result.openPositionCost,
    exposurePct: result.exposurePct,
    noTradeReason: result.noTradeReason,
    tradeActivityScore: result.tradeActivityScore,
    entrySignalCount: result.entrySignalCount,
    blockedSignalCount: result.blockedSignalCount,
    riskScore: result.riskScore,
    stabilityScore: result.stabilityScore,
    capitalEfficiencyScore: result.capitalEfficiencyScore,
    strategyQuality: result.strategyQuality,
    trades: [],
    equityCurve: [],
    detailMode: 'compact',
    sampleTrades: result.trades.slice(0, 5),
    lastTrade: result.trades.at(-1),
  };
}

type BacktestInput = z.infer<typeof backtestInputSchema>;
type ParsedBacktestResult = z.infer<typeof backtestResultSchema>;

function normalizeBacktestResults(input: BacktestInput | undefined): BacktestResult[] {
  if (!input) return [];
  const rawResults = Array.isArray(input) ? input : input.results ?? input.periods ?? [];
  if (rawResults.length === 0) {
    throw new Error('At least one backtest result is required. Pass an array or a strategy_backtest_matrix object with periods/results.');
  }
  return rawResults.map(toBacktestResult);
}

function toBacktestResult(result: ParsedBacktestResult): BacktestResult {
  return {
    ...result,
    timeframe: result.timeframe ?? 'unknown',
    coverage: result.coverage ?? 'unknown',
    candleSource: result.candleSource ?? 'unknown',
    startTime: result.startTime ?? 0,
    endTime: result.endTime ?? 0,
    dataQuality: result.dataQuality as any ?? {
      source: 'unknown',
      dataSource: 'unknown',
      purpose: 'user_provided_research',
      marketEvidence: false,
      notMarketEvidence: true,
      coverageComplete: false,
      resampled: false,
      originalCandleCount: result.candleCount,
      resampledCandleCount: result.candleCount,
      missingCandles: 0,
      startTime: result.startTime ?? 0,
      endTime: result.endTime ?? 0,
    },
    winRateBasis: result.winRateBasis ?? 'Closed SELL trades with positive realized PnL only; unrealized PnL is reflected in finalEquity, drawdown, and open position fields.',
    realizedPnl: result.realizedPnl ?? 0,
    unrealizedPnl: result.unrealizedPnl ?? 0,
    openPositionValue: result.openPositionValue ?? 0,
    openPositionCost: result.openPositionCost ?? 0,
    exposurePct: result.exposurePct ?? 0,
    noTradeReason: result.noTradeReason ?? null,
    tradeActivityScore: result.tradeActivityScore ?? 0,
    entrySignalCount: result.entrySignalCount ?? 0,
    blockedSignalCount: result.blockedSignalCount ?? 0,
    riskScore: result.riskScore ?? 0,
    stabilityScore: result.stabilityScore ?? 0,
    capitalEfficiencyScore: result.capitalEfficiencyScore ?? 0,
    strategyQuality: result.strategyQuality as any ?? {
      hasTrendFilter: false,
      hasVolatilityFilter: false,
      hasExposureLimit: false,
      hasStopLossOrRiskOff: false,
      usesPrecomputedIndicators: false,
      notes: [],
    },
    trades: result.trades ?? [],
    equityCurve: result.equityCurve ?? [],
  };
}

function summarizeDataSource(results: Array<{ dataQuality: { dataSource: string; purpose: string; marketEvidence: boolean; notMarketEvidence: boolean } }>) {
  const sources = [...new Set(results.map((result) => result.dataQuality.dataSource))];
  const marketEvidence = results.some((result) => result.dataQuality.marketEvidence);
  const deterministicOnly = results.every((result) => result.dataQuality.notMarketEvidence);
  return {
    sources,
    type: deterministicOnly ? 'deterministic-sample' : sources.join(','),
    purpose: deterministicOnly ? 'workflow_validation' : 'user_provided_research',
    marketEvidence,
    notMarketEvidence: !marketEvidence,
    note: deterministicOnly
      ? 'Backtests use deterministic sample candles to validate the Agent workflow and risk diagnostics; they are not market evidence.'
      : 'Backtests include caller-provided candles. Validate data provenance before treating results as market evidence.',
  };
}
