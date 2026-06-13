# MCP Tools

The MCP endpoint exposes the following tools.

## `pharos_network_status`

Checks Pharos Atlantic Testnet readiness.

Output includes:

- network
- RPC URL
- expected chain ID
- actual chain ID
- current block number
- native token
- explorer URL

## `pharos_wallet_info`

Derives a wallet address from local `PRIVATE_KEY` and reads the native PHRS balance.

Security notes:

- The private key is never returned.
- This is a read-only check.
- If `PRIVATE_KEY` is missing, the tool reports that wallet info is unavailable.

## `strategy_generate`

Generates sandboxed JavaScript strategy code from a natural-language quant idea.

The generated code must export:

```js
exports.evaluate = function(ctx) {
  return { action: 'HOLD', reason: 'example' };
};
```

## `strategy_validate`

Validates strategy code against the sandbox contract and blocked API list.

Blocked behavior includes:

- `require`
- `import`
- `process`
- `fs`
- `child_process`
- `eval`
- `Function`
- network requests

## `strategy_backtest`

Runs one sandbox backtest period.

Compact output includes return, win rate, drawdown, Sharpe, trade count, realized/unrealized PnL, open position value, exposure percentage, and win-rate basis.

## `strategy_backtest_matrix`

Runs the standard matrix:

- `1D`
- `1W`
- `1M`
- `6M`
- `1Y`
- `2Y`
- `3Y`

The compact matrix output is designed to flow directly into `strategy_advise` and `strategy_export_artifact`.

## `strategy_advise`

Reviews strategy code and backtest results, then returns risk-aware advice.

It accepts either:

- a backtest result array
- the full object returned by `strategy_backtest_matrix`

## `strategy_simulate`

Evaluates strategy decisions over one or more candles without executing trades or broadcasting transactions.

## `strategy_export_artifact`

Exports a reusable Phase 1 strategy artifact.

It supports:

- full code artifact
- lightweight artifact with `includeCode=false`
- `artifactId`
- `codeHash`
- backtest summary
- validation result
- risk notice

## `quant_loop_run`

Runs the full Phase 1 loop in one call:

generate -> validate -> backtest matrix -> advise -> simulate -> export artifact

This is the recommended demo and evaluator entry point.

