# Current Progress - 2026-06-16

## Status

The project is now a strong Pharos Phase 1 MCP Skill submission focused on Agent composability, safe research workflows, long-history proxy market evidence, and Phase 2 artifact reuse.

Public service is live:

```text
Repository: https://github.com/superxyleth/Pharos
Health:     http://150.158.28.155:3011/health
MCP:        http://150.158.28.155:3011/mcp
x402:       http://150.158.28.155:3011/x402/status
```

Latest confirmed Git commit:

```text
bd47a0a chore: memory point 20260616-130510 - align runtime x402 phase 2 extension wording
```

## Positioning

This is not positioned as a profitable trading bot or live execution Agent.

It is positioned as a reusable Pharos Phase 1 Agent Skill that lets AI Agents:

- generate strategy code from natural-language strategy ideas
- validate strategy code inside a safety sandbox
- run multi-period research backtests
- produce risk-aware advice
- simulate decisions without execution
- export reusable Phase 2 artifacts with code hashes and safety metadata
- inspect Pharos Atlantic RPC and read-only wallet status

The core review path remains free and reviewable.

## Phase 1 Safety Boundary

The project preserves the Phase 1 boundary:

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

The strategy sandbox rejects dangerous capabilities such as `require`, `import`, `process`, `fs`, `child_process`, `eval`, `Function`, and network access.

## Recommended Judge Path

The recommended judge path is now `quant_loop_run` with `symbol = WBTC`.

Reason:

- WBTC uses Binance BTCUSDT 1H candles as a three-year underlying price proxy.
- WETH uses Binance ETHUSDT 1H candles as the comparison path.
- These datasets provide longer and richer market history than short-history PROS data.

Primary datasets:

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
BTCUSDT and ETHUSDT are CEX spot proxy data for WBTC/WETH research backtests.
They are not Pharos DEX pool candles, liquidity evidence, swap execution evidence, or on-chain settlement evidence.
```

## MCP Tool Surface

Current public MCP tool count:

```text
16 tools total
12 core/research tools
4 optional x402 tools
```

Core/research tools:

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

## x402 Positioning

x402 is now described as an optional Phase 2 paid-access extension layer, not as the core Phase 1 feature and not as live trading infrastructure.

Implemented reviewable behavior:

```text
GET  /x402/status
GET  /x402/products
POST /x402/quote
POST /x402/verify
GET  /paid/artifacts/:artifactId
POST /paid/quant-report
POST /paid/dry-run-plan
```

`/x402/quote` now accepts either:

```json
{
  "productId": "paid-quant-report"
}
```

or:

```json
{
  "resource": "/paid/quant-report",
  "method": "POST"
}
```

Current public x402 behavior:

```text
enabled = true
defaultAsset = PHRS
chainId = 688689
settlementBroadcastEnabled = false
onChainWritesEnabled = false
```

Phase 2 extension narrative:

- future paid artifacts
- future paid quant reports
- future paid dry-run execution-plan access
- future facilitator-backed payment verification
- future separation from a dedicated execution Skill

## Judge Documents

Primary reviewer documents:

```text
docs/JUDGE_REPORT.md
docs/JUDGE_DEMO_60_SECONDS.md
docs/DEPENDENCY_AUDIT.md
docs/PHASE2_ARTIFACT_REUSE.md
```

Useful direct links:

```text
Judge Report:
https://github.com/superxyleth/Pharos/blob/main/docs/JUDGE_REPORT.md

60-Second Judge Demo:
https://github.com/superxyleth/Pharos/blob/main/docs/JUDGE_DEMO_60_SECONDS.md
```

## Validation

Latest confirmed local validation:

```bash
npm run validate:skill
npm run typecheck
npm test
npm run judge:smoke
```

Confirmed results:

```text
validate:skill = 115 checks passed
typecheck = passed
npm test = passed
judge:smoke = passed, 0 failed checks
```

Latest public judge smoke markers:

```text
health status = ok
toolCount = 16
chainId = 688689
nativeToken = PHRS
x402 quote accepts resource + method
backtestPeriods = 7
WBTC proxy marketEvidence = true
artifactId exists
codeHash exists
liveTradingEnabled = false
broadcastTransactions = false
onChainWrites = false
```

Latest public x402 direct quote test:

```bash
curl -X POST http://150.158.28.155:3011/x402/quote \
  -H "Content-Type: application/json" \
  -d "{\"resource\":\"/paid/quant-report\",\"method\":\"POST\"}"
```

Expected markers:

```text
success = true
product.id = paid-quant-report
requirements.resource = /paid/quant-report
requirements.method = POST
httpStatus = 402
settlementBroadcastEnabled = false
onChainWritesEnabled = false
```

## Deployment

Server:

```text
ubuntu@150.158.28.155
```

Server path:

```text
/opt/projects/pharos-quant-strategy-lifecycle-skill
```

Current observed runtime:

```text
npm run mcp
tsx src/server.ts
listening on *:3011
```

Important deployment note:

```text
The server directory is not a Git repository.
Do not run git pull there.
Deploy by uploading explicit changed files over SFTP, then run typecheck and restart the runtime.
Do not bulk-delete server files.
```

## Remaining Limitations

Known and documented limitations:

- WBTC/WETH datasets are CEX spot proxy data, not Pharos-native DEX or on-chain pool data.
- Pharos integration is currently read-only RPC/wallet status plus Phase 2 artifact readiness.
- x402 is a safe Phase 2 paid-access extension layer, not full production settlement and not live execution.
- Strategy returns are research diagnostics, not an alpha claim.

## Next Best Improvements

Highest leverage next steps:

1. Add Pharos-native market-data integration when a reliable DEX/oracle/indexer source is available.
2. Add benchmark comparisons such as buy-and-hold, EMA baseline, and RSI-only baseline.
3. Keep the WBTC/WETH judge path stable and concise.
4. Keep x402 positioned as Phase 2 paid-access infrastructure, with Phase 1 safety flags visible.
5. Avoid adding new features that could blur the no-live-trading boundary before judging.

## Rules To Preserve

- Do not commit `.env`, `.ssh`, `.tools`, `.codex`, or `.gitconfig`.
- Push via `memory-push.cmd "message"`.
- Do not bulk-delete files or directories.
- Keep `/mcp`, `/health`, `tools/list`, and deterministic `quant_loop_run` stable for official review.
