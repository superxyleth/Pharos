# Demo Flow

This document is a 2-3 minute demo script for Pharos Phase 1 evaluation.

## One-Line Pitch

Pharos Quant Strategy Lifecycle Skill is a Phase 1 MCP Skill that lets AI Agents generate, validate, backtest, simulate, and export reusable PHRS strategy artifacts on Pharos Atlantic Testnet, with no live trading or transaction broadcasting.

## Demo Goal

Show that this project is a reusable Skill module rather than a full trading Agent.

The demo should prove:

- Agent can discover tools through MCP.
- Agent can verify Pharos Atlantic Testnet context.
- Agent can run the quant strategy lifecycle.
- Agent can export a reusable artifact.
- Skill obeys Phase 1 safety boundaries.

## Demo Script

### 1. Show Skill Package

Open:

```text
SKILL.md
```

Say:

```text
This repository is packaged as a Pharos-compatible Skill package and runs as an MCP service runtime.
```

Point to:

- `references/`
- `assets/`
- `examples/evaluator-prompt.md`
- `examples/demo-json-rpc-flow.md`
- `docs/DORAHACKS_SUBMISSION_SUMMARY.md`
- `docs/SUBMISSION_CHECKLIST.md`
- `docs/DEMO_TRANSCRIPT.md`

### 2. Show MCP Endpoint

Use:

```text
http://150.158.28.155:3011/mcp
```

Health:

```text
http://150.158.28.155:3011/health
```

### 3. Tool Discovery

Use MCP Streamable HTTP headers:

```http
Content-Type: application/json
Accept: application/json, text/event-stream
```

If the `Accept` header is missing, the server may return `406 Not Acceptable`.

Call:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

Expected tools:

- `pharos_network_status`
- `pharos_wallet_info`
- `strategy_generate`
- `strategy_validate`
- `strategy_backtest`
- `strategy_backtest_matrix`
- `strategy_advise`
- `strategy_simulate`
- `strategy_export_artifact`
- `quant_loop_run`

### 4. Pharos Network Readiness

Call:

```text
pharos_network_status
```

Expected:

```json
{
  "network": "atlantic-testnet",
  "chainId": 688689,
  "nativeToken": "PHRS"
}
```

### 5. One-Call Closed Loop

Call:

```text
quant_loop_run
```

Suggested input:

```json
{
  "description": "Generate a WBTC trend and DCA research strategy using BTCUSDT three-year proxy candles, run multi-period backtests, produce risk advice, simulate decisions, and export an artifact.",
  "symbol": "WBTC",
  "chain": "pharos-atlantic-testnet",
  "initialCapital": 1000,
  "useOpenAI": false
}
```

Expected output:

- generated strategy code
- validation result
- 7-period backtest summary
- risk advice
- sandbox simulation
- exported artifact
- `liveTrading.enabled = false`

Use this deterministic path for a reliable live demo. For deeper strategy-quality review, run the same request with `useOpenAI=true`; that path may take longer because AI-backed generation and advice prioritize quality and risk review.

### 6. Modular Chain

Run:

```text
strategy_generate -> strategy_validate -> strategy_backtest_matrix -> strategy_advise -> strategy_simulate -> strategy_export_artifact
```

Confirm:

- compact matrix result can be passed directly to `strategy_advise`
- compact matrix result can be passed directly to `strategy_export_artifact`
- `strategy_export_artifact` supports `includeCode=false`
- lightweight artifact returns `artifactId` and `codeHash`

### 7. Safety Close

Say:

```text
This Phase 1 Skill is research-only. It does not execute live trades, broadcast transactions, send transfers, perform swaps, approve tokens, deploy contracts, or change on-chain state.
```

### 8. Phase 2 Bridge

Say:

```text
Future Phase 2 Agents can consume exported strategy artifacts and combine them with wallet, oracle, DEX, or execution Skills under strict risk controls.
```

## Demo Success Criteria

- MCP connection succeeds.
- `tools/list` returns the full tool set.
- `pharos_network_status` returns chain ID `688689`.
- `quant_loop_run` completes.
- modular chain completes.
- artifact export succeeds.
- no live trading or transaction broadcast occurs.
- output is reusable by future Agents.

## Supporting Materials

- Copy-ready JSON-RPC requests: `examples/demo-json-rpc-flow.md`
- DoraHacks submission summary: `docs/DORAHACKS_SUBMISSION_SUMMARY.md`
- Public demo transcript: `docs/DEMO_TRANSCRIPT.md`
- Submission checklist: `docs/SUBMISSION_CHECKLIST.md`
- Agent evaluation report: `docs/AGENT_EVALUATION_REPORT_2026-06-14.md`
