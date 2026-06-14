# Input And Output Contracts

This Skill is designed for Agent-to-tool composition. Outputs from one tool should be easy to pass into the next tool.

## Backtest Result Contract

A backtest result contains:

- `success`
- `symbol`
- `period`
- `timeframe`
- `coverage`
- `candleSource`
- `startTime`
- `endTime`
- `dataQuality`
- `candleCount`
- `initialCapital`
- `finalEquity`
- `totalReturnPct`
- `winRatePct`
- `winRateBasis`
- `maxDrawdownPct`
- `sharpeRatio`
- `totalTrades`
- `realizedPnl`
- `unrealizedPnl`
- `openPositionValue`
- `openPositionCost`
- `exposurePct`
- `riskScore`
- `stabilityScore`
- `capitalEfficiencyScore`
- `strategyQuality`
- `trades`
- `equityCurve`

Compact mode returns `trades: []` and `equityCurve: []` to keep responses small while preserving schema compatibility.

Backtests use full-period adaptive-timeframe coverage. Longer periods use larger candle intervals to preserve the full time span without pretending that a small partial sample represents the whole period.

Backtests prioritize correctness, coverage transparency, and risk diagnostics over minimum latency. A negative return is a valid diagnostic result and should be interpreted as risk discovery, not tool failure.

Default matrix resolution:

| Period | Timeframe | Coverage |
| --- | --- | --- |
| `1D` | `5m` | full period |
| `1W` | `15m` | full period |
| `1M` | `1H` | full period |
| `6M` | `4H` | full period |
| `1Y` | `1D` | full period |
| `2Y` | `1D` | full period |
| `3Y` | `1D` | full period |

When external candles are denser than the target timeframe, the engine aggregates the full input span into OHLCV buckets instead of trimming to the latest subset. External data results use `coverage: "provided-input-span"` unless the upstream data source itself guarantees the full requested period.

Example data quality block:

```json
{
  "dataQuality": {
    "source": "deterministic-sample",
    "coverageComplete": true,
    "resampled": false,
    "originalCandleCount": 1095,
    "resampledCandleCount": 1095,
    "missingCandles": 0,
    "startTime": 1735689600000,
    "endTime": 1830211200000
  }
}
```

For external input data, `coverageComplete` only becomes true when the provided span covers the requested period. Otherwise the result is still valid but marked as `provided-input-span`.

## Strategy Quality Diagnostics

Backtests include research diagnostics:

- `riskScore`
- `stabilityScore`
- `capitalEfficiencyScore`
- `strategyQuality`

`strategyQuality` checks whether strategy code visibly includes:

- trend filter
- volatility or ATR filter
- exposure limit
- stop-loss or risk-off logic
- precomputed `ctx.indicators` usage

These scores are not profit guarantees. They help Agents reason about risk controls and strategy structure before any later-phase simulation or execution module.

## Matrix Compatibility

`strategy_backtest_matrix` returns:

```json
{
  "success": true,
  "periods": []
}
```

When `includeDetails=true`, it can also include:

```json
{
  "results": []
}
```

Both shapes are accepted by:

- `strategy_advise.results`
- `strategy_export_artifact.backtests`

## Artifact Modes

Full artifact mode is the default and includes strategy code.

Lightweight artifact mode:

```json
{
  "includeCode": false
}
```

The lightweight artifact returns `artifactId`, `codeHash`, `detailMode: "summary"`, validation, backtest summary, risk notice, and usage contract without embedding the full code body.

Artifacts also include fixed safety flags:

```json
{
  "safety": {
    "researchOnly": true,
    "liveTrading": { "enabled": false },
    "broadcastTransactions": false,
    "onChainWrites": false,
    "privateKeyExposure": false
  }
}
```

## Strategy Context Indicators

The strategy context includes precomputed indicators:

- `ctx.indicators.ema20`
- `ctx.indicators.ema50`
- `ctx.indicators.rsi14`
- `ctx.indicators.atr14`
- `ctx.indicators.previousClose`

Generated strategies should prefer these fields over repeatedly scanning `ctx.candles` inside `evaluate(ctx)`. The validator allows full-history scans but returns warnings because repeated scans can slow full-period matrix backtests.

## Win Rate Basis

`winRatePct` is calculated from closed SELL trades with positive realized PnL.

Unrealized PnL is reflected separately through:

- `finalEquity`
- `maxDrawdownPct`
- `unrealizedPnl`
- `openPositionValue`
- `openPositionCost`
- `exposurePct`

This prevents confusion when a DCA/grid strategy has a high realized win rate but negative final equity due to open-position drawdown.
