import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { textResult, errorResult } from '../mcpResponse.js';
import { adviseStrategy } from '../strategy/advisor.js';
import { exportStrategyArtifact } from '../strategy/artifact.js';
import { runBacktest, runBacktestMatrix } from '../strategy/backtest.js';
import { deterministicStrategyTemplate, generateStrategyCode } from '../strategy/generation.js';
import { createSampleCandles } from '../strategy/sampleData.js';
import { simulateStrategy } from '../strategy/simulator.js';
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
  candleCount: z.number(),
  initialCapital: z.number(),
  finalEquity: z.number(),
  totalReturnPct: z.number(),
  winRatePct: z.number(),
  maxDrawdownPct: z.number(),
  sharpeRatio: z.number(),
  totalTrades: z.number(),
  trades: z.array(z.any()),
  equityCurve: z.array(z.any()),
});

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
        results: z.array(backtestResultSchema).min(1).describe('Backtest results returned by strategy_backtest or strategy_backtest_matrix.'),
        question: z.string().optional().describe('Specific reviewer question.'),
      },
    },
    async ({ code, results, question }) => {
      try {
        return textResult(await adviseStrategy({ code, results, question }));
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
        backtests: z.array(backtestResultSchema).optional().describe('Optional backtest results to embed in the artifact.'),
      },
    },
    async ({ name, description, code, symbol, chain, backtests }) => {
      try {
        return textResult({
          success: true,
          artifact: exportStrategyArtifact({ name, description, code, symbol, chain, backtests }),
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
    candleCount: result.candleCount,
    initialCapital: result.initialCapital,
    finalEquity: result.finalEquity,
    totalReturnPct: result.totalReturnPct,
    winRatePct: result.winRatePct,
    maxDrawdownPct: result.maxDrawdownPct,
    sharpeRatio: result.sharpeRatio,
    totalTrades: result.totalTrades,
    sampleTrades: result.trades.slice(0, 5),
    lastTrade: result.trades.at(-1),
  };
}
