import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { textResult, errorResult } from '../mcpResponse.js';
import { adviseStrategy } from '../strategy/advisor.js';
import { runBacktestMatrix } from '../strategy/backtest.js';
import { exportStrategyArtifact } from '../strategy/artifact.js';
import { deterministicStrategyTemplate, generateStrategyCode } from '../strategy/generation.js';
import { createSampleCandles } from '../strategy/sampleData.js';
import { simulateStrategy } from '../strategy/simulator.js';
import { validateStrategyCode } from '../strategy/validate.js';

export function registerLoopTools(server: McpServer) {
  server.registerTool(
    'quant_loop_run',
    {
      description: 'Run the Phase 1 closed loop: generate strategy, validate, multi-period backtest, advise, simulate, and export an artifact. No live trading.',
      inputSchema: {
        description: z.string().min(1).describe('Natural-language quant strategy request.'),
        symbol: z.string().optional().describe('Target symbol, default PHRS.'),
        chain: z.string().optional().describe('Target chain, default pharos-atlantic-testnet.'),
        initialCapital: z.number().positive().optional().describe('Research capital.'),
        useOpenAI: z.boolean().optional().describe('Use OpenAI generation when configured; fallback template is used otherwise.'),
      },
    },
    async ({ description, symbol = 'PHRS', chain = 'pharos-atlantic-testnet', initialCapital = 1000, useOpenAI = true }) => {
      try {
        let generated;
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
            fallback: true,
            code,
            validation: validateStrategyCode(code),
          };
        }

        const backtests = runBacktestMatrix({
          code: generated.code,
          symbol,
          initialCapital,
        });
        const advice = await adviseStrategy({
          code: generated.code,
          results: backtests,
          question: 'Is this strategy stable enough for mock simulation, and what should be improved?',
        });
        const simulation = simulateStrategy({
          code: generated.code,
          candles: createSampleCandles({ limit: 30 }),
          initialCapital,
        });
        const artifact = exportStrategyArtifact({
          name: `${symbol.toLowerCase()}-quant-loop-strategy`,
          description,
          code: generated.code,
          symbol,
          chain,
          backtests,
        });

        return textResult({
          success: true,
          stage: 'phase1_skill_closed_loop',
          generated,
          backtestSummary: backtests.map((result) => ({
            period: result.period,
            totalReturnPct: result.totalReturnPct,
            winRatePct: result.winRatePct,
            maxDrawdownPct: result.maxDrawdownPct,
            sharpeRatio: result.sharpeRatio,
            totalTrades: result.totalTrades,
          })),
          advice,
          simulation,
          artifact,
          liveTrading: {
            enabled: false,
            note: 'Phase 1 Skill does not broadcast transactions. Phase 2 Agent can compose this artifact with explicit user-confirmed execution tools.',
          },
        });
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    },
  );
}
