---
name: pharos-quant-strategy-lifecycle-skill
description: >
  A Pharos-compatible MCP Skill that exposes a reusable quant strategy
  lifecycle to AI Agents. It supports strategy generation, validation,
  multi-period backtesting, risk advice, sandbox simulation, and artifact
  export for Pharos Phase 1 research workflows.
version: 0.1.0
phase: phase1-skill
runtime: mcp-http
network: pharos-atlantic-testnet
chainId: 688689
requires:
  anyEnv:
    - OPENAI_API_KEY
    - PHAROS_RPC_URL
  optionalEnv:
    - OPENAI_BASE_URL
    - OPENAI_MODEL
    - PHAROS_CHAIN_ID
    - PRIVATE_KEY
    - PORT
---

# Pharos Quant Strategy Lifecycle Skill

This repository is packaged as a Pharos-compatible Skill package and runs as an MCP service runtime.

Agents can read this `SKILL.md` plus the `references/` files to understand the capability, then call the running MCP endpoint through `tools/list` and `tools/call`.

## Skill Positioning

A Pharos-compatible MCP Skill that exposes a reusable quant strategy lifecycle to AI Agents.

The Phase 1 version is research-only. It does not execute live trades, broadcast transactions, send transfers, deploy contracts, or change on-chain state.

## MCP Endpoints

Public deployment:

```text
http://150.158.28.155:3011/mcp
```

Public health check:

```text
http://150.158.28.155:3011/health
```

Local development:

```text
http://localhost:3001/mcp
```

## Capability Index

| Agent need | MCP tool | Reference |
| --- | --- | --- |
| Check Pharos Atlantic RPC readiness | `pharos_network_status` | `references/pharos-network.md` |
| Derive local wallet address and read PHRS balance | `pharos_wallet_info` | `references/pharos-network.md` |
| Generate sandboxed strategy code | `strategy_generate` | `references/mcp-tools.md` |
| Validate strategy code safety and interface contract | `strategy_validate` | `references/input-output-contracts.md` |
| Run one-period backtest | `strategy_backtest` | `references/mcp-tools.md` |
| Run multi-period backtest matrix | `strategy_backtest_matrix` | `references/agent-workflows.md` |
| Produce risk-aware optimization advice | `strategy_advise` | `references/agent-workflows.md` |
| Simulate strategy decisions without execution | `strategy_simulate` | `references/safety-and-phase1-boundary.md` |
| Export reusable strategy artifact | `strategy_export_artifact` | `references/input-output-contracts.md` |
| Run the full closed loop in one call | `quant_loop_run` | `references/evaluation-guide.md` |

## Recommended Agent Workflow

1. Read `SKILL.md`.
2. Read `references/overview.md`.
3. Read `references/safety-and-phase1-boundary.md`.
4. Connect to the MCP endpoint and call `tools/list`.
5. Call `pharos_network_status`.
6. Run `quant_loop_run` for an end-to-end Phase 1 evaluation.
7. For modular evaluation, run `strategy_generate`, `strategy_validate`, `strategy_backtest_matrix`, `strategy_advise`, `strategy_simulate`, and `strategy_export_artifact`.
8. Report whether the Skill is reusable, composable, safe, and suitable for Pharos Phase 1.

## Safety Boundary

This Skill is safe-by-design for Phase 1:

- No live trading.
- No transaction broadcast.
- No on-chain writes.
- No transfers.
- No contract deployment.
- No private key output.
- Strategy code runs in a restricted sandbox.
- Generated artifacts are research artifacts, not execution authorization.

## References

- `references/overview.md`
- `references/mcp-tools.md`
- `references/agent-workflows.md`
- `references/input-output-contracts.md`
- `references/pharos-network.md`
- `references/safety-and-phase1-boundary.md`
- `references/evaluation-guide.md`
- `references/future-phase2-execution.md`

## Assets

- `assets/networks.json`
- `assets/tokens.json`
- `assets/mcp-endpoints.json`

