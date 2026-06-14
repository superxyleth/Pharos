# DoraHacks Submission Summary

## Project

Pharos Quant Strategy Lifecycle Skill

## One-Line Pitch

A Pharos-compatible MCP Skill that lets AI Agents generate, validate, backtest, simulate, and export reusable PHRS strategy research artifacts on Pharos Atlantic Testnet without live trading or transaction broadcasting.

## Hackathon Track

Pharos Skill-to-Agent Dual Cascade Hackathon, Phase 1 Skill Hackathon.

Phase 1 focuses on standardized, reusable Skill modules that can be called by Agents and reused in later Agent workflows. This project is submitted as a Skill package plus an MCP runtime, not as a live trading Agent.

## Repository Package Shape

The Skill package is organized for Agent-readable progressive disclosure:

- `SKILL.md`: primary Skill entry point with trigger rules, capability index, execution loop, and safety boundary.
- `references/`: task-specific reference files for overview, MCP tools, workflows, contracts, network, safety, and evaluation.
- `assets/`: machine-readable network, token, and endpoint metadata.
- `src/`: MCP runtime and strategy lifecycle implementation.
- `scripts/validate-skill.mjs`: submission self-check for local package structure and public MCP readiness.
- `examples/demo-json-rpc-flow.md`: copy-ready JSON-RPC demo requests.
- `docs/DEMO_FLOW.md`: short reviewer demo flow.
- `docs/DEMO_TRANSCRIPT.md`: latest public endpoint test transcript.
- `docs/SUBMISSION_CHECKLIST.md`: final pre-submission checklist.

## Public Runtime

MCP endpoint:

```text
http://150.158.28.155:3011/mcp
```

Health endpoint:

```text
http://150.158.28.155:3011/health
```

## Target Network

- Network: Pharos Atlantic Testnet
- Chain ID: `688689`
- RPC: `https://atlantic.dplabs-internal.com`
- WSS: `wss://atlantic.dplabs-internal.com`
- Explorer: `https://atlantic.pharosscan.xyz/`
- Native token: `PHRS`
- Official rate limit: `500 times/5m`
- Max pending transactions per address: `64`

## MCP Tools

The public MCP runtime exposes 10 tools:

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

## Core Capability

This Skill provides a complete research lifecycle that an Agent can compose:

1. Generate sandboxed JavaScript strategy code from a natural-language idea.
2. Validate the code against the `exports.evaluate(ctx)` contract and blocked API list.
3. Run full-period adaptive-timeframe backtests across `1D`, `1W`, `1M`, `6M`, `1Y`, `2Y`, and `3Y`.
4. Return coverage, timeframe, data quality, risk, stability, capital efficiency, and strategy quality diagnostics.
5. Produce risk-aware improvement advice.
6. Simulate decisions without execution.
7. Export a reusable artifact with `artifactId`, `codeHash`, summary metrics, and fixed Phase 1 safety flags.

## Phase 1 Safety Boundary

This project is intentionally research-only:

- No live trading.
- No transaction broadcasting.
- No swaps.
- No token approvals.
- No transfers.
- No contract deployments.
- No contract writes.
- No on-chain state changes.
- No private key output.

If `PRIVATE_KEY` is configured in the runtime environment, it is used only for local public-address derivation and optional read-only PHRS balance checks. Public wallet output omits address and balance by default unless explicitly requested.

## Recommended Review Flow

1. Read `SKILL.md`.
2. Read `references/overview.md`.
3. Read `references/safety-and-phase1-boundary.md`.
4. Read `references/mcp-tools.md`.
5. Call the health endpoint.
6. Call MCP `tools/list`.
7. Call `pharos_network_status` and confirm `chainId = 688689`.
8. Run `quant_loop_run` for a PHRS research strategy.
9. Run the modular chain if deeper evaluation is needed:
   `strategy_generate -> strategy_validate -> strategy_backtest_matrix -> strategy_advise -> strategy_simulate -> strategy_export_artifact`.
10. Confirm artifact safety flags keep live execution disabled.

## Validation Evidence

Latest local and public validation commands:

```bash
npm run validate:skill
npm test
```

Latest observed results:

- `validate:skill`: 67 checks passed.
- `npm test`: typecheck, backtest smoke, and Pharos read-only smoke passed.
- Public health endpoint responded successfully.
- Public `tools/list` exposed all 10 expected tools.
- Public `pharos_network_status` returned `atlantic-testnet` and chain ID `688689`.
- Public deterministic `quant_loop_run` completed successfully and exported an artifact.

See `docs/DEMO_TRANSCRIPT.md` for the latest public endpoint transcript.

## Phase 2 Reuse Path

Future Phase 2 Agents can consume exported strategy artifacts and combine them with wallet, oracle, DEX, or execution Skills under strict risk controls. Execution should remain a separate disabled-by-default module with Atlantic Testnet guards, max notional limits, slippage controls, dry-run transaction plans, and explicit confirmation.
