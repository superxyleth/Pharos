# Evaluation Guide

This guide is for an Agent or reviewer evaluating the Skill from a Pharos Phase 1 perspective.

## Step 1: Read The Skill Package

Read:

- `SKILL.md`
- `references/overview.md`
- `references/safety-and-phase1-boundary.md`
- `references/mcp-tools.md`
- `references/input-output-contracts.md`

## Step 2: Connect To MCP

Use:

```text
http://150.158.28.155:3011/mcp
```

Required HTTP headers:

```text
Content-Type: application/json
Accept: application/json, text/event-stream
```

Call:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

Requests that omit the `Accept` header may receive `406 Not Acceptable`.

Expected discovery:

- 10 core research tools.
- Optional x402 payment-prep tools may also be present:
  - `x402_payment_status`
  - `x402_product_catalog`
  - `x402_quote`
  - `x402_receipt_verify`

## Step 3: Verify Network Status

Call `pharos_network_status`.

Expected:

- `network = atlantic-testnet`
- `chainId = 688689`
- `nativeToken = PHRS`

## Step 4: Run End-To-End Loop

Call `quant_loop_run`.

Suggested request:

```json
{
  "description": "Generate a PHRS grid and DCA research strategy, run multi-period backtests, produce risk advice, simulate decisions, and export an artifact.",
  "symbol": "PHRS",
  "chain": "pharos-atlantic-testnet",
  "initialCapital": 1000,
  "useOpenAI": false
}
```

Use `useOpenAI=false` as the baseline judging path because it is deterministic, does not depend on external model latency, and still exercises generation, validation, multi-period backtesting, advice, simulation, and artifact export.

For deeper strategy-quality review, repeat the same request with `useOpenAI=true`. The AI-backed path uses `OPENAI_TIMEOUT_MS=90000` by default and may take longer; if the provider times out, the Skill returns controlled fallback output instead of failing the loop.

Expected safety and data-source markers:

- `safetySummary.phase1Safe = true`
- `safetySummary.broadcastTransactions = false`
- `safetySummary.onChainWrites = false`
- `result.artifact.artifactId` is present
- `result.artifact.codeHash` is present
- `dataSourceSummary.type = deterministic-sample` for the deterministic baseline
- `dataSourceSummary.marketEvidence = false` for deterministic sample candles

## Step 5: Run Modular Tool Chain

Run:

1. `strategy_generate`
2. `strategy_validate`
3. `strategy_backtest_matrix`
4. `strategy_advise`
5. `strategy_simulate`
6. `strategy_export_artifact`

Pass the compact matrix object directly into `strategy_advise.results` and `strategy_export_artifact.backtests`.

## Step 6: Score

Optional x402 check:

Call `x402_payment_status` and confirm:

- core MCP tools remain free and reviewable
- `settlementBroadcastEnabled = false`
- `onChainWritesEnabled = false`
- x402 is optional and does not affect the core Phase 1 review path.

For the public x402 route demo, request `/paid/artifacts/pharos-demo` without payment and confirm `HTTP 402` plus `PAYMENT-REQUIRED`. A bogus `/x402/verify` request should return `verified=false` and make clear that this Phase 1 Skill does not perform payment settlement, transaction signing, or transaction broadcast.

Suggested review criteria:

- Tool discovery.
- Reusability.
- Composability.
- Pharos relevance.
- Safety boundary.
- Output clarity.
- Backtest and risk explanation.
- Artifact quality.
- Phase 2 extensibility.
- MCP header clarity and evaluator friendliness.

Expected safety posture:

- `liveTrading.enabled = false`
- `broadcastTransactions = false`
- `onChainWrites = false`
- no private key output
