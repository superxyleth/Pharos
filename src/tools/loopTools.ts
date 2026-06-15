import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { textResult, errorResult } from '../mcpResponse.js';
import { adviseStrategy } from '../strategy/advisor.js';
import { runBacktestMatrix } from '../strategy/backtest.js';
import { exportStrategyArtifact } from '../strategy/artifact.js';
import { deterministicStrategyTemplate, generateStrategyCode } from '../strategy/generation.js';
import { loadPreferredMarketCandles, summarizePreferredMarketData } from '../strategy/marketData.js';
import { createSampleCandles } from '../strategy/sampleData.js';
import { simulateStrategy } from '../strategy/simulator.js';
import { validateStrategyCode } from '../strategy/validate.js';

const phase1SafetySummary = {
  phase1Safe: true,
  researchOnly: true,
  liveTradingEnabled: false,
  broadcastTransactions: false,
  onChainWrites: false,
  privateKeyExposure: false,
};

export function registerLoopTools(server: McpServer) {
  server.registerTool(
    'quant_loop_run',
    {
      description: 'Run the Phase 1 closed loop: generate strategy, validate, multi-period backtest, advise, simulate, and export an artifact. No live trading.',
      inputSchema: {
        description: z.string().min(1).describe('Natural-language quant strategy request.'),
        symbol: z.string().optional().describe('Target symbol, default WBTC using local BTCUSDT 3-year proxy candles. Use WETH for ETHUSDT proxy candles.'),
        chain: z.string().optional().describe('Target chain, default pharos-atlantic-testnet.'),
        initialCapital: z.number().positive().optional().describe('Research capital.'),
        useOpenAI: z.boolean().optional().describe('Use OpenAI generation when configured; fallback template is used otherwise.'),
      },
    },
    async ({ description, symbol = 'WBTC', chain = 'pharos-atlantic-testnet', initialCapital = 1000, useOpenAI = true }) => {
      try {
        const steps: Array<Record<string, unknown>> = [];
        let generated;
        const generateStarted = Date.now();
        if (useOpenAI) {
          try {
            generated = await generateStrategyCode({ description, symbol, chain, initialCapital });
          } catch (error) {
            const code = deterministicStrategyTemplate(description);
            generated = {
              success: true as const,
              fallback: true,
              code,
              validation: validateStrategyCode(code),
              providerError: error instanceof Error ? error.message : String(error),
            };
          }
        } else {
          const code = deterministicStrategyTemplate(description);
          generated = {
            success: true as const,
            fallback: false,
            deterministic: true,
            code,
            validation: validateStrategyCode(code),
          };
        }
        steps.push({
          name: 'generate',
          status: 'completed',
          mode: useOpenAI ? 'ai-with-fallback' : 'deterministic',
          fallback: 'fallback' in generated ? Boolean(generated.fallback) : false,
          providerError: 'providerError' in generated ? generated.providerError : undefined,
          durationMs: Date.now() - generateStarted,
        });

        const validateStarted = Date.now();
        steps.push({
          name: 'validate',
          status: generated.validation.valid ? 'completed' : 'completed_with_errors',
          durationMs: Date.now() - validateStarted,
          warnings: generated.validation.warnings,
        });

        const backtestStarted = Date.now();
        const backtests = runBacktestMatrix({
          code: generated.code,
          symbol,
          initialCapital,
        });
        steps.push({
          name: 'backtest_matrix',
          status: 'completed',
          periods: backtests.length,
          coverage: 'full-period-adaptive-timeframe',
          durationMs: Date.now() - backtestStarted,
        });

        const adviseStarted = Date.now();
        const advice = await adviseStrategy({
          code: generated.code,
          results: backtests,
          question: 'Is this strategy stable enough for mock simulation, and what should be improved?',
        });
        steps.push({
          name: 'advise',
          status: 'completed',
          fallback: Boolean(advice.fallback),
          durationMs: Date.now() - adviseStarted,
        });

        const simulateStarted = Date.now();
        const marketCandles = loadPreferredMarketCandles(symbol)?.candles;
        const simulation = simulateStrategy({
          code: generated.code,
          candles: marketCandles?.slice(-30) ?? createSampleCandles({ limit: 30 }),
          initialCapital,
        });
        steps.push({
          name: 'simulate',
          status: 'completed',
          decisions: simulation.decisions.length,
          durationMs: Date.now() - simulateStarted,
        });

        const artifactStarted = Date.now();
        const artifact = exportStrategyArtifact({
          name: `${symbol.toLowerCase()}-quant-loop-strategy`,
          description,
          code: generated.code,
          symbol,
          chain,
          backtests,
        });
        steps.push({
          name: 'export_artifact',
          status: 'completed',
          artifactId: artifact.artifactId,
          durationMs: Date.now() - artifactStarted,
        });

        return textResult({
          success: true,
          stage: 'phase1_skill_closed_loop',
          safetySummary: phase1SafetySummary,
          marketDataSummary: summarizePreferredMarketData(symbol),
          dataSourceSummary: summarizeDataSource(backtests),
          steps,
          generated,
          backtestSummary: backtests.map((result) => ({
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
            totalReturnPct: result.totalReturnPct,
            winRatePct: result.winRatePct,
            maxDrawdownPct: result.maxDrawdownPct,
            sharpeRatio: result.sharpeRatio,
            totalTrades: result.totalTrades,
            noTradeReason: result.noTradeReason,
            tradeActivityScore: result.tradeActivityScore,
            entrySignalCount: result.entrySignalCount,
            blockedSignalCount: result.blockedSignalCount,
            riskScore: result.riskScore,
            stabilityScore: result.stabilityScore,
            capitalEfficiencyScore: result.capitalEfficiencyScore,
            strategyQuality: result.strategyQuality,
          })),
          advice,
          executionModeSummary: {
            generationMode: useOpenAI ? 'ai-with-fallback' : 'deterministic',
            generationUsedFallback: 'fallback' in generated ? Boolean(generated.fallback) : false,
            adviceMode: advice.fallback ? 'deterministic-fallback' : 'ai-backed',
            adviceUsedFallback: Boolean(advice.fallback),
            providerTimeoutMs: Number(process.env.OPENAI_TIMEOUT_MS ?? 90000),
            qualityNote: advice.fallback || ('fallback' in generated && generated.fallback)
              ? 'One or more AI-backed stages used deterministic fallback. The Phase 1 loop still completed and returned research diagnostics.'
              : useOpenAI
                ? 'AI-backed generation and advice completed without deterministic fallback.'
                : 'Deterministic generation completed; AI-backed advice completed without fallback.',
          },
          simulation,
          artifact,
          liveTrading: {
            enabled: false,
            note: 'Phase 1 Skill does not broadcast transactions, execute live trades, or perform on-chain writes.',
          },
        });
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    },
  );
}

function summarizeDataSource(backtests: Array<{ dataQuality: { dataSource: string; purpose: string; marketEvidence: boolean; notMarketEvidence: boolean } }>) {
  const sources = [...new Set(backtests.map((result) => result.dataQuality.dataSource))];
  const marketEvidence = backtests.some((result) => result.dataQuality.marketEvidence);
  const deterministicOnly = backtests.every((result) => result.dataQuality.notMarketEvidence);
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
