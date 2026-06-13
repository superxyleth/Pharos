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

Call:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

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
  "useOpenAI": true
}
```

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

