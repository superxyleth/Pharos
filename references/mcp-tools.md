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
- Address and balance are omitted by default on public deployments. Use `includeAddress=true` and/or `includeBalance=true` when an evaluator explicitly needs them.

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

Backtest outputs also include `timeframe`, `coverage`, and `candleSource` so Agents can tell whether a result used synthetic full-period candles or externally supplied full-period candles.

They also include `startTime`, `endTime`, `dataQuality`, `riskScore`, `stabilityScore`, `capitalEfficiencyScore`, and `strategyQuality`. These fields make long-running or negative-return backtests easier to interpret as diagnostics rather than failures.

Trade activity diagnostics include:

- `noTradeReason`
- `tradeActivityScore`
- `entrySignalCount`
- `blockedSignalCount`

These fields help Agents explain `0 trades` results without treating them as tool failures.
`tradeActivityScore` is a simple relative activity signal, not a profit metric.

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

The matrix uses full-period adaptive-timeframe backtesting:

- `1D`: `5m`
- `1W`: `15m`
- `1M`: `1H`
- `6M`: `4H`
- `1Y`: `1D`
- `2Y`: `1D`
- `3Y`: `1D`

This preserves full period coverage while avoiding unrealistic long-period minute/hour-level over-sampling.

The Skill prioritizes full-period coverage transparency and risk diagnostics over minimum latency. AI-backed generation and advice may take longer because they are designed for strategy quality and cautious review.

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
- fixed research-only safety flags
- backtest summary
- validation result
- risk notice

## `quant_loop_run`

Runs the full Phase 1 loop in one call:

generate -> validate -> backtest matrix -> advise -> simulate -> export artifact

This is the recommended demo and evaluator entry point.

## Optional x402 Tools

The following tools expose optional x402-style paid gateway scaffolding. They do not settle payments, sign transactions, broadcast payments, or execute trades.

### `x402_payment_status`

Returns whether the optional x402 gateway is enabled, which network it targets, whether receiver and facilitator configuration is present, and whether settlement broadcasting or on-chain writes are enabled.

Expected safe defaults:

- `enabled = false`
- `settlementBroadcastEnabled = false`
- `onChainWritesEnabled = false`

### `x402_product_catalog`

Lists optional paid resources that could be protected by x402 later, such as full artifact download, extended quant research report, or Phase 2 dry-run plan.

### `x402_quote`

Creates x402-style payment requirements for an optional paid resource.

Inputs:

- `productId`
- optional `resource`
- optional `method`

The response is a quote only. It does not transfer funds or settle payment.

### `x402_receipt_verify`

Checks a receipt scaffold and returns whether it is accepted by the current configuration.

By default it returns verification scaffolding only. Production payment settlement should be delegated to an official x402 facilitator or a separate payment Skill.
