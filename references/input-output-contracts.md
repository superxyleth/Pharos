# Input And Output Contracts

This Skill is designed for Agent-to-tool composition. Outputs from one tool should be easy to pass into the next tool.

## Backtest Result Contract

A backtest result contains:

- `success`
- `symbol`
- `period`
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
- `trades`
- `equityCurve`

Compact mode returns `trades: []` and `equityCurve: []` to keep responses small while preserving schema compatibility.

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

