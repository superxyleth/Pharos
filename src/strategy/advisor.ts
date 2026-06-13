import { completeText } from '../openai.js';
import type { BacktestResult } from './types.js';

export async function adviseStrategy(params: {
  code: string;
  results: BacktestResult[];
  question?: string;
}): Promise<{ success: true; advice: string; fallback?: boolean }> {
  const summary = params.results.map((result) => ({
    period: result.period,
    totalReturnPct: result.totalReturnPct,
    winRatePct: result.winRatePct,
    winRateBasis: result.winRateBasis,
    maxDrawdownPct: result.maxDrawdownPct,
    sharpeRatio: result.sharpeRatio,
    totalTrades: result.totalTrades,
    realizedPnl: result.realizedPnl,
    unrealizedPnl: result.unrealizedPnl,
    exposurePct: result.exposurePct,
  }));
  const prompt = [
    'Review this strategy and backtest summary for a Pharos quant strategy Skill.',
    'Give concise, actionable advice. Mention risk, stability across periods, and next simulation steps.',
    `Question: ${params.question ?? 'How should this strategy be improved before mock/live usage?'}`,
    `Backtest summary: ${JSON.stringify(summary, null, 2)}`,
    `Strategy code:\n${params.code.slice(0, 5000)}`,
  ].join('\n\n');

  try {
    const advice = await completeText({
      system: 'You are a cautious quant strategy reviewer. Do not promise profit.',
      user: prompt,
      maxTokens: 900,
      temperature: 0.2,
    });
    return { success: true, advice };
  } catch (error) {
    return {
      success: true,
      fallback: true,
      advice: fallbackAdvice(params.results, error),
    };
  }
}

function fallbackAdvice(results: BacktestResult[], error: unknown): string {
  const best = [...results].sort((a, b) => b.totalReturnPct - a.totalReturnPct)[0];
  const worstDrawdown = [...results].sort((a, b) => a.maxDrawdownPct - b.maxDrawdownPct)[0];
  return [
    'OpenAI advice was unavailable, so this deterministic review was generated.',
    best ? `Best period by return: ${best.period} (${best.totalReturnPct}%).` : '',
    worstDrawdown ? `Largest drawdown observed: ${worstDrawdown.period} (${worstDrawdown.maxDrawdownPct}%).` : '',
    'Before any live operation, prefer mock simulation, cap single-trade size, and require explicit user confirmation.',
    `Provider error: ${error instanceof Error ? error.message : String(error)}`,
  ].filter(Boolean).join(' ');
}
