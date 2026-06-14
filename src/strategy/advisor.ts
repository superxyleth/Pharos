import { completeText } from '../openai.js';
import type { BacktestResult } from './types.js';

export async function adviseStrategy(params: {
  code: string;
  results: BacktestResult[];
  question?: string;
}): Promise<{ success: true; advice: string; fallback?: boolean }> {
  const summary = params.results.map((result) => ({
    period: result.period,
    timeframe: result.timeframe,
    coverage: result.coverage,
    candleCount: result.candleCount,
    dataQuality: result.dataQuality,
    totalReturnPct: result.totalReturnPct,
    winRatePct: result.winRatePct,
    winRateBasis: result.winRateBasis,
    maxDrawdownPct: result.maxDrawdownPct,
    sharpeRatio: result.sharpeRatio,
    totalTrades: result.totalTrades,
    realizedPnl: result.realizedPnl,
    unrealizedPnl: result.unrealizedPnl,
    exposurePct: result.exposurePct,
    noTradeReason: result.noTradeReason,
    tradeActivityScore: result.tradeActivityScore,
    entrySignalCount: result.entrySignalCount,
    blockedSignalCount: result.blockedSignalCount,
    riskScore: result.riskScore,
    stabilityScore: result.stabilityScore,
    capitalEfficiencyScore: result.capitalEfficiencyScore,
    strategyQuality: result.strategyQuality,
  }));
  const prompt = [
    'Review this strategy and backtest summary for a Pharos quant strategy Skill.',
    'Give concise, actionable advice. Mention data coverage, risk, stability across periods, capital efficiency, and next simulation steps.',
    'A negative return is a valid diagnostic result. Do not promise profit or suggest live trading.',
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
  const zeroTradeResults = results.filter((result) => result.totalTrades === 0);
  const zeroTradeDiagnostic = zeroTradeResults.length
    ? [
      `${zeroTradeResults.length}/${results.length} periods produced 0 trades.`,
      ...zeroTradeResults.slice(0, 3).map((result) => `${result.period}: ${result.noTradeReason ?? 'No executable entry signal was observed.'}`),
      'If this persists, loosen entry thresholds gradually, add a small warmup probe entry, or verify that the supplied candles contain enough trend/volatility movement.',
    ].join(' ')
    : '';
  return [
    'OpenAI advice was unavailable, so this deterministic review was generated.',
    best ? `Best period by return: ${best.period} (${best.totalReturnPct}%).` : '',
    worstDrawdown ? `Largest drawdown observed: ${worstDrawdown.period} (${worstDrawdown.maxDrawdownPct}%).` : '',
    zeroTradeDiagnostic,
    'Before any live operation, prefer mock simulation, cap single-trade size, and require explicit user confirmation.',
    `Provider error: ${error instanceof Error ? error.message : String(error)}`,
  ].filter(Boolean).join(' ');
}
