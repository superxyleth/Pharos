# Judge Report

## Verdict

Pharos Quant Strategy Lifecycle Skill is a complete Phase 1 MCP Skill submission for Agent workflows. It exposes a public MCP runtime that lets AI Agents generate sandboxed strategy code, validate safety, run multi-period backtests, produce risk-aware advice, simulate decisions without execution, and export reusable Phase 2 artifacts.

The project should be judged as Agent Skill infrastructure, not as a live trading bot or an alpha strategy.

## Public Endpoints

```text
Repository: https://github.com/superxyleth/Pharos
Health:     http://150.158.28.155:3011/health
MCP:        http://150.158.28.155:3011/mcp
x402:       http://150.158.28.155:3011/x402/status
```

Required MCP headers:

```text
Content-Type: application/json
Accept: application/json, text/event-stream
```

Requests without the MCP `Accept` header may return `406 Not Acceptable`.

## Recommended Review Path

Use `quant_loop_run` with `symbol = WBTC` as the primary judging path. This uses the local BTCUSDT three-year proxy dataset and shows strategy behavior across a longer market window than short-history PROS data.

Use `symbol = WETH` as the ETH comparison path. It uses the ETHUSDT three-year proxy dataset.

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "quant_loop_run",
    "arguments": {
      "description": "Generate a WBTC trend and DCA research strategy using BTCUSDT three-year proxy candles, with volatility filter, risk-off exit, and max exposure control. Run full multi-period backtests, produce risk-aware advice, simulate decisions, and export a reusable artifact.",
      "symbol": "WBTC",
      "chain": "pharos-atlantic-testnet",
      "initialCapital": 1000,
      "useOpenAI": false
    }
  }
}
```

Expected assertions:

```text
success = true
stage = phase1_skill_closed_loop
safetySummary.phase1Safe = true
liveTrading.enabled = false
artifact.artifactId exists
artifact.codeHash exists
artifact.chainContext.chainId = 688689
pharosIntegrationSummary.onChainWritesEnabled = false
pharosIntegrationSummary.marketDataNativeToPharos = false
backtestSummary has 7 periods
backtestSummary[].benchmarks.buyAndHold exists
backtestSummary[].benchmarks.comparison exists
dataSourceSummary.marketEvidence = true
backtestSummary[].dataQuality.datasetId = binance:BTCUSDT:1H:last3y:wbtc-proxy
```

Use strict smoke mode after deploying the current working-tree improvements:

```bash
npm run judge:smoke:strict
```

## Market Data

Primary judge datasets:

```text
WBTC proxy: BTCUSDT Binance spot 1H
WETH proxy: ETHUSDT Binance spot 1H
Coverage:   2023-06-14T00:00:00Z to 2026-06-13T23:00:00Z
Candles:    26,304 per dataset
```

Dataset files:

```text
assets/market-data/binance/spot/1h/BTCUSDT_1H.binance_spot.last3y.csv
assets/market-data/binance/spot/1h/ETHUSDT_1H.binance_spot.last3y.csv
```

Important limitation:

```text
BTCUSDT/ETHUSDT candles are underlying market price proxies for WBTC/WETH research backtests.
They are not Pharos DEX pool candles, liquidity evidence, swap execution evidence, or on-chain settlement evidence.
```

PROS/USDT OKX market data remains available for PROS-specific research, but WBTC/WETH are the recommended review path because they provide longer and richer market history.

## Benchmark Comparisons

Each backtest period now includes research-only baseline comparisons:

```text
buyAndHold
emaTrendBaseline
rsiMeanReversionBaseline
comparison.strategyVsBuyAndHoldPct
comparison.strategyVsBestBaselinePct
```

These baselines are included so Agents and judges can compare the generated strategy against simple alternatives. They are diagnostics only and do not imply live execution, alpha claims, or trading authorization.

## Pharos Read-Only Evidence

`quant_loop_run` returns a `pharosIntegrationSummary` and exported artifacts include `chainContext`.

Expected markers:

```text
network = atlantic-testnet
chainId = 688689
nativeToken = PHRS
readOnlyRpcChecked = true when the RPC check succeeds
blockNumberAtRun exists when the RPC check succeeds
onChainWritesEnabled = false
marketDataNativeToPharos = false
```

This is intentional Phase 1 behavior: the Skill proves Pharos Atlantic runtime readiness without adding transaction signing, settlement, or DEX execution.

## Tested MCP Tools

Core tools:

```text
pharos_network_status
pharos_wallet_info
strategy_preset_list
strategy_preset_get
strategy_generate
strategy_validate
strategy_backtest
strategy_backtest_matrix
strategy_advise
strategy_simulate
strategy_export_artifact
quant_loop_run
```

Optional x402 tools:

```text
x402_payment_status
x402_product_catalog
x402_quote
x402_receipt_verify
```

## x402 Status Matrix

Implemented:

```text
GET  /x402/status
GET  /x402/products
POST /x402/quote
POST /x402/verify
quote requests accept either productId or resource + method
GET  /paid/artifacts/:artifactId returns 402 requirements without payment
MCP tools expose status, catalog, quote, and receipt verification for optional paid-access resources
```

Phase 2 extension layer:

```text
future paid artifacts
future paid quant reports
future facilitator-backed payment verification
future paid dry-run execution-plan access
future separation from a dedicated execution Skill
```

Production settlement readiness checklist:

```text
public PHRS receipt verification is implemented for the reviewable paid routes
production settlement can be separated into a dedicated payment service later
paid artifact storage should be separated from the Phase 1 research runtime
any execution workflow should live in a separate guarded Phase 2 Skill
settlementBroadcastEnabled and onChainWritesEnabled remain false in Phase 1
```

Current public x402 payment mode:

```text
network = eip155:688689
scheme = exact
asset = PHRS
verificationMode = native-phrs-receipt
facilitatorUrl = null
settlement = server verifies an existing public-chain transfer receipt
```

Judges can verify the paid route by calling a protected endpoint without payment and observing HTTP `402`, then submitting a base64 JSON `PAYMENT-SIGNATURE` with a confirmed Pharos Atlantic PHRS transfer txHash. This is separate from the free core MCP judge path.

Disabled for Phase 1 safety:

```text
settlementBroadcastEnabled = false
onChainWritesEnabled = false
transaction signing = disabled
live trading = disabled
swaps/approvals/transfers/deployments = disabled
```

## Safety Boundary

The Skill is research-only:

```text
No live trading
No private key output
No transaction signing
No transaction broadcast
No swaps
No approvals
No transfers
No contract deployments
No on-chain writes
```

The strategy sandbox rejects unsafe JavaScript capabilities such as `require`, `import`, `process`, `fs`, `child_process`, `eval`, `Function`, and network access.

## Known Limitations

```text
WBTC/WETH datasets are CEX spot proxy data, not Pharos DEX/on-chain pool data.
x402 is a safe Phase 2 paid-access extension layer, not live trading or full production settlement.
The exported artifact is a Phase 2 handoff input, not trading authorization.
OpenAI-backed generation is optional; deterministic mode is recommended for reproducible judging.
```

## Validation Commands

Local:

```bash
npm install --include=dev
npm run validate:skill
npm run typecheck
npm test
npm run judge:smoke
npm run judge:smoke:strict
npm run audit:security
```

Public smoke:

```bash
curl http://150.158.28.155:3011/health
```

```bash
curl -X POST http://150.158.28.155:3011/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"
```

## Suggested Score Framing

Judge the project on:

```text
Skill quality
Agent composability
MCP runtime completeness
Pharos Atlantic read-only integration
Safety boundary
Phase 2 artifact reuse
Documentation clarity
```

Do not judge it as:

```text
a live trading system
a transaction execution Agent
a guaranteed profitable strategy
a full x402 settlement service
```
