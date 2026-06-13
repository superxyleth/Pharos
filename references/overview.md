# Overview

Pharos Quant Strategy Lifecycle Skill is a Phase 1 Skill package plus MCP runtime for AI Agents.

It exposes a reusable quant research lifecycle:

1. Generate a strategy from natural language.
2. Validate the generated strategy against a sandbox contract.
3. Run one-period or multi-period backtests.
4. Produce risk-aware improvement advice.
5. Simulate strategy decisions without execution.
6. Export a reusable strategy artifact.
7. Check Pharos Atlantic Testnet readiness through read-only RPC calls.

## Why It Fits Phase 1

Phase 1 is focused on reusable Skill modules. This project is not a full trading Agent. It is a composable Skill that future Agents can call as one part of a larger workflow.

The current version is research-only and deliberately avoids live execution. That makes it suitable for safe Agent evaluation while still providing a realistic strategy lifecycle for Pharos-oriented workflows.

Future Phase 2 Agents can consume exported strategy artifacts and combine them with wallet, oracle, DEX, or execution Skills under strict risk controls.

## Runtime Model

This repository supports two Agent-facing layers:

- Skill package layer: `SKILL.md`, `references/`, and `assets/`.
- MCP runtime layer: HTTP MCP endpoint with discoverable tools.

Agents should use the package files for understanding and the MCP endpoint for execution.
